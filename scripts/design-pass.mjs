import { chromium } from 'playwright-core';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:5179/';
const jobs = [
  { out: '1920/scene-1-exterior', q: 'scene=exterior&freeze=1&ui=1&intro=0&t=0.4' },
  { out: '1920/plate-exterior', q: 'scene=exterior&freeze=1&ui=0&intro=0&t=0.4' },
  { out: '1280/scene-1-exterior', w: 1280, q: 'scene=exterior&freeze=1&ui=1&intro=0&t=0.4' },
  {
    out: '1920/detail-spine',
    q: 'scene=exterior&freeze=1&ui=0&intro=0&t=0.4&cx=9&cy=10.5&cz=12&tx=-0.2&ty=7.2&tz=-0.1&fov=30',
  },
  {
    out: '1920/detail-door',
    q: 'scene=exterior&freeze=1&ui=0&intro=0&t=0.4&cx=4&cy=3.8&cz=12&tx=-2.2&ty=3.5&tz=5.1&fov=32',
  },
  {
    out: '1920/detail-airlock',
    q: 'scene=exterior&freeze=1&ui=0&intro=0&t=0.4&cx=-13.6&cy=4.8&cz=13.2&tx=-10.4&ty=3.3&tz=4.9&fov=34',
  },
];
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const errors = [];
for (const job of jobs) {
  const w = job.w || 1920;
  const h = Math.round((w * 9) / 16);
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}?${job.q}`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__lab && window.__lab.ready, { timeout: 90000 });
  await page.waitForTimeout(2300);
  await page.screenshot({ path: path.resolve(`shots/round-1/${job.out}.png`) });
  console.log(job.out, JSON.stringify(await page.evaluate(() => window.__lab.stats)));
  await context.close();
}
await browser.close();
console.log(errors.length ? 'ERRORS ' + errors.slice(0, 4).join(' | ') : 'no console errors');
