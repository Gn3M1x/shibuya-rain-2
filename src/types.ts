export type QualityLevel = 'low' | 'medium' | 'high'
export type TimeOfDay = 'night' | 'dusk'

export type Vec2 = readonly [number, number]
export type Vec3 = readonly [number, number, number]

export interface BoxCollider {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}
