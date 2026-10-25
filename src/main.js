import './style.css';
import * as THREE from 'three';
import { createRenderer, resize } from './core/renderer.js';
import { createComposer } from './core/composer.js';
import { CameraRig } from './core/camera.js';
import { state, habitatToWorld, HABITAT_YAW, SCENE_ORDER } from './core/state.js';
import { createSky } from './world/sky.js';
import { createTerrain, createBerm } from './world/terrain.js';
import { createHabitat } from './world/habitat.js';
import { createInterior } from './world/interior.js';
import { createProps } from './world/props.js';
import { createParticles } from './world/particles.js';
import { createAnalyze } from './world/analyze.js';
import { createDesign } from './world/design.js';
import { Overlay, createIntro } from './ui/overlay.js';
import {
  makeCanvas,
  canvasTexture,
  mulberry32,
} from './textures/procedural.js';
import { makeRegolithMaps } from './textures/regolith.js';
import {
  panelAlbedoCanvas,
  cleanPanelNormalCanvas,
  mliNormalCanvas,
  mliAlbedoCanvas,
  decalAtlasCanvas,
  solarCanvas,
  gratingCanvas,
  pathCanvas,
  blastCanvas,
  linerCanvas,
} from './textures/hull.js';

const canvas = document.getElementById('stage');

function buildTextures() {
  const regolith = makeRegolithMaps();
  const decals = decalAtlasCanvas();

  const panelMap = canvasTexture(panelAlbedoCanvas(), { srgb: true, aniso: 8 });
  panelMap.repeat.set(1, 1);
  const panelNormal = canvasTexture(cleanPanelNormalCanvas(), { aniso: 8 });
  panelNormal.repeat.set(1, 1);

  const mliN = canvasTexture(mliNormalCanvas(), { aniso: 4 });
  mliN.repeat.set(2, 2);
  const mliA = canvasTexture(mliAlbedoCanvas(), { srgb: true, aniso: 4 });
  mliA.repeat.set(2, 2);

  const decalAtlas = canvasTexture(decals.canvas, { srgb: true, aniso: 8 });
  decalAtlas.wrapS = decalAtlas.wrapT = THREE.ClampToEdgeWrapping;

  const solar = canvasTexture(solarCanvas(), { srgb: true, aniso: 8 });
  solar.repeat.set(1, 1);
  const grating = canvasTexture(gratingCanvas(), { aniso: 4 });
  grating.repeat.set(12, 3.4);
  const path = canvasTexture(pathCanvas(), { srgb: true, aniso: 8 });
  path.wrapS = path.wrapT = THREE.ClampToEdgeWrapping;
  const blast = canvasTexture(blastCanvas(), { srgb: true, aniso: 4 });
  blast.wrapS = blast.wrapT = THREE.ClampToEdgeWrapping;
  const liner = canvasTexture(linerCanvas(), { srgb: true, aniso: 4 });
  liner.repeat.set(2, 1.4);

  return {
    regolith,
    panelMap,
    panelNormal,
    mliNormal: mliN,
    mliAlbedo: mliA,
    decalAtlas,
    decalRects: decals.rects,
    solar,
    grating,
    path,
    blast,
    liner,
  };
}

function envCanvas(sunDir) {
  const w = 1024;
  const h = 512;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#010206');
  g.addColorStop(0.46, '#05070c');
  g.addColorStop(0.5, '#20211f');
  g.addColorStop(0.58, '#5c5346');
  g.addColorStop(1, '#6b6255');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // hot sun spot in the equirect, low over the regolith
  const sa = Math.atan2(sunDir.z, sunDir.x) / (Math.PI * 2) + 0.5;
  const se = Math.asin(sunDir.y) / Math.PI + 0.5;
  const sx = sa * w;
  const sy = (1 - se) * h;
  const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 90);
  rg.addColorStop(0, 'rgba(255,246,228,1)');
  rg.addColorStop(0.08, 'rgba(255,240,216,0.8)');
  rg.addColorStop(0.5, 'rgba(210,190,160,0.12)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(sx - 90, sy - 90, 180, 180);
  return c;
}

