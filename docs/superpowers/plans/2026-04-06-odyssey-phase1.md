# Odyssey Game — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable first slice: title screen → Troy departure cutscene → open sea sailing with full shader pipeline and HUD.

**Architecture:** Vite + Three.js with a scene state machine. Each game state (menu, cutscene, sailing) is a class with enter/exit/update/render lifecycle. Custom GLSL shaders for ocean, sky, and PBR materials. HTML overlay for HUD. All geometry procedural.

**Tech Stack:** Vite, Three.js r163, GLSL, HTML/CSS overlay HUD

---

## File Structure

```
odyssey-game/
├── index.html                    # Entry point, canvas + HUD overlay
├── package.json                  # Dependencies: three, vite
├── vite.config.js                # Vite config
├── src/
│   ├── main.js                   # Bootstrap: create renderer, start game loop
│   ├── engine/
│   │   ├── SceneManager.js       # Scene state machine (enter/exit/update/render)
│   │   ├── InputManager.js       # Keyboard + mouse state tracking
│   │   ├── AssetManager.js       # Procedural geometry factory methods
│   │   └── AudioManager.js       # Placeholder for future audio
│   ├── shaders/
│   │   ├── ocean.vert.glsl       # Ocean vertex shader (Gerstner waves)
│   │   ├── ocean.frag.glsl       # Ocean fragment shader (foam, fresnel, SSS)
│   │   ├── sky.vert.glsl         # Sky dome vertex shader
│   │   ├── sky.frag.glsl         # Sky dome fragment (gradient, sun, clouds)
│   │   ├── pbr.vert.glsl         # PBR vertex shader
│   │   ├── pbr.frag.glsl         # PBR fragment shader (metallic/roughness)
│   │   ├── fire.vert.glsl        # Fire/torch vertex shader
│   │   ├── fire.frag.glsl        # Fire fragment shader (animated noise)
│   │   ├── sail.vert.glsl        # Sail billow vertex shader
│   │   ├── sail.frag.glsl        # Sail fragment shader
│   │   ├── postprocessing.js     # Post-processing setup (bloom, SSAO, tonemap)
│   │   └── ShaderLib.js          # Loads and caches shader materials
│   ├── entities/
│   │   ├── Ship.js               # Greek trireme — hull, mast, sail, oars, rigging
│   │   ├── Character.js          # Humanoid character rig (Odysseus, crew, NPCs)
│   │   ├── Ocean.js              # Ocean plane mesh + shader material
│   │   ├── Sky.js                # Sky dome mesh + shader material
│   │   └── Island.js             # Procedural island generator
│   ├── scenes/
│   │   ├── MenuScene.js          # Title screen
│   │   ├── CutsceneScene.js      # Scripted camera + narration system
│   │   ├── TroyDepartureScene.js # Troy departure cutscene (extends CutsceneScene)
│   │   └── SailingScene.js       # Open sea sailing gameplay
│   ├── ui/
│   │   ├── HUD.js                # HUD controller — show/hide elements per scene
│   │   ├── HealthBar.js          # Health + stamina bars
│   │   ├── Compass.js            # Top compass with heading + objective
│   │   ├── Minimap.js            # Bottom-right minimap
│   │   ├── QuestLog.js           # Quest objectives panel
│   │   └── SailingHUD.js         # Wind, sail trim, crew count
│   └── utils/
│       ├── math.js               # lerp, clamp, remap helpers
│       └── constants.js          # Game constants (colors, speeds, sizes)
├── public/
│   └── fonts/                    # Any web fonts
└── styles/
    └── hud.css                   # HUD styling
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `styles/hud.css`
- Create: `src/main.js`
- Create: `src/utils/constants.js`
- Create: `src/utils/math.js`

- [ ] **Step 1: Initialize package.json**

```json
{
  "name": "odyssey-game",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.163.0"
  },
  "devDependencies": {
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.glsl'],
  server: { port: 3000 }
});
```

- [ ] **Step 3: Create index.html with canvas and HUD overlay**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Odyssey</title>
  <link rel="stylesheet" href="/styles/hud.css">
</head>
<body>
  <div id="game-container">
    <canvas id="game-canvas"></canvas>
    <div id="hud" class="hud hidden">
      <div id="health-bar" class="hud-bar">
        <div class="bar-fill health-fill"></div>
      </div>
      <div id="stamina-bar" class="hud-bar">
        <div class="bar-fill stamina-fill"></div>
      </div>
      <div id="compass"></div>
      <div id="minimap"></div>
      <div id="quest-log" class="hidden"></div>
      <div id="interaction-prompt" class="hidden"></div>
      <div id="sailing-hud" class="hidden">
        <div id="wind-indicator"></div>
        <div id="sail-trim"></div>
        <div id="crew-count"></div>
      </div>
    </div>
    <div id="cutscene-overlay" class="hidden">
      <div id="cutscene-text"></div>
      <div id="cutscene-skip">Press Space to skip</div>
    </div>
    <div id="menu-overlay" class="hidden">
      <h1 class="menu-title">THE ODYSSEY</h1>
      <p class="menu-subtitle">The Journey Home</p>
      <button id="start-btn" class="menu-btn">Begin Journey</button>
    </div>
  </div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create styles/hud.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { overflow: hidden; background: #000; font-family: 'Georgia', serif; }

#game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
}

#game-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.hidden { display: none !important; }

/* HUD */
.hud {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
}

.hud-bar {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 250px;
  height: 12px;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  overflow: hidden;
}

#stamina-bar { top: 40px; }

.bar-fill {
  height: 100%;
  width: 100%;
  border-radius: 6px;
  transition: width 0.3s;
}

.health-fill {
  background: linear-gradient(90deg, #c0392b, #e74c8c);
}

.stamina-fill {
  background: linear-gradient(90deg, #2980b9, #6dd5fa);
}

/* Compass */
#compass {
  position: absolute;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 30px;
  background: rgba(0,0,0,0.4);
  border-radius: 15px;
  color: #ddd;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 2px;
}

/* Minimap */
#minimap {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: rgba(0,20,40,0.6);
  border: 2px solid rgba(255,255,255,0.15);
  overflow: hidden;
}

/* Interaction prompt */
#interaction-prompt {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.6);
  color: #fff;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  pointer-events: auto;
}

/* Quest log */
#quest-log {
  position: absolute;
  top: 70px;
  left: 20px;
  background: rgba(0,0,0,0.5);
  color: #ddd;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  max-width: 280px;
}

/* Sailing HUD */
#sailing-hud {
  position: absolute;
  bottom: 20px;
  left: 20px;
  color: #ddd;
  font-size: 13px;
}

#wind-indicator, #sail-trim, #crew-count {
  margin-bottom: 6px;
  background: rgba(0,0,0,0.4);
  padding: 4px 12px;
  border-radius: 10px;
}

/* Cutscene overlay */
#cutscene-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 40px;
}

#cutscene-text {
  color: #fff;
  font-size: 20px;
  line-height: 1.6;
  text-shadow: 0 2px 8px rgba(0,0,0,0.8);
  max-width: 700px;
  opacity: 0;
  transition: opacity 0.8s;
}

#cutscene-text.visible { opacity: 1; }

#cutscene-skip {
  color: rgba(255,255,255,0.4);
  font-size: 12px;
  margin-top: 20px;
}

/* Menu */
#menu-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
}

.menu-title {
  font-size: 72px;
  color: #f0c27f;
  text-shadow: 0 4px 20px rgba(0,0,0,0.8);
  letter-spacing: 12px;
  margin-bottom: 10px;
}

.menu-subtitle {
  font-size: 20px;
  color: rgba(255,255,255,0.6);
  letter-spacing: 4px;
  margin-bottom: 50px;
}

.menu-btn {
  background: none;
  border: 1px solid rgba(240,194,127,0.5);
  color: #f0c27f;
  font-family: 'Georgia', serif;
  font-size: 18px;
  padding: 14px 40px;
  cursor: pointer;
  letter-spacing: 3px;
  transition: all 0.3s;
  pointer-events: auto;
}

.menu-btn:hover {
  background: rgba(240,194,127,0.15);
  border-color: #f0c27f;
}
```

- [ ] **Step 5: Create src/utils/constants.js**

```js
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
  staminaDrain: 20, // per second while sprinting
  staminaRegen: 15, // per second while not sprinting
};
```

- [ ] **Step 6: Create src/utils/math.js**

```js
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function remap(value, inMin, inMax, outMin, outMax) {
  return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
```

- [ ] **Step 7: Create src/main.js — bootstrap stub**

```js
import * as THREE from 'three';
import { SceneManager } from './engine/SceneManager.js';
import { InputManager } from './engine/InputManager.js';

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

// Will register scenes in later tasks
// sceneManager.register('menu', MenuScene);
// sceneManager.switchTo('menu');

const clock = new THREE.Clock();

function gameLoop() {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(clock.getDelta(), 0.1); // cap delta to avoid spiral
  sceneManager.update(dt);
  sceneManager.render();
}

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  sceneManager.onResize(window.innerWidth, window.innerHeight);
});

gameLoop();

export { renderer, input, sceneManager };
```

- [ ] **Step 8: Install dependencies and verify dev server starts**

Run: `npm install && npm run dev`
Expected: Vite dev server on localhost:3000, black canvas renders

- [ ] **Step 9: Commit**

```bash
git init
git add -A
git commit -m "feat: project scaffolding with Vite, Three.js, HUD overlay"
```

---

