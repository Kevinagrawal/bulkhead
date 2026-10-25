import * as THREE from 'three';
import { fbm2, ridge2, noise2, smoothstep, clamp01 } from '../textures/procedural.js';
import { HABITAT_YAW } from '../core/state.js';
import { mergeParts } from './merge.js';
import { mulberry32 } from '../textures/procedural.js';

const COS = Math.cos(HABITAT_YAW);
const SIN = Math.sin(HABITAT_YAW);

function toLocal(x, z) {
  return [x * COS - z * SIN, x * SIN + z * COS];
}

function toWorld(lx, lz) {
  return [lx * COS + lz * SIN, -lx * SIN + lz * COS];
}

function crater(x, z, cx, cz, R, depth, rimH, rimW = 0.14) {
  const d = Math.hypot(x - cx, z - cz) / R;
  if (d > 2.2) return 0;
  const ang = Math.atan2(z - cz, x - cx);
  const mod = (0.5 + 0.95 * noise2(ang * 2.1 + cx * 0.02, cz * 0.017)) * (0.9 + 0.1 * noise2(ang * 11.0 + cx * 0.05, cz * 0.03));
  const bowl = smoothstep(1.05, 0.35, d) * depth;
  const rim = Math.exp(-Math.pow((d - 1.02) / rimW, 2)) * rimH * mod;
  return rim - bowl;
}

function baseHeight(x, z) {
  let h = 0;
  // macro landforms only: no 5-20 m dune oscillation
  h += (fbm2(x * 0.0052 + 11.3, z * 0.0052 - 4.1, 4) - 0.5) * 2.2;
  h += (ridge2(x * 0.0021 + 3.7, z * 0.0021 + 9.2, 4) - 0.5) * 2.8;
  // fine scale comes from normal/pebbles, not height waves
  // long crater rim behind the habitat, visible as the horizon ridge
  h += crater(x, z, 128, -88, 88, 4.0, 7.2, 0.13);
  h += crater(x, z, 70, -238, 168, 9.0, 8.0, 0.2);
  h += crater(x, z, -158, -152, 126, 8.0, 7.6, 0.18);
  // shallow bowls to camera-right and camera-left
  h += crater(x, z, 46, -14, 34, 1.6, 0.75, 0.24);
  h += crater(x, z, -66, 6, 31, 1.7, 0.9, 0.22);
  h += crater(x, z, 41, 34, 12, 0.55, 0.3, 0.3);
  h += crater(x, z, -18, -31, 7, 0.28, 0.16, 0.35);
  h += crater(x, z, 2, 16, 5.4, 0.6, 0.3, 0.3);
  h += crater(x, z, 10, 18, 3.2, 0.3, 0.24, 0.28);
  h += crater(x, z, 18, 10, 4.1, 0.34, 0.26, 0.28);
  h += crater(x, z, -14, 13, 2.6, 0.22, 0.18, 0.3);
  h += crater(x, z, -2, 20, 3.6, 0.28, 0.2, 0.28);
  return h;
}

/** Terrain height in world metres. Deterministic and cheap enough for scatter. */
export function terrainHeight(x, z) {
  const [lx, lz] = toLocal(x, z);
  // rounded-rectangle apron under the habitat
  const dx = Math.max(Math.abs(lx) - 11.5, 0);
  const dz = Math.max(lz + 2.2, 0, -lz - 6.0);
  const dOut = Math.hypot(dx, dz);
  const flat = 1 - smoothstep(0, 11.5, dOut);
  const base = baseHeight(x, z);

  // rear bank: the pressure hull is half-buried on its far side
  const rear = smoothstep(-1.4, -4.6, lz) * (1 - smoothstep(-7.6, -12.5, lz));
  const nearBank = smoothstep(2.2, 4.0, lz) * (1 - smoothstep(4.6, 8.0, lz)) * 1.05;
  const shoulders = smoothstep(9.5, 12.0, Math.abs(lx)) * smoothstep(-1.0, -4.0, lz) * 0.6;
  const bermN = 0.62 + noise2(lx * 0.32 + 4.2, lz * 0.32 - 1.4) * 0.62;
  const berm = (rear * 1.55 + nearBank + shoulders) * bermN;

  let h = base * (1 - flat) + flat * 0.02;
  h += berm * (0.55 + 0.45 * (1 - flat));
  // no high-frequency height ripples: fine detail lives in the normal map only
  return h;
}

