export const wetGroundVertex = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewDir;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - world.xyz);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const wetGroundFragment = /* glsl */ `
precision highp float;

uniform sampler2D tReflection;
uniform sampler2D tAsphalt;
uniform sampler2D tRoughness;
uniform vec2 uResolution;
uniform float uTime;
uniform float uRain;
uniform float uPuddleAmount;
uniform float uReflectionEnabled;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec3 uLamp0Pos;
uniform vec3 uLamp0Color;
uniform vec3 uLamp1Pos;
uniform vec3 uLamp1Color;
uniform vec3 uStoreColor;
uniform vec2 uStorePos;
uniform float uDebug;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewDir;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  return vec2(hash12(p), hash12(p + 19.37));
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * vnoise(p);
    p = p * 2.03 + vec2(13.7, 7.1);
    amplitude *= 0.5;
  }
  return value;
}

// Procedural rain rings. Returns height in x and accumulated normal in yz.
vec3 rainRipples(vec2 p, float t, float scale, float seed) {
  vec2 cell = p * scale + seed;
  vec2 id = floor(cell);
  vec2 f = fract(cell);
  float height = 0.0;
  vec2 n = vec2(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 cid = id + g;
      vec2 center = vec2(hash12(cid + 2.7), hash12(cid + 11.3));
      float h = hash12(cid + 37.7);
      float age = fract(t * 0.72 + h * 9.13);
      vec2 delta = f - (g + center);
      float d = length(delta);
      float radius = mix(0.012, 0.20, age);
      float width = 0.012 + age * 0.026;
      float band = (d - radius) / width;
      float ring = exp(-band * band) * (1.0 - age) * smoothstep(0.0, 0.035, age);
      height += ring;
      float slope = -2.0 * band * ring / width;
      n += normalize(delta + vec2(1e-5)) * slope * 0.16;
    }
  }
  return vec3(height, n);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  vec2 world = vWorldPos.xz;

  vec3 asphaltTex = texture2D(tAsphalt, world * 0.085).rgb;
  float roughTex = texture2D(tRoughness, world * 0.12).r;

  // Broad, slow-drifting puddle shapes.
  float broad = fbm(world * 0.17 + vec2(3.2, 9.1));
  float detail = fbm(world * 0.43 - vec2(7.1, 2.4));
  float puddle = smoothstep(0.635, 0.72, broad * 0.62 + detail * 0.56);
  puddle *= smoothstep(0.05, 0.55, uPuddleAmount);

  // Deliberate foreground puddles carry the store reflection into the frame.
  float spots = 0.0;
  float wobble = (fbm(world * 1.15 + 7.0) - 0.5) * 1.0;
  spots = max(spots, 1.0 - smoothstep(0.30, 0.98, length(world - vec2(0.4, 7.6)) + wobble * 0.55));
  spots = max(spots, 1.0 - smoothstep(0.24, 0.95, length(world - vec2(-4.7, 8.9)) + wobble * 0.45));
  spots = max(spots, 1.0 - smoothstep(0.22, 0.85, length(world - vec2(5.3, 9.5)) + wobble * 0.40));
  spots = max(spots, 1.0 - smoothstep(0.16, 0.68, length(world - vec2(-1.3, 10.6)) + wobble * 0.32));
  spots = max(spots, 1.0 - smoothstep(0.34, 0.98, length(world - vec2(1.6, 10.2)) + wobble * 0.5));
  spots = max(spots, 1.0 - smoothstep(0.26, 0.78, length(world - vec2(-3.1, 10.8)) + wobble * 0.4));
  spots = max(spots, 1.0 - smoothstep(0.22, 0.66, length(world - vec2(4.5, 9.7)) + wobble * 0.35));
  spots *= smoothstep(0.05, 0.35, uPuddleAmount);
  puddle = clamp(max(puddle, spots), 0.0, 1.0);

  // Wet film is continuous; puddles are simply more reflective.
  float wet = mix(0.38, 1.0, uRain) * (0.55 + 0.45 * roughTex);

  // Micro normals: asphalt grain and water surface tilt.
  vec2 micro = vec2(
    fbm(world * 3.15 + 2.0),
    fbm(world * 3.05 - 8.0)
  ) - 0.5;
  float microAmt = mix(0.20, 0.035, puddle);

  vec3 ripple0 = rainRipples(world, uTime, 2.45, 0.0);
  vec3 ripple1 = rainRipples(world, uTime * 1.13 + 9.0, 3.30, 4.7);
  float rippleH = (ripple0.x + ripple1.x * 0.7) * uRain * (0.35 + 0.65 * puddle);
  vec2 rippleN = (ripple0.yz + ripple1.yz * 0.7) * uRain;

  vec2 surfaceN = micro * microAmt + rippleN * 0.18;
  N = normalize(vec3(surfaceN.x, 1.0, surfaceN.y));

  // Screen-space planar reflection, softened to feel like water film.
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  vec2 distort = surfaceN * mix(0.0110, 0.0011, puddle);
  distort.x += sin(world.y * 2.7 + uTime * 1.1) * 0.0008;
  float blurPx = mix(0.0022, 0.00035, puddle) * mix(1.0, 0.6, uRain);
  vec3 refl = vec3(0.0);
  float weights = 0.0;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    vec2 off = vec2(
      sin(fi * 2.399 + 1.7),
      cos(fi * 1.913 + 0.3) * 1.9
    ) * blurPx * (0.22 + fi * 0.30);
    float w = 1.0 - fi * 0.075;
    refl += texture2D(tReflection, screenUv + distort + off).rgb * w;
    weights += w;
  }
  refl /= weights;
  refl *= vec3(0.9, 0.95, 1.06) * 1.2;

  float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 4.0);
  float reflStrength = (0.46 + 1.05 * puddle) * (0.52 + 0.48 * fresnel) * wet;
  reflStrength *= uReflectionEnabled;

  // Dark asphalt base, lifted by local practical light pools.
  vec3 base = asphaltTex * vec3(0.034, 0.042, 0.058);
  base *= 0.60 + roughTex * 0.85;
  base *= mix(0.55, 1.0, wet);
  base *= mix(1.0, 0.42, puddle);
  base += vec3(0.012, 0.020, 0.034) * wet * (0.35 + 0.65 * fresnel);

  float dStore = length(world - uStorePos);
  vec3 storeGlow = uStoreColor * exp(-dStore * 0.20) * (0.12 + 0.42 * wet);
  storeGlow += uStoreColor * exp(-dStore * 0.06) * 0.035;

  float dL0 = length(world - uLamp0Pos.xz);
  vec3 lamp0 = uLamp0Color * exp(-dL0 * 0.26) * 0.36;
  float dL1 = length(world - uLamp1Pos.xz);
  vec3 lamp1 = uLamp1Color * exp(-dL1 * 0.26) * 0.28;

  vec3 color = base + storeGlow + lamp0 + lamp1;
  color += refl * reflStrength * vec3(0.84, 0.90, 1.0);

  // Rain ring highlights make the water readable without over-blooming.
  color += vec3(0.62, 0.78, 1.0) * rippleH * 0.28 * (0.18 + 0.82 * puddle) * (0.24 + fresnel);

  // Very subtle puddle edge light.
  float edge = smoothstep(0.0, 0.14, puddle) * (1.0 - smoothstep(0.14, 0.30, puddle));
  color += uStoreColor * edge * exp(-dStore * 0.2) * 0.04;

  // Distance fog matching the scene.
  float dist = distance(cameraPosition, vWorldPos);
  float fog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
  color = mix(color, uFogColor, clamp(fog, 0.0, 1.0));

  if (uDebug > 1.5) color = vec3(puddle);
  else if (uDebug > 0.5) color = refl;
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`
