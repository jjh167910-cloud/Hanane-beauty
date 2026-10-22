# Phase 35 — matched hairline close-up human A/B, CI browser reliability

Date: 2026-10-22 · Research-only branch · Production main unchanged.

## What changed

Phase 33 made A/B anonymized human votes available, but source
photographs were displayed at overall-image scale. Phase 34 added a
heuristic upper-forehead risk-box highlighting, yet it did not establish
how to perform an *unbiased visual comparison* of actual strand
transitions.

`public/ai/migan/hairline-review-crop.mjs` implements a deterministic
upper-forehead crop based ONLY on the *source person's original eye
coordinates*, not on which candidate happens to look better. It refuses
unreliable geometry and photograph boundary clipping.

The focused Phase 33 review screen now also displays two equal-magnification
hairline close-ups A and B, with the exact same source-derived crop.
The images are drawn into volatile browser canvases and are cleared
when the reference/source photo changes or either permission is
withdrawn. No crop coordinates, image bytes or physical portrait
identifiers are added to the downloadable human-vote JSON.
A focused reviewer still sees the original source and selected
reference for context, while method labels outside the review are
hidden. Familiarity with the original experimental panel makes
independent blinding impossible; the UI never self-certifies it.

The close-up can fail to appear when the face geometry is unreliable.
The correct behavior is a clear refusal of the zoom view, not a biased
or invented ROI. The full-image A/B remains available for explicit
human review, and no selection makes the result salon-ready.

## Actual quality claims

The Phase 26 archival preview shows an unnaturally straight pasted
hair cap across the source forehead. Phase 31 smoother cutout improved
the RGB boundary proxy but uncovered original erased hair; Phase 32
scalp-protection reduced those exposures to zero on a single catalog
pair. Phase 34 heuristic locator flags possible hard cutout edges but
is NOT a learned photo-realism detector.

The Phase 35 close-up is a **reviewing instrument**, not a generator,
model, cosmetic transformation or human preference study. Only
real blinded reviewers examining consented, rights-cleared photos of
different people can collect a relevant quality signal.

## Browser CI reliability correction

One GitHub Actions run for Phase 34 hung for an unusually long time
while `npx playwright install --with-deps chromium` was installing
host OS dependencies. The research workflow now downloads only
Chromium's headless shell (`npx playwright install --only-shell chromium`)
using the pinned Playwright version and bounds the install step to
three minutes. The official Playwright browsers documentation supports
`--only-shell` for headless-only Chromium tests. If a GitHub image
lacks system libraries, the job should FAIL instead of silently
removing the browser test; the next corrective action would be
explicitly provisioning those missing libraries in a pinned runner.

- https://playwright.dev/docs/browsers

## Regression evidence expected

`scripts/phase35-hairline-review-crop-regression.mjs` checks
identical A/B ROIs, no out-of-image cropping, strict geometry and
no implied commercial approval.

`scripts/real-hair-removal-studio-smoke.mjs` now asserts real
local MediaPipe/MI-GAN browser results render two nonempty
matched forehead close-ups, retain hidden method labels, and erase
close-ups on review cancellation; repeats after true network-disabled
browser reload.

Record the actual final-commit GitHub workflow run and its result
only after inspecting statuses and logs. Until then the change is
implemented but NOT fully integration-verified.

No physical Android benchmarking, human visual ratings, legally
cleared generative model, or independently verified photorealistic
customer hair transfer is established.