async function init() {
  await document.fonts.ready;
  const tex = buildTextures();

  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33.6, window.innerWidth / window.innerHeight, 0.4, 12000);
  camera.position.set(-17.5, 6.3, 17.4);
  camera.lookAt(-6.4, 4.5, 0.3);

  const world = createComposer(renderer, scene, camera);
  const rig = new CameraRig(camera);

  // ---------- light ----------
  // camera-side key: the airlock face and near hull are lit; the shadow falls behind
  const sunDir = new THREE.Vector3(-0.62, 0.25, 0.74).normalize();
  const sun = new THREE.DirectionalLight(0xfff6ec, 4.6);
  sun.position.copy(sunDir).multiplyScalar(58);
  sun.target.position.set(-2.2, 2.2, 0);
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 140;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.055;
  sun.shadow.radius = 3.0;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0x14202c, 0x1a1814, 0.18);
  const bounce = new THREE.PointLight(0xffb26b, 3, 14, 2);
  bounce.position.set(-4, 0.7, 7);
  scene.add(bounce);
  scene.add(hemi);

  const earthShine = new THREE.DirectionalLight(0x9db8d8, 0.24);
  earthShine.position.set(-500, 150, 850);
  scene.add(earthShine);
  const rim = new THREE.DirectionalLight(0x9fb6d0, 0.16);
  rim.position.set(-1200, 500, -900);
  const bounceWarm = new THREE.DirectionalLight(0xffb26b, 0.06);
  bounceWarm.position.set(-300, -150, 900);
  scene.add(bounceWarm);
  scene.add(rim);

  // procedural environment for metal response
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envTex = new THREE.CanvasTexture(envCanvas(sunDir));
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  const envRT = pmrem.fromEquirectangular(envTex);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.4;
  // subtle stylised atmospheric depth; the habitat at ~28 m stays crisp
  scene.fog = new THREE.Fog(0x080a0d, 100, 900);
  pmrem.dispose();
  envTex.dispose();

  // ---------- world ----------
  const sky = createSky(sunDir);
  scene.add(sky.group);

  const terrain = createTerrain(tex.regolith);
  scene.add(terrain.group);
  const berm = createBerm(terrain.material.clone());
  scene.add(berm);

  const habitat = createHabitat(tex);
  const habitatRoot = new THREE.Group();
  habitatRoot.rotation.y = HABITAT_YAW;
  habitatRoot.add(habitat.root);
  scene.add(habitatRoot);

  const interior = createInterior(tex);
  interior.group.position.y = 0;
  habitatRoot.add(interior.group);

  // section cradles so the cutaway does not float
  const cradleMat = new THREE.MeshStandardMaterial({ color: 0x2c2e30, roughness: 0.7, metalness: 0.5 });
  const cradles = new THREE.Group();
  for (const cx of [-5.2, 5.2]) {
    for (const cz of [-2.2, 2.2]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.62, 0.55), cradleMat);
      box.position.set(cx, 0.31, cz);
      box.castShadow = true;
      box.receiveShadow = true;
      cradles.add(box);
    }
  }
  habitatRoot.add(cradles);

  const props = createProps(tex);
  scene.add(props.group);

  const particles = createParticles();
  scene.add(particles.group);

  const analyzeOverlay = createAnalyze();
  habitatRoot.add(analyzeOverlay.group);

  const design = createDesign(tex);
  scene.add(design.group);
  scene.add(design.lights);
  design.group.visible = false;
  design.lights.visible = false;
  const warmLights = [];
  scene.traverse((o) => {
    if (!(o.isPointLight || o.isSpotLight)) return;
    const hex = o.color.getHex();
    if (hex === 0xffb26b || hex === 0xffc394 || hex === 0xffa24a) {
      warmLights.push({ light: o, base: o.intensity });
    }
  });

  // ---------- UI ----------
  const overlay = new Overlay();
  overlay.build(camera);
  let intro = null;
  if (state.intro) {
    intro = createIntro();
  } else {
    const el = document.getElementById('intro');
    if (el) el.style.display = 'none';
  }
  if (!state.ui) {
    document.getElementById('ui').style.display = 'none';
  }

  // ---------- scene state ----------
  let current = null;
  const applyScene = (name) => {
    if (!SCENE_ORDER.includes(name)) name = 'exterior';
    state.scene = name;
    current = name;
    state.orbit.yaw = 0;
    state.orbit.pitch = 0;
    rig.setScene(name);
    const section = name === 'cutaway';
    const analyzing = name === 'analyze';
    const designing = name === 'design';
    habitat.group.visible = !section && !designing;
    interior.group.visible = section;
    cradles.visible = false;
    analyzeOverlay.group.visible = analyzing;
    // ground array is part of the lunar scene; it sits in front of the
    // airlock from the inspection angle, so that view keeps the entrance clear
    habitat.solar.visible = !(section || designing || name === 'inspection' || name === 'breach');
    terrain.group.visible = !designing;
    berm.visible = !designing;
    props.group.visible = !designing;
    sky.group.visible = !designing;
    design.group.visible = designing;
    design.lights.visible = designing;
    world.setAnalyze(analyzing);
    world.setDesign(designing);
    const solarMat = habitat.materials.solar;
    solarMat.color.setHex(0xffffff);
    solarMat.roughness = 0.62;
    warmLights.forEach(({ light, base }) => {
      light.intensity = analyzing ? base * 0.55 : base;
    });
    overlay.setScene(name);
  };
  applyScene(state.scene);

  // keep the habitat clear of the terrain in stills
  cradles.visible = false;

  // ---------- freeze / time ----------
  let clockTime = 0;
  if (state.frozen) {
    clockTime = 10 + state.t * 40;
  }

  const setFrozen = (v) => {
    state.frozen = !!v;
    if (state.frozen) clockTime = 10 + state.t * 40;
    rig.snapNext = true;
  };
  const setTime = (t) => {
    state.t = Math.min(1, Math.max(0, t));
    rig.snapNext = true;
    if (state.frozen) clockTime = 10 + state.t * 40;
  };
  const setScene = (name) => {
    applyScene(name);
    rig.snapNext = true;
    renderOnce();
  };
  const setMode = (mode) => {
    state.mode = mode;
    if (mode === 'analyze') applyScene('analyze');
    else if (mode === 'design') applyScene('design');
    else applyScene('exterior');
    rig.snapNext = true;
    renderOnce();
  };

  window.__lab = {
    ready: false,
    setScene,
    setMode,
    setFrozen,
    setTime,
    state,
    stats: { calls: 0, triangles: 0, fps: 0 },
    camera,
    renderer,
    scene,
  };

  // ---------- interaction ----------
  let dragStart = null;
  canvas.addEventListener('pointerdown', (e) => {
    dragStart = { x: e.clientX, y: e.clientY };
    state.dragging = true;
    canvas.setPointerCapture?.(e.pointerId);
  });
  window.addEventListener('pointerup', () => {
    dragStart = null;
    state.dragging = false;
  });
  window.addEventListener('pointercancel', () => {
    dragStart = null;
    state.dragging = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      state.orbit.yaw = Math.max(-0.8, Math.min(0.8, state.orbit.yaw - dx * 0.0045));
      state.orbit.pitch = Math.max(-0.35, Math.min(0.42, state.orbit.pitch + dy * 0.003));
      dragStart = { x: e.clientX, y: e.clientY };
    }
    state.pointer.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      (e.clientY / window.innerHeight) * 2 - 1
    );
    state.pointer.y *= -1;
  });
  window.addEventListener('pointerleave', () => state.pointer.set(0, 0));

  // wheel zoom: move back along the view axis without breaking the authored rails
  window.addEventListener('wheel', (e) => {
    if (state.frozen) return;
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    state.zoom = Math.min(2.4, Math.max(0.82, state.zoom + delta * 0.0009));
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const idx = parseInt(k, 10);
    if (idx >= 1 && idx <= SCENE_ORDER.length) {
      applyScene(SCENE_ORDER[idx - 1]);
      rig.snapNext = true;
    }
    const map = { q: 'exterior', w: 'inspection', e: 'cutaway', r: 'breach', t: 'analyze', y: 'design' };
    if (map[k]) {
      applyScene(map[k]);
      rig.snapNext = true;
    }
    if (k === ' ') {
      e.preventDefault();
      setFrozen(!state.frozen);
    }
    if (k === 'h') {
      state.ui = !state.ui;
      document.getElementById('ui').style.display = state.ui ? '' : 'none';
    }
    if (k === 'z') {
      state.zoom = state.zoom > 1.2 ? 1.0 : 1.7;
    }
  });

  window.addEventListener('resize', () => {
    resize(renderer, camera, world);
    rig.snapNext = true;
  });

  // ---------- render ----------
  let last = performance.now();
  let fpsAccum = 0;
  let fpsFrames = 0;
  let firstFrame = true;
  const statsEl = document.getElementById('stats');
  if (state.showStats) statsEl.hidden = false;

  const renderOnce = () => {
    renderer.info.reset();
    world.render(clockTime);
    const info = renderer.info.render;
    window.__lab.stats.calls = info.calls;
    window.__lab.stats.triangles = info.triangles;
    window.__lab.stats.fps = state.fps;
  };

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    if (!state.frozen) {
      clockTime += dt;
      fpsAccum += 1 / Math.max(0.0001, dt);
      fpsFrames++;
      if (fpsFrames >= 20) {
        state.fps = Math.round(fpsAccum / fpsFrames);
        fpsAccum = 0;
        fpsFrames = 0;
      }
    }

    const duration = rig.preset.duration;
    const railT = state.frozen ? state.t : 0.5 - 0.5 * Math.cos((clockTime / duration) * Math.PI * 2);
    state.time = clockTime;
    rig.update(dt, railT);

    const designing = current === 'design';
    interior.group.visible = current === 'cutaway';
    habitat.group.visible = current !== 'cutaway' && !designing;
    design.group.visible = designing;
    design.lights.visible = designing;
    terrain.group.visible = !designing;
    berm.visible = !designing;
    props.group.visible = !designing;
    sky.group.visible = !designing;
    sun.visible = !designing;
    hemi.visible = !designing;
    bounce.visible = !designing;
    earthShine.visible = !designing;
    rim.visible = !designing;
    bounceWarm.visible = !designing;
    particles.update(clockTime, current === 'breach');
    analyzeOverlay.update(clockTime, current === 'analyze');
    particles.group.visible = current !== 'cutaway' && !designing;

    overlay.update(camera);

    renderOnce();

    if (state.showStats) {
      statsEl.textContent = `${Math.round(state.fps)} FPS  ·  ${window.__lab.stats.calls} CALLS  ·  ${(window.__lab.stats.triangles / 1000).toFixed(0)}K TRIS`;
    }

    if (firstFrame) {
      firstFrame = false;
      window.__lab.ready = true;
      document.documentElement.dataset.ready = '1';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // expose a one-shot still for capture hand-off
  window.__lab.renderOnce = renderOnce;
  window.__lab.probe = (name) => {
    const points = {
      airlock: habitatToWorld(new THREE.Vector3(-10.3, 2.9, 0)),
      hullCenter: habitatToWorld(new THREE.Vector3(0, 3.7, 0)),
      hullFar: habitatToWorld(new THREE.Vector3(7.8, 4.4, 0)),
      breach: particles.breachWorld,
    };
    const p = points[name];
    if (!p) return null;
    const v = p.clone().project(camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  };
}

init().catch((err) => {
  console.error('[bulkhead] init failed', err);
  const el = document.getElementById('stats');
  if (el) {
    el.hidden = false;
    el.textContent = 'RENDER INIT FAILED: ' + err.message;
  }
});


























