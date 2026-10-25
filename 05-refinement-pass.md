# 05 — Fast Refinement Pass

**Date:** 2026-10-25
**Base:** the existing `bulkhead-visual-lab` build (no restart, no new research cycle).
**Goal:** restore the best earlier ground/material qualities, fix the lighting and composition, bring back the solar array, rebuild the stairs, remove the background artifact, and add camera life + zoom.

## Latest hotfix / second pass

- Removed the blue horizon haze sprite. Fog is now neutral dark (`0x080a0d`, 100–900 m) so the sky/horizon stays black and lunar.
- Raised the cutaway camera (`y 5.6 → 7.6`, target `y 3.0`, fov 42) so more of the cabin floor and all four bays are visible.
- Added **drag-to-orbit** around the current target (clamped yaw ±0.8 rad, pitch −0.35…0.42), with the hint `DRAG TO ORBIT`. Scene changes reset the orbit. Wheel/Z zoom remains.
- Fixed the live-loop crash: `const fov` → `let fov` in `camera.js`.
- Stronger ground normal (`repeat 9`, `normalScale 0.62`) and ceramic normal (`0.62`) plus a lower-hull dust gradient. Solar is visible in ANALYZE.

---

## Summary

This pass keeps the current scene architecture and makes eight focused changes:

1. Rebuilt the regolith surface (darker, mottled, micro-detailed, no snow).
2. Replaced the hull material maps with a richer ceramic set (mottling, seams, rivets, roughness/normal).
3. Moved the key light to the camera side so the habitat face is lit and the shadow falls behind it.
4. Added a subtle idle camera drift and FOV breathing.
5. Added a restrained linear fog for atmospheric depth.
6. Removed the artificial ridge walls and a stray floating solar bracket.
7. Restored the 2×3 solar array as an installed, integrated object.
8. Rebuilt the airlock stairs as one complete assembly, and added wheel/Z zoom-out.

Final capture: **no console errors**. Build passes.

---

## 1. Ground / regolith

The earlier ground read as a flat, bright surface; the intermediate fix over-corrected into stipple. This pass rebuilds the albedo and the shading.

- `src/textures/regolith.js`: albedo base lowered to roughly **62–84 grey**, with broad tone drift, darker patches, crater bowls/rims and fine grain. Normal map rebuilt at three bands (6 / 26 / 48 cycles), roughness raised to ~236 ± 12.
- `src/world/terrain.js`: material color set to **white** so the map controls tone (the material tint was previously fighting the texture); roughness **1.0**, `envMapIntensity 0.3`, normal repeat **6**, normalScale **0.34**.
- The terrain shader now samples three world-space tones (≈320 m / 24 m / 1.8 m) for large-scale breakup, mid mottling and near-field variation.
- Vertex tone is **0.84 ± 0.09** (was a high-contrast 0.55 ± 0.21), so the plain reads as a continuous surface rather than patches.
- The near berm is forced to a regolith tone (it previously had vertex colors enabled with no color attribute and rendered white).
- 320 extra path/pad pebbles were added, and the general pebble scatter was pushed outside the immediate habitat footprint to keep the base clean.

**Result:** the hero and wide shots now show a dark, mottled, cratered plain with fine surface detail and long shadows; the snow-like read is gone.

Screenshots:

- Before: `shots/refine/terrain-before.png` (the previous build)
- After: `shots/final/1920/scene-1-exterior.png`, `shots/refine/exterior-new-wide.png`

---

## 2. Habitat materials

The hull was too clean and flat. It now uses a new ceramic map set:

- `src/textures/hull.js`: `ceramicAlbedoCanvas` (2048×1024) with base `#ddd9d0`, ±5% plate-to-plate tone, broad radial drift, grey seams (not black) with a light lip, rivet rows and small plate IDs.
- `ceramicRoughnessCanvas`: fBm drift 0.90 ± 0.08 with contact darkening at seams.
- `ceramicNormalCanvas`: plate steps, seam grooves, rivet domes, low orange-peel.
- `src/world/habitat.js`: ceramic material now **roughness 0.56, metalness 0.08, clearcoat 0.09, clearcoatRoughness 0.42, normalScale 0.34, envMapIntensity 0.34, specularIntensity 0.78**. The neck fairing clones the ceramic material instead of using a flat standard material.

The goal was a maintained matte ceramic with a soft sheen — not noisy grunge. The seams, rivets, hatches and stencils now read at hero and inspection distance, and the highlights are softer and more physical.

Screenshots: `shots/refine/habitat-after.png`, `shots/final/1920/scene-2-inspection.png`.

---

## 3. Lighting / shadows

The previous key sat behind/right of the habitat, so the front was in shadow and a large dark shape dominated the face.

- Key direction moved to **(-0.62, 0.25, 0.74)** — camera-side, front-left. The airlock face and near hull are lit; the shadow falls **behind/right**, away from the camera.
- Sun intensity **4.6**, exposure **1.0** (was 1.04) to recover the ceramic highlights.
- Earthshine fill **0.24**, cool rear rim **0.16**, hemisphere **0.18**; the shadow side stays cool but readable.
- Warm interior/door light reduced (spills 15/11/7 → 8/7/5, door 9 → 6) so the door is a warm accent, not a blown pool.

**Result:** the habitat reads front-lit with a clear terminator and the long shadow is pushed behind it. The warm door remains the only warm focal point.

