import * as THREE from 'three';
import { ShaderLib } from '../shaders/ShaderLib.js';
import { OCEAN } from '../utils/constants.js';

export class Ocean {
  constructor(sunPosition) {
    const geo = new THREE.PlaneGeometry(OCEAN.size, OCEAN.size, OCEAN.segments, OCEAN.segments);
    geo.rotateX(-Math.PI / 2);

    this.material = ShaderLib.createOceanMaterial(sunPosition);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.receiveShadow = true;
  }

  update(dt, time, cameraPosition) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uCameraPos.value.copy(cameraPosition);
  }

  addTo(scene) {
    scene.add(this.mesh);
  }

  getWaveHeight(x, z, time) {
    const waveHeight = this.material.uniforms.uWaveHeight.value;
    let y = 0;

    const waves = [
      { s: 0.15, wl: 28, dx: 1.0, dz: 0.3, ts: 0.8 },
      { s: 0.12, wl: 18, dx: 0.3, dz: 1.0, ts: 0.6 },
      { s: 0.08, wl: 10, dx: -0.5, dz: 0.7, ts: 1.1 },
      { s: 0.06, wl: 6, dx: 0.8, dz: -0.4, ts: 1.4 },
      { s: 0.04, wl: 3.5, dx: -0.3, dz: -0.8, ts: 1.8 },
    ];

    for (const w of waves) {
      const k = (2 * Math.PI) / w.wl;
      const c = Math.sqrt(9.8 / k);
      const len = Math.sqrt(w.dx * w.dx + w.dz * w.dz);
      const dx = w.dx / len, dz = w.dz / len;
      const f = k * (dx * x + dz * z - c * time * w.ts);
      y += (w.s / k) * Math.sin(f);
    }

    return y * waveHeight;
  }
}
