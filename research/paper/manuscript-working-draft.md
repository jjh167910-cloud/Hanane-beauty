# A Reproducible Offline-Web Baseline for Hair Segmentation and Generative Image Inpainting: Feasibility and Failure Modes

**STATUS: WORKING RESEARCH MANUSCRIPT — NOT PEER REVIEWED OR READY FOR SUBMISSION**  
Study: OffHair · Protocol: `OFFHAIR-PROTOCOL-2026-10-21-v1`  
Date: 2026-10-21 · Authors: **to be determined by genuine contributions and agreement**

## Abstract (provisional; do not submit without replacing bracketed fields)

Privacy-preserving hairstyle editing motivates performing image segmentation and neural restoration entirely inside mobile web browsers. We present a reproducible *engineering baseline* connecting a locally packaged MediaPipe hair segmenter and face detector to a 29.5 MB MI-GAN ONNX inpainting network, using local WASM inference and a Service Worker cache. In Linux Chromium CI, the pipeline executed after a network-disabled reload with no external inference requests, using bundled salon catalog images. A region-preservation check prevented modifications outside a proposed hair-removal mask. A preliminary five-image qualitative inspection revealed implausible cap-like scalp textures and incomplete anatomical reconstruction; such outcomes are not evidence of photographic quality or subject-independent statistical generalization. **[Future work required: independent human subjects, commercial data permissions, physical Android measurements, baseline comparisons and controlled human ratings.]** Our findings delimit the feasibility and quality of generic inpainting as a component of fully offline hairstyle editing. The present manuscript is a preregistered-in-repository planning artifact, not a performance-certified or peer-reviewed paper.

## 1. Research questions, rather than success claims

- RQ1: Does a locally cached segmentation-to-inpainting pipeline complete inference without internet after browser restart?
- RQ2: Which failure modes occur when a generic inpainting model is used for bald conversion?
- RQ3: What trade-offs among model size, latency, peak memory, facial identity preservation and perceived realism arise on actual Android hardware?
- RQ4 (future method paper): Can an independently trained reference-conditioned student model improve realism and preserve identity under mobile limitations?

Only RQ1 is supported by current tests. A limited preliminary observation informs RQ2. RQ3 and RQ4 have no confirmatory evidence.

## 2. Related work and distinctions

Discuss and cite:
1. HairFastGAN (NeurIPS 2024): efficient geometric/color hairstyle transfer (desktop GPU benchmark, not an Android Chrome result).
2. Stable-Hair (AAAI 2025): dedicated bald conversion plus reference-guided generation.
3. H-Adapter (ECCV 2026): pose-aware reference guidance and two-stage inpainting.
4. HairPort (SIGGRAPH 2026): in-context 3D alignment and bald-conversion approach with substantial inference compute.
5. AnyBald (WACV 2026): domain-specialized portrait bald conversion, implementation release unresolved as of October 2026.
6. MI-GAN (ICCV 2023): general-purpose lightweight inpainting, not a hairstyle generator.
7. MediaPipe Tasks: locally packaged face/hair analysis.
8. ONNX Runtime Web: local browser WASM inference and isolation requirements.

The method here **does not introduce a new GAN architecture or claim to surpass these baselines**. Any eventual novel student model belongs in a different paper with its own architecture, training and ablations.

## 3. Reproducible engineering methods

### 3.1 Baseline
512×512 local portrait; MediaPipe image segmentation and face geometry; high-confidence hair region; conservative elliptical face exclusion; removal mask encoded with zero for pixels to regenerate and 255 for pixels to keep; MI-GAN uint8 `image [1,3,512,512]` and `mask [1,1,512,512]`; ONNX Runtime Web WASM inference; composite only in the removal mask. Assets are cached by Service Worker and checksummed before model use.

### 3.2 Privacy and reproducibility
The page and model assets are same-origin. A browser test aborts external requests, reloads in simulated airplane mode, and reruns both real models. Report the browser version, OS, CPU, RAM, thread count, isolation headers, source commit, model checksums, cold startup time, warm inference time and failure codes. **Do not use desktop CI results to infer Android performance.**

### 3.3 Evidence audit
All cases (including rejection/timeout/error) appear in metadata reports; `scripts/research-evidence.mjs` validates required provenance, complete method hashes, identity-disjoint data splits, successful-run metrics, non-hair pixel integrity, and no image payloads. Identity and image provenance for the existing catalog are not independently verified, so examples are conservatively grouped as a single unresolved source identity and used only as **engineering smoke cases**.

### 3.4 Ethics / law
Before using people's images for human research, verify consent, legal basis and withdrawal procedures, retention controls, dataset/model licensing and any required institutional ethics review. Do not assume that a publicly accessible catalog grants training rights. Commercial redistribution rights for the MI-GAN model lineage are **not finally established**. No public human-image dataset is offered with this paper draft.

