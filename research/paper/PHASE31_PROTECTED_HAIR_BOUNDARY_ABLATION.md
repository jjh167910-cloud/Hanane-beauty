# Phase 31 — conservative hair-cutout boundary ablation (research)

Date: 2026-10-22 · Experimental branch only; production `main` untouched.
**Current decision:** no salon release, no claim of photorealism.

## Motivation / precise hypothesis

The Phase 25–30 pipeline composites hair pixels from a reference photograph
onto a MI-GAN-restored source. The cutout has discontinuities along scalp/
background and the uneditable face boundary. Reducing a donor layer's alpha
over the innermost few pixels may decrease an objective edge contrast **proxy**.
However, it can expose an implausible gray MI-GAN scalp and erase fine hair
strands. Therefore a lower RGB discontinuity is NOT evidence of improved
beauty, successful hairline synthesis, or preserved natural strand texture.

## Added experimental code and controls

`public/ai/migan/hair-boundary-refinement.mjs` implements
`refineReferenceHairEdgeResearch()` for a previously successful,
non-exportable `composeReferenceHairResearch` result. It:

- Requires the original restored image and the exact protected
  semantic-skin and landmark-face masks.
- Rejects untrusted masks, a baseline result which already edited outside
  its approved donor support, altered opacity channels, or touched blocked
  facial regions.
- Softens only the EXISTING inner boundary of donor hair by at most 4
  pixels, without increasing any donor alpha or adding hair support.
- Uses an approximate linear-light interpolation between the unchanged
  restored source and preexisting transferred hair. No new strand geometry,
  texture or anatomy is generated.
- Reports affected pixels, the number of changed channels, and a boundary
  RGB-jump metric for the **same fixed silhouette before and after**.
  This is a narrow pixel metric, NOT LPIPS, blinded MOS or any face-ID
  clinical/scientific conclusion.
- Always returns `exportAllowed:false`,
  `referenceHairstyleGenerated:false`,
  `photorealismVerified:false` and
  `realHumanPreferenceMeasured:false`.

The experiment is exposed in the Persian offline research studio with a
separate opt-in A/B canvas, never replacing the production hairstyle UI.
It works for bundled catalog references or locally uploaded reference
photographs with separate image-use permission.

`scripts/phase31-hair-boundary-regression.mjs` checks deterministic
deformation, monotonic alpha reduction, unchanged input buffers, unchanged
facial protection, no unauthorized pixel writes, safe rejection of malformed
masks, a simple synthetic discontinuity, and image-border safety.

`scripts/real-hair-removal-studio-smoke.mjs` now checks that actual
MediaPipe+MI-GAN browser outputs produce a non-exportable edge A/B, that
the local reference file works offline, and that both reference and source
consent withdrawal discard the result. It collects only numerical proxy
metrics in CI, not raw user photos.

## Research acceptance rules

Engineering PASS is possible only with:
1. Full `npm run test:unit` including Phase 31 mask and pixel security.
2. True Playwright local neural and reference preview running.
3. Identical metrics on a repeat with browser network disabled.
4. No skin/background edit outside existing allowed support and no
   download authorization.
5. Explicit NO-GO report for anthropometric and hairline realism.

Visual-quality GO would require independently consented source/reference
photos depicting confirmed different people, human-blinded before/after
scores for scalp plausibility, new haircut fidelity, strand preservation
and hairline seams, pose-stratified failure rates and phone runtime data.
No such data are provided by the test fixture catalog, and model rights
and a real hairstyle generator are still unresolved.

**Only after verified CI logs exist:** append measured seam and changed-
pixel counts to this report, and record whether the boundary proxy
actually decreased for each trial. If quality is not measurable, do not
promote this overlay as a meaningful quality gain.


## Verified real browser result (October 22, 2026)

Successful full GitHub CI for exactly code + original Phase 31 report
commit `8c6cb26d834cb3189234498a1f37ea1f5a7be25a`:
https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39798664766

The test used the real MediaPipe hair segmenter, six-class
semantic skin veto, MI-GAN reconstruction and bundled catalog images
in Chromium, with a repeat after disconnecting browser networking.

| A/B measurement | Baseline | Feathered |
|---|---:|---:|
| Boundary mean absolute RGB jump across original hair-mask edge | 64.08555 | 28.89227 |
| Pixels differing between the A/B rendered previews | — | 2,311 |
| Donor pixels with reduced alpha | — | 2,317 |
| Known protected face/skin pixels changed | 0 | 0 |
| Output allowed for customers | No | No |

The chosen boundary RGB discontinuity **proxy** decreased approximately
54.9%. This is not a 54.9% visual-quality improvement. Its absolute
scale is channel units and depends heavily on pose, donor hair colors
and source background; it is measured only on one non-independent
catalog pair. A smoother boundary might conceal strands, reveal gray
inpainting or violate visual hairline fidelity despite a lower score.

The real browser smoke also exercised a locally picked reference file
and verified the new matting could run and was identical after a full
network-disabled PWA reload. Source and reference consent revocation
cleared the result and prevented export. The existing
`fringe_occlusion_unresolved` and
`predicted_skin_occlusion_unresolved` warnings still apply.

**Engineering A/B: PASS. Human-rated improvement: NOT MEASURED.
Realistic generative hairstyle transfer: NO-GO. Android device
performance: NOT MEASURED. Commercial salon use: NO-GO.**

Next experiment, contingent on image rights: collect independent
different-person examples and compare human-rated hair strand loss,
hairline realism, identity preservation, and failure/rejection rates.
Do not optimize only this proxy.
