uniform float uTime;
uniform float uWindStrength;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

  vec3 pos = position;
  float billow = sin(pos.y * 1.5 + uTime * 2.0) * 0.3 * uv.x * uWindStrength;
  billow += sin(pos.y * 3.0 + uTime * 3.0) * 0.1 * uv.x * uWindStrength;
  billow += sin(pos.y * 0.8 + uTime * 1.2) * 0.15 * uv.x * uWindStrength;
  pos.z += billow;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
