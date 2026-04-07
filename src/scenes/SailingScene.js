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
          flatness: 0.6,
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
      {
        cellX: 0, cellZ: -3,
        options: {
          radius: 65, height: 30, seed: 4004, type: 'large',
          hasRuins: true, hasMagic: true, hasVegetation: true,
          label: 'Aeaea - Island of Circe',
          offsetX: 200, offsetZ: 200,
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

    // ── Ocean Points of Interest — floating educational markers ──
    this.oceanPOIs = [];
    const poiData = [
      {
        x: 80, z: -150,
        label: 'Floating Wreckage',
        description: 'Drifting timber from a merchant vessel. Greek triremes like yours were the warships of the ancient world — 170 oarsmen in three tiers powered these ships to ramming speed. The bronze ram at your bow could punch through an enemy hull.',
      },
      {
        x: -60, z: -200,
        label: 'Dolphins',
        description: 'A pod of dolphins leaps alongside your ship. The Greeks considered dolphins sacred to Apollo and Poseidon. Killing a dolphin was punishable by death in Athens. Sailors saw them as good omens — guides sent by the gods.',
      },
      {
        x: 150, z: -100,
        label: 'Merchant Vessel',
        description: 'A trading ship passes in the distance. Greek merchants carried olive oil, wine, and pottery across the Mediterranean. The ancient economy ran on sea trade — Athens imported most of its grain from the Black Sea colonies.',
      },
      {
        x: -30, z: -350,
        label: 'Floating Amphora',
        description: 'An amphora bobs in the waves, likely lost from a cargo ship. These clay jars were the shipping containers of the ancient world. Archaeologists can trace trade routes by mapping amphora finds across the Mediterranean seabed.',
      },
      {
        x: 200, z: -250,
        label: 'Sea Birds Circling',
        description: 'Birds circle overhead — a sign of land nearby. Greek sailors navigated without compasses, using stars, wind patterns, and wildlife. Experienced helmsmen could read wave patterns reflected off distant islands.',
      },
      {
        x: -100, z: -120,
        label: 'Strange Current',
        description: 'The water swirls with an unusual current. The Greeks knew the Mediterranean\'s currents well. Odysseus\'s wanderings may reflect real sailing challenges — the Strait of Messina\'s whirlpool inspired Charybdis, and its rocky shores became Scylla.',
      },
      {
        x: 50, z: -450,
        label: 'Distant Smoke',
        description: 'Smoke rises from beyond the horizon. Fire signals were used across the Greek world for long-distance communication. According to Aeschylus, the fall of Troy was announced to Mycenae through a chain of signal fires stretching across the Aegean.',
      },
      {
        x: -150, z: -300,
        label: 'Offering to Poseidon',
        description: 'You pass a spot where the sea seems to glow. Sailors would pour wine into the sea as a libation to Poseidon before voyages. Prayer and sacrifice were as essential to Greek sailing as wind and oars.',
      },
    ];

    for (const poi of poiData) {
      const markerGroup = new THREE.Group();
      markerGroup.position.set(poi.x, 0, poi.z);

      if (poi.label === 'Floating Wreckage') {
        // Broken wood planks floating
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x6B4C30, roughness: 0.9 });
        for (let i = 0; i < 5; i++) {
          const plank = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 2 + Math.random()), woodMat);
          plank.position.set((Math.random() - 0.5) * 4, 0.3, (Math.random() - 0.5) * 4);
          plank.rotation.y = Math.random() * Math.PI;
          plank.rotation.z = (Math.random() - 0.5) * 0.3;
          markerGroup.add(plank);
        }
        // Torn sail cloth
        const clothMat = new THREE.MeshStandardMaterial({ color: 0xD8CDB8, roughness: 0.8, side: THREE.DoubleSide });
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.5, 4, 3), clothMat);
        cloth.position.set(0.5, 0.5, 0);
        cloth.rotation.x = -0.3;
        markerGroup.add(cloth);

      } else if (poi.label === 'Dolphins') {
        // 3 dolphin shapes — curved cylinders arcing out of water
        const dolphinMat = new THREE.MeshStandardMaterial({ color: 0x5A7A8A, roughness: 0.4, metalness: 0.1 });
        for (let i = 0; i < 3; i++) {
          const dolphinGroup = new THREE.Group();
          // Body
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 2.5, 8), dolphinMat);
          body.rotation.z = Math.PI / 2;
          dolphinGroup.add(body);
          // Nose
          const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 6), dolphinMat);
          nose.rotation.z = -Math.PI / 2;
          nose.position.x = 1.5;
          dolphinGroup.add(nose);
          // Tail fin
          const tailGeo = new THREE.BoxGeometry(0.05, 0.5, 0.8);
          const tail = new THREE.Mesh(tailGeo, dolphinMat);
          tail.position.x = -1.3;
          dolphinGroup.add(tail);
          // Dorsal fin
          const dorsalGeo = new THREE.BoxGeometry(0.5, 0.4, 0.05);
          const dorsal = new THREE.Mesh(dorsalGeo, dolphinMat);
          dorsal.position.y = 0.35;
          dolphinGroup.add(dorsal);
          // Position in arc
          dolphinGroup.position.set(i * 2.5 - 2.5, 0.8 + Math.sin(i * 1.2) * 1.5, i * 0.5);
          dolphinGroup.rotation.z = 0.3 - i * 0.15;
          dolphinGroup.scale.setScalar(0.8);
          markerGroup.add(dolphinGroup);
        }

      } else if (poi.label === 'Merchant Vessel') {
        // Small distant boat silhouette
        const boatMat = new THREE.MeshStandardMaterial({ color: 0x5A4030, roughness: 0.85 });
        const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1.5), boatMat);
        hull.position.y = 0.8;
        markerGroup.add(hull);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4, 4), boatMat);
        mast.position.set(0, 3, 0);
        markerGroup.add(mast);
        const sailMat = new THREE.MeshStandardMaterial({ color: 0xE8DCC4, roughness: 0.7, side: THREE.DoubleSide });
        const sail = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.5), sailMat);
        sail.position.set(0, 3, 0.3);
        markerGroup.add(sail);
        markerGroup.scale.setScalar(1.2);

      } else if (poi.label === 'Floating Amphora') {
        // Clay amphora jar shape
        const clayMat = new THREE.MeshStandardMaterial({ color: 0xB8784A, roughness: 0.85 });
        // Body — tapered cylinder
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.25, 1.5, 8), clayMat);
        body.position.y = 1;
        markerGroup.add(body);
        // Neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.35, 0.5, 8), clayMat);
        neck.position.y = 1.9;
        markerGroup.add(neck);
        // Rim
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 12), clayMat);
        rim.position.y = 2.15;
        rim.rotation.x = Math.PI / 2;
        markerGroup.add(rim);
        // Handles
        for (let side = -1; side <= 1; side += 2) {
          const handleGeo = new THREE.TorusGeometry(0.2, 0.04, 6, 8, Math.PI);
          const handle = new THREE.Mesh(handleGeo, clayMat);
          handle.position.set(side * 0.45, 1.5, 0);
          handle.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          markerGroup.add(handle);
        }
        // Tilt it as if floating
        markerGroup.rotation.z = 0.4;
        markerGroup.rotation.x = 0.15;

      } else if (poi.label === 'Sea Birds Circling') {
        // Simple bird shapes — V-shaped wings
        const birdMat = new THREE.MeshStandardMaterial({ color: 0xEEEEEE, roughness: 0.6 });
        for (let i = 0; i < 5; i++) {
          const birdGroup = new THREE.Group();
          const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.3), birdMat);
          wingL.position.x = -0.3;
          wingL.rotation.z = 0.3;
          birdGroup.add(wingL);
          const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.3), birdMat);
          wingR.position.x = 0.3;
          wingR.rotation.z = -0.3;
          birdGroup.add(wingR);
          const bodyB = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 4), birdMat);
          bodyB.rotation.x = Math.PI / 2;
          birdGroup.add(bodyB);
          const angle = (i / 5) * Math.PI * 2;
          birdGroup.position.set(Math.cos(angle) * 3, 6 + i * 0.5, Math.sin(angle) * 3);
          birdGroup.rotation.y = angle + Math.PI / 2;
          markerGroup.add(birdGroup);
        }

      } else if (poi.label === 'Strange Current') {
        // Swirling water — torus rings at water level
        const waterMat = new THREE.MeshBasicMaterial({ color: 0x20A0B0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
        for (let i = 0; i < 3; i++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(2 + i * 1.5, 0.15, 6, 24), waterMat);
          ring.position.y = 0.3;
          ring.rotation.x = Math.PI / 2;
          markerGroup.add(ring);
        }

      } else if (poi.label === 'Distant Smoke') {
        // Smoke column — translucent vertical cylinder
        const smokeMat = new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
        const smokeCol = new THREE.Mesh(new THREE.CylinderGeometry(1, 2.5, 15, 8, 1, true), smokeMat);
        smokeCol.position.y = 8;
        markerGroup.add(smokeCol);
        // Ember glow at base
        const emberMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.15, depthWrite: false });
        const ember = new THREE.Mesh(new THREE.CircleGeometry(2, 12), emberMat);
        ember.rotation.x = -Math.PI / 2;
        ember.position.y = 0.5;
        markerGroup.add(ember);

      } else if (poi.label === 'Offering to Poseidon') {
        // Glowing trident shape + blue glow
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xC8A030, roughness: 0.3, metalness: 0.7, emissive: 0x4488FF, emissiveIntensity: 0.3 });
        // Shaft
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 6), goldMat);
        shaft.position.y = 2.5;
        markerGroup.add(shaft);
        // Three prongs
        for (let p = -1; p <= 1; p++) {
          const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.2, 5), goldMat);
          prong.position.set(p * 0.3, 4.8, 0);
          markerGroup.add(prong);
          // Prong tip
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 5), goldMat);
          tip.position.set(p * 0.3, 5.5, 0);
          markerGroup.add(tip);
        }
        // Blue glow
        const blueMat = new THREE.MeshBasicMaterial({ color: 0x2266FF, transparent: true, opacity: 0.15, depthWrite: false });
        const glow = new THREE.Mesh(new THREE.CircleGeometry(3, 16), blueMat);
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.3;
        markerGroup.add(glow);

      } else {
        // Fallback — small golden sphere
        const fallbackGeo = new THREE.SphereGeometry(1, 10, 8);
        const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffa500, emissiveIntensity: 0.3, transparent: true, opacity: 0.7 });
        markerGroup.add(new THREE.Mesh(fallbackGeo, fallbackMat));
      }

      this.scene.add(markerGroup);

      // Subtle point light for visibility
      const light = new THREE.PointLight(0xffd700, 1, 20);
      light.position.set(poi.x, 3, poi.z);
      this.scene.add(light);

      this.oceanPOIs.push({ marker: markerGroup, light, ...poi });
    }

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

    // Quest progression — follows the Odyssey
    this.questStages = [
      { objective: 'Sail to the Land of the Lotus Eaters', target: { x: 200, z: -300 }, label: 'Land of the Lotus Eaters' },
      { objective: 'Sail to the Island of the Cyclops', target: { x: -250, z: -600 }, label: 'Cyclops Island' },
      { objective: 'Seek Aeolus, Keeper of the Winds', target: { x: 700, z: -650 }, label: 'Aeolus' },
      { objective: 'Find the sorceress Circe on Aeaea', target: { x: 200, z: -1000 }, label: 'Aeaea - Island of Circe' },
    ];

    // Restore quest stage if returning from island, otherwise start from saved or 0
    this.currentQuestStage = (data && data.questStage !== undefined) ? data.questStage : 0;
    this._updateQuest();

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

    this.input.reset();
    this.input.enablePointerLock();

    // Restore ship position if returning from island exploration
    if (data && data.shipPosition) {
      this.ship.group.position.copy(data.shipPosition);
      this.ship.heading = data.shipHeading || 0;
      this.ship.group.rotation.y = this.ship.heading;

      // Advance quest if player visited the current quest's target island
      if (data.questLabel && this.currentQuestStage < this.questStages.length) {
        if (data.questLabel === this.questStages[this.currentQuestStage].label) {
          this.currentQuestStage++;
          this._updateQuest();
        }
      }
    }
  }

  _updateQuest() {
    if (this.currentQuestStage < this.questStages.length) {
      const quest = this.questStages[this.currentQuestStage];
      this.questLog.setObjective(quest.objective);
      this.questTarget = quest.target;
      this.minimap.setQuestTarget(this.questTarget);
    } else {
      this.questLog.setObjective('Explore the wine-dark sea...');
      this.questTarget = { x: 0, z: -1000 };
      this.minimap.setQuestTarget(this.questTarget);
    }
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

    // ── Ocean POI proximity + animation ──
    let nearPOI = false;
    if (this._showingPOI) {
      nearPOI = true;
      // Dismiss on next E press (not the same frame that opened it)
      if (this.input.justPressed('KeyE') || this.input.justPressed('Space')) {
        const overlay = document.getElementById('cutscene-overlay');
        const textEl = document.getElementById('cutscene-text');
        overlay.classList.add('hidden');
        textEl.classList.remove('visible');
        this._showingPOI = false;
      }
    } else {
      for (const poi of this.oceanPOIs) {
        // Bob animation
        poi.marker.position.y = Math.sin(this.time * 1.5 + poi.x) * 0.4;
        poi.marker.rotation.y += dt * 0.3;

        // Spin whirlpool rings
        if (poi.label === 'Strange Current') {
          for (const child of poi.marker.children) {
            child.rotation.z += dt * (0.5 + (child.geometry?.parameters?.radius || 0) * 0.1);
          }
        }

        // Check proximity
        const dx = shipPos.x - poi.x;
        const dz = shipPos.z - poi.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 25) {
          nearPOI = true;
          this.hud.showInteraction(`Press E: ${poi.label}`);
          if (this.input.justPressed('KeyE')) {
            const overlay = document.getElementById('cutscene-overlay');
            const textEl = document.getElementById('cutscene-text');
            const skipEl = document.getElementById('cutscene-skip');
            overlay.classList.remove('hidden');
            textEl.textContent = poi.description;
            textEl.classList.add('visible');
            skipEl.textContent = 'Press E to continue';
            this._showingPOI = true;
          }
        }
      }
    }

    // ── Island proximity — disembark prompt ──
    if (!nearPOI && !this._showingPOI) {
      const nearest = this.islandManager.getNearestIsland(shipPos.x, shipPos.z);
      if (nearest && nearest.shoreDistance < 20) {
        this.hud.showInteraction('Press E to disembark');
        if (this.input.justPressed('KeyE')) {
          this.sceneManager.switchTo('islandExploration', {
            island: nearest.entry.island,
            islandData: nearest.entry.data,
            islandWorldX: nearest.entry.worldX,
            islandWorldZ: nearest.entry.worldZ,
            shipPosition: shipPos.clone(),
            shipHeading: this.ship.heading,
            questStage: this.currentQuestStage,
            questLabel: nearest.entry.data.label || '',
          });
        }
      } else {
        this.hud.hideInteraction();
      }
    }
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
