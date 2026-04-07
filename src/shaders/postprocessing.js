import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSaturation: { value: 1.15 },
    uContrast: { value: 1.05 },
    uBrightness: { value: 0.02 },
    uVignetteStrength: { value: 0.3 },
    uWarmth: { value: 0.08 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uBrightness;
    uniform float uVignetteStrength;
    uniform float uWarmth;
    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 color = tex.rgb;

      // Warmth shift
      color.r += uWarmth;
      color.b -= uWarmth * 0.5;

      // Saturation
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(gray), color, uSaturation);

      // Contrast
      color = (color - 0.5) * uContrast + 0.5;

      // Brightness
      color += uBrightness;

      // Vignette
      vec2 vig = vUv * (1.0 - vUv);
      float vigFactor = vig.x * vig.y * 15.0;
      vigFactor = pow(vigFactor, uVignetteStrength);
      color *= vigFactor;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export function createPostProcessing(renderer, scene, camera) {
  const size = new THREE.Vector2();
  renderer.getSize(size);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    0.4,
    0.6,
    0.85
  );
  composer.addPass(bloomPass);

  const colorGradePass = new ShaderPass(ColorGradeShader);
  composer.addPass(colorGradePass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return {
    composer,
    bloomPass,
    colorGradePass,
    resize(width, height) {
      composer.setSize(width, height);
    },
    render() {
      composer.render();
    },
  };
}
