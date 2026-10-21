# OffHair Phase 18 — identity-disjoint, rights-gated study registry

**Status: implementation and adversarial validation, not data collection.**  
Date: 2026-10-21. No subject has been recruited; no real portrait was consent-cleared in this phase; no independent annotations or ground-truth photo labels were obtained; no trained generator exists.

## Why this phase is necessary
The Phase 16 six-pair study came from five salon catalog portraits that are useful as engineering fixtures but **not an authorized scientific training or held-out dataset**. The Phase 17 mask annotator generates candidate labels and agreement summaries but cannot verify consent, ownership, independent human raters or split integrity.

A particular risk in *reference-guided* editing is leakage of one person's identity through the **reference hairstyle** even if the person's portrait is never used as a source in the other split. Reused image SHA-256 under a changed subject pseudonym is another leak. Scientific outcomes must not be counted as independent when one individual appears in multiple folds.

## Files
- `public/ai/offhair-study-manifest.mjs`: metadata-only study registry validator and source-annotation linkage. Keeps all model training rights explicitly false. Validates unique sample IDs, uniqueness of ordered photo pairs, individual pseudonymous identity consistency across both source and reference roles, and identity-disjoint *pilot/train/validation/test* partitions. Subjects marked `withdrawn` remain sealed from reuse. Checks that one exact photo SHA-256 never maps to two different study subjects.
- `scripts/offhair-study-manifest-regression.mjs`: synthetic adversarial examples of source/reference role swapping, different identities sharing a photo, duplicate pairs, withdrawn identities, invalid approval flags and annotation consent-receipt mismatches.
- `scripts/offhair-study-audit.mjs`: command-line metadata-only audit. It emits JSON and a nonzero exit code on mechanical errors; it cannot produce proof of informed consent, authenticity or legal authorization.
- `scripts/offhair-annotation-agreement.mjs` (Phase 17): independently compares two annotations for *the same exact normalized image hash*, refuses duplicate annotators and reports IoU/Dice/uncertainty. Agreement is not ground-truth adjudication.

## Manifest schema
Root fields:
`schema:'OFFHAIR-STUDY-MANIFEST-v1',version:1,studyId,status:'draft_unverified',includes_images:false,permissionChecksComplete:false,trainingAuthorized:false,records:[]`.
Each record requires:
`sampleId,sourceSubjectId,referenceSubjectId,sourceSha256,referenceSha256,sourceConsentReceiptId,referenceConsentReceiptId,sourceRightsReceiptId,referenceRightsReceiptId,split,status,labelingStatus`.

Allowed `split`: `pilot|train|validation|test`.  
Allowed `status`: `active|quarantined|withdrawn`.  
Required `labelingStatus`: `not_adjudicated`.

All pseudonymous IDs are 3–100 characters of ASCII letters, numbers, underscores or hyphens. Photo SHA-256 hashes are 64 hexadecimal characters, **not** proof of anonymization. Model/portrait likeness can remain personal data. Records must not contain raw image pixels, base64 data or identifying contact details. Keep consent/rights receipt files in a separate, access-controlled, minimal-retention registry, with withdrawal tracking.

**Important:** This manifest deliberately does not support a `trainingAuthorized:true` override. Independent compliance review and a separate, auditable authorization workflow are prerequisites to designing that feature. A clean manifest is only **mechanically valid**.

## Audit commands
```bash
npm run test:unit
node scripts/offhair-study-audit.mjs /path/to/study-manifest.json
node scripts/offhair-study-audit.mjs /path/to/study-manifest.json /path/to/annotation-a.json
node scripts/offhair-annotation-agreement.mjs /path/to/annotation-a.json /path/to/annotation-b.json
```
There is **no actual study-manifest.json containing real people** in this repository.

## Required next human and institutional steps
1. Secure documented consent for portrait research, synthetic hairstyle transformation, annotated derivative data, possible commercial reuse/model training, and retention/withdrawal; obtain permissions separately for reference-photo subjects.
2. Verify image copyright/licensing and any synthetic-image provider/teacher checkpoint terms; record receipts. A subject's consent alone does not automatically resolve photographer copyright.
3. Obtain institutional privacy/ethics guidance for the relevant jurisdiction before recruiting, processing or retaining identifiable portraits or biometric-derived data.
4. Register subjects and original/reference image hashes in restricted storage, checking same-person duplicates and identity-level partitions. Define an explicit reproducible near-duplicate detection and adjudication policy; hashing alone does **not** catch crops or altered photos.
5. Collect independent annotations with a documented rubric. Adjudicate disagreement while preserving both original candidates. Precommit a held-out test set and data-freeze checksum before fitting a trainable model.
6. Make a training-go decision **only after** data rights, consent, identity splits, reference-image lineage and withdrawal handling receive actual sign-off. No tool herein grants that sign-off.

## Scientific outcome and limitations
This is a reproducible governance/measurement improvement to the experimental pipeline, **not an AI method innovation** and not independent scientific evidence of realistic bald conversion or on-device hair generation. Training/data collection **NO-GO** until independently reviewed participant and media permissions exist. Full automated tests cannot establish any real person's right to appear in a study.
