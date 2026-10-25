# 04 — Final Assessment

**Prototype:** `bulkhead-visual-lab/`
**Final capture set:** `shots/final/1920/`, `shots/final/1280/`
**Build:** `npm run build` passes. No console errors in the final capture run.
**Measured geometry (refined build):** 172 calls / 435.0k tris (exterior), 152 / 427.4k (inspection), 85 / 438.2k (cutaway), 185 / 436.2k (breach), 172 / 430.5k (analyze), 114 / 10.8k (design).

---

## Refinement update — 2026-10-25

A focused pass after this assessment addressed the four biggest gaps:

- **Regolith:** rebuilt darker and mottled (albedo ~62–84), with multi-scale detail, stronger normal micro-relief and a regolith-toned berm. The snow-like read is gone.
- **Habitat materials:** new ceramic albedo/roughness/normal maps (mottled off-white, grey seams, rivets, plate IDs) and softer physical lighting.
- **Lighting:** key moved to camera-side front-left; the habitat face and door are lit and the long shadow falls behind it.
- **Solar + stairs:** the 2×3 solar array is restored and installed; the airlock stairs are rebuilt as one complete stringer/tread/handrail/platform assembly.
- **Polish:** subtle 80–850 m fog, idle camera drift/FOV breathing, wheel/Z zoom-out, and the artificial horizon ridge walls removed.

The refinement notes and screenshots are in `05-refinement-pass.md` and `shots/refine/`. The sections below describe the pre-refinement build; where they conflict, the refinement pass and `shots/final/` are authoritative.

**Current weakest points:** the pale ballast row at the hull base, the face-on airlock door proportion, some low-poly foreground boulders, draw calls of 172–185 (target ~160), and no measured FPS on real hardware.

---

## 1. What this prototype proves

1. **BULKHEAD has a distinct visual identity.** Black vacuum, white ceramic pressure vessel, one hard sun, one warm door, thin mono type. It does not look like a generic sci-fi dashboard.
2. **The exterior can carry an opening.** The establishing frame has a real hero, a long shadow, a crater-rim horizon, a small Earth and a warm airlock. It reads as a place, not a product turntable.
3. **The camera can feel authored.** The rails, damping, subtle parallax and FOV contraction are coherent; the six scenes each have a deliberate lens and height.
4. **The UI is production-grade.** The wordmark, mode switch, air ledger, clock, callouts and pressure panel share one typographic system. The ANALYZE panel and DESIGN schedule are the strongest product moments.
5. **The cutaway direction is viable.** Four bays, partitions, a raised floor, warm practicals, cool screens, a proper cut face and a plinth. It is readable without a paragraph of explanation.
6. **The modes can be visually distinct.** LIVE is warm and lunar; ANALYZE is cyan and desaturated; DESIGN is a dark exploded studio; BREACH is a red-accented medium shot. That is the right structural idea.
7. **The pipeline is reproducible.** URL-addressable scenes, frozen stills, deterministic captures at both resolutions, a small procedural asset budget, and a clean module split.

The most convincing single image is `shots/final/1920/scene-5b-design.png`: it proves the design-tool ambition better than the exterior proves the cinematic ambition.

---

## 2. What improved most

**Composition and staging.** The first build was a white tube on a flat plane with a cropped end cap. The final build has a wide lunar plain, a designed rim, a grounded habitat, a near-left shadow mass and a clear focal airlock. The camera moved from "on the axis of the hull" to a 3/4 with real depth.

**The UI.** The first pass had a generic HUD feel. The final HUD is quiet, corner-anchored, and mode-aware. The decision card, pressure panel and design schedule are the clearest expressions of the product.

**The design mode.** It went from "the exterior with labels" to a real exploded axonometric with a grid, module shells, a service-spine subassembly, cyan cut rings and a schedule. This is the biggest functional visual gain.

**The airlock.** It went from a giant flat plate and a black hole to a lathe neck, a 2.24 m pressure door, a collar, latches, a wheel, a warm porthole, a light bar and a landing. It is now the warm heart of the exterior.

**Grounding.** The near berm, the flush hatches, the recessed door and the plinth removed most of the "floating model" artifacts.

---

## 3. What looked weak before the refinement pass

This list is the pre-refinement state, kept for the record. The new current gaps are at the top of this document; `05-refinement-pass.md` has the fixes.

Ranked by visual damage:

