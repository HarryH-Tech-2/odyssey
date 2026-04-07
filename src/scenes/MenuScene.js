import * as THREE from 'three';
import { GameScene } from '../engine/SceneManager.js';
import { Ocean } from '../entities/Ocean.js';
import { Sky } from '../entities/Sky.js';
import { Ship } from '../entities/Ship.js';

export class MenuScene extends GameScene {
  constructor(renderer, input, sceneManager) {
    super(renderer, input, sceneManager);
  }

  async enter() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(20, 12, 20);
    this.camera.lookAt(0, 2, 0);

    this.time = 0;
    this.sunPosition = new THREE.Vector3(100, 30, -80);

    const sunLight = new THREE.DirectionalLight(0xfff0dd, 2.5);
    sunLight.position.copy(this.sunPosition);
    sunLight.castShadow = true;
    this.scene.add(sunLight);
    this.scene.add(new THREE.AmbientLight(0x4466aa, 0.4));

    this.ocean = new Ocean(this.sunPosition);
    this.ocean.addTo(this.scene);

    this.sky = new Sky(this.sunPosition);
    this.sky.addTo(this.scene);

    this.ship = new Ship(this.sunPosition);
    this.ship.addTo(this.scene);

    const overlay = document.getElementById('menu-overlay');
    overlay.classList.remove('hidden');

    this.startBtn = document.getElementById('start-btn');
    this._onStart = () => {
      overlay.classList.add('hidden');
      this.sceneManager.switchTo('troyDeparture');
    };
    this.startBtn.addEventListener('click', this._onStart);
  }

  async exit() {
    document.getElementById('menu-overlay').classList.add('hidden');
    this.startBtn.removeEventListener('click', this._onStart);
  }

  update(dt) {
    this.time += dt;
    this.ocean.update(dt, this.time, this.camera.position);
    this.sky.update(dt, this.time);
    this.ship.update(dt, this.time, this.ocean, null);

    const angle = this.time * 0.05;
    this.camera.position.x = Math.cos(angle) * 25;
    this.camera.position.z = Math.sin(angle) * 25;
    this.camera.position.y = 10 + Math.sin(this.time * 0.2) * 2;
    this.camera.lookAt(0, 3, 0);
  }
}
