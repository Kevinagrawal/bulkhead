# Round 3 — Terrain, light, and the lunar plate

**Goal:** make the environment a believable lunar plain and give the hero frame cinematic depth.
**Date:** 2026-10-24

## Reference study

- Igloo intro: layered terrain, atmospheric depth, one object against a large negative field.
- Apollo surface photography (conceptually): a dark grey regolith, sharp shadows, a black sky, small rocks and a bright horizon crest — not snow.
- The existing `12-visual-gap-analysis.md`: the biggest quality gaps were featureless regolith, soft lighting and a weak horizon.

## The eight biggest weaknesses found

1. The ground was a set of smooth dunes with a ~5–20 m wave pattern — nothing like a cratered plain.
2. A high-frequency normal/height ripple created TV-static stipple and moiré.
3. The sun was too high/soft; shadows were short and the ground was evenly lit.
4. The horizon was a smooth hill with no crater-rim silhouette.
5. There were almost no rocks, craters or scale cues.
6. The foreground was empty; the habitat floated in the middle of the frame.
7. The grade was flat and grey; the habitat and ground had similar luminance.
8. The near berm rendered white because it had vertex colours enabled with no colour attribute.

## Changes

- Removed the fine height ripples and the sinusoidal berm modulation. Replaced the macro terrain with low-amplitude landforms plus authored craters: a large rim behind the habitat (saddle + jagged crest), five mid-ground craters, and small foreground impacts.
- Added 2,700 pebbles and 40+ boulders in clusters, with contact shadows; added a compacted boot path to the airlock.
- Lowered the sun to ~9.2°, raised the key to 5.8, reduced earthshine to 0.34, added a warm ground bounce and a cool rear rim.
- Added a long-exposure grade: deeper blacks, cool shadows, warm highlights, saturation 0.94, vignette 0.32, grain 0.04, bloom 0.22 at 1.05.
- Fixed the berm's missing colour attribute by forcing `vertexColors = false` and a regolith tone.
- Added a 1.6× star count and a faint Milky Way.
- Added a foreground boulder cluster at the bottom-left; it reads only as a sliver at the hero camera and never became the frame anchor it needed to be.

## Screenshots

- `shots/round-1/1920/landscape-check.png` — crater plain, long shadows, new rim.
- `shots/round-1/1920/foreground-check.png` — rocks, path, boulder cluster.
- `shots/round-1/1920/verify-exterior.png` — graded hero, after the berm fix.
- `shots/round-1/1280/scene-1-exterior.png` — 1280 milestone.

## Harsh critique

The horizon and shadows were a real improvement — the scene finally had depth and a lunar silhouette. But the **regolith remained too bright**. In direct sun it read as a white dune; only the shadow side looked like the Moon. The rocks were low-poly and too bright, the path was faint at hero distance, and the foreground anchor was a sliver. The image was cinematic in contrast but not yet physically believable.

The most damaging single thing: **the ground read as snow**, undoing much of the habitat work.

I also over-corrected the normal map twice: first too much stipple, then too little surface detail. The right answer is a calibrated dark albedo with fine geometry/rock scale, not more normal-map noise.

## Next focus

Move to the interior/cutaway, breach and analyze scenes while keeping the lunar plate stable. The ground calibration was deferred with a known debt.
