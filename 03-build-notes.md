# 03 — Build Notes

**Project:** `bulkhead-visual-lab/`
**Stack:** Vite 5.4 + vanilla Three.js r165 + DOM overlay. No React, no backend, no simulation.
**Status:** visual prototype; all interactions are mocked.
**Refined 2026-10-25:** the regolith, ceramic maps, key-light direction, solar array, stairs, fog, idle camera and zoom were updated. See `05-refinement-pass.md`; the performance table and controls below reflect the refined build.
**Run:** `npm install && npm run dev` → http://127.0.0.1:5179
**Build:** `npm run build` (passes; ~695 kB JS / 209 kB gzip, one chunk)
**Capture:** `node scripts/final-capture.mjs` (requires the dev server on 5179)

---

## 1. Why vanilla Three.js

The prototype needs full control over the plate: camera rails, a custom grade, scene-specific visibility and a deterministic still mode. React Three Fiber would add a reconciler and a second source of truth for a scene that is essentially one authored world. Vanilla Three.js plus a small DOM overlay is the shortest path to a controllable image.

The UI is DOM rather than MSDF (the Igloo approach) because:

- 9–11 px technical type stays crisp at any DPR.
- Copy is selectable and accessible.
- The overlay can be hidden with one selector for plate captures.
- Iteration on layout is CSS, not glyph geometry.

---

## 2. Folder map

```
bulkhead-visual-lab/
  index.html
  src/
    main.js                 scene graph, state machine, render loop
    style.css               HUD, typography, mode panels
    core/
      renderer.js           WebGLRenderer, ACES, shadows, DPR
      composer.js           RenderPass → Bloom → Grade → SMAA
      camera.js             authored rails, damping, pointer parallax
      state.js              URL params, scene presets, habitat transform
    world/
      terrain.js            graded heightfield, far ring, berm
      sky.js                stars, Milky Way, Earth, ridge layers
      habitat.js            HULL-04 exterior, airlock, spine, radiators
      interior.js           four-bay section, cut faces, plinth
      props.js              boulders, pebbles, path, contact AO, glints
      particles.js          breach vent, frost, beacon
      analyze.js            wireframe, pressure nodes, scan plane
      design.js             exploded modules, grid, studio lights
    textures/
      procedural.js         canvas + noise helpers
      regolith.js           albedo / normal / roughness maps
      hull.js               panel, MLI, solar, grating, liner, decals
  scripts/
    final-capture.mjs       six scenes × 1920/1280 + plates
    check-design.mjs        fast exterior/design/analyze/cutaway check
    probe-*.mjs             material/light/visibility diagnostics
  shots/
    round-1/                 first milestone (1920 + 1280)
    final/                   final milestone (1920 + 1280)
    check/                   working probes and detail frames
  01-visual-research.md
  02-art-direction.md
  03-build-notes.md
  04-final-assessment.md
  rounds/round-1.md … round-5.md
```

---

## 3. Render pipeline

`src/core/renderer.js`:

- WebGL2, `antialias: false` (SMAA handles AA), `powerPreference: high-performance`.
- `ACESFilmicToneMapping`, exposure 1.04, `outputColorSpace = SRGBColorSpace`.
- PCF soft shadows, 4096 shadow map for the key; tight 60 m frustum around the habitat.
- DPR capped at 1.75.

`src/core/composer.js`:

1. `RenderPass` into a HalfFloat target.
2. `UnrealBloomPass` — threshold 1.05, strength 0.22, radius 0.64.
3. Custom `GradeShader` — manual ACES, lift/gamma/gain-style split tone, filmic contrast, saturation, vignette, grain, edge-only chromatic aberration.
4. `SMAAPass`.

The grade also owns the mode looks:

| Mode | Saturation | Exposure | Cool | Bloom |
| --- | --- | --- | --- | --- |
| LIVE / BREACH | 0.94 | 1.04 | 0 | 0.22 |
| ANALYZE | 0.55 | 0.94 | 1.0 | 0.18 |
| DESIGN | 0.82 | 1.00 | 0.35 | 0.15 |

`setAnalyze()` / `setDesign()` are called from `applyScene`; the design call wins when both are false/true appropriately.

---

## 4. Scene state

`src/core/state.js` owns:

- URL params: `scene`, `t`, `freeze`, `ui`, `intro`, `mode`, plus camera overrides.
- Six presets: `exterior`, `inspection`, `cutaway`, `breach`, `analyze`, `design`.
- Habitat yaw `0.52 rad`, airlock and hull anchors, `habitatToWorld()`.

