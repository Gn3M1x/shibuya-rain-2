import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSceneStore } from '../../state/useSceneStore'
import { QUALITY } from '../../config/quality'

/**
 * Applies quality-dependent render settings at runtime and performs one
 * conservative auto-downgrade if the machine cannot hold a usable frame rate.
 */
export function Performance() {
  const { gl, size } = useThree()
  const quality = useSceneStore((s) => s.quality)
  const autoDowngrade = useSceneStore((s) => s.autoDowngrade)
  const autoAdjusted = useSceneStore((s) => s.autoAdjusted)
  const profile = QUALITY[quality]

  const sample = useRef({ frames: 0, time: 0, settled: false })

  useEffect(() => {
    const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const ratio =
      quality === 'low'
        ? Math.min(0.8, deviceDpr)
        : quality === 'medium'
          ? Math.min(profile.dpr[1], Math.max(profile.dpr[0], deviceDpr * 0.85))
          : Math.min(profile.dpr[1], deviceDpr)
    gl.setPixelRatio(ratio)
    gl.shadowMap.enabled = profile.shadows
    gl.shadowMap.needsUpdate = true
  }, [gl, quality, profile])

  useEffect(() => {
    sample.current = { frames: 0, time: 0, settled: false }
  }, [quality, size.width, size.height])

  useFrame((_state, delta) => {
    const data = sample.current
    data.time += delta
    data.frames += 1
    if (data.time < 4.5) return
    if (!data.settled) {
      data.settled = true
      const fps = data.frames / data.time
      if (!autoAdjusted && quality !== 'low' && fps < 38) autoDowngrade()
      return
    }
    data.time = 0
    data.frames = 0
  })

  return null
}
