import * as THREE from 'three';
import { mulberry32 } from '../textures/procedural.js';
import { HABITAT_YAW, habitatToWorld } from '../core/state.js';
import { HULL } from './habitat.js';

function softSprite(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

function frostTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const rnd = mulberry32(3319);
  ctx.translate(size / 2, size / 2);
  for (let i = 0; i < 120; i++) {
    const a = rnd() * Math.PI * 2;
    const len = size * (0.1 + rnd() * 0.36);
    ctx.strokeStyle = `rgba(215,238,255,${0.04 + rnd() * 0.24})`;
    ctx.lineWidth = 0.6 + rnd() * 4.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * len * 0.2, Math.sin(a) * len * 0.2);
    ctx.lineTo(Math.cos(a + (rnd() - 0.5) * 0.18) * len, Math.sin(a + (rnd() - 0.5) * 0.18) * len);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, size * 0.2);
  g.addColorStop(0, 'rgba(240,252,255,0.95)');
  g.addColorStop(0.35, 'rgba(206,232,248,0.27)');
  g.addColorStop(1, 'rgba(190,215,235,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function createParticles() {
  const group = new THREE.Group();
  group.name = 'particles';

  const breachLocal = new THREE.Vector3(-1.7, HULL.cy - 0.04, HULL.radius - 0.02);
  const breachWorld = habitatToWorld(breachLocal);
  const normal = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), HABITAT_YAW);
  const rnd = mulberry32(22117);

  const COUNT = 90;
  const dirs = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const speeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const spread = 0.04 + rnd() * 0.16;
    const a = rnd() * Math.PI * 2;
    const d = new THREE.Vector3(
      Math.cos(a) * spread,
      Math.sin(a) * spread + 0.1,
      0
    )
      .multiplyScalar(1)
      .add(normal.clone().multiplyScalar(0.85 + rnd() * 0.4))
      .normalize();
    dirs[i * 3] = d.x;
    dirs[i * 3 + 1] = d.y;
    dirs[i * 3 + 2] = d.z;
    seeds[i] = rnd();
    speeds[i] = 0.35 + rnd() * 0.55;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  geo.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

  const sprite = new THREE.CanvasTexture(softSprite());
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOrigin: { value: breachWorld },
      uSprite: { value: sprite },
      uScale: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aDir;
      attribute float aSeed;
      attribute float aSpeed;
      uniform float uTime;
      uniform vec3 uOrigin;
      varying float vAlpha;
      varying float vSeed;
      void main() {
        float life = fract(aSeed + uTime * aSpeed * 0.11);
        vec3 p = uOrigin + aDir * (life * 2.6 + 0.015);
        p.y += sin(uTime * 0.7 + aSeed * 12.0) * 0.04 * life;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.4 + life * 1.2) * (140.0 / max(1.0, -mv.z));
        vAlpha = (1.0 - life) * smoothstep(0.0, 0.10, life) * 0.5;
        vSeed = aSeed;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uSprite;
      varying float vAlpha;
      varying float vSeed;
      void main() {
        vec4 s = texture2D(uSprite, gl_PointCoord);
        float a = s.a * vAlpha;
        vec3 c = mix(vec3(0.66, 0.84, 1.0), vec3(0.92, 0.97, 1.0), vSeed);
        gl_FragColor = vec4(c * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const plume = new THREE.Points(geo, mat);
  plume.frustumCulled = false;
  group.add(plume);

  // frost ring around the puncture
  const frost = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.6),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(frostTexture()),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.32,
      toneMapped: false,
    })
  );
  frost.position.copy(breachWorld);
  frost.position.add(normal.clone().multiplyScalar(0.015));
  frost.rotation.y = HABITAT_YAW;
  group.add(frost);

  // puncture itself
  const puncture = new THREE.Mesh(
    new THREE.CircleGeometry(0.006, 12),
    new THREE.MeshBasicMaterial({ color: 0x05070a })
  );
  puncture.position.copy(breachWorld);
  puncture.position.add(normal.clone().multiplyScalar(0.03));
  puncture.rotation.y = HABITAT_YAW;
  group.add(puncture);

  // bright puncture rim + red warning marker
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.022, 0.004, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0xd8e6f0 })
  );
  rim.position.copy(breachWorld).add(normal.clone().multiplyScalar(0.025));
  rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  group.add(rim);
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.062, 24),
    new THREE.MeshBasicMaterial({
      color: 0xff4d33,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  marker.position.copy(breachWorld).add(normal.clone().multiplyScalar(0.02));
  marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  group.add(marker);

  // narrow high-velocity jet cone
  const coneGeo = new THREE.ConeGeometry(0.6, 2.8, 24, 1, true);
  const coneMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xbcd8f0) },
      uIntensity: { value: 0.15 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float edge = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        float along = pow(vUv.y, 2.0);
        float a = uIntensity * edge * along;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const jet = new THREE.Mesh(coneGeo, coneMat);
  jet.position.copy(breachWorld).add(normal.clone().multiplyScalar(1.4));
  jet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.clone().negate());
  // bright jet core + hole glow
  const coreGeo = new THREE.CylinderGeometry(0.035, 0.008, 1.6, 10, 1, true);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xdfefff,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.copy(breachWorld).add(normal.clone().multiplyScalar(0.8));
  core.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  group.add(core);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sprite,
      color: 0xcfe7ff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.position.copy(breachWorld).add(normal.clone().multiplyScalar(0.12));
  glow.scale.setScalar(0.32);
  group.add(glow);
  group.add(jet);

  // thin red pressure contour around the LAB bay
  const ringGeo = new THREE.TorusGeometry(3.4, 0.006, 4, 72);
  ringGeo.rotateY(Math.PI / 2);
  ringGeo.translate(-1.7, HULL.cy, 0);
  ringGeo.rotateY(HABITAT_YAW);
  const pressureRing = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({
      color: 0xff4d33,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    })
  );
  group.add(pressureRing);

  // small red beacon near the airlock
  const beaconPos = habitatToWorld(new THREE.Vector3(-5.6, 4.8, 3.2));
  const beaconHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.12, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x1a0c08, roughness: 0.6, metalness: 0.4 })
  );
  beaconHousing.position.copy(beaconPos);
  group.add(beaconHousing);
  const beaconMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3b22 })
  );
  beaconMesh.position.copy(beaconPos).add(new THREE.Vector3(0, 0, 0.07));
  group.add(beaconMesh);
  const beaconLight = new THREE.PointLight(0xff3b22, 0, 5, 2);
  beaconLight.position.copy(beaconPos).add(new THREE.Vector3(0, 0, 0.2));
  group.add(beaconLight);

  // emergency light at the breach
  const red = new THREE.PointLight(0xff3b22, 0, 18, 2);
  red.position.copy(breachWorld).add(normal.clone().multiplyScalar(0.7));
  red.position.y -= 0.2;
  group.add(red);

  // a few dust motes in the air near the lock, very low contrast
  const MOTES = 90;
  const mPos = new Float32Array(MOTES * 3);
  const mSeed = new Float32Array(MOTES);
  for (let i = 0; i < MOTES; i++) {
    mPos[i * 3] = (rnd() - 0.5) * 18;
    mPos[i * 3 + 1] = 0.4 + rnd() * 4.2;
    mPos[i * 3 + 2] = 2 + rnd() * 9;
    mSeed[i] = rnd();
  }
  const mGeo = new THREE.BufferGeometry();
  mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
  mGeo.setAttribute('aSeed', new THREE.BufferAttribute(mSeed, 1));
  const moteMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSprite: { value: sprite } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      varying float vA;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.05 + aSeed * 9.0) * 0.9;
        p.y += sin(uTime * 0.037 + aSeed * 5.0) * 0.35;
        p.z += cos(uTime * 0.043 + aSeed * 7.0) * 0.7;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.1 + aSeed * 1.4) * (13.0 / max(1.0, -mv.z));
        vA = 0.10 * smoothstep(42.0, 14.0, -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vA;
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.84) * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const motes = new THREE.Points(mGeo, moteMat);
  motes.frustumCulled = false;
  group.add(motes);

  return {
    group,
    plume,
    frost,
    puncture,
    red,
    motes,
    breachWorld,
    normal,
    jet,
    pressureRing,
    update(time, active, emergency = 0) {
      mat.uniforms.uTime.value = time;
      moteMat.uniforms.uTime.value = time;
      plume.visible = active;
      frost.visible = active;
      puncture.visible = active;
      rim.visible = active;
      marker.visible = active;
      jet.visible = active;
      core.visible = active;
      glow.visible = active;
      pressureRing.visible = active;
      beaconHousing.visible = active;
      beaconMesh.visible = active;
      const pulse = state_pulse(time, emergency);
      red.intensity = active ? 1.5 + pulse * 1.2 : 0;
      red.visible = active;
      beaconLight.intensity = active ? 1.6 + pulse * 1.2 : 0;
      beaconLight.visible = active;
    },
  };
}

let state_pulse = (time, e) => 0.4 + Math.sin(time * 1.2) * 0.35;





