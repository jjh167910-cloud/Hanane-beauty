# Phase 29 — nonrigid landmark hair-fit ablation and model constraints

Date: 2026-10-22. Branch: `research/offline-generative-feasibility-2026-10-21`.
**Scope: research-only. Production and salon preview approval unchanged.**

## Current model availability and licensing

A compelling mobile-native image editor is
[DreamLite](https://github.com/ByteVisionLab/DreamLite),
upstream git commit `a6e20c8cc94027f37dd7c5a81b0b3b472aa18409`.
Its research authors report a 0.39-billion parameter image editor, a
four-step mobile variant and a ~3-second 1024² edit on *iPhone 17 Pro*
using CoreML/MLX. **None of those observations demonstrates
Android Chrome offline runtime or reference-guided hair transfer.**
The weights are currently gated and explicitly
**CC BY-NC 4.0, non-commercial / research only**; the top-level
Apache-2.0 **source code license is not the weight license**.
The actual authoritative source: upstream `WEIGHTS_LICENSE` plus README.
This blocks direct deployment in commercial Hananeh Beauty, regardless
of the published on-device iOS example.

HairFastGAN's unconverted teacher remains a multi-gigabyte CUDA
training/inference stack with a separate unresolved dependency and
weights-license chain, as documented in Phases 27–28.

## Work implemented

To test a different limitation without inventing an unlicensed generator:

- `public/ai/migan/landmark-hair-warp.mjs` implements deterministic
  bounded reference-hair mapping using six matching 2D facial anchors:
  eyes (2), mouth, nose, and both ears (2). The method starts with the
  existing eye similarity alignment and locally interpolates *small*
  landmark residuals with a Gaussian falloff. It limits deformation,
  validates source/reference correspondence, refuses missing anchors,
  checks the approximate Jacobian for folds and compares residuals.
  This is **not** full 3D geometry or new hairstyle synthesis.
- `public/ai/migan/reference-transfer-research.mjs` now accepts
  `alignmentMode: "bounded-landmark"`, with the established
  `"rigid"` mode unchanged by default. Predicted skin and landmark
  face protections are still enforced after alignment, preserving
  source transparency and editing the customer face in neither mode.
  Neither result can authorize customer download/export.
- `public/ai/migan/hair-removal-studio.html` adds a separate
  opt-in Persian six-landmark A/B canvas and geometry-only diagnostics.
  Missing/out-of-range landmarks refuse editing rather than guessing.
  The result is invalidated with consent or reference changes and
  can never be exported as an approved hairstyle.
- `scripts/phase29-landmark-warp-regression.mjs` tests deterministic
  feature alignment, identity behavior, refusal conditions, bounded
  parameters and no independent quality claims.
- `scripts/offhair-reference-transfer-regression.mjs` verifies that
  donor warp does not alter protected semantic skin, identity outside
  edited regions, or export authorization.
- `scripts/real-hair-removal-studio-smoke.mjs` exercises the UI on
  **actual local MediaPipe and MI-GAN outputs**, records either a
  successful nonrigid preview or a safe refusal, checks airplane-mode
  parity and rejects export/consent regressions.

This is a **feasibility experiment**, not an assumption that a
deformed reference cutout will be photorealistic. To prove benefit
requires independent customer-consented portraits from **different
identities**, blinded review and correctly licensed photo references.
The salon catalog may contain one repeated model; it is not a
multi-subject evaluation set.

## Risks and rejection rules

- Pose differences that cannot be explained by small 2D changes
  are rejected; no inferred unseen hair, ears or background.
- Fringes across forehead, extreme yaw, curls behind ears, scalp
  reconstruction and deep shadow remain unresolved.
- A closer match between facial *anchor coordinates* is a geometry
  metric only, not facial-identity preservation or attractive hairline.
- The user-provided model reference can be copied only within the
  predicted hair mask and the protected-face veto. Missing face geometry
  or apparent overlap is not automatic permission to edit facial skin.
- No remote inference, no user-portrait upload, no monetized generation,
  and no production merge.
- If real-browser acceptance is absent or the A/B difference is
  negligible on different subjects, record NO-GO for this method rather
  than weakening constraints to force a passing screenshot.

## Next decision

Select a fully commercially usable, documented generative
hairstyle-transfer foundation with small enough student weights for
a physical Android PWA. Research-only image models—including DreamLite
without a separate commercial license—are not production candidates.
Only after actual pretrained inference, independent hairstyle quality
and phone measurements exist can a production GO decision be made.


## Verified actual browser result (2026-10-22)

A real GitHub Actions Linux Chromium run exercised the complete
MediaPipe hair-and-face models, semantic skin veto, MI-GAN reconstruction
and opt-in six-anchor reference cutout alignment.

- Full commit tested: `a17c49472ded9ce4d9b1f71108f46b307a0da278`
- Browser CI run: https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39793408359
- Six anchors were available for the actual bundled catalog test pair.
- Mean anchor residual **3.3404 px (rigid)** → **2.6735 px (nonrigid)**
  at 512×512, a **~19.96% reduction in the *anchor error* metric**.
- Maximum pre-fit residual: **7.9296 px**;
  post-fit maximum: **5.4473 px**.
- **16,714** result pixels differed between the warped and rigid previews.
  This number does not establish any improvement in perceived realism.
- `referenceHairstyleGenerated=false`, `exportAllowed=false`,
  `realisticHairTransferVerified=false`.
- The same six-point fit acceptance was confirmed after a full PWA
  offline reload; no external portrait inference was required.

Important limitations: Only one automatically selected bundled source/
reference pair was measured. The catalog identity may be shared across
the portraits, so this **is not cross-person quality evidence**.
The genuine browser pipeline still reports
`fringe_occlusion_unresolved` and
`predicted_skin_occlusion_unresolved`.
A deformation that reduces nose/ear landmark distance can still distort
individual curls or make hairline transitions less attractive.
No human blinded preference data, smartphone GPU/thermal measurements
or end-customer quality approval have been collected.

**Result: engineering alignment experiment PASS; customer photo
realism and commercial release NO-GO.**
