/**
 * Procedural Island Generator — Realistic Mediterranean Style
 *
 * Smooth-shaded terrain with high segment count, slope-aware coloring,
 * organic multi-canopy trees, grass patches, natural rocks, detailed ruins.
 * Uses InstancedMesh throughout for GPU performance.
 */

import * as THREE from 'three';
import { noise2D, fbm, ridgeNoise, SeededRandom } from '../utils/noise.js';

// ── Shared geometries ──

let _treeGeos = null;
let _rockGeo = null;
let _columnGeo = null;
let _grassGeo = null;

function getSharedGeometries() {
  if (_treeGeos) return { treeGeos: _treeGeos, rockGeo: _rockGeo, columnGeo: _columnGeo, grassGeo: _grassGeo };

  // Cypress — tapered multi-layer cone (Mediterranean)
  const cypress = new THREE.BufferGeometry();
  const cTrunk = new THREE.CylinderGeometry(0.06, 0.1, 1.8, 6);
  cTrunk.translate(0, 0.9, 0);
  const cTop1 = new THREE.ConeGeometry(0.35, 2.5, 7);
  cTop1.translate(0, 3.0, 0);
  const cTop2 = new THREE.ConeGeometry(0.25, 1.8, 7);
  cTop2.translate(0, 4.2, 0);
  cypress.copy(mergeGeometries([cTrunk, cTop1, cTop2]));

  // Olive tree — thick gnarled trunk with multiple canopy spheres
  const olive = new THREE.BufferGeometry();
  const oTrunk = new THREE.CylinderGeometry(0.08, 0.14, 1.8, 6);
  oTrunk.translate(0, 0.9, 0);
  // Branch stub
  const oBranch = new THREE.CylinderGeometry(0.04, 0.06, 0.6, 4);
  oBranch.rotateZ(0.8);
  oBranch.translate(0.2, 1.6, 0);
  // Multi-sphere canopy for organic look
  const oC1 = new THREE.SphereGeometry(0.65, 8, 6);
  oC1.scale(1.3, 0.7, 1.1);
  oC1.translate(0, 2.2, 0);
  const oC2 = new THREE.SphereGeometry(0.45, 7, 5);
  oC2.translate(0.4, 2.4, 0.2);
  const oC3 = new THREE.SphereGeometry(0.4, 7, 5);
  oC3.translate(-0.3, 2.5, -0.15);
  olive.copy(mergeGeometries([oTrunk, oBranch, oC1, oC2, oC3]));

  // Pine — layered canopy tiers
  const pine = new THREE.BufferGeometry();
  const pTrunk = new THREE.CylinderGeometry(0.06, 0.1, 2.0, 6);
  pTrunk.translate(0, 1.0, 0);
  const pL1 = new THREE.ConeGeometry(0.9, 1.4, 8);
  pL1.translate(0, 2.2, 0);
  const pL2 = new THREE.ConeGeometry(0.7, 1.2, 8);
  pL2.translate(0, 3.0, 0);
  const pL3 = new THREE.ConeGeometry(0.45, 1.0, 7);
  pL3.translate(0, 3.7, 0);
  pine.copy(mergeGeometries([pTrunk, pL1, pL2, pL3]));

  _treeGeos = [cypress, olive, pine];

  // Rock — subdivided dodecahedron for smoother organic shape
  _rockGeo = new THREE.DodecahedronGeometry(1, 1);
  const rpos = _rockGeo.attributes.position;
  for (let i = 0; i < rpos.count; i++) {
    const nx = rpos.getX(i) * 2.7;
    const ny = rpos.getY(i) * 2.7;
    const nz = rpos.getZ(i) * 2.7;
    const disp = noise2D(nx + nz, ny) * 0.15;
    rpos.setX(i, rpos.getX(i) * (0.7 + disp + Math.abs(noise2D(nx, nz)) * 0.3));
    rpos.setY(i, rpos.getY(i) * (0.5 + Math.abs(noise2D(ny, nx)) * 0.4));
    rpos.setZ(i, rpos.getZ(i) * (0.7 + disp + Math.abs(noise2D(nz, ny)) * 0.3));
  }
  _rockGeo.computeVertexNormals();

  // Column — higher poly for smooth look
  const colShaft = new THREE.CylinderGeometry(0.15, 0.18, 2.5, 10);
  colShaft.translate(0, 1.25, 0);
  // Fluted effect — subtle ridges via vertex displacement
  const cPos = colShaft.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    const angle = Math.atan2(cPos.getZ(i), cPos.getX(i));
    const flute = Math.sin(angle * 10) * 0.008;
    const r = Math.sqrt(cPos.getX(i) ** 2 + cPos.getZ(i) ** 2) + flute;
    cPos.setX(i, Math.cos(angle) * r);
    cPos.setZ(i, Math.sin(angle) * r);
  }
  colShaft.computeVertexNormals();
  const colCap = new THREE.TorusGeometry(0.22, 0.06, 6, 12);
  colCap.rotateX(Math.PI / 2);
  colCap.translate(0, 2.5, 0);
  const colBase = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 10);
  colBase.translate(0, 0.05, 0);
  _columnGeo = mergeGeometries([colBase, colShaft, colCap]);

  // Grass blade — crossed planes for billboard grass
  const gBlade1 = new THREE.PlaneGeometry(0.3, 0.5);
  gBlade1.translate(0, 0.25, 0);
  const gBlade2 = new THREE.PlaneGeometry(0.3, 0.5);
  gBlade2.rotateY(Math.PI / 3);
  gBlade2.translate(0, 0.25, 0);
  const gBlade3 = new THREE.PlaneGeometry(0.3, 0.5);
  gBlade3.rotateY(-Math.PI / 3);
  gBlade3.translate(0, 0.25, 0);
  _grassGeo = mergeGeometries([gBlade1, gBlade2, gBlade3]);

  return { treeGeos: _treeGeos, rockGeo: _rockGeo, columnGeo: _columnGeo, grassGeo: _grassGeo };
}

