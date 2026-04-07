# Island Exploration Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable disembarking at islands and exploring on foot, with larger islands, more colorful ship/characters, reversed W/S keys, and shields removed from the ship.

**Architecture:** Quick ship visual fixes first (colors, shields, controls), then island size increases, then the new IslandExplorationScene with third-person character controller, ground following, and interaction system. The scene transitions via SceneManager, passing island/ship state as data.

**Tech Stack:** Three.js, vanilla JS modules, existing ShaderLib/InputManager/SceneManager

---

### Task 1: Reverse W/S keys and remove shields from ship

**Files:**
- Modify: `src/entities/Ship.js:843` (swap W/S axis)
- Modify: `src/entities/Ship.js:134` (remove `_buildShields()` call)
- Modify: `src/entities/Ship.js:271-335` (delete `_buildShields` method)
- Modify: `src/entities/Ship.js:99-112` (delete `getShieldGeometry` function)
- Modify: `src/entities/Ship.js:43-44` (delete `_shieldGeo` variable)

- [ ] **Step 1: Reverse W/S keys**

In `src/entities/Ship.js` at line 843, change:
```js
const forward = input.getAxis('KeyS', 'KeyW');
```
to:
```js
const forward = input.getAxis('KeyW', 'KeyS');
```

- [ ] **Step 2: Remove shields**

In `src/entities/Ship.js`:

1. Delete the line `this._buildShields();` (line 134)
2. Delete the entire `_buildShields()` method (lines 271-335)
3. Delete the `getShieldGeometry()` function (lines 99-112)
4. Delete `let _shieldGeo = null;` (line 43)

- [ ] **Step 3: Verify the game loads**

Run: Open browser at http://localhost:3001
Expected: Ship renders without shields on sides, W key moves backward, S key moves forward.

- [ ] **Step 4: Commit**

```bash
git add src/entities/Ship.js
git commit -m "feat: reverse W/S keys, remove shields from ship hull"
```

---

### Task 2: More colorful ship and characters

**Files:**
- Modify: `src/entities/Ship.js:18-37` (update palette colors)
- Modify: `src/entities/Ship.js:372` (sail color)
- Modify: `src/scenes/SailingScene.js:61-81` (character colors)

- [ ] **Step 1: Update ship palette colors**

In `src/entities/Ship.js`, update the `makePalette` function (lines 18-37). Replace the palette return object:

```js
  return {
    hullDark:    m(0x6B3A2A, 0.82, 0.04),   // richer warm brown
    hullMid:     m(0x8B5E3C, 0.80, 0.05),   // warmer mid-brown
    hullLight:   m(0x9A6B42, 0.78, 0.06),   // golden brown
    deck:        m(0xC4A872, 0.90, 0.00),   // lighter warm deck
    deckLine:    m(0xA08050, 0.92, 0.00),   // plank gaps
    accentRed:   m(0xCC2222, 0.70, 0.10),   // brighter red
    accentGold:  m(0xB8860B, 0.35, 0.60),   // gold trim (unchanged)
    accentBlue:  m(0x1A3A6A, 0.65, 0.15),   // Greek blue (unchanged)
    bronze:      m(0x8B7D3C, 0.40, 0.70),   // ram, fittings (unchanged)
    rope:        m(0x6B5535, 0.92, 0.00),   // rigging (unchanged)
    wood:        m(0x4A3020, 0.90, 0.00),   // mast, yard (unchanged)
    white:       m(0xFFF8E8, 0.30, 0.00),   // eyes (unchanged)
    black:       m(0x0A0A0A, 0.20, 0.00),   // pupils (unchanged)
    skin:        m(0xD4A574, 0.70, 0.00),   // figurehead (unchanged)
  };
```

- [ ] **Step 2: Update sail color**

In `src/entities/Ship.js` line 372, change:
```js
this.sailMaterial.uniforms.uColor.value.set(0x2A1A0A); // Dark sail
```
to:
```js
this.sailMaterial.uniforms.uColor.value.set(0xF5E6C8); // Warm cream sail
```

