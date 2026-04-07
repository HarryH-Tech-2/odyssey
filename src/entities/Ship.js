/**
 * Odysseus's Ship — Stylized Greek Bireme
 *
 * White and blue Aegean color scheme.
 * Modular construction:
 *   Hull → Deck → Gunwale → Mast → Sail (with emblem) →
 *   Oars → Prow (ram + figurehead) → Stern → Rigging → Torches → Wake
 *
 * Oars use InstancedMesh for GPU performance.
 * Sail uses vertex displacement for wind billow.
 * Wake particles spawn behind the ship when moving.
 */

import * as THREE from 'three';
import { ShaderLib } from '../shaders/ShaderLib.js';
import { SHIP } from '../utils/constants.js';

// ── Shared material palette ──

function makePalette(sunPosition) {
  const m = (color, roughness = 0.85, metallic = 0.05) =>
    ShaderLib.createPBRMaterial({ color, roughness, metallic, sunPosition });

  return {
    hullWhite:   m(0xF0EDE6, 0.75, 0.02),   // off-white hull
    hullCream:   m(0xE8E0D0, 0.78, 0.03),   // warm cream planks
    hullBlue:    m(0x2E5984, 0.65, 0.08),   // Aegean blue hull band
    hullBlueDk:  m(0x1B3A5C, 0.70, 0.10),   // deeper blue accent
    deck:        m(0xD4C9B0, 0.90, 0.00),   // pale warm deck
    deckLine:    m(0xBDB09A, 0.92, 0.00),   // plank gaps
    gold:        m(0xC8A030, 0.35, 0.60),   // gold ornaments
    bronze:      m(0x8B7D3C, 0.40, 0.70),   // ram, fittings
    rope:        m(0x8A7A65, 0.92, 0.00),   // rigging
    wood:        m(0x7A6550, 0.88, 0.00),   // mast, oars
    white:       m(0xFFFFFF, 0.25, 0.00),   // bright white
    black:       m(0x0A0A0A, 0.20, 0.00),   // pupils
    blueAccent:  m(0x4A8AB5, 0.60, 0.10),   // light blue trim
  };
}

// ── Reusable oar geometry ──

let _oarGeo = null;

