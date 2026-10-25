import * as THREE from 'three';
import { state, habitatToWorld, SCENE_LABEL } from '../core/state.js';

const svgNS = 'http://www.w3.org/2000/svg';

const copy = {
  exterior: {
    hint: 'DRAG TO ORBIT  ·  SCROLL TO ZOOM  ·  1-6 SCENES',
    status: 'NOMINAL',
    statusClass: '',
    scenario: 'SCENARIO 03 / LAB MICROMETEOROID',
    clock: '17:36',
    clockLabel: 'TO P0₂  122 mmHg',
    clockFoot: 'LAB 101.3 kPa  /  1.0 cm HOLE',
    air: [239.4, 0.0, 239.4],
    clockColor: '',
  },
  inspection: {
    hint: 'ORBIT  ·  55 MM  ·  MATERIAL INSPECTION',
    status: 'NOMINAL',
    statusClass: '',
    scenario: 'DETAIL 02 / AIRLOCK DRUM',
    clock: '17:39',
    clockLabel: 'TO P0₂  122 mmHg',
    clockFoot: 'HATCH 101.3 kPa  /  SEAL 04-B',
    air: [239.4, 0.0, 239.4],
    clockColor: '',
  },
  cutaway: {
    hint: 'SECTION A–A  ·  FOUR COMPARTMENTS  ·  SCALE 1:50',
    status: 'DECISION REQUIRED',
    statusClass: 'is-warn',
    scenario: 'SCENARIO 03 / LAB MICROMETEOROID',
    clock: '17:36',
    clockLabel: 'TO P0₂  122 mmHg',
    clockFoot: 'LAB 101.3 kPa  /  1.0 cm HOLE',
    air: [239.4, 0.0, 239.4],
    clockColor: '',
  },
  breach: {
    hint: 'EMERGENCY PREVIEW  ·  HOLD TO VENT',
    status: 'HULL BREACH',
    statusClass: 'is-alert',
    scenario: 'SCENARIO 03 / LAB MICROMETEOROID',
    clock: '17:38',
    clockLabel: 'TO P0₂  38 mmHg',
    clockFoot: 'LAB 88.1 kPa ↓  /  1.0 cm HOLE',
    air: [178.2, 61.2, 178.2],
    clockColor: 'is-alert',
  },
  analyze: {
    hint: 'ANALYZE  ·  PRESSURE MODEL  ·  212 SOLS',
    status: 'ANALYZE',
    statusClass: 'is-cool',
    scenario: 'MODEL / 24 H PRESSURE',
    clock: '17:36',
    clockLabel: 'TO P0₂  122 mmHg',
    clockFoot: 'MODEL CONFIDENCE 0.94',
    air: [239.4, 0.0, 239.4],
    clockColor: '',
  },
  design: {
    hint: 'DESIGN  ·  MODULE SCHEDULE  ·  HAB-04',
    status: 'DESIGN',
    statusClass: 'is-cool',
    scenario: 'DESIGN / HAB-04 REV C',
    clock: '17:36',
    clockLabel: 'TO P0₂  122 mmHg',
    clockFoot: '16.0 M × 6.8 M  /  4 BAYS',
    air: [239.4, 0.0, 239.4],
    clockColor: '',
  },
};

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

export class Overlay {
  constructor(anchors) {
    this.root = document.getElementById('ui');
    this.anchors = anchors;
    this.camera = null;
    this.lastScene = null;
    this.built = false;
    this.svg = null;
    this.calloutEls = [];
    this.dimEls = [];
  }

