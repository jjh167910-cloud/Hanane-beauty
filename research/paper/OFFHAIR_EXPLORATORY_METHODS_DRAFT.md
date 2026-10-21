# OffHair manuscript methods — reproducible exploratory pilot (draft, 2026-10-21)

**NOT A SUBMISSION-READY MANUSCRIPT.** This text reports only executed pilot experiments and prospective design. Placeholder sections must be completed with independently verified measurements, consented participants and correctly licensed reference models before journal/conference submission.

## 1. Research aim
The study investigates whether geometry-conditioned, identity-preserving hair-region editing can perform faithful hairstyle transfer while meeting strict privacy and resource constraints for fully offline Android web applications. The current engineering pilots address hair-mask decomposition and face-occlusion safety only; the proposed reference-conditioned generative neural model has **not** been trained or tested.

## 2. Existing implementation and reproducibility
The research branch is `research/offline-generative-feasibility-2026-10-21` of `jjh167910-cloud/Hanane-beauty`. A locally served, service-worker-cached Chromium application uses two real inference components:
(i) MediaPipe image segmentation + face keypoint detection with locally bundled model/WASM assets; and
(ii) a research-only MI-GAN 512 ONNX inpainting checkpoint executed with ONNX Runtime Web WASM.
No external inference endpoint was used in the CI browser tests. Model checksum verification and simulated airplane-mode reload were checked in separate workflows. Performance results belong to GitHub-hosted Linux Chromium and must **not** be extrapolated to physical Android.

Prior qualitative examination of MI-GAN outputs from four bundled portrait examples found cap-like or unnaturally reconstructed scalp/hairline artifacts. These examples are not an independently sampled or statistically sufficient quality evaluation.

## 3. Exploratory hair-topology experiment
Two binary confidence masks are independently extracted from source/reference portraits. The reference mask is mapped into source coordinates using either eye-anchor translation + horizontal eye-span ratio or a roll-compensated 2D similarity transform. The scalp/hair region is partitioned into source-only (remove), reference-only (add), overlap (reshape) and neither (preserve). This partition is a descriptive image-space operation; its editable area fraction does **not** establish actual neural inference FLOP, latency or memory savings.

Five bundled catalog portraits supplied six selected directional source/reference pairings, none randomly sampled from a rights-cleared study cohort. In the initial two-eye pilot, the large elliptical protected-face mask admitted only 1 of 6 pairings under the provisional conflict threshold, and adding roll compensation did not change acceptance.

## 4. Provisional anatomical protection ablation
Using additional available face landmarks, the coarse protected ellipse was replaced with a provisional protected feature-core mask plus a separate *unresolved* forehead region, where target bangs might legitimately cover skin.
This changed preliminary geometry-gate acceptance from 1/6 to 6/6 on the same selected pairs. **All six still required review; no case was approved for automatic facial editing.** Three pairs exceeded an exploratory 5% residual core-conflict-risk indicator. This criterion was chosen after examining pilot results; it is not an externally validated safety threshold.

Changing a mask definition is insufficient to demonstrate improved geometry estimation or editing safety. These six pairs are correlated observations with no annotated ground truth and no blinded assessor. No confidence intervals or significance test are reported for these exploratory counts.

## 5. Proposed, currently unexecuted confirmatory dataset study
Recruit or license a research dataset with documentation covering both source and reference portrait subjects, derivative synthesis, research and commercial model training rights where applicable. Store a separate access-controlled rights/consent receipt registry and observe withdrawal requirements. Freeze partitions at the physical-person level, including subjects appearing in either source or reference roles.

For each test case, obtain at least two genuinely independent annotations for protected facial features, forehead occlusion candidates, source hair, target hair support and scalp reconstruction regions; require adjudication and track uncertainty. The Phase 17 annotation app and Phase 18 registry are tools for these tasks, **not evidence that participants or annotators have been recruited**.

Prospective mask metrics include class-wise IoU/Dice, boundary errors, uncertainty/exclusion rates and false editable labels on immutable facial-core pixels. Do not treat pixels as independent study subjects. Document physical Android/browser platform, peak memory, offline cache recovery, failure cases and inference energy/latency when and only when measured.

The original protocol mentions pilot planning targets of 30 subjects and a confirmatory target of 120 subjects. These are **not** justified sample sizes until a power/precision analysis using pilot variability and rater disagreement is completed.

## 6. Prospective generative model and ablations — no measured results
The scientific hypothesis is that a compact, learned target-hair-support estimator with explicit protected facial core and occlusion uncertainty may improve the quality-versus-compute trade-off of conditional hair synthesis compared with a bald-first full-region pipeline. Competing systems must be implemented and executed under matched data, pose, image resolution and measured resource budgets. Ablations should include no 3D/head support, no forehead handling, no face-protection loss, no reference conditioning, two-stage bald-first, and quantized/unquantized inference.

At present, **no trained student model, no photorealistic reference transfer, no genuine Android performance benchmark, no human preference sample, no independent dataset rights clearance** have been produced.

## 7. Threats to validity
- **Sampling:** selected 5 catalog portraits / 6 directionally correlated pairs, not representative held-out identities.
- **Ground truth:** hair confidence maps and detected keypoints are themselves fallible model outputs, not annotated ground truth.
- **Instrument choice:** broad ellipse vs feature core encode different definitions of protected pixels, confounding acceptance improvements with rule changes.
- **Uncertainty:** forehead region is only a potential occlusion location, not a physically valid target hairstyle.
- **Commercial data provenance:** existing catalog portraits and MI-GAN lineage are not certified for new commercial model training.
- **Platform:** GitHub Linux browser CI cannot reproduce thermal, storage, WebGPU availability or memory limits of Galaxy A55 Android Chrome.
- **Algorithmic novelty:** masking set operations and detector keypoints are established concepts; genuine novelty remains an untested learned-model and deployment hypothesis.

## 8. Audit trail
- Actual inference and offline reload: `research/PHASE13_VISUAL_QUALITY_NO_GO.md`.
- Two-eye topology pilot and roll ablation: `research/paper/PHASE15_DIFFERENCE_MASK_PILOT_AND_ROLL_ABLATION.md`.
- Face-core/forehead pilot: `research/paper/PHASE16_FACE_CORE_VS_FOREHEAD_PILOT.md`.
- Research annotation format and ethics: `research/paper/PHASE17_GROUND_TRUTH_ANNOTATION_PROTOCOL.md`.
- Identity-disjoint prospective registry: `research/paper/PHASE18_RIGHTS_AND_IDENTITY_SPLIT_REGISTRY.md`.
- Verified Phase 18 automated CI: https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39646620339.

## 9. Readiness judgement
The current material supports an **honest methodological feasibility report and preregistration preparation**, not a peer-reviewed claim of state-of-the-art photorealistic hairstyle transfer. Next decisive gate: rights-cleared, independently labeled and frozen subject-disjoint test cases, then an independently trained head-aware target-support predictor benchmarked against current face-mask heuristics. A new generative method should proceed only if this evaluation gives credible support for the modeling hypothesis.