`src/main.js` owns visibility:

| Scene | Visible |
| --- | --- |
| exterior / inspection | habitat, terrain, berm, props, sky, particles |
| cutaway | interior, cradles (off), terrain, sky |
| breach | habitat, terrain, sky, particles (breach on) |
| analyze | habitat + cyan overlay, terrain, sky |
| design | design group + studio lights, grid floor; lunar scene hidden |

**Important:** visibility is set both in `applyScene()` and every frame in the render loop. The render loop override was the reason DESIGN initially showed the real habitat; it now checks `current === 'design'` and hides the lunar lights, terrain, props and sky.

The design studio therefore runs on its own key/fill/rim/ambient lights, with the sun/hemisphere/earthshine hidden. This is why DESIGN reads as a dark studio rather than a lunar exterior.

---

## 5. Terrain

`src/world/terrain.js`

- Inner mesh: 500 m plane, 360 × 360 segments, radially graded so vertices are dense near the habitat.
- Far ring: 470 m → 4.2 km, 24 × 160, matched to the same height function.
- Height function: low-amplitude fbm + ridged noise + authored craters:
  - a large rim behind the habitat (saddle + jagged crest),
  - five mid-ground craters,
  - small foreground craters,
  - a flattened rounded-rectangle apron under the habitat,
  - a regolith berm along the near side.
- Material: neutral albedo texture, triplanar macro tint injected into `map_fragment`, sparkle roughness injection, fine normal map.
- The near berm is a separate curved ridge mesh; it had `vertexColors` enabled without a color attribute and rendered white. That was fixed by forcing `vertexColors = false` and a regolith tone.

**Refined:** the albedo was rebuilt to ~62–84 grey, the material tint set to white, `envMapIntensity` lowered to 0.3 and the biological/normal detail increased. The ground now reads as a dark mottled regolith rather than snow. The only bright residue is the pale ballast row at the hull base.

---

## 6. Habitat

`src/world/habitat.js` (rewritten late in the project, ~380 lines)

- Main hull: 3.34 m × 15.6 m open cylinder, flat far cap, four painted seam bands.
- Neck: 64-segment `LatheGeometry` from 3.34 m to 2.06 m — no flat bolted plate.
- Airlock: 2.06 m drum, 2.24 m pressure door, collar, six latches, handwheel, warm porthole, light bar, threshold, platform, treads, rails.
- Service spine: ceramic housing, gold MLI patch, four radiator fins, cupola with dark glass and warm ember, mast/dish/beacon.
- Access hatches: flush curved cylinder patches with thin dark gaskets, handles and hinges.
- Two stencils (`HAB-04`, `BULKHEAD`) and warning placards.
- Solar array: built as a separate `solar` group, shown in the exterior/wide scene and hidden in inspection/breach/cutaway/analyze/design to protect those compositions. DESIGN has its own studio bank.

**Regression note:** an earlier iteration had a much more detailed habitat (layered airlock hatch, canopy, landing, larger cupola, more panel hardware). A late rewrite simplified it to the current 380-line version while integrating the design mode. The simplified model is cleaner and more robust, but it lost surface detail and hatch proportion quality. The final assessment flags this explicitly.

---

## 7. Interior / cutaway

`src/world/interior.js`

- Half-cylinder liner (open toward +z), dark structural rings, raised floor, central walkway, cable tray.
- Three bulkhead partitions with rounded doorways: AIRLOCK / LAB / CREW / ECLSS.
- Bunks, lockers, galley counter, ECLSS tanks, ladder, hatch, two cyan displays, four warm practicals, one soft volumetric shaft.
- Cut face: titanium outer ring, warm liner ring, white ceramic skin strip, bright top edge.
- A dark plinth + two beams ground the section; a contact shadow keeps it from floating.
- Section callouts are DOM/SVG, 11 px, with scrims and a 0–5 m scale bar.

The section is readable at a glance, but the upper walls and CREW/ECLSS are still dark. The next pass should lift the liner and practicals rather than add furniture.

---

## 8. Analyze and design

`src/world/analyze.js`

- Five cyan rings + eight longitudinal lines around the hull, additive, opacity ~0.32.
- Four compartment nodes with halos, a thin connecting line, a LAB contour ring.
- A shader-soft scan plane sweeping every 12 s.
- The overlay panel lists four pressure nodes with sparklines and values.

