import * as THREE from 'three';
import { terrainHeight, terrainNormal } from './terrain.js';
import { mulberry32, fbm2, noise2 } from '../textures/procedural.js';
import { HABITAT_YAW } from '../core/state.js';

const COS = Math.cos(HABITAT_YAW);
const SIN = Math.sin(HABITAT_YAW);

function toLocal(x, z) {
  return [x * COS - z * SIN, x * SIN + z * COS];
}

function rockGeometry(seed, detail = 3, squash = 0.72) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  const rnd = mulberry32(seed);
  const off = rnd() * 40;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const r = 1 + (fbm2(x * 1.35 + off, z * 1.4 - off, 3) - 0.5) * 0.6;
    const r2 = 1 + (noise2(y * 2.8 + off, x * 2.4) - 0.5) * 0.22;
    x *= r * r2;
    y *= r * r2;
    z *= r * r2;
    y = Math.max(y, -0.58);
    y *= squash;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

export function createProps(tex) {
  const group = new THREE.Group();
  group.name = 'props';
  const rnd = mulberry32(60412);

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x3b3935,
    roughness: 0.96,
    metalness: 0.02,
    flatShading: false,
    envMapIntensity: 0.16,
  });

  const variants = [rockGeometry(11, 3, 0.7), rockGeometry(37, 3, 0.62), rockGeometry(73, 2, 0.78)];
  const bigs = [[], [], []];
  const used = [];
  let attempts = 0;
  while (used.length < 34 && attempts < 700) {
    attempts++;
    const a = rnd() * Math.PI * 2;
    const r = 14 + Math.pow(rnd(), 0.65) * 88;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const [lx, lz] = toLocal(x, z);
    // keep the pad and the walking corridor clear
    if (Math.abs(lx) < 15 && lz > -10 && lz < 9) continue;
    if (lx > -28 && lx < -7 && lz > 3 && lz < 16) continue;
    data_ok: {
      for (const u of used) {
        if (Math.hypot(u.x - x, u.z - z) < 5.5) break data_ok;
      }
      used.push({ x, z });
      const s = 0.55 + Math.pow(rnd(), 2.1) * 2.2;
      const v = Math.floor(rnd() * 3);
      bigs[v].push({
        x,
        z,
        s,
        y: terrainHeight(x, z) - s * 0.28,
        ry: rnd() * Math.PI * 2,
        rx: (rnd() - 0.5) * 0.25,
        rz: (rnd() - 0.5) * 0.25,
        sy: 0.65 + rnd() * 0.5,
        sx: 0.8 + rnd() * 0.45,
        tint: 0.60 + rnd() * 0.28,
      });
    }
  }

  // hero framing boulders: one low in the near-left corner, one low-right
  // boulder clusters in the mid-ground
  for (const [ccx, ccz] of [[20, 6], [-26, 2], [40, -28], [-38, -20]]) {
    for (let k = 0; k < 12; k++) {
      const a = rnd() * Math.PI * 2;
      const r = 3 + rnd() * 9;
      const x = ccx + Math.cos(a) * r;
      const z = ccz + Math.sin(a) * r;
      const [lx, lz] = toLocal(x, z);
      if (Math.abs(lx) < 14 && lz > -8 && lz < 6) continue;
      const s = 0.4 + Math.pow(rnd(), 1.7) * 1.8;
      bigs[Math.floor(rnd() * 3)].push({
        x, z, s, y: terrainHeight(x, z) - s * 0.3,
        ry: rnd() * 6.2, rx: (rnd() - 0.5) * 0.2, rz: (rnd() - 0.5) * 0.2,
        sy: 0.7 + rnd() * 0.4, sx: 0.9 + rnd() * 0.3, tint: 0.5 + rnd() * 0.3,
      });
    }
  }

  const heroes = [
    { x: 6.8, z: 17.2, s: 2.3, v: 1, tint: 0.42, sx: 1.6, sy: 0.7, ry: 0.6 },
    { x: 7.2, z: 21.4, s: 1.35, v: 0, tint: 0.5 },
    { x: 22.0, z: 3.5, s: 2.1, v: 2, tint: 0.62 },
    { x: -19.0, z: 14.5, s: 1.7, v: 0, tint: 0.5 },
  ];
  for (const h of heroes) {
    h.y = terrainHeight(h.x, h.z) - h.s * 0.34;
    h.ry = h.ry ?? h.x * 0.3;
    h.rx = 0.08;
    h.rz = -0.05;
    h.sx = h.sx ?? 1.15;
    h.sy = h.sy ?? 0.72;
    bigs[h.v].push(h);
  }

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  bigs.forEach((list, vi) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(variants[vi], rockMat, list.length);
    list.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(b.rx || 0, b.ry || 0, b.rz || 0);
      dummy.scale.set(b.s * (b.sx || 1), b.s * (b.sy || 0.85), b.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.setRGB(b.tint, b.tint * 0.98, b.tint * 0.93);
      mesh.setColorAt(i, color);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  });

  // pebbles: dense near the camera, thinning out
  const pebbleGeo = new THREE.IcosahedronGeometry(1, 0);
  {
    const p = pebbleGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setXYZ(i, p.getX(i) * (0.7 + rnd() * 0.5), p.getY(i) * (0.5 + rnd() * 0.4), p.getZ(i) * (0.7 + rnd() * 0.5));
    }
    pebbleGeo.computeVertexNormals();
  }
  const pebbleMat = new THREE.MeshStandardMaterial({
    color: 0x3b3935,
    roughness: 0.96,
    metalness: 0.02,
    flatShading: true,
    envMapIntensity: 0.16,
  });
  // boot path from the low-left foreground to the airlock steps
  const pathPts = [
    new THREE.Vector3(-16.5, 0, 25.5),
    new THREE.Vector3(-14.6, 0, 21.0),
    new THREE.Vector3(-12.6, 0, 17.0),
    new THREE.Vector3(-10.9, 0, 13.0),
    new THREE.Vector3(-9.8, 0, 9.5),
    new THREE.Vector3(-9.9, 0, 6.4),
  ];
  const curve = new THREE.CatmullRomCurve3(pathPts, false, 'catmullrom', 0.4);

  const pebbleCount = 1700;
  const pathPebbleCount = 320;
  // three smooth, shadowed foreground boulders that frame the left edge
  const smoothRockMat = new THREE.MeshStandardMaterial({
    color: 0x33312d,
    roughness: 0.94,
    metalness: 0.02,
    envMapIntensity: 0.15,
  });
  const fgRocks = [
    { x: -14.8, z: 11.5, s: 2.8, sy: 1.0, sx: 1.15, v: 0 },
    { x: -13.6, z: 12.8, s: 2.2, sy: 1.05, sx: 1.0, v: 1 },
    { x: -15.9, z: 13.1, s: 2.5, sy: 1.0, sx: 1.1, v: 2 },
  ];
  for (const fr of fgRocks) {
    const m = new THREE.Mesh(variants[fr.v], smoothRockMat);
    m.position.set(fr.x, terrainHeight(fr.x, fr.z) - fr.s * 0.38, fr.z);
    m.rotation.set(0.06, fr.x * 0.4, -0.04);
    m.scale.set(fr.s * fr.sx, fr.s * fr.sy, fr.s);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }

  const pebbles = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebbleCount + pathPebbleCount);
  let pi = 0;
  while (pi < pebbleCount) {
    const a = rnd() * Math.PI * 2;
    const rad = 16 + Math.pow(rnd(), 0.55) * 34;
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad + 6;
    const [lx, lz] = toLocal(x, z);
    if (Math.abs(lx) < 12.5 && lz > -7.5 && lz < 8.2) continue;
    if (lx > -28 && lx < -10 && lz > 3 && lz < 15 && rnd() < 0.7) continue;
    const s = 0.04 + Math.pow(rnd(), 2.0) * 0.31;
    dummy.position.set(x, terrainHeight(x, z) - s * 0.3, z);
    dummy.rotation.set(rnd() * 3.1, rnd() * 6.2, rnd() * 3.1);
    dummy.scale.set(s * (0.8 + rnd() * 0.7), s * (0.5 + rnd() * 0.5), s * (0.8 + rnd() * 0.6));
    dummy.updateMatrix();
    pebbles.setMatrixAt(pi, dummy.matrix);
    const t = 0.48 + rnd() * 0.3;
    color.setRGB(t, t * 0.985, t * 0.94);
    pebbles.setColorAt(pi, color);
    pi++;
  }
  // embedded gravel along the boot path and around the pad rim: this is what
  // makes the ground read as regolith at 5-15 m instead of a smooth surface
  {
    let guard = 0;
    while (pi < pebbleCount + pathPebbleCount && guard < 8000) {
      guard++;
      let x;
      let z;
      if (rnd() < 0.62) {
        const t = 0.04 + rnd() * 0.94;
        const p = curve.getPoint(t);
        const tan = curve.getTangent(t);
        const side = rnd() < 0.5 ? -1 : 1;
        const off = (0.5 + Math.pow(rnd(), 1.7) * 1.6) * side;
        x = p.x - tan.z * off + (rnd() - 0.5) * 0.6;
        z = p.z + tan.x * off + (rnd() - 0.5) * 0.6;
      } else {
        const a = rnd() * Math.PI * 2;
        const r = 11.8 + Math.pow(rnd(), 0.85) * 5.2;
        x = Math.cos(a) * r - 2.0;
        z = Math.sin(a) * r * 0.82 + 1.0;
        const [lx, lz] = toLocal(x, z);
        if (Math.abs(lx) < 12.4 && lz > -7.4 && lz < 8.1) continue;
      }
      const s = 0.045 + Math.pow(rnd(), 2.2) * 0.2;
      dummy.position.set(x, terrainHeight(x, z) - s * 0.45, z);
      dummy.rotation.set(rnd() * 3.1, rnd() * 6.2, rnd() * 3.1);
      dummy.scale.set(s * (0.85 + rnd() * 0.6), s * (0.45 + rnd() * 0.45), s * (0.85 + rnd() * 0.5));
      dummy.updateMatrix();
      pebbles.setMatrixAt(pi, dummy.matrix);
      const t = 0.44 + rnd() * 0.3;
      color.setRGB(t, t * 0.985, t * 0.945);
      pebbles.setColorAt(pi, color);
      pi++;
    }
  }

  pebbles.castShadow = true;
  pebbles.receiveShadow = true;
  group.add(pebbles);



  // boot path mesh follows the same curve the gravel is scattered along
  const N = 36;
  const width = 0.95;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const nx = -tan.z;
    const nz = tan.x;
    const w = width * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
    for (const s of [-1, 1]) {
      const x = p.x + nx * w * 0.5 * s;
      const z = p.z + nz * w * 0.5 * s;
      positions.push(x, terrainHeight(x, z) + 0.035, z);
      uvs.push(s < 0 ? 0 : 1, t);
    }
    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const pathGeo = new THREE.BufferGeometry();
  pathGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  pathGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  pathGeo.setIndex(indices);
  pathGeo.computeVertexNormals();
  const pathMat = new THREE.MeshStandardMaterial({
    map: tex.path,
    transparent: true,
    depthWrite: false,
    roughness: 1.0,
    metalness: 0,
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    envMapIntensity: 0.1,
  });
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.renderOrder = 2;
  path.receiveShadow = true;
  group.add(path);

  // landing-blast radial scuff under the habitat
  const blast = new THREE.Mesh(
    new THREE.CircleGeometry(26, 96),
    new THREE.MeshStandardMaterial({
      map: tex.blast,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
      roughness: 1,
      metalness: 0,
      color: 0xffffff,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      envMapIntensity: 0.05,
    })
  );
  blast.rotation.x = -Math.PI / 2;
  blast.position.set(-2, 0.028, 0.5);
  blast.renderOrder = 1;
  group.add(blast);

  // soft contact/AO ellipse under the habitat footprint
  const ao = document.createElement('canvas');
  ao.width = 512;
  ao.height = 256;
  {
    const ctx = ao.getContext('2d');
    const g = ctx.createRadialGradient(256, 128, 8, 256, 128, 250);
    g.addColorStop(0, 'rgba(0,0,0,0.62)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.42)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
  }
  const aoTex = new THREE.CanvasTexture(ao);
  const aoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 13),
    new THREE.MeshBasicMaterial({
      map: aoTex,
      transparent: true,
      depthWrite: false,
      opacity: 1.0,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      toneMapped: false,
    })
  );
  aoMesh.rotation.x = -Math.PI / 2;
  aoMesh.position.set(-3.0, 0.05, 1.2);
  aoMesh.renderOrder = 4;
  group.add(aoMesh);

  // sparse glass-bead glints near the lens
  const glintCount = 160;
  const gPos = new Float32Array(glintCount * 3);
  const gSize = new Float32Array(glintCount);
  for (let i = 0; i < glintCount; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 3 + Math.pow(rnd(), 0.7) * 32;
    const x = -6 + Math.cos(a) * r;
    const z = 3 + Math.sin(a) * r;
    gPos[i * 3] = x;
    gPos[i * 3 + 1] = terrainHeight(x, z) + 0.015;
    gPos[i * 3 + 2] = z;
    gSize[i] = 0.6 + rnd() * 1.8;
  }
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
  gGeo.setAttribute('aSize', new THREE.BufferAttribute(gSize, 1));
  const glintMat = new THREE.ShaderMaterial({
    uniforms: { uDPR: { value: Math.min(window.devicePixelRatio || 1, 2) } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      uniform float uDPR;
      varying float vFade;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFade = smoothstep(52.0, 9.0, -mv.z);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uDPR * smoothstep(52.0, 6.0, -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * 0.14 * vFade;
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.82) * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glints = new THREE.Points(gGeo, glintMat);
  glints.renderOrder = 3;
  group.add(glints);

  return { group, path, blast, glints, pebbles };
}




















