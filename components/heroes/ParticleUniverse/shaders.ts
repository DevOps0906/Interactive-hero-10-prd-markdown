export const vertexShader = /* glsl */ `
attribute vec3 aSpiral;
attribute vec3 aMark;
attribute vec3 aScatter;
attribute vec3 aColor;
attribute float aSize;
attribute float aSeed;

uniform float uTime;
uniform float uGather;
uniform float uMorphProgress;
uniform float uIntensity;
uniform float uPixelRatio;
uniform float uSize;
uniform float uForce;
uniform float uRadius;
uniform vec3 uShape;
uniform vec3 uMouse;
uniform vec3 uAccent;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 base = position * uShape.x + aSpiral * uShape.y + aMark * uShape.z;

  float g = smoothstep(0.0, 1.0, clamp(uGather * 1.25 - aSeed * 0.25, 0.0, 1.0));
  base = mix(aScatter, base, g);

  float breath = sin(uTime * 0.6 + aSeed * 6.2831 + base.y * 1.5);
  base += normalize(base + vec3(1e-4)) * breath * 0.04 * uIntensity;

  float m = sin(3.14159265 * uMorphProgress);
  base += vec3(sin(aSeed * 40.0 + uTime * 2.0), cos(aSeed * 30.0 + uTime * 2.6), sin(aSeed * 50.0 - uTime * 2.0)) * m * 0.6 * uIntensity;

  vec4 world = modelMatrix * vec4(base, 1.0);

  vec3 d = world.xyz - uMouse;
  float dist = length(d);
  float f = smoothstep(uRadius, 0.0, dist);
  float disp = f * uForce;
  if (disp < 0.0) disp = max(disp, -dist);
  world.xyz += normalize(d + vec3(1e-5)) * disp;

  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uSize * uPixelRatio * (1.0 + f * 1.2 + m * 0.4) * (8.0 / max(-mv.z, 0.1));

  float accentMix = clamp(f * 0.9 + m * 0.45, 0.0, 1.0);
  vColor = mix(aColor, uAccent, accentMix) * (0.8 + 0.4 * uIntensity * 0.5);
  vAlpha = 0.55 + accentMix * 0.35;
}
`;

export const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor, a * vAlpha);
  #include <colorspace_fragment>
}
`;
