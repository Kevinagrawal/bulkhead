import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:5179/';
const root = path.resolve('shots/final');
fs.mkdirSync(path.join(root, '1920'), { recursive: true });
fs.mkdirSync(path.join(root, '1280'), { recursive: true });

const scenes = [
  ['scene-1-exterior', 'exterior'],
  ['scene-2-inspection', 'inspection'],
  ['scene-3-cutaway', 'cutaway'],
  ['scene-4-breach', 'breach'],
  ['scene-5a-analyze', 'analyze'],
  ['scene-5b-design', 'design'],
];

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const errors = [];
for (const width of [1920, 1280]) {
  const height = Math.round((width * 9) / 16);
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`[${width}] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${width}] ${m.text()}`); });
  for (const [name, scene] of scenes) {
    const url = `${BASE}?scene=${scene}&t=0.4&freeze=1&ui=1&intro=0`;
    await page.goto(url, { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => window.__lab && window.__lab.ready, { timeout: 90000 });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: path.join(root, String(width), `${name}.png`) });
    const stats = await page.evaluate(() => window.__lab.stats);
    console.log(width, name, JSON.stringify(stats));
  }
  if (width === 1920) {
    for (const [name, scene] of scenes) {
      const url = `${BASE}?scene=${scene}&t=0.4&freeze=1&ui=0&intro=0`;
      await page.goto(url, { waitUntil: 'load', timeout: 90000 });
      await page.waitForFunction(() => window.__lab && window.__lab.ready, { timeout: 90000 });
      await page.waitForTimeout(2200);
      await page.screenshot({ path: path.join(root, '1920', `plate-${name.replace(/^scene-\d+[a-z]?-/, '')}.png`) });
    }
  }
  await context.close();
}
await browser.close();
const log = errors.length ? errors.slice(0, 20).join('\n') : 'no console errors';
fs.writeFileSync(path.join(root, 'capture-log.txt'), log + '\n');
console.log(log);
