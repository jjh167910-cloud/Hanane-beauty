# Phase 13 — full offline hair-segmentation → neural inpainting experiment

Date: 2026-10-21  
**QUALITY DECISION: NO-GO for customer-facing photorealistic hairstyle try-on.**  
Research implementation remains isolated; production branch and Cloudflare site have not been changed.

## Verified code and resources
- New `public/ai/migan/hair-removal-core.mjs`: converts genuine local MediaPipe hair confidence to an MI-GAN uint8 "remove = 0" mask, with face landmark validation, central face exclusion, area thresholds, and exact preservation of all source bytes outside the selected region.
- New `public/ai/migan/hair-removal-studio.html`: Persian mobile-first research web page. Local image selection and bundled catalog portraits, visible mask, explicit user approval, real on-device MI-GAN browser inference, local research-only PNG export, and a one-time offline-model installation action with CacheStorage completeness checks. Does not claim reference-style synthesis.
- New `scripts/hair-removal-core-regression.mjs` and `scripts/real-hair-removal-studio-smoke.mjs`: unit and real Chromium browser integration including offline network-disabled reload. GitHub Actions includes both.
- **All packages and inference run in the browser**; no customer image is uploaded to a model or API. The initial model downloads happen when explicitly preparing the offline PWA.

## Reproduced browser evidence
CI run: https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39599236000

- The complete unit suite, 2-model genuine-browser inference and simulated airplane-mode rerun PASSED.
- Catalog sample 1: MediaPipe + BlazeFace accepted mask 18,205 pixels (6.94% of 512²); MI-GAN changed 54,228 RGB channels and 18,203 pixels. 243,941 pixels remained untouched.
- Offline repeat of integrated chain: 2,326 ms on GitHub Linux runner, **not** an Android phone.
- Additional research-only portrait cases while browser network disabled:
  - ID 2: generated; 24,362 removal pixels; 1,432 ms MI-GAN inference.
  - ID 3: generated; 33,116 removal pixels; 1,305 ms MI-GAN inference.
  - ID 6: generated; 44,465 removal pixels; 1,389 ms MI-GAN inference.
  - ID 9: correctly rejected as unsafe (hair mask exceeded area limits).
- Full run included authentic in-browser model execution; these are not mocked outputs.
- Archived evidence under `public/ai/migan/`: `hair-removal-studio-evidence.png`, `catalog-2-inpainting-evidence.png`, `catalog-3-inpainting-evidence.png`, `catalog-6-inpainting-evidence.png`, and `portrait-benchmark.json`.

## Visual inspection — fails quality
The actual captured image outputs were visually inspected (not merely code checked):
- Very short hair → unnatural smooth scalp / swim-cap artifact, not natural skin and hairline.
- Pixie haircut → dull gray/brown synthetic-looking cap.
- Tight curls → visible artificial removal boundaries and weak reconstruction.
- Bob/medium haircut → residual hair silhouette and implausible reconstructed area.
This is **qualitative inspection by the assistant**, not a validated blinded human preference study. It is sufficient to reject a claim of FaceApp-quality on the present examples, but is not a comprehensive numerical perceptual benchmark.

**Do not merge or promote MI-GAN to salon production.** It proves the offline inference infrastructure is feasible on Linux Chromium, not that generic inpainting solves identity-preserving bald conversion.

## Newer research specifically relevant to the failed stage
- AnyBald (WACV 2026): mask-free diffusion-based realistic in-the-wild bald conversion trained for human-head semantics. Project: https://vision3d-lab.github.io/anybald/ . Code/dataset marked "Coming Soon" at evaluation time; cannot directly deploy.
- Stable-Hair (AAAI 2025): dedicated bald converter before hair-reference synthesis. https://github.com/Xiaojiu-z/Stable-Hair. Large SD1.5-based model and published alignment limitations.
- HairPort (SIGGRAPH 2026): 3D-aware converter and pose-aligned synthesis, 24 GB GPU recommended, code/model licensing restrictive. https://github.com/deepmancer/HairPort .
- HairPort Baldy paired dataset metadata licenses it CC-BY-NC-ND-4.0; **not an authorized commercial training asset** without additional permission. https://huggingface.co/datasets/deepmancer/baldy .
- MI-GAN weights explicitly MIT in upstream, but possible Co-Mod-GAN/NVIDIA distilled-teacher rights remain for legal review.

## Recommended next research, not yet built
1. Obtain or construct **commercially licensed hair/bald paired portraits** with pose/lighting diversity; ensure written redistribution and derivative-model permission, including any synthetic-generation teacher model.
2. Train a compact, face-specific bald-conversion student model and benchmark on real, consented portraits. Measure natural scalp/hairline, ears, background continuation, facial identity, and difficult long-to-short cases.
3. Separately train or license reference-guided hair generator (H-Adapter/HairPort ideas) with hairstyle-geometry conditioning.
4. Distill and quantize to fit target Android Chrome WASM/WebGPU constraints; measure actual RAM, thermals, performance and airplane-mode operation on physical devices.
5. Maintain unmodified original photo and prevent production export if perceptual identity/hair-quality gate does not pass.

## Final scope check
**Achieved:** full, genuine offline neural segmentation-to-inpainting pipeline in Chromium including multiple real-photo catalog examples, strict privacy, face exclusion, CI tests, release-ready static artifacts for research.  
**Not achieved:** realistic bald conversion, target-style synthesis, FaceApp-quality, physical Android validation, or commercial checkpoint certification.
