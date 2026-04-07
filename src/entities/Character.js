/**
 * Odysseus / Greek Warrior Character
 *
 * Procedural heroic warrior with slightly exaggerated proportions.
 * Athletic build, wavy dark hair, short beard, Greek tunic,
 * leather armor, sandals, sword at waist, optional shield and cloak.
 *
 * Limbs use pivot-group hierarchy so rotations swing from joints
 * (hips/shoulders/knees/elbows) instead of spinning around mesh centres.
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
    const skin = ShaderLib.createPBRMaterial({ color: skinColor, roughness: 0.65, metallic: 0.0, sunPosition });
    const tunic = ShaderLib.createPBRMaterial({ color: 0xE8DCC4, roughness: 0.82, metallic: 0.0, sunPosition }); // sun-bleached linen
    const leather = ShaderLib.createPBRMaterial({ color: 0x8B6B4A, roughness: 0.75, metallic: 0.05, sunPosition }); // warm tan leather
    const metal = ShaderLib.createPBRMaterial({ color: helmetColor, roughness: 0.3, metallic: 0.7, sunPosition });
    const hair = ShaderLib.createPBRMaterial({ color: 0x3A2A18, roughness: 0.85, metallic: 0.0, sunPosition }); // warm dark brown
    const darkLeather = ShaderLib.createPBRMaterial({ color: 0x6B5035, roughness: 0.8, metallic: 0.02, sunPosition });

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

    // ── Arms — pivot-group hierarchy (shoulder → elbow) ──
    const upperArmGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.45, 6);
    const forearmGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.45, 6);

    for (let side = -1; side <= 1; side += 2) {
      const prefix = side === -1 ? 'left' : 'right';

      // Shoulder pivot — positioned at the shoulder joint
      const armPivot = new THREE.Group();
      armPivot.position.set(side * 0.52, 1.95, 0);
      this.group.add(armPivot);

      // Upper arm mesh — hangs down from shoulder pivot
      const upperArm = new THREE.Mesh(
        side === -1 ? upperArmGeo : upperArmGeo.clone(),
        skin
      );
      upperArm.position.y = -0.22;
      upperArm.castShadow = true;
      armPivot.add(upperArm);

      // Elbow / forearm pivot — at bottom of upper arm
      const forearmPivot = new THREE.Group();
      forearmPivot.position.y = -0.45;
      armPivot.add(forearmPivot);

      // Forearm mesh — hangs down from elbow pivot
      const forearm = new THREE.Mesh(
        side === -1 ? forearmGeo : forearmGeo.clone(),
        skin
      );
      forearm.position.y = -0.22;
      forearm.castShadow = true;
      forearmPivot.add(forearm);

      // Leather wrist guard
      const guardGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.12, 6);
      const guard = new THREE.Mesh(guardGeo, leather);
      guard.position.y = -0.37;
      forearmPivot.add(guard);

      // Hand
      const handGeo = new THREE.SphereGeometry(0.06, 5, 5);
      const hand = new THREE.Mesh(handGeo, skin);
      hand.position.y = -0.45;
      forearmPivot.add(hand);

      this[prefix + 'ArmPivot'] = armPivot;
      this[prefix + 'ForearmPivot'] = forearmPivot;
    }

    // ── Legs — pivot-group hierarchy (hip → knee) ──
    const thighGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.5, 6);
    const calfGeo = new THREE.CylinderGeometry(0.07, 0.1, 0.5, 6);
    const soleMat = ShaderLib.createPBRMaterial({ color: 0x6B4C30, roughness: 0.9, metallic: 0.0, sunPosition });

    for (let side = -1; side <= 1; side += 2) {
      const prefix = side === -1 ? 'left' : 'right';

      // Hip pivot — positioned at the hip joint
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 0.2, 0.75, 0);
      this.group.add(legPivot);

      // Thigh mesh — hangs down from hip pivot
      const thigh = new THREE.Mesh(
        side === -1 ? thighGeo : thighGeo.clone(),
        skin
      );
      thigh.position.y = -0.25;
      thigh.castShadow = true;
      legPivot.add(thigh);

      // Knee / calf pivot — at bottom of thigh
      const calfPivot = new THREE.Group();
      calfPivot.position.y = -0.5;
      legPivot.add(calfPivot);

      // Calf mesh — hangs down from knee pivot
      const calf = new THREE.Mesh(
        side === -1 ? calfGeo : calfGeo.clone(),
        skin
      );
      calf.position.y = -0.25;
      calfPivot.add(calf);

      // Leather shin guard (greave)
      const greaveGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.25, 6, 1, false, 0, Math.PI);
      const greave = new THREE.Mesh(greaveGeo, leather);
      greave.position.set(0, -0.2, 0.03);
      calfPivot.add(greave);

      // Sandal sole
      const soleGeo = new THREE.BoxGeometry(0.14, 0.04, 0.28);
      const sole = new THREE.Mesh(soleGeo, soleMat);
      sole.position.y = -0.48;
      calfPivot.add(sole);

      // Toe strap
      const toeStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.03, 0.03),
        leather
      );
      toeStrap.position.set(0, -0.44, 0.08);
      calfPivot.add(toeStrap);

      // Ankle strap
      const ankleStrap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.03, 6),
        leather
      );
      ankleStrap.position.set(0, -0.4, 0);
      calfPivot.add(ankleStrap);

      this[prefix + 'LegPivot'] = legPivot;
      this[prefix + 'CalfPivot'] = calfPivot;
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

    // Smooth blend between walking and idle (0 = idle, 1 = walking)
    const targetBlend = this.isWalking ? 1 : 0;
    if (this._walkBlend === undefined) this._walkBlend = 0;
    this._walkBlend += (targetBlend - this._walkBlend) * Math.min(1, dt * 8);

    const wb = this._walkBlend;
    const walkSpeed = 5.5;
    const t = this.animTime * walkSpeed;

    // ── Leg swing from hip pivots ──
    const legSwingL = Math.sin(t) * 0.6 * wb;
    const legSwingR = Math.sin(t + Math.PI) * 0.6 * wb;

    // Calf bend — knee bends forward on the backstroke (when leg is behind)
    // When legSwing < 0 the leg is behind the body → knee bends (positive x rotation)
    const calfBendL = Math.max(0, -Math.sin(t)) * 0.5 * wb;
    const calfBendR = Math.max(0, -Math.sin(t + Math.PI)) * 0.5 * wb;

    // ── Arm swing from shoulder pivots (opposite to legs) ──
    const armSwingL = Math.sin(t + Math.PI) * 0.45 * wb;
    const armSwingR = Math.sin(t) * 0.45 * wb;

    // Forearm — slight natural bend at elbow during swing
    const forearmBendL = Math.max(0, -Math.sin(t + Math.PI)) * 0.3 * wb;
    const forearmBendR = Math.max(0, -Math.sin(t)) * 0.3 * wb;

    // Bob — double-frequency for natural two-step bounce
    const bob = Math.abs(Math.sin(t)) * 0.06 * wb;

    // Idle breathing
    const breath = Math.sin(this.animTime * 1.5) * 0.015 * (1 - wb);

    // Idle weight shift (subtle sway)
    const idleSway = Math.sin(this.animTime * 0.7) * 0.01 * (1 - wb);

    // ── Apply leg pivots ──
    this.leftLegPivot.rotation.x = legSwingL;
    this.rightLegPivot.rotation.x = legSwingR;
    this.leftCalfPivot.rotation.x = calfBendL;
    this.rightCalfPivot.rotation.x = calfBendR;

    // ── Apply arm pivots ──
    this.leftArmPivot.rotation.x = armSwingL;
    this.rightArmPivot.rotation.x = armSwingR;
    this.leftForearmPivot.rotation.x = forearmBendL;
    this.rightForearmPivot.rotation.x = forearmBendR;

    // ── Torso + head bob ──
    this.torso.position.y = 1.55 + bob + breath;
    this.head.position.y = 2.28 + bob + breath;

    // Torso twist while walking, idle sway while standing
    this.torso.rotation.y = Math.sin(t) * 0.04 * wb + idleSway;

    // Subtle head look — slight tilt toward movement
    this.head.rotation.z = Math.sin(t * 0.5) * 0.02 * wb;
    this.head.rotation.x = -0.05 * wb; // slight forward lean when moving

    // Cape physics — wind + movement-reactive
    if (this.cape) {
      const capeGeo = this.cape.geometry;
      const pos = capeGeo.attributes.position;
      const windStrength = 0.08 + wb * 0.06;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const distFromTop = 1.3 - y;
        const d = Math.max(distFromTop, 0);
        const wave = Math.sin(time * 2.5 + distFromTop * 2.5) * windStrength;
        const flutter = Math.sin(time * 6 + distFromTop * 4 + i * 0.4) * 0.015;
        const moveDrag = wb * d * 0.04; // cape pulls back more when moving
        pos.setZ(i, -0.32 + (wave + flutter + moveDrag) * d);
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
