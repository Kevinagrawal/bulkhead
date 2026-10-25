import {
  makeCanvas,
  normalFromHeight,
  fbm2,
  noise2,
  ridge2,
  mulberry32,
  smoothstep,
  clamp01,
} from './procedural.js';

/** Periodic value noise, so canvas tiles seamlessly. */
function pnoise2(x, y, per) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const h = (a, b) => {
    a = ((a % per) + per) % per;
    b = ((b % per) + per) % per;
    let n = a * 374761393 + b * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    n = n ^ (n >> 16);
    return ((n >>> 0) % 100000) / 100000;
  };
  const a = h(xi, yi);
  const b = h(xi + 1, yi);
  const c = h(xi, yi + 1);
  const d = h(xi + 1, yi + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

function pfbm(u, v, freq, oct = 4, gain = 0.5) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = freq;
  for (let i = 0; i < oct; i++) {
    sum += amp * pnoise2(u * f + 3.1, v * f - 7.3, f);
    norm += amp;
    amp *= gain;
    f *= 2;
  }
  return sum / norm;
}

function heightCanvasFrom(size, fn) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const val = clamp01(fn(x / size, y / size)) * 255;
      img.data[i] = val;
      img.data[i + 1] = val;
      img.data[i + 2] = val;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function regolithAlbedoCanvas(size = 512) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const rnd = mulberry32(90210);
  const craters = [];
  for (let i = 0; i < 26; i++) {
    craters.push({
      x: rnd(),
      y: rnd(),
      r: 0.006 + Math.pow(rnd(), 3) * 0.10,
      d: 0.5 + rnd() * 0.5,
    });
  }
  // BASE * tone lands the canvas between roughly 62 and 84 grey: a mid-grey
  // regolith that still reads as rock under the hard sun, not snow.
  const BASE = 104;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const macro = pfbm(u, v, 3, 4);
      const mid = pfbm(u + 5.7, v + 1.3, 11, 3);
      const grain = pfbm(u + 9.1, v + 8.8, 40, 2, 0.55);
      const patch = pfbm(u + 2.4, v + 6.6, 2, 2);
      // broad mottling + mid blotches + fine gravel, all at readable amplitude
      let tone =
        0.715 + (macro - 0.5) * 0.17 + (mid - 0.5) * 0.12 + (grain - 0.5) * 0.05;
      // subtle darker patches, the grey maria the earlier pass had
      tone -= smoothstep(0.52, 0.9, patch) * 0.085;
      // soft craters with faint bright rims
      for (const cr of craters) {
        const dx = Math.min(Math.abs(u - cr.x), 1 - Math.abs(u - cr.x));
        const dy = Math.min(Math.abs(v - cr.y), 1 - Math.abs(v - cr.y));
        const dist = Math.hypot(dx, dy) / cr.r;
        if (dist < 2.4) {
          const bowl = smoothstep(1.0, 0.35, dist);
          const rim = Math.exp(-Math.pow((dist - 1.02) / 0.16, 2)) * 0.55;
          tone -= bowl * 0.05 * cr.d;
          tone += rim * 0.028 * cr.d;
        }
      }
      // dither so the flat mid-greys do not band
      const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const dither = (hash - Math.floor(hash) - 0.5) * 1.7;
      const r = Math.max(0, Math.min(255, BASE * tone + dither));
      const g = r * 0.994;
      const b = r * 0.986;
      const i = (y * size + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function regolithHeightCanvas(size = 512) {
  return heightCanvasFrom(size, (u, v) => {
    const macro = pfbm(u, v, 4, 4);
    const mid = pfbm(u + 3.2, v + 7.5, 16, 3);
    const grain = pfbm(u + 1.1, v + 4.4, 64, 2, 0.55);
    return 0.45 + (macro - 0.5) * 0.5 + (mid - 0.5) * 0.32 + (grain - 0.5) * 0.22;
  });
}

export function regolithRoughCanvas(size = 256) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = pfbm(u + 4.4, v + 2.9, 8, 3);
      // almost fully rough: a polished ground catches the env sheen and reads white
      const val = 236 + (n - 0.5) * 24;
      const i = (y * size + x) * 4;
      img.data[i] = val;
      img.data[i + 1] = val;
      img.data[i + 2] = val;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function regolithNormalCanvas(size = 512) {
  // combine three frequencies so the single normal map carries close detail:
  // broad soft undulation, embedded stone relief and a little grain (kept low
  // contrast: a hard micro normal reads as glittering snow at 5-15 m)
  const h = heightCanvasFrom(size, (u, v) => {
    const a = pfbm(u, v, 6, 4);
    const b = pfbm(u + 2.3, v + 9.4, 26, 3, 0.55);
    const c = pfbm(u + 7.1, v + 3.8, 48, 2, 0.4);
    return 0.5 + (a - 0.5) * 0.5 + (b - 0.5) * 0.36 + (c - 0.5) * 0.07;
  });
  return normalFromHeight(h, 2.9);
}

export function makeRegolithMaps() {
  return {
    albedo: regolithAlbedoCanvas(512),
    normal: regolithNormalCanvas(512),
    rough: regolithRoughCanvas(256),
  };
}






