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


## Actual verified result and limitations

**SUCCESSFUL complete workflow**:
https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39811626099
on commit `051ff52dbcf8536b416c4a069b3dd82f7003de6a`.
All unit tests, browser inference, full offline reload, model availability
and research integrity steps passed. The faster headless-shell browser
installation also completed successfully on GitHub's Ubuntu runner.

The Phase 34 actual MediaPipe+MI-GAN catalog-photo hairline inspection
reported:

- `possibleArtificialHairline: true`
- `inspectionColumns: 174`
- `maximumHorizontalRunPx: 53`
- `skinFaceChangedPixels: 0`
- `visualQualityApproved: false`

Thus the on-device 2D detector found a 53-pixel straight-ish
forehead cutout sequence that warrants human review. It is a
heuristic, not independently labeled ground truth.

Phase 35 real-browser focused review confirmed:
`matchingSourceFrame:true`, `bothSidesRendered:true`,
`methodLabelsHidden:true`, `photoExportAllowed:false`,
`realHumanVotes:0`. The Phase 34 warning was reproduced with the
browser network disabled. The user-facing review still DOES NOT
show a new generated hairstyle or certify the correctness of either
variant, despite working offline.

The face-and-donor retention controls from Phase 32 also continued
to pass on this catalog pair with 98.84% donor opacity retained and
zero freshly under-covered erased-hair pixels. These are separate
engineering proxies and cannot overrule the visible artificial cap.

**Engineering and offline reproducibility: PASS.**
**Visible artifact warning: POSITIVE (possible artificial hairline).**
**True human visual ratings, independent subjects, commercial hairstyle
generation, and physical Android benchmarking: NOT AVAILABLE.**
Production unchanged.