`src/world/design.js`

- Four exploded module shells (AIRLOCK / LAB / CREW / ECLSS) on a cyan 1 m/5 m grid.
- A separate service-spine subassembly with radiator fins and cupola, offset upward.
- A solar bank offset left/up.
- Dashed assembly connectors, cyan cut-ring edges, dimension lines.
- A studio key/fill/rim/ambient rig, soft shadows, no lunar sun.
- The DOM design panel shows hatches, crew, volume, dry mass, a 2-hatch vs 4-hatch comparison, and the module list.

The design mode is the most "product" of the five scenes; it proves the DESIGN language better than the earlier labels-on-the-exterior version.

---

## 9. Deterministic stills

Every scene is URL-addressable and freezeable:

```
/?scene=exterior&t=0.4&freeze=1&ui=1&intro=0
/?scene=design&t=0.4&freeze=1&ui=0&intro=0
```

`freeze=1`:

- stops the clock and camera rail at `t`,
- disables pointer parallax and breathing,
- seeds the clock from `t`,
- stabilises the grade grain (time is frozen).

`window.__lab` exposes `setScene`, `setMode`, `setFrozen`, `setTime`, `stats`, `camera`, `renderer`, `scene`, `ready`.

Camera overrides (`cx,cy,cz,tx,ty,tz,fov`) were used during art direction and remain available when frozen.

`scripts/final-capture.mjs` captures all six scenes at 1920×1080 and 1280×720 plus 1920 plates, with console-error collection. The latest run reported **no console errors**.

---

## 10. Performance

Measured via `renderer.info` at 1920×1080, frozen:

| Scene | Draw calls | Triangles |
| --- | ---: | ---: |
| Exterior | 172 | 434,991 |
| Inspection | 152 | 427,393 |
| Cutaway | 85 | 438,241 |
| Breach | 185 | 436,207 |
| Analyze | 172 | 430,513 |
| Design | 114 | 10,841 |

The 160-draw-call target is missed in the exterior/breach/analyze; the model is split into many small meshes for art control. The next optimization is to merge static habitat trim and rocks into fewer instanced/merged draws. FPS was not measured reliably in headless Edge; the capture harness reports `fps: 0` because the scene is frozen. A real GPU run is required before quoting a frame rate.

---

## 11. Controls

- `1`–`6` — exterior, inspection, cutaway, breach, analyze, design.
- `Q W E R T Y` — same scenes.
- `Space` — freeze/unfreeze.
- `H` — toggle UI.
- Mouse wheel — zoom along the view axis (0.82–2.4×).
- `Z` — toggle hero / wide framing (1.0× / 1.7×).
- Pointer move — ±0.6° damped parallax; a subtle idle float runs when unfrozen.
- Top nav LIVE / ANALYZE / DESIGN.
- Breach decision card: "SEAL LAB–CREW" / "HOLD" (mock only).

The opening intro exists in `overlay.js` (wordmark + hairline + fade) but is disabled in capture and was not fully art-directed. It should be finished for the final demo.

---

## 12. Decisions and trade-offs

- **Procedural textures, no external assets.** Keeps the build small and the look controllable; costs texel density and realism.
- **Real-time shadows, not baked lightmaps.** Necessary for a moving camera; costs draw calls and shadow-map tuning.
- **DOM UI, not MSDF.** Crisper and more accessible; loses the "type blooms with the plate" effect. A later pass could add a very subtle CSS glow to the wordmark only.
- **Authored rails, not orbit.** Protects composition; reduces the sense of free exploration. DESIGN could offer a limited hand tool later.
- **Fake interactions.** Hatch, breach and mode changes are state changes, not simulation. Correct for this phase.
- **One accent per mode.** Keeps the UI legible and the image coherent.

---

## 13. Known gaps

1. Pale ballast row at the hull base — intentional-looking but brighter than ideal.
2. Close-up hatch proportion — the door is large but the face is still a big ring; the hardware reads best at 3/4.
3. Low-poly foreground boulders.
4. Draw calls above the 160 target in three scenes (172–185).
5. Solar intentionally hidden in inspection/breach to protect those compositions.
6. The intro and mode transitions are functional, not yet signature.
7. No audio, no touch input, no accessibility pass beyond semantic buttons.
8. FPS not measured on a real GPU.

These are documented rather than hidden; the prototype is meant to be a foundation, not a submission build.
