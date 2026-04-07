import * as THREE from 'three';
import { SceneManager } from './engine/SceneManager.js';
import { InputManager } from './engine/InputManager.js';
import { MenuScene } from './scenes/MenuScene.js';
import { TroyDepartureScene } from './scenes/TroyDepartureScene.js';
import { SailingScene } from './scenes/SailingScene.js';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const input = new InputManager(canvas);
const sceneManager = new SceneManager(renderer, input);

sceneManager.register('menu', MenuScene);
sceneManager.register('troyDeparture', TroyDepartureScene);
sceneManager.register('sailing', SailingScene);
sceneManager.switchTo('menu');

const clock = new THREE.Clock();

function gameLoop() {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(clock.getDelta(), 0.1);
  sceneManager.update(dt);
  sceneManager.render();
}

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  sceneManager.onResize(window.innerWidth, window.innerHeight);
});

gameLoop();

export { renderer, input, sceneManager };