- [ ] **Step 3: Update Odysseus colors**

In `src/scenes/SailingScene.js` lines 61-66, update Odysseus constructor:
```js
this.odysseus = new Character({
  sunPosition: this.sunPosition,
  scale: 0.8,
  armorColor: 0xB8860B,
  capeColor: 0xCC0000,
});
```

- [ ] **Step 4: Update crew colors**

In `src/scenes/SailingScene.js` lines 69-80, vary crew armor colors:
```js
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
```

- [ ] **Step 5: Verify visually**

Run: Open browser at http://localhost:3001
Expected: Ship hull is warmer/brighter brown, sail is cream colored, Odysseus has gold armor and bright red cape, crew have varied bronze/olive/brown armor.

- [ ] **Step 6: Commit**

```bash
git add src/entities/Ship.js src/scenes/SailingScene.js
git commit -m "feat: more colorful ship, sail, and character colors"
```

---

### Task 3: Make islands larger

**Files:**
- Modify: `src/entities/IslandManager.js:104-118` (double procedural island sizes)
- Modify: `src/scenes/SailingScene.js:85-113` (double story island sizes)

- [ ] **Step 1: Double procedural island radius/height ranges**

In `src/entities/IslandManager.js`, replace lines 104-118:
```js
    const sizeRoll = rng.next();
    let type, radius, height;
    if (sizeRoll < 0.3) {
      type = 'small';
      radius = rng.range(16, 36);
      height = rng.range(10, 20);
    } else if (sizeRoll < 0.75) {
      type = 'medium';
      radius = rng.range(40, 70);
      height = rng.range(20, 40);
    } else {
      type = 'large';
      radius = rng.range(70, 110);
      height = rng.range(36, 60);
    }
```

- [ ] **Step 2: Double story island sizes**

In `src/scenes/SailingScene.js`, update the storyIslands array (lines 85-113):

Lotus Eaters: `radius: 70, height: 40`
Cyclops Island: `radius: 100, height: 70`
Aeolus: `radius: 50, height: 36`

Full replacement for the storyIslands array:
```js
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
```

- [ ] **Step 3: Verify**

Run: Open browser, sail to islands.
Expected: Islands are noticeably larger — roughly twice previous size.

- [ ] **Step 4: Commit**

```bash
git add src/entities/IslandManager.js src/scenes/SailingScene.js
git commit -m "feat: double island sizes for better exploration"
```

---

### Task 4: Add proximity detection and disembark prompt in SailingScene

**Files:**
- Modify: `src/entities/IslandManager.js` (add `getNearestIsland` method)
- Modify: `src/scenes/SailingScene.js` (add proximity check + E key handling in update)

- [ ] **Step 1: Add getNearestIsland to IslandManager**

Add this method at the end of the `IslandManager` class in `src/entities/IslandManager.js`, after `getIslandMarkers()`:

```js
  /** Find the nearest island to a world position, with distance */
  getNearestIsland(x, z) {
    let nearest = null;
    let minDist = Infinity;
    for (const [, entry] of this.loaded) {
      if (!entry || !entry.island) continue;
      const dx = entry.worldX - x;
      const dz = entry.worldZ - z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const shoreDistance = dist - entry.data.radius;
      if (shoreDistance < minDist) {
        minDist = shoreDistance;
        nearest = entry;
      }
    }
    return nearest ? { entry: nearest, shoreDistance: minDist } : null;
  }
```

- [ ] **Step 2: Add disembark logic to SailingScene.update**

In `src/scenes/SailingScene.js`, add proximity check and transition logic at the end of the `update` method, before the closing `}`, after `this.sailingHUD.update(...)`:

```js
    // ── Island proximity — disembark prompt ──
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
        });
      }
    } else {
      this.hud.hideInteraction();
    }
```

