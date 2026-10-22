# Phase 44 — RGB perturbation reliability gate for new hair-alpha hypotheses

Date: 2026-10-23. Research branch:
`research/offline-generative-feasibility-2026-10-21`.
**Salon production `main` unchanged. Customer-ready photorealistic
offline hairstyle generation remains NO-GO.**

## Decision and why it matters

Phase 43 raised the *number* of hair-edge hypotheses on a catalog
512x512 image from 3,903 to 4,242 out of 11,284 unknown-edge pixels
(+339), but no independent real hair-strand alpha existed to evaluate
their accuracy. More coverage is not necessarily better: the real
forehead hairline remained artificial, and Phase 41 proved single-image
alpha non-identifiability.

Phase 44 stress-tests **only those 339 newly hypothesized alpha
values**, preserving every Phase 40 originally accepted alpha and all
definite hair/background and protected facial skin. It removes new
hypotheses sensitive to small, deliberately deterministic RGB
perturbations instead of making new assumptions about true strands.

## Implementation and fail-closed behavior

- `public/ai/migan/hair-alpha-stability-gate.mjs` runs the
  already-verified Phase 43 local conditional RGB fit twice against
  two opposite, deterministic ±3/255 *spatially varying* RGB
  perturbations of the original photograph. Original Phase 40 alpha
  anchors remain frozen to avoid training on recursive predictions.
- A newly estimated pixel is **stable** only if both perturbed
  source-image runs continue to accept it and the new alpha stays
  within **0.045** of the original hypothesis.
- Otherwise it is explicitly returned to the UNKNOWN class,
  without changing source RGB, an originally accepted alpha, a
  definite hair/background pixel, any protected-face region, or
  any public hairstyle preview.
- In the Persian research-only UI:
  **teal** = accepted newly hypothesized and stable;
  **orange** = earlier newly hypothesized but withdrawn by stress;
  **magenta** = never resolved;
  grayscale = existing accepted alpha.
- `scripts/phase44-alpha-stability-regression.mjs` verifies
  strict monotonicity (coverage never increases), deterministic
  replay, immutable original pixels, protected face, unchanged
  accepted baseline, conservative refusal on outliers/low contrast
  and selective MAE on separately constructed *synthetic* alpha.
- `scripts/real-hair-removal-studio-smoke.mjs` repeats with
  actual local MediaPipe+MI-GAN and source-image segmentation,
  the Phase 40 and Phase 43 output, then a full network-disabled
  Chromium reload, asserting identical abstentions and protected
  semantics.

The algorithm uses **no additional weights or online inference**,
makes no new strands and has
`alphaGroundTruth:false`,
`neuralHairMattingExecuted:false`,
`commercialReleaseAllowed:false`,
`photorealismVerified:false` and `exportAllowed:false`.

### Full successful GitHub Actions evidence

- **Run:** https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39862564648
- **Code commit:** `0470aa07357e236f28a274eba2cf3651cea97824`
- Complete CI SUCCESS: build, unit test, actual local hair
  segmentation, real MI-GAN inpainting, MODNet verification,
  research suite, integrated browser A/B, airplane mode,
  privacy cleanup and offline asset packaging.

| Real catalog source, 512×512 | Pixels |
|---|---:|
| Unknown hair edge (Phase 39) | 11,284 |
| Previously accepted alpha, left unchanged (Phase 40) | 3,903 |
| Additional Phase 43 hypotheses before stress | 339 |
| Additional hypotheses surviving Phase 44 stress | **169** |
| Newly hypothesized pixels withdrawn for instability | **170** |
| Effective accepted pixel count after Phase 44 | **4,072** |
| Remaining abstentions after Phase 44 | **7,212** |
| Phase 43 coverage before test | **37.5931%** |
| Phase 44 stability-gated coverage | **36.0865%** |

The actual `PHASE44 AIRPLANE MODE RGB STRESS GATE` browser log
reported precisely **169 stable / 170 withdrawn** after disabling
all browser networking, with no photograph upload or customer export.
No score is claimed against independent real hair-alpha truth.

### Synthetic validation (not photographic ground truth)

A held-out synthetic fractional-alpha stress suite reported:

- Phase 43 held-out coverage before stress: **91.3532%**
- After stability gating: **89.5945%**
- Retained new hypotheses: **626**
- Withdrawn new hypotheses: **36**
- MAE on accepted alpha against the *synthetic test generator*:
  **0.0007258** (0 to 1 scale).

Those figures arise from idealized, algebraically compatible generated
pixels. They do NOT establish truth for real people.

## Critical limits and future work

1. A stable alpha can still be **consistently incorrect**;
   this experiment measures susceptibility to very small RGB
   variations, not physical transparency.
2. The perturbation is deterministic per-channel pixel noise,
   **not calibrated camera sensor noise**, realistic JPEG artifacts
   or a full photometric invariance protocol. Its verdict is
   conditional on frozen earlier color-line anchor predictions.
3. The test remains on a bundled catalog portrait rather than a
   representative, independently cleared dataset of different
   human identities with genuine hair-only alpha ground truth.
4. No result supports commercial photorealism claims, transfer of
   unseen hair geometry, new scalp shadows, thermal suitability of
   a physical Android handset, or legal rights to unreviewed photos.
5. The prior *53-pixel suspicious straight forehead cutout* remains
   unresolved. Hairline synthesis, not continued alpha-smoothing,
   is still the blocking technical quality need.

**Phase44 engineering/risk-screen CI: PASS.
Demonstrated higher photorealistic transfer quality: NOT ESTABLISHED.
Commercial salon hairstyle try-on: NO-GO.
Production unchanged.**
