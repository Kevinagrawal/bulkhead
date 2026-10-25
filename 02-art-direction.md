# 02 — BULKHEAD Art Direction

**Working title:** *Hard Vacuum Cinema*
**Product frame:** a lunar field instrument that happens to be beautiful.
**One-line brief:** a white pressure vessel half-buried in a black crater plain, lit by one hard sun, with one warm door. Everything else is negative space.

---

## 1. The idea

BULKHEAD is not a dashboard with a 3D widget. It is a place.

The image should feel like a frame from a restrained documentary about a real lunar outpost: a white ceramic habitat that has been engineered, not designed for a poster. The technology is legible. The environment is hostile. The only warm thing in the frame is the airlock, because that is where the people are.

Three references, in order:

1. **A NASA trade-study figure** — the habitat is a pressure vessel with a believable section, hatches and service spine.
2. **An Antarctic field station at dusk** — small warm windows, long shadows, equipment that is maintained rather than styled.
3. **A Swiss technical poster** — the UI is a thin layer of precise, quiet type, not a HUD.

The failure mode to avoid is "generic sci-fi." No neon, no holographic clutter, no floating UI panels with rounded corners, no random greebles.

---

## 2. Palette

| Role | Hex | Use |
| --- | --- | --- |
| Sky | `#000002` | True black. No fog. |
| Regolith sunlit | `#8a877f` | Neutral grey, very low saturation. |
| Regolith shadow | `#0a0c10` | Cool, near-black, lifted only by earthshine. |
| Ceramic hull | `#dedbd3` | Warm white; must separate from the ground. |
| Titanium | `#9aa0a6` | Structural rings, frames, hardware. |
| Graphite | `#2a2d30` | Recesses, gaskets, window frames. |
| MLI gold | `#b88b3e` | One small accent on the service spine. |
| Warm interior | `#ffb26b` | Door light, portholes, practicals. |
| Instrument cyan | `#7fd4ef` | ANALYZE only. |
| Emergency | `#ff4d33` | BREACH only. |
| UI ink | `#e9e6df` at 82% | Primary labels. |
| UI secondary | `#e9e6df` at 46% | Units, sublabels. |

Rule: **one accent per mode.** LIVE = warm amber. ANALYZE = cyan. DESIGN = neutral white/cyan. BREACH = red. Never two accents competing.

---

## 3. Camera philosophy

The camera is an author, not a controller.

- Default is **authored rails**, not free orbit. The pointer adds at most ±0.6° of parallax, damped; it cannot break the composition.
- The establishing camera is **elevated but not a drone**: ~5.9 m above the local ground, 28 m from the habitat, 4–5° downward, 36° vertical FOV. The habitat sits right-of-centre; the airlock is the near focal point; the horizon is around 40%.
- The inspection camera is a **raking 3/4**, 36° vertical FOV, ~12 m from the airlock: the door on the left, the hull receding right, the ground falling away.
- The cutaway is a **3/4 architectural section**, 40° vertical FOV, 17 m away, all four bays readable at a glance.
- The breach is a **medium shot**, 42°, 22 m out: the hull, the puncture, the airlock and the ground in one frame. Not a wall close-up.
- ANALYZE pulls back and cools: 34°, elevated 3/4, the whole pressure network in frame.
- DESIGN goes to a long-lens axonometric: 23.5°, high 3/4, exploded modules on a grid.

Motion:

- 20–46 s rails, cubic easing, 1–2 m of drift. Nothing snaps.
- Subtle breathing (<0.05°) and damped pointer parallax.
- FOV contracts 1–2° during a push-in, so the move reads as a lens rather than a dolly.
- Scene changes are a 0.4–0.5 s fade/scan, never a hard cut.

No handheld shake. No fast orbits. No FOV whip.

---

## 4. Environment

The Moon is a **sculpted plain**, not a flat floor and not a dune field.

- A broad regolith plain with a shallow crater bowl, one strong crater rim behind the habitat, and two lower ridge layers at the horizon.
- The rim has a saddle and an irregular crest; it is the compositional counterweight to the habitat.
- Long, hard shadows from the habitat and boulders. The foreground is allowed to go dark; the habitat is the brightest object.
- Fine detail comes from rocks, footprints, a compacted path and contact shadows, not from a noisy albedo.
- No atmospheric fog. Depth comes from silhouette layering and tonal separation; a very slight cool shift on distant ridges is acceptable.
- Sky: pure black, sparse stars in three brightness classes, a very low-contrast Milky Way band, and a small gibbous Earth. The Earth is a detail, not a poster.

**Known gap in this build:** the regolith still reads brighter than the intended `#8a877f` under the key light; the ground can look like snow in the establishing and inspection frames. This is a tonal-calibration problem, not a concept problem. See `04-final-assessment.md`.

---

## 5. Habitat — HAB-04

A single, original pressure vessel. It must read as one designed object, not a kitbash.

