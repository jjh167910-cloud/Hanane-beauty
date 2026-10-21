# OffHair Phase 17 — rights-aware ground-truth annotation and evaluation

Date: 2026-10-21. **Implementation and test framework only**; no new research cohort, no verified consented portrait dataset, no independent annotator ratings, no trained generator.

## Research purpose
In the exploratory six-pair pilot, replacing a broad face ellipse with finer features + an unresolved forehead region changed provisional topology acceptance from 1/6 to 6/6. This was **not** demonstrated safety: three cases still had elevated immutable-feature conflicts and every case required review. The decisive falsification experiment requires ground-truth anatomical/occlusion labels from actual consented people.

## Research infrastructure delivered
- `public/ai/offhair-annotation-core.mjs`: five independent bitplanes (immutable protected face core, possible occludable forehead, target hair support, scalp-background reconstruction, uncertain). Compact, reversible RLE. Preserves overlapping labels; validates each versioned record, image hash, pseudonymous subject and annotator IDs, consent/rights receipt references, split, UTC time, bitplanes and coverage.
- `public/research/offhair-annotator.html`: stand-alone English mobile/desktop browser annotation UI, no server portrait upload. Local image chooser, *explicit demo-only* salon samples, touch/mouse brush, undo, per-layer painting, unverified rights acknowledgements, and downloadable JSON containing metadata + labels **but never portrait pixels**.
- `scripts/offhair-annotation-regression.mjs`: source-independent unit tests for RLE, invalid/malicious payload rejection, missing receipt references, completeness and pixel safety.
- `scripts/real-offhair-annotator-smoke.mjs`: Playwright Chromium test using bundled catalog demonstration image, checking actual brush strokes, JSON download, round-trip decode, privacy flags, detection of deliberately introduced protected-core edit and airplane-mode reload.
- CI workflow executes both new suites. Android-specific hardware and latency must still be tested on the physical device.

## Important labels
1. **Protected face core**: pixels of eyes, nose, mouth and essential facial anatomy as defined by annotation protocol, not automatically inferred from a detector.
2. **Occludable forehead**: a candidate skin region that could be covered by a target fringe. Does **not** authorize the image generator to alter anatomy.
3. **Target hair**: target hairstyle region in the source coordinate frame. Requires an independently defined intended/ground-truth target, not a guessed eye-scale reference transform.
4. **Scalp reconstruction**: area where original hair removal exposes skin/head/background that must be plausibly synthesized. Ground truth requires appropriately licensed paired or verified reference.
5. **Uncertain**: annotator cannot reliably label a pixel; evaluation excludes that pixel and reports exclusions.

These are **overlapping binary layers**, not mutually exclusive segmentation classes. A target-hair pixel can coincide with forehead potential occlusion. A protected-core vs target-hair overlap flags a safety concern and must not automatically be considered an approved edit.

## Export contract and privacy
All mask exports have `schema:OFFHAIR-MASK-ANNOTATION-v1`, source image-render SHA-256 (of the 512×512 normalized browser canvas, not necessarily the original JPEG file byte hash), subject/annotator IDs, receipt ID references, split, UTC timestamp, RLE labels and coverage. Only local browser downloads; no portrait pixel payload or connected database mutation. A SHA256 digest and mask silhouette can still be sensitive personal data and are not automatic anonymization. Use secure storage and minimum retention, delete on withdrawal, institutional ethics/privacy review where applicable. Test exports state:
`includes_images:false`, `external_rights_verified:false`, `usable_for_training:false`, `provenance_status:self_reported_pending_independent_review`.
These flags **cannot be promoted automatically**. A separate restricted registry and authorized human review are necessary. Demo catalog images do not imply dataset rights.

## Metrics
Mask-layer IoU, recall and precision on evaluable, non-uncertain pixels, with null rather than 100% for absent-positive classes. Critical metric: the number and rate of *ground-truth protected-core pixels predicted editable as target hair, forehead or scalp*. Original face preservation in the existing compositor does not prove the proposed learned generator would preserve face identity. Results must be aggregated by identity, not treating every pixel as an independent subject.

## Dataset and power requirements
- Obtain documented portrait/model releases and rights to annotated training/derivative generation, reviewed before research.
- At least two truly independent labelers per held-out case and adjudication protocol; report inter-rater agreement and excluded/ambiguous masks.
- Split by person; never split image variants or pairs of the same identity across train/test.
- Freeze the evaluation plan and primary metric before confirmatory results; pilot sample-size numbers are planning values, not a power analysis.
- Include hair texture, length, glasses, headwear/hijab where permissioned, occlusion and yaw; protect identity, prevent demographic inference and avoid using sensitive attributes without explicit justification and governance.

## Go / no-go decision
**Go**: independently annotated rights-cleared cases, verifiable mask data, compared source/reference geometry predictors, and accountable core-feature violation metrics.
**No-go**: real-person training, exporting training-ready datasets, or claims of scientifically validated safety until actual independent annotations and rights clearance. The browser tool makes labeling *possible*, not *completed*.

## Reproduction
`npm run build && npm run test:unit`; GitHub research CI browser acceptance produces a demonstration-only screenshot and a metadata evidence JSON. It does not perform training or evaluate real human-labeled ground truth.
