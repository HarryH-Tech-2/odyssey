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

    // ── NPCs ──
    this.npcs = [];
    this._spawnNPCs(sunPosition);

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

  _spawnNPCs(sunPosition) {
    const label = this.island.label || '';
    const r = this.island.radius;

    if (label === 'Land of the Lotus Eaters') {
      // Lotus Eaters — dreamy, swaying figures in loose robes
      const lotusPoses = [
        { x: r * 0.15, z: r * 0.1, rot: 0.5 },
        { x: -r * 0.1, z: r * 0.2, rot: -0.3 },
        { x: r * 0.25, z: -r * 0.05, rot: 1.2 },
        { x: -r * 0.2, z: -r * 0.15, rot: 2.1 },
        { x: r * 0.05, z: -r * 0.25, rot: -1.0 },
        { x: -r * 0.3, z: r * 0.05, rot: 0.8 },
      ];
      for (const pose of lotusPoses) {
        const npc = new Character({
          sunPosition,
          skinColor: 0xCBA882,
          armorColor: 0xD4C4A8,   // pale robes
          hasHelmet: false,
          hasCape: false,
          hasSword: false,
          hasShield: false,
          scale: 0.75,
        });
        const y = this.island.sampleHeight(pose.x, pose.z);
        if (y > 0.5) {
          npc.setPosition(pose.x, y, pose.z);
          npc.setRotation(pose.rot);
          npc.addTo(this.scene);
          this.npcs.push(npc);
        }
      }
    } else if (label === 'Cyclops Island') {
      // Wild goats (simplified as small characters without gear)
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + 0.5;
        const dist = r * 0.3;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = this.island.sampleHeight(x, z);
        if (y > 1) {
          const goat = new Character({
            sunPosition,
            skinColor: 0xA09080,
            armorColor: 0xA09080,
            hasHelmet: false, hasCape: false, hasSword: false, hasShield: false,
            scale: 0.3,
          });
          goat.setPosition(x, y, z);
          goat.setRotation(angle);
          goat.addTo(this.scene);
          this.npcs.push(goat);
        }
      }
    } else if (label === 'Aeolus') {
      // Wind keeper — regal figure at island center
      const keeper = new Character({
        sunPosition,
        skinColor: 0xD4B090,
        armorColor: 0x4A6A9A,   // royal blue robes
        helmetColor: 0xC8A030,
        hasHelmet: false,
        hasCape: true,
        capeColor: 0x2A4A7A,
        hasSword: false,
        hasShield: false,
        scale: 0.9,
      });
      const cy = this.island.sampleHeight(0, 0);
      keeper.setPosition(0, cy, 0);
      keeper.addTo(this.scene);
      this.npcs.push(keeper);
    }
  }

  _gatherInteractionPoints() {
    const points = [];
    const island = this.island;
    const label = island.label || '';
    const r = island.radius;

    // ── Island-specific content ──
    const islandContent = this._getIslandContent(label, r);
    for (const pt of islandContent) {
      const y = island.sampleHeight(pt.x, pt.z);
      if (y > 0.3) {
        points.push({ ...pt, y, radius: pt.radius || 6 });
      }
    }

    // Magic shrine
    if (island.magicOrb) {
      const pos = island.magicOrb.position;
      points.push({
        x: pos.x, z: pos.z, y: pos.y,
        radius: 5,
        label: 'Ancient Shrine',
        description: 'A golden light pulses from an ancient shrine. The Greeks believed divine power could dwell in sacred places — a temenos, or sacred precinct, marked by offerings and prayer.',
      });
    }

    // General ancient Greece educational points for any island with ruins
    if (island.group && !label) {
      points.push({
        x: 0, z: 0,
        y: island.sampleHeight(0, 0),
        radius: 8,
        label: 'Ruins',
        description: 'Crumbling columns of a Greek temple. The ancient Greeks built temples not as gathering places for worship, but as houses for their gods. Worshippers prayed outside, at an altar before the entrance.',
      });
    }

    return points;
  }

  _getIslandContent(label, r) {
    if (label === 'Land of the Lotus Eaters') {
      return [
        {
          x: r * 0.15, z: r * 0.1, radius: 5,
          label: 'A Lotus Eater',
          description: '"Try the lotus," the figure murmurs dreamily. "You will forget all your sorrows..." In Homer\'s Odyssey, the Lotus Eaters offered Odysseus\'s crew a magical fruit that made them forget their homeland. Odysseus had to drag his men back to the ships by force.',
        },
        {
          x: -r * 0.1, z: r * 0.2, radius: 5,
          label: 'A Drowsy Lotus Eater',
          description: '"Why would you want to leave? There is nothing but pain out there..." The story of the Lotus Eaters is one of the first trials in the Odyssey. It warns about the danger of complacency — choosing comfortable forgetfulness over the difficult journey home.',
        },
        {
          x: r * 0.25, z: -r * 0.05, radius: 5,
          label: 'Lotus Flowers',
          description: 'Strange, luminous flowers grow everywhere. The lotus has deep meaning in Greek culture. The Greeks associated it with forgetfulness and escape. Herodotus wrote that real lotus fruit existed in Libya — likely the jujube or date palm — and was used to make a sweet wine.',
        },
        {
          x: -r * 0.3, z: r * 0.05, radius: 6,
          label: 'A Singing Lotus Eater',
          description: 'A soft, haunting melody drifts through the air. Music was central to Greek life — the word "music" comes from the Muses, nine goddesses of artistic inspiration. The Greeks believed music could heal, educate, and even influence the gods.',
        },
        {
          x: 0, z: -r * 0.25, radius: 7,
          label: 'Stone Tablet',
          description: 'A weathered stone tablet reads: "Know thyself" — one of the Delphic maxims inscribed at the Temple of Apollo at Delphi. The Greeks valued self-knowledge above all. Socrates taught that "the unexamined life is not worth living."',
        },
        {
          x: r * 0.35, z: r * 0.2, radius: 6,
          label: 'Olive Grove',
          description: 'Ancient olive trees twist in the warm breeze. The olive was sacred to Athena — legend says she won patronage of Athens by giving the city its first olive tree. Olive oil was used for cooking, lighting, medicine, and as a prize for Olympic victors.',
        },
        {
          x: -r * 0.15, z: -r * 0.3, radius: 6,
          label: 'Broken Amphora',
          description: 'Shards of a painted amphora lie scattered here. Greek pottery told stories — red figures on black backgrounds, or black figures on red. Amphorae carried wine, olive oil, and grain across the Mediterranean, fueling the trade networks that connected the Greek world.',
        },
      ];
    }

    if (label === 'Cyclops Island') {
      return [
        {
          x: 0, z: 0, radius: 8,
          label: 'Massive Footprint',
          description: 'An enormous footprint, three times the size of a man\'s. In the Odyssey, the Cyclops Polyphemus was a one-eyed giant, son of Poseidon. When Odysseus blinded him to escape, Polyphemus cursed Odysseus — and Poseidon\'s wrath followed him across the sea.',
        },
        {
          x: r * 0.2, z: -r * 0.15, radius: 6,
          label: 'Sheep Pen',
          description: 'A crude stone enclosure for livestock. Polyphemus was a shepherd who kept flocks of sheep and goats. Odysseus and his men escaped the cave by clinging to the bellies of the giant\'s rams — one of the cleverest tricks in all of Greek mythology.',
        },
        {
          x: -r * 0.25, z: -r * 0.1, radius: 6,
          label: 'Cave Entrance',
          description: 'A dark cave mouth gapes in the hillside. When Polyphemus asked Odysseus his name, the hero replied "Nobody." So when the blinded Cyclops cried for help, he shouted "Nobody is hurting me!" and no one came. The Greeks called this kind of cleverness "metis" — cunning intelligence.',
        },
        {
          x: r * 0.3, z: r * 0.15, radius: 5,
          label: 'Sharpened Stake',
          description: 'A massive olive-wood stake, its tip hardened by fire. This is the weapon Odysseus used to blind Polyphemus. The olive tree appears again and again in the Odyssey — Odysseus\'s own marriage bed was carved from a living olive tree, a secret known only to him and Penelope.',
        },
        {
          x: -r * 0.1, z: r * 0.3, radius: 6,
          label: 'Coastal Rocks',
          description: 'Huge boulders lie along the shore. As Odysseus sailed away, Polyphemus hurled rocks at his ships. Ancient Greeks explained natural rock formations through myths. The concept of "hubris" — excessive pride — is central here: Odysseus couldn\'t resist shouting his real name, which let Polyphemus curse him.',
        },
      ];
    }

    if (label === 'Aeolus') {
      return [
        {
          x: 0, z: 0, radius: 7,
          label: 'Aeolus, Keeper of Winds',
          description: '"Welcome, Odysseus. I shall give you a gift — all the winds of the world, bound in a leather bag. Only the West Wind shall blow free, to carry you home." In the myth, Odysseus\'s crew opened the bag thinking it held treasure, and the released winds blew them back across the sea.',
        },
        {
          x: r * 0.2, z: r * 0.15, radius: 6,
          label: 'Wind Compass',
          description: 'A stone circle with carvings of the four winds. The Greeks personified the winds: Boreas (North), Notos (South), Euros (East), and Zephyros (West). The Tower of the Winds in Athens, built around 50 BC, is one of the world\'s first meteorological stations.',
        },
        {
          x: -r * 0.2, z: -r * 0.15, radius: 6,
          label: 'Navigation Chart',
          description: 'A carved stone map of sea routes. Greek sailors navigated by stars, winds, and landmarks. They rarely sailed out of sight of land. The Greeks mapped the Mediterranean, and Eratosthenes of Cyrene even calculated the Earth\'s circumference to remarkable accuracy around 240 BC.',
        },
        {
          x: r * 0.1, z: -r * 0.25, radius: 5,
          label: 'Bronze Astrolabe',
          description: 'A gleaming bronze instrument for reading the stars. The Greeks developed early astronomical instruments. Hipparchus created the first star catalog, and the Antikythera mechanism — found in a shipwreck — is an ancient analog computer that predicted eclipses and tracked the Olympics.',
        },
        {
          x: -r * 0.3, z: r * 0.1, radius: 6,
          label: 'Leather Wind Bag',
          description: 'A massive leather bag, tightly bound with silver cord. The story of the wind bag teaches about trust and temptation. It also reflects how the ancient Greeks understood weather — not as random chance, but as the work of gods who could be bargained with.',
        },
      ];
    }

    // Default content for unnamed islands
    return [
      {
        x: 0, z: 0, radius: 8,
        label: 'Ancient Ruins',
        description: 'Crumbling columns of a Greek temple. The ancient Greeks built temples not as places of congregation, but as houses for their gods. The Parthenon held a massive gold-and-ivory statue of Athena, patron goddess of Athens.',
      },
      {
        x: r * 0.2, z: r * 0.15, radius: 5,
        label: 'Mosaic Fragment',
        description: 'A fragment of a floor mosaic depicting Poseidon. In Greek mythology, Poseidon was god of the sea, earthquakes, and horses. Sailors made offerings to him before voyages. His trident could calm or stir the seas at will.',
      },
      {
        x: -r * 0.25, z: -r * 0.1, radius: 5,
        label: 'Carved Inscription',
        description: '"Xenos" — the Greek word for both "stranger" and "guest." The concept of "xenia," or guest-friendship, was sacred in ancient Greece. Zeus himself was "Zeus Xenios," protector of guests. Violating xenia could bring divine punishment.',
      },
    ];
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
      const strafe = this.input.getAxis('KeyD', 'KeyA');
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

    // ── NPC idle animation ──
    for (const npc of this.npcs) {
      npc.update(dt, this.time);
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
