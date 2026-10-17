import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { BlendFunction, Effect, ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { Uniform } from 'three'
import { Bloom, ChromaticAberration, EffectComposer, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { useSceneStore } from '../../state/useSceneStore'
import { QUALITY } from '../../config/quality'

const gradeFragment = /* glsl */ `
uniform float uStrength;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));

  // Cool the shadow end of the curve toward rainy blue-grey, keep the
  // convenience-store highlights warm and clean.
  vec3 cool = c * vec3(0.86, 0.95, 1.08);
  c = mix(cool, c, smoothstep(0.015, 0.42, l));
  c += vec3(0.002, 0.005, 0.010) * (1.0 - smoothstep(0.0, 0.30, l));

  // Gentle highlight warmth.
  c = mix(c, c * vec3(1.035, 1.005, 0.955), smoothstep(0.55, 1.0, l) * 0.5);

  // Very subtle S-curve to deepen the night without crushing detail.
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.16);

  outputColor = vec4(c * uStrength, inputColor.a);
}
`

/**
 * A restrained filmic stack: the scene renders in linear HDR (renderer uses
 * NoToneMapping), bloom works on real light values, then ACES compresses once
 * at the end. A small custom grade cools the shadows. Low quality keeps only
 * a cheap bloom + vignette.
 */
export function Effects() {
  const quality = useSceneStore((s) => s.quality)
  const profile = QUALITY[quality]

  const grade = useMemo(
    () =>
      new Effect('ShibuyaGrade', gradeFragment, {
        uniforms: new Map<string, Uniform>([['uStrength', new Uniform(1.0)]]),
      }),
    [],
  )

  const effects: ReactElement[] = []
  effects.push(
    <Bloom
      key="bloom"
      intensity={profile.bloom}
      luminanceThreshold={profile.bloomThreshold}
      luminanceSmoothing={0.32}
      mipmapBlur
      radius={0.72}
    />,
  )
  effects.push(<ToneMapping key="tone" mode={ToneMappingMode.ACES_FILMIC} />)
  effects.push(<primitive key="grade" object={grade} dispose={null} />)
  effects.push(<Vignette key="vignette" eskil={false} offset={0.18} darkness={profile.vignette} />)
  if (profile.noise) {
    effects.push(<Noise key="noise" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.08} />)
  }
  if (profile.smaa) {
    effects.push(
      <ChromaticAberration key="ca" offset={new THREE.Vector2(0.00035, 0.00055)} radialModulation modulationOffset={0.18} />,
    )
    effects.push(<SMAA key="smaa" />)
  }

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {effects}
    </EffectComposer>
  )
}
