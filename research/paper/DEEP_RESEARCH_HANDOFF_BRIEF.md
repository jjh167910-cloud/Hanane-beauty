# OffHair — Deep Research brief for independent literature and feasibility review
Prepared 2026-10-21. The purpose is **falsification and novelty-risk assessment**, not validation of an already proven contribution.

## Core question
Which **commercially licensable**, reproducible hair-removal and reference-conditioned hair-transfer methods can be compressed to run completely **offline within Android Chrome/PWA** (focus on Samsung Galaxy A55-class hardware) without losing acceptable facial identity, head anatomy, and hairstyle fidelity? If not feasible, establish credible quality-vs-memory/latency boundaries and an independently useful systems-study contribution.

## Mandatory review tasks
1. Search peer-reviewed primary publications, source code and checkpoint/model-card terms from 2022–2026, including HairFastGAN, Stable-Hair, AnyBald, H-Adapter, HairPort, and papers addressing mobile browser image generation/inpainting. Verify exact publication dates, artifacts, commercial restrictions, and model lineage (not merely GitHub LICENSE).
2. Form a **claims-to-prior-work matrix**: which elements are already demonstrated, what actual unsolved gap remains, and what experiment would falsify each proposed novelty claim.
3. Identify **rightfully reusable training datasets**, specifically portrait consent, face privacy, commercial derivative/training permissions, and teacher-distillation permissions. Do not propose datasets with noncommercial/no-derivatives terms as commercial training material without written exception.
4. Survey offline Android browser inference: WebGPU compatibility by GPU/browser build, WASM SIMD/thread support, ONNX Runtime Web and TFLite runtimes, cross-origin isolation, RAM and download footprint, thermal and offline-cache persistence. Do not equate Linux Chromium inference benchmarks with Android speed.
5. Recommend 3 viable model architectures with explicit expected failure modes and honest model-size/latency estimates clearly labeled *hypotheses*, not measured results. Include training compute requirements and checkpoint export path.
6. Produce an experimental comparison plan and *power-analysis approach*, not invented numerical performance. Prioritize blinded comparative scalp/hairstyle realism, identity, head pose, long-to-short cases, external-network access, peak memory and latency.
7. Review venue fit, deadlines, reproducibility/ethics constraints, preregistration and disclosure policies; distinguish an arXiv preprint from peer review.
8. **Try to disprove the project hypothesis**, including adverse comparisons, restrictive weights licenses, Android incompatibilities, insufficient dataset rights, and whether the novelty is only routine integration.

## Existing empirical facts (do not inflate)
- MI-GAN 512 ONNX: 29,546,882 bytes, SHA256 pinned; browser inference and simulated offline reload passed on GitHub Linux CI.
- MediaPipe hair/face analysis -> MI-GAN hair-region inpainting runs locally under Chromium CI; four catalog images generated, one mask rejected. Linux offline inference around 2 seconds in some warm trials; no Android measurement.
- Real outputs visually failed salon-level quality: cap-like scalp, poor hairline and unnatural boundaries.
- Reference hairstyle synthesis is **not yet implemented**. No new trainable generator/checkpoint exists. No independent human preference ratings or approved training portrait dataset.
- Source research state: `research/OFFHAIR_PROTOCOL_V01.md`, `research/paper/protocol-v1.json`, `research/PHASE13_VISUAL_QUALITY_NO_GO.md`, `research/paper/BLINDED_RATING_INSTRUMENT_V01.md`, `research/paper/LITERATURE_NOVELTY_MATRIX_2026_10.md`.

## Requested output
- 20–40 primary sources with dated citations, evidence levels, and link checks.
- Novelty matrix distinguishing **already solved**, **open**, **uncertain**.
- Usable/non-usable dataset/model license table with legal review caveat.
- Two-stage research roadmap with decisive kill/go criteria and experiments runnable at low cost.
- Recommended *primary publication claim* and feasible venue; clear warning if current concept is not sufficiently novel.
- Red-team section highlighting likely reviewer objections and reproducibility gaps.

## Rules
Do not fabricate accepted papers, existing trained models, hardware results, inference screenshots, human ratings, legal permission, or profitability/quality scores. Any new source's claims must be attributed; source code licenses do not automatically cover checkpoints and training datasets. Report unresolved questions explicitly.
