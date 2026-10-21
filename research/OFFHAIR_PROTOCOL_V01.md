# OffHair research protocol v0.1 — preregistration draft
Date: 2026-10-21. Status: proposed, **not** preregistered, reviewed, or experimentally confirmed.

## Research questions
RQ1: Does a task-specific compact bald-conversion network improve perceived scalp realism versus generic MI-GAN under matched mask, portrait, and inference budget?
RQ2: Can explicit identity/face preservation reduce unintended changes without lowering target-hairstyle fidelity?
RQ3: What are the quality, latency, peak memory and energy tradeoffs of fully offline browser execution on mid-range Android phones?

## Hypotheses (to test, not assume)
H1: A task-specific model is preferred to MI-GAN in blinded naturalness pairwise comparisons.
H2: An explicit protected-region objective reduces changes to non-hair facial features.
H3: Quantization improves model footprint but introduces measurable quality tradeoffs.

## Data and ethics
Use only portrait images with documented consent for research, training and derivative synthesis. Keep train/validation/test subjects disjoint. Store a dataset manifest with source, consent/license, model-release permission, usage restrictions, SHA256, subject identifier (pseudonymous), split and withdrawal status. No public redistribution of customer portraits. Check jurisdiction-specific privacy law, biometrics, retention and research ethics requirements before collecting data. No HairPort Baldy noncommercial/no-derivatives assets in a commercial-training dataset. Do not presume teacher-generated data can be redistributed or distilled without permission.

## Precommitted evaluation design
Freeze dataset and evaluation protocol before final model selection. Distinguish paired synthetic ground truth from unpaired real portraits. Use at least three independent seeds for trainable baselines where feasible; report confidence intervals across identities (not only images). Keep a completely held-out test split for one final evaluation.
Baselines: unchanged portrait (negative control), MI-GAN + MediaPipe pipeline, legally usable available reference-hair baseline, new method with/without geometry and identity losses. Never claim comparison to a model that was not executed under documented conditions.
Metrics: non-hair LPIPS and pixel preservation; ArcFace cosine similarity only with appropriate consent and demographic failure analysis; masked-region boundary artifact rate; blinded human preference for scalp realism, hair-reference fidelity and identity; peak JS/WASM/GPU memory, first-use model download bytes, cold/warm latency, battery/energy, failure and timeout rate.
Human rating: randomized A/B ordering, independent raters, explicit uncertainty intervals, no identifiable public photos, document exclusions and inter-rater agreement.
Mobile target: physical Galaxy A55-class Exynos device and at least one additional Android device; airplane-mode cold and warm tests after installation; log Chrome version, Android version, CPU/GPU, WebGPU/WASM backend and thermal state. Linux Chromium CI is not an Android performance proxy.

## Quality gates
G0: model/data commercial rights and research consent cleared.
G1: model executes offline in browser with no external requests; memory does not crash target hardware.
G2: unchanged facial region verified; no unacceptable ear/eye/hairline distortion in a held-out real-portrait sample.
G3: blinded preference and quantitative results outperform a declared baseline at a declared resource budget.
G4: results reproducible with archived code, model provenance, seeds, environment, failure cases and complete negative outcomes.

## Existing evidence
Phase 12/13: real local MediaPipe + MI-GAN pipeline runs in Linux Chromium and after network-disabled reload; four sample portraits generated; one rejected; visual quality NO-GO (cap-like scalp). No trained hairstyle transfer model, no Android physical measurements, no publication-ready comparative statistics. Source: research/PHASE13_VISUAL_QUALITY_NO_GO.md.

## Paper claims policy
The project name OffHair is provisional. Do not use phrases 'state of the art', 'FaceApp-quality', 'commercially cleared', 'proven Android performance', or 'scientifically validated' until corresponding evidence is collected. Publish failed experiments as well as successes. AI assistance and conflicts of interest should be disclosed in accordance with target venue policy.

## Milestones
M1 protocol and dataset/rights manifest frozen.
M2 independently rerun existing baseline with reproducible metrics and photographic failure taxonomy.
M3 lawful paired training data and specialized bald-conversion student; ablations.
M4 reference-conditioned hair synthesis and head-pose robustness evaluation.
M5 physical Android benchmark and blinded evaluation.
M6 paper draft, reproducibility supplement and submission decision.
