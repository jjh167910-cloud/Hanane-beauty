# OffHair Phase 21 — permissively licensed pretrained model integration (research-only)

Date: 2026-10-22. This is an engineering/provenance comparison with five existing bundled salon portraits, **not** a human-labeled model accuracy benchmark, not reference-guided hairstyle synthesis and not scientific proof of improved hairstyle realism.

## Reason for choosing an existing pretrained model
User authorized reuse and modifications of models when legally permitted. To avoid training every component from zero, the research branch integrates **Google MediaPipe Selfie Multiclass Segmentation 256×256 (float32)** alongside the existing **Google HairSegmenter 512×512** and BlazeFace. Its official Google model card specifically identifies **Apache-2.0 licensing**, and it outputs **background, hair, body skin, face skin, clothing, and accessories**. The 6-class segmentation is a practical new input for hair/skin conflict analysis, but does not identify eye, nose or ear pixels separately.

### Chain of custody
- Official checkpoint: https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite
- Official model card, Google 2023: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf
- SHA-256 (**verified on CI build-time downloaded model**): `c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0`
- Exact size: **16,371,837 bytes**.
- Licensed original pretrained weights unchanged; no model finetuning conducted.
- Research builder: `npm run build:offhair:multiclass` → local checkpoint + checksum/provenance; fails closed if upstream changes.
- Browser implementation: `public/ai/offhair-multiclass-baseline.mjs`; local official MediaPipe TFLite WASM inference, no portrait uploads.
- Full attribution notice: `public/ai/licenses/MEDIAPIPE_MULTICLASS_NOTICE.txt`; builder supplies full Apache-2.0 text `public/ai/licenses/Apache-2.0.txt`.
- Reproducible tests: `scripts/offhair-multiclass-regression.mjs`, plus real Chromium integration in `scripts/real-offhair-difference-mask-smoke.mjs`.
- Privacy: actual user portrait input never sent to third-party inference. Initial Google checkpoint download occurs at **build time only**, not to send user images.

## Initial results — cross-model agreement, no human segmentation ground truth
Full initial verified integration CI: https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39721745376

| Existing bundled style ID | Hair mask cross-model IoU | Fraction of original hair predicted as face skin by multiclass |
|---|---:|---:|
| 1 | 0.9510 | 0.217% |
| 2 | 0.9598 | 0.109% |
| 3 | 0.9101 | 1.094% |
| 6 | 0.9741 | 0.135% |
| 9 | 0.9398 | 0.139% |

Both predictions are from existing pretrained models and may share correlated biases. **IoU here measures agreement with another model, NOT accuracy**. Face-skin agreement is not facial landmark or identity preservation. Neither model generated a reference hairstyle.

## Conservative safety-layer upgrade
- `reviewMulticlassHairConsensus(...)` labels model-consensus hair, original-only hair, multiclass-only hair, original-hair-vs-face-skin disagreement, predicted face skin, and background.
- Every pixel is accounted for, malformed categories fail closed, and the outputs have **`editingAllowed:false`** independently of agreement.
- Classification of a face skin pixel as conflicting is an alert for human annotation, not proof of error in either segmenter.
- This is deterministic review fusion, NOT newly trained neural weights.
- Independent annotations, adjudication, subject-disjoint evidence and quantitative quality improvements are still needed.

## Scientific implications
1. **GO**: Reuse official Apache-2.0 pretrained perception as a starting feature extractor, with explicit attribution and checksum pinning.
2. **NO-GO**: Claiming pretrained model agreement as evidence of realistic bald conversion, improved identity, safe bangs occlusion, or hairstyle-transfer quality.
3. **NO-GO**: Automatically editing skin/eyes/nose/ears under a single model label; face-skin is not a fine-grained protected-core mask.
4. **OPEN**: Compare fused labels with rights-cleared human annotations and measure genuinely better accuracy, reduced manual-labeling effort, model size and physical Android inference cost. A second pretrained model adds **16.37 MB** to local checkpoint storage plus runtime overhead; there is no measured Android utility gain.
5. **OPEN**: Train compact pose-conditioned hair support and hairstyle synthesis only with commercially permitted portrait data and checkpoint teachers. Public downloads of proprietary weight files do NOT confer permission to produce commercial derivatives.

## Publication framing
A comprehensive paper must compare (i) original hair-only model, (ii) 6-class semantic model, (iii) conservative review fusion, and ideally (iv) a learned head/face segmentation or geometry estimator on **ground-truth-labeled held-out identities** with accuracy, calibration, abstention and user study. A five-portrait agreement check is a smoke test only.

See also `research/paper/PRETRAINED_MODEL_RIGHTS_AND_REUSE_GATE.md`, `research/paper/PHASE20_LANDMARK_SENSITIVITY_PILOT.md`, and `research/paper/DEEP_RESEARCH_HANDOFF_BRIEF.md`.
