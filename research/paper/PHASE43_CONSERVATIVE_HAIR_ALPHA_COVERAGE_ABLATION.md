# Phase 43 — one-pass, locally constrained hair-alpha recovery

Date: 2026-10-22. Research branch:
`research/offline-generative-feasibility-2026-10-21`.
**Commercial salon production main unchanged.**
**No independently validated photographic hair transparency.**

## Why

Phase40's independent runtime test on a single 512×512 catalog
image resolved 3,903 out of 11,284 uncertain hair-edge pixels,
leaving **7,381 unestimated**. Phase41 showed that small self-
consistency residuals from an RGB mixture are not sufficient proof
of ground truth. Phase42 introduced the ability to measure a
rights-cleared independently labelled photograph in the browser,
but no actual externally independently labelled hair-alpha
photograph was supplied in this project.

Further unconstrained smoothing or hallucinating alpha over face
skin would weaken the privacy and facial-identity safeguards.
A bounded mathematical ablation is useful only if it improves
coverage WITHOUT silently overriding earlier evidence or calling
an unverified alpha value accurate.

## New color-conditioned local fit (not a neural model)

`public/ai/migan/hair-alpha-local-regression.mjs` performs a
**strictly ONE-PASS** regression using only the accepted,
fractional, UNKNOWN-class alpha estimates from the **previously
frozen** Phase40 color-line output. It never feeds newly inferred
alphas back as training points and never relies on edited customer
background or donor transplant pixels.

For each previously unestimated hair-trimap pixel:
1. Gather nearby pixels (radius <=7) that were *already*
   accepted by the earlier algorithm, exclusively from the
   same UNKNOWN region. Require at least eight.
2. Require a meaningful numeric spread of nearby hair-alpha
   anchor values and sufficient local RGB color signal.
3. Fit three weighted linear RGB functions of alpha,
   with original photograph RGB samples and existing alpha
   estimates, and measure fitting residual.
4. Project the target pixel onto that fitted local RGB line,
   rejecting out-of-range alpha, poor color agreement,
   inconsistent model fit, unsupported endpoints, or insufficient
   neighborhood evidence.
5. Preserve every previously accepted pixel, every definite
   foreground/background constraint, every independent
   face-protection mask and all original photograph bytes.
   No pre-existing image, ML model or destination style gets
   altered by the experiment.

A separate Persian research preview colors **newly admitted
hypotheses teal**, pixels still abstained **magenta**, and original
accepted alpha grayscale. It reports coverage and all refusal
reasons. The existing customer hairstyle preview and the Phase40
benchmark are unchanged.

The code has no external weights, no upload, no royalty-bearing
model dependency, no output image export and no server processing.
The method is similar *in spirit* to local color-line assumptions
used in classical image matting, but **it is not an
implementation of Levin's full matting Laplacian, sparse global
solver or any guaranteed equivalent**.

Relevant research:
- Levin, Lischinski, Weiss (2008), *A Closed-Form Solution to
  Natural Image Matting*,
  https://pubmed.ncbi.nlm.nih.gov/18084055/
- Aksoy, Aydin, Pollefeys (CVPR 2017), *Designing Effective
  Inter-Pixel Information Flow for Natural Image Matting*,
  https://la.disneyresearch.com/publication/matting/
- PyMatting documentation distinguishing closed-form solvers:
  https://pymatting.github.io/alpha.html

## Validation and failure gates

`scripts/phase43-hair-alpha-regression-regression.mjs` tests:
- Holding out some otherwise recoverable fractional alpha values
  on an independently generated synthetic edge, comparing baseline
  and enhanced **selective MAE jointly with coverage**.
- Every original accepted sample stays byte-for-byte identical
  and the method cannot modify known foreground/background.
- Outlier saturated RGB samples remain *abstentions* rather than
  new fake hair strands.
- Low-contrast hair/background stays unsupported, and
  corrupt face veto/trimap/opacity and oversize images fail
  closed.
- Repeated calculations are deterministic; no photo inputs change.

`scripts/real-hair-removal-studio-smoke.mjs` uses actual local
MediaPipe hair/skin segmentation, MI-GAN, MODNet, the Phase39
trimap and original Phase40 color-line output, reruns the
new preview and its aggregate counts after Chromium networking
is disabled. It confirms the original 3,903 accepted values
remain untouched and no new output can be exported.

## Precise interpretation

Even if this experiment increases the number of estimated
hair-boundary pixels, it does not by itself improve hairline
realism. It learns no new strands, reflects some of the same
RGB-color assumptions already proven *nonidentifiable* in
Phase41, does not assess real hair transparency against
independent labels, does not reconstruct scalp/3D lighting,
and is NOT a viable direct replacement for a commercially
rights-cleared trained hair-alpha model.

**Research GO gate:** complete successful GitHub Actions on
exact latest branch commit; report actual real-image baseline,
newly inferred count, residual abstentions and airplane-mode
parity, with clearly separated synthetic-ground-truth selective
errors. Any increase in coverage without independently
measured real alpha MAE remains **quality NOT VERIFIED**.

**Customer-ready photorealistic offline hairstyle try-on:
NO-GO until actual consented independent human hair-alpha
data, commercially cleared style-transfer weights, physical
Android device tests and blinded photographic assessment exist.**
