/**
 * Simplex-like 2D noise implementation for procedural terrain generation.
 * Seeded for deterministic results per session.
 */

export class SeededRandom {
  constructor(seed = 12345) {
    this.seed = seed;
  }

  // Mulberry32 PRNG
  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }

  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
}

// 2D gradient noise with permutation table
const PERM_SIZE = 512;
let perm = null;
let gradients = null;

export function initNoise(seed = 42) {
  const rng = new SeededRandom(seed);
  perm = new Uint8Array(PERM_SIZE * 2);
  gradients = new Float32Array(PERM_SIZE * 2);

  // Build permutation table
  const p = new Uint8Array(PERM_SIZE);
  for (let i = 0; i < PERM_SIZE; i++) p[i] = i;

  // Fisher-Yates shuffle
  for (let i = PERM_SIZE - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [p[i], p[j]] = [p[j], p[i]];
  }

  for (let i = 0; i < PERM_SIZE * 2; i++) {
    perm[i] = p[i & (PERM_SIZE - 1)];
  }

  // Random unit gradients
  for (let i = 0; i < PERM_SIZE; i++) {
    const angle = rng.next() * Math.PI * 2;
    gradients[i * 2] = Math.cos(angle);
    gradients[i * 2 + 1] = Math.sin(angle);
  }
}

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function dot2(gi, x, y) {
  return gradients[gi * 2] * x + gradients[gi * 2 + 1] * y;
}

function lerp(a, b, t) {
  return a + t * (b - a);
}

/**
 * 2D Perlin noise, returns value in roughly [-1, 1]
 */
export function noise2D(x, y) {
  if (!perm) initNoise();

  const X = Math.floor(x) & (PERM_SIZE - 1);
  const Y = Math.floor(y) & (PERM_SIZE - 1);

  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const gi00 = perm[X + perm[Y]];
  const gi10 = perm[X + 1 + perm[Y]];
  const gi01 = perm[X + perm[Y + 1]];
  const gi11 = perm[X + 1 + perm[Y + 1]];

  const n00 = dot2(gi00, xf, yf);
  const n10 = dot2(gi10, xf - 1, yf);
  const n01 = dot2(gi01, xf, yf - 1);
  const n11 = dot2(gi11, xf - 1, yf - 1);

  const nx0 = lerp(n00, n10, u);
  const nx1 = lerp(n01, n11, u);

  return lerp(nx0, nx1, v);
}

/**
 * Fractal Brownian Motion — layered noise for terrain
 * @param {number} x
 * @param {number} y
 * @param {number} octaves - number of noise layers (4-6 for terrain)
 * @param {number} lacunarity - frequency multiplier per octave (typically 2.0)
 * @param {number} persistence - amplitude multiplier per octave (typically 0.5)
 */
export function fbm(x, y, octaves = 5, lacunarity = 2.0, persistence = 0.5) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

/**
 * Ridge noise — creates sharp ridges good for cliffs
 */
export function ridgeNoise(x, y, octaves = 4) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    let n = noise2D(x * frequency, y * frequency);
    n = 1 - Math.abs(n); // Create ridge
    n = n * n; // Sharpen
    value += amplitude * n;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value / maxValue;
}
