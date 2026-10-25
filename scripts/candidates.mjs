import { chromium } from 'playwright-core';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:5179/';
const cams = {
  'cam-E': { cx: -21.5, cy: 9.5, cz: 36.0, tx: -6.0, ty: 6.95, tz: 1.4, fov: 38.5 },
  'cam-F': { cx: -19.5, cy: 9.2, cz: 33.0, tx: -6.0, ty: 6.8, tz: 1.3, fov: 38.5 },
  'cam-G': { cx: -23.0, cy: 9.8, cz: 39.0, tx: -7.2, ty: 7.1, tz: 1.6, fov: 38.5 },
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
    scene: 'exterior', freeze: '1', ui: '0', intro: '0', t: '0.35',
    cx: c.cx, cy: c.cy, cz: c.cz, tx: c.tx, ty: c.ty, tz: c.tz, fov: c.fov,
  });
  await page.goto(`${BASE}?${q}`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__lab && window.__lab.ready, { timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.resolve(`shots/round-1/1920/${name}.png`) });
  console.log(name, JSON.stringify(await page.evaluate(() => window.__lab.stats)));
}
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
