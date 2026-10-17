import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { signTexture, roadTextTexture } from '../../utils/textures'
import { GlowSprite, SignPlane } from './Signs'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function CylinderBetween({
  start,
  end,
  radius = 0.05,
  color = '#5b6062',
  metalness = 0.4,
  roughness = 0.55,
}: {
  start: [number, number, number]
  end: [number, number, number]
  radius?: number
  color?: string
  metalness?: number
  roughness?: number
}) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...start)
    const b = new THREE.Vector3(...end)
    const dir = new THREE.Vector3().subVectors(b, a)
    const len = dir.length()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    return { position: a.clone().add(b).multiplyScalar(0.5), quaternion: q, length: len }
  }, [start, end])
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 7]} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  )
}

function Wire({ points, radius = 0.016, color = '#0b0e12' }: { points: THREE.Vector3[]; radius?: number; color?: string }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(curve, 28, radius, 4, false)
  }, [points, radius])
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/*  Utility poles + overhead wires                                     */
/* ------------------------------------------------------------------ */

function UtilityPole({ x, z, flip = false }: { x: number; z: number; flip?: boolean }) {
  const lampX = x
  const lampZ = z + (flip ? -0.9 : 0.9)
  const sign = useMemo(
    () => signTexture({ text: '渋谷', sub: 'SHIBUYA', bg: '#f2f0e6', fg: '#22262a', accent: '#245b9c', thin: true }),
    [],
  )
  return (
    <group>
      <mesh position={[x, 5.2, z]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 10.4, 10]} />
        <meshStandardMaterial color="#5d6163" roughness={0.78} metalness={0.15} />
      </mesh>
      {/* Concrete base. */}
      <mesh position={[x, 0.22, z]}>
        <cylinderGeometry args={[0.2, 0.24, 0.44, 10]} />
        <meshStandardMaterial color="#4b4e50" roughness={0.9} />
      </mesh>
      {/* Crossarms + insulators. */}
      {[7.5, 8.3].map((y) => (
        <group key={y} position={[x, y, z]}>
          <mesh castShadow>
            <boxGeometry args={[1.7, 0.07, 0.08]} />
            <meshStandardMaterial color="#474b4d" roughness={0.7} metalness={0.3} />
          </mesh>
          {[-0.72, 0, 0.72].map((ox) => (
            <mesh key={ox} position={[ox, 0.13, 0]}>
              <cylinderGeometry args={[0.035, 0.05, 0.16, 6]} />
              <meshStandardMaterial color="#8b8c85" roughness={0.4} metalness={0.1} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Transformer. */}
      <mesh position={[x + 0.28, 6.6, z]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.62, 10]} />
        <meshStandardMaterial color="#77786f" roughness={0.66} metalness={0.24} />
      </mesh>
      {/* Street lamp arm + head. */}
      <CylinderBetween start={[x, 5.65, z]} end={[lampX, 5.7, lampZ]} radius={0.035} color="#454a4c" />
      <mesh position={[lampX, 5.56, lampZ]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.13, 0.17, 0.12, 10]} />
        <meshStandardMaterial color="#2d3234" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[lampX, 5.49, lampZ]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[0.12, 12]} />
        <meshBasicMaterial color="#ffe9c4" toneMapped={false} />
      </mesh>
      <GlowSprite position={[lampX, 5.4, lampZ]} scale={4.2} opacity={0.26} color="rgba(255,232,196,1)" />
      <GlowSprite position={[lampX, 5.15, lampZ]} scale={7.0} opacity={0.055} color="rgba(190,216,255,1)" />
      {/* Small address plate. */}
      <group position={[x, 2.35, z + (flip ? -0.12 : 0.12)]} rotation-y={flip ? Math.PI : 0}>
        <mesh>
          <boxGeometry args={[0.42, 0.22, 0.04]} />
          <meshStandardMaterial color="#d8d6cb" roughness={0.5} />
        </mesh>
        <SignPlane texture={sign} width={0.4} height={0.2} position={[0, 0, 0.024]} intensity={0.75} />
      </group>
    </group>
  )
}

function OverheadWires() {
  const wires = useMemo(() => {
    const list: { points: THREE.Vector3[]; radius?: number }[] = []
    const poles = [-27, -9.2, 14.8, 31]
    const y = 8.25
    const z = 2.95
    for (const side of [-0.72, 0, 0.72]) {
      for (let i = 0; i < poles.length - 1; i++) {
        const a = poles[i]
        const b = poles[i + 1]
        const mid = (a + b) / 2
        list.push({
          points: [
            new THREE.Vector3(a, y, z + side),
            new THREE.Vector3(mid, y - 0.85, z + side * 1.1),
            new THREE.Vector3(b, y - 0.04, z + side),
          ],
          radius: 0.014,
        })
      }
    }
    // Service drops to the buildings and the store.
    list.push({
      points: [new THREE.Vector3(-9.2, 7.5, 2.95), new THREE.Vector3(-7.6, 6.7, 1.1), new THREE.Vector3(-6.2, 6.1, 0.2)],
      radius: 0.011,
    })
    list.push({
      points: [new THREE.Vector3(14.8, 7.5, 2.95), new THREE.Vector3(12.6, 6.8, 1.0), new THREE.Vector3(11.1, 6.2, 0.1)],
      radius: 0.011,
    })
    // Cross-street span.
    for (const dx of [-0.08, 0.05]) {
      list.push({
        points: [
          new THREE.Vector3(-9.2 + dx, 7.5, 2.95),
          new THREE.Vector3(-9.2 + dx, 6.9, 9.0),
          new THREE.Vector3(-9.2 + dx * 2, 7.6, 15.3),
        ],
        radius: 0.012,
      })
    }
    return list
  }, [])
  return (
    <group>
      {wires.map((w, i) => (
        <Wire key={i} points={w.points} radius={w.radius} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Traffic light + street signs                                       */
/* ------------------------------------------------------------------ */

function PedestrianSignal({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 3.8, 8]} />
        <meshStandardMaterial color="#54595b" roughness={0.7} metalness={0.2} />
      </mesh>
      <group position={[0, 2.55, 0.06]}>
        <mesh>
          <boxGeometry args={[0.42, 0.72, 0.2]} />
          <meshStandardMaterial color="#262b2d" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Red standing figure. */}
        <mesh position={[0, 0.18, 0.11]}>
          <circleGeometry args={[0.11, 12]} />
          <meshBasicMaterial color="#ff3524" toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.17, 0.11]}>
          <circleGeometry args={[0.1, 12]} />
          <meshBasicMaterial color="#16201c" />
        </mesh>
      </group>
      <GlowSprite position={[0, 2.72, 0.2]} scale={1.2} opacity={0.3} color="rgba(255,58,40,1)" />
    </group>
  )
}

function TrafficLight({ x, z }: { x: number; z: number }) {
  const side = x > 0 ? -1 : 1
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.85, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.12, 5.7, 8]} />
        <meshStandardMaterial color="#4d5254" roughness={0.72} metalness={0.22} />
      </mesh>
      <CylinderBetween start={[0, 5.5, 0]} end={[side * 3.4, 5.5, 0.1]} radius={0.055} color="#4d5254" />
      <group position={[side * 3.1, 5.25, 0.16]}>
        <mesh>
          <boxGeometry args={[1.25, 0.4, 0.24]} />
          <meshStandardMaterial color="#23282a" roughness={0.5} metalness={0.3} />
        </mesh>
        {[
          { x: -0.38, color: '#ff3a2c', on: false },
          { x: 0, color: '#ffc23a', on: false },
          { x: 0.38, color: '#38ffa2', on: true },
        ].map((l) => (
          <mesh key={l.x} position={[l.x, 0, 0.13]}>
            <circleGeometry args={[0.12, 14]} />
            <meshBasicMaterial color={l.on ? l.color : '#191d1f'} toneMapped={!l.on} />
          </mesh>
        ))}
        <GlowSprite position={[0.38, 0, 0.25]} scale={1.5} opacity={0.45} color="rgba(72,255,176,1)" />
      </group>
    </group>
  )
}

