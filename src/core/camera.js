import * as THREE from 'three';
import { state, scenePreset, cameraOverride } from './state.js';

const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.preset = scenePreset(state.scene);
    this.name = state.scene;
    this.pose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 33 };
    this.current = {
      pos: new THREE.Vector3(-17.5, 6.3, 17.4),
      target: new THREE.Vector3(-6.4, 4.5, 0.3),
      fov: 33.6,
    };
    this.parallax = new THREE.Vector2();
    this.handheld = 0;
    this.snapNext = true;
  }

  setScene(name) {
    this.name = name;
    this.preset = scenePreset(name);
    this.snapNext = true;
  }

  /** Compute the authored pose for rail parameter t. */
  sample(t, time) {
    const p = this.preset;
    const tt = Math.min(1, Math.max(0, t));
    const e = easeInOutCubic(tt);
    const pos = p.pos(e);
    const target = p.target(e);
    let fov = THREE.MathUtils.lerp(p.fov[0], p.fov[1], e);
    if (state.frozen && cameraOverride) {
      this.pose.pos.copy(cameraOverride.pos);
      this.pose.target.copy(cameraOverride.target);
      this.pose.fov = cameraOverride.fov;
      return this.pose;
    }
    // subtle idle float: the shot breathes even with no pointer input
    if (!state.frozen) {
      const t = time;
      pos.x += Math.sin(t * 0.12 + 0.7) * 0.38;
      pos.z += Math.cos(t * 0.09 + 1.4) * 0.26;
      pos.y += (Math.sin(t * 0.17 + 0.2) + 0.5 * Math.sin(t * 0.07 + 1.9)) * 0.05;
      target.x += Math.sin(t * 0.1 + 2.1) * 0.14;
      target.y += Math.cos(t * 0.08 + 0.8) * 0.05;
      fov += Math.sin(t * 0.06 + 1.2) * 0.12;
    }
    // pointer parallax: 0.6 degrees maximum, applied as a target offset
    if (!state.frozen) {
      const yaw = this.parallax.x * THREE.MathUtils.degToRad(0.6);
      const pitch = this.parallax.y * THREE.MathUtils.degToRad(0.35);
      const dir = new THREE.Vector3().subVectors(target, pos);
      const dist = dir.length();
      const az = Math.atan2(dir.x, dir.z) + yaw;
      target.x = pos.x + Math.sin(az) * Math.cos(pitch) * dist;
      target.z = pos.z + Math.cos(az) * Math.cos(pitch) * dist;
      target.y = pos.y + Math.sin(pitch) * dist + (target.y - pos.y) * 0.35;
    }
    // drag-to-orbit around the current target (clamped, damped by the rig)
    if (state.orbit.yaw !== 0 || state.orbit.pitch !== 0) {
      const off = new THREE.Vector3().subVectors(pos, target);
      const sph = new THREE.Spherical().setFromVector3(off);
      sph.theta += state.orbit.yaw;
      sph.phi = THREE.MathUtils.clamp(sph.phi + state.orbit.pitch, 0.16, Math.PI / 2 - 0.06);
      off.setFromSpherical(sph);
      pos.copy(target).add(off);
    }
    // wheel/key zoom: pull back along the current view axis, preserving framing
    if (state.zoom !== 1) {
      const back = new THREE.Vector3().subVectors(pos, target);
      pos.copy(target).addScaledVector(back, state.zoom);
    }
    this.pose.pos.copy(pos);
    this.pose.target.copy(target);
    this.pose.fov = fov;
    return this.pose;
  }

  update(dt, t) {
    const p = this.sample(t, state.time);
    const damp = 1 - Math.exp(-3.2 * dt);
    if (this.snapNext || state.frozen) {
      this.current.pos.copy(p.pos);
      this.current.target.copy(p.target);
      this.current.fov = p.fov;
      this.snapNext = false;
    } else {
      this.current.pos.lerp(p.pos, damp);
      this.current.target.lerp(p.target, damp);
      this.current.fov += (p.fov - this.current.fov) * damp;
    }
    const cam = this.camera;
    cam.position.copy(this.current.pos);
    cam.fov = this.current.fov;
    cam.lookAt(this.current.target);
    cam.updateProjectionMatrix();
    // pointer easing toward target
    const k = 1 - Math.exp(-2.4 * dt);
    this.parallax.lerp(state.pointer, k);
  }

  project(v3, camera) {
    const p = v3.clone().project(camera);
    return {
      x: (p.x * 0.5 + 0.5) * state.width,
      y: (-p.y * 0.5 + 0.5) * state.height,
      visible: p.z > -1 && p.z < 1,
    };
  }
}

