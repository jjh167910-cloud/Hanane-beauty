# OffHair Phase 20 — landmark-perturbation sensitivity pilot

Date: 2026-10-22. Study status: **exploratory engineering stress test / not a calibrated anatomical confidence model**. Genuine browser inference and offline repetition passed: https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39720439369 .

## Motivation
Phase 16's landmark-core mask marked 6 of 6 pilot source/reference pairings as geometrically admissible under a *provisional* rule (versus 1 of 6 for the original conservative face ellipse), but all six still required manual review. The broad ellipse and the smaller feature-core are not equivalent definitions of ground-truth safe pixels. It was therefore essential to test whether small landmark errors could substantially reclassify facial features.

## Implemented
- `public/ai/offhair-landmark-stability.mjs`: deterministic 15-condition sensitivity sweep: centered mask; 6 global ±x/±y/diagonal translations, plus eye-distance scale, nose offsets and ear offsets. Perturbations are scaled to **6% of the detector's horizontal eye distance** by default.
- `scripts/offhair-landmark-stability-regression.mjs`: fail-closed tests for missing landmarks, mask mismatch, parameter errors, protected zones, reproducibility and zero-jitter controls.
- `scripts/real-offhair-difference-mask-smoke.mjs`: genuine MediaPipe hair/face landmarks from five bundled catalog portraits, masks sampled at 128×128 for faster **research-only sensitivity screening**. Repeated after service worker controlled page reload with browser network disabled.
- CI and original tests pass. The first CI trial exposed missing landmark validation; implementation was corrected to reject incomplete observations rather than crash.
- No photograph was uploaded to any external inference API, and no new generative hairstyle model was trained.

## Measured sample-level sensitivity (15 deterministic perturbations)
The fractions are relative to **thresholded hair pixels**, except the final column which is relative to all 128×128 image pixels.

| Catalog sample | Hair pixels | Hair changing facial-zone label | Hair crossing protected-core union | Image pixels with unstable facial-zone classification |
|---|---:|---:|---:|---:|
| 1 | 1,060 | 2.74% | 3.68% | 6.59% |
| 2 | 1,493 | 3.08% | 4.02% | 6.71% |
| 3 | 2,610 | 11.38% | 4.25% | 6.88% |
| 6 | 4,077 | 11.23% | 16.88% | 6.74% |
| 9 | 5,267 | 9.30% | 12.91% | 6.49% |

**Interpretation:** The geometric classifier changes materially near facial-zone boundaries, especially on curly and longer hair. The union across perturbed protected-core masks can include substantial detected hair even when the nominal mask reports a low conflict ratio.

**Critical limitations:**
1. These are hand-designed synthetic coordinate perturbations, not a measured distribution of face-detector errors. A 6% jitter sweep does not imply 94% detection accuracy or any confidence interval.
2. Five catalog portraits selected for development are neither independent real training data nor a representative sample of real salon customers.
3. The zone definition relies on sparse 2D points, not actual facial mesh, head depth, occlusion or medically/anatomically validated contours. Nose/ear landmarks may themselves be inaccurate.
4. We measured **mask label stability**, not perceptual quality, similarity to the reference hairstyle, energy, real Android inference speed, or identity preservation after generation.
5. The current experimental pipeline correctly keeps `eligibleForAutomaticEditing=false` for all anatomical-zone evaluations; no customer use is authorized.

## Research judgment
**NO-GO:** Treating a single sparse detector observation plus a favorable nominal overlap ratio as a validated criterion for automatic hair-over-face edits.

**GO (next prospective experiment):** (a) obtain properly consented and licensed face/hair annotations including immutable core and forehead-occlusion labels; (b) collect repeat measurements at actual pose/lighting/occlusion conditions and estimate empirically calibrated landmark errors; (c) compare detector confidence, this perturbation heuristic, and a face mesh or semantic segmentation model on identity-disjoint held-out subjects; (d) report sensitivity/specificity, safety violations, calibration error, abstention and failure rates; (e) ONLY then consider learned source-aligned hair support and a dedicated generator.

The pilot is a falsification/quality-control result and is not yet a new paper contribution. Preserve its selection and exploratory status in subsequent manuscript drafts.

## Reproduction
1. `npm run build && npm run test:unit`.
2. `npm run research:pose:synthetic` for the **separate synthetic-only** flow ablation (not real quality evidence).
3. After browser dependencies and model assets have been installed, `node scripts/real-offhair-difference-mask-smoke.mjs`.
4. Inspect the archived `public/ai/offhair-dm/topology-ci-evidence.json`, `research/results/offhair-phase19-synthetic-study.json`, and GitHub CI logs.
5. Do not compare percentages between 128² perturbation-screening data and 512² mask-topology data without explicit resolution-aware methodology.
