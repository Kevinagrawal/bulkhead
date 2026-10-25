import { chromium } from 'playwright-core';
import path from 'node:path';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const errors = [];
for (const [name, scene] of [['exterior-texture', 'exterior'], ['analyze-solar', 'analyze']]) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:5179/?scene=${scene}&t=0.4&freeze=1&ui=1&intro=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__lab && window.__lab.ready);
  await page.waitForTimeout(2400);
  await page.screenshot({ path: path.resolve('shots/refine', name + '.png') });
  console.log(name, JSON.stringify(await page.evaluate(() => window.__lab.stats)));
  await page.close();
}
await browser.close();
console.log(errors.length ? 'ERRORS ' + errors.slice(0, 5).join(' | ') : 'no console errors');
