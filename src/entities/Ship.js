/**
 * Odysseus's Ship — Greek Trireme
 *
 * Modular construction:
 *   Hull → Deck → Gunwale → Shields → Mast → Sail (with emblem) →
 *   Oars → Prow (ram + figurehead) → Stern → Rigging → Torches → Wake
 *
 * All oars and shields use InstancedMesh for GPU performance.
 * Sail uses vertex displacement for wind billow.
 * Wake particles spawn behind the ship when moving.
 */

import * as THREE from 'three';
import { ShaderLib } from '../shaders/ShaderLib.js';
import { SHIP } from '../utils/constants.js';

// ── Shared material palette (created once per sunPosition) ──

function makePalette(sunPosition) {
  const m = (color, roughness = 0.85, metallic = 0.05) =>
    ShaderLib.createPBRMaterial({ color, roughness, metallic, sunPosition });

  return {
    hullDark:    m(0x3E2210, 0.82, 0.04),   // dark lower hull
    hullMid:     m(0x5C3A1E, 0.80, 0.05),   // main hull planks
    hullLight:   m(0x7A5230, 0.78, 0.06),   // upper hull
    deck:        m(0x9B8060, 0.90, 0.00),   // deck planks
    deckLine:    m(0x7B6040, 0.92, 0.00),   // plank gaps
    accentRed:   m(0x8B1A1A, 0.70, 0.10),   // painted stripe
    accentGold:  m(0xB8860B, 0.35, 0.60),   // gold trim / ornaments
    accentBlue:  m(0x1A3A6A, 0.65, 0.15),   // Greek blue accents
    bronze:      m(0x8B7D3C, 0.40, 0.70),   // ram, fittings
    rope:        m(0x6B5535, 0.92, 0.00),   // rigging
    wood:        m(0x4A3020, 0.90, 0.00),   // mast, yard
    white:       m(0xFFF8E8, 0.30, 0.00),   // eyes
    black:       m(0x0A0A0A, 0.20, 0.00),   // pupils
    skin:        m(0xD4A574, 0.70, 0.00),   // figurehead
  };
}

// ── Reusable geometries ──

let _oarGeo = null;
let _shieldGeo = null;

function getOarGeometry() {
  if (_oarGeo) return _oarGeo;
  // Shaft + blade merged into one geo
  const shaft = new THREE.CylinderGeometry(0.025, 0.04, 5.5, 4);
  shaft.translate(0, -2, 0);
  const blade = new THREE.BoxGeometry(0.22, 0.8, 0.03);
  blade.translate(0, -4.8, 0);

  // Manual merge
  const sPos = shaft.attributes.position;
  const bPos = blade.attributes.position;
  const totalVerts = sPos.count + bPos.count;
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);

  for (let i = 0; i < sPos.count; i++) {
    positions[i * 3]     = sPos.getX(i);
    positions[i * 3 + 1] = sPos.getY(i);
    positions[i * 3 + 2] = sPos.getZ(i);
  }
  const sNor = shaft.attributes.normal;
  for (let i = 0; i < sNor.count; i++) {
    normals[i * 3]     = sNor.getX(i);
    normals[i * 3 + 1] = sNor.getY(i);
    normals[i * 3 + 2] = sNor.getZ(i);
  }
  const off = sPos.count;
  for (let i = 0; i < bPos.count; i++) {
    positions[(off + i) * 3]     = bPos.getX(i);
    positions[(off + i) * 3 + 1] = bPos.getY(i);
    positions[(off + i) * 3 + 2] = bPos.getZ(i);
  }
  const bNor = blade.attributes.normal;
  for (let i = 0; i < bNor.count; i++) {
    normals[(off + i) * 3]     = bNor.getX(i);
    normals[(off + i) * 3 + 1] = bNor.getY(i);
    normals[(off + i) * 3 + 2] = bNor.getZ(i);
  }

  // Merge indices
  const sIdx = shaft.index;
  const bIdx = blade.index;
  const indices = new Uint16Array(sIdx.count + bIdx.count);
  for (let i = 0; i < sIdx.count; i++) indices[i] = sIdx.getX(i);
  for (let i = 0; i < bIdx.count; i++) indices[sIdx.count + i] = bIdx.getX(i) + off;

  _oarGeo = new THREE.BufferGeometry();
  _oarGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  _oarGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  _oarGeo.setIndex(new THREE.BufferAttribute(indices, 1));
  _oarGeo.computeVertexNormals();
  return _oarGeo;
}

