import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { wetGroundFragment, wetGroundVertex } from '../../shaders/wetGround'
import { useSceneStore } from '../../state/useSceneStore'
import { QUALITY } from '../../config/quality'
import { AMBIENT, ROAD } from '../../config/world'
import { asphaltRoughnessTexture, asphaltTexture, sidewalkTexture } from '../../utils/textures'

const GROUND_LAYER = 1

/**
 * A single planar reflection pass shared by the whole wet road. The reflected
 * camera is the main camera mirrored through y=0; the ground itself is moved to
 * a dedicated layer so it never appears inside its own reflection.
 */
export function WetGround() {
  return (
    <group>
      <ReflectiveRoad />
      <Sidewalks />
      <RoadMarkings />
    </group>
  )
}

function ReflectiveRoad() {
  const { gl, scene, camera, size, viewport } = useThree()
  const quality = useSceneStore((s) => s.quality)
  const timeOfDay = useSceneStore((s) => s.timeOfDay)
  const profile = QUALITY[quality]
  const meshRef = useRef<THREE.Mesh>(null)
  const frameCount = useRef(0)
  const reflectionCamera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera()
    cam.layers.set(0)
    return cam
  }, [])
  const mirrorPoint = useMemo(() => new THREE.Vector3(), [])
  const forward = useMemo(() => new THREE.Vector3(), [])
  const targetRef = useRef<THREE.WebGLRenderTarget | null>(null)

  const target = useMemo(() => {
    const width = Math.max(2, Math.round(size.width * viewport.dpr * profile.reflectionScale))
    const height = Math.max(2, Math.round(size.height * viewport.dpr * profile.reflectionScale))
    const rt = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    })
    rt.texture.colorSpace = THREE.NoColorSpace
    rt.texture.generateMipmaps = false
    return rt
  }, [size.width, size.height, viewport.dpr, profile.reflectionScale])

  useEffect(() => {
    targetRef.current = target
    return () => target.dispose()
  }, [target])

  useEffect(() => {
    camera.layers.enable(GROUND_LAYER)
  }, [camera])

  const material = useMemo(() => {
    const uniforms = {
      tReflection: { value: null as THREE.Texture | null },
      tAsphalt: { value: asphaltTexture() },
      tRoughness: { value: asphaltRoughnessTexture() },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uRain: { value: 1 },
      uPuddleAmount: { value: 1 },
      uReflectionEnabled: { value: 1 },
      uFogColor: { value: new THREE.Color('#0a111b') },
      uFogDensity: { value: 0.03 },
      uLamp0Pos: { value: new THREE.Vector3(-7.4, 4.2, 5.3) },
      uLamp0Color: { value: new THREE.Color('#bcd7ff').multiplyScalar(0.34) },
      uLamp1Pos: { value: new THREE.Vector3(15.5, 4.2, 5.4) },
      uLamp1Color: { value: new THREE.Color('#ffe6cc').multiplyScalar(0.14) },
      uStoreColor: { value: new THREE.Color('#ffe6b4').multiplyScalar(0.34) },
      uStorePos: { value: new THREE.Vector2(0.0, 1.6) },
      uDebug: { value: 0 },
    }
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: wetGroundVertex,
      fragmentShader: wetGroundFragment,
      toneMapped: false,
    })
    return mat
  }, [])

  useEffect(() => {
    const mesh = meshRef.current
    if (mesh) mesh.layers.set(GROUND_LAYER)
  }, [])

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      material.uniforms.uDebug.value = params.has('debugPuddle') ? 2 : params.has('debugReflection') ? 1 : 0
    } catch {
      material.uniforms.uDebug.value = 0
    }
  }, [material])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state, delta) => {
    const mat = material
    const rain = useSceneStore.getState().rainIntensity
    const tod = AMBIENT[timeOfDay]
    const store = useSceneStore.getState()
    mat.uniforms.uTime.value += delta
    mat.uniforms.uRain.value = rain
    mat.uniforms.uPuddleAmount.value = 0.35 + rain * 0.85
    mat.uniforms.uFogColor.value.set(tod.fog)
    mat.uniforms.uFogDensity.value = tod.fogDensity
    mat.uniforms.uStoreColor.value.set('#ffe6b4').multiplyScalar(0.28 + (tod.hemiIntensity - 0.5) * 0.1)

    // Move puddle mask illumination warmer when the dusk variant is active.
    if (scene.fog && 'color' in scene.fog) {
      // Scene fog is already kept in sync by Atmosphere; no-op guard.
    }

    const rt = targetRef.current
    if (!rt) return
    mat.uniforms.tReflection.value = rt.texture
    const drawing = gl.getDrawingBufferSize(new THREE.Vector2())
    mat.uniforms.uResolution.value.copy(drawing)

    frameCount.current += 1
    if (frameCount.current % Math.max(1, profile.reflectionInterval) !== 0) return

    const mainCam = state.camera as THREE.PerspectiveCamera
    mirrorPoint.set(mainCam.position.x, -mainCam.position.y, mainCam.position.z)
    mainCam.getWorldDirection(forward)
    const look = new THREE.Vector3(
      mainCam.position.x + forward.x,
      -(mainCam.position.y + forward.y),
      mainCam.position.z + forward.z,
    )
    reflectionCamera.position.copy(mirrorPoint)
    reflectionCamera.fov = mainCam.fov
    reflectionCamera.aspect = mainCam.aspect
    reflectionCamera.near = mainCam.near
    reflectionCamera.far = mainCam.far
    reflectionCamera.up.set(mainCam.up.x, -mainCam.up.y, mainCam.up.z)
    reflectionCamera.lookAt(look)
    reflectionCamera.updateProjectionMatrix()
    reflectionCamera.updateMatrixWorld()

    const prevTarget = gl.getRenderTarget()
    const prevAutoClear = gl.autoClear
    gl.autoClear = true
    gl.setRenderTarget(rt)
    gl.clear()
    gl.render(scene, reflectionCamera)
    gl.setRenderTarget(prevTarget)
    gl.autoClear = prevAutoClear

    // Keep uniforms in sync (store/rain settings may change during runtime).
    if (store.timeOfDay !== timeOfDay) {
      mat.uniforms.uFogColor.value.set(store.timeOfDay === 'night' ? '#0a111b' : '#121b2c')
    }
  })

  return (
    <>
      <mesh ref={meshRef} rotation-x={-Math.PI / 2} position={[0, 0, -1]} receiveShadow renderOrder={-1}>
        <planeGeometry args={[96, 96]} />
        <primitive object={material} attach="material" />
      </mesh>
    </>
  )
}