---

## 4. Idle camera motion

`src/core/camera.js` now adds a time-based idle float even with no pointer input:

- position drift ±0.38 m / ±0.26 m horizontally and ≈0.05 m vertically,
- target drift ±0.14 m / ±0.05 m,
- FOV breathing ±0.12°.

Live-loop note: the first pass declared `fov` as `const` and then assigned to it, which crashed the unfrozen render loop and showed a black page. It is now `let`; verified with no console errors, live camera drift and wheel zoom.

It is disabled when `freeze=1`, so stills stay deterministic. The existing pointer parallax (±0.6°) remains.

---

## 5. Atmosphere / fog

A restrained linear fog was added in `main.js`:

```js
scene.fog = new THREE.Fog(0x0a0f16, 80, 850);
```

- The habitat at ~28 m is unaffected; the 80 m near plane keeps the foreground crisp.
- The distant regolith and crater rim fade into a cool blue-grey, adding depth and a soft horizon.
- The sky materials keep `fog:false`, so the black sky, stars and Earth remain clean.
- The fog is deliberately subtle; it reads as atmospheric depth, not weather.

---

## 6. Background cleanup

- Removed the 830 m, 1480 m and 2600 m `ridgeLayer` walls from `sky.js`. They produced a huge smooth dark fin/wall on the hero horizon. The authored crater rim and the far ground ring now carry the horizon.
- Removed a stray solar-array head bracket that read as a floating panel above the array.
- With those gone, the horizon is clean and intentional; no floating or malformed background geometry.

Screenshots: `shots/refine/exterior-new-wide.png`, `shots/final/1920/scene-1-exterior.png`.

---

## 7. Solar panels

The array is back as a proper installation, not a floating prop:

- 2 rows × 3 panels, each **2.38 × 1.08 m**, dark-blue cells with a silver grid, titanium frames and backsheets.
- 2.2 m mast, plinth/base plate with four anchors, junction box, wall socket and a cable conduit to the airlock.
- Positioned at local **(-14.6, -3.6)**, left of the airlock; angled to face the camera/sun so the cells read.
- Cell material is **matte** (roughness 0.62, metalness 0.15, clearcoat 0.08, envMapIntensity 0.3) so it does not blow out at other sun angles.
- Visible in the exterior and wide shots; intentionally hidden in the inspection and breach views so it does not block the airlock/stairs, and hidden in cutaway/analyze/design.

Screenshots: `shots/refine/exterior-new.png`, `shots/refine/exterior-new-wide.png`, `shots/refine/habitat-after.png`.

---

## 8. Stairs

The airlock access is now one assembly:

- 2.0 × 1.2 m landing at the door sill (y ≈ 2.155) with a titanium edge frame, graphite underplate, cross ribs, bolts and two knee braces to the drum.
- Two sloped stringers down to a lower pad, six 0.9 m treads with grip ribs, continuous handrails with posts and a lower landing pad with a skirt/frame.
- The foot height is derived from `terrainHeight` at the pad corners, so it sits on the regolith instead of floating.
- The previous floating treads, incomplete rails and missing supports are gone.

Screenshots: `shots/refine/stairs-after.png`, `shots/final/1920/scene-2-inspection.png`.

---

## 9. Zoom-out / wider view

- Mouse wheel now pulls the camera back along the view axis: `state.zoom` clamped **0.82–2.4×**, damped by the existing camera smoothing.
- `Z` toggles between the hero framing (1.0×) and a wide framing (1.7×).
- The HUD hint now reads **“DRAG TO LOOK · SCROLL TO ZOOM · 1-6 SCENES.”**
- The wide capture (`shots/refine/exterior-new-wide.png`, `zoom=1.55`) shows the broader lunar setting without losing the hero framing; the default remains the tight hero.

---

## Verification

**Build:** `npm run build` passes.
**Console:** no errors in the final capture run.

Final capture, 1920 × 1080:

| Scene | Draw calls | Triangles |
| --- | ---: | ---: |
| Exterior | 172 | 434,991 |
| Inspection | 152 | 427,393 |
| Cutaway | 85 | 438,241 |
| Breach | 185 | 436,207 |
| Analyze | 172 | 430,513 |
| Design | 114 | 10,841 |

Full sets: `shots/final/1920/` and `shots/final/1280/`, plus 1920 plates.

---

## Remaining weaknesses

1. The row of pale ballast stones at the hull base is bright; it reads as intentional ballast, but a darker tone would blend better.
2. The face-on airlock door is still a large grey disc inside a wide white ring; the 3/4 inspection is the strongest view.
3. Several foreground boulders remain low-poly.
4. Draw calls are 172–185 in the lunar scenes (target ~160); a static merge pass is still worthwhile.
5. FPS was not measured on a real GPU; the capture harness is frozen.
6. The solar array is intentionally absent from the inspection/breach views; the wide/exterior carries it.

---

## Files changed

- `src/world/terrain.js`, `src/world/sky.js`, `src/world/props.js`, `src/textures/regolith.js`
- `src/world/habitat.js`, `src/textures/hull.js`
- `src/main.js`, `src/core/camera.js`, `src/core/state.js`, `src/core/composer.js`
- `src/ui/overlay.js`
- `scripts/refine-capture.mjs`

**Shots:** `shots/refine/` (working), `shots/final/` (authoritative).
