# Phase 12 — verified local neural inpainting experiment (2026-10-21)

## Result
On the isolated research branch, actual **MI-GAN mobile image inpainting** has executed within Chromium on the GitHub Linux CI runner and executed a second time following an offline Service Worker reload. This is independent generative pixel synthesis, **not** reference-guided hairstyle transfer and **not** a real Android device benchmark.

## Model / licensing
- Architecture: MI-GAN, Picsart AI Research, ICCV 2023, trained for general image inpainting.
- ONNX export: `andraniksargsyan/migan/migan.onnx` from Hugging Face, verified SHA-256 `593eba0b7e04730f1b61c0a3cbca68d97d8d6a7ff5c6a44a7b9d7fcd880fc5ae`.
- Exact 29,546,882 bytes, packaged into 8 local chunks, each checksum verified at build and before browser inference.
- ONNX Runtime Web 1.30.0, local WASM CPU backend, no external inference API.
- Actual model signature is `image` uint8 `[1,3,H,W]` and `mask` uint8 `[1,1,H,W]`; 0=remove, 255=keep. Output is a uint8 RGB `[1,3,H,W]` tensor. Run uses H=W=512.
- Upstream provides a MIT LICENSE-WEIGHTS and the ONNX model is labeled MIT. However its historical knowledge distillation through Co-Mod-GAN has raised questions about NVIDIA noncommercial-derived rights (see https://github.com/Picsart-AI-Research/MI-GAN/issues/25). **Do not ship the checkpoint commercially before clarification or an independent legal provenance review.**

## Actual CI verification
Run: https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39596078640
- Real Chromium ONNX inference: 18,048 masked pixels processed, 47,805 changed RGB channels, first inference 5,505 ms.
- Offline page reload with browser network disabled: inference 2,559 ms.
- Model parts 8/8 present in browser CacheStorage; no external HTTP requests allowed.
- Local MediaPipe hair segmentation also passes online and offline.
- Full existing regression suite passes.
These times are from a GitHub Linux runner, **not from a Samsung Galaxy A55 or any Android phone**.

## Implementation isolation
- `scripts/build-migan-research.mjs`: build-time-only pinned-hash downloader and ONNX/ORT assets packager.
- `public/ai/migan/research.html`: visually isolated diagnostic (no user portrait upload) generates masked image region and preserves pixels outside the region.
- `scripts/real-migan-browser-smoke.mjs`: real Chromium ONNX WASM inference, repeat after offline reload, full local-cache audit, external-request rejection and synthetic screenshot evidence.
- Research workflow packages the website, not a cloud inference service.
- Main branch and Cloudflare production remain **unchanged**. The existing salon try-on remains segmentation-assisted photographic compositing.

## Next hard quality gates
1. Prove safety of model-augmented removal on **real consented portraits**: unchanged face/ears/neck outside the mask, plausible removed-hair replacement, edge coherence, no identity hallucination.
2. Quantify Android offline performance, memory pressure, WebGPU availability and WASM CPU fallback.
3. Independently validate the license and checkpoint lineage for commercial redistribution.
4. Train or source a legally permitted **reference-conditioned hairstyle generator**, with H-Adapter-style conditioning, Stable-Hair-style initial hair removal, identity lock and real-image quality benchmarks.

**Research outcome:** fully offline neural inpainting demonstrably executes in a browser. **Unsolved:** photorealistic hair transfer from the 265-style Hananeh catalog.
