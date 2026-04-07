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

    this.island = data.island;

    this.returnData = {
      shipPosition: data.shipPosition,
      shipHeading: data.shipHeading,
      questStage: data.questStage,
      questLabel: this.island.label || '',
    };
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

    // ── Lotus Eaters custom world ──
    this.lotusElements = [];
    this.pollenParticles = null;
    this.mistLayers = [];
    this.isLotusIsland = (this.island.label === 'Land of the Lotus Eaters');
    if (this.isLotusIsland) {
      this._buildLotusEatersWorld(sunPosition);
    }

    if (this.island.label === 'Cyclops Island') {
      this._buildCyclopsWorld(sunPosition);
    }

    if (this.island.label === 'Aeaea - Island of Circe') {
      this._buildCirceWorld(sunPosition);
    }

    this.input.reset();
    this.input.enablePointerLock();
  }

  _buildLotusEatersWorld(sunPosition) {
    const r = this.island.radius;

    // ── Override lighting to pastel dreamlike tones ──
    // Remove existing lights and replace
    this.scene.fog = new THREE.FogExp2(0xd8c0d8, 0.003); // lavender haze

    // Dreamy pastel ambient
    this.scene.add(new THREE.AmbientLight(0xc8a0c8, 0.6)); // lavender ambient
    this.scene.add(new THREE.HemisphereLight(0xe8c0e0, 0x8aaa6a, 0.5)); // pink sky, green ground

    // Warm golden sun with pink tint
    const lotusLight = new THREE.DirectionalLight(0xffd8c0, 2.0);
    lotusLight.position.set(40, 40, -30);
    this.scene.add(lotusLight);

    // Soft pink fill from behind
    const pinkFill = new THREE.DirectionalLight(0xffaacc, 0.5);
    pinkFill.position.set(-30, 20, 40);
    this.scene.add(pinkFill);

    // ── Winding path from beach to center ──
    // Path is a series of flat boxes with glowing material
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0xf5e8c8,
      emissive: 0xffcc66,
      emissiveIntensity: 0.5,
      roughness: 0.75,
    });
    const pathPoints = this._generateWindingPath(r);
    for (let i = 0; i < pathPoints.length; i++) {
      const p = pathPoints[i];
      const y = this.island.sampleHeight(p.x, p.z);
      if (y < 0.2) continue;
      // Main path segment — wider
      const pathSeg = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.06, 3.5),
        pathMat
      );
      pathSeg.position.set(p.x, y + 0.06, p.z);
      pathSeg.rotation.y = Math.atan2(
        (pathPoints[Math.min(i + 1, pathPoints.length - 1)].x - p.x),
        (pathPoints[Math.min(i + 1, pathPoints.length - 1)].z - p.z)
      );
      pathSeg.receiveShadow = true;
      this.scene.add(pathSeg);

      // Add a soft glow light every few segments
      if (i % 4 === 0) {
        const pathLight = new THREE.PointLight(0xffdd88, 0.8, 8);
        pathLight.position.set(p.x, y + 1, p.z);
        this.scene.add(pathLight);
      }
    }

    // ── Bioluminescent plants along the path ──
    const glowPlantMat = new THREE.MeshStandardMaterial({
      color: 0x88ffcc,
      emissive: 0x44ddaa,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.8,
    });
    const pinkPlantMat = new THREE.MeshStandardMaterial({
      color: 0xff88cc,
      emissive: 0xff66aa,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
    });
    for (let i = 0; i < pathPoints.length; i += 3) {
      const p = pathPoints[i];
      const y = this.island.sampleHeight(p.x, p.z);
      if (y < 0.5) continue;
      for (let side = -1; side <= 1; side += 2) {
        const offset = 2.5 + Math.random() * 2;
        const px = p.x + side * offset * Math.cos(i);
        const pz = p.z + side * offset * Math.sin(i);
        const py = this.island.sampleHeight(px, pz);

        const mat = Math.random() > 0.5 ? glowPlantMat : pinkPlantMat;
        // Stem
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.05, 0.6, 5),
          new THREE.MeshStandardMaterial({ color: 0x447744, roughness: 0.8 })
        );
        stem.position.set(px, py + 0.3, pz);
        this.scene.add(stem);

        // Glowing bulb
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 7, 5),
          mat
        );
        bulb.position.set(px, py + 0.7, pz);
        this.scene.add(bulb);
        this.lotusElements.push(bulb);

        // Tiny point light
        if (i % 6 === 0) {
          const plantLight = new THREE.PointLight(
            mat === glowPlantMat ? 0x44ddaa : 0xff66aa,
            0.5, 5
          );
          plantLight.position.set(px, py + 0.8, pz);
          this.scene.add(plantLight);
        }
      }
    }

    // ── Large lotus flowers in the central clearing ──
    const lotusFlowerMat = new THREE.MeshStandardMaterial({
      color: 0xffaadd,
      emissive: 0xff88bb,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.9,
    });
    const lotusCoreMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 1.0,
    });

    const lotusPositions = [
      { x: 0, z: 0 },
      { x: r * 0.08, z: r * 0.1 },
      { x: -r * 0.06, z: r * 0.08 },
      { x: r * 0.1, z: -r * 0.05 },
      { x: -r * 0.12, z: -r * 0.04 },
      { x: r * 0.03, z: -r * 0.12 },
      { x: -r * 0.08, z: r * 0.15 },
      { x: r * 0.15, z: r * 0.05 },
    ];

    for (const lp of lotusPositions) {
      const ly = this.island.sampleHeight(lp.x, lp.z);
      if (ly < 0.3) continue;
      const lotusGroup = new THREE.Group();
      lotusGroup.position.set(lp.x, ly, lp.z);

      // Stem
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.08, 1.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x448844, roughness: 0.8 })
      );
      stem.position.y = 0.6;
      lotusGroup.add(stem);

      // Petals — ring of angled planes
      for (let p = 0; p < 8; p++) {
        const angle = (p / 8) * Math.PI * 2;
        const petal = new THREE.Mesh(
          new THREE.PlaneGeometry(0.5, 0.8),
          lotusFlowerMat
        );
        petal.material = lotusFlowerMat.clone();
        petal.position.set(
          Math.cos(angle) * 0.3,
          1.3,
          Math.sin(angle) * 0.3
        );
        petal.rotation.y = -angle;
        petal.rotation.x = -0.5;
        lotusGroup.add(petal);
      }

      // Glowing core
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 6),
        lotusCoreMat
      );
      core.position.y = 1.3;
      lotusGroup.add(core);

      // Point light per flower
      const flowerLight = new THREE.PointLight(0xff88cc, 1.5, 8);
      flowerLight.position.y = 1.5;
      lotusGroup.add(flowerLight);

      this.scene.add(lotusGroup);
      this.lotusElements.push(lotusGroup);
    }

    // Central clearing glow disc
    const clearingGlow = new THREE.Mesh(
      new THREE.CircleGeometry(r * 0.2, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffccee,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      })
    );
    clearingGlow.rotation.x = -Math.PI / 2;
    clearingGlow.position.set(0, this.island.sampleHeight(0, 0) + 0.1, 0);
    this.scene.add(clearingGlow);

    // ── Floating pollen particle system ──
    const pollenCount = 200;
    const pollenGeo = new THREE.BufferGeometry();
    const pollenPositions = new Float32Array(pollenCount * 3);
    this._pollenData = [];
    for (let i = 0; i < pollenCount; i++) {
      const px = (Math.random() - 0.5) * r * 1.2;
      const pz = (Math.random() - 0.5) * r * 1.2;
      const py = this.island.sampleHeight(px, pz) + 1 + Math.random() * 4;
      pollenPositions[i * 3] = px;
      pollenPositions[i * 3 + 1] = Math.max(py, 1);
      pollenPositions[i * 3 + 2] = pz;
      this._pollenData.push({ x: px, y: Math.max(py, 1), z: pz, phase: Math.random() * Math.PI * 2 });
    }
    pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPositions, 3));
    const pollenMat = new THREE.PointsMaterial({
      color: 0xffeedd,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.pollenParticles = new THREE.Points(pollenGeo, pollenMat);
    this.scene.add(this.pollenParticles);

    // ── Mist layers that thicken toward the center ──
    for (let i = 0; i < 5; i++) {
      const dist = r * 0.1 + i * r * 0.08;
      const mistGeo = new THREE.CircleGeometry(r * 0.25 - i * 2, 24);
      mistGeo.rotateX(-Math.PI / 2);
      const mistMat = new THREE.MeshBasicMaterial({
        color: 0xe0c8e0,
        transparent: true,
        opacity: 0.06 + i * 0.02,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mist = new THREE.Mesh(mistGeo, mistMat);
      mist.position.set(
        (Math.random() - 0.5) * dist * 0.3,
        this.island.sampleHeight(0, 0) + 0.5 + i * 0.3,
        (Math.random() - 0.5) * dist * 0.3
      );
      this.scene.add(mist);
      this.mistLayers.push(mist);
    }

    // ── Dreamy palm trees with warm-tinted trunks ──
    const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.85 });
    const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x5aaa44, roughness: 0.7 });
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = r * 0.2 + Math.random() * r * 0.4;
      const px = Math.cos(angle) * dist;
      const pz = Math.sin(angle) * dist;
      const py = this.island.sampleHeight(px, pz);
      if (py < 0.5) continue;

      const palm = new THREE.Group();
      // Curved trunk
      const trunkHeight = 3 + Math.random() * 3;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.15, trunkHeight, 6),
        palmTrunkMat
      );
      trunk.position.y = trunkHeight / 2;
      // Slight lean
      trunk.rotation.z = (Math.random() - 0.5) * 0.2;
      trunk.rotation.x = (Math.random() - 0.5) * 0.15;
      palm.add(trunk);

      // Leaf fronds — radiating planes
      for (let f = 0; f < 7; f++) {
        const fAngle = (f / 7) * Math.PI * 2;
        const frond = new THREE.Mesh(
          new THREE.PlaneGeometry(0.6, 2.5),
          palmLeafMat
        );
        frond.material = palmLeafMat; // shared is fine
        frond.position.set(
          Math.cos(fAngle) * 0.5,
          trunkHeight + 0.3,
          Math.sin(fAngle) * 0.5
        );
        frond.rotation.y = -fAngle;
        frond.rotation.x = -0.8 - Math.random() * 0.4;
        palm.add(frond);
      }

      palm.position.set(px, py, pz);
      palm.castShadow = true;
      this.scene.add(palm);
    }
  }

  _buildCirceWorld(sunPosition) {
    const r = this.island.radius;

    // ── Enchanted forest atmosphere ──
    this.scene.fog = new THREE.FogExp2(0xc8b0d8, 0.0025); // purple-tinted mist

    // Magical purple ambient
    this.scene.add(new THREE.AmbientLight(0xb090c0, 0.5));
    this.scene.add(new THREE.HemisphereLight(0xd0a0e0, 0x5a7a3a, 0.4));

    // Warm golden light from Circe's palace
    const palaceLight = new THREE.PointLight(0xffa840, 4, r * 0.5);
    palaceLight.position.set(0, this.island.sampleHeight(0, 0) + 5, 0);
    this.scene.add(palaceLight);

    // ── Circe's Palace — stone structure at island center ──
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd0c8b8, roughness: 0.8, metalness: 0.05 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0xa09888, roughness: 0.85 });
    const purpleMat = new THREE.MeshStandardMaterial({ color: 0x8060a0, roughness: 0.6, emissive: 0x402060, emissiveIntensity: 0.15 });

    const cy = this.island.sampleHeight(0, 0);

    // Palace base platform
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 0.6, 12), stoneMat);
    platform.position.set(0, cy + 0.3, 0);
    platform.receiveShadow = true;
    this.scene.add(platform);

    // Palace columns in a circle
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 5, 8),
        stoneMat
      );
      col.position.set(Math.cos(angle) * 4.5, cy + 3, Math.sin(angle) * 4.5);
      col.castShadow = true;
      this.scene.add(col);
    }

    // Palace roof — flat disc
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5, 0.4, 12), darkStoneMat);
    roof.position.set(0, cy + 5.5, 0);
    this.scene.add(roof);

    // Purple magical glow around palace
    const glowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(7, 24),
      new THREE.MeshBasicMaterial({ color: 0x8844cc, transparent: true, opacity: 0.08, depthWrite: false })
    );
    glowDisc.rotation.x = -Math.PI / 2;
    glowDisc.position.set(0, cy + 0.1, 0);
    this.scene.add(glowDisc);

    // ── Magical floating particles (purple/gold) ──
    const sparkleCount = 120;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePos = new Float32Array(sparkleCount * 3);
    this._circleSparkleData = [];
    for (let i = 0; i < sparkleCount; i++) {
      const sx = (Math.random() - 0.5) * r * 0.6;
      const sz = (Math.random() - 0.5) * r * 0.6;
      const sy = this.island.sampleHeight(sx, sz) + 1 + Math.random() * 5;
      sparklePos[i * 3] = sx;
      sparklePos[i * 3 + 1] = Math.max(sy, 1);
      sparklePos[i * 3 + 2] = sz;
      this._circleSparkleData.push({ x: sx, y: Math.max(sy, 1), z: sz, phase: Math.random() * Math.PI * 2 });
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));
    const sparkleMat = new THREE.PointsMaterial({
      color: 0xcc88ff,
      size: 0.2,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this._circeParticles = new THREE.Points(sparkleGeo, sparkleMat);
    this.scene.add(this._circeParticles);

    // ── Glowing herb patches along paths ──
    const herbMat = new THREE.MeshStandardMaterial({
      color: 0x66dd88,
      emissive: 0x22aa44,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = r * 0.1 + Math.random() * r * 0.35;
      const hx = Math.cos(angle) * dist;
      const hz = Math.sin(angle) * dist;
      const hy = this.island.sampleHeight(hx, hz);
      if (hy < 0.5) continue;
      const herb = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 6, 4), herbMat);
      herb.position.set(hx, hy + 0.2, hz);
      herb.scale.y = 0.5;
      this.scene.add(herb);
    }
  }

  _generateWindingPath(radius) {
    const points = [];
    const steps = 50;
    // Path from edge (where player spawns) winding to center
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const dist = radius * 0.6 * (1 - t); // from outer to center
      const windAngle = t * Math.PI * 1.5 + 0.5; // spiral inward
      const x = Math.cos(windAngle) * dist;
      const z = Math.sin(windAngle) * dist;
      points.push({ x, z });
    }
    return points;
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
    } else if (label === 'Aeaea - Island of Circe') {
      // Circe — enchantress in flowing purple robes at her palace
      const circe = new Character({
        sunPosition,
        skinColor: 0xE0C0A0,
        armorColor: 0x7A3A8A,   // deep purple robes
        helmetColor: 0xC8A030,
        hasHelmet: false,
        hasCape: true,
        capeColor: 0x5A2A6A,
        hasSword: false,
        hasShield: false,
        scale: 0.85,
      });
      const cy = this.island.sampleHeight(0, 0);
      circe.setPosition(0, cy, 0);
      circe.addTo(this.scene);
      this.npcs.push(circe);

      // Handmaidens — 3 attendants around Circe
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + 0.5;
        const hx = Math.cos(angle) * r * 0.06;
        const hz = Math.sin(angle) * r * 0.06;
        const hy = this.island.sampleHeight(hx, hz);
        const maiden = new Character({
          sunPosition,
          skinColor: 0xD8B898,
          armorColor: 0xA088B0,   // lighter purple
          hasHelmet: false,
          hasCape: false,
          hasSword: false,
          hasShield: false,
          scale: 0.7,
        });
        maiden.setPosition(hx, hy, hz);
        maiden.setRotation(angle + Math.PI);
        maiden.addTo(this.scene);
        this.npcs.push(maiden);
      }

      // Enchanted animals (transformed men) — scattered around the clearing
      const animalPoses = [
        { x: r * 0.1, z: r * 0.08 },
        { x: -r * 0.12, z: r * 0.05 },
        { x: r * 0.08, z: -r * 0.1 },
        { x: -r * 0.06, z: -r * 0.12 },
        { x: r * 0.15, z: -r * 0.02 },
      ];
      for (const ap of animalPoses) {
        const ay = this.island.sampleHeight(ap.x, ap.z);
        if (ay < 0.5) continue;
        const pig = new Character({
          sunPosition,
          skinColor: 0xD8A088,   // pinkish
          armorColor: 0xD8A088,
          hasHelmet: false, hasCape: false, hasSword: false, hasShield: false,
          scale: 0.25,
        });
        pig.setPosition(ap.x, ay, ap.z);
        pig.setRotation(Math.random() * Math.PI * 2);
        pig.addTo(this.scene);
        this.npcs.push(pig);
      }
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

    if (label === 'Aeaea - Island of Circe') {
      return [
        {
          x: 0, z: 0, radius: 7,
          label: 'Circe, the Enchantress',
          description: '"Welcome, bold Odysseus. I have been expecting you." Circe was a powerful sorceress, daughter of the sun god Helios. She turned Odysseus\'s men into pigs with enchanted food and wine. Only Odysseus, protected by the herb moly given by Hermes, could resist her magic.',
        },
        {
          x: r * 0.1, z: r * 0.08, radius: 5,
          label: 'Enchanted Pig',
          description: 'This creature was once one of your crewmen. Circe\'s magic transformed them into swine, though they kept their human minds — aware of their fate but unable to speak. The myth reflects Greek fears about losing one\'s humanity to temptation and excess.',
        },
        {
          x: -r * 0.15, z: r * 0.12, radius: 6,
          label: 'Circe\'s Loom',
          description: 'A great loom stands in Circe\'s hall, weaving cloth of extraordinary beauty. In Greek mythology, weaving was both a domestic art and a symbol of power. Penelope wove and unwove a shroud for three years to delay her suitors — weaving as resistance.',
        },
        {
          x: r * 0.2, z: -r * 0.1, radius: 6,
          label: 'Herbal Garden',
          description: 'Strange herbs and flowers grow in ordered rows. Circe was a master of pharmakeia — the art of drugs and potions. The word "pharmacy" comes from this Greek root. Ancient Greeks used hundreds of plant-based remedies, many of which modern science has validated.',
        },
        {
          x: -r * 0.2, z: -r * 0.15, radius: 6,
          label: 'The Herb Moly',
          description: 'A small white flower with a black root — the legendary herb moly. Hermes gave this to Odysseus as protection against Circe\'s magic. Scholars have debated what real plant moly might represent — snowdrop (galanthus) is a leading candidate, as it contains galantamine, which blocks certain nerve agents.',
        },
        {
          x: r * 0.25, z: r * 0.15, radius: 5,
          label: 'Wine Mixing Bowl',
          description: 'An ornate krater filled with wine. Circe mixed her potions into wine to enchant visitors. Wine was central to Greek social life — they always diluted it with water. Drinking undiluted wine was considered barbaric. The symposium, a ritualized drinking party, was where philosophy and poetry flourished.',
        },
        {
          x: -r * 0.1, z: -r * 0.25, radius: 6,
          label: 'Map to the Underworld',
          description: 'Circe gave Odysseus instructions to visit the Underworld to consult the prophet Tiresias. She told him how to summon the dead with blood sacrifice. This journey to Hades — the "nekyia" — is one of the most haunting passages in all of ancient literature.',
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
          // Allow player to go further toward shore when near the ship
          const distToShipXZ = Math.sqrt(
            (this.playerPos.x - this.shipLocalPos.x) ** 2 +
            (this.playerPos.z - this.shipLocalPos.z) ** 2
          );
          const maxRadius = distToShipXZ < 20 ? this.island.radius * 1.1 : this.island.radius * 0.95;
          if (distFromCenter > maxRadius) {
            const scale = maxRadius / distFromCenter;
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

    // ── Lotus Eaters world animation ──
    if (this.isLotusIsland) {
      // Pulse lotus flowers and bioluminescent plants
      for (let i = 0; i < this.lotusElements.length; i++) {
        const el = this.lotusElements[i];
        if (el.isGroup) {
          // Lotus flower group — gentle sway
          el.rotation.y = Math.sin(this.time * 0.3 + i) * 0.05;
          // Pulse the lights inside
          el.children.forEach(child => {
            if (child.isLight) {
              child.intensity = 1.0 + Math.sin(this.time * 2 + i * 0.7) * 0.8;
            }
          });
        } else if (el.isMesh) {
          // Bioluminescent bulbs — pulse emissive
          if (el.material && el.material.emissiveIntensity !== undefined) {
            el.material.emissiveIntensity = 0.4 + Math.sin(this.time * 2.5 + i * 0.5) * 0.3;
          }
        }
      }

      // Animate pollen particles — gentle drift
      if (this.pollenParticles) {
        const pollenPos = this.pollenParticles.geometry.attributes.position;
        for (let i = 0; i < this._pollenData.length; i++) {
          const p = this._pollenData[i];
          p.x += Math.sin(this.time * 0.5 + p.phase) * dt * 0.3;
          p.y += Math.sin(this.time * 0.8 + p.phase * 2) * dt * 0.2;
          p.z += Math.cos(this.time * 0.4 + p.phase) * dt * 0.3;
          pollenPos.setXYZ(i, p.x, p.y, p.z);
        }
        pollenPos.needsUpdate = true;
      }

      // Drift mist layers
      for (let i = 0; i < this.mistLayers.length; i++) {
        const mist = this.mistLayers[i];
        mist.position.x += Math.sin(this.time * 0.3 + i) * dt * 0.2;
        mist.position.z += Math.cos(this.time * 0.25 + i * 2) * dt * 0.15;
        mist.material.opacity = 0.06 + i * 0.02 + Math.sin(this.time + i) * 0.01;
      }
    }

    // ── Circe world animation ──
    if (this._circeParticles) {
      const pos = this._circeParticles.geometry.attributes.position;
      for (let i = 0; i < this._circleSparkleData.length; i++) {
        const p = this._circleSparkleData[i];
        p.x += Math.sin(this.time * 0.6 + p.phase) * dt * 0.4;
        p.y += Math.sin(this.time * 0.9 + p.phase * 2) * dt * 0.3;
        p.z += Math.cos(this.time * 0.5 + p.phase) * dt * 0.4;
        pos.setXYZ(i, p.x, p.y, p.z);
      }
      pos.needsUpdate = true;
    }

    // ── Interaction checks ──
    this._updateInteractions();

    // ── Re-board ship check ──
    const distToShip = this.playerPos.distanceTo(this.shipLocalPos);
    if (distToShip < 18 && !this.activeInteraction) {
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
      if (distToShip >= 18) {
        this.hud.showInteraction(`Press E to examine: ${closestPoint.label}`);
      }
      if (this.input.justPressed('KeyE') && distToShip >= 18) {
        this._showDialogue(closestPoint.description);
        this.showingDialogue = true;
      }
    } else {
      this.activeInteraction = null;
      const distToShip = this.playerPos.distanceTo(this.shipLocalPos);
      if (distToShip >= 18) {
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
