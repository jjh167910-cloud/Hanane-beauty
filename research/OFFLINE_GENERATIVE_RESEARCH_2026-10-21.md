# Offline photorealistic hairstyle generation — qualification decision (21 Oct 2026)

## Non-negotiable product contract
1. The web PWA must process customer portraits locally. No hidden server or online AI fallback.
2. A model must transfer **selected reference hairstyle shape**, not merely recolor or paste a transparent photograph.
3. Preserve facial identity and non-hair features; long-to-short edits must remove or reconstruct original hair convincingly.
4. Commercial checkpoint and dependency rights must be independently verified.
5. Do not advertise photorealistic quality without blind evaluation on genuine consented portraits.

## Reviewed candidate classifications
| Candidate | Role | Exclusion / qualification |
| --- | --- | --- |
| HairPort (SIGGRAPH 2026) | Highest-value 3D-aware research reference | >=24 GB VRAM recommendation; CC BY-NC-ND project and restricted third-party dependencies; not a direct Android deployment |
| H-Adapter (ECCV 2026) | Reference-specific pose and cross-attention guidance | No confirmed fully released, browser-deployable trained checkpoint |
| Moebius (ECCV 2026) | **Commercially usable** Apache-2.0 local inpainting baseline | ONNX/WebGPU browser port exists; ~1.27 GB initial weights, 512 px; not reference-conditioned hair transfer |
| DreamLite (2026) | Mobile four-step model architecture | Weights are noncommercial research-only; iOS reference does not prove Android Chrome |
| Nightmare Mobile | Android-native offline diffusion case study | Snapdragon-specific external QNN runtime and CC BY-NC dependency; incompatible with universal commercial PWA |
| MediaPipe HairSegmenter | Local segmentation baseline | Hair mask is not new hairstyle synthesis |

Sources: https://github.com/deepmancer/HairPort ; https://sanghunpark.github.io/hadapter_page/ ; https://github.com/hustvl/Moebius ; https://github.com/simonw/moebius-web ; https://github.com/ByteVisionLab/DreamLite ; https://github.com/AbrahamPaulJ/nightmare-mobile ; https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter

## Engineering decision
**Do not replace the production PWA with Moebius or a fake generative overlay.** Continue the existing catalog/segmentation while evaluating a locally packaged specialized reference-conditioned inpainting student. Training may occur on GPU infrastructure during development, but customer inference must operate entirely offline.

Before undertaking costly training, verify:
- Browser WebGPU compute actually executes on the target Android phone, rather than reporting mere API presence.
- WASM CPU fallback and all locally pinned assets are present, including signed hashes and license review.
- Peak RAM, GPU allocations, latency and battery heat for an **actual model** on entry/mid/high-end Android hardware.
- Images: at least 30 consented distinct portrait identities and 10 hairstyle references; difficult pairs include changed head pose, long-to-short, eyeglasses, fringes and accessories.
- Blinded review: identity preservation, hairstyle fidelity, hairline, flyaways, occlusion and lighting. Benchmark the same pairs against the current compositor.

## What is implemented now
A separate downloadable research utility, **Hananeh Offline AI Feasibility Lab**, measures browser capabilities and performs a small verifiable WebGPU compute/readback with no photos and no network calls. Its JSON evidence is **not** a model-quality score. Separate Python fail-closed asset and deployment-evidence qualification tests are supplied. Run those tests before claiming local AI readiness.

## Status
**NOT QUALIFIED.** A commercially suitable, reference-conditioned generative checkpoint has not been bundled or run on a real Android phone. Until then, the UI must call its current preview 'local compositing', not FaceApp-quality AI. Development branch only; production deployment unchanged.
