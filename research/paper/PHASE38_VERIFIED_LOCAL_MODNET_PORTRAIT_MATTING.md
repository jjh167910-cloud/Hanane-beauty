# Phase 38 — genuine local MODNet portrait matting feasibility (not a hair matte)

2026-10-22. Research branch only; production main unchanged.

## Why change direction

Thirty-seven earlier phases established a real local MediaPipe hair
segmenter, protected face-skin veto, MI-GAN hair removal, reference
compositing and incremental cosmetic safeguards. They also revealed a
53-pixel unnatural upper-forehead cutout and no independent evidence
that hair looks natural. Smoothing or RGB tweaking can suppress a
metric without generating new strands.

This phase adds a **genuine pretrained neural alpha model** that can be
loaded, evaluated and repeated completely offline in Chromium: MODNet.
Crucial limitation: MODNet predicts a **person portrait alpha**,
not the alpha of hair alone. Its output cannot be used as a magical
hairstyle matte or a permission to alter facial skin.

## License, pinned provenance and model size

- Official upstream: https://github.com/ZHKKKe/MODNet
- Official paper: *MODNet: Real-Time Trimap-Free Portrait Matting via
  Objective Decomposition*, AAAI 2022
- Official README explicitly states that the code, models and demos
  in the upstream repo are Apache License 2.0, excluding selected GIFs.
- The publicly published ONNX fp16 conversion is
  `Xenova/modnet` on Hugging Face with an Apache-2.0 license label:
  https://huggingface.co/Xenova/modnet/blob/7e0f55f28727b43369531f75e0539ecc4912af82/onnx/model_fp16.onnx
- Exact model checksum:
  `25f165da9bfd30830a575f1f0490f1acd995975cb349bc02f3d79332e1fe5cf6`
  and **12,984,781 bytes**. The immutable publication contains
  512×512 RGB input, whole-person float32 alpha output.
- Preprocessing uses 512² RGB with mean .5, standard deviation .5;
  see upstream
  https://huggingface.co/Xenova/modnet/raw/main/preprocessor_config.json
- MIT/Apache-licensed computer vision infrastructure and free
  download do **not** establish that a specific human's reference
  portrait or haircut style photograph is licensed for reuse.
  No model or website can certify salon export automatically.

## Reproducible engineering work

`scripts/build-modnet-portrait-research.mjs` is a **build-time**
download and vendor-only utility. It refuses any bytes with different
size or SHA256; bundles the model on the same origin as the PWA; writes
an explicit manifest and records that hair-alpha quality and Android
performance are unverified. It adds ~13 MB to the research site only.

`public/ai/migan/portrait-modnet-neural-audit.mjs` implements genuine
`onnxruntime-web` inference:
- Normalize local opaque 512×512 RGB to [-1,1] NCHW float32,
  feed `input` [1,3,512,512], obtain `output` [1,1,512,512].
- Validate numeric output and predicted-alpha range;
  report mean predicted portrait alpha, predicted-person pixels,
  hair pixels inside predicted person, and uncertain overlap.
- Separately draw a grayscale *portrait alpha* preview in browser
  memory, never edit the original portrait or the hair-compositor
  support mask, and never permit exporting it as a hairstyle.
- The UI requires the existing source face segmentation and
  explicit consent; downloads a same-origin model after SHA256
  validation using SubtleCrypto before local CPU inference.
- The offline preparation function prefetches the vetted model and
  associated code in the service-worker cache. After that, all
  inference runs on the device without needing Hugging Face.
- A model predicting a nontrivial portrait boundary **does not**
  prove a correct hair matte, solve scalp reconstruction, recover
  wisps, or grant use in the salon commercial client.

`scripts/phase38-portrait-modnet-regression.mjs` verifies the
exact normalized input tensors, expected shape, safety claims,
rejection of malformed output and refuse-before-use of unknown model
sizes. It does NOT generate AI scores or claim model quality.

`scripts/real-hair-removal-studio-smoke.mjs` exercises
the whole MediaPipe+MI-GAN research pipeline and the **real** MODNet
model in Chromium, requires successful local inference,
verifies no hair-only/generative claims, caches the model for
network-disabled loading, reruns actual neural inference after
airplane-mode reload and compares source portrait-alpha statistics
to the earlier run.

## Acceptance and restrictions

A genuine SHA-pinned Apache-2 MODNet model is feasible at moderate
size for an on-device portrait alpha reference signal, subject to
measured performance. It should not be fused into the hairstyle
output until separate *hair-alpha* ground truth and human evaluation
show that this actually improves hair and scalp plausibility.
Portrait/person alpha and hair alpha are different semantic concepts.

Commercial salon hairstyle generation, independent different-person
hairline realism, physical Android memory/latency, full legal rights
of all catalog images and a licensed generative transfer model
remain NO-GO.

## Verification

Only mark inference PASS after a complete successful GitHub Actions
run on the exact Phase 38 commit, with a genuine local MODNet
model and an offline repeat. A synthetic tensor/unit test is not
sufficient.
