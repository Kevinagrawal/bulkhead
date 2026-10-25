import {
  makeCanvas,
  normalFromHeight,
  mulberry32,
  smoothstep,
  clamp01,
  fbm2,
} from './procedural.js';

const MONO = '"IBM Plex Mono", "Consolas", monospace';

function grainOverlay(ctx, w, h, alpha, seed, scale = 1) {
  const rnd = mulberry32(seed);
  ctx.save();
  for (let i = 0; i < 5200 * scale; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = rnd() * 1.7 + 0.3;
    const light = rnd() > 0.55;
    ctx.fillStyle = light
      ? `rgba(255,250,240,${alpha * rnd()})`
      : `rgba(20,18,16,${alpha * rnd()})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function panelAlbedoCanvas(w = 1024, h = 512) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const rnd = mulberry32(7717);

  // clean warm-white ceramic: 92% flat, restrained plate tones
  ctx.fillStyle = '#dedfdd';
  ctx.fillRect(0, 0, w, h);

  const bands = [
    [0, 0, 340, 250, 0.012],
    [340, 0, 300, 210, -0.014],
    [640, 0, 384, 260, 0.009],
    [0, 250, 300, 262, -0.01],
    [300, 210, 340, 180, 0.013],
    [640, 260, 384, 252, -0.012],
  ];
  for (const [x, y, bw, bh, tone] of bands) {
    ctx.fillStyle = tone > 0 ? `rgba(245,243,238,${tone})` : `rgba(70,66,60,${-tone})`;
    ctx.fillRect(x, y, bw, bh);
  }

  // crisp 1-2px seam lines only
  for (const sx of [0, 300, 640, 980]) {
    ctx.fillStyle = 'rgba(36,34,31,0.72)';
    ctx.fillRect(sx, 0, 2, h);
    ctx.fillStyle = 'rgba(255,255,252,0.30)';
    ctx.fillRect(sx + 2, 0, 1, h);
  }
  for (const sy of [0, 250, 510]) {
    ctx.fillStyle = 'rgba(38,36,33,0.55)';
    ctx.fillRect(0, sy, w, 2);
    ctx.fillStyle = 'rgba(255,255,252,0.22)';
    ctx.fillRect(0, sy + 2, w, 1);
  }

  // very faint streaks hugging the seams
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const sx = [300, 640, 980][i % 3];
    const x = sx + (rnd() - 0.5) * 26;
    const y0 = 40 + rnd() * 260;
    const g = ctx.createLinearGradient(x, y0, x, y0 + 90);
    g.addColorStop(0, 'rgba(52,48,42,0.035)');
    g.addColorStop(1, 'rgba(52,48,42,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y0, 1.5 + rnd() * 3, 90);
  }
  ctx.restore();

  // barely-there mottling, no chips, no rivets, no stencils baked in
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = Math.sin(x * 0.011 + Math.sin(y * 0.009) * 1.4) * 1.1 + (rnd() - 0.5) * 1.4;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function cleanPanelNormalCanvas(w = 512, h = 256) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const rnd = mulberry32(3331);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);
  for (const sx of [0, 150, 320, 490]) {
    ctx.fillStyle = 'rgba(72,72,72,0.9)';
    ctx.fillRect(sx, 0, 1, h);
    ctx.fillStyle = 'rgba(148,148,148,0.5)';
    ctx.fillRect(sx + 1, 0, 1, h);
  }
  for (const sy of [0, 126, 255]) {
    ctx.fillStyle = 'rgba(72,72,72,0.7)';
    ctx.fillRect(0, sy, w, 1);
  }
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 6;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  return normalFromHeight(c, 0.5);
}

/**
 * Habitat ceramic. Off-white, mottled by broad kiln drift rather than grain:
 * one plate layout, crisp grey seams with a highlight lip, rivet rows and a
 * faint wash at the seams. Same seam layout as the shipped panel map so the
 * hull silhouette and panel rhythm do not change.
 */
export function ceramicAlbedoCanvas(w = 2048, h = 1024) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const rnd = mulberry32(9041);

  ctx.fillStyle = '#ddd9d0';
  ctx.fillRect(0, 0, w, h);

  const cols = [0, 600, 1280, 1960, w];
  const rows = [0, 500, 1020, h];

  // plate tones: +-4-6% around the base, never a flat white field
  for (let j = 0; j < rows.length - 1; j++) {
    for (let i = 0; i < cols.length - 1; i++) {
      const x = cols[i];
      const y = rows[j];
      const bw = cols[i + 1] - x;
      const bh = rows[j + 1] - y;
      const tone = (rnd() - 0.5) * 0.11;
      ctx.fillStyle = tone > 0 ? `rgba(248,245,238,${tone})` : `rgba(76,70,62,${-tone})`;
      ctx.fillRect(x, y, bw, bh);
      const g = ctx.createLinearGradient(x, y, x + bw, y + bh);
      g.addColorStop(0, 'rgba(255,252,246,0.030)');
      g.addColorStop(0.5, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(56,52,46,0.042)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, bw, bh);
    }
  }

  // broad, soft ceramic drift: low frequency, no visible speckle
  for (let i = 0; i < 110; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 70 + rnd() * 260;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rnd() > 0.5;
    const a = 0.015 + rnd() * 0.030;
    g.addColorStop(0, light ? `rgba(252,249,242,${a})` : `rgba(88,82,72,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // faint wash drifting down from the seams (dust settles in the groove)
  for (let i = 0; i < 34; i++) {
    const sx = cols[1 + (i % 3)];
    const x = sx + (rnd() - 0.5) * 30;
    const y0 = rnd() * h;
    const g = ctx.createLinearGradient(x, y0, x, y0 + 120);
    g.addColorStop(0, 'rgba(58,54,47,0.028)');
    g.addColorStop(1, 'rgba(58,54,47,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y0, 2 + rnd() * 5, 120);
  }

  const seamX = [0, 600, 1280, 1960];
  const seamY = [0, 500, 1020];
  // soft recess either side, then a grey groove and a light lip
  for (const x of seamX) {
    ctx.fillStyle = 'rgba(66,61,54,0.09)';
    ctx.fillRect(x - 5, 0, 10, h);
    ctx.fillStyle = 'rgba(58,54,49,0.50)';
    ctx.fillRect(x - 1, 0, 3, h);
    ctx.fillStyle = 'rgba(255,252,244,0.30)';
    ctx.fillRect(x + 2, 0, 1, h);
  }
  for (const y of seamY) {
    ctx.fillStyle = 'rgba(66,61,54,0.08)';
    ctx.fillRect(0, y - 5, w, 10);
    ctx.fillStyle = 'rgba(58,54,49,0.46)';
    ctx.fillRect(0, y - 1, w, 3);
    ctx.fillStyle = 'rgba(255,252,244,0.26)';
    ctx.fillRect(0, y + 2, w, 1);
  }

  // rivets, offset from the seam and spaced along it
  const rivet = (x, y) => {
    const r = 2.9;
    const g = ctx.createRadialGradient(x - 0.9, y - 1.1, 0.3, x, y, r);
    g.addColorStop(0, 'rgba(255,252,246,0.44)');
    g.addColorStop(0.5, 'rgba(198,192,182,0.26)');
    g.addColorStop(1, 'rgba(64,59,52,0.30)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const x of seamX) {
    for (const side of [-10, 10]) {
      for (let y = 26; y < h; y += 54) {
        rivet(x + side, y + (side > 0 ? 12 : 0));
      }
    }
  }
  for (const y of seamY) {
    for (const side of [-10, 10]) {
      for (let x = 26; x < w; x += 54) {
        rivet(x + (side > 0 ? 12 : 0), y + side);
      }
    }
  }

  // small stamped plate marks near the access end, subtle but readable
  ctx.save();
  ctx.font = '600 13px "IBM Plex Mono", "Consolas", monospace';
  ctx.fillStyle = 'rgba(74,69,61,0.42)';
  ctx.fillText('PLATE 04-A / CERAMIC', 620, 478);
  ctx.fillText('SN 212-91', 1600, 452);
  ctx.restore();

  return c;
}

/** Soft roughness drift; material.roughness multiplies this map. */
export function ceramicRoughnessCanvas(w = 1024, h = 512) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const broad = fbm2(x * 0.006 + 4.1, y * 0.006 - 2.7, 3);
      const fine = fbm2(x * 0.026 - 8.3, y * 0.026 + 5.9, 2);
      let v = 0.90 + (broad - 0.5) * 0.16 + (fine - 0.5) * 0.055;
      const sx = Math.min(Math.abs(x - 0), Math.abs(x - 300), Math.abs(x - 640), Math.abs(x - 980));
      const sy = Math.min(Math.abs(y - 0), Math.abs(y - 250), Math.abs(y - 510));
      if (sx < 3 || sy < 3) v -= 0.05;
      const i = (y * w + x) * 4;
      const g = Math.max(0, Math.min(255, v * 255));
      d[i] = d[i + 1] = d[i + 2] = g;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Restrained ceramic normal: plate steps, seam grooves, rivet domes, soft drift. */
export function ceramicNormalCanvas(w = 1024, h = 512) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const rnd = mulberry32(5129);
  const img = ctx.createImageData(w, h);
  const d = img.data;

  const heightAt = (x, y) => {
    let v = 138 + (fbm2(x * 0.012 + 2.3, y * 0.012 - 4.8, 3) - 0.5) * 9;
    v += (fbm2(x * 0.085 - 1.7, y * 0.085 + 7.1, 2) - 0.5) * 3.2; // orange peel, very low
    return v;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const g = Math.max(0, Math.min(255, heightAt(x, y)));
      d[i] = d[i + 1] = d[i + 2] = g;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // plate steps (same layout, half resolution)
  const cols = [0, 300, 640, 980, w];
  const rows = [0, 250, 510, h];
  for (let j = 0; j < rows.length - 1; j++) {
    for (let i = 0; i < cols.length - 1; i++) {
      const x = cols[i];
      const y = rows[j];
      const bw = cols[i + 1] - x;
      const bh = rows[j + 1] - y;
      const lift = Math.floor(rnd() * 5) - 2;
      ctx.fillStyle = `rgb(${138 + lift},${138 + lift},${138 + lift})`;
      ctx.fillRect(x, y, bw, bh);
    }
  }

  // seam groove
  for (const x of [0, 300, 640, 980]) {
    ctx.fillStyle = 'rgb(84,84,84)';
    ctx.fillRect(x - 1, 0, 3, h);
  }
  for (const y of [0, 250, 510]) {
    ctx.fillStyle = 'rgb(92,92,92)';
    ctx.fillRect(0, y - 1, w, 3);
  }

  // rivet domes
  const dome = (x, y) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 4.5);
    g.addColorStop(0, 'rgb(214,214,214)');
    g.addColorStop(0.55, 'rgb(176,176,176)');
    g.addColorStop(1, 'rgba(132,132,132,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const x of [0, 300, 640, 980]) {
    for (const side of [-5, 5]) {
      for (let y = 13; y < h; y += 24) dome(x + side, y + (side > 0 ? 6 : 0));
    }
  }
  for (const y of [0, 250, 510]) {
    for (const side of [-5, 5]) {
      for (let x = 13; x < w; x += 24) dome(x + (side > 0 ? 6 : 0), y + side);
    }
  }

  return normalFromHeight(c, 1.15);
}

/** Solar cells for the ground array: deep blue, thin silver grid, faint fingers. */
export function solarArrayCanvas(w = 768, h = 384) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const rnd = mulberry32(7307);
  ctx.fillStyle = '#081120';
  ctx.fillRect(0, 0, w, h);
  const cols = 8;
  const rows = 5;
  const cw = w / cols;
  const ch = h / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const v = rnd();
      const r = 11 + v * 6;
      const g = 24 + v * 9;
      const b = 44 + v * 15;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(i * cw + 2, j * ch + 2, cw - 4, ch - 4);
      // fine collector fingers
      ctx.fillStyle = 'rgba(148,168,190,0.20)';
      for (let k = 1; k < 4; k++) {
        ctx.fillRect(i * cw + 2, j * ch + (k * ch) / 4, cw - 4, 0.7);
      }
      // silver grid
      ctx.fillStyle = 'rgba(198,212,226,0.92)';
      ctx.fillRect(i * cw, j * ch, cw, 1.6);
      ctx.fillRect(i * cw, j * ch, 1.6, ch);
    }
  }
  // busbars down the panel
  ctx.fillStyle = 'rgba(182,198,214,0.55)';
  for (const bx of [0.25, 0.5, 0.75]) ctx.fillRect(bx * w - 0.7, 0, 1.4, h);
  // glass sheen, not a flat fill
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(148,182,214,0.12)');
  g.addColorStop(0.42, 'rgba(148,182,214,0)');
  g.addColorStop(0.7, 'rgba(90,124,164,0.05)');
  g.addColorStop(1, 'rgba(120,156,196,0.09)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // thin outer gasket
  ctx.strokeStyle = 'rgba(10,16,24,0.9)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  return c;
}

export function stencilCanvas(text, sub, w = 512, h = 192) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const size = Math.min(104, Math.floor((w - 24) / (text.length * 0.72)));
  stencilText(ctx, text, 6, h * 0.16, size, 'rgba(52,49,43,0.9)', 1, 0.12);
  if (sub) stencilText(ctx, sub, 9, h * 0.16 + size + 12, 20, 'rgba(52,49,43,0.62)', 1, 0.2);
  const rnd = mulberry32(text.length * 977 + 19);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < 9000; i++) {
    const k = Math.floor(rnd() * (w * h)) * 4;
    d[k + 3] = Math.max(0, d[k + 3] - (rnd() < 0.5 ? 90 : 26));
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function panelHeightCanvas(w = 512, h = 256) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const rnd = mulberry32(3331);
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(0, 0, w, h);
  // plate steps
  const bands = [
    [0, 0, 125, 88],
    [125, 0, 150, 75],
    [275, 0, 125, 95],
    [400, 0, 112, 80],
    [0, 88, 95, 85],
    [95, 75, 150, 65],
    [245, 95, 155, 80],
    [400, 80, 112, 100],
    [0, 173, 150, 83],
    [150, 140, 100, 116],
    [250, 175, 165, 81],
    [415, 180, 97, 76],
  ];
  for (const [x, y, bw, bh] of bands) {
    const v = 118 + Math.floor(rnd() * 34);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = 'rgba(30,30,30,0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
  }
  for (let x = 15; x < w; x += 42) {
    for (let y = 12; y < h; y += 30) {
      const v = 168;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // fine grain in the height
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 22;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  return normalFromHeight(c, 1.15);
}

export function mliNormalCanvas(size = 512) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const rnd = mulberry32(8841);
  const offs = [];
  for (let i = 0; i < 26; i++) offs.push([rnd() * 100, rnd() * 100, rnd() * 20]);
  const f = (x, y) => {
    let v = 0;
    for (let o = 0; o < 6; o++) {
      const s = 1 + o * 1.9;
      const a = Math.sin((x * s + offs[o][0]) * 0.21 + Math.cos(y * s * 0.15) * 2.2);
      const b = Math.cos((y * s + offs[o][1]) * 0.19 + Math.sin(x * s * 0.11) * 2.6);
      v += (Math.abs(a * b) ** 1.6) * (0.55 / (1 + o * 0.4));
    }
    return v;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const v = clamp01(f(x, y) * 0.65);
      const g = 90 + v * 130;
      img.data[i] = g;
      img.data[i + 1] = g;
      img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return normalFromHeight(c, 3.2);
}

export function mliAlbedoCanvas(size = 512) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#a57c2f';
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(4401);
  for (let i = 0; i < 900; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 3 + rnd() * 26;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rnd() > 0.5;
    g.addColorStop(0, light ? 'rgba(232,183,86,0.14)' : 'rgba(74,50,16,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 42; i++) {
    ctx.strokeStyle = `rgba(56,38,12,${0.16 + rnd() * 0.3})`;
    ctx.lineWidth = 0.7 + rnd() * 1.6;
    ctx.beginPath();
    let x = rnd() * size;
    let y = rnd() * size;
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (rnd() - 0.5) * 90;
      y += (rnd() - 0.5) * 90;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  grainOverlay(ctx, size, size, 0.09, 991, 0.8);
  return c;
}

function stencilText(ctx, text, x, y, size, color, alpha = 1, spacing = 0.06) {
  ctx.save();
  ctx.font = `500 ${size}px ${MONO}`;
  try {
    ctx.letterSpacing = `${size * spacing}px`;
  } catch (e) {
    /* older engine */
  }
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function decalAtlasCanvas() {
  const w = 1024;
  const h = 1024;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const rnd = mulberry32(6102);

  const rects = {
    hab: [8, 8, 470, 150],
    number: [520, 8, 330, 230],
    airlock: [8, 190, 250, 44],
    bulkhead: [8, 250, 300, 44],
    caution: [8, 316, 300, 86],
    access: [8, 430, 268, 46],
    serial: [8, 500, 330, 30],
    hazard: [8, 560, 470, 34],
    nostep: [8, 620, 200, 34],
    hatch: [8, 680, 220, 36],
    pressure: [8, 740, 380, 30],
    o2: [520, 780, 300, 60],
  };

  // HAB-04
  stencilText(ctx, 'HAB-04', 12, 24, 116, 'rgba(56,52,46,0.9)', 1, 0.04);
  stencilText(ctx, 'LUNAR HABITAT 04  /  PRESSURE VESSEL', 16, 140, 19, 'rgba(52,49,43,0.85)', 0.95, 0.16);

  // large 04
  stencilText(ctx, '04', 545, 12, 190, 'rgba(60,56,49,0.82)', 0.95, 0.0);

  stencilText(ctx, 'AIRLOCK', 10, 190, 34, 'rgba(54,51,45,0.9)', 1, 0.2);
  stencilText(ctx, 'BULKHEAD', 10, 250, 34, 'rgba(54,51,45,0.9)', 1, 0.2);

  // caution placard
  ctx.fillStyle = 'rgba(163,126,48,0.85)';
  ctx.fillRect(8, 316, 300, 86);
  ctx.strokeStyle = 'rgba(40,36,28,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(9, 317, 298, 84);
  stencilText(ctx, 'CAUTION', 20, 324, 22, 'rgba(30,27,22,0.95)', 1, 0.16);
  stencilText(ctx, 'MICROMETEOROID SHIELD', 20, 352, 15, 'rgba(30,27,22,0.9)', 1, 0.12);
  stencilText(ctx, 'DO NOT ABRADE / 04-B', 20, 374, 12, 'rgba(30,27,22,0.8)', 1, 0.1);

  stencilText(ctx, 'ACCESS 03 / ECLSS', 10, 430, 26, 'rgba(52,49,43,0.85)', 1, 0.12);
  stencilText(ctx, 'SN 04-212-91  ·  CERAMIC COMPOSITE', 10, 500, 15, 'rgba(52,49,43,0.7)', 1, 0.1);

  // hazard stripes
  ctx.save();
  ctx.beginPath();
  ctx.rect(8, 560, 470, 30);
  ctx.clip();
  for (let i = -40; i < 520; i += 26) {
    ctx.fillStyle = 'rgba(178,140,52,0.8)';
    ctx.beginPath();
    ctx.moveTo(8 + i, 590);
    ctx.lineTo(8 + i + 13, 590);
    ctx.lineTo(8 + i + 43, 560);
    ctx.lineTo(8 + i + 30, 560);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  stencilText(ctx, 'NO STEP', 10, 620, 24, 'rgba(52,49,43,0.8)', 1, 0.16);
  stencilText(ctx, 'HATCH / 1.05 M', 10, 680, 22, 'rgba(52,49,43,0.8)', 1, 0.12);
  stencilText(ctx, '101.3 kPa  /  N2 78  O2 21', 10, 740, 15, 'rgba(52,49,43,0.7)', 1, 0.12);
  stencilText(ctx, 'O₂ 21%', 520, 786, 34, 'rgba(178,140,52,0.7)', 1, 0.14);

  // wear: erode with specks
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < 26000; i++) {
    const x = Math.floor(rnd() * w);
    const y = Math.floor(rnd() * h);
    const k = (y * w + x) * 4;
    if (rnd() < 0.5) {
      d[k + 3] = Math.max(0, d[k + 3] - 120);
    } else {
      d[k + 3] = Math.max(0, d[k + 3] - 40);
    }
  }
  ctx.putImageData(img, 0, 0);
  return { canvas: c, rects };
}

export function solarCanvas(size = 512) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const rnd = mulberry32(2049);
  ctx.fillStyle = '#0a1220';
  ctx.fillRect(0, 0, size, size);
  const cols = 8;
  const rows = 5;
  const cw = size / cols;
  const ch = size / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const v = 20 + rnd() * 14;
      ctx.fillStyle = `rgb(${v},${v + 6},${v + 20})`;
      ctx.fillRect(i * cw + 2, j * ch + 2, cw - 4, ch - 4);
      ctx.fillStyle = 'rgba(185,200,214,0.92)';
      ctx.fillRect(i * cw, j * ch, cw, 1.5);
      ctx.fillRect(i * cw, j * ch, 1.5, ch);
      ctx.fillStyle = 'rgba(150,165,180,0.12)';
      ctx.fillRect(i * cw + 4, j * ch + 4, cw - 8, 2);
    }
  }
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, 'rgba(150,180,210,0.10)');
  g.addColorStop(0.45, 'rgba(150,180,210,0)');
  g.addColorStop(1, 'rgba(90,120,160,0.06)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

export function gratingCanvas(size = 128) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = 6;
  const step = 16;
  for (let x = 0; x <= size; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(size, y + 0.5);
    ctx.stroke();
  }
  // rivet nodes
  ctx.lineWidth = 4;
  for (let x = 0; x <= size; x += step) {
    for (let y = 0; y <= size; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return c;
}

export function pathCanvas(w = 512, h = 1024) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const rnd = mulberry32(4482);
  // compacted dust ribbon
  for (let i = 0; i < 900; i++) {
    const t = rnd();
    const y = t * h;
    const spread = 0.5 + Math.sin(t * 7.1) * 0.22;
    const x = w * 0.5 + (rnd() - 0.5) * w * spread;
    const r = 8 + rnd() * 34;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(40,37,32,${0.16 + rnd() * 0.12})`);
    g.addColorStop(1, 'rgba(40,37,32,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // boot prints in loose pairs
  for (let t = 0.02; t < 0.99; t += 0.028) {
    const y = t * h;
    const side = Math.round(t * 36) % 2 === 0 ? -1 : 1;
    const x = w * 0.5 + side * 17 + Math.sin(t * 9) * 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 2 + side * 0.06);
    ctx.fillStyle = 'rgba(20,18,16,0.52)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(230,224,210,0.10)';
    ctx.beginPath();
    ctx.ellipse(-2, -3, 8, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(14,13,11,0.5)';
    for (let k = -3; k < 4; k++) {
      ctx.fillRect(-7, k * 6, 14, 2.2);
    }
    ctx.restore();
  }
  return c;
}

export function blastCanvas(size = 1024) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const rnd = mulberry32(7001);
  ctx.translate(size / 2, size / 2);
  for (let i = 0; i < 300; i++) {
    const a = rnd() * Math.PI * 2;
    const len = size * (0.1 + rnd() * 0.44);
    const wdt = 1 + rnd() * 9;
    const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    g.addColorStop(0, `rgba(24,22,20,${0.06 + rnd() * 0.08})`);
    g.addColorStop(1, 'rgba(24,22,20,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = wdt;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * len * 0.16, Math.sin(a) * len * 0.16);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
  }
  // radial ring scuffs
  for (let i = 0; i < 10; i++) {
    ctx.strokeStyle = `rgba(28,25,22,${0.05 + rnd() * 0.05})`;
    ctx.lineWidth = 1 + rnd() * 3;
    ctx.beginPath();
    ctx.arc(0, 0, size * (0.16 + rnd() * 0.3), 0, Math.PI * 2);
    ctx.stroke();
  }
  return c;
}

export function linerCanvas(size = 512) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const rnd = mulberry32(1188);
  ctx.fillStyle = '#9d9588';
  ctx.fillRect(0, 0, size, size);
  // padded panel grid
  const cell = size / 8;
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      const v = 148 + Math.floor(rnd() * 18);
      ctx.fillStyle = `rgb(${v},${v - 5},${v - 13})`;
      ctx.fillRect(i * cell + 3, j * cell + 3, cell - 6, cell - 6);
      ctx.strokeStyle = 'rgba(44,40,34,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(i * cell + 3.5, j * cell + 3.5, cell - 7, cell - 7);
    }
  }
  for (let i = 0; i < 1600; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(40,34,28,${0.03 + rnd() * 0.06})`;
    ctx.fillRect(x, y, 1 + rnd() * 3, 1 + rnd() * 2);
  }
  return c;
}







