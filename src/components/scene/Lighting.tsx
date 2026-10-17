import { useMemo } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '../../state/useSceneStore'
import { AMBIENT } from '../../config/world'
import { QUALITY } from '../../config/quality'

/**
 * Deliberately small light budget: two global lights, a handful of warm
 * practicals inside the store, two street lamps and one alley neon.
 * Everything else is emissive geometry + the baked environment map.
 */
export function Lighting() {
  const timeOfDay = useSceneStore((s) => s.timeOfDay)
  const quality = useSceneStore((s) => s.quality)
  const profile = QUALITY[quality]
  const amb = AMBIENT[timeOfDay]
  const isNight = timeOfDay === 'night'
  const dim = isNight ? 1 : 0.82

  const spotTarget = useMemo(() => new THREE.Object3D(), [])

  return (
    <group>
      <hemisphereLight args={[amb.hemiSky, amb.hemiGround, amb.hemiIntensity]} />
      <directionalLight
        color={amb.moonColor}
        intensity={amb.moonIntensity}
        position={[-16, 23, 17]}
        target-position={[0, 0, -1]}
        castShadow={profile.shadows}
        shadow-mapSize-width={profile.shadowMapSize}
        shadow-mapSize-height={profile.shadowMapSize}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={72}
        shadow-bias={-0.0007}
        shadow-normalBias={0.035}
        shadow-radius={3}
      />
      {/* Cool city-sky fill so the facade and street don't crush to black. */}
      <directionalLight color="#93aecd" intensity={0.3} position={[6, 9, 20]} />
      {timeOfDay === 'dusk' && (
        <directionalLight color="#ffb27a" intensity={0.4} position={[26, 7, 22]} />
      )}

      {/* Warm interior practicals, roughly under the fluorescent battens. */}
      <pointLight
        color="#ffd39a"
        intensity={5.6 * dim}
        distance={10}
        decay={2}
        position={[-2.7, 2.5, -2.4]}
      />
      <pointLight
        color="#ffd7a2"
        intensity={4.4 * dim}
        distance={9.5}
        decay={2}
        position={[1.2, 2.5, -4.6]}
      />
      <pointLight
        color="#ffdcaa"
        intensity={4.4 * dim}
        distance={9}
        decay={2}
        position={[2.9, 2.4, -6.3]}
      />

      {/* Street lamps on the near sidewalk. */}
      <pointLight color="#c9ddff" intensity={78} distance={28} decay={2} position={[-9.2, 5.55, 3.0]} />
      <pointLight color="#ffe0b2" intensity={16} distance={7} decay={2} position={[0, 2.55, 1.35]} />
      <pointLight color="#ffe9d2" intensity={30} distance={22} decay={2} position={[14.8, 5.55, 3.0]} />

      {/* Deep alley warmth: gives the eye somewhere to wander. */}
      {quality !== 'low' && (
        <pointLight color="#ff8a5c" intensity={34} distance={18} decay={2} position={[9.85, 3.1, -9.0]} />
      )}

      {/* Canopy downlight wash onto the entrance / wet pavement. */}
      <spotLight
        color="#ffdca4"
        intensity={34}
        distance={13}
        angle={1.12}
        penumbra={0.9}
        decay={2}
        position={[0, 3.0, 1.15]}
        target={spotTarget}
        castShadow={quality === 'high'}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.001}
        shadow-normalBias={0.03}
      />
      <primitive object={spotTarget} position={[0, 0, -1]} />
    </group>
  )
}
