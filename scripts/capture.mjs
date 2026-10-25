import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:5179/';
const OUT = path.resolve('shots/round-1');

const shots = [
  { name: 'scene-1-exterior', scene: 'exterior', t: 0.35, mode: 'live', ui: 1 },
  { name: 'scene-2-inspection', scene: 'inspection', t: 0.4, mode: 'live', ui: 1 },
  { name: 'scene-3-cutaway', scene: 'cutaway', t: 0.42, mode: 'live', ui: 1 },
  { name: 'scene-4-breach', scene: 'breach', t: 0.5, mode: 'live', ui: 1 },
  { name: 'scene-5a-analyze', scene: 'analyze', t: 0.35, mode: 'analyze', ui: 1 },
  { name: 'scene-5b-design', scene: 'design', t: 0.35, mode: 'design', ui: 1 },
  { name: 'plate-exterior', scene: 'exterior', t: 0.35, mode: 'live', ui: 0 },
];

const errors = [];

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});

for (const vp of [
  { w: 1920, h: 1080, dir: '1920' },
  { w: 1280, h: 720, dir: '1280' },
]) {
  fs.mkdirSync(path.join(OUT, vp.dir), { recursive: true });
  const context = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${vp.dir}] console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[${vp.dir}] pageerror: ${err.message}`));

  for (const shot of shots) {
    const url = `${BASE}?scene=${shot.scene}&t=${shot.t}&freeze=1&ui=${shot.ui}&mode=${shot.mode}&intro=0`;
    await page.goto(url, { waitUntil: 'load', timeout: 90000 });
    try {
      await page.waitForFunction(() => window.__lab && window.__lab.ready === true, { timeout: 90000 });
    } catch (e) {
      errors.push(`[${vp.dir}] ${shot.name}: ready timeout`);
    }
    await page.waitForTimeout(2600);
    const stats = await page.evaluate(() => ({
      stats: window.__lab ? window.__lab.stats : null,
      gl: (() => {
        const c = document.getElementById('stage');
        const gl = c && c.getContext('webgl2');
        return gl ? gl.getParameter(gl.RENDERER) : 'no-gl';
      })(),
    }));
    console.log(vp.dir, shot.name, JSON.stringify(stats));
    await page.screenshot({ path: path.join(OUT, vp.dir, `${shot.name}.png`) });
  }
  await context.close();
}

await browser.close();
if (errors.length) {
  console.log('\nERRORS:');
  errors.forEach((e) => console.log(e));
  process.exitCode = 1;
} else {
  console.log('\nno console errors');
}
