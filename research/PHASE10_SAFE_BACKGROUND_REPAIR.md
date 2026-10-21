# Phase 10 — bounded, local correction of original-hair wisps (2026-10-21)

## Problem
The editor still overlays new hair over the customer's original hair. Phase 9 detects severe exposed original hair, but doesn't correct it. Major original-hair removal requires a trained, identity-preserving generative model.

## Implementation on isolated research branch
- `public/ai/background-repair.js`: small, connected uncovered-hair component detection; estimate nearby pixels from local **flat background** only. Refuse a textured background, substantial uncovered hair, face-region pixels, weak/absent face alignment, edge-truncated components, and invalid dimensions.
- `public/index.html`: run only after **real local hair segmentation** (never when heuristic masks are in use), draw repairs under the new hairstyle in preview, repeat the same layer during high-resolution export, immediately clear on photo/style replacement, recalculate on editing controls, preserve Phase 9 export block.
- `public/sw.js`: add module to core offline cache, version `hananeh-static-20261021-v12-bg-repair`.
- `scripts/background-repair-regression.mjs` and `package.json`: nine local algorithm regression cases in the Node test gate.

## Synthetic verification (performed)
- Nine standalone Node tests passed for flat-background wisps, preservation of unrelated pixels, textured-background refusal, large-hair refusal, missing face, invalid shapes, cropped regions, face protection, and invalid thresholds.
- Chromium 144 canvas ran the *actual* independent engine and exported a local synthetic PNG. A 114-pixel dark wisp against uniform background was patched to correct background tone; unaffected pixels were unchanged. No page errors/external HTTP requests.
- GitHub branch readback verified 13/13 wiring conditions, including the original-hair export block. Three inline scripts parsed successfully.

## What is not proven
- No Android Chrome inference in this session; real MediaPipe assets/model weights were not run.
- No actual customer photographs or independent perceptual quality evaluation.
- No full repository npm test or Cloudflare deployment; production is untouched.
- Not hair generation, bald conversion, facial reconstruction, or FaceApp-equivalent photorealistic transfer.

## Next gate
Build actual same-origin MediaPipe assets, run full `npm test` in checked-out repo, publish an isolated Cloudflare preview, test airplane-mode on the target phone, then evaluate real-photo correction quality and train/license a purpose-built reference-guided synthesis model. Do not ship automatically without real-photo A/B review.
