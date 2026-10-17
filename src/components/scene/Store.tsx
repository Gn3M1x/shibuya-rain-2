import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { STORE } from '../../config/world'
import {
  glassStreakTexture,
  glassWaterTexture,
  glassReflectionTexture,
  glassSheenTexture,
  lightShaftTexture,
  posterTexture,
  sevenElevenBlade,
  sevenElevenSign,
  signTexture,
  sidewalkTexture,
  vendingTexture,
} from '../../utils/textures'
import { FrameSign, GlowSprite, SignPlane } from './Signs'

const W = STORE.x1 - STORE.x0
const D = STORE.z1 - STORE.z0
const CX = (STORE.x0 + STORE.x1) / 2
const CZ = (STORE.z0 + STORE.z1) / 2
const ROOF_Y = 3.72
const GLASS_TOP = 2.62
const GLASS_BOTTOM = 0.18

const PRODUCT_COLORS = [
  '#d84835', '#e8bf48', '#357d68', '#3f6fa2', '#e3e0d2', '#c96f32',
  '#7b954b', '#e6b6c2', '#a5412e', '#2f8f9c', '#f0e2ba', '#873a2d',
  '#e7d7a8', '#4b5e86', '#b7c78f', '#d65b4c',
]

interface ProductSpec {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
}

function buildProducts(): ProductSpec[] {
  const items: ProductSpec[] = []

  const shelfRuns = [
    { z: -2.55, width: 8.7, levels: 4, depth: 0.9 },
    { z: -4.65, width: 8.7, levels: 4, depth: 0.9 },
  ]

  for (const run of shelfRuns) {
    for (let level = 0; level < run.levels; level++) {
      const boardY = 0.26 + level * 0.36
      let x = -run.width / 2 + 0.15
      while (x < run.width / 2 - 0.15) {
        const w = 0.09 + Math.random() * 0.14
        const h = 0.12 + Math.random() * 0.16
        const d = 0.1 + Math.random() * 0.18
        items.push({
          position: [x + w / 2, boardY + h / 2 + 0.02, run.z + run.depth / 2 - d / 2 - 0.02],
          scale: [w, h, d],
          color: PRODUCT_COLORS[Math.floor(Math.random() * PRODUCT_COLORS.length)],
        })
        x += w + 0.025 + Math.random() * 0.04
      }
    }
  }

  // Back cooler: dense, bright rows behind glass.
  for (let row = 0; row < 3; row++) {
    for (let shelf = 0; shelf < 2; shelf++) {
      const y = 0.45 + row * 0.46 + shelf * 0.08
      let x = -5.0
      while (x < 4.95) {
        const w = 0.1 + Math.random() * 0.12
        const h = 0.18 + Math.random() * 0.1
        const d = 0.12
        items.push({
          position: [x + w / 2, y + h / 2, -7.42 + shelf * 0.02],
          scale: [w, h, d],
          color: PRODUCT_COLORS[Math.floor(Math.random() * PRODUCT_COLORS.length)],
        })
        x += w + 0.035
      }
    }
  }

  // Magazine rack near the window.
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 14; i++) {
      items.push({
        position: [-4.3 + i * 0.2, 0.62 + row * 0.42, -0.95 + (Math.random() - 0.5) * 0.1],
        scale: [0.17, 0.28, 0.03],
        color: PRODUCT_COLORS[(i + row * 3) % PRODUCT_COLORS.length],
      })
    }
  }

  // Counter snacks.
  for (let i = 0; i < 12; i++) {
    items.push({
      position: [2.7 + i * 0.12, 1.16, -1.15 + (Math.random() - 0.5) * 0.2],
      scale: [0.08, 0.12, 0.08],
      color: PRODUCT_COLORS[(i * 5) % PRODUCT_COLORS.length],
    })
  }

  return items
}

