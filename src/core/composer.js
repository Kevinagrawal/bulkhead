import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { state } from './state.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uExposure: { value: 1.0 },
    uSaturation: { value: 0.94 },
    uVignette: { value: 0.32 },
    uGrain: { value: 0.04 },
    uAberration: { value: 0.0007 },
    uCool: { value: 0 },
    uContrast: { value: 1.08 },
    uRes: { value: new THREE.Vector2(1920, 1080) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uExposure;
    uniform float uSaturation;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    uniform float uCool;
    uniform float uContrast;
    uniform vec2 uRes;
    varying vec2 vUv;

    vec3 aces(vec3 x) {
      const float a = 2.51;
      const float b = 0.03;
      const float c = 2.43;
      const float d = 0.59;
      const float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    vec3 toSRGB(vec3 c) {
      return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0001)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    }

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float edge = smoothstep(0.18, 0.85, length(c) * 1.42);
      vec2 ca = c * uAberration * edge;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - ca).b;

      col *= uExposure;
      col = aces(col);
      col = toSRGB(col);

      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      // cool shadow / warm highlight split tone
      col += vec3(-0.004, 0.004, 0.016) * (1.0 - smoothstep(0.0, 0.42, l));
      col += vec3(0.020, 0.008, -0.010) * smoothstep(0.38, 0.96, l);
      col += vec3(-0.012, 0.0, 0.022) * uCool * (1.0 - smoothstep(0.0, 0.5, l));
      // filmic contrast around a low pivot keeps the blacks black
      col = (col - 0.5) * uContrast + 0.5;
      col = mix(vec3(l), col, uSaturation);
      // restrained shoulder so nothing clips to paper white
      col = mix(col, 1.0 - exp(-col * 1.35), 0.16);
      col = max(col, vec3(0.0));

      // vignette, lens-falloff not a circle
      vec2 vq = (uv - 0.5) * vec2(1.0, 0.82);
      float vig = smoothstep(0.28, 0.92, length(vq) * 1.28);
      col *= 1.0 - uVignette * vig;

      // static-under-freeze grain
      float g = hash(uv * uRes + vec2(uTime * 61.7, uTime * 37.3)) - 0.5;
      col += g * uGrain * (1.0 - 0.55 * smoothstep(0.35, 0.95, l));

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

export function createComposer(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    colorSpace: THREE.LinearSRGBColorSpace,
    samples: 0,
  });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(size.x, size.y);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.22, 0.64, 1.05);
  composer.addPass(bloom);

  const grade = new ShaderPass(GradeShader);
  grade.uniforms.uRes.value.set(size.x, size.y);
  composer.addPass(grade);

  const smaa = new SMAAPass(size.x * renderer.getPixelRatio(), size.y * renderer.getPixelRatio());
  composer.addPass(smaa);

  const setSize = (w, h) => {
    composer.setSize(w, h);
    grade.uniforms.uRes.value.set(w, h);
    bloom.setSize(w, h);
  };

  const render = (t) => {
    grade.uniforms.uTime.value = t;
    composer.render();
  };

  const setAnalyze = (on) => {
    grade.uniforms.uSaturation.value = on ? 0.55 : 0.94;
    grade.uniforms.uExposure.value = on ? 0.94 : 1.0;
    grade.uniforms.uCool.value = on ? 1 : 0;
    bloom.strength = on ? 0.18 : 0.22;
  };
  const setDesign = (on) => {
    grade.uniforms.uSaturation.value = on ? 0.82 : 0.94;
    grade.uniforms.uExposure.value = on ? 1.0 : 1.0;
    grade.uniforms.uCool.value = on ? 0.35 : 0;
    bloom.strength = on ? 0.15 : 0.22;
  };
  return { composer, renderPass, bloom, grade, smaa, setSize, render, setAnalyze, setDesign };
}








