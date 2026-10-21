# Phase 9 — conservative old-hair exposure quality gate (2026-10-21)

## Purpose and evidence
The current browser renderer does not remove the customer's hair. Merely pasting an aligned hairstyle on top leaves exposed original hair, especially for long-to-short transfers. This can produce misleading consultation previews. The new gate compares actual local source hair-segmentation coverage with the rendered donor-hair alpha. It **prevents exporting some severe visual mismatches**, but does not erase/reconstruct old hair and is not generative AI.

## Implemented on research branch only
- `public/ai/hair-coverage.js` analyzes the two masks at 192×240, finds connected regions of old hair outside donor coverage, and classifies `clear`, `warning`, `blocked`, or `inconclusive`.
- `public/index.html` evaluates after every completed local render and slider/drag adjustment. An estimated fallback mask is *never* used as grounds to claim reliable overlap detection or hard-block export. A blocked result disables the save control and is also refused inside `save()`.
- `public/sw.js` precaches the module and moves to version `hananeh-static-20261021-v11-hairgate`.
- `scripts/hair-coverage-regression.mjs` adds six regression cases to the existing package test suite; `package.json` includes these checks.

## Preliminary algorithm thresholds (not perceptually validated)
- Classifies hair pixels when source confidence mask red >=115 / 255, donor coverage when alpha >=48 / 255.
- Under 180 source-hair pixels at the analysis resolution => inconclusive.
- Severe: >=24% of the original hair pixels uncovered and >=max(90, 7% of hair pixels) exposed in a continuous region.
- Warning: >=12% uncovered with a connected region of at least max(45, 3% of hair pixels).
- Small isolated mask speckles are not enough to block.
All values require tuning against real consented photos and are provisional.

## Verification performed
- Node 22: 9 standalone mask-analysis regression tests passed.
- Chromium: actual 2D canvas image-data readback and algorithm. A synthetic long-to-short case returned `blocked` (44.1% uncovered); fully aligned donor mask returned `clear`. No page errors or external requests.
- Connected GitHub readback: 12/12 source/cache/integration audit checks passed.

## Outstanding quality gates
- Full `npm install && npm run build && npm test` on an authorized clone with the real local MediaPipe model, plus Android Chrome airplane-mode test.
- No holdout evaluation of these thresholds on genuine customer portraits yet.
- Source-hair reconstruction and reference-guided generative hair transfer are still missing.
- The full PWA has **not** been independently browser-tested with the actual model in this phase.
- Main branch and Cloudflare production remain unchanged.

### Commercial and privacy rule
No proprietary FaceApp weights or cloud APIs used. All masking/overlap processing occurs in the browser. Customer photos are not part of any diagnostic export.
