import { chromium } from 'playwright-core';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:5179/';
const q = new URLSearchParams({
  scene: 'exterior', freeze: '1', ui: '0', intro: '0', t: '0.4',
  cx: -4, cy: 9.0, cz: 30.5, tx: -5.5, ty: 6.2, tz: 0, fov: 38.5,
});

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.goto(`${BASE}?${q}`, { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => window.__lab && window.__lab.ready, { timeout: 90000 });
await page.waitForTimeout(2000);

const info = await page.evaluate(() => {
  const out = [];
  window.__lab.scene.traverse((o) => {
    if (o.name === 'habitat-section' || o.name === 'habitat-exterior' || o.name === 'props') {
      out.push({ name: o.name, visible: o.visible });
    }
  });
  return out;
});
console.log('VIS', JSON.stringify(info));

const shots = [
  { file: 'iso-no-titanium', hide: ['hull-titanium'] },
  { file: 'iso-no-props', hide: [], hideParent: ['props'] },
];
for (const s of shots) {
  await page.evaluate(({ hide = [], hideParent = [] }) => {
    window.__lab.scene.traverse((o) => {
      if (hide.includes(o.name)) o.visible = false;
      if (hideParent.includes(o.name)) o.visible = false;
    });
  }, s);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.resolve(`shots/round-1/1920/${s.file}.png`) });
  console.log('shot', s.file);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__lab && window.__lab.ready, { timeout: 90000 });
  await page.waitForTimeout(1500);
}
await browser.close();