export function terrainNormal(x, z, eps = 0.6) {
  const hL = terrainHeight(x - eps, z);
  const hR = terrainHeight(x + eps, z);
  const hD = terrainHeight(x, z - eps);
  const hU = terrainHeight(x, z + eps);
  const n = new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize();
  return n;
}

function buildGradedPlane(size = 500, segments = 360) {
  const count = segments + 1;
  const coords = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = (i / segments) * 2 - 1;
    const a = Math.abs(t);
    const s = Math.sign(t) || 1;
    coords[i] = s * size * (0.24 * a + 0.76 * Math.pow(a, 4.6));
  }
  const positions = new Float32Array(count * count * 3);
  const uvs = new Float32Array(count * count * 2);
  const colors = new Float32Array(count * count * 3);
  let p = 0;
  let u = 0;
  let c = 0;
  for (let j = 0; j < count; j++) {
    const z = coords[j];
    for (let i = 0; i < count; i++) {
      const x = coords[i];
      const h = terrainHeight(x, z);
      positions[p++] = x;
      positions[p++] = h;
      positions[p++] = z;
      uvs[u++] = x * 0.031;
      uvs[u++] = z * 0.031;
      const macro = fbm2(x * 0.012 + 3.3, z * 0.012 - 8.1, 4);
      const fine = fbm2(x * 0.052 + 1.7, z * 0.052 + 4.2, 3);
      // broad tonal variation only; the map carries the fine mottling
      const tone = 0.84 + (macro - 0.5) * 0.18 + (fine - 0.5) * 0.07;
      colors[c++] = tone;
      colors[c++] = tone * 0.996;
      colors[c++] = tone * 0.988;
    }
  }
  const indices = [];
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * count + i;
      const b = a + 1;
      const d = a + count;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildFarRing(inner = 470, outer = 4200, radial = 26, angular = 160) {
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];
  for (let r = 0; r <= radial; r++) {
    const t = r / radial;
    const radius = inner * Math.pow(outer / inner, t);
    for (let a = 0; a <= angular; a++) {
      const ang = (a / angular) * Math.PI * 2;
      const x = Math.cos(ang) * radius;
      const z = Math.sin(ang) * radius;
      const h = terrainHeight(x, z) - 0.18;
      positions.push(x, h, z);
      uvs.push(x * 0.031, z * 0.031);
      const tone = 0.8 + (fbm2(x * 0.01, z * 0.01, 2) - 0.5) * 0.18;
      colors.push(tone, tone * 0.996, tone * 0.988);
    }
  }
  const stride = angular + 1;
  for (let r = 0; r < radial; r++) {
    for (let a = 0; a < angular; a++) {
      const i0 = r * stride + a;
      const i1 = i0 + 1;
      const i2 = i0 + stride;
      const i3 = i2 + 1;
      indices.push(i0, i1, i2, i1, i3, i2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createTerrain(maps) {
  const albedo = new THREE.CanvasTexture(maps.albedo);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
  albedo.anisotropy = 8;
  albedo.repeat.set(1, 1);

  const normal = new THREE.CanvasTexture(maps.normal);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(9, 9);
  normal.anisotropy = 8;

  const rough = new THREE.CanvasTexture(maps.rough);
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  rough.repeat.set(0.7, 0.7);

  const material = new THREE.MeshStandardMaterial({
    map: albedo,
    normalMap: normal,
    roughnessMap: rough,
    vertexColors: true,
    // the albedo map owns the tone; the material must not tint it a second time
    color: 0xffffff,
    roughness: 1.0,
    metalness: 0.0,
    // grazing Fresnel off the bright env hemisphere is what blew the far
    // ground out to white; keep a quarter of it
    envMapIntensity: 0.3,
    normalScale: new THREE.Vector2(0.62, 0.62),
    dithering: true,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        #include <map_fragment>
        vec3 macroA = texture2D(map, vWPos.xz * 0.0031 + vec2(0.17, 0.63)).rgb;
        vec3 midA = texture2D(map, vWPos.xz * 0.041 + vec2(0.41, 0.12)).rgb;
        vec3 fineA = texture2D(map, vWPos.xz * 0.55 + vec2(0.73, 0.29)).rgb;
        diffuseColor.rgb *= 0.72 + macroA.g * 4.6;
        diffuseColor.rgb *= 0.84 + midA.g * 2.0;
        diffuseColor.rgb *= 0.92 + fineA.g * 1.35;
        `
      );
  };

  const group = new THREE.Group();
  group.name = 'terrain';

  const inner = new THREE.Mesh(buildGradedPlane(500, 360), material);
  inner.receiveShadow = true;
  inner.castShadow = false;
  inner.name = 'terrain-inner';
  group.add(inner);

  const farMat = material.clone();
  farMat.vertexColors = true;
  farMat.map = albedo.clone();
  farMat.map.repeat.set(1, 1);
  farMat.map.needsUpdate = true;
  const far = new THREE.Mesh(buildFarRing(470, 4200, 24, 160), farMat);
  far.receiveShadow = false;
  far.castShadow = false;
  far.name = 'terrain-far';
  group.add(far);

  return { group, material, farMaterial: farMat };
}











/** Sculpted near-side regolith berm that the hull settles into. */
export function createBerm(material) {
  const NX = 60;
  const NW = 14;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= NX; i++) {
    const x = -6.3 + (12.6 * i) / NX;
    const edge = Math.min(x + 6.3, 6.3 - x);
    const taper = smoothstep(0, 1.6, edge);
    const crest =
      (0.62 + 0.26 * noise2(x * 0.55 + 3.1, 1.7) + 0.1 * Math.sin(x * 1.25 + 0.4)) *
        (0.35 + 0.65 * taper) +
      0.06;
    const zc = 2.45 + 0.16 * Math.sin(x * 0.33 + 1.2);
    for (let j = 0; j <= NW; j++) {
      const t = -1 + (2 * j) / NW;
      const y = crest * Math.pow(Math.max(0, 1 - t * t), 1.25);
      const z = zc + t * 1.45;
      positions.push(x, y, z);
      uvs.push(x * 0.031, z * 0.031);
    }
  }
  const stride = NW + 1;
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NW; j++) {
      const a = i * stride + j;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  // the berm has no vertex-colour attribute: match the mean terrain vertex tone
  // so it does not read as a brighter (or darker) patch at the hull base
  material.vertexColors = false;
  material.color.setHex(0x8a877f);
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.name = 'near-berm';

  const group = new THREE.Group();
  group.add(mesh);

  // embedded crest rocks
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x6f6b64,
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true,
  });
  const rocks = [];
  const rnd = mulberry32(5517);
  for (let i = 0; i < 10; i++) {
    const x = -5.6 + i * 1.22 + (rnd() - 0.5) * 0.4;
    const s = 0.16 + rnd() * 0.3;
    const g = rockGeo.clone();
    g.scale(s * (0.9 + rnd() * 0.5), s * (0.55 + rnd() * 0.4), s);
    g.rotateY(rnd() * 6.2);
    g.translate(x, 0.5 + rnd() * 0.25, 2.5 + (rnd() - 0.5) * 0.9);
    rocks.push(g);
  }
  const rockMerge = mergeParts(rocks, 'berm-rocks');
  if (rockMerge) {
    const rm = new THREE.Mesh(rockMerge, rockMat);
    rm.castShadow = true;
    rm.receiveShadow = true;
    group.add(rm);
  }

  // soft dark contact band at the outer base
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const band = new THREE.Mesh(
    new THREE.PlaneGeometry(13.2, 1.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.7 })
  );
  band.rotation.x = -Math.PI / 2;
  band.position.set(0, 0.035, 3.85);
  band.renderOrder = 3;
  group.add(band);

  return group;
}





