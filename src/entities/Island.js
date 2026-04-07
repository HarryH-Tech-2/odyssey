/**
 * Procedural Island Generator
 *
 * How island generation works:
 * 1. A heightmap is generated using layered Perlin noise (FBM)
 * 2. A radial falloff mask forces edges to sea level, creating natural shorelines
 * 3. Ridge noise adds cliff faces and dramatic elevation changes
 * 4. Vertex colors are assigned by elevation: underwater→sand→grass→rock→snow
 * 5. Objects (trees, rocks, ruins) are scattered based on elevation + slope + noise
 * 6. Trees and rocks use InstancedMesh for GPU performance
 * 7. Each island has a unique seed derived from its grid position
 */

import * as THREE from 'three';
import { noise2D, fbm, ridgeNoise, SeededRandom } from '../utils/noise.js';

// ── Shared geometries (created once, instanced many times) ──

let _treeGeos = null;
let _rockGeo = null;
let _columnGeo = null;

function getSharedGeometries() {
  if (_treeGeos) return { treeGeos: _treeGeos, rockGeo: _rockGeo, columnGeo: _columnGeo };

  // Cypress tree — tall narrow cone
  const cypress = new THREE.ConeGeometry(0.4, 3, 5);
  cypress.translate(0, 1.5, 0);

  // Palm / olive — sphere canopy on stick
  const olive = new THREE.BufferGeometry();
  const trunkG = new THREE.CylinderGeometry(0.06, 0.1, 1.5, 4);
  trunkG.translate(0, 0.75, 0);
  const canopyG = new THREE.SphereGeometry(0.7, 5, 4);
  canopyG.scale(1.2, 0.6, 1);
  canopyG.translate(0, 2.0, 0);
  olive.copy(mergeGeometries([trunkG, canopyG]));

  // Pine — two stacked cones
  const pine = new THREE.BufferGeometry();
  const pineLower = new THREE.ConeGeometry(0.8, 1.6, 5);
  pineLower.translate(0, 1.8, 0);
  const pineUpper = new THREE.ConeGeometry(0.55, 1.4, 5);
  pineUpper.translate(0, 2.8, 0);
  pine.copy(mergeGeometries([pineLower, pineUpper]));

  _treeGeos = [cypress, olive, pine];

  // Rock — deformed dodecahedron
  _rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rpos = _rockGeo.attributes.position;
  for (let i = 0; i < rpos.count; i++) {
    rpos.setX(i, rpos.getX(i) * (0.6 + Math.random() * 0.8));
    rpos.setY(i, rpos.getY(i) * (0.4 + Math.random() * 0.6));
    rpos.setZ(i, rpos.getZ(i) * (0.6 + Math.random() * 0.8));
  }
  _rockGeo.computeVertexNormals();

  // Column — cylinder with torus capital
  const colShaft = new THREE.CylinderGeometry(0.15, 0.18, 2.5, 6);
  colShaft.translate(0, 1.25, 0);
  const colCap = new THREE.TorusGeometry(0.22, 0.06, 4, 8);
  colCap.rotateX(Math.PI / 2);
  colCap.translate(0, 2.5, 0);
  _columnGeo = mergeGeometries([colShaft, colCap]);

  return { treeGeos: _treeGeos, rockGeo: _rockGeo, columnGeo: _columnGeo };
}

/** Merge array of BufferGeometries into one */
function mergeGeometries(geos) {
  let totalVerts = 0, totalIdx = 0;
  for (const g of geos) {
    totalVerts += g.attributes.position.count;
    totalIdx += g.index ? g.index.count : 0;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const indices = [];
  let vertOffset = 0, idxOffset = 0;

  for (const g of geos) {
    const pos = g.attributes.position;
    const nor = g.attributes.normal || g.computeVertexNormals() || g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      positions[(vertOffset + i) * 3] = pos.getX(i);
      positions[(vertOffset + i) * 3 + 1] = pos.getY(i);
      positions[(vertOffset + i) * 3 + 2] = pos.getZ(i);
      if (nor) {
        normals[(vertOffset + i) * 3] = nor.getX(i);
        normals[(vertOffset + i) * 3 + 1] = nor.getY(i);
        normals[(vertOffset + i) * 3 + 2] = nor.getZ(i);
      }
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indices.push(g.index.getX(i) + vertOffset);
      }
    }
    vertOffset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  if (indices.length) merged.setIndex(indices);
  merged.computeVertexNormals();
  return merged;
}

