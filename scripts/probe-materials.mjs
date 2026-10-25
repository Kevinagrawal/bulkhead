import { chromium } from 'playwright-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5179/?scene=exterior&t=0.4&freeze=1&ui=0&intro=0', { waitUntil: 'load' });
await page.waitForFunction(() => window.__lab && window.__lab.ready);
await page.waitForTimeout(1200);
const data = await page.evaluate(() => {
  const out = [];
  window.__lab.scene.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isLine) return;
    const m = o.material;
    out.push({
      name: o.name,
      type: o.type,
      mat: m?.type,
      color: m?.color ? '#' + m.color.getHexString() : null,
      vc: m?.vertexColors ?? null,
      map: !!m?.map,
      visible: o.visible,
      parentVisible: o.parent?.visible,
      tris: o.geometry?.index ? Math.round(o.geometry.index.count / 3) : Math.round((o.geometry?.attributes?.position?.count || 0) / 3),
    });
  });
  return out.filter((x) => x.visible && x.parentVisible);
});
console.log(JSON.stringify(data, null, 1));
await browser.close();
