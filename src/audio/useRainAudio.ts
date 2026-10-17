import { useEffect } from 'react'
import { rainAudio } from './rainAudio'
import { useSceneStore } from '../state/useSceneStore'

/** Wires the audio bed to the store; audio only begins after the user opts in. */
export function useRainAudio() {
  const soundOn = useSceneStore((s) => s.soundOn)
  const rainIntensity = useSceneStore((s) => s.rainIntensity)

  useEffect(() => {
    rainAudio.setIntensity(rainIntensity)
  }, [rainIntensity])

  useEffect(() => {
    if (soundOn) {
      void rainAudio.start()
    } else {
      rainAudio.stop()
    }
  }, [soundOn])

  useEffect(() => {
    return () => rainAudio.dispose()
  }, [])
}
