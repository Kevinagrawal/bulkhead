# BULKHEAD — Visual Lab

A from-scratch, visual-only cinematic prototype for BULKHEAD.
Six authored scenes, one lunar habitat, one hard sun, one warm door.

**Status:** visual foundation, not a submission build. Backend and simulation are intentionally mocked.

**Latest:** a focused refinement pass restored the detailed regolith, richer ceramic maps, front-side key light, solar array, complete stairs, subtle fog, idle camera drift and wheel/Z zoom. See `05-refinement-pass.md`. The authoritative stills are in `shots/final/`.

---

## Run

```bash
npm install
npm run dev
```

Open **http://127.0.0.1:5179**.

```bash
npm run build     # production build
npm run preview   # serve the built app on 5179
```

The dev and preview servers both use port **5179**. If the port is busy, stop the other process or pass `-- --port 5180`.

---

## Scenes

| Key | Scene | What it is |
| --- | --- | --- |
| `1` / `Q` | `exterior` | Establishing shot: habitat, crater rim, long shadow, airlock. |
| `2` / `W` | `inspection` | Raking 3/4 of the airlock and hull materials. |
| `3` / `E` | `cutaway` | Four-bay architectural section on a plinth. |
| `4` / `R` | `breach` | Medium emergency shot: puncture, jet, red beacon, decision card. |
| `5` / `T` | `analyze` | Cyan pressure network, wireframe, scan, data panel. |
| `6` / `Y` | `design` | Exploded axonometric studio, grid, module schedule. |

Other controls:

- Drag / move pointer — damped parallax (±0.6°).
- Mouse wheel — zoom out / in along the view axis (0.82–2.4×).
- `Z` — toggle hero framing / wide framing (1.0× / 1.7×).
- `Space` — freeze / unfreeze.
- `H` — hide/show the UI.
- Top nav — LIVE / ANALYZE / DESIGN.

The camera also has a subtle idle float and FOV breathing when unfrozen; it is disabled by `freeze=1` so captures stay deterministic.

---

## Deterministic stills

Every scene is URL-addressable and freezeable:

```
/?scene=exterior&t=0.4&freeze=1&ui=1&intro=0
/?scene=breach&t=0.4&freeze=1&ui=1&intro=0
/?scene=design&t=0.4&freeze=1&ui=0&intro=0
```

Parameters:

- `scene` — `exterior`, `inspection`, `cutaway`, `breach`, `analyze`, `design`.
- `t` — 0…1 position on the camera rail.
- `freeze=1` — stops the clock, camera rail, breathing and pointer parallax; seeds the clock from `t`.
- `ui=0` — hides the HUD (plate capture).
- `intro=0` — skips the opening overlay.
- `cx,cy,cz,tx,ty,tz,fov` — one-shot camera override (honoured when frozen).

`window.__lab` exposes `ready`, `setScene`, `setMode`, `setFrozen`, `setTime`, `stats`, `camera`, `renderer`, `scene`.

---

## Capture

The final set is in `shots/final/`:

- `1920/scene-1-exterior.png` … `scene-5b-design.png`
- `1280/scene-1-exterior.png` … `scene-5b-design.png`
- `1920/plate-*.png` (UI hidden)

Reproduce it:

```bash
# in one terminal
npm run dev

# in another
node scripts/final-capture.mjs
```

The script uses headless Edge at:

`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`

Change `EDGE` in the script if your browser path differs. It waits for `window.__lab.ready`, freezes at `t=0.4`, waits 2.6 s, captures, and reports console errors.

`shots/round-1/` is the first milestone (both sizes). `shots/check/` contains working diagnostics and detail frames; some are intentionally experimental.

---

## Documents

- `01-visual-research.md` — Igloo study and what transfers.
- `02-art-direction.md` — the BULKHEAD visual identity.
- `03-build-notes.md` — architecture, pipeline, state, performance, controls.
- `rounds/round-1.md` … `round-5.md` — the five improvement rounds, with honest critiques.
- `04-final-assessment.md` — what improved, what is still weak, and whether this is a viable foundation.

---

## Stack

- Vite 5.4, vanilla Three.js r165.
- DOM HUD with IBM Plex Mono (SIL OFL; see `public/fonts/OFL.txt`).
- ACES tone mapping, UnrealBloom, custom grade, SMAA.
- Procedural terrain, textures, rocks, stars and habitat geometry. No external 3D assets.
- No copied Igloo assets, branding, models or shader code. The reference was used for technique and taste only.

---

## Known gaps (see `04-final-assessment.md` and `05-refinement-pass.md`)

1. The pale ballast row at the hull base is brighter than ideal.
2. The face-on airlock door is still a large ring with a door inside it.
3. Some foreground boulders remain low-poly.
4. Draw calls are 172–185 in the lunar scenes (target ~160); FPS was not measured on a real GPU.
5. The solar array is intentionally hidden in the inspection/breach views to keep those compositions clean.
6. The intro, transitions and audio are not finished.

Do not treat this lab as a backend or simulation reference. It is a visual foundation.
