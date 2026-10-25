import * as THREE from 'three';
import { mergeParts } from './merge.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HULL } from './habitat.js';
import { mulberry32 } from '../textures/procedural.js';

const HALF_PI = Math.PI / 2;
const CY = HULL.cy;
const FLOOR_Y = CY - 2.3;
const SHELL_R = HULL.radius;
const LINER_R = 3.14;
const OPEN_HALF = THREE.MathUtils.degToRad(58);
const SHELL_START = OPEN_HALF;
const SHELL_ARC = Math.PI * 2 - OPEN_HALF * 2;

function xf(geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = {}) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ')),
    new THREE.Vector3(1, 1, 1)
  );
  geo.applyMatrix4(m);
  return geo;
}

function frostCanvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const rnd = mulberry32(9211);
  ctx.translate(size / 2, size / 2);
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2;
    const len = size * (0.12 + rnd() * 0.34);
    const w = 1 + rnd() * 6;
    ctx.strokeStyle = `rgba(222,240,255,${0.06 + rnd() * 0.22})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * len * 0.3, Math.sin(a) * len * 0.3);
    ctx.lineTo(Math.cos(a + (rnd() - 0.5) * 0.2) * len, Math.sin(a) * len);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 0.22);
  g.addColorStop(0, 'rgba(238,250,255,0.8)');
  g.addColorStop(0.4, 'rgba(205,228,244,0.22)');
  g.addColorStop(1, 'rgba(180,205,225,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function gaugeCanvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0c1114';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(140,165,175,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    ctx.strokeStyle = major ? 'rgba(210,225,230,0.8)' : 'rgba(130,150,160,0.45)';
    ctx.lineWidth = major ? 2.5 : 1;
    ctx.beginPath();
    ctx.moveTo(size / 2 + Math.cos(a) * size * 0.33, size / 2 + Math.sin(a) * size * 0.33);
    ctx.lineTo(size / 2 + Math.cos(a) * size * 0.4, size / 2 + Math.sin(a) * size * 0.4);
    ctx.stroke();
  }
  ctx.strokeStyle = '#ff8a4a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(size / 2, size / 2);
  const a = -0.9;
  ctx.lineTo(size / 2 + Math.cos(a) * size * 0.31, size / 2 + Math.sin(a) * size * 0.31);
  ctx.stroke();
  ctx.fillStyle = '#7fd4ef';
  ctx.font = '500 20px "IBM Plex Mono", monospace';
  ctx.fillText('kPa', size * 0.4, size * 0.78);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createInterior(tex) {
  const group = new THREE.Group();
  group.name = 'habitat-section';

  const warm = 0xffb26b;
  const cyan = 0x7fd4ef;

  const mat = {
    sectionCut: new THREE.MeshStandardMaterial({ color: 0x7a6a58, roughness: 0.8, metalness: 0.15 }),
    cutMetal: new THREE.MeshStandardMaterial({ color: 0xa3a9ad, roughness: 0.28, metalness: 0.9 }),
    cutLiner: new THREE.MeshStandardMaterial({ color: 0xa89884, roughness: 0.8, metalness: 0.05 }),
    cutEdge: new THREE.MeshStandardMaterial({ color: 0xb7bbbe, roughness: 0.32, metalness: 0.9 }),
    partition: new THREE.MeshStandardMaterial({ color: 0x6a5a49, roughness: 0.68, metalness: 0.2, side: THREE.DoubleSide }),
    ceramic: new THREE.MeshStandardMaterial({
      map: tex.panelMap,
      normalMap: tex.panelNormal,
      color: 0xd2cec3,
      roughness: 0.66,
      metalness: 0.1,
      side: THREE.FrontSide,
    }),
    liner: new THREE.MeshStandardMaterial({
      map: tex.liner,
      color: 0xb8a894,
      roughness: 0.86,
      metalness: 0.02,
      side: THREE.BackSide,
      envMapIntensity: 0.22,
    }),
    linerFront: new THREE.MeshStandardMaterial({
      map: tex.liner,
      color: 0xd6c6b0,
      roughness: 0.86,
      metalness: 0.02,
      envMapIntensity: 0.22,
    }),
    rack: new THREE.MeshStandardMaterial({ color: 0x6f6c64, roughness: 0.52, metalness: 0.55 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x171a1d, roughness: 0.62, metalness: 0.4 }),
    white: new THREE.MeshStandardMaterial({ color: 0xcfc9bb, roughness: 0.58, metalness: 0.1 }),
    mattress: new THREE.MeshStandardMaterial({ color: 0x5c5a50, roughness: 0.98 }),
    blanket: new THREE.MeshStandardMaterial({ color: 0x8a6a41, roughness: 1.0 }),
    cyan: new THREE.MeshStandardMaterial({
      color: 0x031115,
      emissive: cyan,
      emissiveIntensity: 2.6,
      roughness: 0.3,
    }),
    strip: new THREE.MeshStandardMaterial({
      color: 0x1d1208,
      emissive: warm,
      emissiveIntensity: 2.0,
      roughness: 0.4,
    }),
  };

  const build = (list, material, name, cast = true, receive = true) => {
    if (!list.length) return null;
    const merged = mergeParts(list, name);
    if (!merged) return null;
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    group.add(mesh);
    return mesh;
  };

  // ---------------- shell ----------------
  const outer = new THREE.CylinderGeometry(SHELL_R, SHELL_R, HULL.length, 96, 1, true, SHELL_START, SHELL_ARC);
  outer.rotateZ(-HALF_PI);
  outer.translate(0, CY, 0);
  const outerMesh = new THREE.Mesh(outer, mat.ceramic);
  outerMesh.castShadow = true;
  outerMesh.receiveShadow = true;
  group.add(outerMesh);

  const inner = new THREE.CylinderGeometry(LINER_R, LINER_R, HULL.length - 0.2, 96, 1, true, SHELL_START, SHELL_ARC);
  inner.rotateZ(-HALF_PI);
  inner.translate(0, CY, 0);
  const innerMesh = new THREE.Mesh(inner, mat.liner);
  innerMesh.receiveShadow = true;
  group.add(innerMesh);

  // machined cut: layered end annuli and longitudinal lips
  const cutMetal = [];
  const cutLiner = [];
  const cutEdge = [];
  for (const sx of [-1, 1]) {
    const ro = new THREE.RingGeometry(3.24, 3.36, 96, 1);
    ro.rotateY(sx > 0 ? -HALF_PI : HALF_PI);
    ro.translate(sx * HULL.half, CY, 0);
    cutMetal.push(ro);
    const ri = new THREE.RingGeometry(3.10, 3.24, 96, 1);
    ri.rotateY(sx > 0 ? -HALF_PI : HALF_PI);
    ri.translate(sx * HULL.half, CY, 0);
    cutLiner.push(ri);
  }
  const edgeY = Math.sin(OPEN_HALF) * SHELL_R;
  const edgeZ = Math.cos(OPEN_HALF) * SHELL_R;
  for (const sy of [-1, 1]) {
    const lip = new THREE.BoxGeometry(HULL.length, 0.14, 0.32);
    lip.translate(0, CY + sy * edgeY, edgeZ);
    cutMetal.push(lip);
    const innerLip = new THREE.BoxGeometry(HULL.length, 0.1, 0.18);
    innerLip.translate(0, CY + sy * (edgeY - 0.04), edgeZ - 0.12);
    cutLiner.push(innerLip);
    if (sy > 0) {
      const bar = new THREE.BoxGeometry(HULL.length, 0.018, 0.04);
      bar.translate(0, CY + edgeY + 0.075, edgeZ - 0.02);
      cutEdge.push(bar);
    }
  }
  // white ceramic skin strip so the section reads as the white habitat\n  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 0.62, metalness: 0.05 });\n  for (const sx of [-1, 1]) {\n    const wring = new THREE.RingGeometry(3.34, 3.44, 96, 1);\n    wring.rotateY(sx > 0 ? -HALF_PI : HALF_PI);\n    wring.translate(sx * (HULL.half + 0.002), CY, 0);\n    group.add(new THREE.Mesh(wring, skinMat));\n  }\n  const topSkin = new THREE.BoxGeometry(HULL.length, 0.08, 0.09);\n  topSkin.translate(0, CY + edgeY + 0.06, edgeZ - 0.01);\n  group.add(new THREE.Mesh(topSkin, skinMat));\n  build(cutMetal, mat.cutMetal, 'cut-metal', false, true);
  // white ceramic skin strip so the section reads as the white habitat
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 0.62, metalness: 0.05 });
  for (const sx of [-1, 1]) {
    const wring = new THREE.RingGeometry(3.34, 3.44, 96, 1);
    wring.rotateY(sx > 0 ? -HALF_PI : HALF_PI);
    wring.translate(sx * (HULL.half + 0.002), CY, 0);
    group.add(new THREE.Mesh(wring, skinMat));
  }
  const topSkin = new THREE.BoxGeometry(HULL.length, 0.08, 0.09);
  topSkin.translate(0, CY + edgeY + 0.06, edgeZ - 0.01);
  group.add(new THREE.Mesh(topSkin, skinMat));
  build(cutMetal, mat.cutMetal, 'cut-metal', false, true);
  build(cutEdge, mat.cutEdge, 'cut-edge', false, true);

  // end walls + interior end caps
  const endPlates = [];
  for (const sx of [-1, 1]) {
    const disc = new THREE.CircleGeometry(LINER_R - 0.02, 64);
    disc.rotateY(sx > 0 ? -HALF_PI : HALF_PI);
    disc.translate(sx * (HULL.half - 0.22), CY, 0);
    endPlates.push(disc);
  }
  build(endPlates, mat.linerFront, 'section-ends', false, true);

  // ---------------- structure ----------------
  const ribs = [];
  const dark = [];
  const rack = [];
  const white = [];
  const warmList = [];
  const cyanList = [];

  // 3 integrated ceiling arches at the compartment frames (no cage hoops)
  const partitionXs = [-4.4, -0.1, 3.9];
  for (const px of partitionXs) {
    const arch = new THREE.TorusGeometry(LINER_R - 0.05, 0.05, 6, 48, 1.9);
    arch.rotateZ(Math.PI / 2 - 0.95);
    arch.rotateY(HALF_PI);
    arch.translate(px, CY, 0);
    rack.push(arch);
    const floorBeam = new THREE.BoxGeometry(0.1, 0.09, 4.0);
    floorBeam.translate(px, FLOOR_Y - 0.055, 0);
    rack.push(floorBeam);
  }

  // floor grating and underfloor
  const floorZ = 4.1;
  const gratingGeo = new THREE.PlaneGeometry(14.9, floorZ, 1, 1);
  gratingGeo.rotateX(-HALF_PI);
  gratingGeo.translate(0, FLOOR_Y, 0.03);
  const gratingMat = new THREE.MeshStandardMaterial({
    map: tex.grating,
    alphaMap: tex.grating,
    alphaTest: 0.42,
    color: 0x3f4245,
    roughness: 0.8,
    metalness: 0.55,
    side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(gratingGeo, gratingMat);
  floor.receiveShadow = true;
  group.add(floor);
  const subfloor = new THREE.PlaneGeometry(15, 4.2);
  subfloor.rotateX(-HALF_PI);
  subfloor.translate(0, FLOOR_Y - 0.09, 0.03);
  dark.push(subfloor);
  // floor fascia under the cut
  const fascia = new THREE.BoxGeometry(15, 0.72, 0.1);
  fascia.translate(0, FLOOR_Y - 0.4, 2.06);
  dark.push(fascia);

  // corridor handrails
  for (const z of [-0.82, 0.82]) {
    const rail = new THREE.CylinderGeometry(0.021, 0.021, 13.6, 8);
    rail.rotateZ(HALF_PI);
    rail.translate(0, FLOOR_Y + 1.02, z);
    rack.push(rail);
    for (let x = -6.4; x <= 6.4; x += 1.6) {
      const post = new THREE.CylinderGeometry(0.016, 0.016, 1.02, 6);
      post.translate(x, FLOOR_Y + 0.51, z);
      rack.push(post);
    }
  }

  // ceiling strip lights down the spine
  for (let x = -6.6; x <= 6.6; x += 1.65) {
    const bar = new RoundedBoxGeometry(0.62, 0.05, 0.1, 1, 0.01);
    bar.translate(x, CY + 1.62, -0.55);
    warmList.push(bar);
    const housing = new THREE.BoxGeometry(0.76, 0.08, 0.16);
    housing.translate(x, CY + 1.66, -0.55);
    dark.push(housing);
  }
  // one cool instrument strip in ECLSS
  const coolBar = new RoundedBoxGeometry(0.42, 0.04, 0.08, 1, 0.008);
  coolBar.translate(5.4, CY + 1.1, -1.4);
  cyanList.push(coolBar);

  // ---------------- compartment partitions ----------------
  for (const px of partitionXs) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, LINER_R - 0.06, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    const hw = 0.92;
    const yb = -2.3;
    const yt = 0.94;
    const rr = 0.35;
    hole.moveTo(-hw, yb);
    hole.lineTo(-hw, yt - rr);
    hole.quadraticCurveTo(-hw, yt, -hw + rr, yt);
    hole.lineTo(hw - rr, yt);
    hole.quadraticCurveTo(hw, yt, hw, yt - rr);
    hole.lineTo(hw, yb);
    hole.closePath();
    shape.holes.push(hole);
    const wg = new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: false,
      curveSegments: 36,
    });
    wg.rotateY(HALF_PI);
    wg.translate(px, CY, 0);
    const wall = new THREE.Mesh(wg, mat.partition);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
    // door frame
    for (const fz of [-0.96, 0.96]) {
      const jamb = new THREE.BoxGeometry(0.1, 3.35, 0.09);
      jamb.translate(px + 0.07, FLOOR_Y + 1.62, fz);
      rack.push(jamb);
    }
    const header = new THREE.BoxGeometry(0.1, 0.1, 2.0);
    header.translate(px + 0.07, CY + 0.97, 0);
    rack.push(header);
  }

  // ---------------- airlock bay ----------------
  // vertical ladder to the service hatch
  for (const lz of [1.2, 1.9]) {
    const rail = new THREE.CylinderGeometry(0.035, 0.035, 4.8, 8);
    rail.translate(-7.05, FLOOR_Y + 2.4, lz);
    rack.push(rail);
  }
  for (let i = 0; i < 10; i++) {
    const rung = new THREE.CylinderGeometry(0.026, 0.026, 0.72, 6);
    rung.rotateX(HALF_PI);
    rung.translate(-7.05, FLOOR_Y + 0.35 + i * 0.44, 1.55);
    rack.push(rung);
  }
  // hatch on the end wall
  const endHatch = new THREE.CylinderGeometry(0.62, 0.62, 0.07, 40);
  endHatch.rotateZ(HALF_PI);
  endHatch.translate(-7.54, CY - 0.3, -0.4);
  rack.push(endHatch);
  const endRing = new THREE.TorusGeometry(0.64, 0.04, 6, 40);
  endRing.rotateY(HALF_PI);
  endRing.translate(-7.5, CY - 0.3, -0.4);
  rack.push(endRing);
  const endWindow = new THREE.CircleGeometry(0.18, 24);
  endWindow.rotateY(HALF_PI);
  endWindow.translate(-7.49, CY - 0.18, -0.4);
  cyanList.push(endWindow);
  const hatchBar = new THREE.BoxGeometry(0.08, 0.55, 0.06);
  hatchBar.translate(-7.47, CY - 0.3, -0.4);
  rack.push(hatchBar);

  // suit lockers on the airlock bay far wall
  for (let i = 0; i < 2; i++) {
    const locker = new RoundedBoxGeometry(0.62, 1.85, 0.55, 2, 0.02);
    locker.translate(-6.6 + i * 0.72, FLOOR_Y + 0.95, -1.7);
    white.push(locker);
    const louvre = new THREE.BoxGeometry(0.34, 0.03, 0.02);
    louverLoop(locker, i);
  }
  function louverLoop(locker, i) {
    for (let k = 0; k < 5; k++) {
      const l = new THREE.BoxGeometry(0.34, 0.024, 0.02);
      l.translate(-6.6 + i * 0.72, FLOOR_Y + 1.5 - k * 0.08, -1.41);
      dark.push(l);
    }
  }
  // ---------------- LAB ----------------
  // equipment racks on the far wall
  for (let i = 0; i < 3; i++) {
    const x = -3.95 + i * 1.15;
    const box = new RoundedBoxGeometry(1.02, 1.85, 0.62, 2, 0.02);
    box.translate(x, FLOOR_Y + 0.95, -1.62);
    rack.push(box);
    const face = new RoundedBoxGeometry(0.9, 1.4, 0.035, 2, 0.01);
    face.translate(x, FLOOR_Y + 1.02, -1.3);
    dark.push(face);
    for (let k = 0; k < 4; k++) {
      const led = new THREE.BoxGeometry(0.1, 0.012, 0.012);
      led.translate(x - 0.28 + k * 0.18, FLOOR_Y + 1.46, -1.275);
      if (k === 2) cyanList.push(led);
      else warmList.push(led);
    }
  }
  // workbench + monitors
  const bench = new RoundedBoxGeometry(2.9, 0.08, 0.72, 2, 0.015);
  bench.translate(-2.5, FLOOR_Y + 0.82, -1.35);
  rack.push(bench);
  for (const bx of [-3.5, -2.5, -1.5]) {
    const leg = new THREE.BoxGeometry(0.06, 0.8, 0.55);
    leg.translate(bx, FLOOR_Y + 0.4, -1.35);
    rack.push(leg);
  }
  for (let i = 0; i < 2; i++) {
    const mon = new RoundedBoxGeometry(0.52, 0.34, 0.04, 2, 0.012);
    mon.translate(-2.9 + i * 0.7, FLOOR_Y + 1.18, -0.95);
    dark.push(mon);
    const screen = new THREE.PlaneGeometry(0.45, 0.27);
    screen.translate(-2.9 + i * 0.7, FLOOR_Y + 1.18, -0.925);
    cyanList.push(screen);
    const neck = new THREE.BoxGeometry(0.05, 0.18, 0.04);
    neck.translate(-2.9 + i * 0.7, FLOOR_Y + 0.98, -0.95);
    rack.push(neck);
  }
  // sample trays
  for (let i = 0; i < 3; i++) {
    const tray = new RoundedBoxGeometry(0.42, 0.06, 0.28, 1, 0.01);
    tray.translate(-3.6 + i * 0.45, FLOOR_Y + 0.9, -1.15);
    white.push(tray);
  }

  // ---------------- CREW ----------------
  const bunkDeck = FLOOR_Y + 0.55;
  for (let tier = 0; tier < 2; tier++) {
    const y = bunkDeck + tier * 1.02;
    const frame = new RoundedBoxGeometry(2.4, 0.09, 0.92, 2, 0.015);
    frame.translate(1.5, y, -1.45);
    rack.push(frame);
    const mattress = new RoundedBoxGeometry(2.25, 0.16, 0.82, 2, 0.06);
    mattress.translate(1.5, y + 0.11, -1.45);
    group.add(new THREE.Mesh(mattress, mat.mattress)).receiveShadow = true;
    const blanket = new RoundedBoxGeometry(1.3, 0.1, 0.82, 2, 0.04);
    blanket.translate(2.0, y + 0.2, -1.45);
    group.add(new THREE.Mesh(blanket, mat.blanket));
    for (const sx of [-1.1, 1.1]) {
      const post = new THREE.CylinderGeometry(0.025, 0.025, 1.05, 6);
      post.translate(1.5 + sx, y + 0.5, -1.9);
      rack.push(post);
    }
    const rail = new THREE.CylinderGeometry(0.02, 0.02, 2.3, 6);
    rail.rotateZ(HALF_PI);
    rail.translate(1.5, y + 0.98, -1.9);
    rack.push(rail);
  }
  // reading light
  const readLight = new THREE.BoxGeometry(0.18, 0.02, 0.05);
  readLight.translate(2.55, bunkDeck + 1.7, -1.86);
  warmList.push(readLight);
  // small fold-down table and stool
  const table = new RoundedBoxGeometry(0.8, 0.05, 0.5, 2, 0.01);
  table.translate(2.9, FLOOR_Y + 0.68, -0.15);
  white.push(table);
  const tableLeg = new THREE.CylinderGeometry(0.03, 0.03, 0.66, 8);
  tableLeg.translate(2.9, FLOOR_Y + 0.34, -0.15);
  rack.push(tableLeg);

  // ---------------- ECLSS ----------------
  const tanks = [];
  for (let i = 0; i < 3; i++) {
    const tank = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 24);
    tank.translate(4.9 + i * 0.72, FLOOR_Y + 1.05, -1.55);
    tanks.push(tank);
    const cap = new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.translate(4.9 + i * 0.72, FLOOR_Y + 1.8, -1.55);
    white.push(cap);
    const band = new THREE.TorusGeometry(0.305, 0.02, 4, 24);
    band.rotateX(HALF_PI);
    band.translate(4.9 + i * 0.72, FLOOR_Y + 1.3, -1.55);
    rack.push(band);
  }
  build(tanks, mat.white, 'eclss-tanks', false, true);
  // pipes
  for (let i = 0; i < 3; i++) {
    const pipe = new THREE.CylinderGeometry(0.035, 0.035, 3.4, 8);
    pipe.rotateZ(HALF_PI);
    pipe.translate(6.4, FLOOR_Y + 2.1, -2.05 + i * 0.13);
    rack.push(pipe);
    const drop = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8);
    drop.translate(7.35, FLOOR_Y + 1.6, -2.05 + i * 0.13);
    rack.push(drop);
  }
  // gauge panel
  const gauge = new THREE.PlaneGeometry(0.55, 0.55);
  gauge.translate(6.5, FLOOR_Y + 1.55, -1.78);
  const gaugeMesh = new THREE.Mesh(
    gauge,
    new THREE.MeshBasicMaterial({ map: gaugeCanvas(), toneMapped: false })
  );
  group.add(gaugeMesh);
  const gaugeBack = new RoundedBoxGeometry(0.66, 0.66, 0.06, 2, 0.01);
  gaugeBack.translate(6.5, FLOOR_Y + 1.55, -1.84);
  dark.push(gaugeBack);

  // wall stencil plates (blank warm metal, labels are DOM callouts)
  for (const [x, y, z, w, h] of [
    [-6.4, CY + 0.7, -1.75, 0.9, 0.26],
    [-2.2, CY + 0.55, -1.8, 1.1, 0.24],
    [2.2, CY + 0.8, -1.82, 0.9, 0.24],
    [6.0, CY + 0.4, -1.8, 0.8, 0.24],
  ]) {
    const plate = new THREE.BoxGeometry(w, h, 0.03);
    plate.translate(x, y, z);
    dark.push(plate);
  }

  // ---------------- finish details ----------------
  // central walkway strip
  const walkway = new THREE.PlaneGeometry(14.4, 0.95);
  walkway.rotateX(-HALF_PI);
  walkway.translate(0, FLOOR_Y + 0.012, 0.05);
  const walkMesh = new THREE.Mesh(
    walkway,
    new THREE.MeshStandardMaterial({ color: 0x4f4a42, roughness: 0.92, metalness: 0.12 })
  );
  walkMesh.receiveShadow = true;
  group.add(walkMesh);
  // ceiling cable tray and conduits
  const tray = new THREE.BoxGeometry(14.5, 0.1, 0.55);
  tray.translate(0, CY + 2.42, -0.95);
  dark.push(tray);
  for (let i = 0; i < 3; i++) {
    const pipe = new THREE.CylinderGeometry(0.035, 0.035, 14.3, 6);
    pipe.rotateZ(HALF_PI);
    pipe.translate(0, CY + 2.32, -1.05 + i * 0.11);
    rack.push(pipe);
  }
  // galley in CREW
  const galleyBase = new RoundedBoxGeometry(1.15, 0.85, 0.55, 2, 0.02);
  galleyBase.translate(2.35, FLOOR_Y + 0.43, -1.55);
  rack.push(galleyBase);
  const galleyTop = new RoundedBoxGeometry(1.25, 0.07, 0.62, 2, 0.015);
  galleyTop.translate(2.35, FLOOR_Y + 0.9, -1.55);
  white.push(galleyTop);
  const sink = new THREE.BoxGeometry(0.42, 0.04, 0.34);
  sink.translate(2.0, FLOOR_Y + 0.92, -1.55);
  dark.push(sink);
  const galleyScreen = new THREE.PlaneGeometry(0.42, 0.24);
  galleyScreen.translate(2.7, FLOOR_Y + 1.95, -1.2);
  cyanList.push(galleyScreen);
  // extra lockers in CREW / ECLSS
  for (const lx of [3.2, 4.55, 5.15]) {
    const locker = new RoundedBoxGeometry(0.56, 1.7, 0.5, 2, 0.02);
    locker.translate(lx, FLOOR_Y + 0.9, -1.7);
    white.push(locker);
    for (let k = 0; k < 4; k++) {
      const vent = new THREE.BoxGeometry(0.3, 0.02, 0.01);
      vent.translate(lx, FLOOR_Y + 1.45 - k * 0.07, -1.44);
      dark.push(vent);
    }
  }
  // second emissive display in ECLSS
  const eclssScreen = new THREE.PlaneGeometry(0.55, 0.32);
  eclssScreen.translate(6.4, FLOOR_Y + 2.05, -1.2);
  cyanList.push(eclssScreen);

  // ---------------- breach ----------------
  const breachLocal = new THREE.Vector3(-1.85, CY + 0.72, -3.05);
  const frost = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 1.05),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(frostCanvas()),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.6,
      toneMapped: false,
    })
  );
  frost.visible = false;
  frost.position.copy(breachLocal);
  frost.rotation.x = 0.06;
  group.add(frost);
  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(0.055, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  hole.position.copy(breachLocal).add(new THREE.Vector3(0.05, 0, 0.02));
  group.add(hole);

  // ---------------- merge static sets ----------------
  build(ribs, mat.rack, 'interior-ribs');
  build(dark, mat.dark, 'interior-dark', false, true);
  build(rack, mat.rack, 'interior-rack');
  build(white, mat.white, 'interior-white');
  build(warmList, mat.strip, 'interior-strips', false, false);
  build(cyanList, mat.cyan, 'interior-cyan', false, false);

  // ---------------- lights ----------------
  const lights = [];
  const addLight = (x, y, z, color, intensity, dist) => {
    const l = new THREE.PointLight(color, intensity, dist, 2);
    l.position.set(x, y, z);
    group.add(l);
    lights.push(l);
    return l;
  };
  addLight(-2.6, CY + 1.2, -0.4, warm, 10, 7);
  addLight(1.6, CY + 1.1, -0.6, warm, 9, 7);
  addLight(5.4, CY + 0.9, -0.9, warm, 8, 6);
  addLight(5.6, CY + 1.0, -1.4, cyan, 3.2, 4.5);
  addLight(-5.6, CY + 0.4, 0.2, warm, 6, 5);
  addLight(-2.8, CY + 0.5, -1.3, cyan, 3.0, 4);
  addLight(-7.0, CY + 0.8, 0.7, warm, 5, 4.5);
  const fill = new THREE.HemisphereLight(0x5a6a7a, 0x2a2018, 0.07);
  group.add(fill);
  for (const sx of [2.0, 5.5]) {
    const lampBar = new RoundedBoxGeometry(0.7, 0.06, 0.16, 1, 0.01);
    lampBar.translate(sx, CY + 2.05, 0.15);
    group.add(new THREE.Mesh(lampBar, mat.strip));
    const pool = new THREE.SpotLight(0xffb26b, 22, 8, 0.7, 0.85, 1.8);
    pool.position.set(sx, CY + 2.0, 0.15);
    pool.target.position.set(sx, FLOOR_Y + 0.3, -0.4);
    group.add(pool);
    group.add(pool.target);
    lights.push(pool);
  }

  // volumetric shaft in CREW
  const shaft = new THREE.Mesh(
    new THREE.ConeGeometry(0.72, 2.6, 28, 1, true),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(warm) },
        uIntensity: { value: 0.06 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix) * normal);
          vV = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float edge = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.4);
          float vertical = smoothstep(0.0, 0.22, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
          float a = uIntensity * edge * vertical;
          gl_FragColor = vec4(uColor * a, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  shaft.position.set(1.5, CY + 0.2, 0.1);
  shaft.rotation.z = 0.03;
  group.add(shaft);

  // ---------------- field-cut plinth ----------------
  const plinth = new RoundedBoxGeometry(15.9, 0.24, 7.35, 2, 0.025);
  plinth.translate(0, 0.12, 0);
  const plinthMesh = new THREE.Mesh(
    plinth,
    new THREE.MeshStandardMaterial({ color: 0x252220, roughness: 0.8, metalness: 0.25 })
  );
  plinthMesh.receiveShadow = true;
  plinthMesh.castShadow = true;
  group.add(plinthMesh);
  for (const bz of [-1.6, 1.6]) {
    const beam = new THREE.BoxGeometry(15.6, 0.62, 0.55);
    beam.translate(0, 0.55, bz);
    const beamMesh = new THREE.Mesh(beam, mat.rack);
    beamMesh.castShadow = true;
    group.add(beamMesh);
  }
  // soft contact shadow under the plinth
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d');
  const sg = sctx.createRadialGradient(128, 64, 8, 128, 64, 120);
  sg.addColorStop(0, 'rgba(0,0,0,0.55)');
  sg.addColorStop(0.6, 'rgba(0,0,0,0.3)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, 256, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  // plinth top edges catch the low sun
  for (const pz of [-3.64, 3.64]) {
    const edge = new THREE.BoxGeometry(15.9, 0.05, 0.07);
    edge.translate(0, 0.245, pz);
    const em = new THREE.Mesh(edge, mat.cutMetal);
    group.add(em);
  }
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(18.5, 9.5),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false })
  );
  shadowPlane.rotation.x = -HALF_PI;
  shadowPlane.position.set(0, 0.015, 0);
  shadowPlane.renderOrder = 2;
  group.add(shadowPlane);

  return {
    group,
    lights,
    breachLocal,
    frost,
    shaft,
    interiorMeshes: group.children.length,
  };
}











