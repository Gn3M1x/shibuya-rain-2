import type { BoxCollider } from '../types'

/** The store occupies the north-west corner. Facade at z = 0, facing +Z. */
export const STORE = {
  x0: -5.6,
  x1: 5.6,
  z0: -7.8,
  z1: 0,
  height: 3.55,
  canopyZ: 1.55,
  canopyY: 3.02,
}

/** Main road: east-west. */
export const ROAD = {
  x0: -34,
  x1: 34,
  z0: 3.7,
  z1: 12.1,
}

/** Narrow north-south alley to the right of the store. */
export const ALLEY = {
  x0: 7.2,
  x1: 12.6,
  z0: -26,
  z1: 12.1,
}

export const SIDEWALK = {
  northZ1: 3.7,
  southZ0: 12.1,
  southZ1: 15.8,
  height: 0.145,
}

export const WALK_BOUNDS = {
  minX: -20.5,
  maxX: 20.5,
  minZ: 0.9,
  maxZ: 14.6,
}

export const ALLEY_WALK = {
  minX: 7.5,
  maxX: 12.3,
  minZ: -10.5,
  maxZ: 14.6,
}

/**
 * Conservative 2D colliders used by the camera rig. The player remains a
 * street-level observer: these boxes prevent the lens from entering a facade.
 */
export const COLLIDERS: BoxCollider[] = [
  // The store itself.
  { minX: -6.1, maxX: 6.1, minZ: -8.4, maxZ: 0.25 },
  // West block.
  { minX: -34, maxX: -8.6, minZ: -30, maxZ: 1.0 },
  // East block (beyond the alley).
  { minX: 13.1, maxX: 34, minZ: -30, maxZ: 1.0 },
  // Opposite side of the main street.
  { minX: -34, maxX: 34, minZ: 15.25, maxZ: 42 },
  // Deep alley walls.
  { minX: 5.5, maxX: 7.15, minZ: -30, maxZ: -1.2 },
  { minX: 12.65, maxX: 14.2, minZ: -30, maxZ: -1.2 },
]

export const AMBIENT = {
  night: {
    fog: '#0a111b',
    fogDensity: 0.0375,
    skyTop: '#050a12',
    skyHorizon: '#152238',
    hemiSky: '#25364c',
    hemiGround: '#090b0f',
    hemiIntensity: 0.76,
    moonColor: '#8ca7c7',
    moonIntensity: 0.6,
  },
  dusk: {
    fog: '#1b2538',
    fogDensity: 0.019,
    skyTop: '#132743',
    skyHorizon: '#48536d',
    hemiSky: '#56688a',
    hemiGround: '#14171c',
    hemiIntensity: 1.05,
    moonColor: '#b9c7dc',
    moonIntensity: 0.95,
  },
} as const
