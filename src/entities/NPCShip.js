import * as THREE from 'three';
import { Ship } from './Ship.js';
import { Character } from './Character.js';

export class NPCShip {
  constructor(sunPosition, options = {}) {
    const {
      waypoints = [],
      speed = 8,
      crewCount = 4,
    } = options;

    this.ship = new Ship(sunPosition, true);
    this.waypoints = waypoints;
    this.currentWaypoint = 0;
    this.cruiseSpeed = speed;
    this.ship.speed = speed;

    // Add NPC crew
    this.crew = [];
    for (let i = 0; i < crewCount; i++) {
      const c = new Character({
        sunPosition,
        armorColor: 0x6A5A4A,
        skinColor: 0xC49A6C,
        hasHelmet: i === 0,
        hasCape: false,
        hasSword: i === 0,
        scale: 0.65,
      });
      c.setPosition(-2 + i * 1.4, 3, (i % 2 === 0 ? 0.4 : -0.4));
      this.ship.group.add(c.group);
      this.crew.push(c);
    }
  }

  update(dt, time, ocean) {
    // Sail toward current waypoint
    if (this.waypoints.length > 0) {
      const wp = this.waypoints[this.currentWaypoint];
      const pos = this.ship.group.position;
      const dx = wp.x - pos.x;
      const dz = wp.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Target heading
      const targetHeading = Math.atan2(dx, dz);

      // Smooth turn toward waypoint
      let headingDiff = targetHeading - this.ship.heading;
      while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
      while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
      this.ship.heading += headingDiff * dt * 0.8;

      // Move forward
      this.ship.targetSpeed = this.cruiseSpeed;

      // Advance to next waypoint when close
      if (dist < 20) {
        this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
      }
    }

    this.ship.update(dt, time, ocean, null);

    // Update crew animations
    for (const c of this.crew) {
      c.update(dt, time);
    }
  }

  addTo(scene) {
    this.ship.addTo(scene);
  }

  getPosition() {
    return this.ship.getPosition();
  }
}
