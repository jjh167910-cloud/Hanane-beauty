# Phase 41 — ground-truth selective-risk alpha benchmark and dataset rights gate

**Date:** 2026-10-22. **Research branch:**
`research/offline-generative-feasibility-2026-10-21`.
**Production:** unchanged. Customer-ready hairstyle try-on: **NO-GO**.

## What was actually added

The previous Phase 40 color-line estimate covered **3,903/11,284
unknown hair-edge pixels (34.6%)** on one catalog image. It rejected
7,381 pixels with insufficient evidence, and returned no independent
hair-alpha ground truth. Its RGB reconstruction residual of 1.16
channel units merely measured compatibility with the chosen local
foreground/background color anchors.

Phase 41 introduces two reproducible, independent test modules:

- `scripts/alpha-quality-metrics.mjs` scores outputs against a
  *separately provided* numerical alpha-truth buffer, measuring:
  coverage, abstentions, MAE, RMSE, error over 0.1, coverage/error
  on true intermediate-opacity edges, and gross opaque/clear mistakes.
  It refuses corrupted truth, silently modified known hair/background
  constraints, forged approval, or missing validity buffers.
- `scripts/phase41-hair-alpha-groundtruth-regression.mjs` creates
  **five controlled synthetic mixtures** representing regular hairline,
  wiggled pseudo-strands, textured background, low-contrast hair and
  inconsistent pixel colors. It evaluates the Phase 40 estimator
  under an independent analytic truth while recording BOTH the
  error on accepted pixels and the share of unestimated pixels.
  Errors for an all-abstained test are `null`, never a spurious zero.

An additional adversarial test demonstrates **non-identifiability**:
two different fractional opacity assignments and plausible local
hair foreground colors can yield exactly the **same visible RGB
photograph and three-class trimap**. No single-image technique can
infer which one is physically correct from that evidence alone.
Results must never claim strand-level truth based solely on a
perfect fit to the compositing equation.

### Important benchmarking caveats

The controlled test images deliberately follow the RGB mixing
equation used by the estimator. They **must** be interpreted as
unit-calibration and failure-mode checks, not a blind external
benchmark of real photography. Strong results on these fixtures are
expected; they cannot establish realistic wisps, forehead crossings,
hairline geometry, person identity or salon acceptance.

In particular, low error obtained at low coverage can be completely
misleading. The quality gate requires reporting both metrics, plus
which pixels the model chose not to resolve. All CI generated
synthetic scenes are procedural and contain no human likeness or
photographic asset and require no pretrained weights.

## Rights-reviewed real matting dataset candidate: P3M-10K

Original repository:
https://github.com/JizhiziLi/P3M

Original **one-page dataset release agreement**:
https://jizhizili.github.io/files/p3m_dataset_agreement/P3M-10k_Dataset_Release_Agreement.pdf

Community HF redistribution manifest:
https://huggingface.co/datasets/nobg/P3M-10K

The published agreement calls the dataset MIT-licensed and requests
scholarly attribution, **but expressly states that image copyright
remains with each original owner** and that the data provider may
terminate access. It contains **10,421 portraits with annotated
whole-person alpha mattes**. The HF redistribution lists:

- `train`: 9,421 privacy-obfuscated (blurred face) portraits;
- `P3M_500_P`: 500 blurred-face evaluation images;
- `P3M_500_NP`: 500 normal/unblurred public-person images.

These are *portrait mattes*, not manually annotated hair-only
alpha values where translucent wisps cross forehead skin.
This data could teach outside-person foreground contours, but
cannot independently supervise every hair-versus-face occlusion.
Per-image commercial-use provenance, consent and any applicable
third-party attribution must be audited. Treat the non-blurred
public-person split as research-restricted pending explicit image
rights and consent, not as free salon training photos.

**Do not download, train or redistribute P3M for customer-facing
commercial hair synthesis merely because its wrapper license says
MIT.** The project has not accepted the upstream release agreement,
inspected each asset's rights or generated trained weights.

Other previously examined ViTMatte Composition-1k-derived
pretrained weights have commercial-rights caveats; those were
not downloaded or incorporated here.

## Required validation

1. Execute `npm run test:unit`, including the new Phase41 suite,
   with every synthetic failure/abstention and the mutually
   indistinguishable-alpha case.
2. Rerun the true local 512x512 MediaPipe, MI-GAN, MODNet,
   Phase 39 trimap and Phase40 classical hair-alpha preview,
   then repeat with Chromium networking disabled.
3. Ensure user-photo clearing, anonymous evidence export,
   face/skin veto and complete offline packaging still pass.
4. Publish the true five-scene metric table only after
   inspecting the successful CI logs on the exact code revision.
   All benchmark metrics must be labeled **synthetic only**.

**Next scientific GO gate:** Acquire portrait images and *hair-specific*
ground-truth alpha with verified asset-level commercial permission,
separate subjects across train/validation/test, and assess coverage vs
true MAE before attempting a compact commercially distributable
neural hair-alpha model. Validate on a real Android handset. The
synthetic curves are not a substitute for these prerequisites.


## Verified measured Phase 41 CI result

**Complete GitHub workflow SUCCESS, commit**
`b306d5701bc42dc653c4f29a8a6b1b46af208b6c`:
https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39824136889

All build, unit-test, source/media hair segmentation, pose-flow synthetic,
MI-GAN and MODNet checksum/inference, integrated browser try-on,
airplane-mode reload, full offline asset packaging and evidence checks
passed. Original Phase40 real-image results of 3,903 resolved /
7,381 abstained out of 11,284 unknown pixels reproduced.

Five synthetic ground-truth scenes yielded:

| Scenario | Estimated / unknown | Selective MAE on 0–1 alpha |
|---|---:|---:|
| Uniform high-contrast straight edge | 84.62% | 0.0007 |
| Wiggled pseudo-strands | 96.98% | 0.0005 |
| Varying background colors | 84.62% | 0.0014 |
| Low-contrast hair/background | **0%** | **null** (not a zero-error pass) |
| Contradictory outlier colors | 59.50% | 0.0007 |

The benchmark's low MAE is **in-distribution synthetic algebra**:
the generator follows the same RGB mixing equation assumed by the
estimator. It is not independent photographic validation.

The additional non-identifiability regression constructed two distinct
physically plausible per-pixel foreground color/alpha solutions with
**identical observed RGB image, identical trimap, identical estimated
coverage 84.615%**. The same prediction had error:

- Against synthetic truth A: **MAE 0.0007332**
- Against alternative image-compatible truth B: **MAE 0.1284605**

The competing opacity/color explanations cannot be distinguished
by the observed picture or the available trimap. This proves
equation-fitting accuracy alone cannot justify claims of real
wisps, identity or scalp realism. No human subjects participated,
no customer portrait was uploaded, no new model trained and
no commercial-use permission was granted.

**Quality gate:** research CI PASS, hair-alpha fidelity on real
different-person photographs NOT EVALUATED, license-cleared
commercial hair synthesis NO-GO, real Android device performance
NOT TESTED. Production `main` unchanged.
