/**
 * Odysseus / Greek Warrior Character
 *
 * Procedural heroic warrior with slightly exaggerated proportions.
 * Athletic build, wavy dark hair, short beard, Greek tunic,
 * leather armor, sandals, sword at waist, optional shield and cloak.
 */

import * as THREE from 'three';
import { ShaderLib } from '../shaders/ShaderLib.js';

export class Character {
  constructor(options = {}) {
    const {
      sunPosition = new THREE.Vector3(100, 40, -80),
      skinColor = 0xD4A574,
      armorColor = 0x8B7355,
      helmetColor = 0xB8860B,
      capeColor = 0x8B0000,
      hasHelmet = true,
      hasCape = true,
      hasShield = false,
      hasSword = true,
      scale = 1,
    } = options;

    this.group = new THREE.Group();
    this.animTime = 0;
    this.isWalking = false;

    // ── Materials ──
    const skin = ShaderLib.createPBRMaterial({ color: skinColor, roughness: 0.7, metallic: 0.0, sunPosition });
    const tunic = ShaderLib.createPBRMaterial({ color: 0xC8B898, roughness: 0.85, metallic: 0.0, sunPosition }); // beige tunic
    const leather = ShaderLib.createPBRMaterial({ color: 0x5C4033, roughness: 0.8, metallic: 0.05, sunPosition }); // brown leather
    const metal = ShaderLib.createPBRMaterial({ color: helmetColor, roughness: 0.3, metallic: 0.7, sunPosition });
    const hair = ShaderLib.createPBRMaterial({ color: 0x2A1A0A, roughness: 0.9, metallic: 0.0, sunPosition }); // dark brown hair
    const darkLeather = ShaderLib.createPBRMaterial({ color: 0x3B2510, roughness: 0.85, metallic: 0.02, sunPosition });

    // ── Torso — broad, athletic chest ──
    const torsoGeo = new THREE.BoxGeometry(0.85, 0.9, 0.5);
    this.torso = new THREE.Mesh(torsoGeo, tunic);
    this.torso.position.y = 1.55;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Chest/shoulder broadening — slight trapezoid effect
    const shoulderGeo = new THREE.BoxGeometry(0.95, 0.2, 0.48);
    const shoulders = new THREE.Mesh(shoulderGeo, tunic);
    shoulders.position.y = 1.95;
    this.group.add(shoulders);

    // Leather chest strap (diagonal)
    const strapGeo = new THREE.BoxGeometry(0.12, 1.0, 0.52);
    const strap = new THREE.Mesh(strapGeo, leather);
    strap.position.set(0.15, 1.55, 0);
    strap.rotation.z = 0.3;
    this.group.add(strap);

    // Belt
    const beltGeo = new THREE.BoxGeometry(0.9, 0.1, 0.52);
    const belt = new THREE.Mesh(beltGeo, leather);
    belt.position.y = 1.05;
    this.group.add(belt);

    // Belt buckle
    const buckleGeo = new THREE.BoxGeometry(0.12, 0.08, 0.06);
    const buckle = new THREE.Mesh(buckleGeo, metal);
    buckle.position.set(0, 1.05, 0.28);
    this.group.add(buckle);

    // ── Tunic skirt — below belt ──
    const skirtGeo = new THREE.CylinderGeometry(0.3, 0.48, 0.55, 8);
    const skirt = new THREE.Mesh(skirtGeo, tunic);
    skirt.position.y = 0.72;
    this.group.add(skirt);

    // Tunic skirt strips (pteruges — leather flaps)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const flapGeo = new THREE.BoxGeometry(0.12, 0.2, 0.03);
      const flap = new THREE.Mesh(flapGeo, leather);
      flap.position.set(
        Math.sin(angle) * 0.42,
        0.42,
        Math.cos(angle) * 0.42
      );
      flap.rotation.y = -angle;
      this.group.add(flap);
    }

    // ── Head — slightly larger for heroic proportion ──
    const headGeo = new THREE.SphereGeometry(0.24, 10, 10);
    headGeo.scale(1.0, 1.1, 0.95); // taller, slightly narrower
    this.head = new THREE.Mesh(headGeo, skin);
    this.head.position.y = 2.28;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Strong jaw — box that extends chin
    const jawGeo = new THREE.BoxGeometry(0.2, 0.1, 0.18);
    const jaw = new THREE.Mesh(jawGeo, skin);
    jaw.position.set(0, 2.08, 0.08);
    this.group.add(jaw);

