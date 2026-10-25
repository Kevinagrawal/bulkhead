# Screenshot Index

All stills are captured at device scale 1, `intro=0`, `freeze=1`, `t=0.4`, unless noted.

## Final set — authoritative

`final/1920/` — 1920×1080, UI on:

| File | Scene |
| --- | --- |
| `scene-1-exterior.png` | Establishing shot, habitat + crater rim + airlock |
| `scene-2-inspection.png` | Raking 3/4 of the airlock and hull |
| `scene-3-cutaway.png` | Four-bay architectural section |
| `scene-4-breach.png` | Emergency medium shot, vent + red beacon + decision card |
| `scene-5a-analyze.png` | Cyan pressure network + data panel |
| `scene-5b-design.png` | Exploded studio + module schedule |

`final/1920/plate-*.png` — the same six scenes with the UI hidden (`ui=0`).

`final/1280/` — the same six scenes at 1280×720, UI on.

Reproduce with:

```bash
npm run dev
node scripts/final-capture.mjs
```

## Refinement pass — current look

`refine/` contains the working before/after frames from the fast refinement pass:

- `exterior-new.png` — refined hero (front-lit, solar, stairs, dark regolith).
- `exterior-new-wide.png` — `zoom=1.55` wide view.
- `inspection-new.png` — 3/4 airlock/stairs/material detail.
- `habitat-after.png` — ceramic maps + solar array.
- `stairs-after.png` — complete stair assembly.
- `terrain-before.png` — the previous bright/smooth ground for comparison.
- `row-*.png`, `no-props.png`, `ground-probe.png` — diagnostics; not portfolio frames.

The final set in `final/1920` and `final/1280` is captured from the refined build and supersedes the earlier stills.

## Round 1 — first milestone

`round-1/1920/` and `round-1/1280/` — the first accepted scaffold, merge fix and composition. These are historical: the habitat, camera and ground changed substantially afterwards. Useful for comparison, not for judging the current build.

Representative early frames:

- `round-1/1920/cam-A.png` … `cam-G.png` — composition candidates.
- `round-1/1920/check-hero.png` — first visible white hull.
- `round-1/1920/re-B.png` — airlock rebuild.
- `round-1/1920/landscape-check.png` — crater plain and long shadows.
- `round-1/1920/foreground-check.png` — rocks and path.
- `round-1/1920/cut-tight.png` — cutaway detail.
- `round-1/1920/breach-primary.png` — breach reframe.
- `round-1/1920/hatch-closeup.png` — door hardware.

## Diagnostics

`check/` contains working frames and probes, not portfolio shots:

- `check/design.png` — first successful exploded studio.
- `check/exterior.png` — final airlock/door state.
- `check/analyze.png`, `check/cutaway.png` — mode checks.
- `check/ground-probe.png`, `hide-inner.png`, `hide-berm.png` — regolith diagnostics used to isolate the near-white ground mesh.

## Notes

- The 1920 and 1280 images are raw PNG screenshots from headless Edge with GPU flags; no post-resize or retouching.
- The refined final set has no console errors and 172 / 152 / 85 / 185 / 172 / 114 draw calls for exterior / inspection / cutaway / breach / analyze / design.
- The grain is from the in-engine grade pass, not added in capture.
- `shots/round-1` images predate the final design mode and the late habitat simplification. The final set is the only set that represents the shipped prototype.
