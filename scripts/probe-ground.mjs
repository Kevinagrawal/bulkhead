import { chromium } from 'playwright-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5179/?scene=exterior&t=0.4&freeze=1&ui=0&intro=0', { waitUntil: 'load' });
await page.waitForFunction(() => window.__lab && window.__lab.ready);
await page.evaluate(() => {
  const s = window.__lab.scene;
  const t = s.getObjectByName('terrain-inner');
  const f = s.getObjectByName('terrain-far');
  const b = s.getObjectByName('near-berm');
  if (t) t.material.color.setHex(0xff0000);
  if (f) f.material.color.setHex(0x0000ff);
  if (b) b.material.color.setHex(0x00ff00);
  // force material update
  [t, f, b].forEach((m) => { if (m) m.material.needsUpdate = true; });
});
await page.waitForTimeout(1200);
await page.screenshot({ path: 'shots/check/ground-probe.png' });
await browser.close();
