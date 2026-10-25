import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  stencilCanvas,
  ceramicAlbedoCanvas,
  ceramicNormalCanvas,
  ceramicRoughnessCanvas,
  solarArrayCanvas,
} from '../textures/hull.js';
import { canvasTexture } from '../textures/procedural.js';
import { mergeParts } from './merge.js';
import { terrainHeight } from './terrain.js';
import { HABITAT_YAW } from '../core/state.js';

export const HULL = {
  cx: 0,
  cy: 3.7,
  cz: 0,
  radius: 3.34,
  length: 15.6,
  half: 7.8,
  airlockX: -9.7,
  airlockR: 2.06,
  airlockLen: 2.3,
  airlockCY: 3.3,
};

const HALF_PI = Math.PI / 2;

function put(geo, x, y, z, rx = 0, ry = 0, rz = 0) {
  geo.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ')),
      new THREE.Vector3(1, 1, 1)
    )
  );
  return geo;
}

const COS_YAW = Math.cos(HABITAT_YAW);
const SIN_YAW = Math.sin(HABITAT_YAW);
const UP = new THREE.Vector3(0, 1, 0);

/** Habitat-local XZ to world XZ (the habitat root is yawed in main.js). */
function groundAt(x, z) {
  return terrainHeight(x * COS_YAW + z * SIN_YAW, -x * SIN_YAW + z * COS_YAW);
}

/** Cylinder between two points, for rails, braces and cable stands. */
function tubeBetween(ax, ay, az, bx, by, bz, r, seg = 8) {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r, r, Math.max(0.01, len), seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  geo.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
  return geo;
}

function boxBetween(list, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  list.push(put(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz));
}

function warmWindowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, '#ffd7a8');
  g.addColorStop(0.35, '#e39a52');
  g.addColorStop(0.75, '#7a3e16');
  g.addColorStop(1, '#221206');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(20,16,12,0.8)';
  ctx.fillRect(20, 26, 24, 82);
  ctx.fillRect(88, 42, 20, 58);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createHabitat(tex) {
  const root = new THREE.Group();
  const group = new THREE.Group();
  group.name = 'habitat-exterior';
  root.add(group);
  const CY = HULL.cy;
  const R = HULL.radius;

  const ceramicMap = canvasTexture(ceramicAlbedoCanvas(), { srgb: true, aniso: 8 });
  const ceramicNormal = canvasTexture(ceramicNormalCanvas(), { aniso: 8 });
  const ceramicRough = canvasTexture(ceramicRoughnessCanvas(), { aniso: 8 });
  const solarMap = canvasTexture(solarArrayCanvas(), { srgb: true, aniso: 8 });

  const ceramic = new THREE.MeshPhysicalMaterial({
    map: ceramicMap,
    normalMap: ceramicNormal,
    roughnessMap: ceramicRough,
    color: 0xffffff,
    roughness: 0.48,
    metalness: 0.08,
    clearcoat: 0.09,
    clearcoatRoughness: 0.42,
    normalScale: new THREE.Vector2(0.62, 0.62),
    envMapIntensity: 0.5,
    specularIntensity: 0.9,
  });
  ceramic.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDustW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvDustW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDustW;')
      .replace('#include <map_fragment>', '#include <map_fragment>\nfloat dust = smoothstep(1.9, 0.15, vDustW.y);\ndiffuseColor.rgb *= mix(vec3(1.0), vec3(0.76, 0.73, 0.68), dust * 0.5);');
  };
  const titanium = new THREE.MeshStandardMaterial({
    color: 0x9aa0a6,
    roughness: 0.36,
    metalness: 0.86,
    envMapIntensity: 0.9,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x2a2d30,
    roughness: 0.62,
    metalness: 0.4,
    envMapIntensity: 0.35,
  });
  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x4a4d50,
    roughness: 0.62,
    metalness: 0.35,
    envMapIntensity: 0.35,
  });
  // stair structure reads in ambient too: less mirror, more brushed titanium
  const stairMetal = new THREE.MeshStandardMaterial({
    color: 0xa9aeb3,
    roughness: 0.5,
    metalness: 0.58,
    envMapIntensity: 0.9,
  });
  const gold = new THREE.MeshStandardMaterial({
    map: tex.mliAlbedo,
    normalMap: tex.mliNormal,
    normalScale: new THREE.Vector2(0.7, 0.7),
    color: 0xb88b3e,
    roughness: 0.5,
    metalness: 0.7,
    envMapIntensity: 0.6,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0d1216,
    roughness: 0.06,
    metalness: 0.0,
    clearcoat: 1,
    transparent: true,
    opacity: 0.5,
    envMapIntensity: 1.3,
    depthWrite: false,
  });
  const warm = new THREE.MeshBasicMaterial({ map: warmWindowTexture(), toneMapped: false });
  const solarMat = new THREE.MeshPhysicalMaterial({
    map: solarMap,
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0.15,
    clearcoat: 0.08,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.3,
    emissive: 0x0d2036,
    emissiveIntensity: 0.3,
  });

  const add = (mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // hull
  const core = new THREE.CylinderGeometry(R, R, HULL.length, 112, 1, true);
  core.rotateZ(-HALF_PI);
  core.translate(0, CY, 0);
  add(new THREE.Mesh(core, ceramic));

  // end cap
  const cap = new THREE.CylinderGeometry(R - 0.04, R - 0.04, 0.16, 96);
  put(cap, HULL.half + 0.02, CY, 0, 0, 0, HALF_PI);
  add(new THREE.Mesh(cap, ceramic));
  const capRing = new THREE.TorusGeometry(R - 0.04, 0.07, 6, 96);
  put(capRing, HULL.half + 0.1, CY, 0, 0, HALF_PI, 0);
  add(new THREE.Mesh(capRing, titanium));

  // seam bands
  for (const sx of [-4.6, -1.2, 2.2, 5.6]) {
    const band = new THREE.CylinderGeometry(R + 0.006, R + 0.006, 0.045, 96, 1, true);
    band.rotateZ(-HALF_PI);
    band.translate(sx, CY, 0);
    add(new THREE.Mesh(band, seamMat));
  }

  // neck fairing
  const profile = [
    [R, -7.55],
    [3.3, -7.7],
    [3.04, -7.94],
    [2.7, -8.18],
    [2.36, -8.38],
    [2.1, -8.5],
    [2.06, -8.55],
  ].map(([r, x]) => new THREE.Vector2(r, x));
  const fairing = new THREE.LatheGeometry(profile, 64);
  fairing.rotateZ(-HALF_PI);
  fairing.translate(0, CY, 0);
  const fairingMat = ceramic.clone();
  fairingMat.side = THREE.DoubleSide;
  add(new THREE.Mesh(fairing, fairingMat));

  // airlock
  const AX = HULL.airlockX;
  const AR = HULL.airlockR;
  const ACY = HULL.airlockCY;
  const drum = new THREE.CylinderGeometry(AR, AR, HULL.airlockLen, 72, 1, true);
  drum.rotateZ(-HALF_PI);
  drum.translate(AX, ACY, 0);
  add(new THREE.Mesh(drum, ceramic));
  const face = new THREE.RingGeometry(1.16, AR, 72, 1);
  put(face, AX - HULL.airlockLen / 2 - 0.06, ACY, 0, 0, -HALF_PI, 0);
  add(new THREE.Mesh(face, ceramic));
  const surround = new THREE.MeshStandardMaterial({ color: 0x4c5258, roughness: 0.38, metalness: 0.75 });
  const ring = new THREE.RingGeometry(1.16, 1.55, 72, 1);
  put(ring, AX - HULL.airlockLen / 2 - 0.12, ACY, 0, 0, -HALF_PI, 0);
  add(new THREE.Mesh(ring, surround));
  const whiteRing = new THREE.RingGeometry(1.55, 1.72, 72, 1);
  put(whiteRing, AX - HULL.airlockLen / 2 - 0.08, ACY, 0, 0, -HALF_PI, 0);
  add(new THREE.Mesh(whiteRing, ceramic));
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x7d8388,
    roughness: 0.45,
    metalness: 0.35,
    envMapIntensity: 0.5,
  });
  const door = new THREE.CylinderGeometry(1.12, 1.12, 0.12, 48);
  put(door, AX - HULL.airlockLen / 2 + 0.03, ACY, 0, 0, 0, HALF_PI);
  add(new THREE.Mesh(door, doorMat));
  const doorRim = new THREE.TorusGeometry(1.13, 0.045, 6, 48);
  put(doorRim, AX - HULL.airlockLen / 2 - 0.03, ACY, 0, 0, HALF_PI, 0);
  add(new THREE.Mesh(doorRim, titanium));
  const win = new THREE.CircleGeometry(0.19, 24);
  put(win, AX - HULL.airlockLen / 2 - 0.04, ACY + 0.48, 0.22, 0, -HALF_PI, 0);
  group.add(new THREE.Mesh(win, warm));
  const winGlass = new THREE.CircleGeometry(0.2, 24);
  put(winGlass, AX - HULL.airlockLen / 2 - 0.06, ACY + 0.48, 0.22, 0, -HALF_PI, 0);
  group.add(new THREE.Mesh(winGlass, glass));
  const wheel = new THREE.TorusGeometry(0.3, 0.035, 6, 28);
  put(wheel, AX - HULL.airlockLen / 2 - 0.14, ACY, 0, 0, HALF_PI, 0);
  add(new THREE.Mesh(wheel, titanium));
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.BoxGeometry(0.03, 0.6, 0.026);
    put(spoke, AX - HULL.airlockLen / 2 - 0.14, ACY, 0, (i / 3) * Math.PI, 0, 0);
    add(new THREE.Mesh(spoke, titanium));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const latch = new THREE.BoxGeometry(0.09, 0.32, 0.05);
    put(latch, AX - HULL.airlockLen / 2 - 0.02, ACY + Math.cos(a) * 0.68, Math.sin(a) * 0.68, a, 0, 0);
    add(new THREE.Mesh(latch, titanium));
  }

  // compact entrance light bar, not a visor shelf
  const visor = new RoundedBoxGeometry(0.18, 0.07, 1.7, 2, 0.02);
  put(visor, AX - HULL.airlockLen / 2 - 0.2, ACY + 1.36, 0, 0, 0, 0);
  add(new THREE.Mesh(visor, titanium));
  const lipGlow = new THREE.BoxGeometry(0.03, 0.02, 1.5);
  put(lipGlow, AX - HULL.airlockLen / 2 - 0.3, ACY + 1.31, 0);
  group.add(new THREE.Mesh(lipGlow, new THREE.MeshStandardMaterial({
    color: 0x1a120a, emissive: 0xffb26b, emissiveIntensity: 2.2, roughness: 0.4,
  })));
  const doorLight = new THREE.SpotLight(0xffb26b, 6, 7, 0.52, 0.9, 1.8);
  doorLight.position.set(AX - HULL.airlockLen / 2 - 0.95, ACY + 1.45, 0.3);
  doorLight.target.position.set(AX - HULL.airlockLen / 2 - 0.2, ACY - 0.45, 0);
  group.add(doorLight);
  group.add(doorLight.target);

  // ---------- airlock access: one bolted stair assembly ----------
  const faceX = AX - HULL.airlockLen / 2; // ceramic face plane
  const platTop = 2.155;                  // just under the door bottom (2.18)
  const platX0 = faceX - 1.27;            // outer edge
  const platX1 = faceX - 0.07;            // sill edge
  const platCx = (platX0 + platX1) / 2;

  // sit the stair foot on the regolith instead of guessing a flat plane
  const footTop = Math.max(0.14, Math.max(
    groundAt(-15.25, -0.6), groundAt(-15.25, 0.65),
    groundAt(-13.85, -0.6), groundAt(-13.85, 0.65)
  ) + 0.05);

  const stair = new THREE.Group();
  stair.name = 'airlock-stairs';
  const sT = []; // titanium structure
  const sD = []; // graphite understructure

  // landing: graphite underplate, real grating, titanium edge frame
  boxBetween(sD, 1.2, 0.06, 1.96, platCx, platTop - 0.07, 0);
  for (const ex of [platX0, platX1]) boxBetween(sT, 0.06, 0.1, 2.04, ex, platTop - 0.04, 0);
  for (const ez of [-0.99, 0.99]) boxBetween(sT, 1.24, 0.1, 0.06, platCx, platTop - 0.04, ez);
  for (const rz of [-0.62, 0, 0.62]) boxBetween(sD, 1.1, 0.05, 0.05, platCx, platTop - 0.13, rz);
  for (const bx of [platX0 + 0.1, platX1 - 0.1]) {
    for (const bz of [-0.86, 0.86]) {
      const bolt = new THREE.CylinderGeometry(0.026, 0.026, 0.035, 8);
      put(bolt, bx, platTop + 0.002, bz);
      sT.push(bolt);
    }
  }
  // threshold plate bridging the sill to the platform
  boxBetween(sT, 0.17, 0.03, 0.9, faceX - 0.06, platTop - 0.005, 0);

  // two knee braces from the drum face annulus up to the platform underside
  for (const bz of [-0.72, 0.72]) {
    sT.push(tubeBetween(-10.94, 1.55, bz, -12.0, platTop - 0.1, bz, 0.045, 8));
    const wallPad = new THREE.CylinderGeometry(0.1, 0.1, 0.06, 14);
    put(wallPad, -10.92, 1.55, bz, 0, 0, HALF_PI);
    sD.push(wallPad);
    boxBetween(sD, 0.24, 0.07, 0.1, -11.99, platTop - 0.13, bz);
  }

  // stringers: one sloped beam each side, landing to lower pad
  const strTopX = platX0 + 0.03;
  const strBotX = -14.0;
  const strTopY = platTop - 0.06;
  const strBotY = footTop + 0.04;
  const strLen = Math.hypot(strTopX - strBotX, strTopY - strBotY) + 0.1;
  const strAng = Math.atan2(strTopY - strBotY, strTopX - strBotX);
  const strMidX = (strTopX + strBotX) / 2;
  const strMidY = (strTopY + strBotY) / 2;
  for (const sz of [-0.49, 0.49]) {
    boxBetween(sT, strLen, 0.17, 0.07, strMidX, strMidY, sz, 0, 0, strAng);
  }

  // six treads between the stringers, plus grip ribs
  for (let i = 0; i < 6; i++) {
    const topY = footTop + ((platTop - footTop) * (i + 1)) / 7;
    const x = -13.77 + i * 0.3;
    boxBetween(sT, 0.3, 0.05, 0.9, x, topY - 0.025, 0);
    for (const gx of [-0.075, 0.075]) {
      boxBetween(sD, 0.026, 0.012, 0.82, x + gx, topY + 0.001, 0);
    }
  }

  // lower landing pad, seated over the regolith
  const padCx = -14.55;
  const padCz = 0.05;
  const padW = 1.4;
  const padD = 1.25;
  boxBetween(sD, padW, 0.05, padD, padCx, footTop - 0.045, padCz);
  boxBetween(sD, padW - 0.04, 0.3, padD - 0.04, padCx, footTop - 0.19, padCz);
  for (const ex of [padCx - padW / 2, padCx + padW / 2]) {
    boxBetween(sT, 0.05, 0.07, padD, ex, footTop - 0.02, padCz);
  }
  for (const ez of [padCz - padD / 2, padCz + padD / 2]) {
    boxBetween(sT, padW, 0.07, 0.05, padCx, footTop - 0.02, ez);
  }

  // handrails: continuous pipe each side, three posts, capped ends
  const railZ = [-0.49, 0.49];
  const railTopX = -11.99;
  const railBotX = -13.99;
  const railTopY = platTop + 1.0;
  const railBotY = footTop + 1.0;
  for (const rz of railZ) {
    sT.push(tubeBetween(railTopX, railTopY, rz, railBotX, railBotY, rz, 0.027, 8));
    for (const px of [railTopX, -12.99, railBotX]) {
      const t = (px - railTopX) / (railBotX - railTopX);
      const topY = railTopY + (railBotY - railTopY) * t;
      let baseY;
      if (px === railTopX) baseY = platTop;
      else if (px === railBotX) baseY = footTop;
      else baseY = strTopY + (strBotY - strTopY) *
        ((px - strTopX) / (strBotX - strTopX));
      sT.push(tubeBetween(px, baseY, rz, px, topY, rz, 0.024, 8));
      const foot = new THREE.CylinderGeometry(0.055, 0.065, 0.04, 10);
      put(foot, px, baseY + 0.014, rz);
      sD.push(foot);
    }
    for (const [cx, cy] of [[railTopX, railTopY], [railBotX, railBotY]]) {
      const cap = new THREE.SphereGeometry(0.038, 8, 6);
      put(cap, cx, cy, rz);
      sT.push(cap);
    }
  }

  // grates over the landing and the lower pad
  const grateTex = tex.grating.clone();
  grateTex.needsUpdate = true;
  grateTex.repeat.set(5, 8);
  const grateMat = new THREE.MeshStandardMaterial({
    map: grateTex,
    color: 0xaab1b6,
    roughness: 0.5,
    metalness: 0.55,
    transparent: true,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    envMapIntensity: 0.85,
  });
  const platGrate = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 1.92), grateMat);
  platGrate.rotation.x = -HALF_PI;
  platGrate.position.set(platCx, platTop + 0.002, 0);
  platGrate.receiveShadow = true;
  stair.add(platGrate);
  const padGrate = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.17), grateMat);
  padGrate.rotation.x = -HALF_PI;
  padGrate.position.set(padCx, footTop + 0.002, padCz);
  padGrate.receiveShadow = true;
  stair.add(padGrate);

  const stairT = new THREE.Mesh(mergeParts(sT, 'stair-titanium'), stairMetal);
  stairT.castShadow = true;
  stairT.receiveShadow = true;
  stair.add(stairT);
  const stairD = new THREE.Mesh(mergeParts(sD, 'stair-graphite'), dark);
  stairD.castShadow = true;
  stairD.receiveShadow = true;
  stair.add(stairD);
  group.add(stair);

  // portholes
  for (const px of [-4.55, -1.35, 3.3]) {
    const ny = 0.62 / R;
    const nz = Math.sqrt(1 - ny * ny);
    const pos = new THREE.Vector3(px, CY + 0.62, R * nz + 0.03);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, ny, nz)
    );
    const m = new THREE.Matrix4().compose(pos, quat, new THREE.Vector3(1, 1, 1));
    const ring = new THREE.TorusGeometry(0.3, 0.05, 6, 32).applyMatrix4(m);
    add(new THREE.Mesh(ring, titanium));
    const back = new THREE.CircleGeometry(0.29, 32);
    back.translate(0, 0, -0.22).applyMatrix4(m);
    group.add(new THREE.Mesh(back, warm));
    const gl = new THREE.CircleGeometry(0.3, 32);
    gl.translate(0, 0, 0.01).applyMatrix4(m);
    group.add(new THREE.Mesh(gl, glass));
  }

  // access doors — flush curved hatches, not boxes
  for (const dx of [-4.6, 1.8]) {
    const gasket = new THREE.CylinderGeometry(R + 0.012, R + 0.012, 1.05, 32, 1, true, -0.26, 0.52);
    gasket.rotateZ(-HALF_PI);
    gasket.translate(dx, CY, 0);
    add(new THREE.Mesh(gasket, dark));
    const leaf = new THREE.CylinderGeometry(R + 0.028, R + 0.028, 0.93, 32, 1, true, -0.22, 0.44);
    leaf.rotateZ(-HALF_PI);
    leaf.translate(dx, CY, 0);
    add(new THREE.Mesh(leaf, ceramic));
    const handle = new THREE.BoxGeometry(0.07, 0.3, 0.07);
    put(handle, dx + 0.3, CY - 0.1, R + 0.09);
    add(new THREE.Mesh(handle, titanium));
    const hinge = new THREE.BoxGeometry(0.06, 0.22, 0.05);
    put(hinge, dx - 0.36, CY + 0.25, R + 0.05);
    add(new THREE.Mesh(hinge, titanium));
  }

  // service spine
  const housing = new RoundedBoxGeometry(7.4, 0.62, 1.45, 3, 0.06);
  put(housing, -0.1, CY + 3.46, -0.2);
  add(new THREE.Mesh(housing, ceramic));
  const topBox = new RoundedBoxGeometry(4.2, 0.3, 1.15, 2, 0.04);
  put(topBox, -0.6, CY + 3.9, -0.62);
  add(new THREE.Mesh(topBox, titanium));
  const mli = new RoundedBoxGeometry(1.8, 0.2, 0.95, 2, 0.03);
  put(mli, 1.25, CY + 4.08, -0.55);
  add(new THREE.Mesh(mli, gold));
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.BoxGeometry(0.04, 0.9, 1.4);
    put(fin, -2.55 + i * 0.32, CY + 4.15, -1.25, -0.3, 0, 0);
    add(new THREE.Mesh(fin, ceramic));
  }
  const cupX = 1.3;
  const cupZ = 0.28;
  const cupDrum = new THREE.CylinderGeometry(0.63, 0.63, 0.34, 32);
  put(cupDrum, cupX, CY + 3.99, cupZ);
  add(new THREE.Mesh(cupDrum, titanium));
  const cupGlow = new THREE.SphereGeometry(0.54, 28, 12, 0, Math.PI * 2, 0, 1.0);
  put(cupGlow, cupX, CY + 4.14, cupZ);
  group.add(new THREE.Mesh(cupGlow, new THREE.MeshStandardMaterial({
    color: 0x140c05, emissive: 0xffa25c, emissiveIntensity: 0.15, roughness: 0.5,
  })));
  const cupGlass = new THREE.SphereGeometry(0.61, 28, 12, 0, Math.PI * 2, 0, 1.1);
  put(cupGlass, cupX, CY + 4.13, cupZ);
  group.add(new THREE.Mesh(cupGlass, glass));

  // mast
  const mastX = 3.2;
  const mast = new THREE.CylinderGeometry(0.04, 0.06, 2.2, 8);
  put(mast, mastX, CY + 4.5, -1.35);
  add(new THREE.Mesh(mast, titanium));
  const dish = new THREE.SphereGeometry(0.34, 18, 10, 0, Math.PI * 2, 0, 0.75);
  put(dish, mastX, CY + 5.55, -1.4, -1.1, 0, 0.3);
  add(new THREE.Mesh(dish, titanium));
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x160404, emissive: 0xff3b22, emissiveIntensity: 2 })
  );
  beacon.position.set(mastX, CY + 5.8, -1.35);
  group.add(beacon);

  // stencils
  const addStencil = (text, sub, w, h, x, y, z, ry) => {
    const c = stencilCanvas(text, sub, 512, 192);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: t, transparent: true, alphaTest: 0.02, roughness: 0.7,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3,
      })
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    group.add(mesh);
  };
  addStencil('HAB-04', 'PRESSURE VESSEL', 1.3, 0.48, -5.4, 2.8, R + 0.02, 0);
  addStencil('BULKHEAD', 'SECTION A-A', 1.4, 0.5, 0.6, 4.5, 3.28, 0);

  // ---------- ground-mounted solar array: 2 rows x 3 panels ----------
  const solar = new THREE.Group();
  solar.name = 'solar-array';
  const solarX = -14.6;
  const solarZ = -3.6;
  solar.position.set(solarX, groundAt(solarX, solarZ) - 0.06, solarZ);

  const soT = []; // titanium rack, frames, base hardware
  const soD = []; // graphite base plate, backsheets, junction box

  // sunk plinth + base plate, four anchor bolts
  boxBetween(soD, 1.9, 0.5, 1.4, 0, -0.11, 0);
  soD.push(put(new RoundedBoxGeometry(2.0, 0.14, 1.45, 2, 0.02), 0, 0.07, 0));
  for (const bx of [-0.82, 0.82]) {
    for (const bz of [-0.55, 0.55]) {
      const bolt = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8);
      put(bolt, bx, 0.16, bz);
      soT.push(bolt);
    }
  }

  // 2.2 m mast, collar and two gussets
  const mastGeo = new THREE.CylinderGeometry(0.105, 0.125, 2.2, 14);
  put(mastGeo, 0, 1.25, 0);
  soT.push(mastGeo);
  const collar = new THREE.CylinderGeometry(0.16, 0.16, 0.24, 14);
  put(collar, 0, 2.32, 0);
  soD.push(collar);
  soT.push(tubeBetween(-0.5, 0.14, -0.32, 0, 1.17, 0, 0.032, 6));
  soT.push(tubeBetween(0.5, 0.14, -0.32, 0, 1.17, 0, 0.032, 6));

  // junction box on the base plate, with a gland and a sun-faded label
  const jx = 0.62;
  const jz = 0.52;
  const junction = new RoundedBoxGeometry(0.48, 0.62, 0.32, 2, 0.02);
  put(junction, jx, 0.55, jz);
  soD.push(junction);
  const jFace = new THREE.BoxGeometry(0.38, 0.46, 0.02);
  put(jFace, jx, 0.56, jz + 0.17);
  soT.push(jFace);
  const gland = new THREE.CylinderGeometry(0.053, 0.053, 0.13, 8);
  put(gland, jx, 0.28, jz + 0.02);
  soD.push(gland);

  // bank: 3 columns x 2 rows of 2.4 x 1.1 m panels
  const bank = new THREE.Group();
  bank.name = 'solar-bank';
  bank.position.set(0.04, 2.46, 0.12);
  bank.rotation.set(-0.26, -0.4, 0);
  solar.add(bank);

  const bT = [];   // panel frames + rack
  const bD = [];   // backsheets
  const cells = []; // cell faces, merged to one draw
  const colStep = 2.5;
  const rowStep = 1.19;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const px = (col - 1) * colStep;
      const py = (row - 0.5) * rowStep;
      cells.push(put(new THREE.BoxGeometry(2.38, 1.08, 0.025), px, py, 0.02));
      boxBetween(bD, 2.4, 1.1, 0.02, px, py, -0.02);
      boxBetween(bT, 2.47, 0.055, 0.06, px, py + 0.545, 0.005);
      boxBetween(bT, 2.47, 0.055, 0.06, px, py - 0.545, 0.005);
      boxBetween(bT, 0.06, 1.145, 0.06, px - 1.205, py, 0.005);
      boxBetween(bT, 0.06, 1.145, 0.06, px + 1.205, py, 0.005);
      for (const cx of [px - 1.14, px + 1.14]) {
        for (const cy of [py - 0.5, py + 0.5]) {
          const bolt = new THREE.CylinderGeometry(0.022, 0.022, 0.03, 6);
          put(bolt, cx, cy, 0.04, HALF_PI, 0, 0);
          bT.push(bolt);
        }
      }
    }
  }
  // torque tube and two vertical mullions across the back of the bank
  boxBetween(bT, 7.4, 0.09, 0.09, 0, 0.02, -0.09);
  for (const mx of [-2.5, 2.5]) boxBetween(bT, 0.07, 2.25, 0.07, mx, 0, -0.08);
  // (removed) stray head bracket that read as a floating panel above the array

  const bankT = new THREE.Mesh(mergeParts(bT, 'solar-rack'), stairMetal);
  bankT.castShadow = true;
  bankT.receiveShadow = true;
  bank.add(bankT);
  const bankD = new THREE.Mesh(mergeParts(bD, 'solar-backsheet'), dark);
  bankD.castShadow = true;
  bankD.receiveShadow = true;
  bank.add(bankD);
  const cellMesh = new THREE.Mesh(mergeParts(cells, 'solar-cells'), solarMat);
  cellMesh.castShadow = true;
  cellMesh.receiveShadow = true;
  bank.add(cellMesh);

  // two diagonal outriggers down to the mast, so the wide bank is braced
  const fromBank = (x, y, z) =>
    new THREE.Vector3(x, y, z).applyEuler(bank.rotation).add(bank.position);
  for (const ox of [-2.55, 2.55]) {
    const p = fromBank(ox, -0.92, -0.12);
    soT.push(tubeBetween(0, 1.0, 0, p.x, p.y, p.z, 0.04, 8));
  }

  // cable: junction box across the regolith and up to the airlock face
  const cabX = -10.95 - solarX;
  const cabZ = 1.4 - solarZ;
  const cablePts = [
    new THREE.Vector3(jx, 0.3, jz + 0.15),
    new THREE.Vector3(jx + 0.45, 0.11, jz + 0.35),
    new THREE.Vector3(jx + cabX * 0.35, 0.08, jz + cabZ * 0.28),
    new THREE.Vector3(jx + cabX * 0.7, 0.09, jz + cabZ * 0.6),
    new THREE.Vector3(cabX * 0.97, 0.72, cabZ * 0.95),
    new THREE.Vector3(cabX, 1.85, cabZ),
  ];
  const cableCurve = new THREE.CatmullRomCurve3(cablePts, false, 'catmullrom', 0.25);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 40, 0.028, 6, false);
  const cable = new THREE.Mesh(cableGeo, dark);
  cable.castShadow = true;
  cable.receiveShadow = true;
  solar.add(cable);
  for (const t of [0.16, 0.42, 0.66]) {
    const p = cableCurve.getPointAt(t);
    const clamp = new THREE.BoxGeometry(0.1, 0.12, 0.1);
    put(clamp, p.x, Math.max(0.06, p.y), p.z);
    soD.push(clamp);
  }
  // wall socket where the cable lands on the airlock annulus
  const socket = new THREE.BoxGeometry(0.14, 0.3, 0.22);
  put(socket, cabX + 0.02, 1.9, cabZ);
  soD.push(socket);

  const solarT = new THREE.Mesh(mergeParts(soT, 'solar-titanium'), stairMetal);
  solarT.castShadow = true;
  solarT.receiveShadow = true;
  solar.add(solarT);
  const solarD = new THREE.Mesh(mergeParts(soD, 'solar-graphite'), dark);
  solarD.castShadow = true;
  solarD.receiveShadow = true;
  solar.add(solarD);

  group.add(solar);

  // lights
  const spillLights = [];
  const spill = (x, y, z, tx, tz, intensity, angle = 0.5) => {
    const l = new THREE.SpotLight(0xffb26b, intensity, 11, angle, 0.92, 1.7);
    l.position.set(x, y, z);
    l.target.position.set(tx, 0.05, tz);
    group.add(l);
    group.add(l.target);
    spillLights.push(l);
  };
  spill(-1.35, CY + 0.25, 3.85, -1.2, 6.2, 8, 0.36);
  spill(AX - 2.0, ACY + 0.15, 2.5, AX - 2.5, 5.6, 5, 0.4);
  spill(3.3, CY + 0.2, 3.85, 3.3, 6.0, 7, 0.34);

  return {
    root,
    group,
    solar,
    materials: { solar: solarMat, ceramic, titanium, dark },
    spillLights,
    spill,
    beacon,
  };
}


