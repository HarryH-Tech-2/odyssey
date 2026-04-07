/**
 * Atmospheric particle effects — seabirds, sea spray, mist
 */

import * as THREE from 'three';

/** Flock of seabirds circling near the player */
export class SeabirdFlock {
  constructor(count = 12) {
    this.count = count;
    const geo = new THREE.BufferGeometry();

    // Each bird is a simple triangle/chevron shape using points
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = 20 + Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;

      velocities.push({
        speed: 5 + Math.random() * 8,
        radius: 20 + Math.random() * 40,
        height: 20 + Math.random() * 25,
        phase: Math.random() * Math.PI * 2,
        wobble: Math.random() * 2,
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x222222,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
    });

    this.points = new THREE.Points(geo, mat);
    this.velocities = velocities;
    this.center = new THREE.Vector3();
  }

  update(time, playerPosition) {
    this.center.lerp(playerPosition, 0.02);
    const pos = this.points.geometry.attributes.position;

    for (let i = 0; i < this.count; i++) {
      const v = this.velocities[i];
      const t = time * 0.3 * (v.speed / 10) + v.phase;

      // Circular orbit around center with wobble
      pos.setX(i, this.center.x + Math.cos(t) * v.radius + Math.sin(t * v.wobble) * 5);
      pos.setY(i, v.height + Math.sin(t * 2) * 3);
      pos.setZ(i, this.center.z + Math.sin(t) * v.radius + Math.cos(t * v.wobble) * 5);
    }

    pos.needsUpdate = true;
  }

  addTo(scene) {
    scene.add(this.points);
  }
}

/** Sea spray particles near the ship */
export class SeaSpray {
  constructor(count = 50) {
    this.count = count;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const alphas = new Float32Array(count);

    this.lives = new Float32Array(count);
    this.velocitiesY = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this._resetParticle(i, positions, alphas);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    this.points = new THREE.Points(geo, mat);
    this.shipPosition = new THREE.Vector3();
    this.shipSpeed = 0;
  }

  _resetParticle(i, positions, alphas) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = Math.random() * 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    this.lives[i] = Math.random();
    this.velocitiesY[i] = 1 + Math.random() * 2;
  }

  update(dt, shipPosition, shipSpeed) {
    this.shipPosition.copy(shipPosition);
    this.shipSpeed = shipSpeed;

    const pos = this.points.geometry.attributes.position;
    const sprayIntensity = Math.min(Math.abs(shipSpeed) / 15, 1);

    this.points.position.copy(shipPosition);
    this.points.position.y += 0.5;

    // Only show spray when moving
    this.points.material.opacity = sprayIntensity * 0.4;

    for (let i = 0; i < this.count; i++) {
      this.lives[i] -= dt * 1.5;

      if (this.lives[i] <= 0) {
        // Reset particle
        pos.setX(i, (Math.random() - 0.5) * 12);
        pos.setY(i, 0);
        pos.setZ(i, (Math.random() - 0.5) * 4);
        this.lives[i] = 0.5 + Math.random();
        this.velocitiesY[i] = 1 + Math.random() * 2;
      } else {
        // Animate upward and outward
        pos.setY(i, pos.getY(i) + this.velocitiesY[i] * dt);
        pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * dt * 2);
        this.velocitiesY[i] -= dt * 3; // gravity
      }
    }

    pos.needsUpdate = true;
  }

  addTo(scene) {
    scene.add(this.points);
  }
}
