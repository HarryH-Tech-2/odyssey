import * as THREE from 'three';

export const COLORS = {
  deepSea: new THREE.Color(0x0a2a4a),
  shallowSea: new THREE.Color(0x1a8a7a),
  aegean: new THREE.Color(0x40bfb0),
  sandstone: new THREE.Color(0xc4843a),
  marble: new THREE.Color(0xe8d5b7),
  oliveGrove: new THREE.Color(0x4a6741),
  flame: new THREE.Color(0xff6b35),
  night: new THREE.Color(0x1a0f0a),
  divineGold: new THREE.Color(0xffd700),
  foam: new THREE.Color(0xe8eef2),
  sunLight: new THREE.Color(0xfff0dd),
};

export const SHIP = {
  speed: 15,
  turnSpeed: 1.2,
  bobAmplitude: 0.5,
  bobFrequency: 0.8,
};

export const OCEAN = {
  size: 2000,
  segments: 256,
  waveHeight: 1.0,
};

export const PLAYER = {
  maxHealth: 100,
  maxStamina: 100,
  moveSpeed: 8,
  sprintMultiplier: 1.8,
  staminaDrain: 20,
  staminaRegen: 15,
};
