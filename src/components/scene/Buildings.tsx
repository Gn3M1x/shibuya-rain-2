import { useMemo } from 'react'
import * as THREE from 'three'
import { buildingTexture, signTexture } from '../../utils/textures'
import { GlowSprite, SignPlane } from './Signs'
import { useSceneStore } from '../../state/useSceneStore'
import { QUALITY } from '../../config/quality'

/* ------------------------------------------------------------------ */
/*  Shared facade materials                                            */
/* ------------------------------------------------------------------ */

function useFacadeMaterials() {
  return useMemo(() => {
    const make = (variant: number) => {
      const tex = buildingTexture(variant)
      return new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.78,
        color: '#6f747a',
        roughness: 0.9,
        metalness: 0.04,
      })
    }
    return [make(0), make(1), make(2), make(3)]
  }, [])
}

interface NearBuildingProps {
  x: number
  front: number
  w: number
  d: number
  h: number
  variant: number
  facing: 'north' | 'south'
  shop: string
  sub: string
  vertical: string
  neon: string
  material: THREE.Material
}

function NearBuilding({ x, front, w, d, h, variant, facing, shop, sub, vertical, neon, material }: NearBuildingProps) {
  const zc = facing === 'north' ? front - d / 2 : front + d / 2
  const rotation = facing === 'north' ? 0 : Math.PI
  const shopSign = useMemo(
    () => signTexture({ text: shop, sub, bg: '#121417', fg: '#f5eee0', accent: neon }),
    [shop, sub, neon],
  )
  const vertSign = useMemo(
    () => signTexture({ text: vertical, bg: '#101215', fg: '#f4efe2', accent: neon, vertical: true }),
    [vertical, neon],
  )

  const acUnits = useMemo(
    () =>
      Array.from({ length: 2 }, (_, i) => ({
        y: 3.8 + i * (h * 0.24) + (variant % 2) * 0.7,
        x: (i === 0 ? -1 : 1) * w * 0.28,
      })),
    [h, variant, w],
  )

  return (
    <group position={[x, 0, zc]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow material={material}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* Parapet cap. */}
      <mesh position={[0, h + 0.14, 0]}>
        <boxGeometry args={[w + 0.24, 0.28, d + 0.24]} />
        <meshStandardMaterial color="#1a1d20" roughness={0.85} />
      </mesh>
      {/* Rooftop boxes. */}
      <mesh position={[w * 0.18, h + 0.85, -d * 0.15]} castShadow>
        <boxGeometry args={[w * 0.26, 1.5, d * 0.18]} />
        <meshStandardMaterial color="#2c3033" roughness={0.9} />
      </mesh>

      <group position={[0, 0, facing === 'north' ? d / 2 : -d / 2]} rotation-y={rotation}>
        {/* Recessed dark shopfront. */}
        <mesh position={[0, 1.55, -0.12]}>
          <boxGeometry args={[w * 0.9, 3.1, 0.24]} />
          <meshStandardMaterial color="#101215" roughness={0.55} metalness={0.1} />
        </mesh>
        {/* Dim interior glow + mullions. */}
        <mesh position={[0, 1.5, 0.015]}>
          <planeGeometry args={[w * 0.78, 2.1]} />
          <meshBasicMaterial color={new THREE.Color(neon).multiplyScalar(0.42)} toneMapped={false} opacity={0.85} transparent />
        </mesh>
        {[-0.26, 0, 0.26].map((f) => (
          <mesh key={f} position={[f * w * 0.8, 1.5, 0.03]}>
            <boxGeometry args={[0.07, 2.2, 0.08]} />
            <meshStandardMaterial color="#24282a" roughness={0.4} metalness={0.5} />
          </mesh>
        ))}
        {/* Awning / canopy over the shop. */}
        <mesh position={[0, 2.92, 0.42]} castShadow>
          <boxGeometry args={[w * 0.92, 0.12, 1.0]} />
          <meshStandardMaterial color="#24282a" roughness={0.54} metalness={0.4} />
        </mesh>
        <mesh position={[0, 2.82, 0.9]}>
          <boxGeometry args={[w * 0.92, 0.16, 0.05]} />
          <meshStandardMaterial color={neon} emissive={neon} emissiveIntensity={0.9} roughness={0.4} />
        </mesh>
        {/* Shop sign. */}
        <SignPlane
          texture={shopSign}
          width={Math.min(w * 0.78, 4.4)}
          height={0.88}
          position={[0, 3.65, 0.07]}
          intensity={1.15}
        />
        {/* Vertical neon sign column. */}
        <SignPlane
          texture={vertSign}
          width={0.72}
          height={2.55}
          position={[w * 0.38, Math.min(h - 2.2, 6.2), 0.16]}
          intensity={1.35}
        />
        <GlowSprite position={[0, 1.5, 0.5]} scale={5.0} opacity={0.14} color={hexToGlow(neon)} />
        <GlowSprite
          position={[w * 0.38, Math.min(h - 2.2, 6.2), 0.3]}
          scale={3.4}
          opacity={0.22}
          color={neon.replace('#', 'rgba(') === neon ? 'rgba(255,210,160,1)' : hexToGlow(neon)}
        />
        {/* Wall AC units. */}
        {acUnits.map((ac, i) => (
          <group key={i} position={[ac.x, Math.min(ac.y, h - 1.2), 0.22]}>
            <mesh castShadow>
              <boxGeometry args={[0.72, 0.52, 0.34]} />
              <meshStandardMaterial color="#8b8a83" roughness={0.7} metalness={0.2} />
            </mesh>
            <mesh position={[0.16, 0, 0.18]} rotation-x={Math.PI / 2}>
              <circleGeometry args={[0.15, 12]} />
              <meshStandardMaterial color="#2b2f31" roughness={0.6} metalness={0.3} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

function hexToGlow(hex: string): string {
  const c = new THREE.Color(hex)
  const r = Math.round(Math.min(1, c.r) * 255)
  const g = Math.round(Math.min(1, c.g) * 255)
  const b = Math.round(Math.min(1, c.b) * 255)
  return `rgba(${r},${g},${b},1)`
}

/* ------------------------------------------------------------------ */
/*  The immediate city block                                           */
/* ------------------------------------------------------------------ */

const WEST = [
  { x: -11.8, front: 0, w: 5.9, d: 10, h: 13.5, variant: 0, shop: 'ラーメン', sub: 'RAMEN  ·  深夜営業', vertical: '居酒屋', neon: '#ff6a4a' },
  { x: -18.6, front: 0, w: 6.5, d: 12, h: 17.5, variant: 1, shop: 'カラオケ', sub: 'KARAOKE  24H', vertical: '24時間', neon: '#4fc3ff' },
  { x: -26.7, front: 0, w: 9.2, d: 13, h: 10.5, variant: 2, shop: 'クリーニング', sub: 'CLEANING', vertical: '珈琲', neon: '#ffd36a' },
  { x: -32.9, front: 0, w: 4.8, d: 11, h: 20.5, variant: 3, shop: 'ドラッグ', sub: 'DRUG STORE', vertical: '薬', neon: '#59e0a8' },
] as const

const EAST = [
  { x: 16.4, front: 0, w: 5.7, d: 11, h: 15.5, variant: 1, shop: '寿司', sub: 'SUSHI', vertical: '鮨', neon: '#ff9c5a' },
  { x: 23.4, front: 0, w: 7.4, d: 12, h: 11.5, variant: 2, shop: 'カフェ', sub: 'COFFEE  ·  2F', vertical: '珈琲', neon: '#7fe0b0' },
  { x: 30.9, front: 0, w: 7.2, d: 12, h: 19, variant: 3, shop: '書店', sub: 'BOOKS', vertical: '本', neon: '#ffd36a' },
] as const

const SOUTH = [
  { x: -24.5, front: 15.35, w: 9.6, d: 10, h: 16, variant: 0, shop: '焼肉', sub: 'YAKINIKU', vertical: '焼肉', neon: '#ff5c45' },
  { x: -13.2, front: 15.35, w: 9.0, d: 10, h: 22, variant: 1, shop: 'パチンコ', sub: 'PACHINKO', vertical: 'パチンコ', neon: '#ff5bd0' },
  { x: -2.4, front: 15.35, w: 8.2, d: 10, h: 12, variant: 2, shop: '居酒屋', sub: 'IZAKAYA', vertical: '酒', neon: '#ffb35c' },
  { x: 7.4, front: 15.35, w: 8.8, d: 10, h: 18, variant: 3, shop: 'ラーメン', sub: 'RAMEN', vertical: '拉麺', neon: '#ff6a4a' },
  { x: 17.4, front: 15.35, w: 8.2, d: 10, h: 14, variant: 0, shop: 'ホテル', sub: 'HOTEL  ·  VACANCY', vertical: 'HOTEL', neon: '#5fa8ff' },
  { x: 27.6, front: 15.35, w: 9.0, d: 10, h: 20, variant: 1, shop: '電器', sub: 'ELECTRONICS', vertical: '家電', neon: '#ffd36a' },
] as const

export function Buildings() {
  const materials = useFacadeMaterials()
  return (
    <group>
      {WEST.map((b) => (
        <NearBuilding key={b.x} {...b} facing="north" material={materials[b.variant]} />
      ))}
      {EAST.map((b) => (
        <NearBuilding key={b.x} {...b} facing="north" material={materials[b.variant]} />
      ))}
      {SOUTH.map((b) => (
        <NearBuilding key={b.x} {...b} facing="south" material={materials[b.variant]} />
      ))}
      <AlleyBuildings />
      <DistantCity />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  The alley beside the store                                         */
/* ------------------------------------------------------------------ */

function AlleyBuildings() {
  const leftMat = useMemo(() => {
    const tex = buildingTexture(2)
    return new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#fff', emissiveIntensity: 0.5, color: '#6d7176', roughness: 0.92 })
  }, [])
  const rightMat = useMemo(() => {
    const tex = buildingTexture(3)
    return new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#fff', emissiveIntensity: 0.5, color: '#686d72', roughness: 0.92 })
  }, [])
  const ramen = useMemo(
    () => signTexture({ text: '深夜ラーメン', sub: 'OPEN 2:00', bg: '#171412', fg: '#ffd9a0', accent: '#e0452f' }),
    [],
  )
  return (
    <group>
      {/* Thin wall building on the store side, facing the alley. */}
      <mesh position={[6.4, 5.2, -8.4]} material={leftMat} castShadow receiveShadow>
        <boxGeometry args={[1.6, 10.4, 13.6]} />
      </mesh>
      <mesh position={[12.9, 6.0, -8.8]} material={rightMat} castShadow receiveShadow>
        <boxGeometry args={[1.4, 12, 14.4]} />
      </mesh>
      {/* Warm little ramen shop at the end of the alley. */}
      <group position={[9.75, 0, -14.2]}>
        <mesh position={[0, 1.7, -0.6]} castShadow>
          <boxGeometry args={[3.6, 3.4, 2.2]} />
          <meshStandardMaterial color="#2b2622" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.35, 0.52]}>
          <planeGeometry args={[2.4, 1.9]} />
          <meshBasicMaterial color="#ffc885" toneMapped={false} />
        </mesh>
        <SignPlane texture={ramen} width={2.8} height={0.7} position={[0, 2.5, 0.55]} intensity={1.3} />
        {[-1.2, 1.2].map((x) => (
          <mesh key={x} position={[x, 2.75, 0.5]}>
            <sphereGeometry args={[0.17, 10, 8]} />
            <meshBasicMaterial color="#ff5e3a" toneMapped={false} />
          </mesh>
        ))}
        <GlowSprite position={[0, 2.0, 0.7]} scale={2.6} opacity={0.16} color="rgba(255,180,120,1)" />
      </group>
      {/* AC boxes and pipes on the alley walls. */}
      {[-3.2, -6.1, -9.4].map((z, i) => (
        <group key={z} position={[7.18, 2.4 + i * 0.9, z]}>
          <mesh>
            <boxGeometry args={[0.38, 0.55, 0.7]} />
            <meshStandardMaterial color="#8c8b83" roughness={0.72} metalness={0.18} />
          </mesh>
          <mesh position={[-0.2, 0, 0]} rotation-y={Math.PI / 2}>
            <circleGeometry args={[0.18, 12]} />
            <meshStandardMaterial color="#2f3436" roughness={0.6} metalness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Steel door + drain pipes. */}
      <mesh position={[7.12, 1.2, -1.9]}>
        <boxGeometry args={[0.08, 2.3, 1.0]} />
        <meshStandardMaterial color="#3f4446" roughness={0.55} metalness={0.35} />
      </mesh>
      <mesh position={[12.18, 2.6, -4.2]}>
        <cylinderGeometry args={[0.06, 0.06, 5.2, 6]} />
        <meshStandardMaterial color="#4a4f50" roughness={0.6} metalness={0.3} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Distant skyline                                                    */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function DistantCity() {
  const quality = useSceneStore((s) => s.quality)
  const count = QUALITY[quality].maxLights > 7 ? 52 : 34

  const groups = useMemo(() => {
    const rand = mulberry32(9031)
    const buckets: { variant: number; matrices: THREE.Matrix4[] }[] = [0, 1, 2, 3].map((variant) => ({
      variant,
      matrices: [],
    }))
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2
      const radius = 52 + rand() * 55
      const x = Math.cos(angle) * radius * 1.15
      const z = Math.sin(angle) * radius * 0.9 - 6
      const w = 7 + rand() * 13
      const d = 7 + rand() * 13
      const h = 14 + rand() * 44
      const m = new THREE.Matrix4()
      m.compose(
        new THREE.Vector3(x, h / 2, z),
        new THREE.Quaternion(),
        new THREE.Vector3(w, h, d),
      )
      buckets[i % 4].matrices.push(m)
    }
    return buckets
  }, [count])

  return (
    <group>
      {groups.map((bucket) => (
        <DistantBucket key={bucket.variant} variant={bucket.variant} matrices={bucket.matrices} />
      ))}
      {/* Aircraft warning lights on the tallest silhouettes. */}
      <GlowSprite position={[-42, 41, -58]} scale={2.2} opacity={0.8} color="rgba(255,58,48,1)" />
      <GlowSprite position={[34, 49, -66]} scale={2.2} opacity={0.8} color="rgba(255,58,48,1)" />
      <GlowSprite position={[58, 36, 44]} scale={2} opacity={0.7} color="rgba(255,58,48,1)" />
    </group>
  )
}

function DistantBucket({ variant, matrices }: { variant: number; matrices: THREE.Matrix4[] }) {
  const ref = useMemo(() => ({ current: null as THREE.InstancedMesh | null }), [])
  const material = useMemo(() => {
    const tex = buildingTexture(4 + (variant % 4))
    return new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: '#ffffff',
      emissiveIntensity: 0.72,
      color: '#5d6268',
      roughness: 0.95,
      metalness: 0,
      fog: true,
    })
  }, [variant])
  return (
    <instancedMesh
      ref={(m) => {
        ref.current = m
        if (m) {
          matrices.forEach((mat, i) => m.setMatrixAt(i, mat))
          m.instanceMatrix.needsUpdate = true
          m.frustumCulled = false
        }
      }}
      args={[undefined, material, matrices.length]}
    >
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  )
}
