import * as THREE from 'three';
import { mulberry32, fbm2, noise2, smoothstep, clamp01 } from '../textures/procedural.js';

function skyCanvas(w = 2048, h = 1024) {
  // Low-res nebula field, upscaled, plus crisp 2D stars: keeps load time sane.
  const bw = 1024;
  const bh = 512;
  const base = document.createElement('canvas');
  base.width = bw;
  base.height = bh;
  const bctx = base.getContext('2d');
  const img = bctx.createImageData(bw, bh);
  const rnd = mulberry32(44017);
  for (let y = 0; y < bh; y++) {
    const v = y / bh;
    for (let x = 0; x < bw; x++) {
      const u = x / bw;
      let r = 0.6;
      let g = 0.8;
      let b = 2.2;
      const bandY = 0.5 + Math.sin(u * Math.PI * 2 + 0.6) * 0.11;
      const dBand = Math.abs(v - bandY) / 0.135;
      if (dBand < 1.6) {
        const n = fbm2(u * 11 + 4.2, v * 26 - 1.7, 4);
        const dust = fbm2(u * 22 - 3.1, v * 44 + 8.2, 3);
        const core = Math.exp(-Math.pow(dBand, 2) * 1.35);
        const streak = Math.pow(clamp01(n * 1.2 - 0.22), 1.6);
        let lum = core * streak * (0.55 + dust * 0.9);
        lum *= 1 - smoothstep(0.6, 0.95, dust) * 0.55;
        r += lum * 6.0;
        g += lum * 6.6;
        b += lum * 9.0;
      }
      if (y > bh * 0.86) {
        const lift = smoothstep(bh * 0.86, bh, y);
        r += lift * 2.0;
        g += lift * 2.4;
        b += lift * 3.4;
      }
      const i = (y * bw + x) * 4;
      img.data[i] = Math.min(255, r);
      img.data[i + 1] = Math.min(255, g);
      img.data[i + 2] = Math.min(255, b);
      img.data[i + 3] = 255;
    }
  }
  bctx.putImageData(img, 0, 0);

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(base, 0, 0, w, h);
  return c;
}

