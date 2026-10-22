# OffHair Phase 25 — experimentally completed local reference hairstyle preview

Date: 2026-10-22. **Research-only 512×512 baseline, NO-GO for salon photorealism.**

## What exists
The existing on-device MediaPipe HairSegmenter and Apache-2.0 SelfieMulticlass
predict source/reference hair and source skin. BlazeFace estimates eye/face
landmarks. MI-GAN removes a deliberately bounded portion of source hair.
A new deterministic 2D reference-preview stage uses eye-scale/roll correction,
segmentation-confidence transparency and approximately linear-light
edge blending to place sampled reference hair on the restored source. The
selected mask refuses changes to predicted skin and independently modeled
eye/nose/mouth/ear regions. Forehead/fringe remains unresolved and is excluded.

The private experimental UI in `public/ai/migan/hair-removal-studio.html`
allows choosing four included reference styles after successful reconstruction.
It disables reference-export controls unconditionally, and immediately clears
results if the user changes input or withdraws permission.

## Real Chromium CI evidence
Confirmed by full GitHub Actions run:
https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39732478517
At commit `0548c1416b57bb8e95127d825bb470150b111b3f`.

The accepted source was bundled catalog portrait ID 1 and references were IDs
2, 3, 6, 9 (possibly the same person; **NOT four independent evaluation
identities**). All four reference overlays were computationally created.
No output was accepted for customer use.

| Metric | ID 2 | ID 3 | ID 6 | ID 9 |
| --- | ---: | ---: | ---: | ---: |
| Hair overlay pixels | 19,394 | 23,180 | 30,884 | 52,003 |
| Predicted face/skin overlap pixels excluded | 4,579 | 17,215 | 32,023 | 32,145 |
| Unresolved forehead pixels excluded | 263 | 1,380 | 855 | 1,461 |
| Reference hair clipped at image edges | 0 | 0 | 0 | 0 |

The exact source-original residual-hair proxy was 890/17,025 = 5.23% after
removal+overlay. This is **not** a perceptual quality score. The preview
generator explicitly warned about face/skin overlap and fringe occlusion for
all four references. It marked `exportAllowed:false` and
`referenceHairstyleGenerated:false`.

The accompanying source reconstruction used 16,950 selected hair pixels,
protected both the pretrained semantic skin and landmark-defined facial core,
and changed **zero pixels outside the approved removal mask**. The browser
successfully executed original and follow-up inference with real local model
weights; no inference requests outside the test origin were permitted.
These timings were from GitHub's Ubuntu/Chromium runner, not Android.

## Independent visual inspection of actual screenshot

Source: `public/ai/migan/reference-transfer-evidence.png` inside the
`hananeh-offline-research-site` workflow artifact.

The combined result shows a noticeably unnatural hairline/edge near the
forehead and retained gray, cap-like inpainted tones around the hair perimeter.
The copied pixie silhouette looks reasonable only in this relatively
same-pose, possibly same-subject catalog example. These findings are
qualitative direct screenshot inspection, not blinded human ratings.
The image is not suitable to promote as premium photographic try-on.

## What is and is not demonstrated
- Proven **within this browser test**: real local inference, source-hair
  removal, segmented reference overlay, conservative facial veto and
  research preview pixels.
- Not proven: anatomical fidelity, hairstyle faithfulness across new
  customer identities, scalp/hairline realism, 3D pose robustness, mobile
  browser RAM/thermal latency, commercial checkpoint provenance for MI-GAN
  or a new generative hairstyle synthesis model.
- Possible image identity overlap in the bundled model catalog means a
  "new customer" claim would be especially misleading. No held-out
  independent portraits were used.
- Full offline hairstyle-preview **after restart** must be independently
  checked in the newer end-to-end browser CI, not inferred from the initial
  full-reconstruction offline repeat alone.

## Next work, not completed
A commercially usable and identity-preserving **hair-specific** bald
converter and reference-conditional hairstyle generator must be independently
obtained or trained. Benchmark license-cleared GPU teachers against this
baseline on identity-disjoint, consented source/ref pairs; only then attempt
mobile WebGPU/ONNX/WASM distillation. Require subject-level blinded quality
preference, edge/scalp fidelity, device memory and real airplane-mode operation
before considering the production salon application.

Known candidate: HairFastGAN official weights (HF MIT listing), but the
official pipeline requires NVIDIA CUDA and mixes third-party components with
their own rights obligations. Its availability does not make it an offline
Android PWA checkpoint and no GPU comparison was run in Phase 25.
Sources: https://github.com/AIRI-Institute/HairFastGAN and
https://huggingface.co/AIRI-Institute/HairFastGAN .
