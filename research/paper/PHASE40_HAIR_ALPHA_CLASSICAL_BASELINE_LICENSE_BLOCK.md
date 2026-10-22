# Phase 40 — true fractional hair-alpha baseline without restricted pretrained weights

Date: 2026-10-22 · Research-only branch
`research/offline-generative-feasibility-2026-10-21`.
No commercial deployment or unverified generative claims.

## Critical checkpoint-rights discovery

`hustvl/vitmatte-small-composition-1k` is publicly labeled
`apache-2.0` at Hugging Face, but **the released weights were
trained on Adobe Composition-1k**, whose Deep Image Matting Dataset
License Agreement restricts commercial use. The authoritative
upstream ViTMatte training instructions explicitly prescribe
Adobe Image Matting Dataset; a downstream distributor documents
the Composition-1k checkpoint's noncommercial limitation and
retains the exact original checkpoint hash.

Relevant primary and supporting references:

- Official ViTMatte training instructions:
  https://github.com/hustvl/ViTMatte/blob/main/docs/train.md
- Hugging Face original checkpoint card:
  https://huggingface.co/hustvl/vitmatte-small-composition-1k
- Explicit NOTICE for original-weight conversion:
  https://huggingface.co/LibreYOLO/LibreViTMattes-matte/blob/main/NOTICE
- Adobe dataset license discussion in official FBA Matting repo:
  https://github.com/MarcoForte/FBA_Matting

A general model-card Apache label does not resolve those dataset/
derivative-checkpoint permissions. **No ViTMatte Composition-1k
checkpoint, converted checkpoint, commercial hair matte or third-party
donor portraits were downloaded, mirrored, committed or packaged.**
Licensing would require a rights-holder clearance/legal review,
or independently trained weights from suitably cleared datasets.
This is not a legal determination, but it is a fail-closed
engineering distribution decision.

## Implementation — genuine fractional numerical alpha, not neural

Phase 39 already generates a 512×512 guarded three-class HAIR
trimap: definite hair (255), uncertain (128), definite background
(0). It recorded 11,284 uncertain pixels on the actual catalog
fixture. A meaningful near-term benchmark is to resolve a subset
without making up ground truth.

`public/ai/migan/hair-alpha-colorline-research.mjs` performs a
bounded color-line matting **baseline** on the original unmodified
photograph. For each UNKNOWN trimap pixel, it:

1. Finds the nearest definite-hair pixel and definite-background
   pixel within a 12-pixel square radius.
2. Computes the least-squares estimate of its alpha by projecting
   RGB onto the line between those locally observed foreground and
   background colors: `a=dot(I-B,F-B)/dot(F-B,F-B)`.
3. Rejects missing anchors, too-similar hair/background RGB, alpha
   outside a narrow physically plausible margin or excess
   distance to the local RGB mixing line.
4. Keeps all already-definite trimap pixels exact at 0 or 1;
   rejects untrusted masks and **any** trimap-foreground/uncertain
   overlap with the independently protected facial zones.
5. Returns an alpha float array and a **separate validity mask**.
   Unsupported unknown pixels visibly ABSTAIN in magenta in a
   separate diagnostic view. A numeric alpha=0 placeholder for an
   unsupported pixel is never counted as an inferred transparent
   pixel or silently composited into the customer photo.

The actual hairline is not edited or approved, and the final user
hairstyle preview is unchanged. No model weights are required;
`learnedModelWeightsUsed:0`, `neuralHairMattingExecuted:false`,
`alphaGroundTruth:false`, `exportAllowed:false` and
`commercialReleaseAllowed:false` are explicit. This solves a
*small conditional RGB projection problem*, not the physical
multi-layer hair extraction or unseen-scalp reconstruction task.

**Physical assumptions are restrictive.** The local approximation
ignores lens gamma/color pipelines, transparency of actual fine
strands, shadows, complex hair highlights, highly variable hair
colors and background bokeh. Matting from one photo without
measured foreground/background layers is underdetermined.
A low residual is mathematical self-consistency with selected local
colors, **not** scientific evidence for a real hair strand.

## Testing

`scripts/phase40-hair-alpha-colorline-regression.mjs` provides an
analytically constructed synthetic mixture with known foreground,
background and alpha. It checks real intermediate opacity recovery
against synthetic ground truth, abstentions on contradictory input,
immutability of the input photograph, exact protected-face behavior
and boundary-size refusal. **Synthetic fixtures are not real portrait
quality scores.**

`scripts/real-hair-removal-studio-smoke.mjs` now launches the
research UI in the real Chromium neural pipeline, computes the
classical fractional-alpha experiment after the original local
MediaPipe hair trimap, records number of resolved and abstained
unknown pixels, checks no customer export / no licensed hair-weight
misrepresentation and repeats the same numeric result after fully
disabling all browser network access. Consent revocation clears the
result. The UI highlights uncertain pixels explicitly.

## Acceptance criteria

The exact latest research commit must have a completed successful
GitHub Actions workflow: unit, genuine segmentation, MI-GAN,
MODNet, real browser local A/B, offline repeat, privacy and integrity.

If the estimate resolves only a small fraction or gives unstable
residuals, the correct next step is improved, independently
licensed neural-alpha training data or a better hair-specific
matting architecture, **not** automatic cosmetic export.

No claims of independently validated portrait alpha, authentic
fine hair strands, photorealistic transfer, or actual Android-device
latency. The still visible forehead cutout remains a release
blocker. Production `main` remains untouched.
