import * as THREE from 'three';
import { GameScene } from '../engine/SceneManager.js';
import { Character } from '../entities/Character.js';
import { Ship } from '../entities/Ship.js';
import { Ocean } from '../entities/Ocean.js';
import { Sky } from '../entities/Sky.js';
import { HUD } from '../ui/HUD.js';
import { PLAYER } from '../utils/constants.js';

export class IslandExplorationScene extends GameScene {
  constructor(renderer, input, sceneManager) {
    super(renderer, input, sceneManager);
  }

  async enter(data) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.time = 0;

    // Store transition data for return
    this.returnData = {
      shipPosition: data.shipPosition,
      shipHeading: data.shipHeading,
    };

    this.island = data.island;
    this.islandWorldX = data.islandWorldX;
    this.islandWorldZ = data.islandWorldZ;

    const sunPosition = new THREE.Vector3(100, 40, -80);

    // ── Lighting ──
    const sunLight = new THREE.DirectionalLight(0xfff0dd, 2.5);
    sunLight.position.copy(sunPosition);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    this.scene.add(sunLight);
    this.scene.add(new THREE.AmbientLight(0x4466aa, 0.4));
    this.scene.add(new THREE.HemisphereLight(0x87CEEB, 0x2a4a2a, 0.3));

    this.scene.fog = new THREE.FogExp2(0x8aaabe, 0.002);

    // ── Ocean + Sky backdrop ──
    this.ocean = new Ocean(sunPosition);
    this.ocean.addTo(this.scene);

    this.sky = new Sky(sunPosition);
    this.sky.addTo(this.scene);

    // ── Add the island to this scene ──
    this.islandGroup = this.island.group.clone();
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

    // Player state
    this.playerPos = new THREE.Vector3(spawnX, spawnY, spawnZ);
    this.playerHeading = Math.atan2(toCenter.x, toCenter.y);
    this.moveSpeed = PLAYER.moveSpeed;

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

    // ── Player movement (WASD relative to camera azimuth) ──
    if (!this.showingDialogue) {
      const forward = this.input.getAxis('KeyS', 'KeyW');
      const strafe = this.input.getAxis('KeyA', 'KeyD');
      const isMoving = forward !== 0 || strafe !== 0;

      if (isMoving) {
        const moveAngle = this.cameraAzimuth + Math.PI;
        const moveX = Math.sin(moveAngle) * forward + Math.sin(moveAngle + Math.PI / 2) * strafe;
        const moveZ = Math.cos(moveAngle) * forward + Math.cos(moveAngle + Math.PI / 2) * strafe;

        const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (len > 0) {
          const nx = moveX / len;
          const nz = moveZ / len;

          this.playerPos.x += nx * this.moveSpeed * dt;
          this.playerPos.z += nz * this.moveSpeed * dt;

          const distFromCenter = Math.sqrt(this.playerPos.x ** 2 + this.playerPos.z ** 2);
          if (distFromCenter > this.island.radius * 0.95) {
            const scale = (this.island.radius * 0.95) / distFromCenter;
            this.playerPos.x *= scale;
            this.playerPos.z *= scale;
          }

          this.playerHeading = Math.atan2(nx, nz);
        }
      }

      const groundY = this.island.sampleHeight(this.playerPos.x, this.playerPos.z);
      this.playerPos.y = Math.max(groundY, 0.3);

      this.player.setPosition(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      this.player.setRotation(this.playerHeading);
      this.player.setWalking(isMoving);
    } else {
      this.player.setWalking(false);
    }

    this.player.update(dt, this.time);

    // ── Camera follow ──
    const camOffsetX = Math.sin(this.cameraAzimuth) * this.cameraDistance * Math.cos(this.cameraElevation);
    const camOffsetZ = Math.cos(this.cameraAzimuth) * this.cameraDistance * Math.cos(this.cameraElevation);
    const camOffsetY = this.cameraHeight + Math.sin(this.cameraElevation) * this.cameraDistance;

    const targetCamPos = new THREE.Vector3(
      this.playerPos.x + camOffsetX,
      this.playerPos.y + camOffsetY,
      this.playerPos.z + camOffsetZ
    );

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
