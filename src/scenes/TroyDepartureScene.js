import * as THREE from 'three';
import { CutsceneScene } from './CutsceneScene.js';
import { Ocean } from '../entities/Ocean.js';
import { Sky } from '../entities/Sky.js';
import { Ship } from '../entities/Ship.js';
import { Character } from '../entities/Character.js';
import { Island } from '../entities/Island.js';
import { ShaderLib } from '../shaders/ShaderLib.js';

export class TroyDepartureScene extends CutsceneScene {
  constructor(renderer, input, sceneManager) {
    super(renderer, input, sceneManager);
  }

  async enter(data) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.time = 0;

    // Sunset/fire lighting for Troy burning
    this.sunPosition = new THREE.Vector3(-60, 15, -40);

    const sunLight = new THREE.DirectionalLight(0xff8844, 2.0);
    sunLight.position.copy(this.sunPosition);
    this.scene.add(sunLight);
    this.scene.add(new THREE.AmbientLight(0x664433, 1.0));

    // Smoky, fiery atmosphere
    this.scene.fog = new THREE.FogExp2(0x442218, 0.0012);

    // Fire point lights — many sources for burning city
    this.fireLights = [];
    const firePositions = [
      new THREE.Vector3(-40, 15, -80),
      new THREE.Vector3(-30, 20, -90),
      new THREE.Vector3(-50, 12, -75),
      new THREE.Vector3(-35, 18, -85),
      new THREE.Vector3(-25, 10, -70),
      new THREE.Vector3(-55, 16, -88),
      new THREE.Vector3(-45, 22, -95),
      new THREE.Vector3(-32, 8, -72),
    ];
    for (const pos of firePositions) {
      const light = new THREE.PointLight(0xff4400, 6, 100);
      light.position.copy(pos);
      this.scene.add(light);
      this.fireLights.push(light);
    }

    // Environment
    this.ocean = new Ocean(this.sunPosition);
    this.ocean.addTo(this.scene);

    this.sky = new Sky(this.sunPosition);
    this.sky.addTo(this.scene);

    // Troy island
    this.troy = new Island({
      sunPosition: this.sunPosition,
      radius: 40,
      height: 25,
      seed: 9999,
      type: 'large',
      hasRuins: true,
      hasMagic: false,
      hasVegetation: false,
    });
    this.troy.setPosition(-40, 0, -80);
    this.troy.addTo(this.scene);

    // ── Troy city structures — walls, towers, buildings ──
    const stoneColor = 0xC8B898;
    const stoneMat = new THREE.MeshStandardMaterial({ color: stoneColor, roughness: 0.85, metalness: 0.05 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x9A8A70, roughness: 0.9, metalness: 0.03 });

    // Great city wall — ring around the city
    const wallGeo = new THREE.TorusGeometry(18, 1.5, 4, 24);
    wallGeo.rotateX(Math.PI / 2);
    const wall = new THREE.Mesh(wallGeo, stoneMat);
    wall.position.set(-40, 12, -80);
    wall.scale.set(1, 1, 0.6);
    this.scene.add(wall);

    // Wall top — crenellations implied by a thinner ring on top
    const wallTopGeo = new THREE.TorusGeometry(18, 0.8, 4, 24);
    wallTopGeo.rotateX(Math.PI / 2);
    const wallTop = new THREE.Mesh(wallTopGeo, darkStoneMat);
    wallTop.position.set(-40, 14.5, -80);
    this.scene.add(wallTop);

    // Main gate tower (front-facing)
    const towerGeo = new THREE.BoxGeometry(5, 18, 5);
    const tower1 = new THREE.Mesh(towerGeo, stoneMat);
    tower1.position.set(-22, 12, -80);
    tower1.castShadow = true;
    this.scene.add(tower1);

    // Second tower
    const tower2 = new THREE.Mesh(towerGeo.clone(), stoneMat);
    tower2.position.set(-58, 12, -80);
    tower2.castShadow = true;
    this.scene.add(tower2);

    // Corner towers (smaller)
    const smallTowerGeo = new THREE.BoxGeometry(3.5, 14, 3.5);
    for (const pos of [[-30, 11, -65], [-50, 11, -65], [-30, 11, -95], [-50, 11, -95]]) {
      const t = new THREE.Mesh(smallTowerGeo.clone(), stoneMat);
      t.position.set(...pos);
      this.scene.add(t);
    }

