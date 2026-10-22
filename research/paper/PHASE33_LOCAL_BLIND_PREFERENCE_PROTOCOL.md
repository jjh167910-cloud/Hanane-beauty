# Phase 33 — no-photo local paired visual-review workflow

**Date:** 2026-10-22
**Branch:** `research/offline-generative-feasibility-2026-10-21`
**Production:** `main` unchanged
**Release decision:** **NO-GO** for photorealistic/commercial transfer.

## Why a visual review is the next scientific gate

The Phase 32 protected edge-matting technique passed computational invariants,
but a lower RGB seam proxy and retained opacity do **not** establish a natural
hairline or convincing scalp and strand texture. The Phase 26 archived preview
still shows a near-straight, unnatural cutout on the forehead and a flat
scalp/hair-cap effect. Real visual assessment must include independent
hairline realism, source-face identity, style fidelity and overall plausibility.

## Existing infrastructure reused

`scripts/offhair-paired-preference.mjs` ALREADY provides a deterministic
subject-level clustered paired-vote analyzer with bootstrap confidence
intervals and a data format with four questions: `overall`,
`scalp_realism`, `identity`, `hairstyle_fidelity`.
It appropriately returns `is_verified_human_study:false` and
`is_publication_ready:false` because JSON cannot certify real raters.

Phase 33 adds a **local collection interface**, not another invented score:

- `public/ai/migan/blind-human-review.mjs` creates one ephemeral study
  trial and hides the candidate's randomly assigned A/B position from
  the onscreen controls while review questions are answered.
  Votes must be explicitly selected for all four topics; tie and
  cannot-judge are first-class choices.
- `public/ai/migan/hair-removal-studio.html` adds an A/B section
  after the rigid-transfer and guarded-edge previews exist.
  It copies both canvas images directly in memory and labels
  **only** 'A' and 'B'. The reviewer sees no method label next
  to these two panels. A dedicated focus mode hides all method-labeled
  sections outside the review during voting, while displaying the
  original source portrait and hairstyle reference as context.
  Exiting focus mode can reveal the methods. Any previously seen
  method labels mean the same viewer has **not** been independently blinded.
- The image pixels stay in the existing memory-only page. No JPEG,
  screenshots, face landmarks, file names, session photos,
  precise device models or actual source-photo SHA256s are exported.
- A completed review can download a local `JSON` containing
  four explicit manual votes in the existing
  `analyzeBlindedPairs()` compatible schema. `source_sha256` and
  `reference_sha256` fields are filled with **random 256-bit
  temporary tokens** for backward-compatible schema, not digests
  computed from private photographs. The JSON explicitly says so.
- Both user approval withdrawal and reference-file permission
  withdrawal destroy the page's review state and disable export.
  A new hair preview also resets the previous review. No
  persistence, cloud storage, analytics, background review or
  default auto-voting occurs.

## Research limitations

This interface collects votes but **does not imply that any real
human has rated the output yet**. CI browser automation clicks
`cannot_judge` for all topics only to test the form and JSON
download; those dummy clicks are NOT participants and must NEVER be
counted as human evaluations.

One local browser session cannot independently verify subject identities,
licensing, portrait consent, rater blindness, unique rater IDs or
reviewer demographics. Before making claims on the salon application,
collect explicit rights-cleared and independently identified source/reference
pairs; assign separate independent reviewers who have **not** seen the
method-labeled panels; store enough auditable review documentation
outside personally identifying public repos; and report all failures
and abstentions. Never put the faces, labels, customer files or photo
hashes into GitHub Actions.

Any study based on repeated catalogue photographs of one model counts
as **one unverified subject**, not many independent identities.

## How to use when independently consented pairs become available

1. Open `/ai/migan/hair-removal-studio.html` from a research build
   and load the source portrait and independently licensed reference
   image into the memory-only app. Prepare offline model assets once.
2. Run local MediaPipe source masks, check the face/skin removal
   guard, explicitly consent and run MI-GAN. Make the rigid hairstyle
   preview and protected edge comparison. Do NOT download a
   customer-approved hairstyle from this study.
3. In the A/B section choose `شروع مقایسهٔ تصادفی`.
   Ideally let a reviewer who has NOT inspected the above labeled
   panels see only the A/B review section.
4. Have that person answer all four topics, including 'cannot judge'
   if an artifact makes the pair unassessable. Export metadata
   **only** after their independent explicit interactions.
5. To inspect a legitimate user's metadata JSON, run:
   `node scripts/offhair-paired-preference.mjs /path/to/review.json`.
   A one-person or catalog-only trial is descriptive and **not**
   proof of independently validated consumer quality.

## Implementation verification

`scripts/phase33-blind-review-regression.mjs` includes:
randomized A/B assignment, no auto votes, tie/abstention preservation,
existing analyzer compatibility, invalid inputs, no photo fingerprints
and revocation handling.

`scripts/real-hair-removal-studio-smoke.mjs` adds:
real-browser A/B panel display after genuine MediaPipe/MI-GAN,
four **synthetic abstentions** only, metadata-only local download,
no raw photo/data-URL leakage, review cancellation on consent
revocation, and airplane-mode offline UI availability.

All verifications must PASS on the exact reviewed commit before
claiming the engineering workflow passes. Even successful CI is
NOT a verified human study. No commercial production merge.