## 4. Preliminary observation ledger (not scientific effect estimates)

From **CI run 39599236000**, five catalog examples were exercised; four passed the mask gate and produced neural outputs, while one was rejected due to a large mask. The representative first accepted case had 18,205 removal-mask pixels and 243,941 other pixels unchanged at 512×512. The Linux runner's integrated offline-repeat neural inference was 2,326 ms, which is hardware-specific.

Actual qualitative screenshot inspection found unconvincing, overly smooth scalp/cap artifacts across selected styles. These were not evaluated by blind raters, and the small catalog sample is neither representative nor an independent set of identities. **Do not attach confidence intervals or significance claims to these cases.**

The revised metadata workflow will report all five cases, masks, accepted/rejected counts, content hashes and technical timing; the evidence validators intentionally set `can_claim_photorealism = false` and `can_claim_offline_android = false`.

## 5. Prospective confirmatory experiments (NOT YET CONDUCTED)

- **Pilot:** seek consent and rights for at least 30 distinct subject identities and 10 frozen hairstyle references. Use pilot findings only to refine masking, instrument reliability and sample-size/power assumptions.
- **Confirmatory:** proposed 120 identities × 8 reference hairstyles = 960 pairs (subject to preregistered power analysis). Keep identities disjoint across train, validation and held-out test, with reference persons distinct from evaluation subjects. Publish exact inclusion/exclusion counts.
- **Comparisons:** unchanged photo identity baseline (for identity score only, not a hair-transfer model), current 2D compositor, MI-GAN generic inpainting, hair-specific bald converter once available, and reference-guided generator once available. Compare only tasks methods can actually perform; do **not** report MI-GAN as a reference hairstyle transfer method.
- **Human review:** multiple independent blinded raters score realism, identity consistency, reference hairstyle match and artifacts. Randomize presentation order, record annotator agreement and preregister primary comparison, report rejection and noncompletion rates.
- **Statistics:** cluster bootstrap by *source subject*, not by individual images. Do not treat multiple images of one salon model as independent persons. Report confidence intervals and exploratory-vs-confirmatory distinctions.
- **Android:** record three hardware performance tiers where available, actual Chrome version, cold/warm inference, memory peaks if instrumentable, heat/battery, model cache integrity and network-disabled restart.
- **Ablations:** face guard, hair geometry, bald-conversion stage, reference conditioning, model quantization; evaluate on frozen pairs.

## 6. Threats to validity (current)

Small, visually similar catalog photographs; probable shared model identity; selection and image reuse bias; reliance on machine-selected masks; non-human evaluation of photorealism; cross-device generalization unknown; potential checkpoint rights limitations; no matched source/reference hair-transfer outputs; no hardware-independent latency estimate. All limit generalizability.

## 7. Scientific contribution status

| Proposed contribution | Evidence | Claim |
|---|---|---|
| Fully local, two-model pipeline | Repeated CI browser tests | Functional prototype on Linux Chromium |
| Network-disabled reopen + inference | Playwright tested | Demonstrated in tested browser |
| Face-preserving mask composition | Pixel equality checks | Preservation outside selected mask |
| Natural hair/scalp restoration | Visually fails on current examples | **Not demonstrated** |
| Actual hairstyle transfer | No model | **Not demonstrated** |
| Phone hardware benchmark | No Android measurements | **Not demonstrated** |
| New lightweight network / SOTA | Not trained | **Not demonstrated** |

## 8. Reproducibility appendix (in progress)

Repository branch: `research/offline-generative-feasibility-2026-10-21` (will be frozen by commit hash and release tag).  
Run: `npm install && npm run build && npm run test:unit && npm run build:migan`.  
CI: `.github/workflows/offline-ai-research-verify.yml`.  
Prospective protocol: `research/paper/protocol-v1.json`.  
Metadata-only evidence: `research/results/offhair-ci-smoke-evidence.json` from GitHub Actions.  
Auditor: `npm run research:validate && npm run research:summary`.  
Full real browser tests require installed Playwright/Chromium.

## References to resolve before submission

- MI-GAN: *A Simple and Efficient Approach to Mobile Image Inpainting*. ICCV 2023.
- HairFastGAN: *Realistic and Robust Hair Transfer with a Fast Encoder-Based Approach*. NeurIPS 2024.
- Stable-Hair: AAAI 2025 (verify full bibliographic author list).
- H-Adapter: ECCV 2026 (verify final proceedings citation).
- HairPort: ACM SIGGRAPH 2026 (verify DOI/proceedings citation).
- AnyBald: WACV 2026 (verify final proceedings citation).
- CVPR 2026 Author Guidelines: ethics, code and compute reporting.
- ACM artifact review guidelines: functionality, availability and reproducibility.

**Do not submit before citations, full methods, real independent evaluation and statistical evidence are completed.**
