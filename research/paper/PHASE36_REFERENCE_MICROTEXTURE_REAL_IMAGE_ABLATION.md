# Phase 36 — reference-detail hairline ablation, not a generative hairstyle

**Date:** 2026-10-22
**Branch:** `research/offline-generative-feasibility-2026-10-21`
**Production:** unchanged
**Scientific result:** reference microtexture can be adjusted locally, but realism and actual new-strand generation remain **unverified**.

## Why we tried this

The previous Phase 35 test demonstrated a straight-looking **53-pixel**
cutout along the forehead in the real 512×512 catalog study. The bounded
Phase 32 matte retained **98.84%** of donor opacity and avoided newly
uncovered areas, but it cannot add the missing fine wisps or accurate
scalp shading. Foreground color estimation and trimap-based alpha
matting are separate image-matting problems: a blurred existing cutout
is not proof of correct hair extraction or donor foreground color.

Background reference: https://pymatting.github.io/
(the library illustrates how naive alpha compositing produces color
bleeding/halos and why foreground estimation is distinct from matting).
No PyMatting code, licensed photos or remote API have been imported.

## Implementation

`public/ai/migan/hairline-microtexture-research.mjs` computes only a
**bounded 3x3 high-pass residual in the ORIGINAL donated hairstyle's
already composited pixels**. It applies at most nine RGB-channel units
per channel around the lower edge of the original supported donor
region near the source person's upper forehead.

It cannot alter opacity or donor geometry, introduce new support, edit
predicted face skin or landmark-protected regions, modify the portrait
outside the existing hair support, or make a newly fabricated strand.

The input is the original protected rigid transfer and the Phase 32
protected feathered image. No extra network request, pretrained model,
photo upload or expensive GPU process occurs. It is a **color/texture
ablation**, not a licensed generative hairline reconstruction method.

The Persian research studio includes a separate `#hairTexture`
opt-in control, non-exportable preview canvas
`#hairTexturePortrait` and anonymous measurements only.
The existing `auditHairEdgeRetention()` verifies opacity preservation,
scalp-exposure thresholds and local texture gradient proxy again on
the new result. A normal reference/user permission withdrawal destroys
the derived in-memory preview.

A first integrated browser run found a real UI regression: resetting
review state during the microtexture experiment disabled the prior
randomized A/B review control. This was fixed in the same research
branch. The unit suite's initially failing adversarial test also used
an invalid 256 assignment to `Uint8Array`, which wraps to zero rather
than exceeding the 255 maximum; that test was replaced by a genuine
opacity increase within byte range.

`scripts/phase36-hairline-microtexture-regression.mjs` tests
determinism, no fabricated detail from a flat donor, bounded RGB
adjustment, protected facial skin, no background or alpha changes,
bad masks and unreasonable face geometry.

`scripts/real-hair-removal-studio-smoke.mjs` tests the genuine
MediaPipe+MI-GAN+reference-transfer chain with the new variant,
uploaded on-device hairstyle reference, A/B review restoration,
source/reference consent withdrawal and full network-disabled repeat.

## Grounded real-image measurement

The GitHub Actions browser run for code commit
`b500332d7dbcefe9ea1dc7d13f9ffde08a438158` emitted:

- **565** original donor-boundary pixels inspected near the forehead
- **77** local pixel RGB adjustments
- donor-opacity mass retained **0.988381467** (98.84%; unchanged
  from guarded Phase 32 matte)
- erased-source-hair newly uncovered: **0**
- local RGB-neighbor gradient ratio
  **1.1259728** (guarded feather) to **1.1271051**
  (new detail variant): only **+0.0011324** absolute
- after offline reload, identical changed-pixel counts and risk metrics
- review face labels remain protected and no export becomes available
- `qualityHumanVerified:false` and `commercialExport:false`

Run: https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39814082407

**Interpretation:** The effect is small. No demonstrable improvement
in perceived hairstyle realism has been obtained; a tiny increase in
gradient contrast may even accentuate artifacts. The previous Phase 34
suspicious forehead hairline is **not repaired** by this treatment.

This experiment should NOT be promoted as an automatic best choice or
commercial salon feature. The most valuable next research remains a
rights-cleared, compact, offline-capable actual hairstyle generator,
followed by independent two-person portrait review and Android device
tests. A 2D inside-mask texture adjustment can neither fill missing
hair beyond protected skin nor reconstruct scalp geometry.
