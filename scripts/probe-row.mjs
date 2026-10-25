import { chromium } from 'playwright-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5179/?scene=exterior&t=0.4&freeze=1&ui=0&intro=0', { waitUntil: 'load' });
await page.waitForFunction(() => window.__lab && window.__lab.ready);
await page.waitForTimeout(800);
const rows = await page.evaluate(() => {
  const THREEBox = window.__lab.scene;
  const hits = [];
  THREEBox.updateMatrixWorld(true);
  THREEBox.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    const s = b.getSize(new (b.min.constructor)());
    if (b.min.y < 1.2 && b.max.y > -0.2 && b.min.x < 9 && b.max.x > -5 && b.min.z < 6 && b.max.z > 1.5 && s.x < 4 && s.y < 3 && s.z < 4) {
      hits.push({
        name: o.name, mat: o.material?.type, color: o.material?.color ? '#' + o.material.color.getHexString() : null,
        center: b.getCenter(new (b.min.constructor)()).toArray().map((v) => +v.toFixed(2)),
        size: s.toArray().map((v) => +v.toFixed(2)),
        parent: o.parent?.name,
      });
    }
  });
  return hits;
});
console.log(JSON.stringify(rows, null, 1));
await browser.close();
