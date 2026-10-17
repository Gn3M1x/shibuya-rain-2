import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Suspense } from 'react'
import { Scene } from './components/scene/Scene'
import { HUD } from './components/ui/HUD'
import { useRainAudio } from './audio/useRainAudio'
import './styles.css'

export default function App() {
  useRainAudio()

  return (
    <>
      <Canvas
        shadows
        flat
        dpr={[0.75, 1.9]}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
          stencil: false,
        }}
        camera={{ fov: 50, near: 0.08, far: 280, position: [0.36, 1.57, 14.3] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NoToneMapping
          gl.setClearColor('#050a12', 1)
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <HUD />
    </>
  )
}
