import * as THREE from 'three';
import { ShaderLib } from '../shaders/ShaderLib.js';

export class Sky {
  constructor(sunPosition) {
    const geo = new THREE.SphereGeometry(800, 32, 32);
    this.material = ShaderLib.createSkyMaterial(sunPosition);
    this.mesh = new THREE.Mesh(geo, this.material);
  }

  update(dt, time) {
    this.material.uniforms.uTime.value = time;
  }

  addTo(scene) {
    scene.add(this.mesh);
  }
}
