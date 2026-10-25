import { chromium } from 'playwright-core';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:5179/';
const jobs = [
  { name: '1920/scene-1-exterior', scene: 'exterior', ui: 1, w: 1920 },
  { name: '1280/scene-1-exterior', scene: 'exterior', ui: 1, w: 1280 },
  { name: '1920/plate-exterior', scene: 'exterior', ui: 0, w: 1920 },
  { name: '1920/scene-2-inspection', scene: 'inspection', ui: 1, w: 1920 },
  { name: '1280/scene-2-inspection', scene: 'inspection', ui: 1, w: 1280 },
];

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const errors = [];
for (const job of jobs) {
  const h = Math.round((job.w * 9) / 16);
  const context = await browser.newContext({ viewport: { width: job.w, height: h }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}?scene=${job.scene}&t=0.4&freeze=1&ui=${job.ui}&intro=0&mode=live`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__lab && window.__lab.ready, { timeout: 90000 });
  await page.waitForTimeout(2400);
  await page.screenshot({ path: path.resolve(`shots/round-1/${job.name}.png`) });
  console.log(job.name, JSON.stringify(await page.evaluate(() => window.__lab.stats)));
  await context.close();
}
await browser.close();
console.log(errors.length ? 'ERRORS ' + errors.slice(0, 4).join(' | ') : 'no console errors');