function Sidewalks() {
  const tile = sidewalkTexture()
  const timeOfDay = useSceneStore((s) => s.timeOfDay)
  const roughness = timeOfDay === 'dusk' ? 0.3 : 0.38

  return (
    <group>
      {/* North sidewalk, split by the alley. */}
      <WetConcreteSlab x={-13.6} z={1.85} width={40.8} depth={3.7} color="#5e6265" map={tile} roughness={roughness} />
      <WetConcreteSlab x={23.3} z={1.85} width={21.4} depth={3.7} color="#5e6265" map={tile} roughness={roughness} />
      {/* South sidewalk in front of the camera. */}
      <WetConcreteSlab x={0} z={13.95} width={68} depth={3.7} color="#585c60" map={tile} roughness={roughness} />
      {/* Narrow alley shoulders. */}
      <WetConcreteSlab x={6.92} z={-5.6} width={0.5} depth={18.2} color="#4b4e51" map={tile} roughness={roughness} />
      <WetConcreteSlab x={12.86} z={-5.6} width={0.5} depth={18.2} color="#4b4e51" map={tile} roughness={roughness} />
      {/* Curbs (simple extruded strips with a chamfer-ish profile). */}
      <Curb x={-13.6} z={ROAD.z0} width={40.8} />
      <Curb x={23.3} z={ROAD.z0} width={21.4} />
      <Curb x={0} z={ROAD.z1} width={68} />
    </group>
  )
}

