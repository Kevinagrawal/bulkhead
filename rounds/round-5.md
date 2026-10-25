# Round 5 — DESIGN mode, integration, final set

**Goal:** deliver the fifth scene, wire it into the real-time app, and produce a coherent final capture set at both resolutions.
**Date:** 2026-10-24 / 25

## Reference study

- Igloo's exploded-object and detail scenes: a clean studio object, one accent, a dark field, labels that behave like annotations rather than UI cards.
- Technical axonometric drawings: modules separated along one axis, dashed assembly lines, a grid, dimensions, a legible schedule.
- The BULKHEAD brief: DESIGN should feel like the habitat is being edited, not merely observed.

## The eight biggest weaknesses found

1. DESIGN was the exterior with dimension lines; the exploded modules did not exist in the running scene.
2. The design camera was low and close; the far end cropped.
3. The design group was not imported or added to the scene.
4. Even when created, the render loop re-showed the habitat every frame, so DESIGN always fell back to the exterior.
5. The studio lights were not isolated from the lunar sun; the modules would have been double-lit.
6. The design UI had no metrics panel (hatches, crew, volume, mass, egress comparison).
7. The habitat was rewritten late and lost detail: the layered airlock, canopy, panel hardware and landing quality regressed.
8. The regolith remained too bright and the berm white attribute issue persisted until the end.

## Changes

- Built `src/world/design.js`: four exploded module shells (AIRLOCK / LAB / CREW / ECLSS), a separate service spine with radiator fins and cupola, a solar bank, dashed connectors, cyan cut rings, a 1 m/5 m grid, a contact pad, and a studio key/fill/rim/ambient rig.
- Wired the group into `main.js`, added the 23.5° design camera, hid the lunar terrain/props/sky/sun/hemisphere/earthshine in DESIGN, and fixed the render-loop visibility override that was re-showing the habitat.
- Added the DESIGN DOM panel: hatches, crew, volume, dry mass, a 2-hatch vs 4-hatch egress comparison, module list and revision tag.
- Updated the design callouts to the new world-space module anchors and replaced the old hull dimensions.
- Enlarged the airlock pressure door from 1.88 m to 2.24 m and scaled the wheel, latches, porthole and light bar; replaced the heavy visor with a compact light bar.
- Made the access hatches flush curved ceramic panels instead of grey boxes.
- Reduced the seam bands from near-black hoops to thin graphite seams.
- Fixed the near-berm vertex-colour bug; darkened the regolith and rocks again.
- Re-captured all six scenes at 1920×1080 and 1280×720 plus 1920 plates; no console errors.

## Screenshots

Final set:

- `shots/final/1920/scene-1-exterior.png`
- `shots/final/1920/scene-2-inspection.png`
- `shots/final/1920/scene-3-cutaway.png`
- `shots/final/1920/scene-4-breach.png`
- `shots/final/1920/scene-5a-analyze.png`
- `shots/final/1920/scene-5b-design.png`
- the same six in `shots/final/1280/`
- `shots/final/1920/plate-*.png` (UI hidden)

Working evidence:

- `shots/check/design.png` — first successful exploded studio.
- `shots/check/exterior.png` — final airlock/door state.
- `shots/check/ground-probe.png`, `hide-inner.png` — regolith diagnostics.

## Harsh critique

DESIGN is the strongest **product** scene in the lab: the modules read as an exploded pressure vessel, the grid and cyan edges are coherent, and the schedule panel feels like a real tool rather than a HUD. The airlock door enlargement and flush hatches improved the exterior, and the warm door finally reads as the human focal point.

But this round also contains the **biggest regression**: the late habitat rewrite simplified the exterior. The earlier layered hatch, canopy, landing, panel hardware and cupola detail were reduced to a cleaner but plainer 380-line model. The exterior is more robust and better proportioned than the first build, but it is less rich than the Round 2–3 version. That is a production compromise, not an artistic win.

The regolith is still too bright. It reads as snow in the establishing and inspection shots. The diagnosis (the terrain mesh is the surface; the berm was white; the material colour is not producing the expected value) is documented in `03-build-notes.md`, but the calibration was not solved.

The close-up hatch is still a large door inside a large ring; the hardware reads at 3/4, not face-on. The rocks are low-poly and bright. Draw calls rose to 165–182 in the lunar scenes (target 160), and FPS was not measured on real hardware.

## Next focus

1. **Regolith calibration** — start from measured Apollo albedo, set the material/tonemap first, then the texture; do not add more normal noise.
2. **Restore habitat detail** — bring back the layered airlock, canopy, panel frames and a proper cupola on top of the current clean model.
3. **Foreground quality** — replace the low-poly rock library with 4–6 sculpted, smooth-shaded variants and a proper dark near-left anchor.
4. **Interior light** — lift the CREW/ECLSS liner and practicals; the cutaway should read without callouts.
5. **Draw-call merge** — static trim and rocks into fewer merged/instanced draws.
6. **Transition/audio polish** — finish the intro seam and add a restrained mode transition.