- **Hull:** 3.34 m radius, 15.6 m long, horizontal ceramic pressure vessel, half-settled into a regolith berm. White/ivory, thin dark seam bands, no giant black rings.
- **Neck:** a welded lathe fairing from the 3.34 m hull down to the 2.06 m airlock drum. No flat bolted plate.
- **Airlock:** a short drum with a 2.24 m pressure door — graphite-grey leaf, heavy collar, six latches, handwheel, a small warm porthole, a compact light bar, and a lit threshold. The door is the warm heart of the exterior.
- **Landing:** a grated platform, four treads, two rails, diagonal brackets. It must look bolted to the structure, not floating.
- **Service spine:** a low ceramic housing with one small gold MLI blanket, four radiator fins, a dark-glass cupola with a warm ember, and a mast/dish/beacon. The silhouette is hull + spine + radiator comb + mast, never a plain tube.
- **Panels:** flush curved hatches with thin gaskets, not boxes. Painted stencils: `HAB-04`, `BULKHEAD`, `AIRLOCK`, `04`, small warning placards.
- **Dust:** a subtle gradient on the lower 0.5 m only. The habitat is maintained, not abandoned.

No random props. No floating geometry. No oversized glowing donut hatch. No visible stick legs: the rear sits in the berm, the front has two stout jacks.

---

## 6. Materials

One family, quiet surfaces.

- **Ceramic:** `MeshPhysicalMaterial`, base `#dedbd3`, roughness 0.55, metalness 0.06, clearcoat 0.12. Subtle panel texture; normal scale ≤0.2; no heavy grunge.
- **Titanium:** `#9aa0a6`, roughness 0.36, metalness 0.86. Catches the hard sun on edges and collars.
- **Graphite:** `#2a2d30`, roughness 0.6, metalness 0.4. Recesses, gaskets, door leaf.
- **MLI gold:** `#b88b3e`, roughness 0.5, metalness 0.7, crinkled normal. Used once, small.
- **Glass:** near-black, clearcoat 1.0, low roughness; warm interior behind it. Not a glowing disc.
- **Regolith:** roughness ~0.96, metalness 0, neutral albedo. Fine grain lives in the normal map and rocks, not in a noisy colour texture.
- **Interior:** warm bone liner, dark frames, titanium racks, cyan screens, wood/blanket accents. Not a brown cave.

No stretched textures. No tiling stencil text. No white boxes with black shadows.

---

## 7. Lighting

- **Key:** one hard sun, elevation ~9°, intensity ~5.8, colour `#fff6ec`. Tight 4096 shadow map around the habitat; crisp contact shadows; long raking shadows toward camera-left.
- **Fill:** cool earthshine ~0.34 from the camera side, colour `#9db8d8`. The shadow side must read as blue-grey ceramic, not black.
- **Bounce:** a subtle warm ground bounce (0.08) and warm door pool. The airlock is the only warm source.
- **Interior:** four warm practicals, two cyan instrument glows, one soft volumetric shaft. Warm/cool contrast, not uniform orange.
- **Design:** studio key + fill + rim, no lunar sun; the modules read as clean white engineering objects.
- **Analyze:** cool, desaturated lunar light; the wireframe and cyan nodes carry the mode.

Rule: the sunlit hull is near-white; the regolith is mid-grey; the shadows are deep but readable. Three values, not ten.

---

## 8. UI and motion

- IBM Plex Mono, one family. 7–11 px labels, uppercase, 0.14–0.22 em tracking. The clock is the only large type (54–64 px).
- Corner-anchored: wordmark top-left, mode switch top-centre, scenario top-right, air ledger bottom-left, clock bottom-right, hint bottom-centre.
- 1 px rules, corner ticks, no rounded cards, no glassmorphism, no neon borders. Panels use a dark scrim and a hairline border.
- LIVE = warm accent; ANALYZE = cyan data panel; DESIGN = neutral metrics panel; BREACH = red decision card.
- Motion: 0.4–0.5 s fades; callouts damped so they do not jitter; the clock is static in stills.
- The UI never covers the airlock or the breach point. It is a caption, not a cockpit.

---

## 9. Post

- ACES tone mapping, exposure ~1.0.
- Bloom: threshold ~1.05, strength 0.22, radius 0.64. Only practicals and the sunlit edge should bloom.
- Grade: filmic contrast, cool shadows, warm highlights, saturation ~0.94, vignette 0.32, grain 0.04, edge-only chromatic aberration ≤0.0007.
- SMAA last.
- No heavy DOF in the wide shots; the terrain and the habitat must both read. A shallow DOF is acceptable only in the inspection close-up.
- No lens flares, no anamorphic streaks, no fake god rays outdoors.

---

## 10. Never do

- Never fog the Moon into a snowfield.
- Never use a soft studio key for the exterior.
- Never put a centered, oversized glowing ring on the airlock.
- Never float props, panels, cables or labels.
- Never use tiled stencil text or stretched textures.
- Never fill the frame with greebles to look "detailed."
- Never use a generic dashboard grid, rounded cards or neon HUD clutter.
- Never let the UI compete with the habitat.
- Never add a second accent colour to a mode.
- Never ship a frame that has not been looked at at 100%.

---

## 11. The test

A good BULKHEAD frame should pass three questions:

1. **Would this read as a real place if the UI were removed?** (Plate test.)
2. **Is there exactly one hero and one warm accent?**
3. **Does the eye go to the airlock, then the silhouette, then the horizon — in that order?**

If the answer to any is no, the frame is not finished.
