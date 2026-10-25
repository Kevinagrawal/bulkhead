import * as THREE from 'three';
import { HULL } from './habitat.js';
import { habitatToWorld } from '../core/state.js';

function haloTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(180,240,255,0.9)');
  g.addColorStop(0.3, 'rgba(127,212,239,0.35)');
  g.addColorStop(1, 'rgba(127,212,239,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

export function createAnalyze() {
  const group = new THREE.Group();
  group.name = 'analyze-overlay';
  const R = 3.37;
  const CY = HULL.cy;
  const cyan = 0x7fd4ef;

  // 5 circumferential rings + 8 longitudinal lines, thin line geometry
  const positions = [];
  for (const x of [-6, -3, 0, 3, 6]) {
    const seg = 64;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      positions.push(x, CY + Math.sin(a0) * R, Math.cos(a0) * R);
      positions.push(x, CY + Math.sin(a1) * R, Math.cos(a1) * R);
    }
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const y = CY + Math.sin(a) * R;
    const z = Math.cos(a) * R;
    positions.push(-7.8, y, z, 7.8, y, z);
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: cyan,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const wire = new THREE.LineSegments(lineGeo, lineMat);
  wire.renderOrder = 4;
  group.add(wire);

  // node topology
  const nodes = [
    new THREE.Vector3(-9.7, 3.35, 2.12),
    new THREE.Vector3(-4.5, CY, 3.4),
    new THREE.Vector3(0.5, CY, 3.4),
    new THREE.Vector3(5.5, CY, 3.4),
  ];
  const nodeLineGeo = new THREE.BufferGeometry().setFromPoints(nodes);
  const nodeLine = new THREE.Line(
    nodeLineGeo,
    new THREE.LineBasicMaterial({
      color: cyan,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  group.add(nodeLine);

  const sphereMat = new THREE.MeshBasicMaterial({ color: cyan, toneMapped: false });
  const sphereGeo = new THREE.SphereGeometry(0.08, 12, 8);
  const haloMat = new THREE.SpriteMaterial({
    map: haloTexture(),
    color: cyan,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  nodes.forEach((n, i) => {
    const dot = new THREE.Mesh(sphereGeo, sphereMat);
    dot.position.copy(n);
    group.add(dot);
    const halo = new THREE.Sprite(haloMat.clone());
    halo.material.opacity = i === 1 ? 0.65 : 0.4;
    halo.position.copy(n);
    halo.scale.setScalar(i === 1 ? 0.7 : 0.5);
    group.add(halo);
  });

  // LAB pressure contour
  const labPts = [];
  const labR = 3.41;
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    labPts.push(new THREE.Vector3(-1.7, CY + Math.sin(a) * labR, Math.cos(a) * labR));
  }
  const labLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(labPts),
    new THREE.LineBasicMaterial({
      color: cyan,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  labLine.renderOrder = 4;
  group.add(labLine);

  // sweeping scan plane
  const scanMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(cyan) },
      uOpacity: { value: 0.12 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float a = uOpacity
          * smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x)
          * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const scanPlane = new THREE.Mesh(new THREE.PlaneGeometry(8, 7), scanMat);
  scanPlane.rotation.y = Math.PI / 2;
  scanPlane.position.set(-9, 3.5, 0);
  scanPlane.renderOrder = 3;
  group.add(scanPlane);

  const worldNodes = nodes.map((n) => habitatToWorld(n));

  return {
    group,
    nodes,
    worldNodes,
    update(time, active) {
      group.visible = active;
      if (!active) return;
      const phase = (time / 12) % 1;
      scanPlane.position.x = -9 + phase * 17;
      scanMat.uniforms.uOpacity.value = 0.1 + Math.sin(time * 0.8) * 0.015;
    },
  };
}
