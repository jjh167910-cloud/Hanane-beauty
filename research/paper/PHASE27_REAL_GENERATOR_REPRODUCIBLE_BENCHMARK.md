# Phase 27 — licensed real-generator benchmark harness; no GPU results yet

**Date:** 2026-10-22  
**Repository branch:** `research/offline-generative-feasibility-2026-10-21`  
**Status:** Preflight automation implemented; **generator execution NOT verified**.  
**Salon release:** **BLOCKED**. Production `main` unchanged.

## Research candidate and actual dependency requirements

**HairFastGAN** (NeurIPS 2024) has a functioning reference-guided generator
and an official local command-line interface accepting source-face, hair-shape,
and hair-color images. Upstream is pinned to Git commit
`49e98019c9243d1991c19d45764fc3340a498de2`.
The method depends on large StyleGAN-derived checkpoints and additional
encoders, CUDA, Linux and a dedicated NVIDIA GPU. Its published sub-second
benchmark is for a V100; it is NOT proof of Android Chrome feasibility.

- https://github.com/AIRI-Institute/HairFastGAN
- https://huggingface.co/AIRI-Institute/HairFastGAN
- https://arxiv.org/abs/2404.01094

**Critical rights gate:** The top-level HairFastGAN repository and HF model
metadata say MIT, but the code explicitly derives from and reuses several
separately licensed research projects and StyleGAN pretrained assets.
NVIDIA's official StyleGAN2-ADA source license section 3.3 permits research
and evaluation, not general commercial use. This fact by itself does **not**
prove the individual HairFastGAN package is a derivative covered by every
NVIDIA clause, but it is a concrete unresolved commercial rights problem
for StyleGAN-family code/weights and training lineage. Require permission
or an independently cleared replacement before any customer-facing salon
deployment. Do not infer blanket commercial approval from a repo badge.

- https://github.com/NVlabs/stylegan2-ada-pytorch/blob/main/LICENSE.txt
- https://github.com/AIRI-Institute/HairFastGAN/blob/main/LICENSE

**Stable-Hair v2** provides an alternate high-quality diffusion architecture,
but its several pretrained modules, SD 1.5 and CLIP dependencies are much
larger and require separate licensing/hardware review. It is not a proven
low-cost offline Android browser solution.
- https://github.com/sunkymepro/StableHairV2

## Implemented reproducible GPU research harness

`scripts/phase27_hairfastgan_benchmark.py` has a strict **preflight-only**
mode requiring a local JSON manifest and file root. A valid manifest has:

- `schema: "HANANEH-PHASE27-PAIR-v1"`
- A nonempty `cases` array, maximum 100 cases
- A unique `case_id`; distinct `source_subject_id` and
  `reference_subject_id`, not the unverified catalog identity
- Seven keyed local assets: `source_image`, `shape_image`,
  `color_image`, `source_rights_record`, `source_consent_record`,
  `reference_rights_record`, `reference_consent_record`
- Each asset has a relative `path` and lowercase hex `sha256`.
  Symlinks, missing records, path traversal, hash mismatch and unsupported
  image signatures are rejected.

In the first frozen protocol, `shape_image` and `color_image` MUST refer
to the SAME consented reference photo. A third-person hair-color source is
blocked until its independent permission/consent is represented in a
higher-versioned schema.

The harness checks *presence and hashes*, not validity/scope of the user's
legal consent or license agreements. Placeholder forms or synthetic identities
are **not proof of rights**. Do not use gallery portraits whose independent
identities or permissions are unverified. No source images are committed.

Example CLI, on the data owner's Linux/NVIDIA machine:

```bash
# First confirm rights and integrity; runs with Python standard library only
python3 scripts/phase27_hairfastgan_benchmark.py \
  --manifest /private/consented-pairs.json \
  --data-root /private/consented-photos

# Then, after separately preparing pinned HairFastGAN code, CUDA environment,
# and pretrained weights with verified rights for RESEARCH use:
python3 scripts/phase27_hairfastgan_benchmark.py \
  --manifest /private/consented-pairs.json \
  --data-root /private/consented-photos \
  --upstream-dir /opt/HairFastGAN \
  --output-dir /private/phase27-outputs \
  --execute
```

The `--execute` path confirms the upstream code revision, inventories and
hashes local checkpoint files, invokes the genuine official `main.py` for
each trial and writes **local** output PNG files. No Hugging Face Space, API,
paid hosted model or customer portrait upload is used by the harness itself.
Offline environment variables are set. Actual OS-level network isolation is
NOT proven; use an independently network-restricted environment if needed.
No GPU process was run in the current ChatGPT environment.

The evidence JSON reports each output hash, local wall time and **unrated**
status. It hardcodes `commercial_release_allowed=false`,
`photorealism_verified=false`, `android_offline_verified=false` and
`network_isolation_verified=false` rather than treating successful tensor
generation as salon quality.

Eight standard-library regression tests verify refusal of corrupt or
incomplete consent/rights files, duplicate trial IDs, identical subjects,
unverified catalog identity, symlink/traversal and missing local GPU checkout.
They are invoked from the regular `npm run test:unit` verification flow.

## What actual results are still absent

- GPU model inference on independently consented and rights-cleared images
- Blinded, per-person A/B ratings for hairstyle fidelity, hairline realism,
  face identity, ear/background integrity and difficult yaw
- Model image versus Phase 26 composite side-by-side, including failures
- Actual phone WebGPU/WASM memory, loading, thermal behavior and timings
- A completely cleared commercial dependency/teacher/weights chain

No synthetic test image, successful preflight, upstream published teaser, or
model-label license can substitute for these missing measurements.

## Go/no-go decision

**GO for research-only evaluation** with rights-cleared locally stored
images and legally permitted checkpoint use. **NO-GO for Android PWA
deployment and all commercial salon output.** If the specialised generator
clearly beats the Phase 26 baseline on independent portraits, investigate
constrained student distillation using only authorized datasets/teacher
outputs, then quantize and benchmark on physical Android hardware.

## Optional local visual A/B and protected-face checks

`scripts/phase27_score_outputs.py` is an optional **post-inference** local
image-review helper. Install Pillow on the REVIEW COMPUTER only; it is not
bundled into the salon website. An external
`HANANEH-PHASE27-REVIEW-v1` JSON describes up to 50 local cases:

```json
{
  "schema": "HANANEH-PHASE27-REVIEW-v1",
  "cases": [{
    "case_id": "licensed-trial-01",
    "source_aligned": "a/source.png",
    "phase26_aligned": "a/phase26.png",
    "candidate_aligned": "a/generator.png",
    "independent_face_protect_mask": "a/face-mask-independent.png"
  }]
}
```

The helper requires pixel-identical registration and a sufficiently large
independently annotated facial region. It reports baseline vs candidate RGB
difference within that protected area and creates a 3-column watermarked
local contact sheet for blinded visual review. Pixel drift is not verified
identity similarity, hair realism or hairstyle fidelity. All human ratings
are deliberately NULL, and commercial release remains FALSE.

```bash
python3 scripts/phase27_score_outputs.py \
  --review-json /private/phase27-review.json \
  --data-root /private/consented-photos \
  --report /private/review/metrics.json \
  --contact-sheet /private/review/unrated-contact-sheet.png
```

**No actual HairFastGAN outputs, blinded ratings or phone tests have been
generated in this ChatGPT session.** The smoke tests use synthetic bytes
solely to test the refusal logic; such bytes are not valid photographic
scientific material. Licensing remains a blocking requirement.
