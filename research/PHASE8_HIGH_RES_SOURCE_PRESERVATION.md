# Phase 8 — offline source-resolution preservation

Date: 2026-10-21

## Confirmed pre-existing defect
The authoritative web app stores every accepted customer portrait exclusively in a 768×960 working canvas. Its JPEG export previously used that canvas, irreversibly reducing facial, skin, eyewear and background detail.

## Changes on research branch only
- `public/ai/high-res-engine.js`: pure local, pixel-budgeted export geometry. Defaults: 2× maximum, 3,000,000 total output pixels. No network requests or AI claims.
- `public/index.html`: retains a second bounded-resolution source canvas when the decoded photo has enough real pixels; clears this canvas immediately on replacement or invalid/corrupt uploads. The editor continues using 768×960 for responsive preview. JPEG export rerenders source pixels and the same pose/position/rotation hairstyle layer at the higher resolution when available. Fallback remains ordinary 768×960.
- `public/sw.js`: precaches the engine and rolls its version to `hananeh-static-20261021-v10-hires`.
- `scripts/high-res-regression.mjs`: seven geometry and rendering invariants.
- `scripts/tryon-regression.mjs`: three additional source-retention and replacement-cleanup tests.
- `package.json`: includes geometry checks in `npm run test:unit`.

## Executed evidence (local independent test harness)
- Node 22, 7 standalone geometry cases passed and 3 browser-global API tests passed.
- Chromium 144 executed the actual independent `high-res-engine.js` code on a synthetic 3000×4000 portrait, producing a 1536×1920 JPEG. One out-of-hairstyle sample remained byte-identical to its source; the hair-region sample was modified as expected.
- GitHub repository branch readback: 9/9 source wiring checks passed.
- This session **did not** execute the full repository `npm test` or run on a real Android phone, because the connected private GitHub repository could not be materialized locally and the remote build's model dependencies were not available in this sandbox. The checks above do not stand in for either gate.

## Important limits
- The reference hairstyle layer is still limited by its approximate 512-pixel source. Higher-resolution export preserves the *customer's* photographic detail, but does **not** synthesize realistic new hair.
- Original hair is not removed. Long-to-short changes remain visually untrustworthy.
- No commercial production model was added; segmentation is separate from hairstyle synthesis.
- No changes to the main branch and no Cloudflare deployment have been performed.

## Required next steps
1. In a checkout run `npm install && npm run build && npm test` with model assets, and visually verify that 1536×1920 exports match 768×960 previews.
2. Deploy the research branch to a non-production preview only after full tests.
3. Real Android Chrome: airplane-mode app relaunch, portrait upload, CPU/peak-memory audit, full-resolution export, crop/pose, and invalid-upload clearing.
4. Benchmark source-hair removal plus a commercially permitted reference-guided generative model; no FaceApp-quality claims before blind tests.

**Status: SOURCE-QUALITY IMPROVEMENT PROVEN IN ISOLATED TESTS, NOT FACEAPP-QUALITY STYLE GENERATION.**