function Products() {
  const items = useMemo(() => buildProducts(), [])
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((item, i) => {
      dummy.position.set(...item.position)
      dummy.scale.set(...item.scale)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      color.set(item.color)
      // Keep the merchandise in the store softly lit but not emissive.
      color.multiplyScalar(0.82)
      mesh.setColorAt(i, color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items, dummy, color])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow={false} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.62} metalness={0.01} />
    </instancedMesh>
  )
}

function ShelfRun({ z, width }: { z: number; width: number }) {
  const boards = [0.24, 0.6, 0.96, 1.32]
  return (
    <group position={[0, 0, z]}>
      {/* Uprights. */}
      {[-width / 2, width / 2].map((x) => (
        <mesh key={x} position={[x, 0.72, 0]}>
          <boxGeometry args={[0.05, 1.45, 0.9]} />
          <meshStandardMaterial color="#c7c5ba" roughness={0.42} metalness={0.3} />
        </mesh>
      ))}
      {/* Boards and front price rails. */}
      {boards.map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0]} receiveShadow>
            <boxGeometry args={[width, 0.035, 0.9]} />
            <meshStandardMaterial color="#b9b7ac" roughness={0.5} metalness={0.18} />
          </mesh>
          <mesh position={[0, y + 0.045, 0.455]}>
            <boxGeometry args={[width, 0.055, 0.018]} />
            <meshStandardMaterial color="#e8e7df" roughness={0.35} emissive="#f6f0d8" emissiveIntensity={0.35} />
          </mesh>
        </group>
      ))}
      {/* Product backing panel. */}
      <mesh position={[0, 0.78, 0.02]}>
        <boxGeometry args={[width, 1.2, 0.03]} />
        <meshStandardMaterial color="#d9d6c8" roughness={0.75} />
      </mesh>
    </group>
  )
}