  build(camera) {
    this.camera = camera;
    const root = this.root;
    root.innerHTML = '';
    root.appendChild(el('div', 'scanlines'));

    // corner ticks
    const ticks = el('div', 'ticks');
    for (const cls of ['tl', 'tr', 'bl', 'br']) ticks.appendChild(el('i', 'tick ' + cls));
    root.appendChild(ticks);

    // top left
    const tl = el('header', 'hud tl-hud');
    tl.appendChild(el('div', 'wordmark', 'BULKHEAD'));
    tl.appendChild(el('div', 'subline', 'LUNAR HABITAT 04&nbsp;&nbsp;/&nbsp;&nbsp;212 SOLS'));
    root.appendChild(tl);

    // top centre
    const nav = el('nav', 'hud nav');
    for (const [id, label] of [
      ['live', 'LIVE'],
      ['analyze', 'ANALYZE'],
      ['design', 'DESIGN'],
    ]) {
      const b = el('button', 'nav-item', label);
      b.dataset.nav = id;
      b.addEventListener('click', () => {
        const map = { live: 'exterior', analyze: 'analyze', design: 'design' };
        if (window.__lab) window.__lab.setScene(map[id]);
      });
      nav.appendChild(b);
    }
    root.appendChild(nav);

    // top right
    const tr = el('div', 'hud tr-hud');
    this.scenarioEl = el('div', 'scenario', '');
    const statusRow = el('div', 'status-row');
    this.dotEl = el('i', 'status-dot');
    this.statusEl = el('span', '', 'NOMINAL');
    statusRow.append(this.dotEl, this.statusEl);
    tr.append(this.scenarioEl, statusRow);
    root.appendChild(tr);

    // bottom left: air ledger
    const ledger = el('div', 'hud ledger');
    ledger.appendChild(el('div', 'ledger-head', 'AIR LEDGER&nbsp;&nbsp;/&nbsp;&nbsp;KG'));
    this.airRows = [];
    for (const [label, mode] of [
      ['AIR', ''],
      ['LOST', 'lost'],
      ['REMAIN', 'remain'],
    ]) {
      const row = el('div', 'ledger-row ' + mode);
      row.appendChild(el('span', 'ledger-label', label));
      const val = el('span', 'ledger-value', '0.0');
      row.appendChild(val);
      row.appendChild(el('span', 'ledger-unit', 'KG'));
      ledger.appendChild(row);
      this.airRows.push(val);
    }
    root.appendChild(ledger);

    // bottom right clock
    const clock = el('div', 'hud clock');
    this.clockLabel = el('div', 'clock-label', '');
    this.clockValue = el('div', 'clock-value', '17:36');
    this.clockFoot = el('div', 'clock-foot', '');
    clock.append(this.clockLabel, this.clockValue, this.clockFoot);
    root.appendChild(clock);

    // bottom centre hint
    this.hint = el('div', 'hud hint', '');
    root.appendChild(this.hint);

    // callout svg
    this.svg = document.createElementNS(svgNS, 'svg');
    this.svg.setAttribute('class', 'hud callout-svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    root.appendChild(this.svg);

    // callout labels
    this.calloutLayer = el('div', 'hud callout-labels');
    root.appendChild(this.calloutLayer);

    // cutaway decision-ish module rail (top-left under wordmark)
    this.sectionRail = el('div', 'hud section-rail');
    this.sectionRail.innerHTML = `
      <div class="rail-line"></div>
      <div class="rail-item"><span>A–A</span><span class="rail-rule"></span><span>PRESSURE SECTION</span></div>
      <div class="rail-item"><span>04</span><span class="rail-rule"></span><span>MODULES</span></div>
      <div class="rail-scale"><span>0</span><i></i><span>5 M</span></div>
    `;
    root.appendChild(this.sectionRail);

    // breach decision card
    const card = el('div', 'hud decision');
    card.innerHTML = `
      <div class="decision-head"><span>DECISION 01</span><span>/</span><span>LAB–CREW HATCH</span></div>
      <div class="decision-title">Seal the hatch.</div>
      <div class="decision-body">Two crew are on the wrong side. The hatch holds; the LAB vents.</div>
      <div class="decision-actions">
        <button class="btn primary">SEAL THE HATCH <span>↵</span></button>
        <button class="btn">KEEP IT OPEN</button>
      </div>
      <div class="decision-foot">SEAL 101.3 kPa  ·  2 CREW TRAPPED  ·  OPEN PRESSURE FALLS IN ALL BAYS</div>
    `;
    card.querySelector('.primary').addEventListener('click', () => {
      if (window.__lab) window.__lab.setScene('breach');
    });
    card.querySelectorAll('.btn')[1].addEventListener('click', () => {
      if (window.__lab) window.__lab.setScene('exterior');
    });
    root.appendChild(card);
    this.decisionCard = card;

    // analyze panel
    const panel = el('div', 'hud data-panel');
    panel.innerHTML = `
      <div class="an-head"><span>PRESSURE NETWORK</span><span>4 NODES</span></div>
      <div class="an-row">
        <span class="an-name">AIRLOCK</span>
        <svg class="an-spark" viewBox="0 0 64 16"><path d="M0 9 C 8 8, 12 10, 20 9 S 34 7, 42 8 S 56 7, 64 8" /></svg>
        <span class="an-val">101.3</span><span class="an-unit">kPa</span><i class="an-dot"></i>
      </div>
      <div class="an-row is-warn">
        <span class="an-name">LAB</span>
        <svg class="an-spark" viewBox="0 0 64 16"><path class="warn" d="M0 4 C 8 4, 10 5, 18 5 S 30 7, 38 8 S 52 11, 64 13" /></svg>
        <span class="an-val">88.1</span><span class="an-unit">kPa</span><i class="an-dot warn"></i>
      </div>
      <div class="an-row">
        <span class="an-name">CREW</span>
        <svg class="an-spark" viewBox="0 0 64 16"><path d="M0 8 C 8 8, 14 7, 22 8 S 36 9, 44 8 S 56 7, 64 8" /></svg>
        <span class="an-val">101.2</span><span class="an-unit">kPa</span><i class="an-dot"></i>
      </div>
      <div class="an-row">
        <span class="an-name">ECLSS</span>
        <svg class="an-spark" viewBox="0 0 64 16"><path d="M0 9 C 10 9, 16 8, 24 9 S 38 7, 46 8 S 58 8, 64 9" /></svg>
        <span class="an-val">101.3</span><span class="an-unit">kPa</span><i class="an-dot"></i>
      </div>
      <div class="an-legend">CONSERVED AIR / 239.4 KG</div>
    `;
    root.appendChild(panel);

    // design panel
    const dpanel = el('div', 'hud design-panel');
    dpanel.innerHTML = `
      <div class="dp-head"><span>HABITAT / REV C</span><span>4 MODULES</span></div>
      <div class="dp-metrics">
        <div><span>HATCHES</span><b>4</b></div>
        <div><span>CREW</span><b>4</b></div>
        <div><span>VOLUME</span><b>184<small>M³</small></b></div>
        <div><span>DRY MASS</span><b>12.4<small>T</small></b></div>
      </div>
      <div class="dp-compare">
        <div class="dp-row"><span>2 HATCH</span><i style="--w:82%"></i><b>38 MIN</b></div>
        <div class="dp-row is-good"><span>4 HATCH</span><i style="--w:24%"></i><b>11 MIN</b></div>
      </div>
      <div class="dp-list">
        <div><span>01</span><span>AIRLOCK</span><span>2.3 M</span></div>
        <div><span>02</span><span>LAB</span><span>3.6 M</span></div>
        <div><span>03</span><span>CREW</span><span>3.6 M</span></div>
        <div><span>04</span><span>ECLSS</span><span>3.0 M</span></div>
      </div>
      <div class="dp-foot">REV C&nbsp;&nbsp;/&nbsp;&nbsp;212 SOLS&nbsp;&nbsp;/&nbsp;&nbsp;4-BAY EGRESS</div>
    `;
    root.appendChild(dpanel);

    root.dataset.scene = state.scene;
    root.dataset.ui = state.ui ? 'on' : 'off';
    this.setScene(state.scene);
    this.built = true;
  }

  setScene(scene) {
    if (!this.built) return;
    const c = copy[scene] || copy.exterior;
    this.root.dataset.scene = scene;
    this.scenarioEl.textContent = c.scenario;
    this.statusEl.textContent = c.status;
    this.statusEl.className = c.statusClass;
    this.dotEl.className = 'status-dot ' + c.statusClass;
    this.clockLabel.textContent = c.clockLabel;
    this.clockValue.textContent = c.clock;
    this.clockValue.className = 'clock-value ' + (c.clockColor || '');
    this.clockFoot.textContent = c.clockFoot;
    this.hint.textContent = c.hint;
    const [air, lost, remain] = c.air;
    this.airRows[0].textContent = air.toFixed(1);
    this.airRows[1].textContent = lost.toFixed(1);
    this.airRows[2].textContent = remain.toFixed(1);
    this.root.querySelector('.ledger-row.lost').classList.toggle('is-alert', scene === 'breach');
    // active nav
    const label = SCENE_LABEL[scene] || 'LIVE';
    for (const b of this.root.querySelectorAll('.nav-item')) {
      b.classList.toggle('is-active', b.textContent === label);
    }
    this.buildCallouts(scene);
  }

  buildCallouts(scene) {
    this.svg.innerHTML = '';
    this.calloutLayer.innerHTML = '';
    this.calloutEls = [];
    this.dimEls = [];
    if (scene === 'cutaway') {
      const defs = [
        { p: habitatToWorld(new THREE.Vector3(-6.1, 4.5, 1.7)), label: 'AIRLOCK', sub: '2 CREW · 101.3 kPa', dx: -150, dy: -70 },
        { p: habitatToWorld(new THREE.Vector3(-2.6, 4.2, 2.0)), label: 'LAB', sub: '1.0 cm BREACH', dx: -160, dy: -130 },
        { p: habitatToWorld(new THREE.Vector3(1.7, 4.5, 2.0)), label: 'CREW', sub: '2 BUNKS · 4.1 m²', dx: 120, dy: -40 },
        { p: habitatToWorld(new THREE.Vector3(7.2, 6.2, 0.8)), label: 'ECLSS', sub: 'O₂ 21% · 41 kg', dx: -140, dy: -170 },
      ];
      defs.forEach((d, i) => this.addCallout(d, i));
    }
    if (scene === 'breach') {
      this.addCallout(
        {
          p: habitatToWorld(new THREE.Vector3(-1.7, 3.55, 3.18)),
          label: 'VENTING / 1.0 CM',
          sub: 'LAB 88.1 kPa ↓',
          dx: 78,
          dy: -104,
          alert: true,
        },
        0
      );
    }
    if (scene === 'analyze') {
      const nodes = [
        { x: -9.7, y: 3.35, z: 2.12, label: 'AIRLOCK', sub: '101.3 kPa', dx: -140, dy: -80, cool: true },
        { x: -4.5, y: 3.7, z: 3.4, label: 'LAB', sub: '88.1 kPa', dx: 60, dy: -120, alert: true },
        { x: 0.5, y: 3.7, z: 3.4, label: 'CREW', sub: '101.2 kPa', dx: 80, dy: 20, cool: true },
        { x: 5.5, y: 3.7, z: 3.4, label: 'ECLSS', sub: '101.3 kPa', dx: 40, dy: -150, cool: true },
      ];
      nodes.forEach((n, i) => this.addCallout({
        p: habitatToWorld(new THREE.Vector3(n.x, n.y, n.z)),
        label: n.label, sub: n.sub, dx: n.dx, dy: n.dy, cool: n.cool, alert: n.alert,
      }, i));
    }
    if (scene === 'design') {
      this.addDim(
        new THREE.Vector3(-14.2, 1.35, -2.6),
        new THREE.Vector3(6.1, 1.35, -2.6),
        '16.0 M PRESSURE HULL // 4 BAYS',
        58
      );
      this.addDim(
        new THREE.Vector3(6.1, 4.0, 0),
        new THREE.Vector3(6.1, 7.34, 0),
        'R 3.34 M',
        -62
      );
      this.addCallout({ p: new THREE.Vector3(-13, 6.1, 1.6), label: 'AIRLOCK', sub: '01 / 2.3 M', dx: -120, dy: -96 }, 0);
      this.addCallout({ p: new THREE.Vector3(-7, 7.84, 1.7), label: 'LAB', sub: '02 / 3.6 M', dx: -150, dy: -90 }, 1);
      this.addCallout({ p: new THREE.Vector3(-1, 7.84, 1.7), label: 'CREW', sub: '03 / 4 BUNKS', dx: 110, dy: -120 }, 2);
      this.addCallout({ p: new THREE.Vector3(4.6, 7.84, 1.7), label: 'ECLSS', sub: '04 / 3.0 M', dx: -170, dy: -50 }, 3);
      this.addCallout({ p: new THREE.Vector3(-4, 11.3, 0.5), label: 'SERVICE SPINE', sub: 'MLI / RADIATOR', dx: -210, dy: -40 }, 4);
    }
  }

  addCallout({ p, label, sub, dx, dy, alert, cool }, i) {
    const g = document.createElementNS(svgNS, 'g');
    const line = document.createElementNS(svgNS, 'path');
    line.setAttribute('class', 'leader');
    const cross = document.createElementNS(svgNS, 'path');
    cross.setAttribute('class', 'leader-cross');
    g.append(line, cross);
    this.svg.appendChild(g);
    const labelEl = el('div', 'callout' + (alert ? ' is-alert' : '') + (cool ? ' is-cool' : ''));
    labelEl.innerHTML = `<span class="callout-label">${label}</span><span class="callout-sub">${sub}</span>`;
    this.calloutLayer.appendChild(labelEl);
    this.calloutEls.push({ p, line, cross, labelEl, i, dx, dy });
  }

  addDim(a, b, label, offsetPx) {
    const g = document.createElementNS(svgNS, 'g');
    const line = document.createElementNS(svgNS, 'path');
    line.setAttribute('class', 'dim-line');
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('class', 'dim-text');
    text.textContent = label;
    g.append(line, text);
    this.svg.appendChild(g);
    this.dimEls.push({ a, b, line, text, offsetPx });
  }

  update(camera) {
    if (!this.built || !state.ui) return;
    this.camera = camera;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const scene = state.scene;
    const now = performance.now();
    // callouts, damped so they do not jitter on the camera rail
    this.calloutEls.forEach((c, idx) => {
      const v = c.p.clone().project(camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      const dir = idx % 2 === 0 ? -1 : 1;
      const lx = x + (c.dx ?? dir * 112);
      const ly = y + (c.dy ?? -88 - (idx % 3) * 24);
      const maxX = scene === 'design' ? Math.max(220, w - 350) : w - 190;
      const clampedX = Math.max(30, Math.min(maxX, lx));
      const clampedY = Math.max(110, Math.min(h - 120, ly));
      c.cross.setAttribute(
        'd',
        `M${x - 3.5} ${y} H${x + 3.5} M${x} ${y - 3.5} V${y + 3.5}`
      );
      c.line.setAttribute(
        'd',
        `M${x + 4} ${y} L${x + 26} ${y} L${clampedX - 12} ${clampedY + 8} L${clampedX} ${clampedY + 8}`
      );
      c.labelEl.style.transform = `translate(${clampedX + 4}px, ${clampedY}px)`;
      c.labelEl.style.opacity = v.z > -1 && v.z < 1 ? '1' : '0';
    });

    this.dimEls.forEach((d) => {
      const a = d.a.clone().project(camera);
      const b = d.b.clone().project(camera);
      const ax = (a.x * 0.5 + 0.5) * w;
      const ay = (-a.y * 0.5 + 0.5) * h;
      const bx = (b.x * 0.5 + 0.5) * w;
      const by = (-b.y * 0.5 + 0.5) * h;
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const ox = nx * d.offsetPx;
      const oy = ny * d.offsetPx;
      const a2x = ax + ox;
      const a2y = ay + oy;
      const b2x = bx + ox;
      const b2y = by + oy;
      d.line.setAttribute(
        'd',
        `M${ax} ${ay} L${a2x} ${a2y} M${b2x} ${b2y} L${bx} ${by} M${a2x} ${a2y} L${b2x} ${b2y}`
      );
      const mx = (a2x + b2x) / 2;
      const my = (a2y + b2y) / 2;
      d.text.setAttribute('x', mx);
      d.text.setAttribute('y', my - 7);
      d.text.setAttribute('text-anchor', 'middle');
    });
  }

  setVisible(on) {
    this.root.style.opacity = on ? '1' : '0';
    this.root.style.pointerEvents = on ? 'auto' : 'none';
  }
}

export function createIntro() {
  const intro = document.getElementById('intro');
  intro.innerHTML = `
    <div class="intro-inner">
      <div class="intro-rule"></div>
      <div class="intro-word">BULKHEAD</div>
      <div class="intro-line">LUNAR HABITAT 04&nbsp;&nbsp;/&nbsp;&nbsp;212 SOLS</div>
      <div class="intro-sub">HARD VACUUM CINEMA</div>
    </div>
    <div class="intro-skip">CLICK TO SKIP</div>
  `;
  intro.classList.add('is-on');
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    intro.classList.add('is-out');
    window.setTimeout(() => {
      intro.classList.remove('is-on');
      intro.style.display = 'none';
    }, 1200);
  };
  const timer = window.setTimeout(finish, 5200);
  const skip = () => {
    window.clearTimeout(timer);
    finish();
  };
  intro.addEventListener('click', skip);
  window.addEventListener('keydown', skip, { once: true });
  return { finish, skip };
}








