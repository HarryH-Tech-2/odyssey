varying vec2 vUv;
varying vec3 vNormal;

uniform vec3 uColor;
uniform vec3 uSunPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 sunDir = normalize(uSunPosition);

  float light = max(dot(normal, sunDir), 0.0) * 0.6 + 0.4;

  vec3 color = uColor * light;
  color *= mix(0.9, 1.0, vUv.y);

  float weave = sin(vUv.x * 200.0) * sin(vUv.y * 200.0) * 0.03;
  color += weave;

  gl_FragColor = vec4(color, 1.0);
}
