# Phase 28 — handset feasibility, weights rights and anonymous field evidence

**Date:** 2026-10-22. **Research-only.**
The production `main` app remains unchanged. None of the evidence
here establishes Android performance or generative photorealism.

## Measured public facts / external research

The published pretrained-model directory of
[AIRI-Institute/HairFastGAN](https://huggingface.co/AIRI-Institute/HairFastGAN/tree/main/pretrained_models)
is labelled **7.73 GB** by the hosting UI, and contains a heterogeneous
set of at least 11 subdirectories (StyleGAN, BiSeNet, E4E,
FaceStyleEncoder, ArcFace, etc.). This is an approximate site display,
not a locally independently hashed full byte inventory. The published
StyleGAN `ffhq.pt` file alone is approximately **133 MB**, with SHA256
`48a146c502117a283437d1c14f755a9416eb9255694e0964403f95b14fc094e9`.
Its advertised upstream inference environment is Linux/NVIDIA CUDA.
The publicly advertised subsecond V100 benchmark is not a phone benchmark.

- https://huggingface.co/AIRI-Institute/HairFastGAN/tree/main/pretrained_models
- https://huggingface.co/AIRI-Institute/HairFastGAN/blob/main/pretrained_models/StyleGAN/ffhq.pt
- https://github.com/AIRI-Institute/HairFastGAN

HairFastGAN's GitHub repo identifies itself as MIT, but reused
third-party code and weights have not individually been cleared for
commercial salon use. NVIDIA StyleGAN2-ADA **Section 3.3** explicitly
restricts the covered Work and derivatives to non-commercial use.
One cannot infer that every single HairFastGAN file necessarily carries
that license; equally, the repo's broad MIT badge does not resolve the
license of all its dependencies. Permission is required for a covered
restricted component, or a demonstrably unrestricted replacement.

- https://github.com/NVlabs/stylegan2-ada-pytorch/blob/main/LICENSE.txt

## Implementation — a deploy gate that does not certify itself

`research/phase28/mobile-generator-feasibility.mjs` exports
`evaluateMobileGeneratorPack()`. Its declared targets are RESEARCH
budget goals, not Android platform limits:

- Compressed/offline model asset budget **384 MiB** (arbitrary Hananeh
  first-load target; performance should be re-assessed on actual devices)
- Independently measured peak process memory **at most 1,024 MiB**
  (not `performance.memory` JS heap)
- Measured 95th-percentile inference **at most 15 seconds**
- Real offline Android Chrome phone and a complete, SHA-pinned
  ONNX/ORT/TFLite asset inventory
- Independently cleared commercial model/component rights, checkpoint
  provenance, **10 or more distinct portrait subjects** with human
  face-identity, hairline and fidelity review

No JSON object may independently license a model or prove real
measurement. Even a flawless synthetic/predeclared candidate receives
`technicalPreflightPassed:true` only, and ALWAYS
`readyForAndroidDeployment:false`, `commercialReleaseAllowed:false`
unless separate independently verified release authorization is
later developed. Unsupported Python `.pkl`, `.pt`, `.pth` weights
cannot be loaded by the web runtime and are refused.

`research/phase28/hairfastgan-published-snapshot.json` has only
published metadata, intentionally **not** a complete asset list. The
real unconverted HairFastGAN candidate fails the runtime, inventory,
size, quality, legal and physical-phone measurement gates.

`scripts/phase28-mobile-feasibility-regression.mjs` supplies
adversarial negative cases as part of the regular `npm run test:unit`
workflow. There is no fabricated accelerated inference result.

## Actual phone data: user-initiated anonymous export

`public/ai/migan/device-evidence.mjs` creates a strict whitelist JSON
record from the existing REAL offline MediaPipe + MI-GAN run and optional
reference-preview diagnostic:

- MI-GAN model inference and total times, removed pixel count,
  face/skin conflict count and outside-mask integrity.
- Android vs other coarse platform class, coarse memory/CPU bucket if
  exposed by Chromium, and offline status as reported by the browser.
- Whether the existing Phase 25 2D reference composition and Phase 26
  target-aware comparison completed. They remain labelled **NON-GENERATIVE**.
- Flags showing **no commercial approval**, **no independent model
  licensing**, **no measured process peak memory**, and **no certified
  airplane-mode network-isolation proof from this report alone**.

The experimental Persian studio now exposes a **download JSON report**
button ONLY after the approved real neural run. A checkbox revocation
or portrait reset disables it. The browser download is user-initiated
and contains **no portrait bytes, image data URI, landmarks, exact
hardware ID, user agent string, location, file path or image name**.
It is NOT uploaded as analytics and is not silently stored.

`scripts/phase28-device-evidence-regression.mjs` checks privacy and
false-certification cases. The Playwright browser smoke captures the
generated download after REAL MI-GAN execution, parses its JSON,
checks data minimization and confirms revocation disables export.
An Android handset must still be tested physically; a Linux CI runner
cannot certify a phone.

## Decision

- **PASS** for bounded, non-self-certifying candidate screening and
  anonymous metrics-only local field-test tooling, when full CI passes.
- **NO-GO** for pushing the 7.73 GB CUDA HairFastGAN teacher, its
  mixed-rights dependencies or guessed quantized equivalents to the
  offline Android PWA.
- **NO-GO** for the commercial hairstyle generator until a RIGHTS-CLEARED
  compact student model, its real pretrained bytes, independent
  distinct-person before/after quality ratings, and physical-phone
  offline tests all exist and pass.

A smaller generator would require actual research: authorized teacher
data, ground-truth hair geometry and occlusion, training and
distillation, runtime export/quantization, and external review.
This is not solvable by changing a CSS overlay or re-running MI-GAN.
