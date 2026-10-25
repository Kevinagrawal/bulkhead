import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const MODULES = [
  { id: '01', name: 'AIRLOCK', x: -13.0, r: 2.06, len: 2.4 },
  { id: '02', name: 'LAB', x: -7.0, r: 3.34, len: 3.6 },
  { id: '03', name: 'CREW', x: -1.0, r: 3.34, len: 3.6 },
  { id: '04', name: 'ECLSS', x: 4.6, r: 3.34, len: 3.0 },
];
const CY = 4.0;

function gridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 1024, 1024);
  for (let i = 0; i <= 40; i++) {
    const p = (i / 40) * 1024;
    const major = i % 5 === 0;
    x.strokeStyle = major ? 'rgba(89,170,198,0.34)' : 'rgba(43,96,112,0.28)';
    x.lineWidth = major ? 2 : 1;
    x.beginPath(); x.moveTo(p, 0); x.lineTo(p, 1024); x.stroke();
    x.beginPath(); x.moveTo(0, p); x.lineTo(1024, p); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function contactTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 126);
  g.addColorStop(0, 'rgba(0,0,0,0.9)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.5)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  return t;
}

function cyanLine(points, opacity = 0.55) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.Line(geo, new THREE.LineBasicMaterial({
    color: 0x8fe6ff, transparent: true, opacity, toneMapped: false,
  }));
}

function ringLine(r, x, opacity = 0.6) {
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push(new THREE.Vector3(x, CY + Math.cos(a) * (r + 0.012), Math.sin(a) * (r + 0.012)));
  }
  return cyanLine(pts, opacity);
}

function dashed(a, b, color = 0x6fc6de) {
  const g = new THREE.BufferGeometry().setFromPoints([a, b]);
  const line = new THREE.Line(g, new THREE.LineDashedMaterial({
    color, transparent: true, opacity: 0.45, dashSize: 0.24, gapSize: 0.18,
  }));
  line.computeLineDistances();
  return line;
}

