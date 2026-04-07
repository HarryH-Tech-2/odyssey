import * as THREE from 'three';
import { GameScene } from '../engine/SceneManager.js';
import { Character } from '../entities/Character.js';
import { Ship } from '../entities/Ship.js';
import { Ocean } from '../entities/Ocean.js';
import { Sky } from '../entities/Sky.js';
import { HUD } from '../ui/HUD.js';
import { PLAYER } from '../utils/constants.js';

const GRAVITY = 28;
const JUMP_VELOCITY = 12;
const MOVE_ACCEL = 40;
const MOVE_DECEL = 18;
const TURN_SPEED = 10;

export class IslandExplorationScene extends GameScene {
  constructor(renderer, input, sceneManager) {
    super(renderer, input, sceneManager);
  }

  async enter(data) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.time = 0;

    this.returnData = {
      shipPosition: data.shipPosition,
      shipHeading: data.shipHeading,
    };

    this.island = data.island;
    this.islandWorldX = data.islandWorldX;
    this.islandWorldZ = data.islandWorldZ;

    const sunPosition = new THREE.Vector3(80, 50, -60);

    // ── Enhanced Lighting ──
    // Main sun — warm, strong directional
    const sunLight = new THREE.DirectionalLight(0xfff4e0, 3.0);
    sunLight.position.copy(sunPosition);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.far = 250;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    sunLight.shadow.bias = -0.001;
    sunLight.shadow.normalBias = 0.02;
    this.scene.add(sunLight);
    this.scene.add(sunLight.target);
    this.sunLight = sunLight;

    // Fill light from opposite side — cool blue
    const fillLight = new THREE.DirectionalLight(0x8ab4d8, 0.6);
    fillLight.position.set(-60, 30, 50);
    this.scene.add(fillLight);

    // Warm ambient for ground-level visibility
    this.scene.add(new THREE.AmbientLight(0x665544, 0.5));

    // Sky-to-ground hemisphere: sky blue above, warm earth below
    this.scene.add(new THREE.HemisphereLight(0x87CEEB, 0x5a6a3a, 0.5));

    // Rim/backlight for character pop
    const rimLight = new THREE.DirectionalLight(0xffd4a0, 0.8);
    rimLight.position.set(-40, 20, 80);
    this.scene.add(rimLight);

    // Softer, warmer fog for island atmosphere
    this.scene.fog = new THREE.FogExp2(0xa8c4d0, 0.0015);

    // ── Ocean + Sky backdrop ──
    this.ocean = new Ocean(sunPosition);
    this.ocean.addTo(this.scene);

    this.sky = new Sky(sunPosition);
    this.sky.addTo(this.scene);

    // ── Add the island to this scene ──
    this.islandGroup = this.island.group.clone();
    this.islandGroup.position.set(0, 0, 0);
    this.scene.add(this.islandGroup);

    // ── Static ship at shore ──
    this.staticShip = new Ship(sunPosition, true);
    this.staticShip.addTo(this.scene);
    const shipLocalX = data.shipPosition.x - this.islandWorldX;
    const shipLocalZ = data.shipPosition.z - this.islandWorldZ;
    this.staticShip.group.position.set(shipLocalX, 0, shipLocalZ);
    this.staticShip.group.rotation.y = data.shipHeading;

    // ── Player character ──
    this.player = new Character({
      sunPosition,
      scale: 0.8,
      armorColor: 0xB8860B,
      capeColor: 0xCC0000,
    });
    this.player.addTo(this.scene);

    // Spawn on beach — walk from ship position toward island center
    const toCenter = new THREE.Vector2(-shipLocalX, -shipLocalZ).normalize();
    const spawnX = shipLocalX + toCenter.x * 15;
    const spawnZ = shipLocalZ + toCenter.y * 15;
    const spawnY = Math.max(this.island.sampleHeight(spawnX, spawnZ), 0.5);
    this.player.setPosition(spawnX, spawnY, spawnZ);

    // Player physics state
    this.playerPos = new THREE.Vector3(spawnX, spawnY, spawnZ);
    this.playerVelocity = new THREE.Vector3(0, 0, 0);
    this.playerHeading = Math.atan2(toCenter.x, toCenter.y);
    this.targetHeading = this.playerHeading;
    this.currentSpeed = 0;
    this.moveSpeed = PLAYER.moveSpeed;
    this.velocityY = 0;
    this.isGrounded = true;

    // ── Third-person camera ──
    this.cameraDistance = 8;
    this.cameraHeight = 4;
    this.cameraAzimuth = this.playerHeading + Math.PI;
    this.cameraElevation = 0.3;

