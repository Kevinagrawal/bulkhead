import * as THREE from 'three';

const params = new URLSearchParams(location.search);

function num(name, fallback) {
  const v = parseFloat(params.get(name));
  return Number.isFinite(v) ? v : fallback;
}

const requestedScene = (params.get('scene') || 'exterior').toLowerCase();
const aliases = {
  '5a': 'analyze',
  '5b': 'design',
  modes: 'analyze',
  exterior: 'exterior',
  inspection: 'inspection',
  cutaway: 'cutaway',
  breach: 'breach',
  analyze: 'analyze',
  design: 'design',
};

export const state = {
  scene: aliases[requestedScene] || 'exterior',
  frozen: params.get('freeze') === '1',
  t: Math.min(1, Math.max(0, num('t', 0.35))),
  ui: params.get('ui') !== '0',
  mode: params.get('mode') || 'live',
  time: 0,
  dt: 0,
  intro: params.get('intro') === '0' || params.get('freeze') === '1' ? false : true,
  showStats: params.get('stats') === '1',
  fps: 0,
  width: 1,
  height: 1,
  pointer: new THREE.Vector2(0, 0),
  pointerSmooth: new THREE.Vector2(0, 0),
  orbit: { yaw: 0, pitch: 0 },
  dragging: false,
  // 1 = authored hero framing; >1 pulls the camera back along the view axis
  zoom: Math.min(2.4, Math.max(0.82, num('zoom', 1))),
};

// Long-form camera rails. Positions are metres, FOV is vertical degrees.
// Each preset returns a pose for rail parameter t and ambient time.
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const presets = {
  exterior: {
    duration: 46,
    fov: [36.0, 35.2],
    pos: (t) => V(-12.0 + t * 1.2, 5.9 + Math.sin(t * Math.PI) * 0.04, 28.0),
    target: (t) => V(-5.0, 4.1, 0.0),
    drift: 0.3,
  },
  inspection: {
    duration: 38,
    fov: [36.0, 35.0],
    // world-space airlock: local (-10.85, 3.3, 0) rotated by HABITAT_YAW
    pos: (t) => V(-14.0 + t * 0.4, 3.8, 11.5 - t * 0.2),
    target: (t) => V(-9.4, 3.4, 5.4),
    drift: 0.12,
  },
  cutaway: {
    duration: 38,
    fov: [42, 41.2],
    pos: (t) => V(-2.6 + t * 0.8, 7.6, 16.2 - t * 0.2),
    target: (t) => V(0.3, 3.0, 0.0),
    drift: 0.2,
  },
  breach: {
    duration: 30,
    fov: [42, 40.6],
    pos: (t) => V(7.0 + t * 0.6, 4.8, 22.0 - t * 0.5),
    target: (t) => V(-4.0, 3.6, 2.0),
    drift: 0.1,
  },
  analyze: {
    duration: 40,
    fov: [38, 37.0],
    pos: (t) => V(-20.0 + t * 1.2, 10.0, 29.5 - t * 0.4),
    target: (t) => V(-6.2, 4.6, 0.0),
    drift: 0.3,
  },
  design: {
    duration: 40,
    fov: [23.5, 22.5],
    pos: (t) => V(-26 + t * 1.2, 18, 28 - t * 0.5),
    target: (t) => V(-2.0, 4.2, 0),
    drift: 0.1,
  },
};

export function scenePreset(name) {
  return presets[name] || presets.exterior;
}

export const SCENE_ORDER = ['exterior', 'inspection', 'cutaway', 'breach', 'analyze', 'design'];

// One-shot camera overrides for art-direction stills: only honoured when frozen.
function overrideNumber(name) {
  const v = parseFloat(params.get(name));
  return Number.isFinite(v) ? v : null;
}
const camNums = ['cx', 'cy', 'cz', 'tx', 'ty', 'tz', 'fov'].map(overrideNumber);
export const cameraOverride =
  params.get('freeze') === '1' && camNums.every((v) => v !== null)
    ? {
        pos: new THREE.Vector3(camNums[0], camNums[1], camNums[2]),
        target: new THREE.Vector3(camNums[3], camNums[4], camNums[5]),
        fov: camNums[6],
      }
    : null;

export const SCENE_LABEL = {
  exterior: 'LIVE',
  inspection: 'LIVE',
  cutaway: 'DESIGN',
  breach: 'LIVE',
  analyze: 'ANALYZE',
  design: 'DESIGN',
};

// Camera rail anchors authored in habitat-local space (pre-rotation).
export const HABITAT_YAW = 0.52;
export const AIRLOCK = new THREE.Vector3(-9.45, 2.9, 0);
export const HULL_CENTER = new THREE.Vector3(0, 3.12, 0);
export const BREACH = new THREE.Vector3(-1.7, 3.55, 3.18);

export function habitatToWorld(v, out = new THREE.Vector3()) {
  const c = Math.cos(HABITAT_YAW);
  const s = Math.sin(HABITAT_YAW);
  return out.set(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
}

export const HABITAT_ROT = HABITAT_YAW;



