export function createDesign(tex) {
  const group = new THREE.Group();
  group.name = 'design-studio';
  const lights = new THREE.Group();
  lights.name = 'design-lights';

  const ceramic = new THREE.MeshPhysicalMaterial({
    map: tex.panelMap,
    normalMap: tex.panelNormal,
    normalScale: new THREE.Vector2(0.16, 0.16),
    color: 0xf2efe6,
    roughness: 0.52,
    metalness: 0.05,
    clearcoat: 0.18,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.28,
  });
  const inner = new THREE.MeshStandardMaterial({ color: 0x262c30, roughness: 0.8, metalness: 0.3 });
  const insideWhite = new THREE.MeshStandardMaterial({ color: 0xb9b6ad, roughness: 0.65, metalness: 0.08 });
  const seam = new THREE.MeshStandardMaterial({ color: 0x20262b, roughness: 0.55, metalness: 0.55 });
  const titanium = new THREE.MeshStandardMaterial({ color: 0xa6adb3, roughness: 0.34, metalness: 0.9 });
  const cell = new THREE.MeshStandardMaterial({
    map: tex.solar, color: 0x9fb4c8, roughness: 0.55, metalness: 0.15, envMapIntensity: 0.25,
  });
  const warm = new THREE.MeshBasicMaterial({ color: 0xffb373, toneMapped: false });
  const warmGlow = new THREE.MeshBasicMaterial({
    color: 0xff9c56, transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false,
  });

  // grid floor + pad + contact shadow
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshBasicMaterial({
      map: gridTexture(), transparent: true, opacity: 0.85,
      depthWrite: false, toneMapped: false,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  group.add(floor);
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(13, 96),
    new THREE.MeshBasicMaterial({ color: 0x060a0d, transparent: true, opacity: 0.9, depthWrite: false })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(-4, 0.012, 0);
  group.add(pad);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 17),
    new THREE.MeshBasicMaterial({
      map: contactTexture(), transparent: true, opacity: 0.75, depthWrite: false, color: 0x000000,
    })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(-4, 0.03, 1.5);
  group.add(contact);

  // modules
  const moduleAnchors = [];
  for (const m of MODULES) {
    const g = new THREE.Group();
    const shell = new THREE.CylinderGeometry(m.r, m.r, m.len, 72, 1, true);
    shell.rotateZ(-Math.PI / 2);
    shell.translate(m.x, CY, 0);
    const shellMesh = new THREE.Mesh(shell, ceramic);
    shellMesh.castShadow = true;
    shellMesh.receiveShadow = true;
    g.add(shellMesh);

    const half = m.len / 2;
    for (const s of [-1, 1]) {
      const ex = m.x + s * half;
      const ann = new THREE.RingGeometry(m.r - 0.14, m.r, 72, 1);
      const am = new THREE.Mesh(ann, ceramic);
      am.rotation.y = Math.PI / 2;
      am.position.set(ex, CY, 0);
      am.castShadow = true;
      g.add(am);
      const band = new THREE.CylinderGeometry(m.r + 0.012, m.r + 0.012, 0.1, 72, 1, true);
      band.rotateZ(-Math.PI / 2);
      band.translate(ex - s * 0.05, CY, 0);
      g.add(new THREE.Mesh(band, seam));
      g.add(ringLine(m.r, ex));
    }

    // interior silhouette: floor, a tank, and a rack
    const floorIn = new THREE.Mesh(new THREE.BoxGeometry(m.len - 0.4, 0.1, m.r * 1.25), inner);
    floorIn.position.set(m.x, CY - m.r * 0.48, 0);
    floorIn.castShadow = true;
    g.add(floorIn);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.5, 20), insideWhite);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(m.x + half * 0.2, CY - m.r * 0.1, -m.r * 0.38);
    g.add(tank);
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.0, 0.7), insideWhite);
    rack.position.set(m.x - half * 0.3, CY - m.r * 0.32, m.r * 0.25);
    g.add(rack);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(m.len * 0.6, 0.04, 0.12), warm);
    strip.position.set(m.x, CY + m.r * 0.62, 0);
    g.add(strip);

    // warm window on the camera side
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.22, 28), warm);
    win.position.set(m.x + half * 0.32, CY + 0.55, m.r + 0.015);
    g.add(win);
    const winHalo = new THREE.Mesh(new THREE.CircleGeometry(0.34, 28), warmGlow);
    winHalo.position.set(m.x + half * 0.32, CY + 0.55, m.r + 0.012);
    g.add(winHalo);
    const winRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 8, 28), titanium);
    winRing.position.set(m.x + half * 0.32, CY + 0.55, m.r + 0.04);
    g.add(winRing);

    group.add(g);
    moduleAnchors.push({ ...m, p: new THREE.Vector3(m.x, CY + m.r + 0.9, 0) });
  }

  // dashed assembly connectors
  for (let i = 0; i < MODULES.length - 1; i++) {
    const a = MODULES[i];
    const b = MODULES[i + 1];
    group.add(dashed(
      new THREE.Vector3(a.x + a.len / 2 + 0.15, CY, 0),
      new THREE.Vector3(b.x - b.len / 2 - 0.15, CY, 0)
    ));
  }

  // service spine, exploded upward
  const spineY = 9.3;
  const spine = new RoundedBoxGeometry(5.5, 1.4, 0.62, 3, 0.08);
  const spineMesh = new THREE.Mesh(spine, ceramic);
  spineMesh.position.set(-4.0, spineY, 0);
  spineMesh.castShadow = true;
  spineMesh.receiveShadow = true;
  group.add(spineMesh);
  const spineEdge = cyanLine([
    new THREE.Vector3(-6.75, spineY + 0.7, 0.0),
    new THREE.Vector3(-1.25, spineY + 0.7, 0.0),
  ], 0.7);
  group.add(spineEdge);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 1.5), ceramic);
    fin.position.set(-6.3 + i * 0.55, spineY + 1.0, -0.1);
    fin.rotation.x = -0.24;
    fin.castShadow = true;
    group.add(fin);
  }
  const cupola = new THREE.Mesh(new THREE.SphereGeometry(0.56, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), ceramic);
  cupola.position.set(-2.3, spineY + 0.7, 0.0);
  cupola.castShadow = true;
  group.add(cupola);
  const cupolaGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0x0a1116, roughness: 0.05, clearcoat: 1, metalness: 0,
      transparent: true, opacity: 0.6, depthWrite: false, envMapIntensity: 1.4,
    })
  );
  cupolaGlass.position.set(-2.3, spineY + 0.72, 0.0);
  group.add(cupolaGlass);
  const spineTag = cyanLine([
    new THREE.Vector3(-6.75, spineY - 0.7, 0.0),
    new THREE.Vector3(-1.25, spineY - 0.7, 0.0),
  ], 0.35);
  group.add(spineTag);

  // solar bank, exploded left/up
  const bank = new THREE.Group();
  bank.position.set(-19.0, 6.7, -1.0);
  bank.rotation.y = 0.25;
  for (let i = 0; i < 3; i++) {
    const panel = new THREE.Group();
    const cells = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.15, 0.06), cell);
    cells.castShadow = true;
    panel.add(cells);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.52, 1.27, 0.03), seam);
    frame.position.z = -0.045;
    panel.add(frame);
    panel.position.set(0, i * 1.42, 0);
    panel.rotation.x = -0.32;
    bank.add(panel);
  }
  group.add(bank);
  group.add(dashed(new THREE.Vector3(-19, 6.7, -1.0), new THREE.Vector3(-14.2, 8.9, 0), 0x6fc6de));

  // studio lights
  const key = new THREE.DirectionalLight(0xfff4e8, 2.2);
  key.position.set(-18, 26, 14);
  key.target.position.set(-4, 4, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -24;
  key.shadow.camera.right = 24;
  key.shadow.camera.top = 22;
  key.shadow.camera.bottom = -14;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 90;
  key.shadow.radius = 4;
  key.shadow.bias = -0.0004;
  lights.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xa9c9e8, 0.9);
  fill.position.set(16, 11, -8);
  lights.add(fill);
  const rim = new THREE.DirectionalLight(0xffbf8c, 0.6);
  rim.position.set(-8, 7, -20);
  lights.add(rim);
  const ambient = new THREE.AmbientLight(0x24313a, 0.6);
  lights.add(ambient);

  moduleAnchors.push({ p: new THREE.Vector3(-4.0, spineY + 1.7, 0), name: 'SERVICE SPINE' });

  return { group, lights, anchors: moduleAnchors, moduleAnchors };
}
