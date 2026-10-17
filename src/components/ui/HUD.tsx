import { useCallback, useEffect, useRef, useState } from 'react'
import { useSceneStore } from '../../state/useSceneStore'
import type { QualityLevel, TimeOfDay } from '../../types'

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? 'is-on' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  )
}

function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="segment" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? 'is-active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function HUD() {
  const rainIntensity = useSceneStore((s) => s.rainIntensity)
  const setRainIntensity = useSceneStore((s) => s.setRainIntensity)
  const timeOfDay = useSceneStore((s) => s.timeOfDay)
  const setTimeOfDay = useSceneStore((s) => s.setTimeOfDay)
  const quality = useSceneStore((s) => s.quality)
  const setQuality = useSceneStore((s) => s.setQuality)
  const cinematic = useSceneStore((s) => s.cinematic)
  const setCinematic = useSceneStore((s) => s.setCinematic)
  const photoMode = useSceneStore((s) => s.photoMode)
  const togglePhotoMode = useSceneStore((s) => s.togglePhotoMode)
  const soundOn = useSceneStore((s) => s.soundOn)
  const setSoundOn = useSceneStore((s) => s.setSoundOn)
  const resetCamera = useSceneStore((s) => s.resetCamera)

  const [collapsed, setCollapsed] = useState(false)
  const [flash, setFlash] = useState(false)
  const flashTimer = useRef<number | null>(null)

  const screenshot = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    try {
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = url
      link.download = `shibuya-rain-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
      link.click()
    } catch (error) {
      console.warn('Screenshot failed', error)
    }
    setFlash(true)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(false), 320)
  }, [])

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
    }
  }, [])

  return (
    <div className={`hud ${photoMode ? 'is-photo' : ''}`}>
      <header className="scene-brand">
        <span className="brand-mark" />
        <div>
          <h1>SHIBUYA RAIN</h1>
          <p>
            <span>00:30</span>
            <i />
            <span>TOKYO</span>
            <i />
            <span>雨</span>
          </p>
        </div>
      </header>

      <div className={`dock ${collapsed ? 'is-collapsed' : ''}`}>
        <button
          type="button"
          className="dock-head"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-label="Toggle settings"
        >
          <span className="dock-title">
            <span className="live-dot" />
            ATMOSPHERE
          </span>
          <span className="dock-chevron" />
        </button>

        <div className="dock-body">
          <div className="row">
            <div className="row-label">
              <span>Rain</span>
              <em>{Math.round(rainIntensity * 100)}%</em>
            </div>
            <input
              className="slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={rainIntensity}
              onChange={(event) => setRainIntensity(Number(event.target.value))}
              aria-label="Rain intensity"
            />
          </div>

          <div className="row">
            <div className="row-label">
              <span>Time</span>
            </div>
            <Segment<TimeOfDay>
              options={[
                { value: 'night', label: 'Night' },
                { value: 'dusk', label: 'Dusk' },
              ]}
              value={timeOfDay}
              onChange={setTimeOfDay}
            />
          </div>

          <div className="row">
            <div className="row-label">
              <span>Quality</span>
            </div>
            <Segment<QualityLevel>
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Med' },
                { value: 'high', label: 'High' },
              ]}
              value={quality}
              onChange={setQuality}
            />
          </div>

          <div className="row row-inline">
            <div className="row-label">
              <span>Cinematic camera</span>
            </div>
            <Toggle checked={cinematic} onChange={setCinematic} label="Cinematic camera" />
          </div>

          <div className="row row-inline">
            <div className="row-label">
              <span>Rain sound</span>
            </div>
            <Toggle checked={soundOn} onChange={setSoundOn} label="Rain sound" />
          </div>

          <div className="actions">
            <button type="button" onClick={resetCamera}>
              <span className="action-key">R</span>
              Reset
            </button>
            <button type="button" onClick={screenshot}>
              <span className="action-key">PNG</span>
              Shoot
            </button>
            <button type="button" onClick={togglePhotoMode}>
              <span className="action-key">H</span>
              Photo
            </button>
          </div>
        </div>
      </div>

      <footer className="scene-hint">
        <span>Drag</span> orbit
        <i />
        <span>Scroll</span> dolly
        <i />
        <span>WASD</span> walk
        <i />
        <span>H</span> photo mode
      </footer>

      <div className={`flash ${flash ? 'is-active' : ''}`} />
      <div className="photo-toast">H · EXIT PHOTO MODE</div>
    </div>
  )
}
