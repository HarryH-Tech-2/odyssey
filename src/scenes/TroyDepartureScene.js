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
    this.scene.add(new THREE.AmbientLight(0x442211, 0.6));

    // Fire point lights
    this.fireLights = [];
    const firePositions = [
      new THREE.Vector3(-40, 15, -80),
      new THREE.Vector3(-30, 20, -90),
      new THREE.Vector3(-50, 12, -75),
      new THREE.Vector3(-35, 18, -85),
    ];
    for (const pos of firePositions) {
      const light = new THREE.PointLight(0xff4400, 5, 80);
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

    // Fire billboards on Troy
    this.fires = [];
    for (let i = 0; i < 8; i++) {
      const fireMat = ShaderLib.createFireMaterial();
      const fireGeo = new THREE.PlaneGeometry(6, 10);
      const fire = new THREE.Mesh(fireGeo, fireMat);
      fire.position.set(
        -40 + (Math.random() - 0.5) * 30,
        10 + Math.random() * 15,
        -80 + (Math.random() - 0.5) * 20
      );
      this.fires.push(fire);
      this.scene.add(fire);
    }

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
    this.ship.group.add(this.odysseus.group);

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
      this.ship.group.add(crewMember.group);
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

    super.update(dt);
  }
}