interface SlabProps {
  x: number
  z: number
  width: number
  depth: number
  color: string
  map: THREE.Texture
  roughness: number
}

function WetConcreteSlab({ x, z, width, depth, color, map, roughness }: SlabProps) {
  const mapCloned = useMemo(() => {
    const m = map.clone()
    m.wrapS = THREE.RepeatWrapping
    m.wrapT = THREE.RepeatWrapping
    m.repeat.set(Math.max(1, width / 3), Math.max(1, depth / 3))
    m.needsUpdate = true
    return m
  }, [map, width, depth])
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.075, 0]} receiveShadow>
        <boxGeometry args={[width, 0.15, depth]} />
        <meshPhysicalMaterial
          map={mapCloned}
          color={color}
          roughness={roughness}
          metalness={0.03}
          clearcoat={0.55}
          clearcoatRoughness={0.24}
          envMapIntensity={0.45}
        />
      </mesh>
      {/* Thin, damp darker band along the curb. */}
      <mesh position={[0, 0.152, depth / 2 - 0.17]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[width, 0.34]} />
        <meshBasicMaterial color="#101418" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Curb({ x, z, width }: { x: number; z: number; width: number }) {
  return (
    <mesh position={[x, 0.075, z]} receiveShadow castShadow>
      <boxGeometry args={[width, 0.19, 0.22]} />
      <meshStandardMaterial color="#595d60" roughness={0.48} metalness={0.05} />
    </mesh>
  )
}

function RoadMarkings() {
  const paint = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#c7ccc6',
        roughness: 0.44,
        metalness: 0.02,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        transparent: true,
        opacity: 0.78,
      }),
    [],
  )
  const stripes = useMemo(() => {
    const items: Array<{ x: number; z: number; w: number; d: number; rot?: number }> = []
    // Center broken line.
    for (let x = -32; x < 32; x += 5.6) {
      if (x > 14 && x < 21) continue
      items.push({ x, z: 7.95, w: 2.9, d: 0.12 })
    }
    // Edge lines.
    items.push({ x: -6, z: 4.05, w: 52, d: 0.1 })
    items.push({ x: -6, z: 11.75, w: 52, d: 0.1 })
    // Crosswalk at the east side of the block.
    for (let x = 15.0; x < 20.0; x += 0.92) {
      items.push({ x, z: 7.9, w: 0.52, d: 7.3 })
    }
    // Stop line before crosswalk.
    items.push({ x: 13.7, z: 7.9, w: 0.16, d: 7.6 })
    // Crosswalk across the alley on the north sidewalk edge.
    for (let z = 0.5; z < 3.4; z += 0.82) {
      items.push({ x: 9.9, z, w: 4.9, d: 0.38 })
    }
    return items
  }, [])

  return (
    <group>
      {stripes.map((s, i) => (
        <mesh key={i} position={[s.x, 0.012, s.z]} rotation-x={-Math.PI / 2} material={paint}>
          <planeGeometry args={[s.w, s.d]} />
        </mesh>
      ))}
      {/* Manholes and drains sit just above the wet layer for a crisp edge. */}
      {[[-8.4, 6.2], [19.2, 5.0]].map((p, i) => (
        <mesh key={`mh-${i}`} position={[p[0], 0.015, p[1]]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.42, 24]} />
          <meshStandardMaterial color="#2a2d2f" roughness={0.42} metalness={0.42} />
        </mesh>
      ))}
      {[-6.5, 0.5, 6.0, 15.0].map((x, i) => (
        <mesh key={`drain-${i}`} position={[x, 0.016, 3.94]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.95, 0.34]} />
          <meshStandardMaterial color="#171a1c" roughness={0.62} metalness={0.4} />
        </mesh>
      ))}
    </group>
  )
}