    // ── Interaction system ──
    this.interactionPoints = this._gatherInteractionPoints();
    this.activeInteraction = null;
    this.showingDialogue = false;

    // ── Ship re-boarding zone ──
    this.shipLocalPos = new THREE.Vector3(shipLocalX, 0, shipLocalZ);

    // ── HUD ──
    this.hud = new HUD();
    this.hud.show();

    this.input.reset();
    this.input.enablePointerLock();
  }

  _gatherInteractionPoints() {
    const points = [];
    const island = this.island;

    if (island.label) {
      points.push({
        x: 0, z: 0,
        y: island.sampleHeight(0, 0),
        radius: 8,
        label: island.label,
        description: this._getIslandDescription(island.label),
      });
    }

    if (island.magicOrb) {
      const pos = island.magicOrb.position;
      points.push({
        x: pos.x, z: pos.z,
        y: pos.y,
        radius: 5,
        label: 'Ancient Shrine',
        description: 'A golden light pulses from an ancient shrine. Divine power lingers here — perhaps a gift from the gods.',
      });
    }

    return points;
  }

  _getIslandDescription(label) {
    const descriptions = {
      'Land of the Lotus Eaters': 'The air is thick with a sweet, intoxicating fragrance. Strange flowers bloom everywhere. The locals seem lost in a blissful haze...',
      'Cyclops Island': 'A wild, untamed island. Massive footprints mark the earth. Somewhere in the hills, you hear a deep rumbling voice...',
      'Aeolus': 'The wind swirls in impossible patterns around this island. At its heart, a palace gleams — the home of the Keeper of Winds.',
    };
    return descriptions[label] || 'An uncharted island. Who knows what awaits here?';
  }

  async exit() {
    this.hud.hide();
    this.hud.hideInteraction();
    this._hideDialogue();
    this.input.disablePointerLock();

    this.scene.remove(this.islandGroup);
  }

  update(dt) {
    this.time += dt;

    // ── Camera orbit via mouse ──
    const mouseDelta = this.input.getMouseDelta();
    this.cameraAzimuth += mouseDelta.x * 0.003;
    this.cameraElevation = Math.max(-0.2, Math.min(1.2,
      this.cameraElevation - mouseDelta.y * 0.003
    ));

    // ── Player movement ──
    if (!this.showingDialogue) {
      const forward = this.input.getAxis('KeyS', 'KeyW');
      const strafe = this.input.getAxis('KeyA', 'KeyD');
      const wantsToMove = forward !== 0 || strafe !== 0;

      if (wantsToMove) {
        // Movement direction relative to camera facing
        const moveAngle = this.cameraAzimuth + Math.PI;
        const moveX = Math.sin(moveAngle) * forward + Math.sin(moveAngle + Math.PI / 2) * strafe;
        const moveZ = Math.cos(moveAngle) * forward + Math.cos(moveAngle + Math.PI / 2) * strafe;

        const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (len > 0) {
          const nx = moveX / len;
          const nz = moveZ / len;

          // Smooth acceleration
          this.currentSpeed = Math.min(this.moveSpeed,
            this.currentSpeed + MOVE_ACCEL * dt
          );

          this.playerPos.x += nx * this.currentSpeed * dt;
          this.playerPos.z += nz * this.currentSpeed * dt;

          // Clamp to island radius
          const distFromCenter = Math.sqrt(this.playerPos.x ** 2 + this.playerPos.z ** 2);
          if (distFromCenter > this.island.radius * 0.95) {
            const scale = (this.island.radius * 0.95) / distFromCenter;
            this.playerPos.x *= scale;
            this.playerPos.z *= scale;
          }

          // Smooth heading rotation — don't snap
          this.targetHeading = Math.atan2(nx, nz);
        }
      } else {
        // Smooth deceleration
        this.currentSpeed = Math.max(0, this.currentSpeed - MOVE_DECEL * dt);
        if (this.currentSpeed > 0.1) {
          // Continue drifting in last direction
          const nx = Math.sin(this.playerHeading);
          const nz = Math.cos(this.playerHeading);
          this.playerPos.x += nx * this.currentSpeed * dt;
          this.playerPos.z += nz * this.currentSpeed * dt;
        } else {
          this.currentSpeed = 0;
        }
      }

      // Smooth heading interpolation
      let headingDiff = this.targetHeading - this.playerHeading;
      while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
      while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
      this.playerHeading += headingDiff * Math.min(1, TURN_SPEED * dt);

      // ── Jump ──
      if (this.input.justPressed('Space') && this.isGrounded) {
        this.velocityY = JUMP_VELOCITY;
        this.isGrounded = false;
      }

      // Apply gravity
      this.velocityY -= GRAVITY * dt;
      this.playerPos.y += this.velocityY * dt;

      // Ground collision
      const groundY = Math.max(this.island.sampleHeight(this.playerPos.x, this.playerPos.z), 0.3);
      if (this.playerPos.y <= groundY) {
        this.playerPos.y = groundY;
        this.velocityY = 0;
        this.isGrounded = true;
      }

      const isMoving = this.currentSpeed > 0.5;
      this.player.setPosition(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      this.player.setRotation(this.playerHeading);
      this.player.setWalking(isMoving);
    } else {
      this.player.setWalking(false);
    }

    this.player.update(dt, this.time);

    // ── Update shadow camera to follow player ──
    if (this.sunLight) {
      this.sunLight.target.position.copy(this.playerPos);
      this.sunLight.target.updateMatrixWorld();
      this.sunLight.position.set(
        this.playerPos.x + 80,
        50,
        this.playerPos.z - 60
      );
    }

    // ── Camera follow ──
    const camOffsetX = Math.sin(this.cameraAzimuth) * this.cameraDistance * Math.cos(this.cameraElevation);
    const camOffsetZ = Math.cos(this.cameraAzimuth) * this.cameraDistance * Math.cos(this.cameraElevation);
    const camOffsetY = this.cameraHeight + Math.sin(this.cameraElevation) * this.cameraDistance;

    const targetCamPos = new THREE.Vector3(
      this.playerPos.x + camOffsetX,
      this.playerPos.y + camOffsetY,
      this.playerPos.z + camOffsetZ
    );

    // Camera ground collision
    const camGroundY = this.island.sampleHeight(targetCamPos.x, targetCamPos.z);
    targetCamPos.y = Math.max(targetCamPos.y, camGroundY + 1.5);

    this.camera.position.lerp(targetCamPos, dt * 6);
    this.camera.lookAt(this.playerPos.x, this.playerPos.y + 1.5, this.playerPos.z);

    // ── Environment animation ──
    this.ocean.update(dt, this.time, this.camera.position);
    this.sky.update(dt, this.time);
    if (this.island.magicOrb) {
      this.island.update(this.time);
    }

    // ── Interaction checks ──
    this._updateInteractions();

    // ── Re-board ship check ──
    const distToShip = this.playerPos.distanceTo(this.shipLocalPos);
    if (distToShip < 12 && !this.activeInteraction) {
      this.hud.showInteraction('Press E to board ship');
      if (this.input.justPressed('KeyE')) {
        this.sceneManager.switchTo('sailing', this.returnData);
      }
    }
  }

  _updateInteractions() {
    if (this.showingDialogue) {
      if (this.input.justPressed('KeyE') || this.input.justPressed('Space')) {
        this._hideDialogue();
        this.showingDialogue = false;
      }
      return;
    }

    let closestPoint = null;
    let closestDist = Infinity;

    for (const point of this.interactionPoints) {
      const dx = this.playerPos.x - point.x;
      const dz = this.playerPos.z - point.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < point.radius && dist < closestDist) {
        closestDist = dist;
        closestPoint = point;
      }
    }

    if (closestPoint) {
      this.activeInteraction = closestPoint;
      const distToShip = this.playerPos.distanceTo(this.shipLocalPos);
      if (distToShip >= 12) {
        this.hud.showInteraction(`Press E to examine: ${closestPoint.label}`);
      }
      if (this.input.justPressed('KeyE') && distToShip >= 12) {
        this._showDialogue(closestPoint.description);
        this.showingDialogue = true;
      }
    } else {
      this.activeInteraction = null;
      const distToShip = this.playerPos.distanceTo(this.shipLocalPos);
      if (distToShip >= 12) {
        this.hud.hideInteraction();
      }
    }
  }

  _showDialogue(text) {
    const overlay = document.getElementById('cutscene-overlay');
    const textEl = document.getElementById('cutscene-text');
    const skipEl = document.getElementById('cutscene-skip');
    overlay.classList.remove('hidden');
    textEl.textContent = text;
    textEl.classList.add('visible');
    skipEl.textContent = 'Press E to continue';
  }

  _hideDialogue() {
    const overlay = document.getElementById('cutscene-overlay');
    const textEl = document.getElementById('cutscene-text');
    overlay.classList.add('hidden');
    textEl.classList.remove('visible');
    textEl.textContent = '';
  }

  render(renderer) {
    if (this.scene && this.camera) {
      renderer.render(this.scene, this.camera);
    }
  }
}
