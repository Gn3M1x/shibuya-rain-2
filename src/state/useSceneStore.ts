import { create } from 'zustand'
import type { QualityLevel, TimeOfDay } from '../types'

interface SceneState {
  rainIntensity: number
  timeOfDay: TimeOfDay
  quality: QualityLevel
  cinematic: boolean
  photoMode: boolean
  soundOn: boolean
  resetToken: number
  autoAdjusted: boolean
  setRainIntensity: (value: number) => void
  setTimeOfDay: (value: TimeOfDay) => void
  setQuality: (value: QualityLevel) => void
  setCinematic: (value: boolean) => void
  setPhotoMode: (value: boolean) => void
  togglePhotoMode: () => void
  setSoundOn: (value: boolean) => void
  resetCamera: () => void
  autoDowngrade: () => void
}

export const useSceneStore = create<SceneState>((set, get) => ({
  rainIntensity: 0.78,
  timeOfDay: 'night',
  quality: 'high',
  cinematic: true,
  photoMode: false,
  soundOn: false,
  resetToken: 0,
  autoAdjusted: false,
  setRainIntensity: (rainIntensity) => set({ rainIntensity }),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  // A manual choice is an explicit override: do not auto-downgrade it again.
  setQuality: (quality) => set({ quality, autoAdjusted: true }),
  setCinematic: (cinematic) => set({ cinematic }),
  setPhotoMode: (photoMode) => set({ photoMode }),
  togglePhotoMode: () => set((s) => ({ photoMode: !s.photoMode })),
  setSoundOn: (soundOn) => set({ soundOn }),
  resetCamera: () => set((s) => ({ resetToken: s.resetToken + 1, cinematic: false })),
  autoDowngrade: () => {
    const { quality, autoAdjusted } = get()
    if (autoAdjusted || quality === 'low') return
    const next: QualityLevel = quality === 'high' ? 'medium' : 'low'
    set({ quality: next, autoAdjusted: true })
  },
}))
