import { chromium } from 'playwright-core';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:5179/';
const cams = {
  're-A': { cx: -4, cy: 9.0, cz: 30.5, tx: -5.5, ty: 6.2, tz: 0, fov: 38.5 },
  're-B': { cx: -7, cy: 9.4, cz: 32.0, tx: -5.5, ty: 6.2, tz: 0, fov: 38.5 },
  're-C': { cx: -2, cy: 8.6, cz: 29.5, tx: -5.5, ty: 6.2, tz: 0, fov: 38.5 },
};

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

for (const [name, c] of Object.entries(cams)) {
  const q = new URLSearchParams({
    scene: 'exterior', freeze: '1', ui: '0', intro: '0', t: '0.4',
    cx: c.cx, cy: c.cy, cz: c.cz, tx: c.tx, ty: c.ty, tz: c.tz, fov: c.fov,
  });
  await page.goto(`${BASE}?${q}`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__lab && window.__lab.ready, { timeout: 90000 });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.resolve(`shots/round-1/1920/${name}.png`) });
  console.log(name, JSON.stringify(await page.evaluate(() => window.__lab.stats)));
}

const diag = await page.evaluate(() => {
  const out = [];
  const THREE_BOX = window.__lab.scene;
  THREE_BOX.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isLine) return;
    if (!o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox;
    if (!b) return;
    const s = { x: b.max.x - b.min.x, y: b.max.y - b.min.y, z: b.max.z - b.min.z };
    out.push({
      name: o.name || '(unnamed)',
      parent: o.parent ? o.parent.name : '',
      type: o.type,
      size: [s.x.toFixed(1), s.y.toFixed(1), s.z.toFixed(1)],
      center: [
        ((b.max.x + b.min.x) / 2).toFixed(1),
        ((b.max.y + b.min.y) / 2).toFixed(1),
        ((b.max.z + b.min.z) / 2).toFixed(1),
      ],
    });
  });
  return out;
});
console.log('MESHES');
for (const d of diag) console.log(JSON.stringify(d));
console.log(errors.length ? 'ERRORS ' + errors.slice(0, 4).join(' | ') : 'no console errors');
await browser.close();