function StreetSign({
  x,
  z,
  rotation = 0,
  texture,
  height = 2.5,
  width = 0.72,
}: {
  x: number
  z: number
  rotation?: number
  texture: THREE.Texture
  height?: number
  width?: number
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rotation}>
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 2.6, 6]} />
        <meshStandardMaterial color="#6f7374" roughness={0.6} metalness={0.35} />
      </mesh>
      <group position={[0, height, 0.02]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[width + 0.04, width * 0.72 + 0.04, 0.03]} />
          <meshStandardMaterial color="#303436" roughness={0.5} metalness={0.35} />
        </mesh>
        <SignPlane texture={texture} width={width} height={width * 0.72} position={[0, 0, 0.01]} intensity={0.9} />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Bicycles                                                           */
/* ------------------------------------------------------------------ */

function Bicycle({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const metal = '#3c4245'
  return (
    <group position={position} rotation-y={rotation}>
      {[-0.52, 0.52].map((x) => (
        <mesh key={x} position={[x, 0.33, 0]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.32, 0.018, 6, 20]} />
          <meshStandardMaterial color="#24282a" roughness={0.7} metalness={0.3} />
        </mesh>
      ))}
      <CylinderBetween start={[-0.52, 0.33, 0]} end={[0.02, 0.72, 0]} radius={0.022} color={metal} />
      <CylinderBetween start={[0.52, 0.33, 0]} end={[0.02, 0.72, 0]} radius={0.022} color={metal} />
      <CylinderBetween start={[-0.05, 0.36, 0]} end={[0.38, 0.62, 0]} radius={0.02} color={metal} />
      <CylinderBetween start={[0.02, 0.72, 0]} end={[-0.28, 0.84, 0]} radius={0.02} color={metal} />
      <CylinderBetween start={[0.02, 0.72, 0]} end={[0.3, 0.88, 0]} radius={0.02} color={metal} />
      {/* Saddle. */}
      <mesh position={[-0.3, 0.9, 0]} rotation-z={-0.08}>
        <boxGeometry args={[0.22, 0.05, 0.1]} />
        <meshStandardMaterial color="#1b1e20" roughness={0.8} />
      </mesh>
      {/* Handlebar + basket. */}
      <mesh position={[0.31, 0.94, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.015, 0.015, 0.36, 6]} />
        <meshStandardMaterial color="#2b3032" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0.45, 0.78, 0]}>
        <boxGeometry args={[0.26, 0.2, 0.3]} />
        <meshStandardMaterial color="#6b6e6a" roughness={0.7} metalness={0.25} />
      </mesh>
      {/* Kickstand. */}
      <CylinderBetween start={[0.05, 0.3, 0]} end={[0.12, 0.02, 0.12]} radius={0.012} color="#2a2e30" />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Ground clutter                                                     */
