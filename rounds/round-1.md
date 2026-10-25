# Round 1 — Scaffold, merge fix, first composition

**Goal:** stand up a clean visual lab and get the first honest hero frame.
**Date:** 2026-10-24

## Reference study

- `research/igloo/shots/igloo-intro-1920.png`, `igloo-cube-1920.png`.
- `bulkhead-vision/01-igloo-technical-breakdown.md` (compositor, MSDF UI, baked lighting, restraint).
- The existing Field Instrument study was reviewed only to identify what not to repeat: soft fill, flat ground, a long tube with a giant glowing hatch.

The lesson taken into the first build: **one hero, negative space, slow camera, narrow palette.** The lunar inversion: black sky, hard sun, one warm door.

## The six biggest weaknesses found

1. The ceramic hull merged to an empty scene — only the gold spine and solar panels rendered. Root cause: indexed/non-indexed geometry and missing UVs in `mergeGeometries`.
2. The camera sat almost on the hull axis: the far cap was a giant cropped disc and the airlock was hidden behind a mound.
3. The ceramic read as a brown barrel, not white pressure hardware.
4. The ground was a tan dune field with a high-frequency ripple pattern.
5. Stars bloomed into large bokeh balls; Earth was too large and glowed.
6. There was no foreground and no horizon event: the habitat sat on a smooth plane.

## Changes

- Added `src/world/merge.js`: every part is normalised (non-indexed, position/normal/uv, missing attributes filled, bounds computed), failures logged. Hull confirmed visible.
- Rebuilt the camera as authored rails with damping, pointer parallax and a frozen still mode.
- Removed tiled stencil/grunge from the ceramic tile; moved to a nearly flat white panel map, thin seams, two real decal planes.
- Replaced the bullseye far cap with a plain dished plate and one access panel.
- Reduced star size/brightness below the bloom threshold; shrank Earth.
- Added a camera-override URL API (`cx,cy,cz,tx,ty,tz,fov`) so composition could be tested in one capture pass.

## Screenshots

- `shots/round-1/1920/cam-A.png` … `cam-G.png` — the first composition candidates.
- `shots/round-1/1920/check-hero.png` — hull visible, new white material.
- `shots/round-1/1920/scene-1-exterior.png` — first accepted exterior.
- `shots/round-1/1280/scene-1-exterior.png` — 1280 milestone.
- `shots/round-1/1920/check-hatch.png` — first close-up of the new hatch.

## Harsh critique

The frame was still a **product render on a flat plane**, not a place. The airlock was a giant white face with a dark hole and a small glowing window. The hull had no believable grounding. The ground was a stippled carpet. The solar array read as a pile of white cards. The camera was better but still too high and too far; the habitat was small and centred, with no foreground anchor.

The most damaging single thing: **the airlock end read as a jet engine**, not a pressure door.

## Next focus

Rebuild the airlock end as a welded neck + designed pressure door, ground the hull in a berm, and replace the brown service spine with a real equipment silhouette. Camera and terrain were deferred to Round 3.