### Task 2: Engine — SceneManager + InputManager

**Files:**
- Create: `src/engine/SceneManager.js`
- Create: `src/engine/InputManager.js`

- [ ] **Step 1: Create SceneManager.js**

```js
export class SceneManager {
  constructor(renderer, input) {
    this.renderer = renderer;
    this.input = input;
    this.scenes = {};
    this.currentScene = null;
    this.currentName = null;
    this.transitioning = false;
  }

  register(name, SceneClass) {
    this.scenes[name] = new SceneClass(this.renderer, this.input, this);
  }

  async switchTo(name, data = {}) {
    if (this.transitioning) return;
    this.transitioning = true;

    if (this.currentScene) {
      await this.currentScene.exit();
    }

    this.currentScene = this.scenes[name];
    this.currentName = name;

    if (this.currentScene) {
      await this.currentScene.enter(data);
    }

    this.transitioning = false;
  }

  update(dt) {
    if (this.currentScene && !this.transitioning) {
      this.currentScene.update(dt);
    }
    this.input.update();
  }

  render() {
    if (this.currentScene && !this.transitioning) {
      this.currentScene.render(this.renderer);
    }
  }

  onResize(width, height) {
    if (this.currentScene && this.currentScene.onResize) {
      this.currentScene.onResize(width, height);
    }
  }
}

// Base class for all scenes
export class GameScene {
  constructor(renderer, input, sceneManager) {
    this.renderer = renderer;
    this.input = input;
    this.sceneManager = sceneManager;
    this.scene = null;
    this.camera = null;
  }

  async enter(data) {}
  async exit() {}
  update(dt) {}

  render(renderer) {
    if (this.scene && this.camera) {
      renderer.render(this.scene, this.camera);
    }
  }

  onResize(width, height) {
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }
}
```

- [ ] **Step 2: Create InputManager.js**

```js
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.keysJustPressed = {};
    this.keysJustReleased = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0 };
    this.mouseButtons = {};
    this.isPointerLocked = false;

    this._prevKeys = {};

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    canvas.addEventListener('mousedown', (e) => {
      this.mouseButtons[e.button] = true;
    });

    canvas.addEventListener('mouseup', (e) => {
      this.mouseButtons[e.button] = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouse.dx += e.movementX;
        this.mouse.dy += e.movementY;
      }
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    canvas.addEventListener('click', () => {
      if (!this.isPointerLocked && this._wantPointerLock) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });
  }

  enablePointerLock() {
    this._wantPointerLock = true;
  }

  disablePointerLock() {
    this._wantPointerLock = false;
    if (this.isPointerLocked) {
      document.exitPointerLock();
    }
  }

  isDown(code) {
    return !!this.keys[code];
  }

  justPressed(code) {
    return !!this.keysJustPressed[code];
  }

  justReleased(code) {
    return !!this.keysJustReleased[code];
  }

  getAxis(negCode, posCode) {
    return (this.isDown(posCode) ? 1 : 0) - (this.isDown(negCode) ? 1 : 0);
  }

  getMouseDelta() {
    return { x: this.mouse.dx, y: this.mouse.dy };
  }

  update() {
    // Compute just-pressed / just-released
    for (const code in this.keys) {
      this.keysJustPressed[code] = this.keys[code] && !this._prevKeys[code];
      this.keysJustReleased[code] = !this.keys[code] && this._prevKeys[code];
    }
    this._prevKeys = { ...this.keys };
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }
}
```

- [ ] **Step 3: Update src/main.js to use SceneManager**

Update the imports and registration (scenes will be added in later tasks, but the loop should work):

```js
import * as THREE from 'three';
import { SceneManager } from './engine/SceneManager.js';
import { InputManager } from './engine/InputManager.js';

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
```

- [ ] **Step 4: Verify black screen still renders, no console errors**

Run: `npm run dev` (already running)
Expected: Black canvas, no errors in console

- [ ] **Step 5: Commit**

```bash
git add src/engine/SceneManager.js src/engine/InputManager.js src/main.js
git commit -m "feat: scene state machine and input manager"
```

---

### Task 3: Custom Shaders — Ocean, Sky, PBR, Fire, Sail

**Files:**
- Create: `src/shaders/ocean.vert.glsl`
- Create: `src/shaders/ocean.frag.glsl`
- Create: `src/shaders/sky.vert.glsl`
- Create: `src/shaders/sky.frag.glsl`
- Create: `src/shaders/pbr.vert.glsl`
- Create: `src/shaders/pbr.frag.glsl`
- Create: `src/shaders/fire.vert.glsl`
- Create: `src/shaders/fire.frag.glsl`
- Create: `src/shaders/sail.vert.glsl`
- Create: `src/shaders/sail.frag.glsl`
- Create: `src/shaders/ShaderLib.js`
- Create: `src/shaders/postprocessing.js`

- [ ] **Step 1: Create ocean.vert.glsl — Gerstner wave vertex shader**

```glsl
uniform float uTime;
uniform float uWaveHeight;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying float vFoam;
varying float vHeight;

vec3 gerstnerWave(vec3 pos, float steepness, float wavelength, vec2 direction, float time) {
  float k = 6.28318 / wavelength;
  float c = sqrt(9.8 / k);
  vec2 d = normalize(direction);
  float f = k * (dot(d, pos.xz) - c * time);
  float a = steepness / k;
  return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
}

vec3 sumWaves(vec3 pos, float time) {
  vec3 w = vec3(0.0);
  w += gerstnerWave(pos, 0.15, 28.0, vec2(1.0, 0.3), time * 0.8);
  w += gerstnerWave(pos, 0.12, 18.0, vec2(0.3, 1.0), time * 0.6);
  w += gerstnerWave(pos, 0.08, 10.0, vec2(-0.5, 0.7), time * 1.1);
  w += gerstnerWave(pos, 0.06, 6.0, vec2(0.8, -0.4), time * 1.4);
  w += gerstnerWave(pos, 0.04, 3.5, vec2(-0.3, -0.8), time * 1.8);
  return w * uWaveHeight;
}

void main() {
  vUv = uv;
  vec3 pos = position;

  vec3 totalWave = sumWaves(pos, uTime);
  pos += totalWave;

  vHeight = totalWave.y;
  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

  // Compute normal via finite differences
  float eps = 0.5;
  vec3 posR = position + vec3(eps, 0.0, 0.0);
  vec3 posF = position + vec3(0.0, 0.0, eps);
  vec3 wR = posR + sumWaves(posR, uTime);
  vec3 wF = posF + sumWaves(posF, uTime);

  vec3 tangent = normalize(wR - pos);
  vec3 bitangent = normalize(wF - pos);
  vNormal = normalize(cross(bitangent, tangent));

  // Foam on crests and steep faces
  float crest = smoothstep(0.6, 1.8, totalWave.y);
  float steepnessFoam = 1.0 - dot(vNormal, vec3(0.0, 1.0, 0.0));
  vFoam = max(crest, smoothstep(0.3, 0.7, steepnessFoam));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

- [ ] **Step 2: Create ocean.frag.glsl — foam, fresnel, SSS, specular**

```glsl
uniform float uTime;
uniform vec3 uSunPosition;
uniform vec3 uCameraPos;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying float vFoam;
varying float vHeight;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(uCameraPos - vWorldPos);
  vec3 sunDir = normalize(uSunPosition);

  // Fresnel
  float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
  fresnel = mix(0.04, 1.0, fresnel);

  vec3 waterColor = mix(uShallowColor, uDeepColor, fresnel);

  // Specular — sharp sun highlight
  vec3 halfDir = normalize(sunDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), 256.0);
  vec3 specular = vec3(1.0, 0.95, 0.8) * spec * 3.0;

  // Broad sun path
  float broadSpec = pow(max(dot(normal, halfDir), 0.0), 16.0);
  vec3 sunPath = vec3(1.0, 0.85, 0.6) * broadSpec * 0.4;

  // Sky reflection
  vec3 reflectDir = reflect(-viewDir, normal);
  float skyGrad = max(reflectDir.y, 0.0);
  vec3 skyReflection = mix(vec3(0.55, 0.75, 0.92), vec3(0.18, 0.35, 0.72), pow(skyGrad, 0.5));
  waterColor = mix(waterColor, skyReflection, fresnel * 0.6);

  // Foam
  vec2 foamUV = vWorldPos.xz * 0.15;
  float foamNoise = fbm(foamUV + uTime * 0.3);
  float foamNoise2 = fbm(foamUV * 1.5 - uTime * 0.2);
  float foamPattern = foamNoise * foamNoise2;
  float foam = vFoam * smoothstep(0.15, 0.45, foamPattern);
  foam += smoothstep(1.2, 2.0, vHeight) * smoothstep(0.2, 0.5, foamNoise) * 0.7;
  foam = clamp(foam, 0.0, 1.0);
  vec3 foamCol = uFoamColor * (0.8 + 0.2 * foamNoise);

  // Subsurface scattering
  float sss = pow(max(dot(viewDir, -sunDir + normal * 0.5), 0.0), 3.0);
  vec3 subsurface = vec3(0.0, 0.6, 0.5) * sss * 0.3;

  vec3 color = waterColor + specular + sunPath + subsurface;
  color = mix(color, foamCol, foam * 0.85);

  // Distance haze
  float dist = length(vWorldPos - uCameraPos);
  float haze = 1.0 - exp(-dist * 0.002);
  color = mix(color, vec3(0.6, 0.72, 0.82), haze);

  gl_FragColor = vec4(color, 0.95);
}
```

- [ ] **Step 3: Create sky.vert.glsl and sky.frag.glsl**

sky.vert.glsl:
```glsl
varying vec3 vWorldPos;

