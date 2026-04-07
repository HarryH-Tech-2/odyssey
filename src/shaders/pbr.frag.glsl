uniform vec3 uColor;
uniform float uRoughness;
uniform float uMetallic;
uniform vec3 uSunPosition;
uniform vec3 uSunColor;
uniform vec3 uAmbientColor;
uniform vec3 uCameraPos;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;

#define PI 3.14159265

float distributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
  return a2 / (PI * denom * denom);
}

float geometrySchlickGGX(float NdotV, float roughness) {
  float r = roughness + 1.0;
  float k = (r * r) / 8.0;
  return NdotV / (NdotV * (1.0 - k) + k);
}

float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  return geometrySchlickGGX(max(dot(N, V), 0.0), roughness) *
         geometrySchlickGGX(max(dot(N, L), 0.0), roughness);
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 L = normalize(uSunPosition - vWorldPos);
  vec3 H = normalize(V + L);

  vec3 F0 = mix(vec3(0.04), uColor, uMetallic);

  float D = distributionGGX(N, H, uRoughness);
  float G = geometrySmith(N, V, L, uRoughness);
  vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);

  vec3 numerator = D * G * F;
  float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
  vec3 specular = numerator / denominator;

  vec3 kD = (vec3(1.0) - F) * (1.0 - uMetallic);
  float NdotL = max(dot(N, L), 0.0);

  vec3 diffuse = kD * uColor / PI;
  vec3 radiance = uSunColor * 3.0;

  vec3 color = (diffuse + specular) * radiance * NdotL;
  color += uAmbientColor * uColor * 0.3;

  // Rim light
  float rim = 1.0 - max(dot(V, N), 0.0);
  color += vec3(0.4, 0.5, 0.6) * pow(rim, 4.0) * 0.15;

  gl_FragColor = vec4(color, 1.0);
}
