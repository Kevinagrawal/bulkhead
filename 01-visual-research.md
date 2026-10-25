# 01 — Visual Research: Igloo, the local mirror, and what transfers to BULKHEAD

**Date:** 2026-10-24
**Sources studied:** https://www.igloo.inc/ (live), `igloo-clone/` (local mirror, 108 files / 17.57 MB), `research/igloo/shots/*` (captured frames), `bulkhead-vision/01-igloo-technical-breakdown.md`, `bulkhead-vision/12-visual-gap-analysis.md`.
**Boundary:** the mirror and the live frames were used to study technique, motion language and production values. No Igloo model, texture, font file, shader block or branding is shipped in this lab. IBM Plex Mono is used under the SIL Open Font License.

---

## 1. What the reference actually is

Igloo is not a page with a 3D illustration. It is a **single-canvas WebGL2 compositor**:

- Three scroll-scene composers plus a detail composer render to offscreen buffers.
- A fullscreen transition shader combines two scene buffers using a scroll data texture, a frost mask and a noise field.
- The UI is drawn as **MSDF geometry** into the same canvas. After boot there is no DOM text at all.
- The final chain is: scene render → LUT grade → composited transition → UI pass → bloom → SMAA.

That architecture explains most of the "expensive" feel: the type blooms with the image, the transition treats both scenes as one photographic plate, and the grade is applied before the UI so the copy stays clean while the image goes cold.

Measured evidence from the local research:

| Property | Value |
| --- | --- |
| Page weight | 15.6 MB / 95 requests |
| Geometry | ~162k triangles, 128–152 draw calls |
| Performance | 103–139 fps at 1920×1080, DPR 1, RX 5700 XT |
| Time to ready | ~14.5 s |
| Font | one family, one weight (IBM Plex Mono Medium) |
| Dynamic shadows | none in practice (all cast/receive flags false) |
| Bloom | mipmap blur, 6 levels, threshold ~0.2, strength 1 |

The most important negative finding: **the premium read is not produced by the effect count.** DOF and god rays are defined but never called. Shadows are enabled but unused. The image is carried by composition, baked light, tonal control and motion.

---

## 2. Camera language

- Interaction is a **damped virtual scroll**, not an orbit control. A modulo-wrapped scene track moves at roughly 0.56 units per frame with 0.98 friction and a 1.4 s idle auto-centre.
- FOV is coupled to velocity (45° → 40°), so a push-in feels like a lens rather than a dolly.
- The object is almost always **one hero**, centred or slightly off-centre, with the terrain and atmosphere framing it. The camera never tries to show everything.
- Motion is slow and weighted. Nothing snaps. The page can sit still for seconds; the image is allowed to breathe.

**Transfer:** authored rails, slow damping, FOV coupling, one subject. Do not ship a free orbit as the opening experience.

---

## 3. Environment and composition

- Igloo's terrain is a **sculpted, layered stage**: near ground, mid ridge, far mountain silhouette, sky. The layers are separated by tone and haze, not by detail density.
- The hero object is embedded in the terrain, not placed on a flat floor. Snow, wind and particles give contact and scale.
- Negative space is deliberate. The object often occupies less than half the frame; the rest is atmosphere, horizon and type.
- The palette is overcast daylight: light sky, white bloom, mid-grey subject. The site is not high-contrast; it is tonal and milky.

**Transfer:** build depth with silhouettes and tonal separation. Do not fill the frame with props. For BULKHEAD the values must invert (black sky, hard sun), but the *layer logic* is the same.

---

## 4. Lighting and materials

- Lighting is ~95% **baked**: two colour maps per hero object ("assembled" and "exploded"), plus shader-side fake subsurface, fake ground bounce and emission masks.
- Materials read as one family: soft roughness, restrained specular, no procedural noise storms. The surfaces are quiet so the silhouette and light can speak.
- The white-out is used as atmosphere (`mix(terrainColor, white, wind)`) and as a transition device, not as a lighting accident.

**Transfer:** the lunar version cannot use baked lightmaps for a moving camera, but it can use the same discipline: one material family, controlled roughness, few specular highlights, no noisy albedo.

---

## 5. Transitions, UI and post

- The signature transition is an **ice cut**: a noisy diagonal threshold driven by a data texture, with chromatic aberration and blue-noise jitter. Softness values (0.2 on the geometric edge, 2.0 on the noise field) are what make it feel crystalline rather than like a wipe.
- UI is four corner-anchored labels, one typeface, one accent, no cards. The wordmark is large but the information is small.
- Bloom runs after the UI, so the type picks up a halo. The LUT runs before the UI, so the copy stays neutral while the scene is graded.
- Post is restrained: LUT, bloom, SMAA. The heavy lifting is in the plate, not the filters.

**Transfer:** a composited grade, a restrained bloom, and a tiny, confident UI. The BULKHEAD UI in this lab keeps the same corner-anchor logic but uses DOM for crispness.

---

## 6. What creates the premium feeling (ranked)

1. **Restraint.** One object, one typeface, one accent, four labels.
2. **Composition.** The hero is staged in depth; the horizon and negative space do work.
3. **Tonal control.** A narrow, intentional value range; no random contrast.
4. **Motion damping.** Slow, weighted camera and transitions; FOV as a lens.
5. **Material quietness.** Smooth surfaces, controlled specular, few colours.
6. **Atmospheric depth.** Layered silhouettes and a soft far field.
7. **A single memorable transition.** One signature effect, reused, rather than ten average ones.
8. **Production consistency.** Every frame belongs to the same world.

Effect count is not on the list.

---

## 7. What BULKHEAD must invert

| Igloo | BULKHEAD |
| --- | --- |
| Overcast white sky | Pure black sky, sparse stars, small Earth |
| Soft ambient light | One hard low sun, razor shadows, cool earthshine fill |
| Milky low contrast | Deep shadows, controlled highlights, one warm accent |
| Snow / wind atmosphere | Vacuum; depth from silhouettes and long shadows |
| Object dissolves into particles | Object is a pressure vessel; the drama is structural |
| MSDF UI in the canvas | DOM UI for crisp 9–11 px type and accessible copy |
| Baked lighting | Real-time PBR with a tight shadow frustum |
| 15.6 MB asset load | Procedural textures and geometry; a small local build |

The inversion is the identity: **cold vacuum, warm human signal, technical restraint.**

---

## 8. Limits of this study

- The Igloo bundle is minified and has no source maps. Shader and lighting claims are inferred from call sites, captures and the existing technical breakdown, not from source.
- The live site was studied through captured frames and the local mirror; network-dependent behaviour and audio were not reproduced.
- The reference's baked-lighting workflow is not directly portable to an interactive camera. This lab deliberately uses real-time PBR instead.
- The most useful lesson is architectural, not cosmetic: **composite the plate, grade it, then put quiet type on top.**

**Bottom line:** Igloo proves that a single hero object, a narrow palette, a slow camera and one signature transition can outperform a feature-rich interface. BULKHEAD takes that discipline and changes the physics: hard sunlight, black space, warm interior, pressure-vessel geometry.
