# OffHair Phase 26 — target-aware inpainting and measured A/B

Date: 2026-10-22 · Branch: `research/offline-generative-feasibility-2026-10-21`
**Status: verified engineering research, visual-quality NO-GO.**

## Problem and falsifiable hypothesis

In Phase 25, MI-GAN removed the whole approved original-hair region even where
the selected reference hairstyle would be fully opaque. Hypothesis: a target-aware
neural-removal mask can reduce unnecessary source reconstruction, preserving
source evidence, while changing no unauthorized facial or background pixels.
This is not a claim of better visible appearance, fewer ONNX operators, or
faster phone inference.

## Implemented modules and safeguards

- `public/ai/migan/target-aware-repair.mjs`: project reference-hair
  confidence using the *same limited 2D eye scale and roll* as the baseline.
  Pixels can be removed from the original 0=edit mask only under a high-
  confidence opaque target hair pixel (threshold >=220/255), with a 2px
  circular erosion of the opaque region to preserve source-hair repair
  around donor feather edges.
- Safety: preserve the original production-independent approved removal
  mask as an immutable authorization ceiling. Target-aware method cannot
  ADD a new edited pixel. Strictly check predicted semantic skin, observed
  facial landmark core, mask integrity, alignment bounds, and face geometry.
  On disagreement or invalid geometry, refuse to run.
- If no inpainting pixels remain, the experiment explicitly skips the
  neural call and marks a zero-hole research preview rather than inventing
  a scalp. Zero-mask composition is opt-in and never authorizes export.
- `public/ai/migan/hair-removal-studio.html`: opt-in Persian UI showing
  baseline transfer and a second *actual* MI-GAN target-aware inference
  in a separate, non-exportable research canvas. Checks consent, stale
  results, local model bytes and reference-selection changes.
- `scripts/offhair-target-aware-regression.mjs`: tests the subset
  invariant, edge erosion, protection, malformed input and zero-hole cases.
- `scripts/real-hair-removal-studio-smoke.mjs`: genuine Chromium
  MediaPipe + MI-GAN with a full second model invocation, offline
  PWA cache/reload and new research UI controls; screenshots capture
  baseline and alternative side-by-side. No remote photo inference.

## Observed results — one catalog subject, one reference, no ground truth

Verified workflow:
https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39734601953

A genuine 512x512 local-browser test with source catalog style 1 and
reference style 2 measured:

| Engineering observation | Value |
|---|---:|
| Previously approved original mask | 16,950 pixels |
| New targeted mask | 1,469 pixels |
| Pixels spared from unnecessary neural reconstruction | 15,481 |
| Original removal mask reduction | 91.3333% |
| Changed pixels in final A/B composite | 68 |
| Changed pixels under nominally opaque donor | 1 |
| Independently validated human appearance improvement | **NONE** |
| Additional unauthorized face/background edits | 0 |
| Target-aware output customer export allowed | **NO** |

The deliberately limited 2D method reports *the same* `fringe_occlusion_unresolved`
and `predicted_skin_occlusion_unresolved` warnings as the baseline.
The current screenshot still exhibits unnatural cap / hairline
transitions, as expected from generic inpainting plus a rigid donor mask.
The changed-pixel count is an engineering diff, NOT a realism improvement
or meaningful visual preference score.

The model's tensor size and computational graph are identical for a
small and large mask: **a 91% decrease in edit area DOES NOT imply a 91%
reduction in inference time, RAM or energy**. No Android-specific
performance claim is made.

## Decision

- **PASS:** constrained donor-aware planner; real second browser neural
  inference; non-expansion of edit authority; cache-integrated offline
  repeat; non-exportable independent research preview.
- **NO-GO:** photorealistic bald/scalp reconstruction, reference-consistent
  generative hairstyling, diverse identity/pose generalization, Android
  device performance, and permission-cleared commercial use of any
  unintegrated hairstyle-generation checkpoints.

## Real next milestone

Stop spending further cycles optimising only the 2D overlay. Benchmark a
*specialized reference-guided hair generator* and a dedicated
hair-to-scalp generator on legally cleared *different-person* portraits;
keep a frozen before/after gallery and blinded artifact scores. Compare
to the current source-preserving baseline, test license and weights
provenance, and only then attempt compact on-device distillation or
commercial salon release. The official HairFastGAN HF repository declares
MIT for its model repository, but individual dependencies and training
lineage still require rights review:
https://huggingface.co/AIRI-Institute/HairFastGAN
The official CUDA V100 sub-second benchmark is not Android Chrome
performance. Large diffusion alternatives such as Stable-Hair v2 are
not proven suitable for local midrange-phone PWA inference.
