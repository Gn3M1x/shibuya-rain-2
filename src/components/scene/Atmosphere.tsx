import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { AMBIENT } from '../../config/world'
import { useSceneStore } from '../../state/useSceneStore'
import { QUALITY } from '../../config/quality'
import { glowTexture } from '../../utils/textures'

/* ------------------------------------------------------------------ */
/*  Sky dome                                                           */
/* ------------------------------------------------------------------ */

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
`

const skyFragment = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y * 1.2 + 0.08, 0.0, 1.0);
  vec3 col = mix(uHorizon, uTop, pow(h, 0.62));

  // Slow, low overcast drifting above the city.
  vec2 p = dir.xz / max(0.12, dir.y + 0.35) * 0.55;
  float n = noise(p * 1.3 + vec2(uTime * 0.006, uTime * 0.003));
  n += noise(p * 2.6 - vec2(uTime * 0.011, uTime * 0.004)) * 0.5;
  n = smoothstep(0.35, 1.1, n) * smoothstep(0.0, 0.3, dir.y);
  col += vec3(0.021, 0.028, 0.04) * n;

  // A faint sodium glow from the unseen city, just above the rooftops.
  float horizonGlow = exp(-pow((dir.y - 0.02) * 9.0, 2.0));
  col += vec3(0.08, 0.055, 0.035) * horizonGlow * 0.35;

  gl_FragColor = vec4(col, 1.0);
}
`

function SkyDome() {
  const timeOfDay = useSceneStore((s) => s.timeOfDay)
  const amb = AMBIENT[timeOfDay]
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTop: { value: new THREE.Color(amb.skyTop) },
          uHorizon: { value: new THREE.Color(amb.skyHorizon) },
          uTime: { value: 0 },
        },
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    [amb.skyTop, amb.skyHorizon],
  )
  useEffect(() => {
    material.uniforms.uTop.value.set(amb.skyTop)
    material.uniforms.uHorizon.value.set(amb.skyHorizon)
  }, [amb, material])
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => {
    const id = setInterval(() => {
      material.uniforms.uTime.value += 0.25
    }, 120)
    return () => clearInterval(id)
  }, [material])
  return (
    <mesh scale={[180, 180, 180]} renderOrder={-100} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 20]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/*  Procedural environment map for PBR glass / chrome                  */
/* ------------------------------------------------------------------ */

function buildEnvironmentScene(timeOfDay: 'night' | 'dusk') {
  const amb = AMBIENT[timeOfDay]
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(amb.skyTop)

  const domeMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: new THREE.Color(amb.skyHorizon) })
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(40, 24, 16), domeMat))

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#07090c') }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.6
  scene.add(ground)

  const panel = (color: string, intensity: number, pos: [number, number, number], size: [number, number, number]) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat)
    mesh.position.set(...pos)
    scene.add(mesh)
  }

  // The warm convenience store facade, ahead of the camera.
  panel('#ffe1a8', 3.6, [0, 1.7, 8], [10, 2.6, 0.4])
  panel('#fff2cf', 1.7, [0, 0.10, 9], [12, 0.05, 2.0])
  // Cold street lamps.
  panel('#bcd6ff', 2.2, [-10, 6, 7], [0.3, 3.0, 0.3])
  panel('#bcd6ff', 1.8, [11, 5.5, 6], [0.3, 2.6, 0.3])
  // Neon spill from the alley and building signs.
  panel('#ff5f4a', 2.4, [10, 5, -5], [1.6, 3.2, 0.2])
  panel('#49b8ff', 1.7, [-12, 5, -7], [1.2, 2.6, 0.2])
  panel('#ffb35c', 1.8, [-4, 3, -9], [1.4, 1.2, 0.2])
  // Faint overcast bounce.
  panel('#3d5678', 0.7, [0, 14, -2], [20, 6, 0.2])

  return scene
}

function EnvironmentBake() {
  const { gl, scene } = useThree()
  const timeOfDay = useSceneStore((s) => s.timeOfDay)
  const quality = useSceneStore((s) => s.quality)
  const resolution = QUALITY[quality].envResolution

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const envScene = buildEnvironmentScene(timeOfDay)
    const target = pmrem.fromScene(envScene, 0.04, 1, 60)
    const previous = scene.environment
    scene.environment = target.texture
    scene.environmentIntensity = timeOfDay === 'night' ? 0.72 : 0.9
    gl.toneMappingExposure = timeOfDay === 'night' ? 1.04 : 1.12

    return () => {
      scene.environment = previous
      target.dispose()
      pmrem.dispose()
      envScene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose()
      })
    }
  }, [gl, scene, timeOfDay, resolution])

  return null
}

