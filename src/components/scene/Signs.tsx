import { useMemo } from 'react'
import * as THREE from 'three'
import { glowTexture } from '../../utils/textures'

interface SignPlaneProps {
  texture: THREE.Texture
  width: number
  height: number
  position: [number, number, number]
  rotation?: [number, number, number]
  intensity?: number
  side?: THREE.Side
  transparent?: boolean
}

/** An unlit printed/illuminated sign face. Keeps signage crisp at night. */
export function SignPlane({
  texture,
  width,
  height,
  position,
  rotation = [0, 0, 0],
  intensity = 1,
  side = THREE.FrontSide,
  transparent = false,
}: SignPlaneProps) {
  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      toneMapped: false,
      side,
      transparent,
      color: new THREE.Color().setRGB(intensity, intensity, intensity),
    })
    return mat
  }, [texture, intensity, side, transparent])
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

interface GlowSpriteProps {
  position: [number, number, number]
  scale: number
  color?: string
  opacity?: number
  rotation?: [number, number, number]
}

export function GlowSprite({ position, scale, color = 'rgba(255,236,201,1)', opacity = 0.5, rotation = [0, 0, 0] }: GlowSpriteProps) {
  const texture = useMemo(() => glowTexture(color), [color])
  return (
    <mesh position={position} rotation={rotation} renderOrder={4}>
      <planeGeometry args={[scale, scale]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

interface FrameSignProps {
  texture: THREE.Texture
  width: number
  height: number
  position: [number, number, number]
  rotation?: [number, number, number]
  frameColor?: string
  intensity?: number
}

/** Illuminated sign box with a dark aluminium frame. */
export function FrameSign({
  texture,
  width,
  height,
  position,
  rotation = [0, 0, 0],
  frameColor = '#171a1d',
  intensity = 1.2,
}: FrameSignProps) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.06]} castShadow>
        <boxGeometry args={[width + 0.14, height + 0.14, 0.12]} />
        <meshStandardMaterial color={frameColor} roughness={0.45} metalness={0.35} />
      </mesh>
      <SignPlane texture={texture} width={width} height={height} position={[0, 0, 0.011]} intensity={intensity} />
    </group>
  )
}
