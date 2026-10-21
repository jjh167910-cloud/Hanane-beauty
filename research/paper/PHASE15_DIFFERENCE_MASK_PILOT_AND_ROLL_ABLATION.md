# OffHair Phase 15 — source/reference difference-mask research pilot (negative alignment result)

Date 2026-10-21. **Exploratory engineering study; not preregistered, not an independent human study, not a trained generator.** Full CI: https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39638766691 .

## Why this pilot was conducted
Deep Research's skeptical review indicated that a promising **hypothesis**, distinct from simple bald→regrow approaches in Stable-Hair/HairPort, is to partition required pixel changes into *remove original hair*, *add target hair*, *replace overlapping hair* and *preserve other pixels*. It is **not** original merely to form set intersections; any publication claim requires a learned target-support model and quality/compute improvements against simpler baselines.

## Implemented
- `public/ai/offhair-difference-masks.mjs`: a strict, pure 512×512 topology study from two hair confidence maps and detected face landmarks.
- `public/ai/mask-utils.mjs`: extra eye-span and eye-roll data while preserving the existing horizontal eye-distance anchor.
- `scripts/offhair-difference-masks-regression.mjs`: unit tests including synthetic roll, clipped references, face conflicts and malformed masks.
- `scripts/real-offhair-difference-mask-smoke.mjs`: genuine MediaPipe hair/face masks for five bundled salon catalog portraits, six selected directional source/reference combinations, then repetition after Chrome service-worker caching and simulated airplane mode. Captures anonymous topology metrics and an illustrative color mask.
- CI workflow runs unit and real-browser tests; all tests pass.
- Research artifacts `public/ai/offhair-dm/topology-ci-evidence.json` and `topology-evidence.png`. These contain no uploaded customer photograph.

## Operational definitions and limitations
`M_remove = M_source ∧ ¬M_target_proxy`, `M_add = M_target_proxy ∧ ¬M_source`, `M_overlap = M_source ∧ M_target_proxy`, excluding protected face conflicts. The target proxy is obtained by translating/scaling a reference segmentation using detected eye landmarks; the ablation also compensates for eye-line **roll**.
This is **not** a physical 3D hairstyle silhouette. It cannot infer missing ear/scalp geometry, temporal/side hair volume, large yaw, or visibility behind the head. The masked area's fraction does **not** imply lower latent-generator FLOPs; that requires a genuinely sparse computation architecture and benchmarking.
The current facial protection policy uses a deliberately conservative ellipse that can reject legitimate bangs on the forehead. Such rejections are an important *safety limitation*, not proof that source/reference alignment alone is wrong. A future paper must distinguish genuine unsafe edits from safe hair occlusions.

## Reproduced findings (Linux Chromium CI, five catalog portraits; no Android measurements)
- Five real hair + face masks measured; 6 directional source/reference pairs evaluated.
- Plain eye-position/scale proxy: **1 / 6 accepted** by provisional face-conflict threshold.
- Eye-roll-aware similarity proxy: **1 / 6 accepted**; no change in acceptance.
- Five rejected cases exceeded the current `hair_overlaps_protected_face` safety threshold; none in this group was rejected for transformed-hair cropping.
- Accepted pair catalog 1→2: 8.535% of the 512² pixels classified remove/add/overlap, 91.066% classified background preserve, plus 0.398% classified face conflict (rounding may affect sums); protection-conflict ratio ~2.59%.
- Difference masks produced **no** generative hairstyle and no photographic-naturalness result. No energy, GPU memory, model latency saving or scalp quality was measured.
- Network-disabled browser reload and deterministic mask metrics passed.
- Color meanings for the research diagram: red remove, blue add, purple overlap, amber face conflict. Diagram is a geometry visualization, not edited portrait.
- Selected six pairs are dependent on five existing catalog portraits and were not randomly sampled from a rights-cleared subject cohort. **No inferential conclusions**, efficacy percentages, or clinical/consumer performance statements are justified.

## Decision
**NO-GO** for claiming 2D landmark mapping as an adequate target-support estimator or improved hair-transfer method.
**GO** to research a *learned, pose-aware target hair support* with semantics separating two classes of face-adjacent regions:
1. Immutable face core: eyes/nose/mouth/essential identity structures; must remain unmodified.
2. Potentially occludable forehead/hairline: new bangs can legitimately cover this skin **only if** learned target silhouette and local occlusion prediction justify it.
Head yaw, hair-side visibility, ears, long→short scalp completion, and actual hairstyle geometry remain unresolved.

## Next decisive experiment — not yet completed
Create licensed paired head+hair geometry training data, source/reference masks, true target head-view silhouettes, and forehead-occlusion labels. Benchmark:
(A) eye-scale proxy; (B) eye-roll proxy; (C) licensed 3D geometry rendering or learned target-support estimator.
Use held-out subject identities and geometric target ground truth. Measure mask intersection-over-union, boundary quality, protected-core violations, forehead-occlusion correctness, and fail-closed rate. Only then train comparable **OffHair-DM** and conventional **OffHair-Split** generative students and compare on blinded quality and actual device cost.
Any change to thresholds or forehead policy after inspecting this pilot must be marked **exploratory**, not confirmatory.

## Publication relevance
This pilot establishes a reproducible negative engineering finding, not a paper. It also narrows the research contribution: the method must solve conditional hair occlusion and target geometry at low resource cost, rather than merely implementing standard binary mask operators. Use the combined rights and Android hardware gates from the completed Deep Research report.
