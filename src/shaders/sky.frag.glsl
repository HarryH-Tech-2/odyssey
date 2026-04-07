uniform vec3 uSunPosition;
uniform float uTime;

varying vec3 vWorldPos;

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
  vec3 dir = normalize(vWorldPos);
  float y = dir.y;
  vec3 sunDir = normalize(uSunPosition);

  // Sky gradient
  vec3 zenith = vec3(0.18, 0.35, 0.72);
  vec3 horizon = vec3(0.55, 0.75, 0.92);
  vec3 horizonWarm = vec3(0.85, 0.75, 0.6);

  vec3 sky = mix(horizon, zenith, pow(max(y, 0.0), 0.6));
  float horizonFactor = exp(-abs(y) * 8.0);
  sky = mix(sky, horizonWarm, horizonFactor * 0.4);

  // Procedural clouds
  vec2 cloudUV = dir.xz / (dir.y + 0.1) * 2.0;
  float clouds = fbm(cloudUV + uTime * 0.01);
  clouds = smoothstep(0.4, 0.7, clouds);
  vec3 cloudColor = mix(vec3(0.9, 0.9, 0.95), vec3(1.0, 0.95, 0.85), pow(max(dot(dir, sunDir), 0.0), 2.0));
  sky = mix(sky, cloudColor, clouds * 0.5 * smoothstep(0.0, 0.3, y));

  // Sun
  float sunAngle = max(dot(dir, sunDir), 0.0);
  vec3 sunColor = vec3(1.0, 0.9, 0.7);
  sky += sunColor * pow(sunAngle, 128.0) * 2.5;
  sky += sunColor * pow(sunAngle, 8.0) * 0.3;

  // Below horizon fade
  if (y < 0.0) {
    vec3 underHorizon = vec3(0.08, 0.15, 0.25);
    sky = mix(horizon, underHorizon, min(-y * 5.0, 1.0));
  }

  gl_FragColor = vec4(sky, 1.0);
}
