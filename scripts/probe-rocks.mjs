import { chromium } from 'playwright-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5179/?scene=exterior&t=0.4&freeze=1&ui=0&intro=0', { waitUntil: 'load' });
await page.waitForFunction(() => window.__lab && window.__lab.ready);
await page.waitForTimeout(800);
await page.evaluate(() => {
  const s = window.__lab.scene;
  s.traverse((o) => { if (o.name === 'props') o.visible = false; });
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/refine/no-props.png' });
await browser.close();
