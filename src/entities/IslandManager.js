/**
 * IslandManager — Infinite world island generation
 *
 * Divides the world into a grid of cells. As the player moves,
 * cells within view range are checked. Each cell has a seeded chance
 * of containing an island. Islands are generated on demand and cached.
 * Cells far behind the player are unloaded to save memory.
 *
 * The seed ensures islands are always in the same place per session.
 */

import { Island } from './Island.js';
import { SeededRandom, initNoise } from '../utils/noise.js';

const CELL_SIZE = 400;       // World units per grid cell
const VIEW_RANGE = 3;         // Cells ahead/around to generate
const UNLOAD_RANGE = 5;       // Cells beyond this are removed
const ISLAND_CHANCE = 0.35;   // Probability a cell has an island

export class IslandManager {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Vector3} sunPosition
   * @param {number} worldSeed - global seed for this session
   * @param {Array} fixedIslands - story islands to always place [{cellX, cellZ, options}]
   */
  constructor(scene, sunPosition, worldSeed = 42, fixedIslands = []) {
    this.scene = scene;
    this.sunPosition = sunPosition;
    this.worldSeed = worldSeed;
    this.fixedIslands = fixedIslands;

    // Map of "cellX,cellZ" → { island, type }
    this.loaded = new Map();

    // Initialize noise with world seed
    initNoise(worldSeed);
  }

  /**
   * Call each frame with the player's world position.
   * Generates new islands in nearby cells, removes distant ones.
   */
  updatePlayerPosition(playerX, playerZ) {
    const cellX = Math.floor(playerX / CELL_SIZE);
    const cellZ = Math.floor(playerZ / CELL_SIZE);

    // Generate islands in range
    for (let dx = -VIEW_RANGE; dx <= VIEW_RANGE; dx++) {
      for (let dz = -VIEW_RANGE; dz <= VIEW_RANGE; dz++) {
        const cx = cellX + dx;
        const cz = cellZ + dz;
        const key = `${cx},${cz}`;

        if (this.loaded.has(key)) continue;

        // Check if this cell should have an island
        const islandData = this._getCellIsland(cx, cz);
        if (islandData) {
          this._spawnIsland(key, cx, cz, islandData);
        } else {
          // Mark as checked (no island)
          this.loaded.set(key, null);
        }
      }
    }

    // Unload distant cells
    for (const [key, entry] of this.loaded) {
      const [kx, kz] = key.split(',').map(Number);
      const dist = Math.max(Math.abs(kx - cellX), Math.abs(kz - cellZ));

      if (dist > UNLOAD_RANGE) {
        if (entry && entry.island) {
          this.scene.remove(entry.island.group);
        }
        this.loaded.delete(key);
      }
    }
  }

  /**
   * Determine if a cell contains an island and its properties.
   * Uses seeded randomness so the same cell always produces the same result.
   */
  _getCellIsland(cx, cz) {
    // Check fixed/story islands first
    for (const fi of this.fixedIslands) {
      if (fi.cellX === cx && fi.cellZ === cz) {
        return fi.options;
      }
    }

    // Skip the starting area (0,0)
    if (cx === 0 && cz === 0) return null;

    // Seeded random for this cell
    const cellSeed = this.worldSeed + cx * 73856093 + cz * 19349663;
    const rng = new SeededRandom(Math.abs(cellSeed));

    if (rng.next() > ISLAND_CHANCE) return null;

    // Determine island properties
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

    const hasRuins = rng.next() < 0.3;
    const hasMagic = rng.next() < 0.15;

    // Position within cell (not dead center — offset randomly)
    const offsetX = rng.range(CELL_SIZE * 0.15, CELL_SIZE * 0.85);
    const offsetZ = rng.range(CELL_SIZE * 0.15, CELL_SIZE * 0.85);

    return {
      radius,
      height,
      seed: Math.abs(cellSeed),
      type,
      hasRuins,
      hasMagic,
      hasVegetation: true,
      offsetX,
      offsetZ,
    };
  }

  _spawnIsland(key, cx, cz, data) {
    const island = new Island({
      sunPosition: this.sunPosition,
      radius: data.radius,
      height: data.height,
      seed: data.seed,
      type: data.type,
      hasRuins: data.hasRuins,
      hasMagic: data.hasMagic,
      hasVegetation: data.hasVegetation,
      label: data.label || '',
    });

    const worldX = cx * CELL_SIZE + (data.offsetX || CELL_SIZE / 2);
    const worldZ = cz * CELL_SIZE + (data.offsetZ || CELL_SIZE / 2);
    island.setPosition(worldX, 0, worldZ);
    island.addTo(this.scene);

    this.loaded.set(key, { island, data, worldX, worldZ });
  }

  /** Update animated elements on all loaded islands */
  update(time) {
    for (const [, entry] of this.loaded) {
      if (entry && entry.island && entry.data.hasMagic) {
        entry.island.update(time);
      }
    }
  }

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

  /** Get all loaded island positions + labels for minimap */
  getIslandMarkers() {
    const markers = [];
    for (const [, entry] of this.loaded) {
      if (!entry || !entry.island) continue;
      markers.push({
        x: entry.worldX,
        z: entry.worldZ,
        color: entry.data.hasMagic ? '#ffd700' : '#4a8741',
        size: Math.max(3, entry.data.radius * 0.15),
        label: entry.data.label || '',
      });
    }
    return markers;
  }
}