// ── Color palette ──

const COLORS = {
  deepWater: new THREE.Color(0x0a2a4a),
  shallowWater: new THREE.Color(0x1a8a9a),
  sand: new THREE.Color(0xd4b483),
  grassLight: new THREE.Color(0x5a9a3a),
  grassDark: new THREE.Color(0x3a7a25),
  rock: new THREE.Color(0x7a6e60),
  cliff: new THREE.Color(0x5a504a),
  snow: new THREE.Color(0xe8e4e0),
  ruins: new THREE.Color(0xc8bfa8),
  ruinsDark: new THREE.Color(0x8a7e6a),
  treeTrunk: new THREE.Color(0x5a4030),
  treeLeaves: new THREE.Color(0x2a6a18),
  cypressGreen: new THREE.Color(0x1a4a15),
  goldenGlow: new THREE.Color(0xffd700),
};

// ── Island class ──

export class Island {
  /**
   * @param {object} options
   * @param {THREE.Vector3} options.sunPosition
   * @param {number} options.radius - island radius in world units
   * @param {number} options.height - max elevation
   * @param {number} options.seed - unique seed for this island
   * @param {string} options.type - 'small' | 'medium' | 'large'
   * @param {boolean} options.hasRuins - whether to scatter Greek ruins
   * @param {boolean} options.hasMagic - whether to add glowing mythological elements
   * @param {string} options.label - display name
   */
  constructor(options = {}) {
    const {
      sunPosition = new THREE.Vector3(100, 40, -80),
      radius = 30,
      height = 15,
      seed = 1,
      type = 'medium',
      hasRuins = false,
      hasMagic = false,
      hasVegetation = true,
      label = '',
    } = options;

    this.group = new THREE.Group();
    this.radius = radius;
    this.height = height;
    this.seed = seed;
    this.label = label;
    this.rng = new SeededRandom(seed);

    // Generate heightmap terrain mesh
    this._generateTerrain(radius, height, sunPosition);

    // Scatter objects
    if (hasVegetation) {
      this._scatterTrees(radius, height, sunPosition);
      this._scatterRocks(radius, height, sunPosition);
    }

    if (hasRuins) {
      this._scatterRuins(radius, height, sunPosition);
    }

    if (hasMagic) {
      this._addMythologicalElements(radius, height);
    }

    // Shoreline foam ring
    this._addShoreline(radius);

    // Distance visibility: atmospheric glow
    this._addAtmosphericGlow(radius, height);
  }