void main() {
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

sky.frag.glsl:
```glsl
uniform vec3 uSunPosition;
uniform float uTime;

varying vec3 vWorldPos;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vWorldPos);
  float y = dir.y;
  vec3 sunDir = normalize(uSunPosition);

  // Sky gradient
  vec3 zenith = vec3(0.18, 0.35, 0.72);
  vec3 horizon = vec3(0.55, 0.75, 0.92);
  vec3 horizonWarm = vec3(0.85, 0.75, 0.6);

  vec3 sky = mix(horizon, zenith, pow(max(y, 0.0), 0.6));
  float horizonFactor = exp(-abs(y) * 8.0);
  sky = mix(sky, horizonWarm, horizonFactor * 0.4);

  // Procedural clouds
  vec2 cloudUV = dir.xz / (dir.y + 0.1) * 2.0;
  float clouds = fbm(cloudUV + uTime * 0.01);
  clouds = smoothstep(0.4, 0.7, clouds);
  vec3 cloudColor = mix(vec3(0.9, 0.9, 0.95), vec3(1.0, 0.95, 0.85), pow(max(dot(dir, sunDir), 0.0), 2.0));
  sky = mix(sky, cloudColor, clouds * 0.5 * smoothstep(0.0, 0.3, y));

  // Sun
  float sunAngle = max(dot(dir, sunDir), 0.0);
  vec3 sunColor = vec3(1.0, 0.9, 0.7);
  sky += sunColor * pow(sunAngle, 128.0) * 2.5;
  sky += sunColor * pow(sunAngle, 8.0) * 0.3;

  // Below horizon fade
  if (y < 0.0) {
    vec3 underHorizon = vec3(0.08, 0.15, 0.25);
    sky = mix(horizon, underHorizon, min(-y * 5.0, 1.0));
  }

  gl_FragColor = vec4(sky, 1.0);
}
```

- [ ] **Step 4: Create pbr.vert.glsl and pbr.frag.glsl**

pbr.vert.glsl:
```glsl
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vUv = uv;
  vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

pbr.frag.glsl:
```glsl
uniform vec3 uColor;
uniform float uRoughness;
uniform float uMetallic;
uniform vec3 uSunPosition;
uniform vec3 uSunColor;
uniform vec3 uAmbientColor;
uniform vec3 uCameraPos;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;

#define PI 3.14159265

// GGX Normal Distribution
float distributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
  return a2 / (PI * denom * denom);
}

// Schlick-GGX Geometry
float geometrySchlickGGX(float NdotV, float roughness) {
  float r = roughness + 1.0;
  float k = (r * r) / 8.0;
  return NdotV / (NdotV * (1.0 - k) + k);
}

float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  return geometrySchlickGGX(max(dot(N, V), 0.0), roughness) *
         geometrySchlickGGX(max(dot(N, L), 0.0), roughness);
}

// Fresnel-Schlick
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 L = normalize(uSunPosition - vWorldPos);
  vec3 H = normalize(V + L);

  vec3 F0 = mix(vec3(0.04), uColor, uMetallic);

  // Cook-Torrance BRDF
  float D = distributionGGX(N, H, uRoughness);
  float G = geometrySmith(N, V, L, uRoughness);
  vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);

  vec3 numerator = D * G * F;
  float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
  vec3 specular = numerator / denominator;

  vec3 kD = (vec3(1.0) - F) * (1.0 - uMetallic);
  float NdotL = max(dot(N, L), 0.0);

  vec3 diffuse = kD * uColor / PI;
  vec3 radiance = uSunColor * 3.0;

  vec3 color = (diffuse + specular) * radiance * NdotL;
  color += uAmbientColor * uColor * 0.3;

  // Rim light
  float rim = 1.0 - max(dot(V, N), 0.0);
  color += vec3(0.4, 0.5, 0.6) * pow(rim, 4.0) * 0.15;

  gl_FragColor = vec4(color, 1.0);
}
```

- [ ] **Step 5: Create fire.vert.glsl and fire.frag.glsl**

fire.vert.glsl:
```glsl
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

fire.frag.glsl:
```glsl
uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;

  // Distort UV upward over time
  float n = fbm(uv * 4.0 + vec2(0.0, -uTime * 3.0));
  float n2 = fbm(uv * 8.0 + vec2(uTime * 0.5, -uTime * 4.0));

  float shape = 1.0 - uv.y; // fade out at top
  shape *= smoothstep(0.0, 0.3, 0.5 - abs(uv.x - 0.5)); // narrow at edges

  float fire = shape * n * n2 * uIntensity;
  fire = smoothstep(0.1, 0.9, fire);

  // Color gradient: white core → yellow → orange → red → transparent
  vec3 col = mix(vec3(0.8, 0.2, 0.0), vec3(1.0, 0.6, 0.0), fire);
  col = mix(col, vec3(1.0, 0.95, 0.8), smoothstep(0.7, 1.0, fire));

  float alpha = smoothstep(0.0, 0.2, fire);

  gl_FragColor = vec4(col, alpha);
}
```

- [ ] **Step 6: Create sail.vert.glsl and sail.frag.glsl**

sail.vert.glsl:
```glsl
uniform float uTime;
uniform float uWindStrength;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

  vec3 pos = position;
  // Billow: more displacement further from mast (uv.x = 0 is mast edge)
  float billow = sin(pos.y * 1.5 + uTime * 2.0) * 0.3 * uv.x * uWindStrength;
  billow += sin(pos.y * 3.0 + uTime * 3.0) * 0.1 * uv.x * uWindStrength;
  billow += sin(pos.y * 0.8 + uTime * 1.2) * 0.15 * uv.x * uWindStrength;
  pos.z += billow;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

sail.frag.glsl:
```glsl
varying vec2 vUv;
varying vec3 vNormal;

uniform vec3 uColor;
uniform vec3 uSunPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 sunDir = normalize(uSunPosition);

  float light = max(dot(normal, sunDir), 0.0) * 0.6 + 0.4;

  // Slight color variation across sail
  vec3 color = uColor * light;
  color *= mix(0.9, 1.0, vUv.y);

  // Subtle weave pattern
  float weave = sin(vUv.x * 200.0) * sin(vUv.y * 200.0) * 0.03;
  color += weave;

  gl_FragColor = vec4(color, 1.0);
}
```

- [ ] **Step 7: Create ShaderLib.js — loads and creates shader materials**

```js
import * as THREE from 'three';

import oceanVert from './ocean.vert.glsl?raw';
import oceanFrag from './ocean.frag.glsl?raw';
import skyVert from './sky.vert.glsl?raw';
import skyFrag from './sky.frag.glsl?raw';
import pbrVert from './pbr.vert.glsl?raw';
import pbrFrag from './pbr.frag.glsl?raw';
import fireVert from './fire.vert.glsl?raw';
import fireFrag from './fire.frag.glsl?raw';
import sailVert from './sail.vert.glsl?raw';
import sailFrag from './sail.frag.glsl?raw';

export class ShaderLib {
  static createOceanMaterial(sunPosition) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWaveHeight: { value: 1.0 },
        uSunPosition: { value: sunPosition.clone() },
        uCameraPos: { value: new THREE.Vector3() },
        uDeepColor: { value: new THREE.Color(0x0a2a4a) },
        uShallowColor: { value: new THREE.Color(0x1a8a7a) },
        uFoamColor: { value: new THREE.Color(0xe8eef2) },
      },
      vertexShader: oceanVert,
      fragmentShader: oceanFrag,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  static createSkyMaterial(sunPosition) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSunPosition: { value: sunPosition.clone() },
        uTime: { value: 0 },
      },
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
    });
  }

  static createPBRMaterial({ color = 0x888888, roughness = 0.5, metallic = 0.0, sunPosition, sunColor, ambientColor } = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uRoughness: { value: roughness },
        uMetallic: { value: metallic },
        uSunPosition: { value: sunPosition ? sunPosition.clone() : new THREE.Vector3(100, 40, -80) },
        uSunColor: { value: sunColor ? sunColor.clone() : new THREE.Color(0xfff0dd) },
        uAmbientColor: { value: ambientColor ? ambientColor.clone() : new THREE.Color(0x4466aa) },
        uCameraPos: { value: new THREE.Vector3() },
      },
      vertexShader: pbrVert,
      fragmentShader: pbrFrag,
    });
  }

  static createFireMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1.5 },
      },
      vertexShader: fireVert,
      fragmentShader: fireFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }

  static createSailMaterial(sunPosition) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWindStrength: { value: 1.0 },
        uColor: { value: new THREE.Color(0xe8dcc8) },
        uSunPosition: { value: sunPosition ? sunPosition.clone() : new THREE.Vector3(100, 40, -80) },
      },
      vertexShader: sailVert,
      fragmentShader: sailFrag,
      side: THREE.DoubleSide,
    });
  }
}
```

- [ ] **Step 8: Create postprocessing.js — bloom, SSAO, tone mapping, color grading**

```js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSaturation: { value: 1.15 },
    uContrast: { value: 1.05 },
    uBrightness: { value: 0.02 },
    uVignetteStrength: { value: 0.3 },
    uWarmth: { value: 0.08 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uBrightness;
    uniform float uVignetteStrength;
    uniform float uWarmth;
    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 color = tex.rgb;

      // Warmth shift
      color.r += uWarmth;
      color.b -= uWarmth * 0.5;

      // Saturation
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(gray), color, uSaturation);

      // Contrast
      color = (color - 0.5) * uContrast + 0.5;

      // Brightness
      color += uBrightness;

      // Vignette
      vec2 vig = vUv * (1.0 - vUv);
      float vigFactor = vig.x * vig.y * 15.0;
      vigFactor = pow(vigFactor, uVignetteStrength);
      color *= vigFactor;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export function createPostProcessing(renderer, scene, camera) {
  const size = new THREE.Vector2();
  renderer.getSize(size);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    0.4,  // strength
    0.6,  // radius
    0.85  // threshold
  );
  composer.addPass(bloomPass);

  const colorGradePass = new ShaderPass(ColorGradeShader);
  composer.addPass(colorGradePass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return {
    composer,
    bloomPass,
    colorGradePass,
    resize(width, height) {
      composer.setSize(width, height);
    },
    render() {
      composer.render();
    },
  };
}
```

- [ ] **Step 9: Commit**

```bash
git add src/shaders/
git commit -m "feat: custom GLSL shaders — ocean, sky, PBR, fire, sail + post-processing"
```

---

### Task 4: Entity Classes — Ocean, Sky, Ship, Character

**Files:**
- Create: `src/entities/Ocean.js`
- Create: `src/entities/Sky.js`
- Create: `src/entities/Ship.js`
- Create: `src/entities/Character.js`
- Create: `src/entities/Island.js`

- [ ] **Step 1: Create Ocean.js**

```js
import * as THREE from 'three';
import { ShaderLib } from '../shaders/ShaderLib.js';
import { OCEAN } from '../utils/constants.js';

