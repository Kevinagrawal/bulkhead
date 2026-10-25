import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Normalise a set of geometries so mergeGeometries() can never fail on
 * attribute or index mismatches: everything becomes non-indexed with exactly
 * position / normal / uv.
 */
function normalise(geo) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  const keep = new THREE.BufferGeometry();
  const pos = g.getAttribute('position');
  if (!pos) return null;
  keep.setAttribute('position', pos.clone());
  const nor = g.getAttribute('normal');
  if (nor) {
    keep.setAttribute('normal', nor.clone());
  } else {
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) arr[i * 3 + 1] = 1;
    keep.setAttribute('normal', new THREE.BufferAttribute(arr, 3));
  }
  const uv = g.getAttribute('uv');
  if (uv) {
    keep.setAttribute('uv', uv.clone());
  } else {
    keep.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2));
  }
  keep.morphAttributes = {};
  return keep;
}

export function mergeParts(list, name = 'merged') {
  const clean = [];
  for (let i = 0; i < list.length; i++) {
    const g = normalise(list[i]);
    if (!g) {
      console.error(`[bulkhead] merge ${name}: geometry ${i} has no position attribute`);
      continue;
    }
    clean.push(g);
  }
  if (!clean.length) {
    console.error(`[bulkhead] merge ${name}: nothing to merge`);
    return null;
  }
  const merged = mergeGeometries(clean, false);
  if (!merged) {
    console.error(`[bulkhead] merge ${name}: BufferGeometryUtils returned null (${clean.length} parts)`);
    return null;
  }
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  console.info(
    `[bulkhead] merge ${name}: ${clean.length} parts, ${merged.attributes.position.count} verts`
  );
  return merged;
}
