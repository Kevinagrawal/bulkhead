import { chromium } from 'playwright-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5179/?scene=exterior&t=0.4&freeze=1&ui=0&intro=0', { waitUntil: 'load' });
await page.waitForFunction(() => window.__lab && window.__lab.ready);
await page.waitForTimeout(800);
const out = await page.evaluate(() => {
  const s = window.__lab.scene;
  s.updateMatrixWorld(true);
  const res = [];
  s.traverse((o) => {
    if (!o.isInstancedMesh) return;
    let inRegion = 0;
    const pts = [];
    const m = new (o.matrixWorld.constructor)();
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      const p = { x: m.elements[12], y: m.elements[13], z: m.elements[14] };
      if (p.x > -6 && p.x < 10 && p.z > 1 && p.z < 7 && p.y < 1.4) {
        inRegion++;
        if (pts.length < 8) pts.push([+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]);
      }
    }
    res.push({
      name: o.name, count: o.count, inRegion,
      mat: o.material?.type, color: o.material?.color ? '#' + o.material.color.getHexString() : null,
      pts,
    });
  });
  return res;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