    // Tower battlements (crenellations on top of towers)
    const battlementGeo = new THREE.BoxGeometry(0.8, 2, 0.8);
    for (const towerPos of [[-22, 21.5, -80], [-58, 21.5, -80]]) {
      for (let dx = -2; dx <= 2; dx += 1.3) {
        for (let dz = -2; dz <= 2; dz += 1.3) {
          if (Math.abs(dx) < 1.3 && Math.abs(dz) < 1.3) continue;
          const b = new THREE.Mesh(battlementGeo, darkStoneMat);
          b.position.set(towerPos[0] + dx, towerPos[1], towerPos[2] + dz);
          this.scene.add(b);
        }
      }
    }

    // Palace / temple — large central building
    const palaceGeo = new THREE.BoxGeometry(10, 8, 8);
    const palace = new THREE.Mesh(palaceGeo, stoneMat);
    palace.position.set(-40, 10, -80);
    this.scene.add(palace);

    // Palace roof (triangular pediment)
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-6, 0);
    roofShape.lineTo(0, 4);
    roofShape.lineTo(6, 0);
    roofShape.lineTo(-6, 0);
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 8, bevelEnabled: false });
    const roof = new THREE.Mesh(roofGeo, darkStoneMat);
    roof.position.set(-40, 14, -84);
    this.scene.add(roof);

    // Palace columns (front)
    const colGeo = new THREE.CylinderGeometry(0.3, 0.35, 8, 8);
    for (let i = 0; i < 5; i++) {
      const col = new THREE.Mesh(colGeo, stoneMat);
      col.position.set(-44 + i * 2, 10, -76);
      this.scene.add(col);
    }

    // Houses — scattered smaller buildings
    const houseGeo = new THREE.BoxGeometry(4, 5, 4);
    const housePositions = [
      [-32, 8, -72], [-48, 8, -72], [-35, 8, -88],
      [-45, 8, -88], [-28, 7, -78], [-52, 7, -82],
      [-38, 7, -70], [-42, 7, -92],
    ];
    for (const hp of housePositions) {
      const house = new THREE.Mesh(houseGeo.clone(), stoneMat);
      house.position.set(...hp);
      house.scale.set(0.8 + Math.random() * 0.4, 0.6 + Math.random() * 0.5, 0.8 + Math.random() * 0.4);
      this.scene.add(house);
    }

    // Fire billboards ON city structures
    this.fires = [];
    const fireAnchors = [
      // On palace
      [-40, 16, -80], [-38, 18, -79], [-42, 17, -81],
      // On towers
      [-22, 22, -80], [-58, 22, -80], [-22, 18, -78], [-58, 18, -82],
      // On wall sections
      [-30, 16, -65], [-50, 16, -65], [-30, 16, -95], [-50, 16, -95],
      // On houses
      [-32, 12, -72], [-48, 12, -72], [-35, 12, -88], [-45, 12, -88],
      [-28, 11, -78], [-52, 11, -82],
    ];
    for (const anchor of fireAnchors) {
      const fireMat = ShaderLib.createFireMaterial();
      const size = 4 + Math.random() * 6;
      const fireGeo = new THREE.PlaneGeometry(size, size * 1.5);
      const fire = new THREE.Mesh(fireGeo, fireMat);
      fire.position.set(anchor[0] + (Math.random() - 0.5) * 2, anchor[1], anchor[2] + (Math.random() - 0.5) * 2);
      this.fires.push(fire);
      this.scene.add(fire);
    }
    // Extra small scattered fires
    for (let i = 0; i < 6; i++) {
      const fireMat = ShaderLib.createFireMaterial();
      const fireGeo = new THREE.PlaneGeometry(2, 3);
      const fire = new THREE.Mesh(fireGeo, fireMat);
      fire.position.set(
        -40 + (Math.random() - 0.5) * 30,
        8 + Math.random() * 6,
        -80 + (Math.random() - 0.5) * 20
      );
      this.fires.push(fire);
      this.scene.add(fire);
    }

    // Smoke columns rising from the city
    this.smokeParticles = [];
    for (let i = 0; i < 8; i++) {
      const smokeGeo = new THREE.PlaneGeometry(12, 20);
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0x222222,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const smoke = new THREE.Mesh(smokeGeo, smokeMat);
      smoke.position.set(
        -40 + (Math.random() - 0.5) * 35,
        25 + Math.random() * 15,
        -80 + (Math.random() - 0.5) * 25
      );
      this.smokeParticles.push(smoke);
      this.scene.add(smoke);
    }

    // Ground ember glow under Troy
    const emberGeo = new THREE.CircleGeometry(25, 24);
    emberGeo.rotateX(-Math.PI / 2);
    const emberMat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    const embers = new THREE.Mesh(emberGeo, emberMat);
    embers.position.set(-40, 1, -80);
    this.scene.add(embers);

    // Odysseus's ship
    this.ship = new Ship(this.sunPosition);
    this.ship.group.position.set(0, 0, -20);
    this.ship.addTo(this.scene);

    // Odysseus on the ship
    this.odysseus = new Character({
      sunPosition: this.sunPosition,
      helmetColor: 0xB8860B,
      capeColor: 0x8B0000,
      hasHelmet: true,
      hasCape: true,
      hasSword: true,
      scale: 0.8,
    });
    this.odysseus.setPosition(-4, 3.2, 0);
    this.ship.meshGroup.add(this.odysseus.group);

    // Crew members
    this.crew = [];
    for (let i = 0; i < 5; i++) {
      const crewMember = new Character({
        sunPosition: this.sunPosition,
        armorColor: 0x7a6a5a,
        hasHelmet: false,
        hasCape: false,
        hasSword: false,
        scale: 0.7,
      });
      crewMember.setPosition(-2 + i * 1.5, 3, (i % 2 === 0 ? 0.5 : -0.5));
      this.ship.meshGroup.add(crewMember.group);
      this.crew.push(crewMember);
    }

    // Cutscene steps
    this.setSteps([
      {
        duration: 6,
        text: "After ten long years, the walls of Troy have finally fallen...",
        cameraStart: new THREE.Vector3(-20, 25, -50),
        cameraEnd: new THREE.Vector3(-30, 18, -60),
        lookAt: new THREE.Vector3(-40, 15, -80),
      },
      {
        duration: 5,
        text: "The great city burns. The war is over.",
        cameraStart: new THREE.Vector3(-30, 18, -60),
        cameraEnd: new THREE.Vector3(-10, 12, -40),
        lookAt: new THREE.Vector3(-40, 12, -80),
      },
      {
        duration: 6,
        text: "Odysseus, King of Ithaca, hero of the wooden horse, gathers his men.",
        cameraStart: new THREE.Vector3(5, 8, -15),
        cameraEnd: new THREE.Vector3(-2, 5, -18),
        lookAt: new THREE.Vector3(-4, 4, -20),
      },
      {
        duration: 5,
        text: '"Set sail for home, brothers. Penelope and Telemachus await."',
        cameraStart: new THREE.Vector3(-6, 5, -17),
        cameraEnd: new THREE.Vector3(-8, 4.5, -16),
        lookAt: new THREE.Vector3(-4, 4, -20),
      },
      {
        duration: 7,
        text: "But the gods have other plans. The journey home will take ten more years...",
        cameraStart: new THREE.Vector3(0, 10, -10),
        cameraEnd: new THREE.Vector3(10, 15, 10),
        lookAtStart: new THREE.Vector3(0, 3, -20),
        lookAtEnd: new THREE.Vector3(0, 2, -30),
        onUpdate: (dt) => {
          this.ship.group.position.z += dt * 3;
        },
      },
    ]);

    await super.enter(data);
  }

  _onComplete() {
    this.sceneManager.switchTo('sailing');
  }

  update(dt) {
    this.time += dt;
    this.ocean.update(dt, this.time, this.camera.position);
    this.sky.update(dt, this.time);
    this.ship.update(dt, this.time, this.ocean, null);
    this.odysseus.update(dt, this.time);
    for (const c of this.crew) c.update(dt, this.time);

    // Animate fire
    for (const fire of this.fires) {
      fire.material.uniforms.uTime.value = this.time;
      fire.lookAt(this.camera.position);
    }

    // Flicker fire lights
    for (const light of this.fireLights) {
      light.intensity = 4 + Math.sin(this.time * 5 + light.position.x) * 2;
    }

    // Animate smoke — rise and drift
    for (const smoke of this.smokeParticles) {
      smoke.position.y += dt * 2;
      smoke.position.x += Math.sin(this.time + smoke.position.z) * dt * 0.5;
      smoke.material.opacity = Math.max(0.03, smoke.material.opacity - dt * 0.01);
      smoke.lookAt(this.camera.position);
      // Reset when too high or too faded
      if (smoke.position.y > 50 || smoke.material.opacity < 0.04) {
        smoke.position.y = 20 + Math.random() * 8;
        smoke.position.x = -40 + (Math.random() - 0.5) * 35;
        smoke.material.opacity = 0.12 + Math.random() * 0.06;
      }
    }

    super.update(dt);
  }
}
