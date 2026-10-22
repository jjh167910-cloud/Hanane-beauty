# Phase 30 — two-local-portrait offline hairstyle-transfer evaluation

Date: 2026-10-22 · Research branch only · NOT deployed to salon production.

## Engineering objective

The previous research compared hair references from bundled catalog images,
which may portray the same person. Such tests cannot demonstrate
cross-person appearance transfer, even when geometry residuals improve.

This phase enables the owner of the phone to choose TWO files on the same
device: a customer/source portrait and a separately obtained hairstyle
reference, with a specific attestation that the reference image may be
processed. No cloud upload, trained generator, pretrained third-party
hairstyle transfer model, or commercial approval is introduced.

## Implemented

- The existing experimental Persian studio at
  `public/ai/migan/hair-removal-studio.html` now offers
  `مرجع جدید از گوشی — فقط برای پژوهش` in the reference selector.
  An independent local image input and reference-use confirmation are
  required before a user-provided reference image can be processed.
- The browser loads PNG/JPEG/WebP files (<=12 MiB, <=8192 pixel side),
  scales to a bounded 512×512 opaque canvas and keeps only the pixels
  in the active page's memory. The original file URL is revoked after
  decoding; the file is not added to the model cache.
- Existing real hair/face detection, semantic skin veto, six-anchor
  geometry, MI-GAN source-hair removal and 2D research composition
  operate on the two loaded images.
- `public/ai/migan/local-reference-pair.mjs` refuses an *identical
  rendered image*, unsupported image buffer sizes and transparency.
  It **does not** infer whether two different photographs depict
  different people; it cannot verify model release or consent.
  File paths, image fingerprints and pixel statistics are not exported.
- Changing the chosen reference cancels any prior transfer and revokes
  its derived outputs. Withdrawing reference permission destroys the
  in-memory reference image and disables pending/previous previews.
  The original source-photo consent is still separately required.
- `scripts/phase30-local-reference-regression.mjs` tests duplicate
  detection, malformed images, negative rights claims and no data export.
- `scripts/real-hair-removal-studio-smoke.mjs` exercises local file
  picker controls in real Chromium using the ALREADY BUNDLED catalog
  WebP file as a fixture (no third-party photo acquisition),
  verifies refusal without an independent reference-use checkbox,
  performs actual local MediaPipe masks and 2D hair transfer, checks
  safe six-anchor refusal/acceptance, cancels when permission is
  withdrawn, and repeats after full offline browser reload.
  These fixture photos are NOT certified as different identities.

## Explicit scientific limitations

**Different rendered image buffers do not prove different human
subjects.** The bundled catalog images used in CI cannot provide
evidence of cross-person robustness or legal portrait rights. Before
studying such a claim, independent consenting users must select
rights-cleared source/reference photographs and label each subject
under a separate privately held identity key; a blinded rater should
score pose, hairline, identity, strand fidelity and background
defects. No sample images or human identity documents should enter
CI or telemetry. This experimental client intentionally does NOT
export a finished hairstyle or certify customer photorealism.

A rights/consent checkbox is an attestation, not independent
legal verification. The research prototype should not be offered
as a salon sales promise. The purpose is to obtain an immediately
testable local two-image workflow on a physical Android device,
where a user can assess real cross-person failures and device runtime.

## Verified real browser evidence

**CI run** https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39795977799
on commit `b3763be666be0bda672111a824a1201676161065`;
overall GitHub Actions run reports completed/success. The full job log
contains successful `npm run test:unit`, real MediaPipe / MI-GAN
inference, online local-file processing and airplane-mode processing.

Observed and reproducible facts:
- Real uploaded local WebP reference from already bundled catalog `3`.
- Refused without a separate reference permission check.
- Original source hairstyle catalog item qualified and inpainted.
- Rigid local-reference two-photo composition succeeded.
- Six-landmark method **refused** this particular new reference,
  rather than using unbounded deformation. The rigid preview remained
  available. This is a genuine geometry LIMIT, not evidence of improved
  reference transfer.
- The browser test reported `differentPersonVerified=false`,
  `referenceRightsIndependentlyVerified=false`,
  `commercialReleaseAllowed=false`.
- The exact count of transferred hair pixels was stable when the
  reference file was reselected after a full network-disabled reload.
- Withdrawal erased the local file-picker selection and prior preview.
- No external requests were observed by the browser network-intercept
  safety check.

The CI fixtures reuse the same catalog image bank; **no true different-
person generalization test has been demonstrated**. No visual
human quality ratings were collected, and none may be inferred.


## Next engineering decision

Run the cross-person workflow on a set of individually consented,
rights-cleared independent subjects and measure rejected pairs,
face-integrity preservation, hairline quality and background artifacts.
Even a passing two-photo engineering test would NOT establish
generative photorealism. The long-term final solution requires a
rights-cleared reference-guided generator with documented offline
phone execution and verified output quality.
