export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

export function dampVec3(
  current: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  lambda: number,
  dt: number,
) {
  current.x = damp(current.x, target.x, lambda, dt)
  current.y = damp(current.y, target.y, lambda, dt)
  current.z = damp(current.z, target.z, lambda, dt)
}

/** Returns the entry parameter t in [0,1] of a 2D segment against an expanded AABB. */
export function segmentAabb(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): number | null {
  const dx = x1 - x0
  const dz = z1 - z0
  let tmin = 0
  let tmax = 1

  const axes: Array<[number, number, number, number]> = [
    [x0, dx, minX, maxX],
    [z0, dz, minZ, maxZ],
  ]

  for (const [origin, delta, lo, hi] of axes) {
    if (Math.abs(delta) < 1e-8) {
      if (origin < lo || origin > hi) return null
      continue
    }
    let t1 = (lo - origin) / delta
    let t2 = (hi - origin) / delta
    if (t1 > t2) [t1, t2] = [t2, t1]
    tmin = Math.max(tmin, t1)
    tmax = Math.min(tmax, t2)
    if (tmin > tmax) return null
  }
  return tmin >= 0 && tmin <= 1 ? tmin : null
}

export function insideAabb(
  x: number,
  z: number,
  box: { minX: number; maxX: number; minZ: number; maxZ: number },
  pad = 0,
): boolean {
  return x > box.minX - pad && x < box.maxX + pad && z > box.minZ - pad && z < box.maxZ + pad
}