export class Ocean {
  constructor(sunPosition) {
    const geo = new THREE.PlaneGeometry(OCEAN.size, OCEAN.size, OCEAN.segments, OCEAN.segments);
    geo.rotateX(-Math.PI / 2);

    this.material = ShaderLib.createOceanMaterial(sunPosition);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.receiveShadow = true;
  }

  update(dt, time, cameraPosition) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uCameraPos.value.copy(cameraPosition);
  }

  addTo(scene) {
    scene.add(this.mesh);
  }

  getWaveHeight(x, z, time) {
    // Approximate wave height at a world position (matches vertex shader)
    const waveHeight = this.material.uniforms.uWaveHeight.value;
    let y = 0;

    const waves = [
      { s: 0.15, wl: 28, dx: 1.0, dz: 0.3, ts: 0.8 },
      { s: 0.12, wl: 18, dx: 0.3, dz: 1.0, ts: 0.6 },
      { s: 0.08, wl: 10, dx: -0.5, dz: 0.7, ts: 1.1 },
      { s: 0.06, wl: 6, dx: 0.8, dz: -0.4, ts: 1.4 },
      { s: 0.04, wl: 3.5, dx: -0.3, dz: -0.8, ts: 1.8 },
    ];

    for (const w of waves) {
      const k = (2 * Math.PI) / w.wl;
      const c = Math.sqrt(9.8 / k);
      const len = Math.sqrt(w.dx * w.dx + w.dz * w.dz);
      const dx = w.dx / len, dz = w.dz / len;
      const f = k * (dx * x + dz * z - c * time * w.ts);
      y += (w.s / k) * Math.sin(f);
    }

    return y * waveHeight;
  }
}
```

- [ ] **Step 2: Create Sky.js**

```js
import * as THREE from 'three';
import { ShaderLib } from '../shaders/ShaderLib.js';

export class Sky {
  constructor(sunPosition) {
    const geo = new THREE.SphereGeometry(800, 32, 32);
    this.material = ShaderLib.createSkyMaterial(sunPosition);
    this.mesh = new THREE.Mesh(geo, this.material);
  }

  update(dt, time) {
    this.material.uniforms.uTime.value = time;
  }

  addTo(scene) {
    scene.add(this.mesh);
  }
}
```

- [ ] **Step 3: Create Ship.js — detailed Greek trireme with procedural geometry**

```js
import * as THREE from 'three';
import { ShaderLib } from '../shaders/ShaderLib.js';
import { SHIP } from '../utils/constants.js';

export class Ship {
  constructor(sunPosition) {
    this.group = new THREE.Group();
    this.sunPosition = sunPosition;
    this.speed = 0;
    this.targetSpeed = 0;
    this.heading = 0;
    this.velocity = new THREE.Vector3();

    this._buildHull();
    this._buildDeck();
    this._buildMast();
    this._buildSail(sunPosition);
    this._buildOars();
    this._buildProw();
    this._buildStern();
    this._buildRigging();
  }

  _buildHull() {
    // Main hull — elongated with curved bottom
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-6, 0);
    hullShape.quadraticCurveTo(-6.5, 1.5, -5.5, 2.5);
    hullShape.lineTo(5.5, 2.5);
    hullShape.quadraticCurveTo(6.5, 1.5, 6, 0);
    hullShape.quadraticCurveTo(0, -0.8, -6, 0);

    const extrudeSettings = { depth: 2.8, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2 };
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, extrudeSettings);
    hullGeo.rotateY(Math.PI / 2);
    hullGeo.translate(0, 0, -1.4);

    const hullMat = ShaderLib.createPBRMaterial({
      color: 0x6B3A2A,
      roughness: 0.85,
      metallic: 0.05,
      sunPosition: this.sunPosition,
    });

    this.hull = new THREE.Mesh(hullGeo, hullMat);
    this.group.add(this.hull);

    // Hull stripe (painted band)
    const stripeGeo = new THREE.BoxGeometry(13, 0.3, 3.2);
    const stripeMat = ShaderLib.createPBRMaterial({
      color: 0x8B0000,
      roughness: 0.7,
      metallic: 0.1,
      sunPosition: this.sunPosition,
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 2.2;
    this.group.add(stripe);
  }

  _buildDeck() {
    const deckGeo = new THREE.BoxGeometry(11, 0.2, 2.6);
    const deckMat = ShaderLib.createPBRMaterial({
      color: 0x8B7355,
      roughness: 0.9,
      metallic: 0.0,
      sunPosition: this.sunPosition,
    });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = 2.5;
    this.group.add(deck);

    // Deck planks (visual detail)
    for (let i = -5; i <= 5; i += 1) {
      const plankGeo = new THREE.BoxGeometry(0.03, 0.22, 2.6);
      const plank = new THREE.Mesh(plankGeo, deckMat);
      plank.position.set(i, 2.5, 0);
      this.group.add(plank);
    }
  }

  _buildMast() {
    const mastGeo = new THREE.CylinderGeometry(0.1, 0.12, 10, 8);
    const mastMat = ShaderLib.createPBRMaterial({
      color: 0x5C4033,
      roughness: 0.9,
      metallic: 0.0,
      sunPosition: this.sunPosition,
    });
    this.mast = new THREE.Mesh(mastGeo, mastMat);
    this.mast.position.set(0, 7.5, 0);
    this.group.add(this.mast);

    // Yard arm (horizontal beam for sail)
    const yardGeo = new THREE.CylinderGeometry(0.06, 0.06, 5, 6);
    yardGeo.rotateZ(Math.PI / 2);
    const yard = new THREE.Mesh(yardGeo, mastMat);
    yard.position.set(0, 11.5, 0);
    this.group.add(yard);
  }

  _buildSail(sunPosition) {
    const sailGeo = new THREE.PlaneGeometry(4.5, 6, 12, 12);
    this.sailMaterial = ShaderLib.createSailMaterial(sunPosition);
    this.sail = new THREE.Mesh(sailGeo, this.sailMaterial);
    this.sail.position.set(0.5, 8.5, 0);
    this.group.add(this.sail);
  }

  _buildOars() {
    this.oars = [];
    const oarMat = ShaderLib.createPBRMaterial({
      color: 0x7B6B5A,
      roughness: 0.85,
      metallic: 0.0,
      sunPosition: this.sunPosition,
    });

    for (let side = -1; side <= 1; side += 2) {
      for (let i = -4; i <= 3; i++) {
        const oarGeo = new THREE.CylinderGeometry(0.03, 0.04, 4, 4);
        oarGeo.rotateZ(side * 0.4);
        const oar = new THREE.Mesh(oarGeo, oarMat);
        oar.position.set(i * 1.1, 1.8, side * 1.6);
        this.oars.push(oar);
        this.group.add(oar);

        // Oar blade
        const bladeGeo = new THREE.BoxGeometry(0.15, 0.6, 0.04);
        const blade = new THREE.Mesh(bladeGeo, oarMat);
        blade.position.set(i * 1.1, 0.2, side * 2.8);
        this.oars.push(blade);
        this.group.add(blade);
      }
    }
  }

  _buildProw() {
    // Ram / curved prow
    const prowCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(6, 2.5, 0),
      new THREE.Vector3(7.5, 3.5, 0),
      new THREE.Vector3(8.5, 5, 0),
      new THREE.Vector3(8, 6, 0),
    );
    const prowGeo = new THREE.TubeGeometry(prowCurve, 12, 0.15, 6, false);
    const prowMat = ShaderLib.createPBRMaterial({
      color: 0xB8860B,
      roughness: 0.4,
      metallic: 0.6,
      sunPosition: this.sunPosition,
    });
    const prow = new THREE.Mesh(prowGeo, prowMat);
    this.group.add(prow);

    // Prow eye (painted on each side) — small spheres
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const eyeMat = ShaderLib.createPBRMaterial({ color: 0xFFFFFF, roughness: 0.3, metallic: 0.0, sunPosition: this.sunPosition });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(6.3, 2.8, side * 1.2);
      this.group.add(eye);

      const pupilGeo = new THREE.SphereGeometry(0.07, 6, 6);
      const pupilMat = ShaderLib.createPBRMaterial({ color: 0x111111, roughness: 0.2, metallic: 0.0, sunPosition: this.sunPosition });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(6.4, 2.8, side * 1.25);
      this.group.add(pupil);
    }
  }

  _buildStern() {
    // Raised stern platform
    const sternGeo = new THREE.BoxGeometry(3, 1.5, 2.8);
    const sternMat = ShaderLib.createPBRMaterial({
      color: 0x6B3A2A,
      roughness: 0.85,
      metallic: 0.05,
      sunPosition: this.sunPosition,
    });
    const stern = new THREE.Mesh(sternGeo, sternMat);
    stern.position.set(-5, 3.2, 0);
    this.group.add(stern);

    // Rudder / steering oar
    const rudderGeo = new THREE.BoxGeometry(0.15, 3, 0.6);
    const rudder = new THREE.Mesh(rudderGeo, sternMat);
    rudder.position.set(-6.5, 1.5, 0);
    rudder.rotation.z = 0.2;
    this.group.add(rudder);
  }

  _buildRigging() {
    const ropeMat = new THREE.LineBasicMaterial({ color: 0x8B7355 });

    // Forestay (mast top to prow)
    const forestayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 12.5, 0),
      new THREE.Vector3(7, 4, 0),
    ]);
    this.group.add(new THREE.Line(forestayGeo, ropeMat));

    // Backstay
    const backstayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 12.5, 0),
      new THREE.Vector3(-5, 3.5, 0),
    ]);
    this.group.add(new THREE.Line(backstayGeo, ropeMat));

    // Shrouds (side stays)
    for (let side = -1; side <= 1; side += 2) {
      const shroudGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 12.5, 0),
        new THREE.Vector3(-1, 2.5, side * 1.4),
      ]);
      this.group.add(new THREE.Line(shroudGeo, ropeMat));
    }
  }

  update(dt, time, ocean, input) {
    // Sail animation
    this.sailMaterial.uniforms.uTime.value = time;

    // Oar animation
    for (let i = 0; i < this.oars.length; i++) {
      const oar = this.oars[i];
      if (i % 2 === 0) { // oar shafts
        oar.rotation.x = Math.sin(time * 2 + i * 0.5) * 0.3 * (this.speed / SHIP.speed);
      }
    }

    // Ship movement from input
    if (input) {
      const forward = input.getAxis('KeyS', 'KeyW');
      const turn = input.getAxis('KeyD', 'KeyA');

      this.targetSpeed = forward * SHIP.speed;
      this.heading += turn * SHIP.turnSpeed * dt;
    }

    // Smooth speed
    this.speed += (this.targetSpeed - this.speed) * dt * 2;

    // Apply movement
    const dir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.group.position.addScaledVector(dir, this.speed * dt);
    this.group.rotation.y = this.heading;

    // Wave following
    if (ocean) {
      const pos = this.group.position;
      const waveY = ocean.getWaveHeight(pos.x, pos.z, time);
      pos.y = waveY;

      // Tilt with waves
      const aheadY = ocean.getWaveHeight(pos.x + dir.x * 3, pos.z + dir.z * 3, time);
      const sideDir = new THREE.Vector3(-dir.z, 0, dir.x);
      const sideY = ocean.getWaveHeight(pos.x + sideDir.x * 1.5, pos.z + sideDir.z * 1.5, time);

      this.group.rotation.x = Math.atan2(waveY - aheadY, 3) * 0.5;
      this.group.rotation.z = Math.atan2(sideY - waveY, 1.5) * 0.3;
    }
  }

  addTo(scene) {
    scene.add(this.group);
  }

  getPosition() {
    return this.group.position;
  }
}
```

- [ ] **Step 4: Create Character.js — procedural humanoid rig**

```js
import * as THREE from 'three';
import { ShaderLib } from '../shaders/ShaderLib.js';