function getOarGeometry() {
  if (_oarGeo) return _oarGeo;
  const shaft = new THREE.CylinderGeometry(0.025, 0.04, 5.5, 4);
  shaft.translate(0, -2, 0);
  const blade = new THREE.BoxGeometry(0.22, 0.8, 0.03);
  blade.translate(0, -4.8, 0);

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


export class Ship {
  /**
   * @param {THREE.Vector3} sunPosition
   * @param {boolean} isNPC — if true, skips some detail for perf
   */
  constructor(sunPosition, isNPC = false, palette = null) {
    this.group = new THREE.Group();
    this.sunPosition = sunPosition;
    this.isNPC = isNPC;
    this.speed = 0;
    this.targetSpeed = 0;
    this.heading = 0;

    this.P = palette || makePalette(sunPosition);

    this._buildHull();
    this._buildDeck();
    this._buildGunwale();
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

    // Rotate mesh so the prow (+X) aligns with forward movement (+Z)
    this.meshGroup = new THREE.Group();
    this.meshGroup.rotation.y = -Math.PI / 2;
    while (this.group.children.length > 0) {
      this.meshGroup.add(this.group.children[0]);
    }
    this.group.add(this.meshGroup);
  }

  // ────────────────── HULL ──────────────────

  _buildHull() {
    // Lower hull — smooth white curved profile
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
    this.group.add(new THREE.Mesh(lowerGeo, this.P.hullWhite));

    // Mid hull planks — cream
    const midGeo = new THREE.BoxGeometry(16, 0.4, 3.5);
    const mid = new THREE.Mesh(midGeo, this.P.hullCream);
    mid.position.y = 1.8;
    this.group.add(mid);

    // Upper hull strip — white
    const upperGeo = new THREE.BoxGeometry(15.5, 0.35, 3.45);
    const upper = new THREE.Mesh(upperGeo, this.P.hullWhite);
    upper.position.y = 2.4;
    this.group.add(upper);

    // Blue painted band — the iconic Aegean stripe
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(15, 0.25, 3.5),
      this.P.hullBlue
    );
    stripe.position.y = 2.7;
    this.group.add(stripe);

    // Gold trim line above blue
    const goldLine = new THREE.Mesh(
      new THREE.BoxGeometry(14.5, 0.06, 3.48),
      this.P.gold
    );
    goldLine.position.y = 2.9;
    this.group.add(goldLine);

    // Waterline — thin blue accent at bottom
    const waterline = new THREE.Mesh(
      new THREE.BoxGeometry(15.5, 0.12, 3.52),
      this.P.hullBlueDk
    );
    waterline.position.y = 0.2;
    this.group.add(waterline);
  }

  // ────────────────── DECK ──────────────────

  _buildDeck() {
    const deckGeo = new THREE.BoxGeometry(14, 0.12, 3.0);
    this.group.add(new THREE.Mesh(deckGeo, this.P.deck).translateY(3.05));

    // Plank lines
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
      // Main rail — white
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(15, 0.7, 0.1),
        this.P.hullWhite
      );
      rail.position.set(0, 3.5, side * 1.55);
      this.group.add(rail);

      // Stanchions — blue
      for (let x = -7; x <= 7; x += 1.0) {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.7, 0.06),
          this.P.blueAccent
        );
        post.position.set(x, 3.5, side * 1.5);
        this.group.add(post);
      }

      // Gold rail cap
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(15, 0.05, 0.14),
        this.P.gold
      );
      cap.position.set(0, 3.88, side * 1.55);
      this.group.add(cap);
    }
  }

  // ────────────────── MAST ──────────────────

  _buildMast() {
    // Main mast — warm wood
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
    this.group.add(new THREE.Mesh(nestRailGeo, this.P.gold).translateY(15.7).translateX(0.5));
  }

  // ────────────────── SAIL (with wind billow + emblem) ──────────────────

  _buildSail() {
    const sailGeo = new THREE.PlaneGeometry(7.5, 7, 20, 20);
    this.sailMaterial = ShaderLib.createSailMaterial(this.sunPosition);
    this.sailMaterial.uniforms.uColor.value.set(0xF8F4EE); // off-white sail

    this.sail = new THREE.Mesh(sailGeo, this.sailMaterial);
    this.sail.position.set(1.0, 11.8, 0);
    this.group.add(this.sail);

    // Blue stripe across sail center
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x2E5984, roughness: 0.7, metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const stripeGeo = new THREE.PlaneGeometry(7.4, 1.2, 10, 4);
    const sailStripe = new THREE.Mesh(stripeGeo, stripeMat);
    sailStripe.position.set(1.0, 11.8, 0.05);
    this.group.add(sailStripe);

    // Thinner blue stripe below
    const stripeGeo2 = new THREE.PlaneGeometry(7.4, 0.5, 10, 2);
    const sailStripe2 = new THREE.Mesh(stripeGeo2, stripeMat);
    sailStripe2.position.set(1.0, 10.0, 0.05);
    this.group.add(sailStripe2);

    // Owl emblem on sail
    this._buildOwlEmblem();
  }

  _buildOwlEmblem() {
    const emblem = new THREE.Group();
    const blue = new THREE.MeshStandardMaterial({
      color: 0x1B3A5C, roughness: 0.5, metalness: 0.2,
    });

    // Owl body (oval)
    const bodyGeo = new THREE.SphereGeometry(0.55, 8, 6);
    bodyGeo.scale(0.8, 1.1, 0.25);
    emblem.add(new THREE.Mesh(bodyGeo, blue));

    // Eyes (two circles — gold on blue)
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xC8A030, roughness: 0.4, metalness: 0.4,
      emissive: 0x3A2800, emissiveIntensity: 0.15,
    });
    for (let side = -1; side <= 1; side += 2) {
      const eyeOuter = new THREE.Mesh(new THREE.CircleGeometry(0.2, 8), goldMat);
      eyeOuter.position.set(side * 0.22, 0.35, 0.14);
      emblem.add(eyeOuter);

      const eyeInner = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 6),
        new THREE.MeshStandardMaterial({ color: 0x0A0A0A, roughness: 0.3 })
      );
      eyeInner.position.set(side * 0.22, 0.35, 0.15);
      emblem.add(eyeInner);
    }

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.08, 0.15, 3);
    beakGeo.rotateX(Math.PI);
    const beak = new THREE.Mesh(beakGeo, goldMat);
    beak.position.set(0, 0.18, 0.14);
    emblem.add(beak);

    // Wings
    for (let side = -1; side <= 1; side += 2) {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.quadraticCurveTo(side * 0.5, 0.6, side * 0.9, 0.3);
      wingShape.quadraticCurveTo(side * 0.6, -0.1, 0, -0.15);
      const wing = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), blue);
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
      color: 0x9A8A70, roughness: 0.85, metalness: 0.0,
    });

    const oarsPerSide = 12;
    const totalOars = oarsPerSide * 2;
    this.oarMesh = new THREE.InstancedMesh(oarGeo, oarMat, totalOars);
    this.oarData = [];

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
    // Curved prow sweeping upward — gold
    const prowCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(7.5, 2.8, 0),
      new THREE.Vector3(9, 4.0, 0),
      new THREE.Vector3(10, 6.5, 0),
      new THREE.Vector3(9.5, 8.5, 0),
    );
    this.group.add(new THREE.Mesh(
      new THREE.TubeGeometry(prowCurve, 20, 0.2, 8, false),
      this.P.gold
    ));

    // Prow tip (curls inward)
    const tipCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(9.5, 8.5, 0),
      new THREE.Vector3(9.2, 9.3, 0),
      new THREE.Vector3(8.5, 9.8, 0),
      new THREE.Vector3(8, 9.5, 0),
    );
    this.group.add(new THREE.Mesh(
      new THREE.TubeGeometry(tipCurve, 10, 0.1, 6, false),
      this.P.gold
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

    // Ram tip
    const ramTipGeo = new THREE.ConeGeometry(0.28, 0.7, 6);
    ramTipGeo.rotateZ(-Math.PI / 2);
    const ramTip = new THREE.Mesh(ramTipGeo, this.P.bronze);
    ramTip.position.set(11.3, 0.1, 0);
    this.group.add(ramTip);

    // Ram prongs
    for (let i = -1; i <= 1; i++) {
      const prong = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.06, 0.06),
        this.P.bronze
      );
      prong.position.set(10, 0.1 + i * 0.15, 0);
      this.group.add(prong);
    }

    // Eyes — blue iris on white
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeo = new THREE.SphereGeometry(0.22, 8, 6);
      eyeGeo.scale(1.5, 0.9, 0.5);
      const eye = new THREE.Mesh(eyeGeo, this.P.white);
      eye.position.set(7.8, 3.4, side * 1.45);
      this.group.add(eye);

      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 6),
        this.P.hullBlue
      );
      iris.position.set(7.95, 3.4, side * 1.52);
      this.group.add(iris);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 5, 5),
        this.P.black
      );
      pupil.position.set(8.0, 3.4, side * 1.55);
      this.group.add(pupil);

      const liner = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.03, 4, 12),
        this.P.hullBlueDk
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

    // Stern rails — white
    for (let side = -1; side <= 1; side += 2) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.6, 0.08),
        this.P.hullWhite
      );
      rail.position.set(-6, 4.3, side * 1.45);
      this.group.add(rail);
    }

    // Curved stern post (aplustre)
    const sternCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-7.5, 3.0, 0),
      new THREE.Vector3(-8.5, 5.0, 0),
      new THREE.Vector3(-9.5, 8.0, 0),
      new THREE.Vector3(-8.5, 10.5, 0),
    );
    this.group.add(new THREE.Mesh(
      new THREE.TubeGeometry(sternCurve, 20, 0.16, 8, false),
      this.P.gold
    ));

    // Aplustre fan
    for (let i = -2; i <= 2; i++) {
      const fanCurve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(-8.5, 10.5, 0),
        new THREE.Vector3(-8.2 + i * 0.3, 11.5, i * 0.2),
        new THREE.Vector3(-7.8 + i * 0.4, 12, i * 0.3),
        new THREE.Vector3(-7.5 + i * 0.3, 11.5, i * 0.15),
      );
      this.group.add(new THREE.Mesh(
        new THREE.TubeGeometry(fanCurve, 8, 0.04, 4, false),
        this.P.gold
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
        this.P.hullBlue
      );
      blade.position.set(-8.2, -0.2, side * 0.9);
      this.group.add(blade);
    }
  }

  // ────────────────── RIGGING ──────────────────

  _buildRigging() {
    const ropeMat = new THREE.LineBasicMaterial({ color: 0x8A7A65 });

    const lines = [
      [new THREE.Vector3(0.5, 16, 0), new THREE.Vector3(8.5, 5, 0)],
      [new THREE.Vector3(0.5, 16, 0), new THREE.Vector3(-7, 4.5, 0)],
      [new THREE.Vector3(0.5, 16, 0), new THREE.Vector3(-1, 3.1, 1.6)],
      [new THREE.Vector3(0.5, 16, 0), new THREE.Vector3(-1, 3.1, -1.6)],
      [new THREE.Vector3(0.5, 14, 0), new THREE.Vector3(2, 3.1, 1.6)],
      [new THREE.Vector3(0.5, 14, 0), new THREE.Vector3(2, 3.1, -1.6)],
      [new THREE.Vector3(4.5, 15, 0), new THREE.Vector3(6, 3.5, 1)],
      [new THREE.Vector3(-3.5, 15, 0), new THREE.Vector3(-5, 3.5, -1)],
      [new THREE.Vector3(4, 8.5, 0), new THREE.Vector3(6, 3.5, -1)],
      [new THREE.Vector3(-2.5, 8.5, 0), new THREE.Vector3(-5, 3.5, 1)],
      [new THREE.Vector3(0.5, 16, 0), new THREE.Vector3(0.5, 15, 0.3)],
    ];

    for (const [start, end] of lines) {
      const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
      this.group.add(new THREE.Line(geo, ropeMat));
    }
  }

  // ────────────────── FIGUREHEAD (glowing owl) ──────────────────

  _buildFigurehead() {
    const figureGroup = new THREE.Group();

    // Owl head — gold
    const headGeo = new THREE.SphereGeometry(0.35, 8, 6);
    headGeo.scale(1.2, 1, 0.8);
    figureGroup.add(new THREE.Mesh(headGeo, this.P.gold));

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.1, 0.3, 4);
    beakGeo.rotateX(-Math.PI / 2);
    figureGroup.add(new THREE.Mesh(beakGeo, this.P.bronze));

    // Glowing blue eyes
    for (let side = -1; side <= 1; side += 2) {
      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x4A8AB5,
        emissive: 0x2E5984,
        emissiveIntensity: 1.0,
      });
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), eyeMat);
      eye.position.set(side * 0.15, 0.08, 0.28);
      figureGroup.add(eye);
    }

    // Blue glow light
    const glowLight = new THREE.PointLight(0x4A8AB5, 1.5, 8);
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
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, 1.2, 4),
        this.P.wood
      );
      pole.position.copy(pos);
      pole.position.y -= 0.3;
      this.group.add(pole);

      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.06, 0.15, 6),
        this.P.bronze
      );
      cup.position.copy(pos);
      this.group.add(cup);

      const fireMat = ShaderLib.createFireMaterial();
      const fire = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.8),
        fireMat
      );
      fire.position.copy(pos);
      fire.position.y += 0.5;
      this.group.add(fire);
      this.torches.push(fire);

      const fireLight = new THREE.PointLight(0xff6622, 2, 10);
      fireLight.position.copy(pos);
      fireLight.position.y += 0.3;
      this.group.add(fireLight);
      this.torches.push(fireLight);
    }
  }

  // ────────────────── GREEK PATTERNS ──────────────────

  _buildGreekPatterns() {
    // Meander / key pattern along hull — blue on white
    const keySize = 0.12;

    for (let x = -5; x <= 5; x += 0.6) {
      for (let side = -1; side <= 1; side += 2) {
        const step = Math.floor((x + 5) / 0.6) % 4;
        const yOff = step < 2 ? 0 : keySize;
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, keySize, 0.02),
          this.P.hullBlueDk
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
    this.wakeNeedsParent = true;
  }

  // ────────────────── UPDATE ──────────────────

  update(dt, time, ocean, input) {
    // Sail wind animation
    this.sailMaterial.uniforms.uTime.value = time;

    // Oar animation
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

    // Torch animation
    if (this.torches) {
      for (let i = 0; i < this.torches.length; i++) {
        const t = this.torches[i];
        if (t.material && t.material.uniforms) {
          t.material.uniforms.uTime.value = time;
        } else if (t.isLight) {
          t.intensity = 1.5 + Math.sin(time * 8 + i) * 0.8;
        }
      }
    }

    // Figurehead glow pulse
    if (this.figureheadLight) {
      this.figureheadLight.intensity = 1.2 + Math.sin(time * 2) * 0.5;
    }

    // Ship movement
    if (input && !this.isNPC) {
      const forward = input.getAxis('KeyW', 'KeyS');
      const turn = input.getAxis('KeyD', 'KeyA');
      this.targetSpeed = forward * SHIP.speed;
      this.heading += turn * SHIP.turnSpeed * dt;
    }

    this.speed += (this.targetSpeed - this.speed) * dt * 2;

    const dir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.group.position.addScaledVector(dir, this.speed * dt);
    this.group.rotation.y = this.heading;

    // Wave following
    if (ocean) {
      const pos = this.group.position;
      const waveY = ocean.getWaveHeight(pos.x, pos.z, time);
      pos.y = waveY;

      const aheadY = ocean.getWaveHeight(pos.x + dir.x * 4, pos.z + dir.z * 4, time);
      const sideDir = new THREE.Vector3(-dir.z, 0, dir.x);
      const sideY = ocean.getWaveHeight(pos.x + sideDir.x * 2, pos.z + sideDir.z * 2, time);

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

    // Wake particles
    if (this.wake && Math.abs(this.speed) > 1) {
      if (this.wakeNeedsParent) {
        if (this.group.parent) {
          this.group.parent.add(this.wake);
          this.wakeNeedsParent = false;
        }
      }

      const wakePos = this.wake.geometry.attributes.position;
      const shipPos = this.group.position;
      const backDir = new THREE.Vector3(-dir.x, 0, -dir.z);

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

      for (let i = 0; i < this.wakeData.length; i++) {
        const w = this.wakeData[i];
        w.life -= dt * 0.4;
        if (w.life > 0) {
          wakePos.setXYZ(i, w.x, w.y, w.z);
          w.x += (Math.random() - 0.5) * dt * 2;
          w.z += (Math.random() - 0.5) * dt * 2;
        } else {
          wakePos.setXYZ(i, 0, -100, 0);
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
