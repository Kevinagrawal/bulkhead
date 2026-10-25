import { chromium } from 'playwright-core';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:5179/';
const scene = process.argv[2] || 'exterior';
const t = process.argv[3] || '0.35';
const w = parseInt(process.argv[4] || '1920', 10);
const h = Math.round((w * 9) / 16);
const out = process.argv[5] || `shots/round-1/1920/scene-1-exterior.png`;

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
const page = await context.newPage();
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.goto(`${BASE}?scene=${scene}&t=${t}&freeze=1&ui=1&mode=live&intro=0`, {
  waitUntil: 'load',
  timeout: 90000,
});
await page.waitForFunction(() => window.__lab && window.__lab.ready === true, { timeout: 90000 });
await page.waitForTimeout(2200);
const stats = await page.evaluate(() => ({
  stats: window.__lab.stats,
  ready: window.__lab.ready,
  hullChildren: (() => {
    let n = 0;
    window.__lab.scene.traverse((o) => {
      if (o.isMesh && /hull|section|interior|solar/.test(o.name)) n++;
    });
    return n;
  })(),
  probe: window.__lab.probe,
}));
console.log(JSON.stringify(stats));
await page.screenshot({ path: path.resolve(out) });
console.log('shot', path.resolve(out));
if (logs.length) console.log(logs.slice(0, 12).join('\n'));
await browser.close();