function WaterGlass() {
  const texture = useMemo(() => {
    const t = glassStreakTexture().clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1.8, 1.35)
    t.needsUpdate = true
    return t
  }, [])
  useFrame((_, delta) => {
    texture.offset.y -= delta * 0.012
    texture.offset.x += delta * 0.0015
  })
  return (
    <mesh position={[CX, 1.4, 0.042]} renderOrder={5}>
      <planeGeometry args={[10.3, 2.42]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.62}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        color="#a9c8d8"
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function WaterMarks() {
  const texture = useMemo(() => {
    const t = glassWaterTexture().clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1.5, 1.2)
    t.needsUpdate = true
    return t
  }, [])
  useFrame((_, delta) => {
    texture.offset.y -= delta * 0.006
  })
  return (
    <mesh position={[CX, 1.4, 0.0435]} renderOrder={5}>
      <planeGeometry args={[10.3, 2.42]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.5}
        depthWrite={false}
        toneMapped={false}
        color="#c7dbe8"
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function GlassReflection() {
  const texture = useMemo(() => {
    const t = glassReflectionTexture()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    t.repeat.set(2.4, 1)
    t.needsUpdate = true
    return t
  }, [])
  return (
    <mesh position={[CX, 1.4, 0.045]} renderOrder={4}>
      <planeGeometry args={[10.3, 2.42]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.92}
        depthWrite={false}
        toneMapped={false}
        color="#b9d2e2"
      />
    </mesh>
  )
}

function GlassFront() {
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#aec8d4',
        metalness: 0.0,
        roughness: 0.08,
        transparent: true,
        opacity: 0.13,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 2.4,
        depthWrite: false,
        side: THREE.FrontSide,
      }),
    [],
  )
  const mullions = [-5.15, -3.55, -1.48, 1.48, 3.55, 5.15]
  return (
    <group>
      <mesh position={[CX, (GLASS_TOP + GLASS_BOTTOM) / 2, 0.01]} material={material} renderOrder={3}>
        <planeGeometry args={[10.3, GLASS_TOP - GLASS_BOTTOM]} />
      </mesh>
      {mullions.map((x) => (
        <mesh key={x} position={[x, GLASS_TOP / 2, 0.035]} castShadow>
          <boxGeometry args={[0.055, GLASS_TOP - 0.08, 0.11]} />
          <meshStandardMaterial color="#292d2f" roughness={0.34} metalness={0.72} />
        </mesh>
      ))}
      {/* Transom and bottom rail. */}
      <mesh position={[CX, GLASS_TOP - 0.025, 0.04]}>
        <boxGeometry args={[10.36, 0.075, 0.12]} />
        <meshStandardMaterial color="#222628" roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[CX, GLASS_BOTTOM + 0.01, 0.04]}>
        <boxGeometry args={[10.36, 0.08, 0.12]} />
        <meshStandardMaterial color="#1c2022" roughness={0.38} metalness={0.7} />
      </mesh>
      {/* Automatic door: twin panels, one slid slightly open. */}
      <group position={[CX - 0.02, 0, 0]}>
        <mesh position={[-0.72, 1.38, 0.055]} renderOrder={4}>
          <planeGeometry args={[1.36, 2.32]} />
          <meshPhysicalMaterial
            color="#c7dde6"
            transparent
            opacity={0.2}
            roughness={0.045}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.03}
            envMapIntensity={1.8}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0.72, 1.38, 0.055]} renderOrder={4}>
          <planeGeometry args={[1.36, 2.32]} />
          <meshPhysicalMaterial
            color="#c7dde6"
            transparent
            opacity={0.2}
            roughness={0.045}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.03}
            envMapIntensity={1.8}
            depthWrite={false}
          />
        </mesh>
        {[-1.42, 0.02, 1.42].map((x) => (
          <mesh key={x} position={[x, 1.27, 0.075]}>
            <boxGeometry args={[0.06, 2.42, 0.08]} />
            <meshStandardMaterial color="#272b2d" roughness={0.3} metalness={0.72} />
          </mesh>
        ))}
        <mesh position={[0, 2.44, 0.08]}>
          <boxGeometry args={[2.92, 0.07, 0.1]} />
          <meshStandardMaterial color="#222628" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Door handles. */}
        {[-0.72, 0.72].map((x) => (
          <mesh key={`h-${x}`} position={[x, 1.16, 0.1]}>
            <boxGeometry args={[0.5, 0.035, 0.035]} />
            <meshStandardMaterial color="#aeb7b8" roughness={0.25} metalness={0.85} />
          </mesh>
        ))}
        {/* Door sensor + sticker. */}
        <mesh position={[0, 2.3, 0.13]}>
          <boxGeometry args={[0.3, 0.06, 0.04]} />
          <meshStandardMaterial color="#111" emissive="#ff3a2a" emissiveIntensity={1.2} />
        </mesh>
        <SignPlane
          texture={signTexture({ text: '自動ドア', sub: 'AUTOMATIC DOOR', bg: '#f2eee0', fg: '#274235', accent: '#d8402c', thin: true })}
          width={0.78}
          height={0.16}
          position={[0.95, 1.9, 0.1]}
          intensity={0.55}
        />
      </group>
      <WaterGlass />
      <WaterMarks />
      <GlassReflection />
      <mesh position={[CX, 1.45, 0.052]} renderOrder={5}>
        <planeGeometry args={[10.3, 2.4]} />
        <meshBasicMaterial
          map={glassSheenTexture()}
          transparent
          opacity={0.5}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          color="#d6e9f6"
        />
      </mesh>
      {/* Posters at eye level. */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-4.5 + i * 0.92, 1.18, 0.062]} renderOrder={6}>
          <planeGeometry args={[0.62, 0.92]} />
          <meshBasicMaterial map={posterTexture(i)} transparent opacity={0.94} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function Interior() {
  const floorTexture = useMemo(() => {
    const t = sidewalkTexture().clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(8, 6)
    t.needsUpdate = true
    return t
  }, [])

  const aisleSign = useMemo(
    () => signTexture({ text: 'おにぎり・パン', sub: 'RICE BALLS / BAKERY', bg: '#f2e7c8', fg: '#6a2a20', accent: '#d8402c', thin: true }),
    [],
  )
  const drinkSign = useMemo(
    () => signTexture({ text: 'ドリンク', sub: 'COLD DRINKS', bg: '#173a5e', fg: '#eef4fa', accent: '#4f9fd8', thin: true }),
    [],
  )

  return (
    <group>
      <mesh position={[CX, 0.16, CZ]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[10.1, 7.5]} />
        <meshStandardMaterial map={floorTexture} color="#7f7a70" roughness={0.34} metalness={0.06} />
      </mesh>
      <mesh position={[CX, 3.20, CZ]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[10.1, 7.5]} />
        <meshStandardMaterial color="#41403c" roughness={0.86} />
      </mesh>
      {/* Ceiling fluorescent battens. */}
      {[-2.8, 0, 2.8].map((x) =>
        [-2.6, -5.1].map((z) => (
          <group key={`${x}-${z}`} position={[x, 3.13, z]}>
            <mesh rotation-x={Math.PI / 2}>
              <planeGeometry args={[1.65, 0.34]} />
              <meshStandardMaterial
                color="#f6efd9"
                emissive="#f6f2df"
                emissiveIntensity={0.5}
                roughness={0.2}
                toneMapped={false}
              />
            </mesh>
            <GlowSprite
              position={[0, -0.06, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={2.2}
              color="rgba(255,238,195,1)"
              opacity={0.16}
            />
          </group>
        )),
      )}
      {/* Back wall / cooler glow. */}
      <mesh position={[CX, 1.65, -7.62]}>
        <boxGeometry args={[10.1, 3.0, 0.12]} />
        <meshStandardMaterial
          color="#eee9d9"
          emissive="#d9ecf5"
          emissiveIntensity={0.16}
          roughness={0.32}
          metalness={0.04}
        />
      </mesh>
      {[-4.55, -3.15, -1.75, -0.35, 1.05, 2.45, 3.85].map((x) => (
        <mesh key={x} position={[x, 1.55, -7.48]}>
          <boxGeometry args={[0.035, 2.55, 0.08]} />
          <meshStandardMaterial color="#666a67" roughness={0.3} metalness={0.6} />
        </mesh>
      ))}
      {[0.6, 1.05, 1.5, 1.95, 2.4].map((y) => (
        <mesh key={y} position={[CX, y, -7.45]}>
          <boxGeometry args={[10.0, 0.02, 0.03]} />
          <meshStandardMaterial color="#cbd6d2" metalness={0.6} roughness={0.25} />
        </mesh>
      ))}
      {/* Cooler header keeps the upper interior from reading as a wall of product. */}
      <mesh position={[CX, 2.42, -7.4]}>
        <boxGeometry args={[10.0, 0.5, 0.06]} />
        <meshStandardMaterial color="#1b2523" emissive="#3f7d5c" emissiveIntensity={0.28} roughness={0.5} />
      </mesh>
      <mesh position={[CX, 2.42, -7.36]}>
        <planeGeometry args={[4.2, 0.3]} />
        <meshBasicMaterial color="#dff3e6" toneMapped={false} />
      </mesh>
      <ShelfRun z={-2.55} width={8.7} />
      <ShelfRun z={-4.65} width={8.7} />
      {/* Hanging aisle boards break up the view and give the interior depth. */}
      <SignPlane texture={aisleSign} width={1.9} height={0.34} position={[-2.2, 2.16, -1.95]} intensity={0.82} />
      <SignPlane texture={drinkSign} width={1.6} height={0.34} position={[2.4, 2.16, -4.1]} intensity={0.78} />

      {/* Counter, register, hot snack case. */}
      <group position={[3.5, 0, -1.05]}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.3, 1.1, 0.86]} />
          <meshStandardMaterial color="#cecabf" roughness={0.4} metalness={0.1} />
        </mesh>
        <mesh position={[0, 1.12, 0.02]}>
          <boxGeometry args={[2.42, 0.06, 0.94]} />
          <meshStandardMaterial color="#e6e2d6" roughness={0.28} metalness={0.18} />
        </mesh>
        {/* Register. */}
        <mesh position={[-0.55, 1.38, -0.1]}>
          <boxGeometry args={[0.46, 0.4, 0.38]} />
          <meshStandardMaterial color="#303436" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[-0.55, 1.5, 0.101]} rotation-x={-0.18}>
          <planeGeometry args={[0.34, 0.2]} />
          <meshBasicMaterial color="#7fd9ff" toneMapped={false} />
        </mesh>
        {/* Hot food warmer. */}
        <mesh position={[0.55, 1.36, 0.1]}>
          <boxGeometry args={[0.85, 0.38, 0.4]} />
          <meshStandardMaterial
            color="#c79243"
            emissive="#ff9f45"
            emissiveIntensity={1.2}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
        <mesh position={[0.55, 1.6, 0.1]}>
          <boxGeometry args={[0.9, 0.06, 0.46]} />
          <meshStandardMaterial color="#565a5a" metalness={0.65} roughness={0.3} />
        </mesh>
      </group>

      {/* Coffee / ATM corner on the left. */}
      <mesh position={[-4.55, 0.95, -1.15]} castShadow>
        <boxGeometry args={[0.75, 1.5, 0.6]} />
        <meshStandardMaterial color="#2f3334" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[-4.55, 1.55, -0.84]}>
        <planeGeometry args={[0.52, 0.4]} />
        <meshBasicMaterial color="#d6f2ff" toneMapped={false} />
      </mesh>
      <mesh position={[-4.55, 1.05, -0.84]}>
        <planeGeometry args={[0.5, 0.26]} />
        <meshBasicMaterial color="#ffbe73" toneMapped={false} />
      </mesh>

      {/* Ice cream freezer near the entrance. */}
      <mesh position={[-3.7, 0.52, -0.45]} castShadow>
        <boxGeometry args={[1.15, 0.8, 0.62]} />
        <meshStandardMaterial color="#d9d6ca" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[-3.7, 0.87, -0.45]}>
        <boxGeometry args={[1.0, 0.1, 0.48]} />
        <meshStandardMaterial color="#cfe7ee" emissive="#bfe4f2" emissiveIntensity={1.2} roughness={0.15} />
      </mesh>

      <Products />
    </group>
  )
}

