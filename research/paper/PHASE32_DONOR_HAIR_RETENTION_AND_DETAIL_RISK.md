# Phase 32 — hair-retention and strand-detail countercheck

Date: 2026-10-22. Repository branch:
`research/offline-generative-feasibility-2026-10-21`.
**Research-only / never a commercial or photorealistic haircut certification.**

## Prior Phase 31 hypothesis and its weakness

The real Chromium Phase 31 cutout boundary RGB-jump proxy fell from
64.08555 to 28.89227 at a particular catalog pair (roughly a 54.9%
metric reduction). This did **not** demonstrate that the hair looked
better, because fading a reference hair cutout could also lower seam
contrast by removing fine strands or exposing generic gray inpainting.

The remaining visible problems are missing depth-aware hairline
occlusion, crown/scalp geometry, plausible shadows, strand detail
and mismatched source/reference identity or head pose. More blur is
not an alternative to a licensed generative model.

## Implemented independent diagnostic

`public/ai/migan/hair-retention-risk.mjs` provides
`auditHairEdgeRetention()`, operating solely on local 512² RGBA
arrays and the exact original donor-opacity mask, MI-GAN source-hair
removal mask, and protected semantic/anatomical zones:

- Donor alpha retention: sum(candidate donor alpha) divided by
  sum(original transferred donor alpha).
- Erased-source-hair retention: compare donor opacity **only where
  the original source hair was removed by MI-GAN** and the source hair
  segmentation indicates a hair pixel. This finds re-exposure of
  synthetic scalp under overly transparent donor overlays.
- Newly low-coverage source-hair pixels: original donor alpha ≥160/255
  falling below that threshold after edge refinement.
- Local rendered RGB neighbour-gradient proxy: compare edge energy
  within the fixed original donor-support region. A flat cutout or
  strong loss of measured texture gradients is flagged, not rewarded
  for its smoothness.
- Adversarial safety check rejects any new edit outside the existing
  donor support, any increase in donor opacity, transparency changes,
  edits to predicted skin/face zones, or source/model mask corruption.

Initial guard thresholds are **engineering hypotheses**, not
scientifically optimized or medically validated:
98.5% retained total alpha, 97% retained donor opacity over removed
source-hair pixels, zero new threshold-crossing high-coverage hair
pixels, measurable local texture, and at least 85% of the original
interior RGB-gradient energy. A pass is named `proxyCheckPassed`,
never `visualQualityPassed` or `commercialGO`.

`public/ai/migan/hair-removal-studio.html` now displays these
extra warnings and numeric counters next to the Phase 31 soft-edge
A/B preview, whether it is based on the bundled sample or a separately
authorized local reference photo. The result still cannot be saved as
an approved customer hairstyle.

`scripts/phase32-hair-retention-regression.mjs` includes positive
low-opacity-loss tests and negative scenarios in which simple smoothing
hides original hair, unacceptably lowers detail, reaches facial skin,
changes transparency or edits unapproved background pixels.

`scripts/real-hair-removal-studio-smoke.mjs` verifies the true
MediaPipe + MI-GAN + referenced-hair experiment in Chromium, including
actual numerical risk counters, refusal of export, a separate local
reference and full airplane-mode repeat. No user photograph, face
landmark arrays or fingerprints are exported to GitHub.

## Decision protocol

Any risk warning means *do not select the softened image as an
automatic best result*. A lower pixel seam score is insufficient.

No result, even without warnings, establishes accurate hair geometry,
realism, strand fidelity, different-person generalization or phone
performance. The scientific next gate is anonymized, independently
consented **different-person** photos and blinded human paired image
ratings, with failure/rejection rates and independent face-identity
assessment. Never use catalog variants of the same person as proof.

## Validation status

The newest `npm run test:unit`, Chromium neural pipeline and
airplane-mode comparator must PASS on the exact final research commit.
**Do not infer latest-commit CI success from a previous run.**
When a complete successful action run is available, append only
its supported numbers and warnings, distinguishing source-image count
from distinct-person sample count.

Production `main` remains untouched.


## Actual Phase 32 neural browser evidence — original stronger edge

Full successful GitHub Actions run:
https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39802674570
at commit `e2e6ea261e251555d5694fa44224a9ac9d49e708`.

A genuine Chromium 512×512 local MediaPipe/MI-GAN source portrait,
segmented local reference and Phase 31 edge trial recorded:

| Measured proxy | Real-browser value |
|---|---:|
| Original rigid cutout boundary RGB jump | 64.08555 |
| Phase 31 strongly softened boundary RGB jump | 28.89227 |
| Remaining total donor opacity mass | **0.96964957** (96.96%) |
| Remaining opacity above removed source hair | **0.98512347** (98.51%) |
| Original high-coverage erased-hair pixels | 16,058 |
| Those newly falling below 160/255 donor opacity | **248** |
| Donor-support pixels changed | 2,311 |
| Mean interior RGB neighbour gradient, before → after | 3.2005 → 4.0667 |
| Relative pixel-gradient energy | 1.27065 |
| Protected face edits | 0 |

The lowered seam score **failed** the independent risk check due to
`donor_opacity_mass_loss` and
`newly_low_coverage_over_erased_source_hair`.
No improvement in human appearance has been verified.
The risk metrics matched after the browser was network-disabled.

**Engineering decision: the aggressive Phase 31 softening is rejected
as the automatic best hair overlay.**

## Safer revision under separate verification

Subsequent research commits introduce
`protectErasedHair:true` in
`public/ai/migan/hair-boundary-refinement.mjs`. It constrains new
donor opacity to never cross below 160/255 on a pixel where the source
hair has already been removed and original donor coverage was at least
160/255. It can only re-strengthen a previously attenuated donor pixel
up to its **original** alpha; it does not authorize new regions, strand
generation or facial edits.

The experimental Persian A/B now uses `radius:3,strength:0.20`
instead of the earlier `strength:0.52`, with a scalp-coverage
guard. The adversarial unit test proves the old strong fade could
cross the coverage threshold while the guarded variant cannot.
It remains a research preview, not a customer deliverable.

**Do not claim any new real-image coverage or seam result for this
revised mode until GitHub workflow verifies the exact guarded commit.**
