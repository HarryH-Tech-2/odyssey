import * as THREE from 'three';

import oceanVert from './ocean.vert.glsl?raw';
import oceanFrag from './ocean.frag.glsl?raw';
import skyVert from './sky.vert.glsl?raw';
import skyFrag from './sky.frag.glsl?raw';
import pbrVert from './pbr.vert.glsl?raw';
import pbrFrag from './pbr.frag.glsl?raw';
import fireVert from './fire.vert.glsl?raw';
import fireFrag from './fire.frag.glsl?raw';
import sailVert from './sail.vert.glsl?raw';
import sailFrag from './sail.frag.glsl?raw';

export class ShaderLib {
  static createOceanMaterial(sunPosition) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWaveHeight: { value: 1.0 },
        uSunPosition: { value: sunPosition.clone() },
        uCameraPos: { value: new THREE.Vector3() },
        uDeepColor: { value: new THREE.Color(0x0a2a4a) },
        uShallowColor: { value: new THREE.Color(0x1a8a7a) },
        uFoamColor: { value: new THREE.Color(0xe8eef2) },
      },
      vertexShader: oceanVert,
      fragmentShader: oceanFrag,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  static createSkyMaterial(sunPosition) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSunPosition: { value: sunPosition.clone() },
        uTime: { value: 0 },
      },
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
    });
  }

  static createPBRMaterial({ color = 0x888888, roughness = 0.5, metallic = 0.0, sunPosition, sunColor, ambientColor } = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uRoughness: { value: roughness },
        uMetallic: { value: metallic },
        uSunPosition: { value: sunPosition ? sunPosition.clone() : new THREE.Vector3(100, 40, -80) },
        uSunColor: { value: sunColor ? sunColor.clone() : new THREE.Color(0xfff0dd) },
        uAmbientColor: { value: ambientColor ? ambientColor.clone() : new THREE.Color(0x4466aa) },
        uCameraPos: { value: new THREE.Vector3() },
      },
      vertexShader: pbrVert,
      fragmentShader: pbrFrag,
    });
  }

  static createFireMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1.5 },
      },
      vertexShader: fireVert,
      fragmentShader: fireFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }

  static createSailMaterial(sunPosition) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWindStrength: { value: 1.0 },
        uColor: { value: new THREE.Color(0xe8dcc8) },
        uSunPosition: { value: sunPosition ? sunPosition.clone() : new THREE.Vector3(100, 40, -80) },
      },
      vertexShader: sailVert,
      fragmentShader: sailFrag,
      side: THREE.DoubleSide,
    });
  }
}
