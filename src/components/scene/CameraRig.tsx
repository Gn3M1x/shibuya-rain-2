import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { INITIAL_CAMERA } from '../../config/quality'
import { ALLEY_WALK, COLLIDERS, WALK_BOUNDS } from '../../config/world'
import { useSceneStore } from '../../state/useSceneStore'
import { clamp, damp, insideAabb, segmentAabb } from '../../utils/math'

interface OrbitState {
  yaw: number
  pitch: number
  distance: number
  target: THREE.Vector3
}

const MIN_DISTANCE = 4.4
const MAX_DISTANCE = 30
const MIN_PITCH = -0.055
const MAX_PITCH = 1.12

function insideWalk(x: number, z: number) {
  const main = x > WALK_BOUNDS.minX && x < WALK_BOUNDS.maxX && z > WALK_BOUNDS.minZ && z < WALK_BOUNDS.maxZ
  const alley = x > ALLEY_WALK.minX && x < ALLEY_WALK.maxX && z > ALLEY_WALK.minZ && z < ALLEY_WALK.maxZ
  return main || alley
}

function blocked(x: number, z: number, pad = 0.38) {
  return COLLIDERS.some((box) => insideAabb(x, z, box, pad))
}


/** Farthest fraction of the orbit ray that stays outside every building. */
function clearFraction(tx: number, tz: number, px: number, pz: number) {
  let allowed = 1
  for (const box of COLLIDERS) {
    const hit = segmentAabb(tx, tz, px, pz, box.minX - 0.24, box.maxX + 0.24, box.minZ - 0.24, box.maxZ + 0.24)
    if (hit !== null && hit > 0.001) allowed = Math.min(allowed, hit)
  }
  return allowed
}

/** Reject an orbit angle that would push the lens too close to a facade. */
function orbitClear(target: THREE.Vector3, yaw: number, pitch: number, distance: number) {
  const horizontal = Math.cos(pitch) * distance
  const px = target.x + Math.sin(yaw) * horizontal
  const pz = target.z + Math.cos(yaw) * horizontal
  return clearFraction(target.x, target.z, px, pz) * distance > 3.1
}

