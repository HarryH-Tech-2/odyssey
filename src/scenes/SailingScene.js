import * as THREE from 'three';
import { GameScene } from '../engine/SceneManager.js';
import { Ocean } from '../entities/Ocean.js';
import { Sky } from '../entities/Sky.js';
import { Ship } from '../entities/Ship.js';
import { Character } from '../entities/Character.js';
import { IslandManager } from '../entities/IslandManager.js';
import { NPCShip } from '../entities/NPCShip.js';
import { SeabirdFlock, SeaSpray } from '../entities/Particles.js';
import { HUD } from '../ui/HUD.js';
import { HealthBar } from '../ui/HealthBar.js';
import { Compass } from '../ui/Compass.js';
import { Minimap } from '../ui/Minimap.js';
import { QuestLog } from '../ui/QuestLog.js';
import { SailingHUD } from '../ui/SailingHUD.js';
import { createPostProcessing } from '../shaders/postprocessing.js';
import { PLAYER } from '../utils/constants.js';

export class SailingScene extends GameScene {
  constructor(renderer, input, sceneManager) {
    super(renderer, input, sceneManager);
  }

  async enter(data) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.time = 0;

    this.sunPosition = new THREE.Vector3(100, 40, -80);

    // ── Lighting ──
    const sunLight = new THREE.DirectionalLight(0xfff0dd, 2.5);
    sunLight.position.copy(this.sunPosition);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    this.scene.add(sunLight);
    this.scene.add(new THREE.AmbientLight(0x4466aa, 0.4));

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x2a4a2a, 0.3);
    this.scene.add(hemiLight);

    // Distance fog for sense of scale
    this.scene.fog = new THREE.FogExp2(0x8aaabe, 0.0008);

    // ── Environment ──
    this.ocean = new Ocean(this.sunPosition);
    this.ocean.addTo(this.scene);

    this.sky = new Sky(this.sunPosition);
    this.sky.addTo(this.scene);

    // ── Player ship ──
    this.ship = new Ship(this.sunPosition);
    this.ship.addTo(this.scene);

    this.odysseus = new Character({
      sunPosition: this.sunPosition,
      scale: 0.8,
      armorColor: 0xB8860B,
      capeColor: 0xCC0000,
    });
    this.odysseus.setPosition(-5, 3.8, 0);
    this.ship.meshGroup.add(this.odysseus.group);

    this.crew = [];
    const crewColors = [0x8B6914, 0x6B8E23, 0x8B4513, 0x8B6914, 0x6B8E23, 0x8B4513];
    for (let i = 0; i < 6; i++) {
      const c = new Character({
        sunPosition: this.sunPosition,
        armorColor: crewColors[i],
        hasHelmet: false,
        hasCape: false,
        hasSword: false,
        scale: 0.65,
      });
      c.setPosition(-3 + i * 1.3, 3.1, (i % 2 === 0 ? 0.5 : -0.5));
      this.ship.meshGroup.add(c.group);
      this.crew.push(c);
    }

    // ── Island Manager — infinite procedural world ──
    // Story islands placed at specific grid cells
    const storyIslands = [
      {
        cellX: 0, cellZ: -1,
        options: {
          radius: 70, height: 40, seed: 1001, type: 'large',
          hasRuins: true, hasMagic: true, hasVegetation: true,
          label: 'Land of the Lotus Eaters',
          offsetX: 200, offsetZ: 100,
        },
      },
      {
        cellX: -1, cellZ: -2,
        options: {
          radius: 100, height: 70, seed: 2002, type: 'large',
          hasRuins: false, hasMagic: false, hasVegetation: true,
          label: 'Cyclops Island',
          offsetX: 150, offsetZ: 200,
        },
      },
      {
        cellX: 1, cellZ: -2,
        options: {
          radius: 50, height: 36, seed: 3003, type: 'medium',
          hasRuins: true, hasMagic: true, hasVegetation: true,
          label: 'Aeolus',
          offsetX: 300, offsetZ: 150,
        },
      },
    ];

    this.islandManager = new IslandManager(this.scene, this.sunPosition, 42, storyIslands);

    // ── NPC Ships ──
    this.npcShips = [];

    const merchant = new NPCShip(this.sunPosition, {
      waypoints: [
        { x: 60, z: -80 },
        { x: 120, z: -200 },
        { x: 80, z: -320 },
        { x: -20, z: -250 },
        { x: -40, z: -120 },
      ],
      speed: 6,
      crewCount: 3,
    });
    merchant.ship.group.position.set(60, 0, -80);
    merchant.addTo(this.scene);
    this.npcShips.push(merchant);

    const fisher = new NPCShip(this.sunPosition, {
      waypoints: [
        { x: 160, z: -260 },
        { x: 230, z: -280 },
        { x: 240, z: -340 },
        { x: 180, z: -350 },
        { x: 150, z: -300 },
      ],
      speed: 4,
      crewCount: 2,
    });
    fisher.ship.group.position.set(160, 0, -260);
    fisher.addTo(this.scene);
    this.npcShips.push(fisher);

    // ── Particles ──
    this.birds = new SeabirdFlock(15);
    this.birds.addTo(this.scene);

    this.seaSpray = new SeaSpray(60);
    this.seaSpray.addTo(this.scene);

    // ── Post-processing ──
    this.postProcessing = createPostProcessing(this.renderer, this.scene, this.camera);

    // ── UI ──
    this.hud = new HUD();
    this.hud.show();
    this.healthBar = new HealthBar();
    this.compass = new Compass();
    this.minimap = new Minimap();
    this.questLog = new QuestLog();
    this.sailingHUD = new SailingHUD();
    this.sailingHUD.show();

    this.questLog.setObjective('Sail to the Land of the Lotus Eaters');

    // Quest target: Lotus Eaters island world position
    this.questTarget = { x: 200, z: -300 };
    this.minimap.setQuestTarget(this.questTarget);

    // Player state
    this.health = PLAYER.maxHealth;
    this.stamina = PLAYER.maxStamina;
    this.crewCount = 45;
    this.windAngle = Math.PI * 0.25;
    this.sailTrim = 0.8;

    // Camera
    this.cameraDistance = 30;
    this.cameraHeight = 14;
    this.cameraAngle = 0;

    this.input.enablePointerLock();
  }

  async exit() {
    this.hud.hide();
    this.sailingHUD.hide();
    this.questLog.hide();
    this.input.disablePointerLock();
  }

  update(dt) {
    this.time += dt;
    const shipPos = this.ship.getPosition();

    // ── Ship ──
    this.ship.update(dt, this.time, this.ocean, this.input);

    // Characters
    this.odysseus.update(dt, this.time);
    for (const c of this.crew) c.update(dt, this.time);

    // NPC ships
    for (const npc of this.npcShips) {
      npc.update(dt, this.time, this.ocean);
    }

    // ── Dynamic island generation ──
    this.islandManager.updatePlayerPosition(shipPos.x, shipPos.z);
    this.islandManager.update(this.time);

    // ── Environment ──
    this.ocean.update(dt, this.time, this.camera.position);
    this.sky.update(dt, this.time);

    // Move ocean mesh to follow player (infinite ocean illusion)
    this.ocean.mesh.position.x = Math.floor(shipPos.x / 200) * 200;
    this.ocean.mesh.position.z = Math.floor(shipPos.z / 200) * 200;

    // ── Particles ──
    this.birds.update(this.time, shipPos);
    this.seaSpray.update(dt, shipPos, this.ship.speed);

    // ── Camera ──
    const mouseDelta = this.input.getMouseDelta();
    this.cameraAngle += mouseDelta.x * 0.003;

    const camOffset = new THREE.Vector3(
      Math.sin(this.cameraAngle + this.ship.heading) * this.cameraDistance,
      this.cameraHeight,
      Math.cos(this.cameraAngle + this.ship.heading) * this.cameraDistance
    );

    this.camera.position.lerp(shipPos.clone().add(camOffset), dt * 3);
    this.camera.lookAt(shipPos.x, shipPos.y + 5, shipPos.z);

    // ── UI ──
    this.healthBar.setHealth(this.health / PLAYER.maxHealth);
    this.healthBar.setStamina(this.stamina / PLAYER.maxStamina);

    // Compass — point toward quest target
    const qAngle = Math.atan2(
      this.questTarget.x - shipPos.x,
      this.questTarget.z - shipPos.z
    );
    const qDist = Math.sqrt(
      (this.questTarget.x - shipPos.x) ** 2 +
      (this.questTarget.z - shipPos.z) ** 2
    );
    this.compass.update(
      this.ship.heading,
      `Lotus Eaters (${Math.round(qDist)}m)`,
      qAngle
    );

    // Minimap — show dynamically generated islands + NPC ships
    const islandMarkers = this.islandManager.getIslandMarkers();
    const npcMarkers = this.npcShips.map(npc => {
      const p = npc.getPosition();
      return { x: p.x, z: p.z, color: '#aaa', size: 3 };
    });
    this.minimap.setMarkers([...islandMarkers, ...npcMarkers]);
    this.minimap.update(shipPos.x, shipPos.z, this.ship.heading);

    this.sailingHUD.update(this.windAngle, this.sailTrim, this.crewCount);
  }

  render(renderer) {
    this.postProcessing.render();
  }

  onResize(width, height) {
    super.onResize(width, height);
    if (this.postProcessing) {
      this.postProcessing.resize(width, height);
    }
  }
}
