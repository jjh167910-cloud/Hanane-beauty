# OffHair — evidence-based novelty and baseline matrix (2026-10-21)

**Literature-scan scope:** selected leading sources only, not a systematic review; this document does not claim a novel scientific contribution has been proved.

| Work | Publication | Scope already addressed | What OffHair must NOT claim as original | Baseline practicality | Licensing / access caution |
|---|---|---|---|---|---|
| HairFastGAN (Nikolaev et al.) | NeurIPS 2024 | Fast pose/shape/color hairstyle transfer using StyleGAN representation and encoders, <1s on NVIDIA V100 (authors' hardware) | "First fast hair transfer" or "first pose handling" | Available research implementation requires Linux CUDA; benchmark desktop reference where environment reproducible | Repo and pretrained dependency licenses must be audited separately |
| Stable-Hair (Zhang et al.) | AAAI 2025 | Bald converter followed by Hair Extractor, Latent IdentityNet, and ControlNet-style conditioning | "First two-stage bald+hair synthesis" | Available source; models GPU-heavy and aligned training bias | Apache code repo does not automatically license all training data/checkpoints |
| AnyBald (Choi et al.) | WACV 2026 | Realistic diffusion-based bald conversion with implicit localization and hair-specific attention objective | "First realistic bald converter" | Paper is public; separately establish current weights, runnable code and terms | No assumptions that published paper confers checkpoint rights |
| H-Adapter (Jeong et al.) | ECCV 2026 preprint | Source-aligned hair edit masks inferred from attention and pose-robust conditioning | "First pose-robust guided mask" | Checkpoint and code availability must be verified before baseline claims | Paper disclosure does not authorize trained checkpoint |
| HairPort (Heidari et al.) | SIGGRAPH 2026 | 3D-aware hair import, bald conversion, head pose/scale alignment, identity-aware synthesis | "First 3D-aware transfer" | ≥24 GB CUDA VRAM recommended and multiple external components | Project CC BY-NC-ND 4.0, external model terms vary, no commercial transplant |

## Positioning constraints
**Core novelty hypothesis:** An *independently trained, commercially well-provenanced, reference-conditioned mobile-web student model* may deliver a new quality/identity/offline-memory Pareto frontier. This must be measured against true executed baselines and not merely asserted.

**Systems-paper alternative:** A reproducible benchmark of failure modes, offline storage/COOP/COEP constraints, inference-engine compatibility and measured hardware-quality tradeoffs. A catalog app and CPU WASM inference are engineering achievements but alone are insufficient paper novelty.

## Baseline-evaluation protocol
1. Freeze the evaluation subject identities, pose/difficulty strata, reference photos and model checkpoint SHA. Keep real-identifiable images out of CI artifacts; only pseudonymous metadata and authorization receipts.
2. Run each available permitted method on exactly the same source/reference pairing, crop geometry and image budget (or explicitly report unavoidable incompatibilities).
3. Report model version and license provenance; never infer commercial viability from a repository root LICENSE alone.
4. Separate **technical success** (inference completed offline) from **photographic acceptance** (blinded preference + boundary artifact inspection) and **product acceptance** (physical Android device limits and consent).
5. Group confidence intervals by source identity, not by image or rater. Include mask rejections and crashes in the system success denominator. Identify human rating power analysis before collecting confirmatory data.
6. Pre-register primary comparison/endpoint before confirmatory data. Track exclusions and multiple-comparison adjustments.

## Sources
- HairFastGAN: https://proceedings.neurips.cc/paper_files/paper/2024/hash/50f1dd93c57ba57fe246fba9e64f5b20-Abstract-Conference.html
- Stable-Hair: https://ojs.aaai.org/index.php/AAAI/article/view/33123
- AnyBald: https://openaccess.thecvf.com/content/WACV2026/html/Choi_AnyBald_Toward_Realistic_Diffusion-Based_Hair_Removal_In-The-Wild_WACV_2026_paper.html
- H-Adapter: https://arxiv.org/abs/2606.25578
- HairPort: https://github.com/deepmancer/HairPort
- CVPR 2027 calls for original work and specifies a November 16 2026 submission deadline: https://cvpr.thecvf.com/Conferences/2027/CallForPapers

**Evidence dated 2026-10-21.** Research matrix should be revisited before manuscript submission.