export class Character {
  constructor(options = {}) {
    const {
      sunPosition = new THREE.Vector3(100, 40, -80),
      skinColor = 0xD4A574,
      armorColor = 0x8B7355,
      helmetColor = 0xB8860B,
      capeColor = 0x8B0000,
      hasHelmet = true,
      hasCape = true,
      hasShield = false,
      hasSword = true,
      scale = 1,
    } = options;

    this.group = new THREE.Group();
    this.animTime = 0;
    this.isWalking = false;

    const skinMat = ShaderLib.createPBRMaterial({ color: skinColor, roughness: 0.7, metallic: 0.0, sunPosition });
    const armorMat = ShaderLib.createPBRMaterial({ color: armorColor, roughness: 0.5, metallic: 0.3, sunPosition });
    const metalMat = ShaderLib.createPBRMaterial({ color: helmetColor, roughness: 0.3, metallic: 0.7, sunPosition });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
    this.torso = new THREE.Mesh(torsoGeo, armorMat);
    this.torso.position.y = 1.4;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Waist / skirt (Greek armor)
    const skirtGeo = new THREE.CylinderGeometry(0.35, 0.5, 0.5, 8);
    const skirt = new THREE.Mesh(skirtGeo, armorMat);
    skirt.position.y = 0.75;
    this.group.add(skirt);

    // Head
    const headGeo = new THREE.SphereGeometry(0.22, 8, 8);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 2.15;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Helmet
    if (hasHelmet) {
      const helmetGeo = new THREE.SphereGeometry(0.25, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const helmet = new THREE.Mesh(helmetGeo, metalMat);
      helmet.position.y = 2.2;
      this.group.add(helmet);

      // Helmet crest
      const crestGeo = new THREE.BoxGeometry(0.06, 0.15, 0.4);
      const crestMat = ShaderLib.createPBRMaterial({ color: 0xCC0000, roughness: 0.6, metallic: 0.1, sunPosition });
      const crest = new THREE.Mesh(crestGeo, crestMat);
      crest.position.set(0, 2.4, 0);
      this.group.add(crest);
    }

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.7, 6);
    this.leftArm = new THREE.Mesh(armGeo, skinMat);
    this.leftArm.position.set(-0.5, 1.3, 0);
    this.leftArm.castShadow = true;
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, skinMat);
    this.rightArm.position.set(0.5, 1.3, 0);
    this.rightArm.castShadow = true;
    this.group.add(this.rightArm);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.8, 6);
    this.leftLeg = new THREE.Mesh(legGeo, skinMat);
    this.leftLeg.position.set(-0.18, 0.35, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, skinMat);
    this.rightLeg.position.set(0.18, 0.35, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);

    // Sandals
    const sandalGeo = new THREE.BoxGeometry(0.14, 0.05, 0.25);
    const sandalMat = ShaderLib.createPBRMaterial({ color: 0x5C4033, roughness: 0.9, metallic: 0.0, sunPosition });
    const leftSandal = new THREE.Mesh(sandalGeo, sandalMat);
    leftSandal.position.set(-0.18, -0.05, 0);
    this.group.add(leftSandal);
    const rightSandal = new THREE.Mesh(sandalGeo, sandalMat);
    rightSandal.position.set(0.18, -0.05, 0);
    this.group.add(rightSandal);

    // Sword
    if (hasSword) {
      const swordGroup = new THREE.Group();
      const bladeGeo = new THREE.BoxGeometry(0.04, 0.6, 0.01);
      const blade = new THREE.Mesh(bladeGeo, metalMat);
      blade.position.y = 0.3;
      swordGroup.add(blade);

      const hiltGeo = new THREE.BoxGeometry(0.15, 0.06, 0.04);
      const hilt = new THREE.Mesh(hiltGeo, metalMat);
      swordGroup.add(hilt);

      const gripGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6);
      const grip = new THREE.Mesh(gripGeo, ShaderLib.createPBRMaterial({ color: 0x3B2510, roughness: 0.9, metallic: 0.0, sunPosition }));
      grip.position.y = -0.08;
      swordGroup.add(grip);

      swordGroup.position.set(0.6, 0.9, 0.15);
      swordGroup.rotation.z = -0.2;
      this.group.add(swordGroup);
    }

    // Shield
    if (hasShield) {
      const shieldGeo = new THREE.CircleGeometry(0.35, 16);
      const shieldMat = ShaderLib.createPBRMaterial({ color: 0xB8860B, roughness: 0.4, metallic: 0.5, sunPosition });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(-0.6, 1.3, 0.2);
      shield.rotation.y = Math.PI * 0.3;
      this.group.add(shield);
    }

    // Cape
    if (hasCape) {
      const capeGeo = new THREE.PlaneGeometry(0.7, 1.2, 4, 8);
      this.capeMaterial = ShaderLib.createPBRMaterial({ color: capeColor, roughness: 0.8, metallic: 0.0, sunPosition });
      this.capeMaterial.side = THREE.DoubleSide;
      this.cape = new THREE.Mesh(capeGeo, this.capeMaterial);
      this.cape.position.set(0, 1.3, -0.3);
      this.group.add(this.cape);
    }

    this.group.scale.setScalar(scale);
  }

  update(dt, time) {
    this.animTime += dt;

    if (this.isWalking) {
      const walkSpeed = 6;
      const t = this.animTime * walkSpeed;

      // Leg swing
      this.leftLeg.rotation.x = Math.sin(t) * 0.4;
      this.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.4;

      // Arm swing (opposite to legs)
      this.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.3;
      this.rightArm.rotation.x = Math.sin(t) * 0.3;

      // Torso bob
      this.torso.position.y = 1.4 + Math.abs(Math.sin(t * 2)) * 0.05;
      this.head.position.y = 2.15 + Math.abs(Math.sin(t * 2)) * 0.05;
    } else {
      // Idle breathing
      this.torso.position.y = 1.4 + Math.sin(this.animTime * 1.5) * 0.02;
      this.head.position.y = 2.15 + Math.sin(this.animTime * 1.5) * 0.02;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    }

    // Cape physics (simple sine wave)
    if (this.cape) {
      const capeGeo = this.cape.geometry;
      const pos = capeGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const distFromTop = 1.3 - y;
        pos.setZ(i, -0.3 + Math.sin(time * 2 + distFromTop * 3) * 0.1 * distFromTop);
      }
      pos.needsUpdate = true;
    }
  }

  setWalking(walking) {
    this.isWalking = walking;
  }

  addTo(scene) {
    scene.add(this.group);
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  setRotation(y) {
    this.group.rotation.y = y;
  }
}
```

- [ ] **Step 5: Create Island.js — procedural island generator**

```js
import * as THREE from 'three';
import { ShaderLib } from '../shaders/ShaderLib.js';

