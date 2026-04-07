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

    const skinMat = ShaderLib.createPBRMaterial({ color: skinColor, roughness: 0.7, metallic: 0.0, sunPosition });
    const armorMat = ShaderLib.createPBRMaterial({ color: armorColor, roughness: 0.5, metallic: 0.3, sunPosition });
    const metalMat = ShaderLib.createPBRMaterial({ color: helmetColor, roughness: 0.3, metallic: 0.7, sunPosition });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
    this.torso = new THREE.Mesh(torsoGeo, armorMat);
    this.torso.position.y = 1.4;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Waist / Greek armor skirt
    const skirtGeo = new THREE.CylinderGeometry(0.35, 0.5, 0.5, 8);
    const skirt = new THREE.Mesh(skirtGeo, armorMat);
    skirt.position.y = 0.75;
    this.group.add(skirt);

    // Head
    const headGeo = new THREE.SphereGeometry(0.22, 8, 8);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 2.15;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Helmet
    if (hasHelmet) {
      const helmetGeo = new THREE.SphereGeometry(0.25, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const helmet = new THREE.Mesh(helmetGeo, metalMat);
      helmet.position.y = 2.2;
      this.group.add(helmet);

      const crestGeo = new THREE.BoxGeometry(0.06, 0.15, 0.4);
      const crestMat = ShaderLib.createPBRMaterial({ color: 0xCC0000, roughness: 0.6, metallic: 0.1, sunPosition });
      const crest = new THREE.Mesh(crestGeo, crestMat);
      crest.position.set(0, 2.4, 0);
      this.group.add(crest);
    }

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.7, 6);
    this.leftArm = new THREE.Mesh(armGeo, skinMat);
    this.leftArm.position.set(-0.5, 1.3, 0);
    this.leftArm.castShadow = true;
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo.clone(), skinMat);
    this.rightArm.position.set(0.5, 1.3, 0);
    this.rightArm.castShadow = true;
    this.group.add(this.rightArm);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.8, 6);
    this.leftLeg = new THREE.Mesh(legGeo, skinMat);
    this.leftLeg.position.set(-0.18, 0.35, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo.clone(), skinMat);
    this.rightLeg.position.set(0.18, 0.35, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);

    // Sandals
    const sandalGeo = new THREE.BoxGeometry(0.14, 0.05, 0.25);
    const sandalMat = ShaderLib.createPBRMaterial({ color: 0x5C4033, roughness: 0.9, metallic: 0.0, sunPosition });
    const leftSandal = new THREE.Mesh(sandalGeo, sandalMat);
    leftSandal.position.set(-0.18, -0.05, 0);
    this.group.add(leftSandal);
    const rightSandal = new THREE.Mesh(sandalGeo.clone(), sandalMat);
    rightSandal.position.set(0.18, -0.05, 0);
    this.group.add(rightSandal);

    // Sword
    if (hasSword) {
      const swordGroup = new THREE.Group();
      const bladeGeo = new THREE.BoxGeometry(0.04, 0.6, 0.01);
      const blade = new THREE.Mesh(bladeGeo, metalMat);
      blade.position.y = 0.3;
      swordGroup.add(blade);

      const hiltGeo = new THREE.BoxGeometry(0.15, 0.06, 0.04);
      const hilt = new THREE.Mesh(hiltGeo, metalMat);
      swordGroup.add(hilt);

      const gripGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6);
      const grip = new THREE.Mesh(gripGeo, ShaderLib.createPBRMaterial({ color: 0x3B2510, roughness: 0.9, metallic: 0.0, sunPosition }));
      grip.position.y = -0.08;
      swordGroup.add(grip);

      swordGroup.position.set(0.6, 0.9, 0.15);
      swordGroup.rotation.z = -0.2;
      this.group.add(swordGroup);
    }

    // Shield
    if (hasShield) {
      const shieldGeo = new THREE.CircleGeometry(0.35, 16);
      const shieldMat = ShaderLib.createPBRMaterial({ color: 0xB8860B, roughness: 0.4, metallic: 0.5, sunPosition });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(-0.6, 1.3, 0.2);
      shield.rotation.y = Math.PI * 0.3;
      this.group.add(shield);
    }

    // Cape
    if (hasCape) {
      const capeGeo = new THREE.PlaneGeometry(0.7, 1.2, 4, 8);
      const capeMat = ShaderLib.createPBRMaterial({ color: capeColor, roughness: 0.8, metallic: 0.0, sunPosition });
      capeMat.side = THREE.DoubleSide;
      this.cape = new THREE.Mesh(capeGeo, capeMat);
      this.cape.position.set(0, 1.3, -0.3);
      this.group.add(this.cape);
    }

    this.group.scale.setScalar(scale);
  }

  update(dt, time) {
    this.animTime += dt;

    if (this.isWalking) {
      const walkSpeed = 6;
      const t = this.animTime * walkSpeed;

      this.leftLeg.rotation.x = Math.sin(t) * 0.4;
      this.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.4;
      this.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.3;
      this.rightArm.rotation.x = Math.sin(t) * 0.3;
      this.torso.position.y = 1.4 + Math.abs(Math.sin(t * 2)) * 0.05;
      this.head.position.y = 2.15 + Math.abs(Math.sin(t * 2)) * 0.05;
    } else {
      this.torso.position.y = 1.4 + Math.sin(this.animTime * 1.5) * 0.02;
      this.head.position.y = 2.15 + Math.sin(this.animTime * 1.5) * 0.02;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    }

    // Simple cape physics
    if (this.cape) {
      const capeGeo = this.cape.geometry;
      const pos = capeGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const distFromTop = 1.3 - y;
        pos.setZ(i, -0.3 + Math.sin(time * 2 + distFromTop * 3) * 0.1 * Math.max(distFromTop, 0));
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
