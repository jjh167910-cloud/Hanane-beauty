# Hananeh Beauty — Quality-first hairstyle try-on roadmap (2026-10-21)

## Executive decision
The currently deployed browser app is **segmentation-assisted 2D compositing**, not hairstyle synthesis. Source: `public/index.html` functions `createHairLayer`, `drawResult`, `fitTransform` and `generate`. It keeps old customer hair, pastes the reference hair, and exports only the 768×960 working canvas. More segmentation alone will not solve double hair, hairstyles with shorter target hair, hairline realism or pose-dependent occlusion.

Preserve privacy, the 265-style offline catalog, and offline operation. Do **not** claim the existing overlay provides photorealism.

## Research candidates and constraints

| Technique | Availability | Strength | Blocker |
| --- | --- | --- | --- |
| H-Adapter (ECCV 2026), https://sanghunpark.github.io/hadapter_page/ | Research results shown; do not assume downloadable production checkpoints | Pose-robust diffusion inpainting, source-aligned hair masks | Research-to-production reproduction and commercial rights are unverified |
| Stable-Hair (AAAI 2025), https://github.com/Xiaojiu-z/Stable-Hair | Published source and checkpoint instructions | Two-stage bald conversion then reference-guided hair transfer | Diffusion inference, face alignment, GPU, own benchmarks; licenses of model dependencies/weights need review |
| HairFastGAN (NeurIPS 2024), https://github.com/AIRI-Institute/HairFastGAN | Source and pretrained checkpoint instructions available | Fast GPU inference, separate hairstyle shape and color alignment | Requires Linux/CUDA/PyTorch for official inference; code MIT but validate weights/data/third-party licenses |
| HairFusion (AAAI 2025), https://github.com/cychungg/HairFusion | Research inference code | Identity-preserving hair transfer | Repo is CC BY-NC-SA 4.0: not suitable for a commercial salon without permission |
| MediaPipe HairSegmenter | Already deployed | Private offline hair masking and recolor | **Does not synthesize new hair or remove existing hair** |

Sources: project pages and official repositories above. Never infer that any model is tested on an Android browser or commercially usable solely because source code exists.

## Product architecture — explicit modes

**Offline consultation (required and default):** static PWA; all photos, models and processing remain on the device. Improve capture guidance and precomputed transparent hairstyle assets, combine face/skin/hair/person masks with edge-aware feathering, warp against facial landmarks and actual face yaw, constrain incompatible hairstyle transitions, and use relighting plus optional manual fit controls. Prefer high-quality previews of a curated subset over artificial-looking results for all 270 variants. Retain ability to decline a poor fit.

**Studio-quality generative (optional, never silently online):** benchmark HairFastGAN vs Stable-Hair on private, consented salon portraits using a GPU machine controlled by salon or an explicitly approved service. The client should receive an opt-in disclosure **before uploading**. No automatic remote fallback, no hidden photos in logs or analytics, minimal data retention. If no approved server/GPU is available, the Pro mode must remain unavailable; Cloudflare Workers static assets do not run CUDA inference.

**Experimental local generative (research only):** evaluate converted/quantized model on Android Chrome WebGPU or native Android inference after testing actual memory use, operator support, device heat, startup and runtime; do not claim entire Stable-Hair/HairFastGAN runs in a PWA. ONNX Runtime Web supports WebGPU acceleration for supported operators; feasibility is model-specific.

## Recommended engineering order

1. **Preserve production:** create an isolated quality development branch, do not overwrite the live working PWA before real visual acceptance.
2. **Establish visual benchmark:** consented 20–30 diverse, anonymous test portraits representing straight/curly hair, varying length, light/dark colors, indoor/outdoor lighting, straight and 3/4 head pose. Use 12 selected hairstyles across short/long/updo/fringe. Remove source EXIF. Avoid including real client photos in GitHub.
3. **Quantify failure modes:** score identity preservation, hairstyle faithfulness, hairline, original-hair suppression, flyaway detail, seam/lighting, haircut-length incompatibility. Use blinded A/B preferences from reviewers rather than accuracy estimates fabricated from unit tests.
4. **High-resolution source assets:** original catalog uses 512px class model previews; source image and alpha-matted 1024–2048px assets should be regenerated/curated only for approved families. Store image-pair provenance and rights. Existing approved source bank must not be silently overwritten.
5. **Offline compositing V2:** precompute alpha with hair-only matting; detect face/person regions to preserve ears/skin/jewelry; pose-aware warp; restricted luminance/color harmonization preserving hairstyle tone; guided mask cleanup and optional local inpainting. Treat long-to-pixie conversions as unsupported without trustworthy old-hair removal.
6. **GPU model comparison:** independently run HairFastGAN and Stable-Hair against identical portrait/style pairs. Preserve cropped source face with correct proportions; reject identity distortion/hairstyle drift; compare 1024px outputs. Check all checkpoint licenses before commercial use. Research H-Adapter only if official code+weights become available.
7. **Quality gate:** require repeated reviewers to prefer the upgraded mode over the current comparator on a representative held-out set. Track runtime, crashes, peak memory, image storage and whether each result was produced offline or explicitly online. Ship only after real Android airplane-mode tests on the intended phone and production verification.

## Immediate code risk to address
- `drawResult()` never removes the source hairstyle and can overlap old hair.
- `createHairLayer()` reconstructs reference hair from 512px mask/image, so edge strands are limited by that resolution.
- `uploadFile()` downsamples all customer photos into a 768×960 canvas; current JPEG export is that preview, not a full-resolution reconstruction.
- Existing local models are HairSegmenter and BlazeFace (segmentation + face detection). Neither is a hair-generation model.
- The broad category bank contains reference variants with different hair lengths/poses. Automatic eye placement cannot fully warp these for every customer.

## Acceptance and honesty
A successful build, passing JavaScript regressions, or a deployed model file cannot validate perceptual fidelity. Quality needs reproducible images and human evaluation. The highest quality for varied hairstyles requires background/hair reconstruction, not a paste-and-feather upgrade.

No GPU inference implementation or production replacement was performed by this planning document.