export class Island {
  constructor(options = {}) {
    const {
      sunPosition = new THREE.Vector3(100, 40, -80),
      radius = 30,
      height = 15,
      segments = 32,
      hasVegetation = true,
      rockColor = 0x8B7355,
      grassColor = 0x4a6741,
      sandColor = 0xc4843a,
    } = options;

    this.group = new THREE.Group();

    // Main landmass — cone with noise displacement
    const landGeo = new THREE.ConeGeometry(radius, height, segments, 8);
    const landPos = landGeo.attributes.position;

    // Displace vertices for natural look
    for (let i = 0; i < landPos.count; i++) {
      const x = landPos.getX(i);
      const y = landPos.getY(i);
      const z = landPos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const noise = (Math.sin(x * 0.5 + z * 0.3) * 0.5 + Math.cos(x * 0.3 - z * 0.5) * 0.3) * 3;
      landPos.setX(i, x + noise * (dist / radius) * 0.3);
      landPos.setZ(i, z + noise * (dist / radius) * 0.3);
      if (y > -height / 2 + 1) {
        landPos.setY(i, y + noise * 0.5);
      }
    }
    landGeo.computeVertexNormals();

    const landMat = ShaderLib.createPBRMaterial({
      color: rockColor,
      roughness: 0.9,
      metallic: 0.05,
      sunPosition,
    });
    const land = new THREE.Mesh(landGeo, landMat);
    land.position.y = -height * 0.3;
    land.castShadow = true;
    land.receiveShadow = true;
    this.group.add(land);

    // Sandy beach ring
    const beachGeo = new THREE.TorusGeometry(radius * 0.85, 1.5, 8, segments);
    const beachMat = ShaderLib.createPBRMaterial({ color: sandColor, roughness: 0.95, metallic: 0.0, sunPosition });
    const beach = new THREE.Mesh(beachGeo, beachMat);
    beach.rotation.x = Math.PI / 2;
    beach.position.y = -1;
    this.group.add(beach);

    // Green top
    const greenGeo = new THREE.SphereGeometry(radius * 0.7, segments, 12);
    greenGeo.scale(1, 0.3, 1);
    const greenMat = ShaderLib.createPBRMaterial({ color: grassColor, roughness: 0.85, metallic: 0.0, sunPosition });
    const greenTop = new THREE.Mesh(greenGeo, greenMat);
    greenTop.position.y = height * 0.25;
    greenTop.castShadow = true;
    this.group.add(greenTop);

    // Trees
    if (hasVegetation) {
      this._addTrees(sunPosition, radius, height);
    }
  }

