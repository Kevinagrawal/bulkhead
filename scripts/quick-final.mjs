import { chromium } from 'playwright-core';
import path from 'node:path';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const errors = [];
const shots = [['exterior-final', 'exterior'], ['cutaway-high', 'cutaway'], ['analyze-final', 'analyze']];
for (const [name, scene] of shots) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:5179/?scene=${scene}&t=0.4&freeze=1&ui=1&intro=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__lab && window.__lab.ready);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.resolve('shots/refine', name + '.png') });
  await page.close();
}
// live drag test
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:5179/?scene=exterior&intro=0', { waitUntil: 'load' });
await page.waitForFunction(() => window.__lab && window.__lab.ready);
await page.waitForTimeout(600);
const before = await page.evaluate(() => ({ x: window.__lab.camera.position.x, z: window.__lab.camera.position.z }));
await page.mouse.move(640, 360);
await page.mouse.down();
await page.mouse.move(860, 300, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(900);
const after = await page.evaluate(() => ({ x: window.__lab.camera.position.x, z: window.__lab.camera.position.z, orbit: window.__lab.state.orbit }));
await page.screenshot({ path: path.resolve('shots/refine/drag-orbit.png') });
console.log(JSON.stringify({ before, after, moved: Math.hypot(after.x - before.x, after.z - before.z), errors }, null, 1));
await browser.close();
