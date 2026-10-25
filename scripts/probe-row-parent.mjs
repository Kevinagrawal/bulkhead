import { chromium } from 'playwright-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const cases = [
  ['habitat', 'habitat-exterior'],
  ['props', 'props'],
  ['solar', 'solar-array'],
  ['berm', 'near-berm'],
  ['terrain', 'terrain-inner'],
];
for (const [label, name] of cases) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://127.0.0.1:5179/?scene=exterior&t=0.4&freeze=1&ui=0&intro=0', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__lab && window.__lab.ready);
  await page.waitForTimeout(500);
  const found = await page.evaluate((n) => {
    const o = window.__lab.scene.getObjectByName(n);
    if (o && o.parent) { o.parent.remove(o); return true; }
    return false;
  }, name);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `shots/refine/row-${label}.png` });
  console.log(label, found);
  await page.close();
}
await browser.close();