    // Short beard — dark hair material covering jaw
    const beardGeo = new THREE.SphereGeometry(0.16, 6, 4, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.4);
    const beard = new THREE.Mesh(beardGeo, hair);
    beard.position.set(0, 2.1, 0.06);
    beard.scale.set(1.2, 1.0, 0.8);
    this.group.add(beard);

    // Wavy dark hair — layered hemispheres for volume
    const hairBase = new THREE.SphereGeometry(0.26, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const hairMesh = new THREE.Mesh(hairBase, hair);
    hairMesh.position.y = 2.32;
    this.group.add(hairMesh);

    // Hair sides — extend down to ears
    for (let side = -1; side <= 1; side += 2) {
      const sideHair = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.2, 0.18),
        hair
      );
      sideHair.position.set(side * 0.22, 2.2, -0.02);
      this.group.add(sideHair);
    }

    // Hair back — wavy locks extending down neck
    const backHair = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.25, 0.08),
      hair
    );
    backHair.position.set(0, 2.12, -0.18);
    this.group.add(backHair);

    // Eyes — simple dots
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeo = new THREE.SphereGeometry(0.03, 4, 4);
      const eyeMat = ShaderLib.createPBRMaterial({ color: 0x2A3A1A, roughness: 0.3, metallic: 0.0, sunPosition });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.08, 2.3, 0.2);
      this.group.add(eye);
    }

    // ── Helmet (optional — Corinthian style) ──
    if (hasHelmet) {
      const helmetGeo = new THREE.SphereGeometry(0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const helmet = new THREE.Mesh(helmetGeo, metal);
      helmet.position.y = 2.34;
      this.group.add(helmet);

      // Helmet nose guard
      const noseGuard = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.18, 0.06),
        metal
      );
      noseGuard.position.set(0, 2.24, 0.22);
      this.group.add(noseGuard);

      // Crest — red horsehair plume
      const crestMat = ShaderLib.createPBRMaterial({ color: 0xCC0000, roughness: 0.6, metallic: 0.1, sunPosition });
      const crestBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.08, 0.35),
        metal
      );
      crestBase.position.set(0, 2.58, -0.02);
      this.group.add(crestBase);

      // Plume feathers — series of elongated shapes
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const plumeGeo = new THREE.BoxGeometry(0.05, 0.12 - t * 0.03, 0.08);
        const plume = new THREE.Mesh(plumeGeo, crestMat);
        plume.position.set(0, 2.62, -0.15 + t * 0.35);
        this.group.add(plume);
      }
    }

    // ── Arms — muscular upper + forearm ──
    // Upper arms
    const upperArmGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.45, 6);
    this.leftUpperArm = new THREE.Mesh(upperArmGeo, skin);
    this.leftUpperArm.position.set(-0.52, 1.75, 0);
    this.leftUpperArm.castShadow = true;
    this.group.add(this.leftUpperArm);

    this.rightUpperArm = new THREE.Mesh(upperArmGeo.clone(), skin);
    this.rightUpperArm.position.set(0.52, 1.75, 0);
    this.rightUpperArm.castShadow = true;
    this.group.add(this.rightUpperArm);

    // Forearms
    const forearmGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.45, 6);
    this.leftArm = new THREE.Mesh(forearmGeo, skin);
    this.leftArm.position.set(-0.52, 1.3, 0);
    this.leftArm.castShadow = true;
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(forearmGeo.clone(), skin);
    this.rightArm.position.set(0.52, 1.3, 0);
    this.rightArm.castShadow = true;
    this.group.add(this.rightArm);

    // Leather wrist guards
    for (let side = -1; side <= 1; side += 2) {
      const guardGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.12, 6);
      const guard = new THREE.Mesh(guardGeo, leather);
      guard.position.set(side * 0.52, 1.15, 0);
      this.group.add(guard);
    }

    // Hands — simple spheres
    for (let side = -1; side <= 1; side += 2) {
      const handGeo = new THREE.SphereGeometry(0.06, 5, 5);
      const hand = new THREE.Mesh(handGeo, skin);
      hand.position.set(side * 0.52, 1.05, 0);
      this.group.add(hand);
    }

    // ── Legs — muscular thigh + calf ──
    const thighGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.5, 6);
    this.leftLeg = new THREE.Mesh(thighGeo, skin);
    this.leftLeg.position.set(-0.2, 0.5, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(thighGeo.clone(), skin);
    this.rightLeg.position.set(0.2, 0.5, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);

    // Calves (slightly thinner)
    const calfGeo = new THREE.CylinderGeometry(0.07, 0.1, 0.5, 6);
    this.leftCalf = new THREE.Mesh(calfGeo, skin);
    this.leftCalf.position.set(-0.2, 0.05, 0);
    this.group.add(this.leftCalf);

    this.rightCalf = new THREE.Mesh(calfGeo.clone(), skin);
    this.rightCalf.position.set(0.2, 0.05, 0);
    this.group.add(this.rightCalf);

    // Leather shin guards (greaves)
    for (let side = -1; side <= 1; side += 2) {
      const greaveGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.25, 6, 1, false, 0, Math.PI);
      const greave = new THREE.Mesh(greaveGeo, leather);
      greave.position.set(side * 0.2, 0.1, 0.03);
      this.group.add(greave);
    }

    // ── Sandals — Greek style with straps ──
    const soleMat = ShaderLib.createPBRMaterial({ color: 0x6B4C30, roughness: 0.9, metallic: 0.0, sunPosition });
    for (let side = -1; side <= 1; side += 2) {
      // Sole
      const soleGeo = new THREE.BoxGeometry(0.14, 0.04, 0.28);
      const sole = new THREE.Mesh(soleGeo, soleMat);
      sole.position.set(side * 0.2, -0.18, 0);
      this.group.add(sole);

      // Toe strap
      const toeStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.03, 0.03),
        leather
      );
      toeStrap.position.set(side * 0.2, -0.14, 0.08);
      this.group.add(toeStrap);

      // Ankle strap
      const ankleStrap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.03, 6),
        leather
      );
      ankleStrap.position.set(side * 0.2, -0.1, 0);
      this.group.add(ankleStrap);
    }

    // ── Sword at waist ──
    if (hasSword) {
      const swordGroup = new THREE.Group();

      // Scabbard
      const scabbardGeo = new THREE.BoxGeometry(0.05, 0.55, 0.03);
      const scabbard = new THREE.Mesh(scabbardGeo, darkLeather);
      scabbard.position.y = -0.05;
      swordGroup.add(scabbard);

      // Blade tip extending from scabbard
      const bladeGeo = new THREE.BoxGeometry(0.035, 0.15, 0.01);
      const blade = new THREE.Mesh(bladeGeo, metal);
      blade.position.y = 0.3;
      swordGroup.add(blade);

      // Hilt crossguard
      const hiltGeo = new THREE.BoxGeometry(0.16, 0.04, 0.04);
      const hilt = new THREE.Mesh(hiltGeo, metal);
      hilt.position.y = 0.2;
      swordGroup.add(hilt);

      // Grip — leather wrapped
      const gripGeo = new THREE.CylinderGeometry(0.025, 0.028, 0.12, 6);
      const grip = new THREE.Mesh(gripGeo, darkLeather);
      grip.position.y = 0.35;
      swordGroup.add(grip);

      // Pommel
      const pommelGeo = new THREE.SphereGeometry(0.035, 5, 5);
      const pommel = new THREE.Mesh(pommelGeo, metal);
      pommel.position.y = 0.42;
      swordGroup.add(pommel);

      swordGroup.position.set(0.48, 0.85, 0.12);
      swordGroup.rotation.z = -0.15;
      this.group.add(swordGroup);
    }

    // ── Shield on back (optional) ──
    if (hasShield) {
      const shieldGroup = new THREE.Group();

      // Round aspis shield
      const shieldGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16);
      shieldGeo.rotateX(Math.PI / 2);
      const shieldFace = ShaderLib.createPBRMaterial({ color: 0xB8860B, roughness: 0.4, metallic: 0.5, sunPosition });
      const shield = new THREE.Mesh(shieldGeo, shieldFace);
      shieldGroup.add(shield);

      // Shield rim
      const rimGeo = new THREE.TorusGeometry(0.38, 0.03, 6, 16);
      const rim = new THREE.Mesh(rimGeo, metal);
      shieldGroup.add(rim);

      // Shield boss (center bump)
      const bossGeo = new THREE.SphereGeometry(0.08, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      const boss = new THREE.Mesh(bossGeo, metal);
      boss.position.z = 0.02;
      boss.rotation.x = -Math.PI / 2;
      shieldGroup.add(boss);

      shieldGroup.position.set(0, 1.5, -0.35);
      shieldGroup.rotation.x = 0.15;
      this.group.add(shieldGroup);
    }

    // ── Cloak (optional) ──
    if (hasCape) {
      const capeGeo = new THREE.PlaneGeometry(0.8, 1.4, 5, 10);
      const capeMat = ShaderLib.createPBRMaterial({ color: capeColor, roughness: 0.8, metallic: 0.0, sunPosition });
      capeMat.side = THREE.DoubleSide;
      this.cape = new THREE.Mesh(capeGeo, capeMat);
      this.cape.position.set(0, 1.3, -0.32);
      this.group.add(this.cape);

      // Cloak clasp at shoulder
      const claspGeo = new THREE.SphereGeometry(0.04, 5, 5);
      const clasp = new THREE.Mesh(claspGeo, metal);
      clasp.position.set(0.2, 1.95, -0.2);
      this.group.add(clasp);
    }

    this.group.scale.setScalar(scale);
  }

  update(dt, time) {
    this.animTime += dt;

    if (this.isWalking) {
      const walkSpeed = 6;
      const t = this.animTime * walkSpeed;

      // Legs — thigh and calf swing together
      this.leftLeg.rotation.x = Math.sin(t) * 0.4;
      this.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.4;
      if (this.leftCalf) this.leftCalf.rotation.x = Math.sin(t) * 0.25;
      if (this.rightCalf) this.rightCalf.rotation.x = Math.sin(t + Math.PI) * 0.25;

      // Arms — upper and forearm swing opposite to legs
      if (this.leftUpperArm) this.leftUpperArm.rotation.x = Math.sin(t + Math.PI) * 0.2;
      if (this.rightUpperArm) this.rightUpperArm.rotation.x = Math.sin(t) * 0.2;
      this.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.3;
      this.rightArm.rotation.x = Math.sin(t) * 0.3;

      // Torso bob
      const bob = Math.abs(Math.sin(t * 2)) * 0.04;
      this.torso.position.y = 1.55 + bob;
      this.head.position.y = 2.28 + bob;

      // Slight torso twist
      this.torso.rotation.y = Math.sin(t) * 0.04;
    } else {
      // Idle breathing
      const breath = Math.sin(this.animTime * 1.5) * 0.015;
      this.torso.position.y = 1.55 + breath;
      this.head.position.y = 2.28 + breath;
      this.torso.rotation.y = 0;

      // Reset limbs
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      if (this.leftUpperArm) this.leftUpperArm.rotation.x = 0;
      if (this.rightUpperArm) this.rightUpperArm.rotation.x = 0;
      if (this.leftCalf) this.leftCalf.rotation.x = 0;
      if (this.rightCalf) this.rightCalf.rotation.x = 0;
    }

    // Cape physics — wind + movement
    if (this.cape) {
      const capeGeo = this.cape.geometry;
      const pos = capeGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const distFromTop = 1.3 - y;
        const wave = Math.sin(time * 2 + distFromTop * 3) * 0.1;
        const flutter = Math.sin(time * 5 + distFromTop * 5 + i * 0.3) * 0.02;
        pos.setZ(i, -0.32 + (wave + flutter) * Math.max(distFromTop, 0));
      }
      pos.needsUpdate = true;
    }
  }

  setWalking(walking) {
    this.isWalking = walking;
  }

  addTo(scene) {
    scene.add(this.group);
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  setRotation(y) {
    this.group.rotation.y = y;
  }
}
