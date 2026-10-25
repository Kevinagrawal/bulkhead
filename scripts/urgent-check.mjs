import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:5179/';
const out = path.resolve('shots/urgent');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const cases = [
  ['default', ''],
  ['no-intro', '?intro=0'],
  ['frozen', '?scene=exterior&t=0.4&freeze=1&ui=1&intro=0'],
  ['live', '?scene=exterior&intro=0'],
];
for (const [name, q] of cases) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGE ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CON ' + m.text()); });
  await page.goto(BASE + q, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3500);
  const state = await page.evaluate(() => {
    const lab = window.__lab;
    const c = lab?.camera;
    const intro = document.getElementById('intro');
    return {
      ready: lab?.ready ?? null,
      scene: lab?.state?.scene ?? null,
      frozen: lab?.state?.frozen ?? null,
      zoom: lab?.state?.zoom ?? null,
      cam: c ? { x: +c.position.x.toFixed(2), y: +c.position.y.toFixed(2), z: +c.position.z.toFixed(2), fov: +c.fov.toFixed(2) } : null,
      introDisplay: intro ? getComputedStyle(intro).display : null,
      introOpacity: intro ? getComputedStyle(intro).opacity : null,
      ui: document.getElementById('ui')?.dataset?.scene ?? null,
      canvas: (() => { const el = document.getElementById('stage'); return el ? { w: el.width, h: el.height, cw: el.clientWidth, ch: el.clientHeight } : null; })(),
    };
  });
  await page.screenshot({ path: path.join(out, name + '.png') });
  console.log(name, JSON.stringify(state), errors.slice(0, 4));
  await context.close();
}
await browser.close();