  _addTrees(sunPosition, radius, height) {
    const trunkMat = ShaderLib.createPBRMaterial({ color: 0x5C4033, roughness: 0.9, metallic: 0.0, sunPosition });
    const leavesMat = ShaderLib.createPBRMaterial({ color: 0x2D5A1E, roughness: 0.8, metallic: 0.0, sunPosition });

    const treeCount = Math.floor(radius * 0.8);
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + Math.random() * 0.3;
      const dist = radius * (0.2 + Math.random() * 0.4);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const treeHeight = 2 + Math.random() * 3;

      const tree = new THREE.Group();

      const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, treeHeight, 5);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = treeHeight / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      // Canopy (2-3 layered cones for cypress/olive look)
      const layers = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < layers; j++) {
        const canopyGeo = new THREE.ConeGeometry(0.8 - j * 0.2, 1.5, 6);
        const canopy = new THREE.Mesh(canopyGeo, leavesMat);
        canopy.position.y = treeHeight + j * 0.8;
        canopy.castShadow = true;
        tree.add(canopy);
      }

      tree.position.set(x, height * 0.15, z);
      this.group.add(tree);
    }
  }

  addTo(scene) {
    scene.add(this.group);
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/entities/
git commit -m "feat: procedural entities — ocean, sky, ship, character, island"
```

---

### Task 5: UI System — HUD, Compass, Minimap, Sailing HUD

**Files:**
- Create: `src/ui/HUD.js`
- Create: `src/ui/HealthBar.js`
- Create: `src/ui/Compass.js`
- Create: `src/ui/Minimap.js`
- Create: `src/ui/QuestLog.js`
- Create: `src/ui/SailingHUD.js`

- [ ] **Step 1: Create HUD.js — master controller**

```js
export class HUD {
  constructor() {
    this.element = document.getElementById('hud');
    this.visible = false;
  }

  show() {
    this.element.classList.remove('hidden');
    this.visible = true;
  }

  hide() {
    this.element.classList.add('hidden');
    this.visible = false;
  }

  showInteraction(text) {
    const el = document.getElementById('interaction-prompt');
    el.textContent = text;
    el.classList.remove('hidden');
  }

  hideInteraction() {
    document.getElementById('interaction-prompt').classList.add('hidden');
  }
}
```

- [ ] **Step 2: Create HealthBar.js**

```js
export class HealthBar {
  constructor() {
    this.healthFill = document.querySelector('.health-fill');
    this.staminaFill = document.querySelector('.stamina-fill');
  }

  setHealth(ratio) {
    this.healthFill.style.width = `${ratio * 100}%`;
  }

  setStamina(ratio) {
    this.staminaFill.style.width = `${ratio * 100}%`;
  }
}
```

- [ ] **Step 3: Create Compass.js**

```js
export class Compass {
  constructor() {
    this.element = document.getElementById('compass');
  }

  update(heading, objectiveName, objectiveAngle) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(((heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8;
    const cardinal = dirs[idx];

    let text = cardinal;
    if (objectiveName) {
      const relAngle = objectiveAngle - heading;
      const arrowIdx = Math.round(((relAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8;
      const arrows = ['\u2191', '\u2197', '\u2192', '\u2198', '\u2193', '\u2199', '\u2190', '\u2196'];
      text = `${arrows[arrowIdx]} ${objectiveName}  \u00B7  ${cardinal}`;
    }

    this.element.textContent = text;
  }
}
```

- [ ] **Step 4: Create Minimap.js**

```js
export class Minimap {
  constructor() {
    this.container = document.getElementById('minimap');
    this.canvas = document.createElement('canvas');
    this.canvas.width = 160;
    this.canvas.height = 160;
    this.canvas.style.borderRadius = '50%';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.markers = [];
  }

  setMarkers(markers) {
    this.markers = markers; // [{x, z, color, label}]
  }

  update(playerX, playerZ, playerHeading, viewRadius = 300) {
    const ctx = this.ctx;
    const cx = 80, cy = 80, r = 75;

    // Clear
    ctx.clearRect(0, 0, 160, 160);

    // Water background
    ctx.fillStyle = '#0d3b66';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Draw markers
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-playerHeading);

    for (const marker of this.markers) {
      const dx = (marker.x - playerX) / viewRadius * r;
      const dz = (marker.z - playerZ) / viewRadius * r;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > r) continue;

      ctx.fillStyle = marker.color || '#f0c27f';
      ctx.beginPath();
      ctx.arc(dx, dz, marker.size || 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Player indicator (always center, pointing up)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}
```

- [ ] **Step 5: Create QuestLog.js**

```js
export class QuestLog {
  constructor() {
    this.element = document.getElementById('quest-log');
    this.currentObjective = '';
  }

  setObjective(text) {
    this.currentObjective = text;
    this.element.innerHTML = `<strong>\u25C9 Current Quest</strong><br>${text}`;
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }

  show() {
    if (this.currentObjective) {
      this.element.classList.remove('hidden');
    }
  }
}
```

- [ ] **Step 6: Create SailingHUD.js**

```js
export class SailingHUD {
  constructor() {
    this.element = document.getElementById('sailing-hud');
    this.windEl = document.getElementById('wind-indicator');
    this.sailEl = document.getElementById('sail-trim');
    this.crewEl = document.getElementById('crew-count');
  }

  show() { this.element.classList.remove('hidden'); }
  hide() { this.element.classList.add('hidden'); }

  update(windAngle, sailTrim, crewCount) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(((windAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8;
    this.windEl.textContent = `\uD83C\uDF2C Wind: ${dirs[idx]}`;
    this.sailEl.textContent = `\u26F5 Sail: ${Math.round(sailTrim * 100)}%`;
    this.crewEl.textContent = `\uD83D\uDC64 Crew: ${crewCount}`;
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add src/ui/
git commit -m "feat: HUD system — health, compass, minimap, quest log, sailing HUD"
```

---

### Task 6: Menu Scene

**Files:**
- Create: `src/scenes/MenuScene.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create MenuScene.js**

```js
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

    // Lighting
    const sunLight = new THREE.DirectionalLight(0xfff0dd, 2.5);
    sunLight.position.copy(this.sunPosition);
    sunLight.castShadow = true;
    this.scene.add(sunLight);
    this.scene.add(new THREE.AmbientLight(0x4466aa, 0.4));

    // Environment
    this.ocean = new Ocean(this.sunPosition);
    this.ocean.addTo(this.scene);

    this.sky = new Sky(this.sunPosition);
    this.sky.addTo(this.scene);

    this.ship = new Ship(this.sunPosition);
    this.ship.addTo(this.scene);

    // Show menu overlay
    const overlay = document.getElementById('menu-overlay');
    overlay.classList.remove('hidden');

    // Start button
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

    // Slow camera orbit
    const angle = this.time * 0.05;
    this.camera.position.x = Math.cos(angle) * 25;
    this.camera.position.z = Math.sin(angle) * 25;
    this.camera.position.y = 10 + Math.sin(this.time * 0.2) * 2;
    this.camera.lookAt(0, 3, 0);
  }
}
```

- [ ] **Step 2: Update src/main.js — register MenuScene and start**

```js
import * as THREE from 'three';
import { SceneManager } from './engine/SceneManager.js';
import { InputManager } from './engine/InputManager.js';
import { MenuScene } from './scenes/MenuScene.js';

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
```

- [ ] **Step 3: Verify menu scene renders — ocean, sky, ship orbiting**

Run: `npm run dev`
Expected: Title screen with "THE ODYSSEY" text over orbiting ocean scene

- [ ] **Step 4: Commit**

```bash
git add src/scenes/MenuScene.js src/main.js
git commit -m "feat: menu scene with animated ocean background"
```

---

### Task 7: Troy Departure Cutscene

**Files:**
- Create: `src/scenes/CutsceneScene.js`
- Create: `src/scenes/TroyDepartureScene.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create CutsceneScene.js — reusable cutscene base**

```js
import * as THREE from 'three';
import { GameScene } from '../engine/SceneManager.js';

export class CutsceneScene extends GameScene {
  constructor(renderer, input, sceneManager) {
    super(renderer, input, sceneManager);
    this.steps = [];
    this.currentStep = 0;
    this.stepTime = 0;
    this.overlay = document.getElementById('cutscene-overlay');
    this.textEl = document.getElementById('cutscene-text');
  }

  setSteps(steps) {
    // Each step: { duration, text, cameraStart, cameraEnd, lookAt, onEnter?, onExit? }
    this.steps = steps;
    this.currentStep = 0;
    this.stepTime = 0;
  }

  async enter(data) {
    this.overlay.classList.remove('hidden');
    this.currentStep = 0;
    this.stepTime = 0;
    this._enterStep(0);
  }

  async exit() {
    this.overlay.classList.add('hidden');
    this.textEl.classList.remove('visible');
  }

  _enterStep(idx) {
    if (idx >= this.steps.length) {
      this._onComplete();
      return;
    }
    const step = this.steps[idx];
    this.stepTime = 0;

    if (step.text) {
      this.textEl.textContent = step.text;
      this.textEl.classList.add('visible');
    } else {
      this.textEl.classList.remove('visible');
    }

    if (step.onEnter) step.onEnter();
  }

  _onComplete() {
    // Override in subclass
  }

  update(dt) {
    if (this.currentStep >= this.steps.length) return;

    this.stepTime += dt;
    const step = this.steps[this.currentStep];
    const t = Math.min(this.stepTime / step.duration, 1);

    // Smooth interpolation
    const ease = t * t * (3 - 2 * t); // smoothstep

    // Camera animation
    if (step.cameraStart && step.cameraEnd) {
      this.camera.position.lerpVectors(step.cameraStart, step.cameraEnd, ease);
    }
    if (step.lookAt) {
      this.camera.lookAt(step.lookAt);
    }
    if (step.lookAtStart && step.lookAtEnd) {
      const target = new THREE.Vector3().lerpVectors(step.lookAtStart, step.lookAtEnd, ease);
      this.camera.lookAt(target);
    }

    // Custom update callback
    if (step.onUpdate) step.onUpdate(dt, t, ease);

    // Skip with space
    if (this.input.justPressed('Space')) {
      this._advanceStep();
    }

    // Auto-advance
    if (this.stepTime >= step.duration) {
      this._advanceStep();
    }
  }

  _advanceStep() {
    const step = this.steps[this.currentStep];
    if (step && step.onExit) step.onExit();
    this.textEl.classList.remove('visible');
    this.currentStep++;
    if (this.currentStep < this.steps.length) {
      // Small delay for text fade
      setTimeout(() => this._enterStep(this.currentStep), 200);
    } else {
      this._onComplete();
    }
  }
}
```

- [ ] **Step 2: Create TroyDepartureScene.js**

```js
import * as THREE from 'three';
import { CutsceneScene } from './CutsceneScene.js';
import { Ocean } from '../entities/Ocean.js';
import { Sky } from '../entities/Sky.js';
import { Ship } from '../entities/Ship.js';
import { Character } from '../entities/Character.js';
import { Island } from '../entities/Island.js';
import { ShaderLib } from '../shaders/ShaderLib.js';

export class TroyDepartureScene extends CutsceneScene {
  constructor(renderer, input, sceneManager) {
    super(renderer, input, sceneManager);
  }

  async enter(data) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.time = 0;

    // Sunset/fire lighting for Troy burning
    this.sunPosition = new THREE.Vector3(-60, 15, -40);

    const sunLight = new THREE.DirectionalLight(0xff8844, 2.0);
    sunLight.position.copy(this.sunPosition);
    this.scene.add(sunLight);
    this.scene.add(new THREE.AmbientLight(0x442211, 0.6));

    // Fire point lights (Troy burning)
    this.fireLights = [];
    const firePositions = [
      new THREE.Vector3(-40, 15, -80),
      new THREE.Vector3(-30, 20, -90),
      new THREE.Vector3(-50, 12, -75),
      new THREE.Vector3(-35, 18, -85),
    ];
    for (const pos of firePositions) {
      const light = new THREE.PointLight(0xff4400, 5, 80);
      light.position.copy(pos);
      this.scene.add(light);
      this.fireLights.push(light);
    }

    // Environment
    this.ocean = new Ocean(this.sunPosition);
    this.ocean.addTo(this.scene);

    this.sky = new Sky(this.sunPosition);
    this.sky.addTo(this.scene);

    // Troy island (burning in background)
    this.troy = new Island({
      sunPosition: this.sunPosition,
      radius: 40,
      height: 25,
      rockColor: 0x4a3728,
      grassColor: 0x3a2a1a,
      sandColor: 0x6b4a30,
      hasVegetation: false,
    });
    this.troy.setPosition(-40, 0, -80);
    this.troy.addTo(this.scene);

    // Fire billboards on Troy
    this.fires = [];
    const fireMat = ShaderLib.createFireMaterial();
    for (let i = 0; i < 8; i++) {
      const fireGeo = new THREE.PlaneGeometry(6, 10);
      const fire = new THREE.Mesh(fireGeo, fireMat.clone());
      fire.position.set(
        -40 + (Math.random() - 0.5) * 30,
        10 + Math.random() * 15,
        -80 + (Math.random() - 0.5) * 20
      );
      fire.lookAt(this.camera.position);
      this.fires.push(fire);
      this.scene.add(fire);
    }

    // Odysseus's ship
    this.ship = new Ship(this.sunPosition);
    this.ship.group.position.set(0, 0, -20);
    this.ship.addTo(this.scene);

    // Odysseus on the ship
    this.odysseus = new Character({
      sunPosition: this.sunPosition,
      helmetColor: 0xB8860B,
      capeColor: 0x8B0000,
      hasHelmet: true,
      hasCape: true,
      hasSword: true,
      scale: 0.8,
    });
    this.odysseus.setPosition(- 4, 3.5, 0);
    this.odysseus.group.parent = this.ship.group;
    this.ship.group.add(this.odysseus.group);
    this.odysseus.setPosition(-4, 3.2, 0);

    // Crew members on ship
    this.crew = [];
    for (let i = 0; i < 5; i++) {
      const crewMember = new Character({
        sunPosition: this.sunPosition,
        armorColor: 0x7a6a5a,
        hasHelmet: false,
        hasCape: false,
        hasSword: false,
        scale: 0.7,
      });
      crewMember.setPosition(-2 + i * 1.5, 3, (i % 2 === 0 ? 0.5 : -0.5));
      this.ship.group.add(crewMember.group);
      this.crew.push(crewMember);
    }

    // Cutscene steps
    this.setSteps([
      {
        duration: 6,
        text: "After ten long years, the walls of Troy have finally fallen...",
        cameraStart: new THREE.Vector3(-20, 25, -50),
        cameraEnd: new THREE.Vector3(-30, 18, -60),
        lookAt: new THREE.Vector3(-40, 15, -80),
      },
      {
        duration: 5,
        text: "The great city burns. The war is over.",
        cameraStart: new THREE.Vector3(-30, 18, -60),
        cameraEnd: new THREE.Vector3(-10, 12, -40),
        lookAt: new THREE.Vector3(-40, 12, -80),
      },
      {
        duration: 6,
        text: "Odysseus, King of Ithaca, hero of the wooden horse, gathers his men.",
        cameraStart: new THREE.Vector3(5, 8, -15),
        cameraEnd: new THREE.Vector3(-2, 5, -18),
        lookAt: new THREE.Vector3(-4, 4, -20),
      },
      {
        duration: 5,
        text: '"Set sail for home, brothers. Penelope and Telemachus await."',
        cameraStart: new THREE.Vector3(-6, 5, -17),
        cameraEnd: new THREE.Vector3(-8, 4.5, -16),
        lookAt: new THREE.Vector3(-4, 4, -20),
      },
      {
        duration: 7,
        text: "But the gods have other plans. The journey home will take ten more years...",
        cameraStart: new THREE.Vector3(0, 10, -10),
        cameraEnd: new THREE.Vector3(10, 15, 10),
        lookAtStart: new THREE.Vector3(0, 3, -20),
        lookAtEnd: new THREE.Vector3(0, 2, -30),
        onUpdate: (dt, t) => {
          // Ship starts moving away from Troy
          this.ship.group.position.z += dt * 3;
        },
      },
    ]);

    await super.enter(data);
  }

  _onComplete() {
    this.sceneManager.switchTo('sailing');
  }

  update(dt) {
    this.time += dt;
    this.ocean.update(dt, this.time, this.camera.position);
    this.sky.update(dt, this.time);
    this.ship.update(dt, this.time, this.ocean, null);
    this.odysseus.update(dt, this.time);
    for (const c of this.crew) c.update(dt, this.time);

    // Animate fire
    for (const fire of this.fires) {
      fire.material.uniforms.uTime.value = this.time;
      fire.lookAt(this.camera.position);
    }

    // Flicker fire lights
    for (const light of this.fireLights) {
      light.intensity = 4 + Math.sin(this.time * 5 + light.position.x) * 2;
    }

    super.update(dt);
  }
}
```

- [ ] **Step 3: Update src/main.js — register TroyDepartureScene**

Add imports and registration:

```js
import * as THREE from 'three';
import { SceneManager } from './engine/SceneManager.js';
import { InputManager } from './engine/InputManager.js';
import { MenuScene } from './scenes/MenuScene.js';
import { TroyDepartureScene } from './scenes/TroyDepartureScene.js';

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
```

- [ ] **Step 4: Commit**

```bash
git add src/scenes/CutsceneScene.js src/scenes/TroyDepartureScene.js src/main.js
git commit -m "feat: Troy departure cutscene with burning city, fire shaders, narration"
```

---

### Task 8: Sailing Scene — Playable Open Sea

**Files:**
- Create: `src/scenes/SailingScene.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create SailingScene.js**

```js
import * as THREE from 'three';
import { GameScene } from '../engine/SceneManager.js';
import { Ocean } from '../entities/Ocean.js';
import { Sky } from '../entities/Sky.js';
import { Ship } from '../entities/Ship.js';
import { Character } from '../entities/Character.js';
import { Island } from '../entities/Island.js';
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

    // Lighting
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

    // Environment
    this.ocean = new Ocean(this.sunPosition);
    this.ocean.addTo(this.scene);

    this.sky = new Sky(this.sunPosition);
    this.sky.addTo(this.scene);

    // Player ship
    this.ship = new Ship(this.sunPosition);
    this.ship.addTo(this.scene);

    // Odysseus on ship
    this.odysseus = new Character({
      sunPosition: this.sunPosition,
      scale: 0.8,
    });
    this.odysseus.setPosition(-4, 3.2, 0);
    this.ship.group.add(this.odysseus.group);

    // Crew
    this.crew = [];
    for (let i = 0; i < 5; i++) {
      const c = new Character({
        sunPosition: this.sunPosition,
        armorColor: 0x7a6a5a,
        hasHelmet: false,
        hasCape: false,
        hasSword: false,
        scale: 0.7,
      });
      c.setPosition(-2 + i * 1.5, 3, (i % 2 === 0 ? 0.5 : -0.5));
      this.ship.group.add(c.group);
      this.crew.push(c);
    }

    // Islands in the distance
    this.islands = [];
    const islandConfigs = [
      { x: 200, z: -300, radius: 35, height: 20, label: 'Land of the Lotus Eaters' },
      { x: -250, z: -500, radius: 45, height: 30, label: 'Cyclops Island' },
      { x: 400, z: -700, radius: 25, height: 15, label: 'Aeolus' },
    ];

    for (const cfg of islandConfigs) {
      const island = new Island({
        sunPosition: this.sunPosition,
        radius: cfg.radius,
        height: cfg.height,
      });
      island.setPosition(cfg.x, 0, cfg.z);
      island.addTo(this.scene);
      this.islands.push({ ...cfg, entity: island });
    }

    // Post-processing
    this.postProcessing = createPostProcessing(this.renderer, this.scene, this.camera);

    // UI
    this.hud = new HUD();
    this.hud.show();
    this.healthBar = new HealthBar();
    this.compass = new Compass();
    this.minimap = new Minimap();
    this.questLog = new QuestLog();
    this.sailingHUD = new SailingHUD();
    this.sailingHUD.show();

    this.questLog.setObjective('Sail to the Land of the Lotus Eaters');

    // Player state
    this.health = PLAYER.maxHealth;
    this.stamina = PLAYER.maxStamina;
    this.crewCount = 45;
    this.windAngle = Math.PI * 0.25;
    this.sailTrim = 0.8;

    // Camera settings
    this.cameraDistance = 25;
    this.cameraHeight = 12;
    this.cameraAngle = 0;

    // Set minimap markers
    this.minimap.setMarkers(
      islandConfigs.map(cfg => ({
        x: cfg.x,
        z: cfg.z,
        color: '#f0c27f',
        size: 6,
        label: cfg.label,
      }))
    );

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

    // Ship controls
    this.ship.update(dt, this.time, this.ocean, this.input);

    // Characters
    this.odysseus.update(dt, this.time);
    for (const c of this.crew) c.update(dt, this.time);

    // Environment
    this.ocean.update(dt, this.time, this.camera.position);
    this.sky.update(dt, this.time);

    // Camera follows ship
    const mouseDelta = this.input.getMouseDelta();
    this.cameraAngle += mouseDelta.x * 0.003;

    const shipPos = this.ship.getPosition();
    const camOffset = new THREE.Vector3(
      Math.sin(this.cameraAngle + this.ship.heading) * this.cameraDistance,
      this.cameraHeight,
      Math.cos(this.cameraAngle + this.ship.heading) * this.cameraDistance
    );

    this.camera.position.lerp(shipPos.clone().add(camOffset), dt * 3);
    this.camera.lookAt(shipPos.x, shipPos.y + 5, shipPos.z);

    // UI updates
    this.healthBar.setHealth(this.health / PLAYER.maxHealth);
    this.healthBar.setStamina(this.stamina / PLAYER.maxStamina);

    // Find nearest island for objective compass
    let nearestIsland = null;
    let nearestDist = Infinity;
    for (const island of this.islands) {
      const dx = island.x - shipPos.x;
      const dz = island.z - shipPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIsland = island;
      }
    }

    if (nearestIsland) {
      const angle = Math.atan2(
        nearestIsland.x - shipPos.x,
        nearestIsland.z - shipPos.z
      );
      this.compass.update(this.ship.heading, nearestIsland.label, angle);
    }

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
```

- [ ] **Step 2: Update src/main.js — register SailingScene**

```js
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
```

- [ ] **Step 3: Verify full flow: Menu → Troy cutscene → Sailing with HUD**

Run: `npm run dev`
Expected: Click "Begin Journey" → Troy burning cutscene plays → transitions to sailing with working WASD controls, HUD, compass, minimap, and islands in distance

- [ ] **Step 4: Commit**

```bash
git add src/scenes/SailingScene.js src/main.js
git commit -m "feat: sailing scene with ship controls, post-processing, HUD, islands"
```

---

### Task 9: Final Polish — Wire Everything Together

**Files:**
- Modify: `src/main.js` (if needed)
- Create: `src/engine/AssetManager.js` (placeholder)

- [ ] **Step 1: Create AssetManager.js placeholder**

```js
// Asset manager — will handle procedural geometry caching in future phases
export class AssetManager {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    this.cache.set(key, value);
    return value;
  }

  has(key) {
    return this.cache.has(key);
  }
}
```

- [ ] **Step 2: Add .gitignore**

```
node_modules/
dist/
.superpowers/
.vite/
```

- [ ] **Step 3: Full test — play through Menu → Troy → Sailing**

Run: `npm run dev`
Verify:
1. Menu shows with title, ocean background, orbiting camera
2. Click "Begin Journey" transitions to Troy cutscene
3. Troy burns with fire shaders, narration text appears
4. Camera moves through scripted positions
5. After cutscene, transitions to sailing
6. WASD controls ship, mouse orbits camera
7. HUD shows health, stamina, compass, minimap, sailing info
8. Islands visible in distance
9. Ship bobs on waves, oars animate, sail billows
10. Post-processing (bloom, color grading, vignette) visible
11. No console errors

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: phase 1 complete — menu, Troy cutscene, sailing with full shader pipeline"
```
