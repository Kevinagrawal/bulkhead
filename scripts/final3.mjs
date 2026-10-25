import { chromium } from 'playwright-core';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:5179/';
const jobs = [
  { dir: '1920', file: 'scene-1-exterior', w: 1920, q: 'scene=exterior&freeze=1&ui=1&intro=0&t=0.4' },
  { dir: '1920', file: 'plate-exterior', w: 1920, q: 'scene=exterior&freeze=1&ui=0&intro=0&t=0.4' },
  { dir: '1280', file: 'scene-1-exterior', w: 1280, q: 'scene=exterior&freeze=1&ui=1&intro=0&t=0.4' },
  { dir: '1920', file: 'design-scene', w: 1920, q: 'scene=design&freeze=1&ui=1&intro=0&t=0.4' },
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
  await page.goto(`${BASE}?${job.q}`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__lab && window.__lab.ready, { timeout: 90000 });
  await page.waitForTimeout(2400);
  await page.screenshot({ path: path.resolve(`shots/round-1/${job.dir}/${job.file}.png`) });
  console.log(job.dir, job.file, JSON.stringify(await page.evaluate(() => window.__lab.stats)));
  await context.close();
}
await browser.close();
console.log(errors.length ? 'ERRORS ' + errors.slice(0, 4).join(' | ') : 'no console errors');