- [ ] **Step 3: Verify prompt appears**

Run: Sail near an island.
Expected: "Press E to disembark" prompt appears when within ~20 units of shore. (E key won't work yet — scene not registered.)

- [ ] **Step 4: Commit**

```bash
git add src/entities/IslandManager.js src/scenes/SailingScene.js
git commit -m "feat: island proximity detection and disembark prompt"
```

---

### Task 5: Expose island heightmap sampling as a public method

**Files:**
- Modify: `src/entities/Island.js:290` (rename `_sampleHeight` → `sampleHeight`, make public)

- [ ] **Step 1: Make sampleHeight public**

In `src/entities/Island.js`, rename the method `_sampleHeight` to `sampleHeight` on line 290:

```js
  /** Sample terrain height at local (x,z) — used for placing objects and character ground following */
  sampleHeight(x, z) {
```

- [ ] **Step 2: Update all internal callers**

Replace all `this._sampleHeight` calls with `this.sampleHeight` in the same file. These occur at lines:
- 336: `const y = this._sampleHeight(x, z);` → `const y = this.sampleHeight(x, z);`
- 379: `const y = this._sampleHeight(x, z);` → `const y = this.sampleHeight(x, z);`
- 425: `const y = this._sampleHeight(x, z);` → `const y = this.sampleHeight(x, z);`
- 448: `const py = this._sampleHeight(cx, cz);` → `const py = this.sampleHeight(cx, cz);`
- 495: `orb.position.set(bx, this._sampleHeight(bx, bz) + 1.5, bz);` → `orb.position.set(bx, this.sampleHeight(bx, bz) + 1.5, bz);`

- [ ] **Step 3: Commit**

```bash
git add src/entities/Island.js
git commit -m "refactor: make Island.sampleHeight public for ground following"
```

---

### Task 6: Create IslandExplorationScene

**Files:**
- Create: `src/scenes/IslandExplorationScene.js`

This is the core new scene. It receives island data from SailingScene, renders the island, places Odysseus on the beach, and provides third-person camera + WASD movement.

- [ ] **Step 1: Create the scene file**

Create `src/scenes/IslandExplorationScene.js`:

```js
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
    // The island group is already built; re-add it here at the world origin
    // (we center the exploration scene on the island)
    this.islandGroup = this.island.group.clone();
    this.scene.add(this.islandGroup);

    // ── Static ship at shore ──
    this.staticShip = new Ship(sunPosition, true);
    this.staticShip.addTo(this.scene);
    // Position ship relative to island center
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
    this.cameraAzimuth = this.playerHeading + Math.PI; // Behind player
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

    // If island has ruins, add an interaction point at the ruins cluster
    // Ruins are clustered around a specific point — we'll approximate
    // by scanning the island group for platform meshes (BoxGeometry with depth ~3)
    // Simpler approach: use the island's seed to regenerate the cluster position
    const rng = island.rng;
    // Reset RNG to get consistent positions (ruins cluster position is deterministic from seed)
    // Since we can't easily reset the RNG, we'll just place interaction at center-ish area
    if (island.label) {
      points.push({
        x: 0, z: 0,
        y: island.sampleHeight(0, 0),
        radius: 8,
        label: island.label,
        description: this._getIslandDescription(island.label),
      });
    }

    // Magic orb location
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

    // Clean up cloned island group
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
        // Movement direction relative to camera facing
        const moveAngle = this.cameraAzimuth + Math.PI; // Camera looks at player; forward = away from camera
        const moveX = Math.sin(moveAngle) * forward + Math.sin(moveAngle + Math.PI / 2) * strafe;
        const moveZ = Math.cos(moveAngle) * forward + Math.cos(moveAngle + Math.PI / 2) * strafe;

        // Normalize diagonal movement
        const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (len > 0) {
          const nx = moveX / len;
          const nz = moveZ / len;

          this.playerPos.x += nx * this.moveSpeed * dt;
          this.playerPos.z += nz * this.moveSpeed * dt;

          // Clamp to island radius (with some margin)
          const distFromCenter = Math.sqrt(this.playerPos.x ** 2 + this.playerPos.z ** 2);
          if (distFromCenter > this.island.radius * 0.95) {
            const scale = (this.island.radius * 0.95) / distFromCenter;
            this.playerPos.x *= scale;
            this.playerPos.z *= scale;
          }

          // Face movement direction
          this.playerHeading = Math.atan2(nx, nz);
        }
      }

      // Ground following
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

    // Camera ground collision — don't go below terrain
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
      // Press E or Space to dismiss dialogue
      if (this.input.justPressed('KeyE') || this.input.justPressed('Space')) {
        this._hideDialogue();
        this.showingDialogue = false;
      }
      return;
    }

    // Check proximity to interaction points
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
      // Don't override ship boarding prompt
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
      // Only hide if not near ship
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
```

- [ ] **Step 2: Verify file created**

Run: Check file exists at `src/scenes/IslandExplorationScene.js`

- [ ] **Step 3: Commit**

```bash
git add src/scenes/IslandExplorationScene.js
git commit -m "feat: add IslandExplorationScene with third-person camera and interactions"
```

---

### Task 7: Register the new scene and handle return-to-sailing

**Files:**
- Modify: `src/main.js` (register IslandExplorationScene)
- Modify: `src/scenes/SailingScene.js` (handle return data from island exploration)

- [ ] **Step 1: Register the scene in main.js**

In `src/main.js`, add the import after line 5:
```js
import { IslandExplorationScene } from './scenes/IslandExplorationScene.js';
```

Add registration after line 21 (after the sailing scene registration):
```js
sceneManager.register('islandExploration', IslandExplorationScene);
```

- [ ] **Step 2: Handle return data in SailingScene.enter**

In `src/scenes/SailingScene.js`, the `enter` method needs to restore ship position when returning from island exploration. Add this at the end of the `enter` method, before the closing `}` (after `this.input.enablePointerLock();`):

```js
    // Restore ship position if returning from island exploration
    if (data && data.shipPosition) {
      this.ship.group.position.copy(data.shipPosition);
      this.ship.heading = data.shipHeading || 0;
      this.ship.group.rotation.y = this.ship.heading;
    }
```

- [ ] **Step 3: Verify full flow**

Run: Open browser, sail to an island, press E to disembark, walk around, return to ship by walking to shore and pressing E.
Expected: Full disembark → explore → re-board cycle works. Ship position is preserved.

- [ ] **Step 4: Commit**

```bash
git add src/main.js src/scenes/SailingScene.js
git commit -m "feat: register island exploration scene, handle return-to-sailing flow"
```

---

### Task 8: Final integration testing and polish

**Files:**
- Possibly modify: various files for bug fixes found during testing

- [ ] **Step 1: Test W/S key reversal**

Run: Start game, enter sailing. Press W — ship should go backward. Press S — ship should go forward. A/D turn as before.

- [ ] **Step 2: Test ship visuals**

Verify: Cream-colored sail, warmer brown hull, no shields on sides, bright character colors.

- [ ] **Step 3: Test island sizes**

Sail to a story island. Islands should be noticeably larger. Procedurally generated islands should also be bigger.

- [ ] **Step 4: Test disembark flow**

Sail near an island → "Press E to disembark" appears → press E → scene transitions to island exploration → Odysseus on beach → WASD to walk → mouse to look → walk to point of interest → "Press E to examine" → press E → dialogue appears → press E to dismiss → walk back to ship → "Press E to board" → press E → back to sailing with ship in same place.

- [ ] **Step 5: Fix any issues found**

Address any bugs discovered during testing.

- [ ] **Step 6: Final commit if needed**

```bash
git add -A
git commit -m "fix: polish island exploration integration"
```