/** Merge array of BufferGeometries into one */
function mergeGeometries(geos) {
  let totalVerts = 0;
  for (const g of geos) totalVerts += g.attributes.position.count;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const indices = [];
  let vertOffset = 0;

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

// ── Color palette — richer Mediterranean tones ──

const COLORS = {
  deepWater: new THREE.Color(0x0a2a4a),
  shallowWater: new THREE.Color(0x1a9aaa),
  wetSand: new THREE.Color(0xc4a470),
  sand: new THREE.Color(0xdcc89a),
  drySand: new THREE.Color(0xe0d4aa),
  grassLight: new THREE.Color(0x6aaa42),
  grassMid: new THREE.Color(0x4a8a2a),
  grassDark: new THREE.Color(0x3a7a22),
  scrub: new THREE.Color(0x7a8a50),
  rock: new THREE.Color(0x8a806e),
  cliff: new THREE.Color(0x6a6058),
  snow: new THREE.Color(0xeae6de),
  ruins: new THREE.Color(0xd0c8b0),
  ruinsDark: new THREE.Color(0x9a9080),
  treeTrunk: new THREE.Color(0x6a5040),
  cypressGreen: new THREE.Color(0x1e5518),
  oliveGreen: new THREE.Color(0x3a7828),
  pineGreen: new THREE.Color(0x2a6020),
  goldenGlow: new THREE.Color(0xffd700),
};


export class Island {
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

    this._generateTerrain(radius, height, sunPosition);

    if (hasVegetation) {
      this._scatterTrees(radius, height, sunPosition);
      this._scatterGrass(radius, height);
      this._scatterRocks(radius, height, sunPosition);
    }

    if (hasRuins) this._scatterRuins(radius, height, sunPosition);
    if (hasMagic) this._addMythologicalElements(radius, height);

    this._addShoreline(radius);
    this._addAtmosphericGlow(radius, height);
  }

  // ── Terrain generation — smooth shaded, slope-aware colors, high resolution ──

  _generateTerrain(radius, height, sunPosition) {
    // Higher segment count for smooth terrain — scale with island size
    const segments = Math.min(192, Math.max(96, Math.floor(radius * 1.5)));
    const geo = new THREE.PlaneGeometry(radius * 2.2, radius * 2.2, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const seed = this.seed;

    // First pass — set heights
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this._calcElevation(x, z, radius, height, seed));
    }

    // Compute normals so we can read slope
    geo.computeVertexNormals();
    const normals = geo.attributes.normal;

    // Second pass — color by elevation + slope + noise
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = pos.getY(i);
      const normalizedH = y / height;

      // Slope: dot product of normal with up vector (1 = flat, 0 = vertical)
      const slope = normals.getY(i);
      const isSteep = slope < 0.75;

      // Noise for color variation
      const colorVar = noise2D(x * 0.15 + seed, z * 0.15) * 0.08;
      const microVar = noise2D(x * 0.5 + seed * 3, z * 0.5) * 0.04;

      let color;
      if (normalizedH < 0.01) {
        color = COLORS.shallowWater.clone();
      } else if (normalizedH < 0.04) {
        const t = (normalizedH - 0.01) / 0.03;
        color = COLORS.wetSand.clone().lerp(COLORS.sand, t);
      } else if (normalizedH < 0.08) {
        const t = (normalizedH - 0.04) / 0.04;
        color = COLORS.sand.clone().lerp(COLORS.drySand, t);
      } else if (normalizedH < 0.15) {
        const t = (normalizedH - 0.08) / 0.07;
        color = COLORS.drySand.clone().lerp(COLORS.grassLight, t);
      } else if (normalizedH < 0.4) {
        if (isSteep) {
          // Steep slopes show rock/dirt
          color = COLORS.scrub.clone().lerp(COLORS.rock, (0.75 - slope) * 3);
        } else {
          const t = (normalizedH - 0.15) / 0.25;
          color = COLORS.grassLight.clone().lerp(COLORS.grassDark, t);
        }
      } else if (normalizedH < 0.6) {
        if (isSteep) {
          color = COLORS.rock.clone();
        } else {
          const t = (normalizedH - 0.4) / 0.2;
          color = COLORS.grassDark.clone().lerp(COLORS.scrub, t);
        }
      } else if (normalizedH < 0.85) {
        const t = (normalizedH - 0.6) / 0.25;
        color = COLORS.rock.clone().lerp(COLORS.cliff, t);
      } else {
        const t = (normalizedH - 0.85) / 0.15;
        color = COLORS.cliff.clone().lerp(COLORS.snow, t);
      }

      // Apply noise variation
      color.r = Math.max(0, Math.min(1, color.r + colorVar + microVar));
      color.g = Math.max(0, Math.min(1, color.g + colorVar * 0.6 + microVar));
      color.b = Math.max(0, Math.min(1, color.b + colorVar * 0.3));

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Smooth shading with vertex colors
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.02,
      flatShading: false,  // SMOOTH shading — key visual improvement
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.terrainMesh = mesh;
    this.terrainGeo = geo;
    this.group.add(mesh);
  }

  _calcElevation(x, z, radius, height, seed) {
    const dist = Math.sqrt(x * x + z * z) / radius;
    const falloff = Math.max(0, 1 - dist * dist);
    const edgeFalloff = falloff * falloff * (3 - 2 * falloff);

    const nx = x * 0.04 + seed * 7.3;
    const nz = z * 0.04 + seed * 13.7;

    const baseNoise = fbm(nx, nz, 5, 2.0, 0.5);
    const ridges = ridgeNoise(nx * 1.5, nz * 1.5, 4);
    const detail = fbm(nx * 3, nz * 3, 3, 2.0, 0.4) * 0.3;
    const micro = fbm(nx * 6, nz * 6, 2, 2.0, 0.3) * 0.08; // fine micro detail

    let elevation = (baseNoise * 0.55 + ridges * 0.3 + detail + micro) * edgeFalloff;

    if (elevation > 0.3 && elevation < 0.5) {
      elevation = 0.3 + (elevation - 0.3) * 0.3;
    }

    return elevation * height;
  }

  /** Sample terrain height at local (x,z) — used for placing objects and character ground following */
  sampleHeight(x, z) {
    return this._calcElevation(x, z, this.radius, this.height, this.seed);
  }

  // ── Trees — organic shapes, smooth shading ──

  _scatterTrees(radius, height, sunPosition) {
    const { treeGeos } = getSharedGeometries();
    const rng = this.rng;

    const trunkMat = new THREE.MeshStandardMaterial({
      color: COLORS.treeTrunk, roughness: 0.9, metalness: 0.0,
    });

    const treeMats = [
      new THREE.MeshStandardMaterial({ color: COLORS.cypressGreen, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: COLORS.oliveGreen, roughness: 0.75 }),
      new THREE.MeshStandardMaterial({ color: COLORS.pineGreen, roughness: 0.78 }),
    ];

    const count = Math.floor(radius * 2.5);
    const dummy = new THREE.Object3D();

    for (let t = 0; t < 3; t++) {
      const instanceCount = Math.floor(count / 3);
      const mesh = new THREE.InstancedMesh(treeGeos[t], treeMats[t], instanceCount);
      let placed = 0;

      for (let i = 0; i < instanceCount * 3 && placed < instanceCount; i++) {
        const angle = rng.next() * Math.PI * 2;
        const dist = rng.range(0.12, 0.72) * radius;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = this.sampleHeight(x, z);

        const normH = y / height;
        if (normH < 0.06 || normH > 0.5) continue;

        const scale = rng.range(0.7, 1.6);
        dummy.position.set(x, y, z);
        dummy.scale.set(scale, scale * rng.range(0.85, 1.3), scale);
        dummy.rotation.y = rng.next() * Math.PI * 2;
        // Slight random tilt for organic feel
        dummy.rotation.x = rng.range(-0.05, 0.05);
        dummy.rotation.z = rng.range(-0.05, 0.05);
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

  // ── Grass patches — crossed billboard planes for ground cover ──

  _scatterGrass(radius, height) {
    const { grassGeo } = getSharedGeometries();
    const rng = this.rng;
    const count = Math.floor(radius * 4);

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x5a9a38,
      roughness: 0.9,
      side: THREE.DoubleSide,
      alphaTest: 0.1,
    });

    const mesh = new THREE.InstancedMesh(grassGeo, grassMat, count);
    const dummy = new THREE.Object3D();
    let placed = 0;

    for (let i = 0; i < count * 3 && placed < count; i++) {
      const angle = rng.next() * Math.PI * 2;
      const dist = rng.range(0.1, 0.75) * radius;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = this.sampleHeight(x, z);

      const normH = y / height;
      if (normH < 0.06 || normH > 0.45) continue;

      const scale = rng.range(0.5, 1.2);
      dummy.position.set(x, y, z);
      dummy.scale.set(scale, scale * rng.range(0.6, 1.3), scale);
      dummy.rotation.y = rng.next() * Math.PI * 2;
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = placed;
    this.group.add(mesh);
  }

  // ── Rocks — smooth organic shapes ──

  _scatterRocks(radius, height, sunPosition) {
    const { rockGeo } = getSharedGeometries();
    const rng = this.rng;
    const count = Math.floor(radius * 1.2);

    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.rock,
      roughness: 0.92,
      metalness: 0.04,
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
      dummy.position.set(x, y - scale * 0.15, z);
      dummy.scale.set(scale, scale * rng.range(0.4, 1.0), scale);
      dummy.rotation.set(rng.next() * 0.3, rng.next() * Math.PI, rng.next() * 0.3);
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = placed;
    mesh.castShadow = true;
    this.group.add(mesh);
  }

  // ── Ruins — smooth columns, detailed temple fragments ──

  _scatterRuins(radius, height, sunPosition) {
    const { columnGeo } = getSharedGeometries();
    const rng = this.rng;

    const ruinsMat = new THREE.MeshStandardMaterial({
      color: COLORS.ruins,
      roughness: 0.85,
      metalness: 0.05,
    });

    const colCount = Math.floor(radius * 0.4);
    const colMesh = new THREE.InstancedMesh(columnGeo, ruinsMat, colCount);
    const dummy = new THREE.Object3D();
    let placed = 0;

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
      const tilt = rng.range(-0.15, 0.15);
      dummy.position.set(x, y, z);
      dummy.scale.set(scale, scale * rng.range(0.4, 1.0), scale);
      dummy.rotation.set(tilt, rng.next() * Math.PI * 2, tilt * 0.5);
      dummy.updateMatrix();
      colMesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    colMesh.instanceMatrix.needsUpdate = true;
    colMesh.count = placed;
    colMesh.castShadow = true;
    this.group.add(colMesh);

    // Temple platform
    const platformGeo = new THREE.BoxGeometry(5, 0.6, 4);
    const platform = new THREE.Mesh(platformGeo, ruinsMat);
    const py = this.sampleHeight(cx, cz);
    platform.position.set(cx, py + 0.3, cz);
    platform.rotation.y = rng.next() * Math.PI;
    platform.castShadow = true;
    platform.receiveShadow = true;
    this.group.add(platform);

    // Steps
    for (let s = 0; s < 3; s++) {
      const stepGeo = new THREE.BoxGeometry(5 + s * 0.8, 0.15, 4 + s * 0.5);
      const step = new THREE.Mesh(stepGeo, ruinsMat);
      step.position.set(cx, py + 0.05 - s * 0.15, cz);
      step.rotation.y = platform.rotation.y;
      step.receiveShadow = true;
      this.group.add(step);
    }

    // Pediment
    const pedimentShape = new THREE.Shape();
    pedimentShape.moveTo(-2.2, 0);
    pedimentShape.lineTo(0, 1.6);
    pedimentShape.lineTo(2.2, 0);
    pedimentShape.lineTo(-2.2, 0);
    const pedGeo = new THREE.ExtrudeGeometry(pedimentShape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03 });
    const pediment = new THREE.Mesh(pedGeo, ruinsMat);
    pediment.position.set(cx + rng.range(-2, 2), py + 0.5, cz + rng.range(-2, 2));
    pediment.rotation.set(rng.range(-0.3, 0.1), rng.next() * Math.PI, rng.range(-0.1, 0.1));
    pediment.castShadow = true;
    this.group.add(pediment);

    // Scattered broken column fragments
    const fragGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.8, 8);
    for (let f = 0; f < 4; f++) {
      const frag = new THREE.Mesh(fragGeo, ruinsMat);
      const fx = cx + rng.range(-radius * 0.15, radius * 0.15);
      const fz = cz + rng.range(-radius * 0.15, radius * 0.15);
      const fy = this.sampleHeight(fx, fz);
      frag.position.set(fx, fy + 0.2, fz);
      frag.rotation.set(rng.range(0.5, 1.5), rng.next() * Math.PI, rng.range(-0.3, 0.3));
      frag.castShadow = true;
      this.group.add(frag);
    }
  }

  // ── Mythological elements with richer lighting ──

  _addMythologicalElements(radius, height) {
    const rng = this.rng;

    const beamGeo = new THREE.CylinderGeometry(0.3, 1.8, height * 2, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: COLORS.goldenGlow,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    const bx = rng.range(-0.3, 0.3) * radius;
    const bz = rng.range(-0.3, 0.3) * radius;
    beam.position.set(bx, height * 0.5, bz);
    this.group.add(beam);

    // Glowing orb
    const orbGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const orbMat = new THREE.MeshBasicMaterial({
      color: COLORS.goldenGlow,
      transparent: true,
      opacity: 0.4,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(bx, this.sampleHeight(bx, bz) + 1.5, bz);
    this.group.add(orb);
    this.magicOrb = orb;

    // Multiple lights for richer illumination
    const glow = new THREE.PointLight(0xffd700, 3, radius * 0.6);
    glow.position.copy(orb.position);
    this.group.add(glow);
    this.magicLight = glow;

    // Secondary softer light
    const softGlow = new THREE.PointLight(0xffaa44, 1.5, radius * 0.4);
    softGlow.position.set(bx, this.sampleHeight(bx, bz) + 3, bz);
    this.group.add(softGlow);

    // Particle ring
    const ringGeo = new THREE.TorusGeometry(1.5, 0.04, 8, 32);
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

    // Ground glow disc
    const glowDiscGeo = new THREE.CircleGeometry(2.5, 24);
    glowDiscGeo.rotateX(-Math.PI / 2);
    const glowDiscMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    });
    const glowDisc = new THREE.Mesh(glowDiscGeo, glowDiscMat);
    glowDisc.position.set(bx, this.sampleHeight(bx, bz) + 0.1, bz);
    this.group.add(glowDisc);
  }

  // ── Shoreline with gradient rings ──

  _addShoreline(radius) {
    // Multiple gradient rings for realistic shoreline
    const rings = [
      { inner: 0.82, outer: 1.18, color: 0x30b0a0, opacity: 0.15 },
      { inner: 0.88, outer: 1.08, color: 0x40c8b8, opacity: 0.18 },
      { inner: 0.92, outer: 1.02, color: 0xffffff, opacity: 0.12 },
    ];

    for (const r of rings) {
      const geo = new THREE.RingGeometry(radius * r.inner, radius * r.outer, 64, 2);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: r.color,
        transparent: true,
        opacity: r.opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.15;
      this.group.add(mesh);
    }
  }

  /** Atmospheric glow for distance visibility */
  _addAtmosphericGlow(radius, height) {
    const hazeGeo = new THREE.CylinderGeometry(radius * 0.4, radius * 0.9, height * 1.5, 12, 1, true);
    const hazeMat = new THREE.MeshBasicMaterial({
      color: 0xd4b483,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const haze = new THREE.Mesh(hazeGeo, hazeMat);
    haze.position.y = height * 0.4;
    this.group.add(haze);

    const mistGeo = new THREE.CircleGeometry(radius * 1.5, 32);
    mistGeo.rotateX(-Math.PI / 2);
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0x90b0cc,
      transparent: true,
      opacity: 0.04,
      depthWrite: false,
    });
    const mist = new THREE.Mesh(mistGeo, mistMat);
    mist.position.y = 1;
    this.group.add(mist);
  }

  /** Animate mythological elements */
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
