import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '../../state/useSceneStore'
import { QUALITY } from '../../config/quality'
import { splashTexture } from '../../utils/textures'

const WEATHER_LAYER = 1

/* ------------------------------------------------------------------ */
/*  Rain streaks                                                       */
/* ------------------------------------------------------------------ */

const rainVertex = /* glsl */ `
precision highp float;

attribute vec3 aOffset;
attribute vec3 aProfile; // x: width, y: length, z: speed
attribute float aSeed;

uniform float uTime;
uniform vec2 uWind;
uniform vec3 uCameraPos;
uniform float uHeight;
uniform float uArea;
uniform float uOpacity;
uniform float uRain;

varying vec2 vUv;
varying float vFade;

void main() {
  vUv = uv;

  vec3 p = aOffset;
  p.y = mod(p.y - uTime * aProfile.z, uHeight);
  p.x += sin(uTime * 0.23 + aSeed * 11.0) * uWind.x * 0.22;
  p.z += cos(uTime * 0.19 + aSeed * 7.0) * uWind.y * 0.22;

  vec2 rel = mod(p.xz - uCameraPos.xz + uArea * 0.5, uArea) - uArea * 0.5;
  vec3 center = vec3(uCameraPos.x + rel.x, p.y, uCameraPos.z + rel.y);

  vec3 fall = normalize(vec3(uWind.x * 0.5, -1.0, uWind.y * 0.5));
  vec3 viewDir = normalize(cameraPosition - center);
  vec3 right = normalize(cross(fall, viewDir) + vec3(1e-5));

  float around = smoothstep(0.0, 7.0, length(rel));
  float width = aProfile.x * mix(0.52, 1.15, around);
  float dist = length(center - cameraPosition);
  float streakLen = aProfile.y * (0.85 + 0.35 * aSeed) * mix(0.42, 1.0, smoothstep(1.6, 7.0, dist));

  vec3 world = center
    + right * (position.x - 0.5) * width
    + fall * (position.y - 0.5) * streakLen;

  vFade = uOpacity * mix(0.05, 1.0, smoothstep(1.8, 11.0, dist)) * (1.0 - smoothstep(24.0, 55.0, dist));
  vFade *= 0.55 + 0.45 * aSeed;
  vFade *= 0.35 + 0.65 * uRain;

  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`

const rainFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying float vFade;

void main() {
  float along = smoothstep(0.0, 0.13, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));
  float across = sin(vUv.x * 3.14159265);
  float alpha = along * across * vFade;
  if (alpha < 0.003) discard;
  vec3 tint = mix(vec3(0.42, 0.52, 0.65), vec3(0.72, 0.82, 0.94), vUv.y);
  gl_FragColor = vec4(tint * vec3(0.80, 0.88, 1.0), alpha * 0.44);
}
`

function makeRainGeometry(count: number): THREE.InstancedBufferGeometry {
  const base = new THREE.PlaneGeometry(1, 1)
  const geometry = new THREE.InstancedBufferGeometry()
  const position = base.getAttribute('position')
  const uv = base.getAttribute('uv')
  const index = base.getIndex()!
  geometry.setAttribute('position', position)
  geometry.setAttribute('uv', uv)
  geometry.setIndex(index)
  base.dispose()

  const offsets = new Float32Array(count * 3)
  const profiles = new Float32Array(count * 3)
  const seeds = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const near = Math.random()
    offsets[i * 3 + 0] = (Math.random() - 0.5) * 29
    offsets[i * 3 + 1] = Math.random() * 23
    offsets[i * 3 + 2] = (Math.random() - 0.5) * 29

    const layer = near > 0.62
    profiles[i * 3 + 0] = layer ? 0.005 + Math.random() * 0.012 : 0.0025 + Math.random() * 0.005
    profiles[i * 3 + 1] = layer ? 0.38 + Math.random() * 0.62 : 0.22 + Math.random() * 0.38
    profiles[i * 3 + 2] = layer ? 19 + Math.random() * 13 : 12 + Math.random() * 9
    seeds[i] = Math.random()
  }

  geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3))
  geometry.setAttribute('aProfile', new THREE.InstancedBufferAttribute(profiles, 3))
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))
  geometry.instanceCount = count
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60)
  return geometry
}

function RainStreaks() {
  const quality = useSceneStore((s) => s.quality)
  const profile = QUALITY[quality]
  const count = profile.rainCount
  const geometry = useMemo(() => makeRainGeometry(count), [count])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uWind: { value: new THREE.Vector2(-0.52, 0.14) },
          uCameraPos: { value: new THREE.Vector3() },
          uHeight: { value: 23 },
          uArea: { value: 29 },
          uOpacity: { value: 0.62 },
          uRain: { value: 0.8 },
        },
        vertexShader: rainVertex,
        fragmentShader: rainFragment,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        toneMapped: false,
      }),
    [],
  )
  const meshRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    const mesh = meshRef.current
    if (mesh) mesh.layers.set(WEATHER_LAYER)
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame((state, delta) => {
    const rain = useSceneStore.getState().rainIntensity
    const mat = material
    mat.uniforms.uTime.value += delta
    mat.uniforms.uCameraPos.value.copy(state.camera.position)
    mat.uniforms.uRain.value = rain
    mat.uniforms.uOpacity.value = 0.65 + rain * 0.5
    const gust = Math.sin(mat.uniforms.uTime.value * 0.31) * 0.5 + Math.sin(mat.uniforms.uTime.value * 0.73) * 0.25
    mat.uniforms.uWind.value.set(-0.34 - gust * 0.30, 0.1 + gust * 0.12)
    geometry.instanceCount = Math.max(0, Math.floor(count * (0.25 + rain * 0.85)))
  })

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={3} />
  )
}

/* ------------------------------------------------------------------ */
/*  Splashes on the wet ground                                         */
/* ------------------------------------------------------------------ */

const splashVertex = /* glsl */ `
precision highp float;

