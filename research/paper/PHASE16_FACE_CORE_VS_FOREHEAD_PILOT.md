# OffHair Phase 16 — facial core versus fringe occlusion pilot

Date: 2026-10-21. **Exploratory engineering ablation**, using five existing bundled salon catalog portraits and six selected, dependent source/reference pairs. **No trained generator, no independently labeled ground-truth face masks, no physical Android benchmark, no confirmatory efficacy claim.**

## Hypothesis and scientific problem
The Phase 15 broad-ellipse protector rejected five of six source/reference hair-mask alignments. This may reflect (A) true protected-face conflicts or (B) *over-protection of forehead skin* where target bangs could legitimately appear. Merely relaxing the ellipse threshold would obscure the distinction and risk facial distortion. We instead use additional observable MediaPipe face-detector landmarks to create an exploratory anatomical distinction.

## Implemented changes
- `public/ai/mask-utils.mjs` extracts documented FaceDetector nose tip, mouth center, and ear-tragion points when valid, preserving the original two-eye anchors. Geometry failures do not automatically produce made-up landmarks.
- `public/ai/offhair-face-zones.mjs`: differentiates immutable estimated facial core (eyes, nose, mouth/lower face, ears where landmarks available), and an **unresolved** candidate forehead/fringe region. Does not authorize any editing of the face.
- `public/ai/offhair-difference-masks.mjs`: additional `faceProtection:'landmark-core'` mode. The new visualization label 5 (teal) is specifically *unresolved forehead hair conflict*. Legacy `legacy-ellipse` is retained unchanged.
- New `scripts/offhair-face-zones-regression.mjs`: eight unit tests, plus two new face-detector anatomical extraction regressions.
- `scripts/real-offhair-difference-mask-smoke.mjs`: uses genuine local MediaPipe masks and face landmarks; evaluates legacy eye-scale/roll versus landmark-core on exactly the same six directional portrait pairs. Repeats offline under network-disabled Chromium, not physical Android.

## Reproduced experiment
GitHub Actions run https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39641351783 fully passed.
- Baseline eye-scale + broad ellipse: 1/6 passed provisional topology gate.
- Roll-aware eye similarity + broad ellipse: 1/6.
- Roll-aware similarity + landmark feature-core: **6/6 passed provisional geometry gate**. Every single case **requires review**, **0/6 eligible for automatic facial editing**.
- Protected-core conflicts remain nonzero in all six cases; approximate conflict fractions for pairs 1→2, 1→3, 2→6, 3→1, 6→2, 9→1 were respectively 2.46%, 2.53%, 10.45%, 2.19%, 10.32%, 8.41%. Three exceed a descriptive 5% review-risk flag. That 5% cutoff is exploratory and was selected after viewing pilot measurements, not established through labeled anatomy.
- Unresolved forehead pixels remain in every pair (approx. 0.20%–2.82% of the entire image). These pixels cannot be assumed safely editable.
- The apparent improvement reflects a *change to the definition of a protected region*. It does not establish superior head-pose estimation, segmentation accuracy, reference-hair geometry, synthetic realism, or improved final hairstyle edits. Six correlated comparisons are not an inferential sample.

## Strongest falsification opportunity
The apparent 6/6 improvement may be entirely due to a narrower protection zone—not improved model competence. To test this, annotate independently (on legally permitted consented portrait images) at least: (i) eye/nose/mouth/ear regions and their uncertainty, (ii) skin occludable by target bangs, (iii) target hair boundary and actually visible face, (iv) hairline/scalp areas that must be reconstructed, and (v) confidence and annotator disagreement.
Then compare predicted masks with blinded ground truth at a frozen threshold. Report immutable facial pixels erroneously marked editable as a **critical failure metric**, not only global mask overlap/IoU. Any false protection must block release. Do not train on a confirmatory held-out identity/test subset.

## Research decision
**GO** for obtaining a rights-cleared, annotated scalp/face/occlusion benchmark and testing head-aware target support estimation.
**NO-GO** for interpreting these six results as demonstrated face-edit safety, photographic quality, commercial production readiness or novel trained hairstyle transfer.
Maintaining two separate outputs (protected core and unresolved forehead) is preferable to an unconditional relaxation of face protection, but its geometry is not validated.

## Publication implications
A credible new-method paper requires a learned head-aware target-support model with masks evaluated against ground truth, reference-conditioned generative outputs, pose/occlusion robustness and a matched-compute comparison. The existing original published work (HairFastGAN, Stable-Hair, AnyBald, H-Adapter, HairPort) means that simply extracting more facial landmarks or subtracting binary masks is not independently novel.
