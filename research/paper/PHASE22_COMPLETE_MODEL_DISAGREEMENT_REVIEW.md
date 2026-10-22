# OffHair Phase 22 — complete, paginated dual-pretrained-model disagreement review

**Date:** 2026-10-22  
**Study classification:** exploratory engineering smoke test; not human-annotated ground truth, not a model-accuracy, identity, or hairstyle-fidelity experiment.  
**Verified GitHub CI:** https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39725691013

## Rationale
The Phase 21 licensed model integration compared existing MediaPipe HairSegmenter with Apache-2.0 Google Selfie Multiclass Segmenter on five bundled catalog images. Cross-model hair IoU was 0.91–0.97 but was NOT actual segmentation accuracy. Region-based review triage was introduced to ask annotators to inspect disagreements, prioritizing pixels that one detector calls hair and the other calls face skin.

An initial 20-region-only list omitted **30 regions containing face-skin conflicts** (23 on style 3, 7 on style 6), despite correctly recording those omissions. A review system that silently discards those regions would undermine annotation completeness.

## Engineering changes
- `public/ai/offhair-review-regions.mjs`: deterministic bounded 4- or 8-connected components across original-only hair, multiclass-only hair and original-hair-versus-face-skin labels. Ranked first by presence/amount of face-skin conflict, then pixel area and stable location.
- Supports `pageIndex` with `maxRegions` (maximum 200) and `nextPageIndex`, `totalPages`, prior/subsequent critical counts. All face-skin conflict components remain eligible regardless of `minPixels`.
- Every output sets `editingAllowed:false` and `groundTruthAvailable:false`. Severe fragmentation, malformed input and out-of-range pages fail closed.
- `scripts/offhair-review-regions-regression.mjs`: deterministic ordering, no duplicate regions, absent-label behavior, critical coverage, 4/8 connectivity, truncation reporting and pagination tests.
- `scripts/real-offhair-difference-mask-smoke.mjs`: real, local MediaPipe inference; dual-model disagreement components, complete critical-region pagination and exact equality after network-disabled browser reload.
- All study images are bundled catalog samples for engineering. The report logs derived metadata and bounded boxes, **not customer-submitted portraits**.

## Measured results (five non-independent demonstration portraits)
| Catalog style | All disagreement components | Components containing face-skin conflict | First-page critical omissions before pagination | Pages necessary to enumerate eligible regions (`minPixels=8`) |
|---|---:|---:|---:|---:|
| 1 | 88 | 8 | 0 | 2 |
| 2 | 117 | 10 | 0 | 2 |
| 3 | 259 | 43 | 23 | 6 |
| 6 | 254 | 27 | 7 | 3 |
| 9 | 184 | 8 | 0 | 4 |
| **Total** | **902** | **96** | **30** | **17** |

**Verification:** All 96 critical components were accessible across the deterministic pages with no repeated component ID. 17 pages in total were traversed across the five examples, including offline reload. Confirmed no photo editing was permitted.

**Important denominator:** With `minPixels=8`, only 286 components (including every critical component) were eligible for the paginated default review queue. The other **616** are smaller, noncritical components explicitly omitted by this screening rule. For an exhaustive scientific annotation protocol, use `minPixels=1` and record all review decisions and timing. The current system merely establishes accessibility, not completed independent labels.

## Limitations and falsification conditions
1. "Critical" means **model prediction conflict**, NOT known real facial anatomy or a ground-truth model error. Two pretrained systems can fail together.
2. A high hair-model IoU does NOT certify accurate head segmentation or customer-safe edits.
3. The components are at the segmentation output resolution (512×512 in observed browser tests); bounding boxes and areas are not real head geometry.
4. The ranking heuristic is not a newly trained network and adds no photorealistic hair synthesis. It is administrative research tooling.
5. Region paging currently recomputes deterministic components per request. For actual midrange Android annotation UX, benchmark speed/memory and add per-session caching if necessary.
6. This screening study cannot show labeling productivity gains until independent, consenting human annotators are randomly assigned to baseline/randomized versus prioritized review, with subject-disjoint images and time/effort measured.
7. Real portrait data, biometric derivatives and bounding boxes require documented rights, retention controls, and where applicable privacy/ethics review. No public data release without separate permission.

## Next prospective experiment
Recruit a rights-cleared exploratory cohort, train annotators on hair/skin/bangs/occlusion criteria, and collect two independent person-level annotations with adjudication. Randomize study pairs to (A) uniform grid, (B) unguided segmentation display, and (C) model-disagreement triage. Measure minutes per image, independently adjudicated missed-error rate, severe protected-face-miss rate, coverage, rater agreement and stratification by hair length/texture/pose. Predefine a primary endpoint and perform a power analysis before any confirmatory claims.

**Decision:** GO for using Apache-2.0 pretrained segmentation as an optional, fully offline, review-assistance module. **NO-GO** for promoting it to automatic hairstyle transfer or asserting it improves perceptual quality before actual annotated evaluation and physical Android benchmarking.