attribute vec3 aOffset;
attribute vec3 aProfile; // x: size, y: phase, z: speed
uniform float uTime;
uniform vec3 uCameraPos;
uniform float uArea;
uniform float uRain;
varying float vAlpha;
varying float vRot;

void main() {
  vec2 rel = mod(aOffset.xz - uCameraPos.xz + uArea * 0.5, uArea) - uArea * 0.5;
  vec3 world = vec3(uCameraPos.x + rel.x, 0.03, uCameraPos.z + rel.y);
  vec4 mv = viewMatrix * vec4(world, 1.0);

  float cycle = uTime * (0.55 + aProfile.z * 0.35) + aProfile.y;
  float life = fract(cycle);
  float alive = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.42, 0.92, life));
  float size = aProfile.x * (0.35 + life * 1.15);

  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(15.0, size * (185.0 / max(0.001, -mv.z)) * (0.65 + uRain * 0.8));
  vAlpha = alive * (0.28 + uRain * 0.55) * smoothstep(0.8, 3.4, -mv.z);
  vRot = aProfile.y * 9.0 + life * 2.0;
}
`

const splashFragment = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
varying float vAlpha;
varying float vRot;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float c = cos(vRot);
  float s = sin(vRot);
  uv = mat2(c, -s, s, c) * uv + 0.5;
  vec4 tex = texture2D(uMap, uv);
  float alpha = tex.a * vAlpha;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(vec3(0.64, 0.78, 0.92) * (0.7 + tex.r * 0.6), alpha);
}
`

function makeSplashGeometry(count: number) {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const profiles = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 36
    positions[i * 3 + 1] = 0
    positions[i * 3 + 2] = (Math.random() - 0.5) * 36
    profiles[i * 3] = 0.22 + Math.random() * 0.65
    profiles[i * 3 + 1] = Math.random()
    profiles[i * 3 + 2] = Math.random()
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aOffset', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aProfile', new THREE.BufferAttribute(profiles, 3))
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40)
  return geometry
}

function Splashes() {
  const quality = useSceneStore((s) => s.quality)
  const count = QUALITY[quality].splashCount
  const map = useMemo(() => splashTexture(), [])
  const geometry = useMemo(() => makeSplashGeometry(count), [count])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uCameraPos: { value: new THREE.Vector3() },
          uArea: { value: 32 },
          uRain: { value: 0.8 },
          uMap: { value: map },
        },
        vertexShader: splashVertex,
        fragmentShader: splashFragment,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [map],
  )
  const pointsRef = useRef<THREE.Points>(null)

  useEffect(() => {
    if (pointsRef.current) pointsRef.current.layers.set(WEATHER_LAYER)
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame((state, delta) => {
    material.uniforms.uTime.value += delta
    material.uniforms.uCameraPos.value.copy(state.camera.position)
    material.uniforms.uRain.value = useSceneStore.getState().rainIntensity
  })

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />
}

/* ------------------------------------------------------------------ */
/*  Canopy drips                                                       */
/* ------------------------------------------------------------------ */

function CanopyDrips() {
  const quality = useSceneStore((s) => s.quality)
  const count = QUALITY[quality].dripCount
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#bcd6e8'),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  )
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.016, 0.005, 0.38, 5, 1, true), [])
  const drops = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: 0,
        z: 0,
        y: 0,
        speed: 0,
        delay: 0,
        phase: 0,
      })),
    [count],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const resetDrop = (drop: (typeof drops)[number], initial = false) => {
    const side = Math.random()
    if (side < 0.66) {
      drop.x = -5.35 + Math.random() * 10.7
      drop.z = 1.52 + (Math.random() - 0.5) * 0.14
    } else {
      drop.x = -5.45 + Math.random() * 0.16
      drop.z = -6.8 + Math.random() * 7.8
    }
    drop.y = 2.95 + (initial ? -Math.random() * 3.0 : 0)
    drop.speed = 2.6 + Math.random() * 3.2
    drop.delay = Math.random() * 2.4
    drop.phase = Math.random() * Math.PI * 2
  }

  useEffect(() => {
    drops.forEach((d) => resetDrop(d, true))
    if (meshRef.current) meshRef.current.layers.set(WEATHER_LAYER)
    return () => {
      geometry.dispose()
      material.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drops, geometry, material])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i]
      d.delay -= delta
      if (d.delay <= 0) {
        d.y -= d.speed * delta
        if (d.y < 0.02) resetDrop(d)
      }
      dummy.position.set(d.x + Math.sin(d.phase + d.y * 3.0) * 0.012, d.y, d.z)
      dummy.rotation.set(0, 0, Math.sin(d.phase) * 0.08)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} renderOrder={2} />
  )
}

export function Rain() {
  return (
    <group>
      <RainStreaks />
      <Splashes />
      <CanopyDrips />
    </group>
  )
}
