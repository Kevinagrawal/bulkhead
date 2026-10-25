import { chromium } from 'playwright-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5179/?scene=exterior&t=0.4&freeze=1&ui=0&intro=0', { waitUntil: 'load' });
await page.waitForFunction(() => window.__lab && window.__lab.ready);
await page.waitForTimeout(1000);
const data = await page.evaluate(() => {
  const lights = [];
  window.__lab.scene.traverse((o) => {
    if (o.isLight) lights.push({ type: o.type, color: '#' + o.color.getHexString(), intensity: o.intensity, visible: o.visible });
  });
  const r = window.__lab.renderer;
  const terrain = window.__lab.scene.getObjectByName('terrain-inner');
  const m = terrain.material;
  return {
    lights,
    exposure: r.toneMappingExposure,
    toneMapping: r.toneMapping,
    envIntensity: window.__lab.scene.environmentIntensity,
    terrain: {
      color: '#' + m.color.getHexString(),
      roughness: m.roughness,
      metalness: m.metalness,
      mapColorSpace: m.map?.colorSpace,
      vertexColors: m.vertexColors,
      mapImage: m.map?.image ? { w: m.map.image.width, h: m.map.image.height } : null,
    },
  };
});
console.log(JSON.stringify(data, null, 1));
await browser.close();
