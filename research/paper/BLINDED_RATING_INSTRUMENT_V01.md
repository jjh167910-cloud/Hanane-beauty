# OffHair blinded preference study: evaluation instrument v0.1
Draft 2026-10-21. **Protocol only. No human participants recruited and no ratings collected.**

## Primary hypothesis and endpoint
For fixed source identities and reference hairstyles, do raters prefer the new *student* to the **MI-GAN + same-mask baseline** on **overall photographic plausibility**? The blind display maps candidate to randomized screen A/B position, recorded in confidential metadata. MI-GAN has no hairstyle-transfer capability; restrict the first experiment to *bald/scalp conversion*, and do not call its results a reference-hairstyle comparison.

Primary question (bald conversion): **Which image has a more believable human scalp, head anatomy and natural boundary transition without obvious retouching artifacts?**

Secondary questions:
- Does the original person's face still appear natural and consistent (identity)?
- Are there distortions of forehead, ears, eyebrows, neck or hairline?
- Could you spot synthetic artifacts such as a painted scalp, a cap shape or seams?

**A separate later hair-transfer study** must ask: Which output more faithfully matches the provided hairstyle reference while preserving the source person's facial appearance?

## Rating screen instructions
- Display same source portrait and two edits at equal physical dimensions and matched resolution/crop; no method names.
- Present A and B with random side and reproducible randomized trials, balanced within subject.
- The participant may choose A, B, Tie, or Cannot judge.
- Include a short reason from a predefined, non-identifying defect taxonomy.
- Do not crop out failures or show solely cherry-picked successful images.
- Distinguish a model refusal/failure from a generated image. Failure remains in system success-rate denominator; don't silently substitute an output in a visual preference trial.
- Rater consent to the study is separate from image-subject consent and permission to synthesize variants.
- Run an accessibility check: contrast and sufficiently large mobile comparison images; raters should not see which model produced which.
- Screen should require no facial identity recognition or sensitive demographic inference.

## Failure taxonomy (annotator-facing)
- painted_scalp, helmet_or_cap, unnatural_hairline, exposed_old_hair, missing_ear,
  face_changed, pose_or_shape_error, lighting_mismatch, cutout_seam, blurred_boundary,
  hair_reference_mismatch, indistinguishable, other, unable_to_assess.
This taxonomy is for human observation, not auto-certified quality.

## Sampling and analysis
- The existing prospective protocol (research/paper/protocol-v1.json) proposes a **30-subject exploratory pilot** and a **120-subject confirmatory target**. These are provisional targets and **NOT** statistically powered sample sizes.
- Pilot: validate the rubric, within-subject correlation, failure prevalence, confidence intervals, and rater disagreement; then calculate confirmatory power before freezing the final study.
- Primary analysis: paired preference score (candidate=1, baseline=0, tie=0.5), averaged first within source identity, then across identities. Exclude 'Cannot judge' from preference numerator while reporting every exclusion; assess whether exclusion rates differ by method/condition.
- Subject-cluster bootstrap (2,000+ resamples), 95% intervals; sensitivity analysis for alternative weighting and adjudication.
- Choose one primary endpoint and comparison before confirmatory collection; declare secondary/exploratory comparisons and multiplicity plan.
- Record independent rater pseudonyms and timestamps; provide no identifying data in public artifacts.
- Blind allocation and all images/outputs should be preserved securely for reproducibility but never published without additional rights.
- Keep the counterbalanced presentation seed and assignment in a separate restricted registry to prevent model-unblinding.
- Rating logs must be authentic; never generate fake study votes or imply independent human raters existed.

## Machine-checkable data fields
A future JSON rating report for `node scripts/offhair-paired-preference.mjs` must include:
- `version:1`, `study_id`, `candidate_method`, `baseline_method`, `includes_images:false`
- `ratings` list, each with `subject_id`, `trial_id`, `rater_id`, `source_sha256`, `reference_sha256`, `candidate_side: A|B`, `vote: A|B|tie|cannot_judge`, `question: overall|scalp_realism|identity|hairstyle_fidelity`.
- The analysis script reports subject-cluster bootstrap confidence intervals and counts ties/abstentions, but does NOT verify authentic consent, rater independence, researcher blinding or perceptual validity.

## Qualification for scientific results
No significance or 'FaceApp-quality' claims from the current 5 catalog images. Advance only after real rights-cleared datasets, documented rater consent, licensed baselines, and independent review of the protocol.
