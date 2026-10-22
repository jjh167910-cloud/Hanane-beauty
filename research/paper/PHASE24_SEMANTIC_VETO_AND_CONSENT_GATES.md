# OffHair Phase 24 — conservative dual-model skin veto and cancellation gate

Date: 2026-10-22. **Status: research only — no customer-facing quality certification.**
Authoritative production catalog is still unchanged on `main`.

## Why
The former MI-GAN bald-conversion study used a broad eye-anchored ellipse as its sole
face-protection boundary. That heuristic cannot reliably represent the forehead,
ears or variable head pose. A second independently pretrained six-class segmenter
offers additional **predicted skin** pixels which can be excluded from inpainting.
These labels are not independently verified human anatomy.

## Implementation
- `public/ai/migan/semantic-skin-veto.mjs`: remap official Google
  MediaPipe Selfie Multiclass predictions to the 512x512 reconstruction view,
  include categories 2 (body skin) and 3 (face skin), dilate the protected
  set by 2 pixels, and fail closed on missing/unreliable semantic analysis.
- `public/ai/migan/hair-removal-core.mjs`: an optional supplied semantic veto
  may only **reduce** the set of pixels marked for neural replacement.
  The pre-existing face ellipse remains mandatory. Neither model alone can
  authorize removal. Invalid guards refuse operation rather than reverting.
- `public/ai/migan/hair-removal-studio.html`: execute both locally installed
  MediaPipe models; display explicit semantic statistics; add the research
  segmenter, JS module and pinned checkpoint to explicit offline-install checks.
  An analysis change or withdrawal of consent invalidates pending inference,
  removes export eligibility and suppresses stale callbacks.
- `scripts/offhair-semantic-skin-veto-regression.mjs`: deterministic tests for
  nonexpansion, strict protection, resampling, dilation and malformed inputs.
- `scripts/real-hair-removal-studio-smoke.mjs`: actual Chromium segmentation
  and MI-GAN inference, offline reload, protected non-removal preservation,
  and revocation of consent/export.

## Genuine-browser engineering observation, not a realism benchmark
The completed GitHub run
https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39730749675
logged, for existing bundled catalog style 1:
- 17,363 removal pixels (6.62% of the 512x512 view).
- 265 original-hair pixels excluded by the semantic veto outside the
  already protected ellipse.
- 24.106% of the semantic output classed as face skin.
- 0 changed pixels outside the approved removal region.
- Real WASM inference completed with externally blocked requests.
- Subsequent offline reload and second run completed.
- Images 2, 3 and 6 generated inpainting research outputs;
  style 9 failed the conservative area gate.

All bundled catalog portraits are not identity-independent subjects;
the model has not been validated on actual customer Android handsets.

## Important NO-GO findings
- Semantic category 3 predicts face skin, not separate eyes, mouth,
  visible ears, or any true ground-truth boundary.
- The guard reduces editing permissions; it does **not** make MI-GAN
  a specialized scalp renderer, remove the observed cap-like artifacts,
  generate reference-guided hairstyles or establish appearance quality.
- No commercially cleared, pretrained bald-to-hair generator has been
  bundled in this application. Do not promote this experiment to the salon app.
- Apache-2.0 attribution for the official six-class checkpoint is retained;
  research inputs and rights remain subject to the corpus registry.

## Next quality experiment
Use commercially cleared **paired hair/no-hair data** with separate identities.
Benchmark a hair-specific bald-conversion stage and separately a
reference-conditioned synthesis stage against MI-GAN/2D compositing;
record natural scalp/hairline, skin/ear preservation, pose, background,
reference hairstyle fidelity and blinded ratings. First run realistic
desktop GPU teacher benchmarks, **then** investigate quantization/student
inference on a physical Android handset before making offline PWA promises.

As of 2026-10-22, AnyBald's project page still lists code as "Coming Soon";
Stable-Hair v2 publicly lists diffusion code and pretrained artifacts but
does not establish a fully offline Android browser run or a cleared commercial
license for every dependency and checkpoint. Those are research candidates,
not integrated product components.

Links:
- AnyBald: https://vision3d-lab.github.io/anybald/
- Stable-Hair v2: https://github.com/sunkymepro/StableHairV2
- HairFastGAN: https://github.com/AIRI-Institute/HairFastGAN
