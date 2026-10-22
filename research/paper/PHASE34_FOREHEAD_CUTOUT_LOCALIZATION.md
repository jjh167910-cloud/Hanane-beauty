# Phase 34 — forehead cutout localization and artifact-review overlay

Date: 2026-10-22. Branch:
`research/offline-generative-feasibility-2026-10-21`.
**Status: research-only. Production main unchanged.**

## Why this experiment matters

The surviving Phase 26 composite photograph has an unmistakably
*cut-out-looking, almost flat* transition where donated pixie hair is
pasted across the source model's upper forehead. Previous metrics
optimised all-edge RGB contrast (Phase 31) and hair opacity retention
(Phase 32), and Phase 33 enabled a human A/B voting interface.
None of those methods localized the actual visually problematic forehead
region for independent photographic inspection.

A realistic hairstyle must reconstruct the hairline, including individual
wisps, depth and shadows, and the relationship to scalp and skin. A
2D forehead warning cannot synthesize this geometry; it can only
help reject or manually review suspicious outputs.

## Added code

- `public/ai/migan/hairline-hotspot-audit.mjs` operates entirely on
  the result of the existing protected 2D reference compositor.
  It refuses results lacking local MediaPipe semantic face skin and
  landmark-based source-face zones, unsafe hair support, invalid
  dimensions, or any unapproved hair overlap with protected face areas.
- For each column in a bounded eye-relative upper-face region,
  it looks for an ending donated-hair mask followed by an unoccluded
  forehead pixel. It measures the fraction of eligible columns,
  approximate colour discontinuity and the longest nearly horizontal
  run relative to detected eye separation.
- A combined length/contrast/context heuristic flags **possible**
  hard cutout hairlines. The face-relative warning rectangle and
  approximate suspicious boundary are provided only as local
  instructions to paint on a browser canvas; they are not included
  in the exported anonymous evidence file or CI metrics.
- The UI adds a Persian research button and a dedicated annotated
  portrait view. The diagnostic never edits the original image,
  replaces the A/B candidate, certifies photorealism, or unlocks any
  download. Changing or revoking photo/reference permissions clears
  the preview and its hotspot results.
- `scripts/phase34-hairline-hotspot-regression.mjs` tests
  deliberately flat versus irregular synthetic hairline masks,
  immutable input pixels, bounded geometric warnings, invalid
  semantic/face masks, and refusal of a counterfeit production
  export permission.
- `scripts/real-hair-removal-studio-smoke.mjs` repeats the
  diagnostic after genuine local MediaPipe+MI-GAN inference and after
  a network-disabled browser reload, including both catalog
  reference photos and separately user-selected local photos.
  Only aggregate numeric findings are logged; no customer images,
  person IDs, filenames or landmark coordinates are exported.

## Caveats and interpretation

**A nearly horizontal hairline is not itself proof of a fake haircut.**
Short pixie cuts, straight fringes, undercuts and naturally sharp
hairlines exist. This is a pixel *inspection cue*, not a classifier
trained against human naturalness ground truth. Nor does the absence
of a flagged line prove realism: curls, 3D occlusion, and skin tone
halo defects may be bad even if no long flat section is found.

The existing Phase 26 catalog pairs are likely not independent
human identities. Review of licensed different-subject portraits,
human-blinded visual ratings, actual Android thermal/memory tests
and a commercially legal offline hairstyle GENERATOR remain
necessary before approving user-facing photographic try-on.

## Verification requirement

Record no real-image coordinates, risk score or claimed defect
without an actual successful GitHub workflow including the Phase 34
unit suite, browser integration and airplane-mode repeat on the
current exact research-branch commit. If an image cannot be
classified, the proper outcome is `needsHumanHairlineReview:true`,
not 'looks realistic'. This report will be updated with grounded
numerical results if the complete CI finishes successfully.

**No production deployment, no real-human haircut quality claims.**
