# OffHair Phase 19 — learned 2D synthetic pose-flow baseline and falsification control
Date: 2026-10-21. **SYNTHETIC DATA ONLY. No real-person experimental ground truth or validated head-pose transfer.** All numbers below come from a deterministic *procedural simulator*, not photos, human judgments, commercial training data, Android performance tests, or a generative hairstyle model.

## Research question and motivation
The earlier eye-scale/roll-based 2D hair mask proxy had unstable provisional face-conflict outcomes, and the anatomical forehead masks remain unverified. Can a small trainable estimator model synthetic pose-dependent hair-region displacement better than eye-scale and roll-only transforms?

This is a prototype **experimental baseline**, not claimed algorithmic novelty. Polynomial ridge regression, normal equations, coordinate transforms and procedural silhouettes are standard techniques.

## Code and training
- `public/ai/offhair-pose-flow.mjs`: small, deterministic regularized least-squares displacement predictor. It consumes normalized 2D reference-hair coordinates and *observed* nose/ear asymmetry proxies for source and reference faces, then predicts 2D flow residuals on top of an eye-scale/roll baseline.
- `scripts/offhair-synthetic-head-study.mjs`: seeded synthetic generator of canonical hairstyle support masks, head yaw/roll transformations, head-shape variation and observations; 1100 procedural training identity labels with 11 projected training points each (12100 supervised coordinate examples), then 250 independent synthetic held-out identities. A separate 130-identity stress test uses wider yaw and more head warp variation. A 90-identity **counterfactual projection** experiment reverses the unseen procedural yaw-shear rule.
- `scripts/offhair-pose-flow-regression.mjs`: geometry inverse consistency, ridge fitting, exact-mask identity transfer, observed MediaPipe landmark checks, corrupt input rejection, and strict protected-feature/manual-review barriers.
- The tiny JSON coefficients are published only as `offhair-synthetic-pose-flow-v1.json`, stamped `syntheticOnly=true` and `validatedOnRealHeadGeometry=false`. They must **never** be advertised as learned photorealistic hairstyle transfer weights.
- Training/test subject strings are distinct, but both datasets use the **same procedural generative family**, which is a major simulation-to-reality validity limitation.

## Quantitative results from reproducible local synthetic study
Controlled hold-out, 250 synthetic identities, 96×96 binary masks:
- Eye-scale + roll baseline mean mask IoU: **0.76693**
- Learned pose-flow mean mask IoU: **0.94302**
- Identity-paired mean difference: **+0.17609** (descriptive only; no real photo inference)
- Held-out 10th-percentile IoU, baseline **0.58343**, learned **0.91046**
- 66 hard synthetic yaw-difference cases: baseline **0.61215**, learned **0.91497** mean IoU

Out-of-distribution simulations:
- 130 identities, wider yaw/head-warp variation but **same underlying simulator rule**: baseline **0.69227**, learned **0.84701**.
- 90 identities, **different counterfactual yaw-shear rule not represented at training time**: baseline **0.81714**, learned **0.68465**.

**Interpretation:** The learned estimator recovers the training simulator's consistent yaw projection patterns and shows an apparently large synthetic-mask advantage, but generalization fails when the deformation mechanism changes. The adverse control shows that such a model is not a robust geometry estimator without a more informative representation, diverse real head-pose data, or a calibrated domain-uncertainty rejection mechanism. The baseline is not a 3D target-hair-support model.

None of these numbers are comparable to HairFastGAN, Stable-Hair, AnyBald, H-Adapter or HairPort benchmark scores. They are not independent human preference results and should not be submitted as evidence of photographic quality.

## Real catalog compatibility probe
After the synthetic model is trained in CI, `scripts/real-offhair-difference-mask-smoke.mjs` extracts **actual** MediaPipe face and hair masks on existing catalog portraits. The 2D nose/ear asymmetry adapter enforces synthetic-range constraints and rejects incomplete or outside-distribution landmarks. Any resulting hair-support mask is analyzed descriptively and checked for protected-core collisions and unresolved forehead overlaps; it cannot be automatically applied to anyone's face.

**Crucial:** There is no true destination target hairstyle label for these real portraits. Thus no real-portrait IoU or model-accuracy claim can be produced from this compatibility probe. A model returning a mask successfully is not proof that the mask is correct.

## Threats to validity and methodological red-team
1. **Simulator encoding/teacher:** The learning features are chosen to represent deformation factors in the procedural teacher; strong in-family results are partly a consequence of experimental construction.
2. **Synthetic identity:** Procedural identity labels and held-out masks do not equal unseen actual human identities.
3. **Camera projection:** Yaw/shear simulator is only a stylized 2D transform, not perspective 3D face/hair geometry; alternate shear reversal defeats the model.
4. **Target hair ground truth:** Real photos lack a corresponding controlled hairstyle transferred to precisely the same head; no real target-hair-support IoU measured.
5. **Image appearance:** Binary silhouette agreement does not evaluate scalp reconstruction, strand realism, color, texture, foreground occlusion, lighting or identity.
6. **Hardware:** The inexpensive regression coefficients may be easy to execute in a JS runtime, but no physical Samsung Galaxy A55 latency, thermal, energy or memory result has been measured.
7. **Data rights:** No rights-cleared real research portraits exist yet; commercial training remains NO-GO.
8. **Overclaiming:** It would be incorrect to describe this as a state-of-the-art hairstyle transfer method, neural 3D reconstruction, validated identity protection or publishable new-method evidence.

## Next scientific decision
**GO** for developing calibrated uncertainty and pose-aware target-hair-support estimation, provided the next evaluation is on *independently annotated, rights-cleared, real-person paired target support* with held-out physical identities. Include an adverse-domain scenario and a clear fail-closed criterion.

**NO-GO** for further optimizing polynomial features solely against the same simulator or integrating these synthetic-only weights into salon production. The counterfactual failure (0.68465 versus 0.81714) proves the need to prioritize data/model identifiability, not headline synthetic IoU.

## Reproduction
`npm run build && npm run test:unit && npm run research:pose:synthetic`
Expected metadata output: `research/results/offhair-phase19-synthetic-study.json`. Expected research-only weights: `public/ai/models/offhair-synthetic-pose-flow-v1.json`. Existing CI real-browser research tests run locally without external model inference requests.

This experiment is a **falsifiable synthetic scaffold** for future research, not a replacement for the missing approved dataset or real generator.