function earthTexture(w = 512, h = 256) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const land = fbm2(u * 4.2 + 2.1, v * 3.6 + 7.4, 5);
      const cloud = fbm2(u * 9.5 - 4.4, v * 8.2 + 1.3, 4);
      const isLand = land > 0.52;
      let r = isLand ? 96 : 18;
      let g = isLand ? 88 : 38;
      let b = isLand ? 70 : 74;
      if (cloud > 0.52) {
        const k = smoothstep(0.52, 0.72, cloud) * 0.85;
        r = r * (1 - k) + 225 * k;
        g = g * (1 - k) + 231 * k;
        b = b * (1 - k) + 238 * k;
      }
      const ice = smoothstep(0.86, 1.0, Math.abs(v - 0.5) * 2);
      r = r * (1 - ice * 0.8) + 236 * ice * 0.8;
      g = g * (1 - ice * 0.8) + 242 * ice * 0.8;
      b = b * (1 - ice * 0.8) + 248 * ice * 0.8;
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function haloTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(178,204,235,0.55)');
  g.addColorStop(0.28, 'rgba(150,182,220,0.20)');
  g.addColorStop(0.62, 'rgba(120,150,190,0.045)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

function starField() {
  const count = 4200;
  const rnd = mulberry32(90125);
  const pos = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const bright = new Float32Array(count);
  const R = 5200;
  for (let i = 0; i < count; i++) {
    let y = rnd() * 2 - 1;
    y = Math.abs(y) * 0.98 + 0.02;
    const phi = Math.acos(y);
    const theta = rnd() * Math.PI * 2;
    const sx = Math.sin(phi) * Math.cos(theta);
    const sy = Math.cos(phi);
    const sz = Math.sin(phi) * Math.sin(theta);
    pos[i * 3] = sx * R;
    pos[i * 3 + 1] = sy * R;
    pos[i * 3 + 2] = sz * R;
    const cls = rnd();
    const warm = rnd();
    let b;
    if (cls > 0.9) b = 0.70;
    else if (cls > 0.55) b = 0.52 + rnd() * 0.1;
    else b = 0.34 + rnd() * 0.12;
    bright[i] = b;
    size[i] = cls > 0.9 ? 1.6 : cls > 0.55 ? 1.25 : 1.0;
    const cr = warm > 0.86 ? 1.0 : 0.82;
    const cg = warm > 0.86 ? 0.9 : 0.89;
    const cb = warm > 0.86 ? 0.74 : 1.0;
    color[i * 3] = cr;
    color[i * 3 + 1] = cg;
    color[i * 3 + 2] = cb;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uDPR: { value: Math.min(window.devicePixelRatio || 1, 2) } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aBright;
      varying vec3 vColor;
      varying float vB;
      uniform float uDPR;
      void main() {
        vColor = aColor;
        vB = aBright;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uDPR;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vB;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float a = smoothstep(0.5, 0.06, d);
        gl_FragColor = vec4(vColor * vB, a * vB);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = -8;
  return pts;
}

function ridgeLayer({ radius, baseY, amp, color, seed, blend = 0.0 }) {
  const segs = 220;
  const positions = [];
  const colors = [];
  const indices = [];
  const cTop = new THREE.Color(color).multiplyScalar(1.0);
  const cBot = new THREE.Color(color).multiplyScalar(0.42);
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const h =
      baseY +
      (fbm2(i * 0.032 + seed, seed * 0.7, 4) - 0.2) * amp +
      Math.pow(Math.abs(Math.sin(a * 3.1 + seed)), 2.2) * amp * 0.26;
    positions.push(x, h, z);
    positions.push(x, baseY - 40, z);
    colors.push(cTop.r, cTop.g, cTop.b, cBot.r, cBot.g, cBot.b);
    if (i > 0) {
      const i0 = (i - 1) * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;
      indices.push(i0, i2, i1, i1, i2, i3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -5;
  mesh.frustumCulled = false;
  return mesh;
}

export function createSky(sunDir) {
  const group = new THREE.Group();
  group.name = 'sky';

  const tex = new THREE.CanvasTexture(skyCanvas(2048, 1024));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(5600, 64, 40),
    new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    })
  );
  sphere.rotation.y = 2.1;
  sphere.rotation.z = 0.18;
  sphere.renderOrder = -10;
  sphere.frustumCulled = false;
  group.add(sphere);

  const stars = starField();
  group.add(stars);

  // Earth: small, pale, gibbous, with a restrained halo
  const earthGeo = new THREE.SphereGeometry(26, 32, 24);
  const earthMat = new THREE.ShaderMaterial({
    uniforms: {
      uSun: { value: sunDir.clone().normalize() },
      uMap: { value: new THREE.CanvasTexture(earthTexture()) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      void main() {
        vUv = uv;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uSun;
      varying vec2 vUv;
      varying vec3 vN;
      void main() {
        vec3 c = texture2D(uMap, vUv).rgb;
        float lam = dot(normalize(vN), normalize(uSun));
        float lit = smoothstep(-0.12, 0.32, lam);
        c *= mix(vec3(0.008, 0.011, 0.016), vec3(0.86), lit);
        c += vec3(0.010, 0.020, 0.032) * (1.0 - lit);
        gl_FragColor = vec4(c, 1.0);
      }
    `,
    toneMapped: false,
  });
  const earthTex = earthMat.uniforms.uMap.value;
  earthTex.colorSpace = THREE.SRGBColorSpace;
  earthTex.needsUpdate = true;
  const earth = new THREE.Mesh(earthGeo, earthMat);
  earth.position.set(-15, 470, -2950);
  earth.renderOrder = -4;
  group.add(earth);

  const haloMat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(haloTexture()),
    color: 0x9fb8d8,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  const halo = new THREE.Sprite(haloMat);
  halo.position.copy(earth.position);
  halo.scale.setScalar(92);
  halo.renderOrder = -3;
  group.add(halo);

  // No ridge walls. They read as smooth artificial fins on the hero horizon.
  // The regolith's authored crater rim and the far ground ring carry the horizon.



  return { group, sphere, stars, earth, halo };
}