export function CameraRig() {
  const { camera, gl } = useThree()
  const resetToken = useSceneStore((s) => s.resetToken)
  const cinematic = useSceneStore((s) => s.cinematic)
  const setCinematic = useSceneStore((s) => s.setCinematic)

  const desired = useRef<OrbitState>({
    yaw: INITIAL_CAMERA.yaw,
    pitch: INITIAL_CAMERA.pitch,
    distance: INITIAL_CAMERA.distance,
    target: new THREE.Vector3(...INITIAL_CAMERA.target),
  })
  const current = useRef<OrbitState>({
    yaw: INITIAL_CAMERA.yaw,
    pitch: INITIAL_CAMERA.pitch,
    distance: INITIAL_CAMERA.distance,
    target: new THREE.Vector3(...INITIAL_CAMERA.target),
  })
  const drag = useRef({ active: false, pointerId: -1, x: 0, y: 0 })
  const keys = useRef<Record<string, boolean>>({})
  const cinematicBase = useRef<OrbitState>({
    yaw: INITIAL_CAMERA.yaw,
    pitch: INITIAL_CAMERA.pitch,
    distance: INITIAL_CAMERA.distance,
    target: new THREE.Vector3(...INITIAL_CAMERA.target),
  })
  const lookTarget = useRef(new THREE.Vector3())
  const cinematicRef = useRef(cinematic)
  cinematicRef.current = cinematic

  /* Reset to the composed opening shot. */
  useEffect(() => {
    desired.current.yaw = INITIAL_CAMERA.yaw
    desired.current.pitch = INITIAL_CAMERA.pitch
    desired.current.distance = INITIAL_CAMERA.distance
    desired.current.target.set(...INITIAL_CAMERA.target)
    cinematicBase.current.yaw = INITIAL_CAMERA.yaw
    cinematicBase.current.pitch = INITIAL_CAMERA.pitch
    cinematicBase.current.distance = INITIAL_CAMERA.distance
    cinematicBase.current.target.set(...INITIAL_CAMERA.target)
  }, [resetToken])

  /* When cinematic turns on, drift from wherever the user currently is. */
  useEffect(() => {
    if (cinematic) {
      cinematicBase.current.yaw = desired.current.yaw
      cinematicBase.current.pitch = desired.current.pitch
      cinematicBase.current.distance = desired.current.distance
      cinematicBase.current.target.copy(desired.current.target)
    }
  }, [cinematic])

  /* Mouse / pen orbit + dolly. */
  useEffect(() => {
    const element = gl.domElement
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return
      drag.current.active = true
      drag.current.pointerId = event.pointerId
      drag.current.x = event.clientX
      drag.current.y = event.clientY
      element.setPointerCapture(event.pointerId)
      element.style.cursor = 'grabbing'
      if (cinematicRef.current) setCinematic(false)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!drag.current.active || event.pointerId !== drag.current.pointerId) return
      const dx = event.clientX - drag.current.x
      const dy = event.clientY - drag.current.y
      drag.current.x = event.clientX
      drag.current.y = event.clientY
      const nextPitch = clamp(desired.current.pitch - dy * 0.0021, MIN_PITCH, MAX_PITCH)
      const nextYaw = desired.current.yaw - dx * 0.0031
      if (orbitClear(desired.current.target, nextYaw, nextPitch, desired.current.distance)) {
        desired.current.yaw = nextYaw
      }
      desired.current.pitch = nextPitch
    }
    const endDrag = (event: PointerEvent) => {
      if (event.pointerId !== drag.current.pointerId) return
      drag.current.active = false
      element.style.cursor = 'grab'
      try {
        element.releasePointerCapture(event.pointerId)
      } catch {
        /* pointer already released */
      }
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const nextDistance = clamp(
        desired.current.distance * Math.exp(event.deltaY * 0.00092),
        MIN_DISTANCE,
        MAX_DISTANCE,
      )
      if (orbitClear(desired.current.target, desired.current.yaw, desired.current.pitch, nextDistance)) {
        desired.current.distance = nextDistance
      }
      if (cinematicRef.current) setCinematic(false)
    }
    const onContextMenu = (event: MouseEvent) => event.preventDefault()

    element.style.cursor = 'grab'
    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', endDrag)
    element.addEventListener('pointercancel', endDrag)
    element.addEventListener('wheel', onWheel, { passive: false })
    element.addEventListener('contextmenu', onContextMenu)
    return () => {
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', endDrag)
      element.removeEventListener('pointercancel', endDrag)
      element.removeEventListener('wheel', onWheel)
      element.removeEventListener('contextmenu', onContextMenu)
    }
  }, [gl, setCinematic])

  /* Keyboard movement + shortcuts. */
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      const store = useSceneStore.getState()
      if (event.code === 'KeyR') store.resetCamera()
      if (event.code === 'KeyC') store.setCinematic(!store.cinematic)
      if (event.code === 'KeyH') store.togglePhotoMode()
      keys.current[event.code] = true
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault()
        if (store.cinematic) store.setCinematic(false)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      keys.current[event.code] = false
    }
    const onBlur = () => {
      keys.current = {}
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useFrame((state, delta) => {
    const d = desired.current
    const c = current.current
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime

    /* Slow automatic dolly for the cinematic mode. */
    if (cinematicRef.current && !drag.current.active) {
      const base = cinematicBase.current
      d.yaw = base.yaw + Math.sin(t * 0.062) * 0.19 + Math.sin(t * 0.021 + 1.1) * 0.05
      d.pitch = base.pitch + Math.sin(t * 0.047 + 1.3) * 0.028
      d.distance = clamp(base.distance + Math.sin(t * 0.033) * 1.15, MIN_DISTANCE, MAX_DISTANCE)
      d.target.z = base.target.z + Math.sin(t * 0.023 + 0.4) * 0.32
      d.target.x = base.target.x + Math.sin(t * 0.017 + 2.0) * 0.18
    }

    /* WASD ground movement, projected onto the camera's forward axis. */
    const forwardX = d.target.x - (d.target.x + Math.sin(d.yaw) * Math.cos(d.pitch) * d.distance)
    const forwardZ = d.target.z - (d.target.z + Math.cos(d.yaw) * Math.cos(d.pitch) * d.distance)
    const forwardLen = Math.hypot(forwardX, forwardZ) || 1
    const fx = forwardX / forwardLen
    const fz = forwardZ / forwardLen
    const rx = -fz
    const rz = fx
    let mx = 0
    let mz = 0
    if (keys.current['KeyW'] || keys.current['ArrowUp']) {
      mx += fx
      mz += fz
    }
    if (keys.current['KeyS'] || keys.current['ArrowDown']) {
      mx -= fx
      mz -= fz
    }
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) {
      mx -= rx
      mz -= rz
    }
    if (keys.current['KeyD'] || keys.current['ArrowRight']) {
      mx += rx
      mz += rz
    }
    if (mx !== 0 || mz !== 0) {
      const len = Math.hypot(mx, mz) || 1
      const speed = keys.current['ShiftLeft'] || keys.current['ShiftRight'] ? 3.4 : 1.55
      const stepX = (mx / len) * speed * dt
      const stepZ = (mz / len) * speed * dt
      const nx = d.target.x + stepX
      const nz = d.target.z + stepZ
      if (insideWalk(nx, nz) && !blocked(nx, nz)) {
        d.target.x = nx
        d.target.z = nz
      } else if (insideWalk(nx, d.target.z) && !blocked(nx, d.target.z)) {
        d.target.x = nx
      } else if (insideWalk(d.target.x, nz) && !blocked(d.target.x, nz)) {
        d.target.z = nz
      }
    }

    /* Critically damped smoothing for every channel. */
    c.yaw = damp(c.yaw, d.yaw, 3.1, dt)
    c.pitch = damp(c.pitch, d.pitch, 3.4, dt)
    c.distance = damp(c.distance, d.distance, 3.2, dt)
    c.target.x = damp(c.target.x, d.target.x, 3.0, dt)
    c.target.y = damp(c.target.y, d.target.y, 3.0, dt)
    c.target.z = damp(c.target.z, d.target.z, 3.0, dt)

    const horizontal = Math.cos(c.pitch) * c.distance
    let px = c.target.x + Math.sin(c.yaw) * horizontal
    let py = c.target.y + Math.sin(c.pitch) * c.distance
    let pz = c.target.z + Math.cos(c.yaw) * horizontal

    /* Keep the lens out of walls by shortening the orbit ray. */
    let allowed = 1
    for (const box of COLLIDERS) {
      // A small pad keeps the lens off the wall without swallowing the
      // sidewalk-side orbit pivot (the initial pivot sits ~0.55 m from the
      // storefront, so anything above ~0.27 m collapses the reset shot).
      const hit = segmentAabb(c.target.x, c.target.z, px, pz, box.minX - 0.24, box.maxX + 0.24, box.minZ - 0.24, box.maxZ + 0.24)
      if (hit !== null && hit > 0.001) allowed = Math.min(allowed, hit)
    }
    if (allowed < 1) {
      const safeDistance = Math.max(2.2, c.distance * allowed - 0.35)
      const k = safeDistance / Math.max(0.001, c.distance)
      px = c.target.x + (px - c.target.x) * k
      py = c.target.y + (py - c.target.y) * k
      pz = c.target.z + (pz - c.target.z) * k
    }

    /* Never drop below the pavement. */
    if (py < 0.62) {
      const scale = (0.62 - c.target.y) / Math.max(0.0001, py - c.target.y)
      px = c.target.x + (px - c.target.x) * Math.max(0, scale)
      pz = c.target.z + (pz - c.target.z) * Math.max(0, scale)
      py = 0.62
    }

    camera.position.set(px, py, pz)
    lookTarget.current.set(c.target.x, c.target.y + 0.02, c.target.z)
    camera.lookAt(lookTarget.current)
  })

  return null
}
