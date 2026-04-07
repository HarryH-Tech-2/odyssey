uniform float uTime;
uniform vec3 uSunPosition;
uniform vec3 uCameraPos;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying float vFoam;
varying float vHeight;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(uCameraPos - vWorldPos);
  vec3 sunDir = normalize(uSunPosition);

  // Fresnel
  float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
  fresnel = mix(0.04, 1.0, fresnel);

  vec3 waterColor = mix(uShallowColor, uDeepColor, fresnel);

  // Sharp sun specular
  vec3 halfDir = normalize(sunDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), 256.0);
  vec3 specular = vec3(1.0, 0.95, 0.8) * spec * 3.0;

  // Broad sun path
  float broadSpec = pow(max(dot(normal, halfDir), 0.0), 16.0);
  vec3 sunPath = vec3(1.0, 0.85, 0.6) * broadSpec * 0.4;

  // Sky reflection
  vec3 reflectDir = reflect(-viewDir, normal);
  float skyGrad = max(reflectDir.y, 0.0);
  vec3 skyReflection = mix(vec3(0.55, 0.75, 0.92), vec3(0.18, 0.35, 0.72), pow(skyGrad, 0.5));
  waterColor = mix(waterColor, skyReflection, fresnel * 0.6);

  // Foam
  vec2 foamUV = vWorldPos.xz * 0.15;
  float foamNoise = fbm(foamUV + uTime * 0.3);
  float foamNoise2 = fbm(foamUV * 1.5 - uTime * 0.2);
  float foamPattern = foamNoise * foamNoise2;
  float foam = vFoam * smoothstep(0.15, 0.45, foamPattern);
  foam += smoothstep(1.2, 2.0, vHeight) * smoothstep(0.2, 0.5, foamNoise) * 0.7;
  foam = clamp(foam, 0.0, 1.0);
  vec3 foamCol = uFoamColor * (0.8 + 0.2 * foamNoise);

  // Subsurface scattering
  float sss = pow(max(dot(viewDir, -sunDir + normal * 0.5), 0.0), 3.0);
  vec3 subsurface = vec3(0.0, 0.6, 0.5) * sss * 0.3;

  vec3 color = waterColor + specular + sunPath + subsurface;
  color = mix(color, foamCol, foam * 0.85);

  // Distance haze
  float dist = length(vWorldPos - uCameraPos);
  float haze = 1.0 - exp(-dist * 0.002);
  color = mix(color, vec3(0.6, 0.72, 0.82), haze);

  gl_FragColor = vec4(color, 0.95);
}
