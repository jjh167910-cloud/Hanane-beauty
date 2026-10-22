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