function Shell() {
  const wallColor = '#d8d3c6'
  return (
    <group>
      {/* Exterior wall surfaces. */}
      <mesh position={[STORE.x0 - 0.08, 1.86, CZ]} castShadow receiveShadow>
        <boxGeometry args={[0.16, 3.72, D]} />
        <meshStandardMaterial color={wallColor} roughness={0.63} metalness={0.02} />
      </mesh>
      <mesh position={[STORE.x1 + 0.08, 1.86, CZ]} castShadow receiveShadow>
        <boxGeometry args={[0.16, 3.72, D]} />
        <meshStandardMaterial color={wallColor} roughness={0.63} metalness={0.02} />
      </mesh>
      <mesh position={[CX, 1.86, STORE.z0 - 0.08]} castShadow receiveShadow>
        <boxGeometry args={[W, 3.72, 0.16]} />
        <meshStandardMaterial color={wallColor} roughness={0.66} metalness={0.02} />
      </mesh>
      {/* Dark tiled base band. */}
      {[
        { pos: [STORE.x0 - 0.17, 0.24, CZ] as [number, number, number], size: [0.07, 0.48, D] as [number, number, number] },
        { pos: [STORE.x1 + 0.17, 0.24, CZ] as [number, number, number], size: [0.07, 0.48, D] as [number, number, number] },
        { pos: [CX, 0.24, STORE.z0 - 0.17] as [number, number, number], size: [W, 0.48, 0.07] as [number, number, number] },
        { pos: [CX, 0.24, 0.06] as [number, number, number], size: [W, 0.48, 0.07] as [number, number, number] },
      ].map((b, i) => (
        <mesh key={i} position={b.pos} castShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#2a3032" roughness={0.48} metalness={0.15} />
        </mesh>
      ))}
      {/* Roof and parapet. */}
      <mesh position={[CX, ROOF_Y - 0.07, CZ]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.5, 0.2, D + 0.4]} />
        <meshStandardMaterial color="#34383a" roughness={0.9} />
      </mesh>
      <mesh position={[CX, ROOF_Y + 0.15, -0.02]} castShadow>
        <boxGeometry args={[W + 0.5, 0.30, 0.16]} />
        <meshStandardMaterial color="#2e3335" roughness={0.85} />
      </mesh>
      {/* Fascia over the glass, rising above the canopy so the sign reads. */}
      <mesh position={[CX, 3.21, 0.12]} castShadow>
        <boxGeometry args={[W + 0.28, 1.18, 0.3]} />
        <meshStandardMaterial color="#c9ced0" roughness={0.64} metalness={0.02} emissive="#8ea6ba" emissiveIntensity={0.045} />
      </mesh>
      <mesh position={[CX, 3.79, 0.23]}>
        <boxGeometry args={[W + 0.02, 0.06, 0.2]} />
        <meshStandardMaterial color="#1c2225" roughness={0.4} metalness={0.45} />
      </mesh>
      {/* A small tiled pilaster at each end of the glass. */}
      {[-5.38, 5.38].map((x) => (
        <mesh key={x} position={[x, 1.4, 0.03]} castShadow>
          <boxGeometry args={[0.28, 2.9, 0.18]} />
          <meshStandardMaterial color="#c7c3b7" roughness={0.56} />
        </mesh>
      ))}
    </group>
  )
}