1. **The regolith is too bright.** In direct sun it reads as snow, especially in the establishing and inspection frames. The intended art direction is a mid-grey `#8a877f`; the render is closer to white. This is the single biggest gap between the prototype and the cinematic target. The berm vertex-colour bug was fixed, but the terrain's tonal response under the key/tonemap is still wrong. It needs a measured albedo calibration, not another colour guess.
2. **The habitat lost detail in the late rewrite.** The habitat was reduced from a richer ~1,100-line model to a cleaner ~380-line model while integrating DESIGN. The current model is more robust and better proportioned, but it lost the layered airlock, canopy, panel frames, larger cupola and surface hardware. The exterior now reads as a clean prototype object, not a maintained field habitat.
3. **The close-up hatch is still a big door in a big ring.** At 3/4 it reads as machined hardware; face-on it reads as a vault. The door proportion and face treatment need one more design pass.
4. **The foreground rocks are low-poly and bright.** They read as plaster shards, not regolith. A small library of sculpted, smooth-shaded, dark rocks would lift every lunar shot.
5. **The cutaway is still dark in the upper walls and CREW/ECLSS.** The practicals make pools, not a readable space. The section is legible with labels, but it should be legible without them.
6. **The breach is hull-dominant.** The medium shot is better than the wall close-up, but the airlock is still a sliver and the red is a soft pool rather than a rim. The 1 cm puncture blooms into a spark.
7. **The solar array was removed, not solved.** It never read at hero distance; hiding it cleaned the frame but removed a scale/technical cue. DESIGN has its own bank, so the exterior left frame is now carried only by terrain and shadow.
8. **Draw calls are above target** in the exterior, breach and analyze scenes (165–182 vs 160). FPS was not measured on a real GPU; the headless capture freezes the scene, so no frame-rate claim is made.
9. **The intro and transitions are functional, not signature.** The opening wordmark/hairline exists, but it was not art-directed to the same level as the stills. There is no audio.

---

## 4. Is it strong enough to become the final visual foundation?

**After the refinement pass, yes — with a narrower remaining gap.** The ground, ceramic materials, front-side key, solar array and stairs now read as production-intent visuals. The remaining "not yet" is about close-up detail (door proportion, ballast row, boulders) and performance, not the core look.

**As an architecture, UI system, camera language and scene structure: yes.**

The code is clean and modular; the six scenes are URL-addressable and reproducible; the UI is coherent; the design mode is a genuine product idea; the render pipeline is the right shape (PBR → bloom → grade → SMAA). A team can build the real simulation into this without fighting the visual layer.

**As a final visual bar: not yet.**

The prototype is a credible hackathon opening and a strong internal proof, but it does not yet reach the "insanely good" bar set in the brief. The two blockers are concrete and fixable:

1. **Regolith tonal calibration.** Without this, the Moon reads as snow and the habitat loses separation. Fix the ground before adding anything else.
2. **Habitat detail restoration.** Bring back the layered airlock, canopy, panel frames, cupola and surface hardware on top of the current clean model.

If those two are solved, the same architecture immediately moves from "good prototype" to "credible cinematic product." The UI and DESIGN mode are already there.

---

## 5. Recommended next pass (ranked)

1. **Regolith calibration (1–2 days).** Sample Apollo/LCROSS albedo references, set the terrain material and tone mapping first, then the texture. Target a sunlit mid-grey, a cool shadow, and a clear luminance separation from the white hull. Re-shoot Scene 1 and 2 at 1920/1280 and compare against the current `shots/final` set.
2. **Restore habitat detail (2–3 days).** Re-add the layered pressure door, canopy, panel frames, a larger cupola, radiator comb and surface placards. Keep the current proportions; do not return to the jet-engine end.
3. **Rock/terrain library (1 day).** Four to six sculpted, smooth-shaded boulder variants, dark albedo, contact shadows; replace the low-poly set.
4. **Cutaway light (1 day).** Lift the liner and practicals until CREW/ECLSS read without callouts; reduce the near cut-ring silhouette.
5. **Breach re-stage (0.5 day).** Wider framing with the airlock, a true red rim/beacon, a finer jet and a smaller bloom on the puncture.
6. **Performance merge (1 day).** Merge static trim and instanced rocks; target <140 calls in the lunar scenes; measure FPS on the target GPU.
7. **Transitions/audio (1–2 days).** Finish the opening seam, add a restrained mode transition and a low ambient bed.

---

## 6. Honest closing note

This phase did what it set out to do: it built a **new, clean visual foundation** and a complete five-scene language, not a patch on the old implementation. It also surfaced the two things that actually matter next — the ground tone and the habitat detail — instead of hiding them behind more features.

The strongest evidence that the direction works is that the UI, the ANALYZE panel and the DESIGN explosion already feel like a product. The weakest evidence is that the exterior still looks like a bright regolith test render rather than a photograph of a place.

That is a better place to be than a beautiful still with no architecture. The next pass should be narrow and ruthless: **fix the ground, restore the habitat, re-shoot the same six frames.**
