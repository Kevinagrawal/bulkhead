import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:5179/';
const out = path.resolve('shots/refine');
fs.mkdirSync(out, { recursive: true });

const jobs = [
  ['exterior-new', 'exterior', 1920, 1],
  ['exterior-new-wide', 'exterior', 1920, 1, 1.55],
  ['inspection-new', 'inspection', 1920, 1],
  ['exterior-new-1280', 'exterior', 1280, 1],
];

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const errors = [];
for (const [name, scene, width, ui, zoom] of jobs) {
  const height = Math.round((width * 9) / 16);
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const z = zoom ? `&zoom=${zoom}` : '';
  await page.goto(`${BASE}?scene=${scene}&t=0.4&freeze=1&ui=${ui}&intro=0${z}`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__lab && window.__lab.ready, { timeout: 90000 });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log(name, JSON.stringify(await page.evaluate(() => window.__lab.stats)));
  await context.close();
}
await browser.close();
console.log(errors.length ? 'ERRORS ' + errors.slice(0, 8).join(' | ') : 'no console errors');
