# Phase 37 — cautious hair-foreground color estimation (research only)

**Date:** 2026-10-22. **Source:** research branch
`research/offline-generative-feasibility-2026-10-21`.
Production `main` and the paid-salon customer-facing flow remain untouched.

## Motivation and scientific limits

Our real offline hairstyle previews continue to exhibit a
`fringe_occlusion_unresolved` / artificial forehead hair-cap failure
despite Phase 32's bounded edge matting, Phase 36's minimal texture
adjustment, and the independently measured 53-pixel suspicious
forehead-line run. Hair *segmentation* delivers a class confidence, not
a ground-truth alpha matte or true hair foreground RGB. Border pixels
in the input reference photograph may contain mixed hair and the
reference model's ORIGINAL background, producing visible spill when
that image is composited onto the customer.

The physically standard matting equation is:

`observed_pixel = alpha * hair_foreground + (1-alpha) * old_background`

With alpha, foreground and old background unknown, recovering all three
from one RGB pixel is **mathematically underdetermined**. The new
algorithm is **not a solution to this inverse problem**; it explores
only small, local color edits where sufficiently distinct high-
confidence foreground/background samples are present. It cannot
generate new hair strands, estimate 3D geometry, create proper
shadows or restore unseen scalp. Its output should never be treated
as a verified true matte.

Background resources:

- Lutz et al. (2021), *Foreground Color Prediction Through Inverse
  Compositing*, WACV, published open access:
  https://openaccess.thecvf.com/content/WACV2021/papers/Lutz_Foreground_Color_Prediction_Through_Inverse_Compositing_WACV_2021_paper.pdf
- MIT Computational Photography, compositing, segmentation and matting:
  https://people.csail.mit.edu/fredo/comp-photo-book/08-single-image-computational-photography-08-compositing-segmentation-and-matting.html
- The current repository's segmentation mask remains only a *semantic
  prediction*. Do not transfer the scientific paper's superiority
  claims or ground-truth datasets to this bespoke implementation.

## Implementation

`public/ai/migan/reference-foreground-color-research.mjs`
exports `estimateBoundedReferenceForeground()`:

- Pure JavaScript and two existing locally decoded 512×512 RGBA
  buffers: original reference photo and MediaPipe hair confidence.
- Only consider original *transition-confidence* hair pixels with
  confidence 166–218; pixels outside this band remain byte-identical.
- Require a nearby reliable >=240 foreground pixel AND <=40
  background pixel within five pixels of the transition.
- Refuse speculation if sampled hair/background RGB separation is
  smaller than 24/255 averaged over channels; inverse compositing
  uses a conservative smoothstep of predicted segmentation confidence
  and skips unstable estimated low-coverage.
- Infer a bounded RGB foreground-color hypothesis using the nearest
  reference background and reference hair interior as anchors;
  cap every channel adjustment to <=18 units, preserve original
  transparency and hair segmentation bytes, and never synthesize
  support outside the original mask.
- No remote requests, image upload, GPU/model downloads, newly
  trained network, added face landmarks, reviewer votes or telemetry
  photo data. Records aggregate numeric counts only.
- All returned output carries `trueAlphaMeasured:false`,
  `photorealismVerified:false`,
  `commercialUseApproved:false` and `exportAllowed:false`.

`public/ai/migan/hair-removal-studio.html` adds an independent
Persian A/B experiment button with corrected donor color, a separate
non-exportable 512² preview, clear uncertain/no-effect messaging, and
aggregate metrics. Its derived composite is generated **only through
the existing face-protected donor compositor**. Before it is shown,
the current original preview must match the recomputed baseline, and
every single pixel must maintain identical donor opacity and
unchanged non-hair RGB and original transparency. Failure aborts
the experiment instead of silently weakening any veto. Changing the
reference portrait or consent clears the experiment entirely.

`scripts/phase37-reference-foreground-regression.mjs` uses
a known synthetic hair/background mixture to verify that:
the bounded foreground-colour hypothesis reduces the synthetic
reference spill, never modifies non-transition pixels, never
invents segmentation opacity, refuses flat-color/ambiguous samples,
remains deterministic and rejects malformed/transparent input.
Synthetic equality is NOT evidence for real portraits.

`scripts/real-hair-removal-studio-smoke.mjs` now additionally runs
the reference-color A/B on the REAL offline MediaPipe and MI-GAN
hair-compositing chain in Chromium, checks strict face/nonhair
pixel invariants and reference-photo consent, and repeats the
same numeric measurements after a fully network-disabled reload.
The test fixture reuses bundled salon images, not independently
identified different human subjects.

## Required GO/NO-GO distinction

Passing all software tests proves only:
bounded color transformation, pixel safety, no cloud inference,
and repeatability on the tested catalog pair. Even an apparent
improvement in synthetic spill cannot show that the real hairline
looks natural. A suspicious forehead hairline discovered in Phase 35
must remain a warning; this procedure cannot resolve missing hair
geometry.

A real GO requires a rights-cleared generative hairstyle transfer
model suitable for offline Android phones, physical-device
benchmarks, independent source/reference identities and informed
consent, and human-blinded ratings measuring hairline, occlusion,
style fidelity and face identity. Those independent conditions are
not established here.

## Verification tracking

Until a completed successful GitHub Actions run with the exact
Phase 37 branch commit and full integrated browser smoke is
available, this work is **implemented but not integration
certified**. Append actual measured candidate/change counts and
a link to a real verified passing run, without inferring
beauty-quality improvement from the RGB/color proxies.


## Independently executable actual browser result — verified

**PASS:** GitHub Actions run
https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39815999720
on commit `257ef3a33f8fb9e69729958bc67cf913a803a8ec`.
The job completed successfully, including all unit tests, genuine local
MediaPipe masks, MI-GAN 512×512 hair-removal inference, integrated
reference-guided transfer and a full network-disabled browser repeat.

Browser-local catalog fixture metrics:
- Original reference confidence-transition candidates: **619**
- Reference pixels whose existing RGB channels were conservatively
  corrected: **382**
- Composited preview pixels that differed from the original reference
  transfer: **272**
- Inferred true alpha ground truth: **none**
- Newly generated hair support: **zero**
- Protected face pixels edited by the corrected compositor: **zero**
- Human visual quality independently confirmed: **false**
- Commercial/customer export authorization: **false**

Offline test run reproduced the SAME 382 reference and 272 final
preview changed-pixel counts; no external portrait uploads were
observed by the browser network assertions. A locally selected reference
image was separately tested with a consent checkbox and permission
withdrawal. The pixel checks ensure identical hair opacity, unmodified
RGB outside the approved donor support and byte-identical source alpha.

**Interpretation:** Only approximately 0.10% of final 512×512 portrait
pixels changed (272/262144), and no separately acquired human-quality
reference data exist to evaluate whether the difference is beneficial.
The forehead artificial 53-pixel hairline from Phase 35 was NOT
resolved or physically reconstructed in this experiment. A real
portrait-level background-spill metric cannot be inferred solely from
the self-referential inverse-compositing calculation. Image plausibility
remains an external human judgment.

**Decision: engineering experiment PASS; commercial hairstyle try-on
NO-GO.** The next scientifically meaningful effort is a
rights-cleared actual alpha-matting/hair synthesis model with physical
Android testing, not unbounded RGB corrections.