function Signs() {
  const main = useMemo(() => sevenElevenSign(), [])
  const blade = useMemo(() => sevenElevenBlade(), [])
  const atm = useMemo(() => signTexture({ text: 'ATM', sub: '24時間', bg: '#101318', fg: '#e9e7dc', accent: '#2fa66d' }), [])
  const hours = useMemo(
    () => signTexture({ text: '24時間営業', sub: 'OPEN 24 HOURS', bg: '#f0ede2', fg: '#21382c', accent: '#d53b2c', thin: true }),
    [],
  )
  const copy = useMemo(
    () => signTexture({ text: 'コピー・FAX', sub: 'COPY / FAX', bg: '#15181c', fg: '#e9e7dc', accent: '#e18133' }),
    [],
  )
  return (
    <group>
      <SignPlane texture={main} width={10.42} height={0.74} position={[CX, 3.38, 0.285]} intensity={1.14} />
      <SignPlane texture={blade} width={0.58} height={2.25} position={[5.13, 2.53, 0.29]} intensity={1.05} />
      <FrameSign texture={hours} width={1.9} height={0.38} position={[-3.55, 2.42, 0.31]} intensity={1.15} />
      <FrameSign texture={atm} width={1.25} height={0.4} position={[3.75, 2.42, 0.31]} intensity={1.2} />
      <FrameSign texture={copy} width={1.55} height={0.38} position={[-4.1, 2.12, 0.31]} intensity={1.1} />
      {/* Projecting blade sign above the corner; rewarding when you orbit. */}
      <group position={[6.05, 4.05, 0.45]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 2.7, 1.05]} />
          <meshStandardMaterial color="#242a2c" roughness={0.4} metalness={0.45} />
        </mesh>
        <SignPlane texture={blade} width={0.9} height={2.5} position={[0.0, 0, 0.533]} rotation={[0, 0, 0]} intensity={1.5} />
        <SignPlane texture={blade} width={0.9} height={2.5} position={[0, 0, -0.533]} rotation={[0, Math.PI, 0]} intensity={1.5} />
      </group>
      <GlowSprite position={[CX, 3.1, 0.7]} scale={14} opacity={0.13} />
      <mesh position={[CX, 1.55, 1.1]} renderOrder={2}>
        <coneGeometry args={[2.5, 2.9, 24, 1, true]} />
        <meshBasicMaterial
          map={lightShaftTexture()}
          transparent
          opacity={0.085}
          color="#ffd9a6"
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function Canopy() {
  return (
    <group>
      <mesh position={[CX, STORE.canopyY, 0.83]} castShadow>
        <boxGeometry args={[11.9, 0.14, 1.7]} />
        <meshStandardMaterial color="#1e2427" roughness={0.5} metalness={0.42} />
      </mesh>
      <mesh position={[CX, STORE.canopyY - 0.08, 1.69]} castShadow>
        <boxGeometry args={[11.9, 0.1, 0.08]} />
        <meshStandardMaterial color="#171b1d" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Recessed warm downlights. */}
      {[-4.0, 0, 4.0].map((x) => (
        <group key={x} position={[x, STORE.canopyY - 0.1, 0.95]}>
          <mesh rotation-x={Math.PI / 2}>
            <circleGeometry args={[0.12, 16]} />
            <meshBasicMaterial color="#ffe8b5" toneMapped={false} />
          </mesh>
          <GlowSprite position={[0, -0.07, 0]} rotation={[Math.PI / 2, 0, 0]} scale={1.5} opacity={0.3} />
          <GlowSprite position={[0, -0.12, 0.7]} rotation={[-Math.PI / 2, 0, 0]} scale={2.0} opacity={0.055} color="rgba(255,225,180,1)" />
        </group>
      ))}
    </group>
  )
}