/* ------------------------------------------------------------------ */
/*  Fog + background                                                   */
/* ------------------------------------------------------------------ */

function FogController() {
  const { scene } = useThree()
  const timeOfDay = useSceneStore((s) => s.timeOfDay)
  useEffect(() => {
    const amb = AMBIENT[timeOfDay]
    const fog = new THREE.FogExp2(amb.fog, amb.fogDensity)
    scene.fog = fog
    scene.background = new THREE.Color(amb.skyTop)
    return () => {
      scene.fog = null
    }
  }, [scene, timeOfDay])
  return null
}

/* ------------------------------------------------------------------ */
/*  Low ground mist: soft billboards that catch the rain haze          */
/* ------------------------------------------------------------------ */

const MIST_SPOTS: Array<[number, number, number, number, number]> = [
  [-16, 1.5, 4.5, 22, 6],
  [13, 1.6, 3.0, 20, 6],
  [-7, 1.2, 11.5, 26, 7],
  [18, 2.0, 12.0, 24, 7],
  [0, 2.2, 22.0, 34, 9],
  [-24, 2.4, 14.0, 26, 8],
  [9, 1.3, -10.0, 18, 6],
]

function GroundMist() {
  const group = useRef<THREE.Group>(null)
  const texture = useMemo(() => glowTexture('rgba(128,152,184,0.5)'), [])
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const t = clock.elapsedTime
    g.children.forEach((child, i) => {
      child.position.x = MIST_SPOTS[i][0] + Math.sin(t * 0.035 + i * 1.7) * 2.2
      child.position.z = MIST_SPOTS[i][2] + Math.cos(t * 0.025 + i * 0.9) * 1.4
    })
  })
  return (
    <group ref={group}>
      {MIST_SPOTS.map(([x, y, z, sx, sy], i) => (
        <sprite key={i} position={[x, y, z]} scale={[sx, sy, 1]} frustumCulled={false}>
          <spriteMaterial
            map={texture}
            transparent
            opacity={i % 3 === 0 ? 0.105 : 0.07}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            color="#9db4d0"
            fog={false}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}


/* ------------------------------------------------------------------ */
/*  Drain steam                                                        */
/* ------------------------------------------------------------------ */

const STEAM_SPOTS: [number, number, number][] = [
  [-4.9, 0.15, 2.6],
  [1.9, 0.15, 3.2],
  [8.2, 0.15, 1.6],
  [-8.7, 0.15, 6.0],
]

function DrainSteam() {
  const sprites = useMemo(() => {
    const texture = glowTexture('rgba(176,202,226,0.5)')
    const list: { sprite: THREE.Sprite; baseY: number; phase: number; speed: number }[] = []
    STEAM_SPOTS.forEach(([x, y, z], spotIndex) => {
      for (let i = 0; i < 5; i++) {
        const material = new THREE.SpriteMaterial({
          map: texture,
          color: '#b9cfe4',
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
          fog: false,
        })
        const sprite = new THREE.Sprite(material)
        sprite.position.set(x + (i - 2) * 0.22, y, z + (i % 3) * 0.22)
        sprite.scale.setScalar(0.6)
        list.push({
          sprite,
          baseY: y,
          phase: (i / 5 + spotIndex * 0.17) % 1,
          speed: 0.12 + (i % 3) * 0.03,
        })
      }
    })
    return list
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (const item of sprites) {
      const phase = (item.phase + t * item.speed) % 1
      item.sprite.position.y = item.baseY + phase * 2.3
      item.sprite.scale.setScalar(0.7 + phase * 2.6)
      ;(item.sprite.material as THREE.SpriteMaterial).opacity = Math.sin(phase * Math.PI) * 0.055
    }
  })

  useEffect(() => {
    return () => {
      sprites.forEach((item) => {
        item.sprite.material.dispose()
        item.sprite.geometry.dispose()
      })
    }
  }, [sprites])

  return (
    <group>
      {sprites.map((item, i) => (
        <primitive key={i} object={item.sprite} />
      ))}
    </group>
  )
}

export function Atmosphere() {
  return (
    <group>
      <FogController />
      <EnvironmentBake />
      <SkyDome />
      <GroundMist />
      <DrainSteam />
    </group>
  )
}
