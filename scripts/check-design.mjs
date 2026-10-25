import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:5179/';
const out = path.resolve('shots/check');
fs.mkdirSync(out, { recursive: true });

const jobs = [
  ['exterior', 'exterior', 1],
  ['design', 'design', 1],
  ['design-plate', 'design', 0],
  ['analyze', 'analyze', 1],
  ['cutaway', 'cutaway', 1],
];

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const errors = [];
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
for (const [name, scene, ui] of jobs) {
  await page.goto(`${BASE}?scene=${scene}&t=0.4&freeze=1&ui=${ui}&intro=0`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__lab && window.__lab.ready, { timeout: 90000 });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log(name, JSON.stringify(await page.evaluate(() => window.__lab.stats)));
}
await browser.close();
console.log(errors.length ? 'ERRORS ' + errors.slice(0, 6).join(' | ') : 'no console errors');