function ExteriorProps() {
  const vending = useMemo(() => vendingTexture(0), [])
  const vending2 = useMemo(() => vendingTexture(1), [])
  const menu = useMemo(
    () => signTexture({ text: 'からあげ', sub: 'HOT SNACK  120円', bg: '#1b1d20', fg: '#f4e4bd', accent: '#e05a35' }),
    [],
  )
  return (
    <group>
      {/* Vending machines right of the door. */}
      <group position={[4.55, 0, 1.02]} rotation-y={-0.08}>
        <mesh position={[0, 0.94, 0]} castShadow>
          <boxGeometry args={[0.86, 1.88, 0.7]} />
          <meshStandardMaterial color="#23282a" roughness={0.45} metalness={0.35} />
        </mesh>
        <mesh position={[0, 1.06, 0.36]}>
          <planeGeometry args={[0.74, 1.5]} />
          <meshBasicMaterial map={vending} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.06, 0.37]}>
          <planeGeometry args={[0.74, 1.5]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.06} toneMapped={false} />
        </mesh>
      </group>
      <group position={[-5.05, 0, 1.0]} rotation-y={0.08}>
        <mesh position={[0, 0.94, 0]} castShadow>
          <boxGeometry args={[0.82, 1.86, 0.68]} />
          <meshStandardMaterial color="#25292b" roughness={0.45} metalness={0.35} />
        </mesh>
        <mesh position={[0, 1.04, 0.35]}>
          <planeGeometry args={[0.7, 1.48]} />
          <meshBasicMaterial map={vending2} toneMapped={false} />
        </mesh>
      </group>
      {/* Trash bins. */}
      {[-1.95, -1.35].map((x, i) => (
        <group key={x} position={[x, 0, 1.42]}>
          <mesh position={[0, 0.34, 0]} castShadow>
            <boxGeometry args={[0.48, 0.68, 0.44]} />
            <meshStandardMaterial color={i === 0 ? '#2f3a3c' : '#3a3430'} roughness={0.5} metalness={0.18} />
          </mesh>
          <mesh position={[0, 0.69, 0]}>
            <boxGeometry args={[0.5, 0.05, 0.46]} />
            <meshStandardMaterial color="#1b1f20" roughness={0.4} metalness={0.3} />
          </mesh>
        </group>
      ))}
      {/* A-frame sign. */}
      <group position={[-3.1, 0, 1.45]} rotation-y={0.16}>
        <mesh position={[0, 0.62, 0]} rotation-x={0.12} castShadow>
          <boxGeometry args={[0.72, 1.12, 0.05]} />
          <meshStandardMaterial color="#292c2e" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.67, 0.031]} rotation-x={0.12}>
          <planeGeometry args={[0.62, 0.92]} />
          <meshBasicMaterial map={menu} toneMapped={false} />
        </mesh>
      </group>
      {/* Door mat and threshold. */}
      <mesh position={[CX, 0.168, 0.62]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[2.75, 0.95]} />
        <meshStandardMaterial color="#202322" roughness={0.95} />
      </mesh>
      <mesh position={[CX, 0.08, 0.36]} receiveShadow>
        <boxGeometry args={[11.4, 0.16, 0.7]} />
        <meshStandardMaterial color="#6f706a" roughness={0.58} />
      </mesh>
      {/* Umbrella stand. */}
      <group position={[-1.1, 0, 0.58]}>
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.16, 0.13, 0.52, 10]} />
          <meshStandardMaterial color="#33383a" roughness={0.42} metalness={0.4} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-0.03 + i * 0.04, 0.5, 0.02]} rotation-z={0.08 + i * 0.03}>
            <cylinderGeometry args={[0.018, 0.018, 0.72, 6]} />
            <meshStandardMaterial color={['#1e2528', '#3b2d2a', '#242c30'][i]} roughness={0.6} />
          </mesh>
        ))}
      </group>
      {/* Security camera. */}
      <group position={[3.95, 2.78, 0.35]} rotation-y={-0.5}>
        <mesh rotation-x={0.25}>
          <boxGeometry args={[0.16, 0.11, 0.28]} />
          <meshStandardMaterial color="#cfcfc8" roughness={0.4} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.15]} rotation-x={0.25}>
          <circleGeometry args={[0.035, 12]} />
          <meshBasicMaterial color="#1b2428" />
        </mesh>
      </group>
      {/* Downpipe at the corner. */}
      <mesh position={[5.78, 1.9, -0.5]}>
        <cylinderGeometry args={[0.07, 0.07, 3.9, 8]} />
        <meshStandardMaterial color="#3f4445" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Roof air-conditioning units. */}
      {[-2.4, 2.2].map((x) => (
        <group key={x} position={[x, 3.82, -4.3]}>
          <mesh castShadow>
            <boxGeometry args={[1.5, 0.7, 0.9]} />
            <meshStandardMaterial color="#a9a69d" roughness={0.62} metalness={0.18} />
          </mesh>
          <mesh position={[0.45, 0, 0.48]} rotation-x={Math.PI / 2}>
            <circleGeometry args={[0.25, 16]} />
            <meshStandardMaterial color="#363b3c" roughness={0.5} metalness={0.35} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[0.45 + Math.cos(i * 1.57) * 0.14, Math.sin(i * 1.57) * 0.14, 0.49]}>
              <boxGeometry args={[0.05, 0.05, 0.02]} />
              <meshStandardMaterial color="#1d2122" />
            </mesh>
          ))}
        </group>
      ))}
      <GlowSprite position={[4.55, 1.2, 1.5]} scale={2.8} opacity={0.16} color="rgba(190,230,255,1)" />
    </group>
  )
}

export function Store() {
  return (
    <group>
      <Shell />
      <Interior />
      <GlassFront />
      <Signs />
      {/* Warm light blooming into the rain. */}
      <GlowSprite position={[0, 2.2, 0.95]} scale={8.5} opacity={0.075} color="rgba(255,228,182,1)" />
      <GlowSprite position={[-4.4, 1.35, 1.0]} scale={2.6} opacity={0.12} color="rgba(255,242,220,1)" />
      <GlowSprite position={[4.6, 1.3, 0.95]} scale={2.2} opacity={0.1} color="rgba(206,232,255,1)" />

      <Canopy />
      <ExteriorProps />
    </group>
  )
}
