# OffHair pretrained-model reuse and commercial provenance gate
Status: 2026-10-22; RESEARCH BRANCH ONLY. Provisional inventory, not legal advice.

## Permission standard
Downloaded weights are not public domain. The ability to read code or publicly access checkpoints does **not** transfer reproduction, redistribution, derivative-modification, commercial-use or training-data rights. A user may license assets they own, but cannot authorize use of third-party copyrighted checkpoints without the rightsholder's permission.

Our rules:
1. Approve models with documented permissive **checkpoint** licensing and a viable commercial-use path, retaining license and NOTICE obligations.
2. Record separately: code license, model/checkpoint license, *underlying training dataset terms and provenance*, conversion/export rights, teacher/derived-model terms.
3. Prefer official model cards and primary repositories. An unofficial mirror is not a substitute for its upstream terms.
4. No repository-permissive shortcut for pretrained face parsing trained on restricted face datasets.
5. No weight modification/fine-tuning until explicit checkpoint terms and derivative rights are established. No customer portraits in training absent consent and rights.
6. Run all photo inference locally on device after model installation; no third-party inference services.
7. Never merge experimental weights into production just because a CI test passes.

## Candidate inventory
| Component/model | Code | Official checkpoint/model terms | Training/derivative caveat | Project decision |
|---|---|---|---|---|
| Google MediaPipe HairSegmenter | MediaPipe Apache-2.0 | Hair-segmentation model card Apache-2.0 | Optimized for selfies and hair recoloring, not realistic head completion | Existing permitted research baseline; preserve provenance |
| **Google MediaPipe SelfieMulticlass 256x256** | MediaPipe Apache-2.0 | **Official May 10, 2023 model card: Apache-2.0** | Model card acknowledges imperfect masks; skin class does NOT protect eyes/nose/ears automatically | **Selected research-only pretrained comparison** |
| MediaPipe FaceDetector BlazeFace | MediaPipe Apache-2.0 | Consult corresponding model card per specific asset | Sparse six landmarks and detector error still require independent validation | Existing baseline |
| Face Landmarker bundle | MediaPipe Apache-2.0 | Verify **bundle-specific model cards** and exact checkpoint/version before inclusion | 478 landmarks may be better geometry; no validated head/hair depth | Conditional research candidate |
| MI-GAN 512 ONNX | Picsart MIT project/weights claim | MIT checkpoint claim; teacher provenance issues unresolved | Check possible Co-Mod-GAN teacher and training chain before redistribution/commercial | Existing **research-only** baseline; NO-GO for salon quality |
| Face parsing trained on CelebAMask-HQ | Some implementations MIT | Weights vary, training dataset license **non-commercial research only** | Code being MIT does not clear image data restrictions | **Exclude from salon commercialization absent written permission / legal review** |
| HairPort/Baldy | Research availability | Baldy CC BY-NC-ND-4.0 from upstream | Not a commercially cleared fine-tuning corpus or licensed production model | Research citation only; no copying weights |
| FLUX.1 [dev] / Fill [dev] | Provider-specific | **Non-commercial dev model license** | Do not confuse dev checkpoint with a commercially licensed release | Exclude without commercial license |
| Proprietary consumer hairstyle services | Closed/proprietary | No weight redistribution/derivative permission established | Reverse engineering API behavior does not grant weights | Exclude |

## Integrated research checkpoint
Model: Google MediaPipe Selfie Multiclass 256x256 TFLite (float32).
- Official URL: https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite
- Model card: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf
- Expected SHA256: `c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0`, corroborated from third-party converter metadata; runtime build MUST verify it directly.
- Builder: `npm run build:offhair:multiclass`; outputs local checkpoint + verified provenance JSON; downloads **only at build time**, and never sends customer photos to Google.
- Browser: `public/ai/offhair-multiclass-baseline.mjs` returns six labels, original-hair vs multiclass-hair agreement and face-skin conflicts.
- Purpose: pretraining reuse and independent-model **disagreement diagnosis**, NOT accurate ground-truth segmentation, and NOT photorealistic hairstyle synthesis.
- Weights are unmodified at this stage; fine-tuning/quantization/export are allowed in principle under Apache-2.0 subject to obligations and separate data/provenance review.

## Why this is not yet the final solution
The six-class model only predicts semantic categories. It does not infer head depth, target hairstyle topology, visible ear anatomy, synthetic scalp, or photo-realistic hair. The corresponding six-class face-skin label does not segment eyes, nose, or eyebrows distinctly. We must not turn a lower numerical conflict score into an approved automatic face-editing permission.

## Sources
- Google 2023 multiclass model card: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf
- Google 2019 hair model card: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20-%20Hair%20Segmentation.pdf
- Google segmentation documentation: https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter
- Original CelebAMask-HQ license: https://mmlab.ie.cuhk.edu.hk/projects/CelebA/CelebAMask_HQ.html
- Official MediaPipe software: https://github.com/google-ai-edge/mediapipe
