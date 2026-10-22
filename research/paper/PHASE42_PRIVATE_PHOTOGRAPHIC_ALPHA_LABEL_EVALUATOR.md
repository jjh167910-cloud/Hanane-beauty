# Phase 42 — on-device external hair-alpha label evaluation

Date: 2026-10-22. Branch:
`research/offline-generative-feasibility-2026-10-21`.
**Production main is untouched. Photorealistic hairstyle-generation release: NO-GO.**

## Scientific problem and next measurable gate

Phase 40's purely local RGB color-line estimated 3,903 of
11,284 unknown hair-trimap pixels and abstained on 7,381. Phase 41
established a numerical MAE/RMSE/coverage benchmark on five
procedurally generated synthetic images plus a proof that the same
observed RGB photograph can be explained by substantially different
hair transparencies. Thus excellent self-consistency is not
photo-ground-truth accuracy.

**Phase 42 adds a way to compare an actual on-device source photo
against a separately prepared alpha-label PNG. It does not
claim a real independently annotated photo was obtained.**

## Engineering delivered

- `public/ai/migan/hair-alpha-local-groundtruth.mjs`:
  - Accepts a **512×512 opaque grayscale** image encoding measured
    hair opacity, with some fractional gray pixels; refuses RGB
    annotation classes, transparent background, mislabeled dimensions,
    binary-only masks and malformed photo/mask geometry.
  - Consumes the current *in-memory* Phase40 alpha/validity buffers
    and Phase39 protected trimap, while requiring the existing face/skin
    veto and explicit source/photo rights, **hair-only label, pixel
    alignment, and separate-from-prediction** self-attestations.
  - Reports real numerical disagreement only against the *supplied*
    label, selective MAE/RMSE, fraction of unknown pixels accepted vs
    abstained, soft-edge errors, disagreements on known foreground or
    background, and any purported **hair label overlapping face-
    protected regions**.
  - Never overwrites a protected forehead or treats a reported label
    conflict as permission to transfer hair onto the face. Such cases
    are counted for manual review.
  - Outputs a temporary **error map** in browser memory: red
    indicates greater alpha error, magenta = algorithm abstained,
    dark = definite trimap class.
  - Returns `photographicGroundTruthVerified:false`,
    `independentlyLabeledHairVerified:false`,
    `commercialReleaseAllowed:false`,
    `exportAllowed:false`: a checkbox cannot certify license or
    independent medical/scientific annotation.
- `public/ai/migan/hair-removal-studio.html`: adds an optional
  Persian private PNG picker and clear consent instructions. The
  alpha label must be aligned to the **processed 512×512 source
  portrait**, not an arbitrary uncropped camera original.
  If a review was done against a rescaled/reskinned original,
  the returned pixel errors are meaningless. PNG limit: 5MB.
  Mask files and temporary decoded bytes are never uploaded
  or stored on servers; no filenames, photo hashes, face positions
  or private image bytes appear in research result objects.
  Changing source, withdrawing consent, or pressing clear
  discards selected files, derived evaluation maps and metrics.
- `scripts/phase42-local-groundtruth-regression.mjs`: tests true
  numeric error, fractional grayscale alpha parsing, all-attestation
  checks, false success avoidance when all unknown pixels abstain,
  rejection of misclassified masks, and preservation/reporting of
  contradictory hair-vs-face labels.
- `scripts/real-hair-removal-studio-smoke.mjs`: adds a
  **deliberately computer-generated** local PNG fixture, uploaded
  directly to Chromium's file input after actual offline neural
  inference. It verifies that all file/consent/score/clear controls
  and image privacy checks work, repeats with Chromium
  **network disabled** and requires the exact same numeric results.

### Evaluation status and evidentiary limits

No independent photographic hair-alpha labels have been
provided in this session, and none were downloaded, invented,
automatically voted or committed. The browser CI fixture is an
**intentionally synthetic and image-misaligned test PNG**. CI
metrics from it only prove the evaluator runs and masks are
properly disposed; they must NEVER be labeled real hair-alpha
accuracy or used for a paper-quality benchmark.

A self-attestation checkbox establishes neither copyright permission
nor alignment/annotation independence. A real benchmark requires:
1. explicit rights-cleared source/photo/alpha assets;
2. consistent frame geometry and pixel-level registration to the
   source photo actually being evaluated;
3. alpha labels prepared independently of model output;
4. separate subjects and independent reviewer/annotation quality;
5. records that can be audited without public PII/photo exposure.

P3M-10K is a portrait-level alpha candidate with an MIT-labeled
dataset agreement but original-photo copyrights; it is NOT
automatically a commercially cleared hair-only alpha dataset.
The standard alpha-matting benchmark's released training labels
cover different objects and do not automatically resolve hair
strands crossing a face. SynHairMan's official model card
advertises BSD-2 for academic use and directs commercial
licensing queries to the authors. None of these third-party
images or weight files are bundled in Phase 42.

References:
- P3M agreement: https://jizhizili.github.io/files/p3m_dataset_agreement/P3M-10k_Dataset_Release_Agreement.pdf
- P3M-10K repository: https://github.com/JizhiziLi/P3M
- Alpha Matting evaluation datasets: https://alphamatting.com/datasets.php
- SynHairMan data license: https://huggingface.co/datasets/geyongtao/SynHairMan

## Verification

The full required research GitHub workflow must pass on the latest
Phase 42 commit: unit tests, real local MediaPipe hair and face,
MI-GAN, MODNet, actual Alpha41 regression, full protected
hairstyle browser smoke and airplane-mode repetition. Only
then claim the **engineering pipeline** passed.
Even complete CI does not create external labels, verify visual
quality, demonstrate true generative hairline reconstruction or
measure latency on a physical Samsung/Android device.

**Next research quality milestone: replace the simulated browser mask
with independently acquired, legally cleared, actual photographic
hair-alpha labels.** Do not merge into commercial main while the
artificial cutout hairline remains uncorrected.