/* ------------------------------------------------------------------ */

function Drains() {
  const positions = useMemo(() => {
    const arr: [number, number][] = []
    for (let x = -30; x <= 30; x += 4.4) {
      arr.push([x, 3.82])
      arr.push([x + 2.1, 11.98])
    }
    return arr
  }, [])
  const frameRef = useRef<THREE.InstancedMesh>(null)
  const slatRef = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const dummy = new THREE.Object3D()
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
    const frames = frameRef.current
    const slats = slatRef.current
    if (!frames || !slats) return
    let si = 0
    positions.forEach(([x, z], i) => {
      dummy.position.set(x, 0.012, z)
      dummy.quaternion.copy(q)
      dummy.scale.set(0.62, 0.3, 1)
      dummy.updateMatrix()
      frames.setMatrixAt(i, dummy.matrix)
      dummy.scale.set(0.035, 0.26, 1)
      for (let k = 0; k < 5; k++) {
        dummy.position.set(x - 0.24 + k * 0.12, 0.016, z)
        dummy.updateMatrix()
        slats.setMatrixAt(si++, dummy.matrix)
      }
    })
    frames.instanceMatrix.needsUpdate = true
    slats.instanceMatrix.needsUpdate = true
  }, [positions])
  return (
    <group>
      <instancedMesh ref={frameRef} args={[undefined, undefined, positions.length]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#1a1e20" roughness={0.55} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={slatRef} args={[undefined, undefined, positions.length * 5]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#3b4143" roughness={0.4} metalness={0.6} />
      </instancedMesh>
      {/* Curbside grime strips. */}
      {[3.62, 12.18].map((z) => (
        <mesh key={z} position={[0, 0.014, z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[68, 0.34]} />
          <meshStandardMaterial color="#141819" roughness={0.46} metalness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

function SidewalkClutter() {
  return (
    <group>
      {/* Crates and a mop bucket at the store's west gap. */}
      <group position={[-7.1, 0, -0.6]}>
        {[
          [0, 0.18, 0, 0.48, 0.36, 0.42],
          [0.05, 0.5, -0.03, 0.42, 0.3, 0.36],
        ].map((c, i) => (
          <mesh key={i} position={[c[0], c[1], c[2]]} rotation-y={i * 0.2}>
            <boxGeometry args={[c[3], c[4], c[5]]} />
            <meshStandardMaterial color={i === 0 ? '#33453b' : '#3a3a34'} roughness={0.7} metalness={0.12} />
          </mesh>
        ))}
        <mesh position={[0.62, 0.24, 0.04]}>
          <cylinderGeometry args={[0.2, 0.18, 0.44, 10]} />
          <meshStandardMaterial color="#80929a" roughness={0.55} metalness={0.1} />
        </mesh>
      </group>
      {/* Trash bags. */}
      {[
        [-4.85, 0.26, 2.6],
        [-4.55, 0.22, 2.72],
        [12.0, 0.24, 2.7],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.28, 8, 6]} />
          <meshStandardMaterial color={i === 2 ? '#1f2324' : '#2a2e2c'} roughness={0.42} metalness={0.05} />
        </mesh>
      ))}
      {/* Plastic crate stack across the street. */}
      <group position={[-1.2, 0, 11.3]}>
        {[0, 1].map((i) => (
          <mesh key={i} position={[0, 0.18 + i * 0.32, 0]} rotation-y={i * 0.3}>
            <boxGeometry args={[0.52, 0.3, 0.38]} />
            <meshStandardMaterial color={i ? '#7a3b34' : '#2f4858'} roughness={0.6} />
          </mesh>
        ))}
      </group>
      {/* Bollards near the alley. */}
      {[7.5, 8.7, 11.2, 12.4].map((x) => (
        <group key={x} position={[x, 0, 3.05]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.055, 0.065, 0.9, 8]} />
            <meshStandardMaterial color="#8b8c84" roughness={0.5} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.78, 0]}>
            <cylinderGeometry args={[0.058, 0.058, 0.1, 8]} />
            <meshStandardMaterial color="#d1a33c" emissive="#c08a2a" emissiveIntensity={0.35} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  A extra vending machine across the street                          */
/* ------------------------------------------------------------------ */

function StreetVending() {
  const tex = useMemo(
    () => signTexture({ text: 'COLD DRINKS', sub: 'つめた〜い', bg: '#173a5e', fg: '#f2f6fa', accent: '#5fc7ff' }),
    [],
  )
  return (
    <group position={[-5.5, 0, 12.9]} rotation-y={Math.PI}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.86, 1.8, 0.68]} />
        <meshStandardMaterial color="#252a2c" roughness={0.45} metalness={0.35} />
      </mesh>
      <mesh position={[0, 1.02, 0.35]}>
        <planeGeometry args={[0.7, 1.34]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <GlowSprite position={[0, 1.1, 0.6]} scale={2.2} opacity={0.2} color="rgba(150,215,255,1)" />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Distant pedestrians: quiet silhouettes, umbrellas against the glow */
/* ------------------------------------------------------------------ */

function UmbrellaFigure({
  position,
  rotation = 0,
  umbrella = true,
}: {
  position: [number, number, number]
  rotation?: number
  umbrella?: boolean
}) {
  return (
    <group position={position} rotation-y={rotation}>
      {/* Legs + coat silhouette. */}
      {[-0.085, 0.085].map((x, i) => (
        <mesh key={i} position={[x, 0.36, i === 0 ? 0.04 : -0.03]} rotation-x={i === 0 ? 0.08 : -0.06}>
          <boxGeometry args={[0.11, 0.7, 0.14]} />
          <meshStandardMaterial color="#101417" roughness={0.92} />
        </mesh>
      ))}
      <mesh position={[0, 0.92, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.52, 3, 8]} />
        <meshStandardMaterial color="#171c20" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.5, 0.01]}>
        <sphereGeometry args={[0.135, 10, 8]} />
        <meshStandardMaterial color="#101417" roughness={0.86} />
      </mesh>
      {umbrella && (
        <group position={[0.04, 1.72, 0]}>
          <mesh position={[0, 0.24, 0]}>
            <coneGeometry args={[0.62, 0.26, 12, 1, true]} />
            <meshStandardMaterial color="#0d1114" roughness={0.55} metalness={0.08} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.58, 5]} />
            <meshStandardMaterial color="#5d6163" roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Road furniture                                                     */
/* ------------------------------------------------------------------ */

export function StreetProps() {
  const parking = useMemo(
    () => signTexture({ text: 'P', sub: '駐車場', bg: '#1c4f9c', fg: '#ffffff', accent: '#ffffff', thin: true }),
    [],
  )
  const noParking = useMemo(
    () => signTexture({ text: '駐車禁止', sub: 'NO PARKING', bg: '#f2f0e6', fg: '#c22a22', accent: '#c22a22', thin: true }),
    [],
  )
  const crossing = useMemo(
    () => roadTextTexture('横断歩道', 'CROSSING'),
    [],
  )

  return (
    <group>
      <UtilityPole x={-9.2} z={2.95} />
      <UtilityPole x={14.8} z={2.95} flip />
      <UtilityPole x={-27} z={2.95} />
      <UtilityPole x={31} z={2.95} flip />
      <OverheadWires />
      <TrafficLight x={8.1} z={3.8} />
      <PedestrianSignal x={-12.5} z={3.45} />
      <PedestrianSignal x={9.35} z={3.5} />
      <StreetSign x={-6.6} z={2.4} rotation={0.18} texture={noParking} height={2.2} width={0.62} />
      <StreetSign x={13.3} z={2.5} rotation={-0.2} texture={parking} height={2.5} width={0.66} />
      <StreetSign x={18.4} z={3.3} rotation={0.1} texture={crossing} height={2.4} width={0.72} />
      <Bicycle position={[-8.05, 0, 2.15]} rotation={Math.PI * 0.04} />
      <Bicycle position={[-8.55, 0, 2.22]} rotation={Math.PI * 0.06} />
      <Bicycle position={[11.55, 0, -2.9]} rotation={Math.PI * 0.52} />
      <Bicycle position={[-6.0, 0, 2.45]} rotation={Math.PI * 0.03} />
      <UmbrellaFigure position={[-9.4, 0, 6.4]} rotation={0.5} />
      <UmbrellaFigure position={[7.1, 0, 2.5]} rotation={-2.5} />
      <UmbrellaFigure position={[9.5, 0, 8.2]} rotation={2.9} umbrella={false} />
      <Drains />
      <SidewalkClutter />
      <StreetVending />
    </group>
  )
}
