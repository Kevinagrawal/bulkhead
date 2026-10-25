import { chromium } from 'playwright-core';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:5179/';
const jobs = [
  {
    name: 'hatch-closeup',
    q: 'scene=exterior&freeze=1&ui=0&intro=0&t=0.4&cx=-12.0&cy=4.2&cz=10.9&tx=-9.9&ty=3.25&tz=5.6&fov=32',
  },
  {
    name: 'junction-closeup',
    q: 'scene=exterior&freeze=1&ui=0&intro=0&t=0.4&cx=-16.5&cy=5.2&cz=13.5&tx=-9.2&ty=4.0&tz=2.5&fov=33',
  },
];
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const errors = [];
for (const job of jobs) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}?${job.q}`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__lab && window.__lab.ready, { timeout: 90000 });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.resolve(`shots/round-1/1920/${job.name}.png`) });
  console.log(job.name, JSON.stringify(await page.evaluate(() => window.__lab.stats)));
  await context.close();
}
await browser.close();
console.log(errors.length ? 'ERRORS ' + errors.slice(0, 4).join(' | ') : 'no console errors');