  /**
   * Generate the terrain mesh using noise-based heightmap with vertex colors.
   * The island shape comes from FBM noise masked by a radial falloff.
   */
  _generateTerrain(radius, height, sunPosition) {
    const segments = 64;
    const geo = new THREE.PlaneGeometry(radius * 2.2, radius * 2.2, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const seed = this.seed;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Distance from center (0 to 1)
      const dist = Math.sqrt(x * x + z * z) / radius;

      // Radial falloff — smooth drop to zero at edges
      const falloff = Math.max(0, 1 - dist * dist);
      const edgeFalloff = falloff * falloff * (3 - 2 * falloff); // smoothstep

      // Layered noise for terrain features
      const nx = x * 0.04 + seed * 7.3;
      const nz = z * 0.04 + seed * 13.7;

      const baseNoise = fbm(nx, nz, 5, 2.0, 0.5);           // rolling hills
      const ridges = ridgeNoise(nx * 1.5, nz * 1.5, 4);       // cliff edges
      const detail = fbm(nx * 3, nz * 3, 3, 2.0, 0.4) * 0.3; // fine detail

      // Combine noise layers
      let elevation = (baseNoise * 0.6 + ridges * 0.3 + detail) * edgeFalloff;

      // Create plateaus by clamping mid-range values
      if (elevation > 0.3 && elevation < 0.5) {
        elevation = 0.3 + (elevation - 0.3) * 0.3; // Flatten plateaus
      }

      const y = elevation * height;
      pos.setY(i, y);

      // ── Vertex color by elevation + slope ──
      const normalizedH = elevation; // 0 = sea level, 1 = peak
      let color;

      if (normalizedH < 0.02) {
        // Underwater / shallow
        color = COLORS.shallowWater;
      } else if (normalizedH < 0.08) {
        // Beach sand
        const t = (normalizedH - 0.02) / 0.06;
        color = COLORS.sand.clone().lerp(COLORS.grassLight, t);
      } else if (normalizedH < 0.35) {
        // Grass — blend light to dark with height
        const t = (normalizedH - 0.08) / 0.27;
        color = COLORS.grassLight.clone().lerp(COLORS.grassDark, t);
        // Add noise variation
        const colorNoise = noise2D(x * 0.2 + seed, z * 0.2) * 0.1;
        color.r += colorNoise;
        color.g += colorNoise * 0.5;
      } else if (normalizedH < 0.6) {
        // Rock / cliff
        const t = (normalizedH - 0.35) / 0.25;
        color = COLORS.grassDark.clone().lerp(COLORS.rock, t);
      } else if (normalizedH < 0.85) {
        // High rock
        const t = (normalizedH - 0.6) / 0.25;
        color = COLORS.rock.clone().lerp(COLORS.cliff, t);
      } else {
        // Peak — light stone
        const t = (normalizedH - 0.85) / 0.15;
        color = COLORS.cliff.clone().lerp(COLORS.snow, t);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    // Material uses vertex colors
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.02,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.terrainMesh = mesh;
    this.terrainGeo = geo;
    this.group.add(mesh);
  }

  /** Sample terrain height at local (x,z) — used for placing objects and character ground following */
  sampleHeight(x, z) {
    const dist = Math.sqrt(x * x + z * z) / this.radius;
    const falloff = Math.max(0, 1 - dist * dist);
    const edgeFalloff = falloff * falloff * (3 - 2 * falloff);

    const nx = x * 0.04 + this.seed * 7.3;
    const nz = z * 0.04 + this.seed * 13.7;

    const baseNoise = fbm(nx, nz, 5, 2.0, 0.5);
    const ridges = ridgeNoise(nx * 1.5, nz * 1.5, 4);
    const detail = fbm(nx * 3, nz * 3, 3, 2.0, 0.4) * 0.3;

    let elevation = (baseNoise * 0.6 + ridges * 0.3 + detail) * edgeFalloff;
    if (elevation > 0.3 && elevation < 0.5) {
      elevation = 0.3 + (elevation - 0.3) * 0.3;
    }

    return elevation * this.height;
  }

  /** Scatter trees using instanced meshes for performance */
  _scatterTrees(radius, height, sunPosition) {
    const { treeGeos } = getSharedGeometries();
    const rng = this.rng;

    // Materials for each tree type
    const treeMats = [
      new THREE.MeshStandardMaterial({ color: COLORS.cypressGreen, roughness: 0.85, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: COLORS.treeLeaves, roughness: 0.8, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x2D5A1E, roughness: 0.82, flatShading: true }),
    ];

    // Determine tree count based on island size
    const count = Math.floor(radius * 2.5);
    const dummy = new THREE.Object3D();

    for (let t = 0; t < 3; t++) {
      const instanceCount = Math.floor(count / 3);
      const mesh = new THREE.InstancedMesh(treeGeos[t], treeMats[t], instanceCount);
      let placed = 0;

      for (let i = 0; i < instanceCount * 3 && placed < instanceCount; i++) {
        const angle = rng.next() * Math.PI * 2;
        const dist = rng.range(0.15, 0.7) * radius;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = this.sampleHeight(x, z);

        // Only place on grass elevation band
        const normH = y / height;
        if (normH < 0.06 || normH > 0.5) continue;

        const scale = rng.range(0.6, 1.5);
        dummy.position.set(x, y, z);
        dummy.scale.set(scale, scale * rng.range(0.8, 1.4), scale);
        dummy.rotation.y = rng.next() * Math.PI * 2;
        dummy.updateMatrix();
        mesh.setMatrixAt(placed, dummy.matrix);
        placed++;
      }

      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = placed;
      mesh.castShadow = true;
      this.group.add(mesh);
    }
  }

  /** Scatter rocks using instanced meshes */
  _scatterRocks(radius, height, sunPosition) {
    const { rockGeo } = getSharedGeometries();
    const rng = this.rng;
    const count = Math.floor(radius * 1.2);
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.rock,
      roughness: 0.95,
      metalness: 0.02,
      flatShading: true,
    });

    const mesh = new THREE.InstancedMesh(rockGeo, mat, count);
    const dummy = new THREE.Object3D();
    let placed = 0;

    for (let i = 0; i < count * 3 && placed < count; i++) {
      const angle = rng.next() * Math.PI * 2;
      const dist = rng.range(0.1, 0.95) * radius;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = this.sampleHeight(x, z);

      if (y < 0.5) continue;

      const scale = rng.range(0.2, 1.0);
      dummy.position.set(x, y - scale * 0.2, z);
      dummy.scale.set(scale, scale * rng.range(0.4, 1.0), scale);
      dummy.rotation.set(rng.next(), rng.next() * Math.PI, rng.next());
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = placed;
    mesh.castShadow = true;
    this.group.add(mesh);
  }

  /** Scatter Greek ruins — temple fragments, columns, shrine bases */
  _scatterRuins(radius, height, sunPosition) {
    const { columnGeo } = getSharedGeometries();
    const rng = this.rng;

    const ruinsMat = new THREE.MeshStandardMaterial({
      color: COLORS.ruins,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });

    // Columns (instanced)
    const colCount = Math.floor(radius * 0.4);
    const colMesh = new THREE.InstancedMesh(columnGeo, ruinsMat, colCount);
    const dummy = new THREE.Object3D();
    let placed = 0;

    // Try to cluster ruins in one area
    const clusterAngle = rng.next() * Math.PI * 2;
    const clusterDist = rng.range(0.2, 0.5) * radius;
    const cx = Math.cos(clusterAngle) * clusterDist;
    const cz = Math.sin(clusterAngle) * clusterDist;

    for (let i = 0; i < colCount * 3 && placed < colCount; i++) {
      const x = cx + rng.range(-radius * 0.2, radius * 0.2);
      const z = cz + rng.range(-radius * 0.2, radius * 0.2);
      const y = this.sampleHeight(x, z);

      const normH = y / height;
      if (normH < 0.05 || normH > 0.6) continue;

      const scale = rng.range(0.8, 1.5);
      const tilt = rng.range(-0.2, 0.2);
      dummy.position.set(x, y, z);
      dummy.scale.set(scale, scale * rng.range(0.4, 1.0), scale); // Some broken/shorter
      dummy.rotation.set(tilt, rng.next() * Math.PI * 2, tilt * 0.5);
      dummy.updateMatrix();
      colMesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    colMesh.instanceMatrix.needsUpdate = true;
    colMesh.count = placed;
    colMesh.castShadow = true;
    this.group.add(colMesh);

    // Temple platform (single larger piece at cluster center)
    const platformGeo = new THREE.BoxGeometry(4, 0.5, 3);
    const platform = new THREE.Mesh(platformGeo, ruinsMat);
    const py = this.sampleHeight(cx, cz);
    platform.position.set(cx, py + 0.25, cz);
    platform.rotation.y = rng.next() * Math.PI;
    platform.castShadow = true;
    this.group.add(platform);

    // Pediment (triangular roof fragment, possibly fallen)
    const pedimentShape = new THREE.Shape();
    pedimentShape.moveTo(-2, 0);
    pedimentShape.lineTo(0, 1.5);
    pedimentShape.lineTo(2, 0);
    pedimentShape.lineTo(-2, 0);
    const pedGeo = new THREE.ExtrudeGeometry(pedimentShape, { depth: 0.3, bevelEnabled: false });
    const pediment = new THREE.Mesh(pedGeo, ruinsMat);
    pediment.position.set(cx + rng.range(-2, 2), py + 0.5, cz + rng.range(-2, 2));
    pediment.rotation.set(rng.range(-0.3, 0.1), rng.next() * Math.PI, rng.range(-0.1, 0.1));
    pediment.castShadow = true;
    this.group.add(pediment);
  }

  /** Add glowing mythological elements — light beams, magical ruins */
  _addMythologicalElements(radius, height) {
    const rng = this.rng;

    // Glowing light beam from ruins/shrine
    const beamGeo = new THREE.CylinderGeometry(0.3, 1.5, height * 2, 8, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: COLORS.goldenGlow,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    const bx = rng.range(-0.3, 0.3) * radius;
    const bz = rng.range(-0.3, 0.3) * radius;
    beam.position.set(bx, height * 0.5, bz);
    this.group.add(beam);

    // Glowing orb at base of beam
    const orbGeo = new THREE.SphereGeometry(0.5, 12, 12);
    const orbMat = new THREE.MeshBasicMaterial({
      color: COLORS.goldenGlow,
      transparent: true,
      opacity: 0.4,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(bx, this.sampleHeight(bx, bz) + 1.5, bz);
    this.group.add(orb);
    this.magicOrb = orb;

    // Point light for local illumination
    const glow = new THREE.PointLight(0xffd700, 3, radius * 0.6);
    glow.position.copy(orb.position);
    this.group.add(glow);
    this.magicLight = glow;

    // Floating particle ring (simple torus as placeholder for particles)
    const ringGeo = new THREE.TorusGeometry(1.5, 0.03, 6, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.3,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(orb.position);
    ring.position.y += 0.5;
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);
    this.magicRing = ring;
  }

  /** Shoreline foam / shallow water blending */
  _addShoreline(radius) {
    // Translucent turquoise ring at waterline
    const shoreGeo = new THREE.RingGeometry(radius * 0.85, radius * 1.15, 48, 2);
    shoreGeo.rotateX(-Math.PI / 2);
    const shoreMat = new THREE.MeshBasicMaterial({
      color: 0x40c0b0,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const shore = new THREE.Mesh(shoreGeo, shoreMat);
    shore.position.y = 0.15;
    this.group.add(shore);

    // White foam line
    const foamGeo = new THREE.RingGeometry(radius * 0.92, radius * 1.0, 48, 1);
    foamGeo.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const foam = new THREE.Mesh(foamGeo, foamMat);
    foam.position.y = 0.2;
    this.group.add(foam);
  }

  /** Atmospheric glow so island is visible and impressive from distance */
  _addAtmosphericGlow(radius, height) {
    // Vertical haze — warm glow pillar
    const hazeGeo = new THREE.CylinderGeometry(radius * 0.4, radius * 0.9, height * 1.5, 8, 1, true);
    const hazeMat = new THREE.MeshBasicMaterial({
      color: 0xd4b483,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const haze = new THREE.Mesh(hazeGeo, hazeMat);
    haze.position.y = height * 0.4;
    this.group.add(haze);

    // Low mist at base
    const mistGeo = new THREE.CircleGeometry(radius * 1.5, 24);
    mistGeo.rotateX(-Math.PI / 2);
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0x88aacc,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
    });
    const mist = new THREE.Mesh(mistGeo, mistMat);
    mist.position.y = 1;
    this.group.add(mist);
  }

  /** Animate mythological elements (call each frame if island has magic) */
  update(time) {
    if (this.magicOrb) {
      this.magicOrb.position.y += Math.sin(time * 2) * 0.003;
      this.magicOrb.material.opacity = 0.3 + Math.sin(time * 3) * 0.15;
    }
    if (this.magicLight) {
      this.magicLight.intensity = 2.5 + Math.sin(time * 2.5) * 1.5;
    }
    if (this.magicRing) {
      this.magicRing.rotation.z = time * 0.5;
      this.magicRing.position.y += Math.sin(time * 1.5) * 0.002;
    }
  }

  addTo(scene) {
    scene.add(this.group);
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }
}