function getShieldGeometry() {
  if (_shieldGeo) return _shieldGeo;
  // Circle + boss + rim merged
  const disc = new THREE.CircleGeometry(0.42, 10);
  const boss = new THREE.SphereGeometry(0.1, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  boss.translate(0, 0, 0.04);
  const rim = new THREE.TorusGeometry(0.4, 0.035, 4, 12);
  rim.translate(0, 0, 0.02);

  // Simple approach: just use the disc as shield geo (boss/rim add too much complexity for instancing)
  _shieldGeo = disc;
  return _shieldGeo;
}


export class Ship {
  /**
   * @param {THREE.Vector3} sunPosition
   * @param {boolean} isNPC — if true, skips some detail for perf
   */
  constructor(sunPosition, isNPC = false) {
    this.group = new THREE.Group();
    this.sunPosition = sunPosition;
    this.isNPC = isNPC;
    this.speed = 0;
    this.targetSpeed = 0;
    this.heading = 0;

    this.P = makePalette(sunPosition);

    // Build modular parts
    this._buildHull();
    this._buildDeck();
    this._buildGunwale();
    this._buildShields();
    this._buildMast();
    this._buildSail();
    this._buildOars();
    this._buildProw();
    this._buildStern();
    this._buildRigging();

    if (!isNPC) {
      this._buildFigurehead();
      this._buildTorches();
      this._buildWake();
      this._buildGreekPatterns();
    }
  }

  // ────────────────── HULL ──────────────────

  _buildHull() {
    // Lower hull — dark with curved profile
    const lowerShape = new THREE.Shape();
    lowerShape.moveTo(-7.5, 0);
    lowerShape.quadraticCurveTo(-8, 0.8, -7.5, 1.6);
    lowerShape.quadraticCurveTo(-6, 2.4, -3, 2.8);
    lowerShape.lineTo(4, 2.8);
    lowerShape.quadraticCurveTo(7, 2.4, 8, 1.6);
    lowerShape.quadraticCurveTo(8.5, 0.8, 8, 0);
    lowerShape.quadraticCurveTo(4, -1.2, 0, -1.4);
    lowerShape.quadraticCurveTo(-4, -1.2, -7.5, 0);

    const lowerGeo = new THREE.ExtrudeGeometry(lowerShape, {
      depth: 3.4, bevelEnabled: true,
      bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 2,
    });
    lowerGeo.rotateY(Math.PI / 2);
    lowerGeo.translate(0, 0, -1.7);
    this.group.add(new THREE.Mesh(lowerGeo, this.P.hullDark));

    // Mid hull planks — slightly lighter
    const midGeo = new THREE.BoxGeometry(16, 0.4, 3.5);
    const mid = new THREE.Mesh(midGeo, this.P.hullMid);
    mid.position.y = 1.8;
    this.group.add(mid);

    // Upper hull strip
    const upperGeo = new THREE.BoxGeometry(15.5, 0.35, 3.45);
    const upper = new THREE.Mesh(upperGeo, this.P.hullLight);
    upper.position.y = 2.4;
    this.group.add(upper);

    // Red painted band
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(15, 0.2, 3.5),
      this.P.accentRed
    );
    stripe.position.y = 2.7;
    this.group.add(stripe);

    // Gold trim line
    const goldLine = new THREE.Mesh(
      new THREE.BoxGeometry(14.5, 0.06, 3.48),
      this.P.accentGold
    );
    goldLine.position.y = 2.9;
    this.group.add(goldLine);
  }

  // ────────────────── DECK ──────────────────

  _buildDeck() {
    // Main deck surface
    const deckGeo = new THREE.BoxGeometry(14, 0.12, 3.0);
    this.group.add(new THREE.Mesh(deckGeo, this.P.deck).translateY(3.05));

    // Plank lines for texture
    for (let i = -6.5; i <= 6.5; i += 0.7) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.13, 3.0),
        this.P.deckLine
      );
      line.position.set(i, 3.05, 0);
      this.group.add(line);
    }

    // Cross planks
    for (let z = -1.2; z <= 1.2; z += 0.8) {
      const cross = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.13, 0.02),
        this.P.deckLine
      );
      cross.position.set(0, 3.05, z);
      this.group.add(cross);
    }
  }

  // ────────────────── GUNWALE (side rails) ──────────────────

  _buildGunwale() {
    for (let side = -1; side <= 1; side += 2) {
      // Main rail
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(15, 0.7, 0.1),
        this.P.hullLight
      );
      rail.position.set(0, 3.5, side * 1.55);
      this.group.add(rail);

      // Stanchions
      for (let x = -7; x <= 7; x += 1.0) {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.7, 0.06),
          this.P.hullMid
        );
        post.position.set(x, 3.5, side * 1.5);
        this.group.add(post);
      }

      // Gold rail cap
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(15, 0.05, 0.14),
        this.P.accentGold
      );
      cap.position.set(0, 3.88, side * 1.55);
      this.group.add(cap);
    }
  }

  // ────────────────── SHIELDS (instanced) ──────────────────

  _buildShields() {
    const shieldGeo = getShieldGeometry();
    const shieldCount = 22; // 11 per side

    // Alternate gold, red, blue, gold pattern
    const colorSets = [
      { color: 0xB8860B, roughness: 0.4, metallic: 0.5 },
      { color: 0x8B1A1A, roughness: 0.6, metallic: 0.2 },
      { color: 0x1A3A6A, roughness: 0.6, metallic: 0.2 },
    ];

    for (const cs of colorSets) {
      const mat = new THREE.MeshStandardMaterial({
        color: cs.color, roughness: cs.roughness, metalness: cs.metallic,
      });
      // Count how many shields use this color
      let count = 0;
      for (let i = 0; i < 11; i++) {
        if (colorSets[i % 3] === cs) count += 2; // both sides
      }

      const mesh = new THREE.InstancedMesh(shieldGeo, mat, count);
      const dummy = new THREE.Object3D();
      let idx = 0;

      for (let i = 0; i < 11; i++) {
        if (colorSets[i % 3] !== cs) continue;
        const x = -5 + i * 1.05;

        for (let side = -1; side <= 1; side += 2) {
          dummy.position.set(x, 3.65, side * 1.65);
          dummy.rotation.y = side > 0 ? 0 : Math.PI;
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          mesh.setMatrixAt(idx++, dummy.matrix);
        }
      }

      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = idx;
      this.group.add(mesh);
    }

    // Shield bosses (center bumps) — instanced gold spheres
    const bossGeo = new THREE.SphereGeometry(0.08, 5, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const bossMat = new THREE.MeshStandardMaterial({
      color: 0xC0A060, roughness: 0.3, metalness: 0.7,
    });
    const bossMesh = new THREE.InstancedMesh(bossGeo, bossMat, shieldCount);
    const dummy = new THREE.Object3D();
    let bIdx = 0;

    for (let i = 0; i < 11; i++) {
      const x = -5 + i * 1.05;
      for (let side = -1; side <= 1; side += 2) {
        dummy.position.set(x, 3.65, side * (1.65 + 0.03 * Math.sign(side)));
        dummy.rotation.y = side > 0 ? 0 : Math.PI;
        dummy.updateMatrix();
        bossMesh.setMatrixAt(bIdx++, dummy.matrix);
      }
    }
    bossMesh.instanceMatrix.needsUpdate = true;
    bossMesh.count = bIdx;
    this.group.add(bossMesh);
  }

  // ────────────────── MAST ──────────────────

  _buildMast() {
    // Main mast
    const mastGeo = new THREE.CylinderGeometry(0.12, 0.18, 13, 8);
    this.mast = new THREE.Mesh(mastGeo, this.P.wood);
    this.mast.position.set(0.5, 9.5, 0);
    this.mast.castShadow = true;
    this.group.add(this.mast);

    // Upper yard arm
    const yardGeo = new THREE.CylinderGeometry(0.06, 0.06, 8, 6);
    yardGeo.rotateZ(Math.PI / 2);
    this.group.add(new THREE.Mesh(yardGeo, this.P.wood).translateY(15).translateX(0.5));

    // Lower yard arm
    const lowerYard = new THREE.CylinderGeometry(0.05, 0.05, 7, 6);
    lowerYard.rotateZ(Math.PI / 2);
    this.group.add(new THREE.Mesh(lowerYard, this.P.wood).translateY(8.5).translateX(0.5));

    // Crow's nest platform
    const nestGeo = new THREE.CylinderGeometry(0.45, 0.4, 0.12, 8);
    this.group.add(new THREE.Mesh(nestGeo, this.P.wood).translateY(15.5).translateX(0.5));

    // Nest railing
    const nestRailGeo = new THREE.TorusGeometry(0.42, 0.025, 4, 10);
    nestRailGeo.rotateX(Math.PI / 2);
    this.group.add(new THREE.Mesh(nestRailGeo, this.P.wood).translateY(15.7).translateX(0.5));
  }

  // ────────────────── SAIL (with wind billow + emblem) ──────────────────

  _buildSail() {
    const sailGeo = new THREE.PlaneGeometry(7.5, 7, 20, 20);
    this.sailMaterial = ShaderLib.createSailMaterial(this.sunPosition);
    this.sailMaterial.uniforms.uColor.value.set(0x2A1A0A); // Dark sail

    this.sail = new THREE.Mesh(sailGeo, this.sailMaterial);
    this.sail.position.set(1.0, 11.8, 0);
    this.group.add(this.sail);

    // Owl emblem — Athena's symbol (Odysseus's patron goddess)
    this._buildOwlEmblem();
  }

  _buildOwlEmblem() {
    const emblem = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({
      color: 0xC8A030, roughness: 0.5, metalness: 0.3,
      emissive: 0x3A2800, emissiveIntensity: 0.2,
    });

    // Owl body (oval)
    const bodyGeo = new THREE.SphereGeometry(0.55, 8, 6);
    bodyGeo.scale(0.8, 1.1, 0.25);
    emblem.add(new THREE.Mesh(bodyGeo, gold));

    // Eyes (two circles)
    for (let side = -1; side <= 1; side += 2) {
      const eyeOuter = new THREE.Mesh(
        new THREE.CircleGeometry(0.2, 8),
        gold
      );
      eyeOuter.position.set(side * 0.22, 0.35, 0.14);
      emblem.add(eyeOuter);

      const eyeInner = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 6),
        new THREE.MeshStandardMaterial({ color: 0x1A0A00, roughness: 0.3 })
      );
      eyeInner.position.set(side * 0.22, 0.35, 0.15);
      emblem.add(eyeInner);
    }

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.08, 0.15, 3);
    beakGeo.rotateX(Math.PI);
    const beak = new THREE.Mesh(beakGeo, gold);
    beak.position.set(0, 0.18, 0.14);
    emblem.add(beak);

    // Wings (two arcs)
    for (let side = -1; side <= 1; side += 2) {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.quadraticCurveTo(side * 0.5, 0.6, side * 0.9, 0.3);
      wingShape.quadraticCurveTo(side * 0.6, -0.1, 0, -0.15);
      const wingGeo = new THREE.ShapeGeometry(wingShape);
      const wing = new THREE.Mesh(wingGeo, gold);
      wing.position.set(side * 0.3, -0.1, 0.12);
      emblem.add(wing);
    }

    emblem.scale.set(1.6, 1.6, 1.6);
    emblem.position.set(1.0, 12.5, 0.2);
    this.group.add(emblem);
  }

  // ────────────────── OARS (instanced) ──────────────────

  _buildOars() {
    const oarGeo = getOarGeometry();
    const oarMat = new THREE.MeshStandardMaterial({
      color: 0x7B6B5A, roughness: 0.85, metalness: 0.0,
    });

    const oarsPerSide = 12;
    const totalOars = oarsPerSide * 2;
    this.oarMesh = new THREE.InstancedMesh(oarGeo, oarMat, totalOars);
    this.oarData = []; // store per-oar data for animation

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < oarsPerSide; i++) {
        const x = -5.5 + i * 0.95;
        dummy.position.set(x, 2.8, side * 1.7);
        dummy.rotation.set(0, 0, side * 0.45);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.oarMesh.setMatrixAt(idx, dummy.matrix);

        this.oarData.push({
          x, side, phase: i * 0.4 + (side > 0 ? 0 : Math.PI * 0.3),
          baseZ: side * 1.7,
        });
        idx++;
      }
    }

    this.oarMesh.instanceMatrix.needsUpdate = true;
    this.oarMesh.castShadow = true;
    this.group.add(this.oarMesh);
  }

  // ────────────────── PROW (ram + eyes) ──────────────────

  _buildProw() {
    // Elegant curved prow sweeping upward
    const prowCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(7.5, 2.8, 0),
      new THREE.Vector3(9, 4.0, 0),
      new THREE.Vector3(10, 6.5, 0),
      new THREE.Vector3(9.5, 8.5, 0),
    );
    const prowGeo = new THREE.TubeGeometry(prowCurve, 20, 0.2, 8, false);
    this.group.add(new THREE.Mesh(prowGeo, this.P.accentGold));

    // Prow ornamental tip (curls inward)
    const tipCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(9.5, 8.5, 0),
      new THREE.Vector3(9.2, 9.3, 0),
      new THREE.Vector3(8.5, 9.8, 0),
      new THREE.Vector3(8, 9.5, 0),
    );
    this.group.add(new THREE.Mesh(
      new THREE.TubeGeometry(tipCurve, 10, 0.1, 6, false),
      this.P.accentGold
    ));

    // Bronze battering ram at waterline
    const ramCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(8, 0.2, 0),
      new THREE.Vector3(9.5, 0.0, 0),
      new THREE.Vector3(10.5, -0.1, 0),
      new THREE.Vector3(11, 0.1, 0),
    );
    this.group.add(new THREE.Mesh(
      new THREE.TubeGeometry(ramCurve, 10, 0.25, 6, false),
      this.P.bronze
    ));

    // Ram tip — pointed bronze
    const tipGeo = new THREE.ConeGeometry(0.28, 0.7, 6);
    tipGeo.rotateZ(-Math.PI / 2);
    const tip = new THREE.Mesh(tipGeo, this.P.bronze);
    tip.position.set(11.3, 0.1, 0);
    this.group.add(tip);

    // Ram prongs (three horizontal ridges)
    for (let i = -1; i <= 1; i++) {
      const prong = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.06, 0.06),
        this.P.bronze
      );
      prong.position.set(10, 0.1 + i * 0.15, 0);
      this.group.add(prong);
    }

    // Eyes — iconic apotropaic eyes on each side
    for (let side = -1; side <= 1; side += 2) {
      // Eye white — almond shaped
      const eyeGeo = new THREE.SphereGeometry(0.22, 8, 6);
      eyeGeo.scale(1.5, 0.9, 0.5);
      const eye = new THREE.Mesh(eyeGeo, this.P.white);
      eye.position.set(7.8, 3.4, side * 1.45);
      this.group.add(eye);

      // Iris — deep blue
      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 6),
        this.P.accentBlue
      );
      iris.position.set(7.95, 3.4, side * 1.52);
      this.group.add(iris);

      // Pupil
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 5, 5),
        this.P.black
      );
      pupil.position.set(8.0, 3.4, side * 1.55);
      this.group.add(pupil);

      // Eyeliner (dark ring around eye)
      const liner = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.03, 4, 12),
        this.P.black
      );
      liner.scale.set(1.5, 0.9, 1);
      liner.position.set(7.85, 3.4, side * 1.47);
      liner.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      this.group.add(liner);
    }
  }

  // ────────────────── STERN ──────────────────

  _buildStern() {
    // Raised stern platform
    const sternDeck = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.2, 3.0),
      this.P.deck
    );
    sternDeck.position.set(-6, 3.9, 0);
    this.group.add(sternDeck);

    // Stern rails
    for (let side = -1; side <= 1; side += 2) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.6, 0.08),
        this.P.hullLight
      );
      rail.position.set(-6, 4.3, side * 1.45);
      this.group.add(rail);
    }

    // Curved stern post (aplustre) sweeping up and curling
    const sternCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-7.5, 3.0, 0),
      new THREE.Vector3(-8.5, 5.0, 0),
      new THREE.Vector3(-9.5, 8.0, 0),
      new THREE.Vector3(-8.5, 10.5, 0),
    );
    this.group.add(new THREE.Mesh(
      new THREE.TubeGeometry(sternCurve, 20, 0.16, 8, false),
      this.P.accentGold
    ));

    // Aplustre fan (decorative stern ornament)
    for (let i = -2; i <= 2; i++) {
      const fanCurve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(-8.5, 10.5, 0),
        new THREE.Vector3(-8.2 + i * 0.3, 11.5, i * 0.2),
        new THREE.Vector3(-7.8 + i * 0.4, 12, i * 0.3),
        new THREE.Vector3(-7.5 + i * 0.3, 11.5, i * 0.15),
      );
      this.group.add(new THREE.Mesh(
        new THREE.TubeGeometry(fanCurve, 8, 0.04, 4, false),
        this.P.accentGold
      ));
    }

    // Twin steering oars
    for (let side = -1; side <= 1; side += 2) {
      const rudder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 5, 6),
        this.P.wood
      );
      rudder.position.set(-7.8, 1.5, side * 0.9);
      rudder.rotation.z = 0.2;
      this.group.add(rudder);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1.8, 0.5),
        this.P.hullMid
      );
      blade.position.set(-8.2, -0.2, side * 0.9);
      this.group.add(blade);
    }
  }

  // ────────────────── RIGGING ──────────────────

  _buildRigging() {
    const ropeMat = new THREE.LineBasicMaterial({ color: 0x5A4525 });

    const lines = [
      // Forestay (mast to prow)
      [new THREE.Vector3(0.5, 16, 0), new THREE.Vector3(8.5, 5, 0)],
      // Backstay (mast to stern)
      [new THREE.Vector3(0.5, 16, 0), new THREE.Vector3(-7, 4.5, 0)],
      // Shrouds (port/starboard)
      [new THREE.Vector3(0.5, 16, 0), new THREE.Vector3(-1, 3.1, 1.6)],
      [new THREE.Vector3(0.5, 16, 0), new THREE.Vector3(-1, 3.1, -1.6)],
      [new THREE.Vector3(0.5, 14, 0), new THREE.Vector3(2, 3.1, 1.6)],
      [new THREE.Vector3(0.5, 14, 0), new THREE.Vector3(2, 3.1, -1.6)],
      // Braces (yard ends to deck)
      [new THREE.Vector3(4.5, 15, 0), new THREE.Vector3(6, 3.5, 1)],
      [new THREE.Vector3(-3.5, 15, 0), new THREE.Vector3(-5, 3.5, -1)],
      // Sheets (lower yard to stern)
      [new THREE.Vector3(4, 8.5, 0), new THREE.Vector3(6, 3.5, -1)],
      [new THREE.Vector3(-2.5, 8.5, 0), new THREE.Vector3(-5, 3.5, 1)],
      // Halyard (mast top)
      [new THREE.Vector3(0.5, 16, 0), new THREE.Vector3(0.5, 15, 0.3)],
    ];

    for (const [start, end] of lines) {
      const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
      this.group.add(new THREE.Line(geo, ropeMat));
    }
  }

  // ────────────────── FIGUREHEAD (glowing mythological creature) ──────────────────

  _buildFigurehead() {
    const figureGroup = new THREE.Group();

    // Owl/eagle head at prow top
    const headGeo = new THREE.SphereGeometry(0.35, 8, 6);
    headGeo.scale(1.2, 1, 0.8);
    figureGroup.add(new THREE.Mesh(headGeo, this.P.accentGold));

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.1, 0.3, 4);
    beakGeo.rotateX(-Math.PI / 2);
    const beak = new THREE.Mesh(beakGeo, this.P.bronze);
    beak.position.set(0, 0, 0.35);
    figureGroup.add(beak);

    // Eyes (glowing)
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffa500,
        emissiveIntensity: 0.8,
      });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.15, 0.08, 0.28);
      figureGroup.add(eye);
    }

    // Subtle glow light
    const glowLight = new THREE.PointLight(0xffa500, 1.5, 8);
    glowLight.position.set(0, 0, 0.3);
    figureGroup.add(glowLight);
    this.figureheadLight = glowLight;

    figureGroup.position.set(9.3, 8.3, 0);
    figureGroup.rotation.x = -0.2;
    this.group.add(figureGroup);
  }

  // ────────────────── TORCHES ──────────────────

  _buildTorches() {
    this.torches = [];
    const torchPositions = [
      new THREE.Vector3(-5.5, 4.6, 1.4),
      new THREE.Vector3(-5.5, 4.6, -1.4),
    ];

    for (const pos of torchPositions) {
      // Torch pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, 1.2, 4),
        this.P.wood
      );
      pole.position.copy(pos);
      pole.position.y -= 0.3;
      this.group.add(pole);

      // Brazier cup
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.06, 0.15, 6),
        this.P.bronze
      );
      cup.position.copy(pos);
      this.group.add(cup);

      // Fire billboard
      const fireMat = ShaderLib.createFireMaterial();
      const fire = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.8),
        fireMat
      );
      fire.position.copy(pos);
      fire.position.y += 0.5;
      this.group.add(fire);
      this.torches.push(fire);

      // Fire light
      const fireLight = new THREE.PointLight(0xff6622, 2, 10);
      fireLight.position.copy(pos);
      fireLight.position.y += 0.3;
      this.group.add(fireLight);
      this.torches.push(fireLight);
    }
  }

  // ────────────────── GREEK PATTERNS ──────────────────

  _buildGreekPatterns() {
    // Meander / key pattern along hull using small boxes
    const patternMat = this.P.accentBlue;
    const keySize = 0.12;

    for (let x = -5; x <= 5; x += 0.6) {
      for (let side = -1; side <= 1; side += 2) {
        // Simple zigzag approximation of Greek key
        const step = Math.floor((x + 5) / 0.6) % 4;
        const yOff = step < 2 ? 0 : keySize;
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, keySize, 0.02),
          patternMat
        );
        bar.position.set(x, 2.55 + yOff, side * 1.76);
        this.group.add(bar);
      }
    }
  }

  // ────────────────── WAKE EFFECT ──────────────────

  _buildWake() {
    const wakeCount = 80;
    const wakeGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(wakeCount * 3);
    const alphas = new Float32Array(wakeCount);

    wakeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const wakeMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });

    this.wake = new THREE.Points(wakeGeo, wakeMat);
    this.wakeData = [];
    for (let i = 0; i < wakeCount; i++) {
      this.wakeData.push({ life: 0, x: 0, y: 0, z: 0 });
    }
    this.wakeIdx = 0;
    // Wake is added to parent scene, not ship group (stays in world space)
    this.wakeNeedsParent = true;
  }

  // ────────────────── UPDATE ──────────────────

  update(dt, time, ocean, input) {
    // Sail wind animation
    this.sailMaterial.uniforms.uTime.value = time;

    // ── Oar animation (instanced) ──
    const speedRatio = Math.abs(this.speed) / SHIP.speed;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.oarData.length; i++) {
      const d = this.oarData[i];
      const rowAngle = Math.sin(time * 2.5 + d.phase) * 0.45 * speedRatio;

      dummy.position.set(d.x, 2.8, d.baseZ);
      dummy.rotation.set(rowAngle, 0, d.side * 0.45);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      this.oarMesh.setMatrixAt(i, dummy.matrix);
    }
    this.oarMesh.instanceMatrix.needsUpdate = true;

    // ── Torch animation ──
    if (this.torches) {
      for (let i = 0; i < this.torches.length; i++) {
        const t = this.torches[i];
        if (t.material && t.material.uniforms) {
          // Fire billboard
          t.material.uniforms.uTime.value = time;
        } else if (t.isLight) {
          // Fire light flicker
          t.intensity = 1.5 + Math.sin(time * 8 + i) * 0.8;
        }
      }
    }

    // ── Figurehead glow pulse ──
    if (this.figureheadLight) {
      this.figureheadLight.intensity = 1.2 + Math.sin(time * 2) * 0.5;
    }

    // ── Ship movement ──
    if (input && !this.isNPC) {
      const forward = input.getAxis('KeyS', 'KeyW');
      const turn = input.getAxis('KeyD', 'KeyA');
      this.targetSpeed = forward * SHIP.speed;
      this.heading += turn * SHIP.turnSpeed * dt;
    }

    this.speed += (this.targetSpeed - this.speed) * dt * 2;

    const dir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.group.position.addScaledVector(dir, this.speed * dt);
    this.group.rotation.y = this.heading;

    // ── Wave following ──
    if (ocean) {
      const pos = this.group.position;
      const waveY = ocean.getWaveHeight(pos.x, pos.z, time);
      pos.y = waveY;

      const aheadY = ocean.getWaveHeight(pos.x + dir.x * 4, pos.z + dir.z * 4, time);
      const sideDir = new THREE.Vector3(-dir.z, 0, dir.x);
      const sideY = ocean.getWaveHeight(pos.x + sideDir.x * 2, pos.z + sideDir.z * 2, time);

      // Smooth tilt
      this.group.rotation.x = THREE.MathUtils.lerp(
        this.group.rotation.x,
        Math.atan2(waveY - aheadY, 4) * 0.4,
        dt * 4
      );
      this.group.rotation.z = THREE.MathUtils.lerp(
        this.group.rotation.z,
        Math.atan2(sideY - waveY, 2) * 0.25,
        dt * 4
      );
    }

    // ── Wake particles ──
    if (this.wake && Math.abs(this.speed) > 1) {
      // Spawn wake particles behind ship
      if (this.wakeNeedsParent) {
        // Add to scene on first update
        if (this.group.parent) {
          this.group.parent.add(this.wake);
          this.wakeNeedsParent = false;
        }
      }

      const wakePos = this.wake.geometry.attributes.position;
      const shipPos = this.group.position;
      const backDir = new THREE.Vector3(-dir.x, 0, -dir.z);

      // Spawn 2 particles per frame
      for (let s = 0; s < 2; s++) {
        const idx = this.wakeIdx % this.wakeData.length;
        const spread = (Math.random() - 0.5) * 3;
        const sideOff = new THREE.Vector3(-backDir.z, 0, backDir.x).multiplyScalar(spread);

        this.wakeData[idx] = {
          life: 1.0,
          x: shipPos.x + backDir.x * 8 + sideOff.x,
          y: shipPos.y + 0.2,
          z: shipPos.z + backDir.z * 8 + sideOff.z,
        };
        this.wakeIdx++;
      }

      // Update all wake particles
      for (let i = 0; i < this.wakeData.length; i++) {
        const w = this.wakeData[i];
        w.life -= dt * 0.4;
        if (w.life > 0) {
          wakePos.setXYZ(i, w.x, w.y, w.z);
          // Spread outward slowly
          w.x += (Math.random() - 0.5) * dt * 2;
          w.z += (Math.random() - 0.5) * dt * 2;
        } else {
          wakePos.setXYZ(i, 0, -100, 0); // Hide below ocean
        }
      }
      wakePos.needsUpdate = true;
    }
  }

  addTo(scene) {
    scene.add(this.group);
  }

  getPosition() {
    return this.group.position;
  }
}
