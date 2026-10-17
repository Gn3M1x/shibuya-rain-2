import type { QualityLevel } from '../types'

export interface QualityProfile {
  dpr: [number, number]
  shadows: boolean
  shadowMapSize: number
  rainCount: number
  splashCount: number
  dripCount: number
  reflectionScale: number
  reflectionInterval: number
  bloom: number
  bloomThreshold: number
  vignette: number
  noise: boolean
  dof: boolean
  smaa: boolean
  maxLights: number
  envResolution: number
}

export const QUALITY: Record<QualityLevel, QualityProfile> = {
  low: {
    dpr: [0.7, 1.0],
    shadows: false,
    shadowMapSize: 512,
    rainCount: 4200,
    splashCount: 240,
    dripCount: 80,
    reflectionScale: 0.3,
    reflectionInterval: 2,
    bloom: 0.24,
    bloomThreshold: 1.45,
    vignette: 0.34,
    noise: false,
    dof: false,
    smaa: false,
    maxLights: 5,
    envResolution: 128,
  },
  medium: {
    dpr: [0.9, 1.45],
    shadows: true,
    shadowMapSize: 1024,
    rainCount: 13000,
    splashCount: 560,
    dripCount: 140,
    reflectionScale: 0.5,
    reflectionInterval: 1,
    bloom: 0.38,
    bloomThreshold: 1.3,
    vignette: 0.38,
    noise: true,
    dof: false,
    smaa: true,
    maxLights: 7,
    envResolution: 192,
  },
  high: {
    dpr: [1.0, 1.9],
    shadows: true,
    shadowMapSize: 2048,
    rainCount: 24000,
    splashCount: 960,
    dripCount: 260,
    reflectionScale: 0.78,
    reflectionInterval: 1,
    bloom: 0.5,
    bloomThreshold: 1.18,
    vignette: 0.42,
    noise: true,
    dof: true,
    smaa: true,
    maxLights: 9,
    envResolution: 256,
  },
}

export const INITIAL_CAMERA = {
  target: [-0.22, 1.78, 0.55] as const,
  yaw: 0.285,
  pitch: -0.004,
  distance: 12.2,
}
