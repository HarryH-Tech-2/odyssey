uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;

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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;

  float n = fbm(uv * 4.0 + vec2(0.0, -uTime * 3.0));
  float n2 = fbm(uv * 8.0 + vec2(uTime * 0.5, -uTime * 4.0));

  float shape = 1.0 - uv.y;
  shape *= smoothstep(0.0, 0.3, 0.5 - abs(uv.x - 0.5));

  float fire = shape * n * n2 * uIntensity;
  fire = smoothstep(0.1, 0.9, fire);

  vec3 col = mix(vec3(0.8, 0.2, 0.0), vec3(1.0, 0.6, 0.0), fire);
  col = mix(col, vec3(1.0, 0.95, 0.8), smoothstep(0.7, 1.0, fire));

  float alpha = smoothstep(0.0, 0.2, fire);

  gl_FragColor = vec4(col, alpha);
}
