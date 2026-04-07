uniform float uTime;
uniform float uWaveHeight;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying float vFoam;
varying float vHeight;

vec3 gerstnerWave(vec3 pos, float steepness, float wavelength, vec2 direction, float time) {
  float k = 6.28318 / wavelength;
  float c = sqrt(9.8 / k);
  vec2 d = normalize(direction);
  float f = k * (dot(d, pos.xz) - c * time);
  float a = steepness / k;
  return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
}

vec3 sumWaves(vec3 pos, float time) {
  vec3 w = vec3(0.0);
  w += gerstnerWave(pos, 0.15, 28.0, vec2(1.0, 0.3), time * 0.8);
  w += gerstnerWave(pos, 0.12, 18.0, vec2(0.3, 1.0), time * 0.6);
  w += gerstnerWave(pos, 0.08, 10.0, vec2(-0.5, 0.7), time * 1.1);
  w += gerstnerWave(pos, 0.06, 6.0, vec2(0.8, -0.4), time * 1.4);
  w += gerstnerWave(pos, 0.04, 3.5, vec2(-0.3, -0.8), time * 1.8);
  return w * uWaveHeight;
}

void main() {
  vUv = uv;
  vec3 pos = position;

  vec3 totalWave = sumWaves(pos, uTime);
  pos += totalWave;

  vHeight = totalWave.y;
  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

  float eps = 0.5;
  vec3 posR = position + vec3(eps, 0.0, 0.0);
  vec3 posF = position + vec3(0.0, 0.0, eps);
  vec3 wR = posR + sumWaves(posR, uTime);
  vec3 wF = posF + sumWaves(posF, uTime);

  vec3 tangent = normalize(wR - pos);
  vec3 bitangent = normalize(wF - pos);
  vNormal = normalize(cross(bitangent, tangent));

  float crest = smoothstep(0.6, 1.8, totalWave.y);
  float steepnessFoam = 1.0 - dot(vNormal, vec3(0.0, 1.0, 0.0));
  vFoam = max(crest, smoothstep(0.3, 0.7, steepnessFoam));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
