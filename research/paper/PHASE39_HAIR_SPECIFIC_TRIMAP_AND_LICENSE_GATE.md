# Phase 39 — image-specific hair trimaps and rights-gated matting options

Date: 2026-10-22. Research branch only,
`research/offline-generative-feasibility-2026-10-21`.
Production `main` unchanged. **No licensed, proven neural hair-alpha
prediction or realistic hairstyle synthesis has yet been delivered.**

## Engineering goal

Phase 38 verified a real Apache-2.0 MODNet **whole-person** neural
alpha (12,984,781 bytes; a ~1.5 second headless Chromium sample).
A whole-person alpha is close to 1 over both forehead skin and hair,
so cannot recover transparency between individual strands against the
forehead. It is technically wrong to replace the MediaPipe **hair**
confidence or constrained donor opacity with MODNet's person mask.

Phase 39 constructs a *hair-specific three-level trimap*, a bounded
input constraint suitable for subsequent **separately licensed**
true hair/foreground-alpha matting inference.

## Algorithm implemented

`public/ai/migan/guarded-hair-trimap.mjs` calculates each pixel's
constraint from the on-device MediaPipe source hair confidence and
the separately run semantic face-skin and facial landmark masks:

- **255 / definite hair** (green): original local hair confidence at
  least 240/255 **throughout a radius-3 square**; no protected face,
  skin, out-of-frame or uncertain-confidence pixel in the neighborhood.
  This is an eroded interior and intentionally excludes fine baby hairs.
- **0 / definite background** (dark): original hair confidence
  <= 35/255 throughout that neighborhood, or the pixel is part of the
  protected face/skin veto. A blocked predicted hair pixel is retained
  in a separate **conflict count**; it never becomes a known foreground.
- **128 / UNKNOWN hair edge** (yellow): all remaining unprotected
  pixels near the transition or with intermediate hair confidence.
  This is the region where a properly licensed matting model would
  need to estimate a fractional alpha.
- Reject corrupted masks, absent independent veto, too few
  known foreground/background/unknown seeds, or unsafe dimensions.
- Returns only categorical trimap, volatile color visualization and
  aggregate numeric measurements. `estimatedHairAlpha:false`,
  `neuralHairMattingExecuted:false`, `exportAllowed:false`,
  `commercialReleaseAllowed:false` are permanent flags.
- The input hairstyle image is never changed. Modifying the trimap
  never changes protected skin or unlocks a customer-style export.

The Persian research UI now shows a separate local
`#hairTrimap` preview and stats after the genuine hair segmentation,
face veto and MI-GAN inpainting stages. A new image or withdrawal of
consent clears it. The offline PWA preparation caches its module.

`scripts/phase39-guarded-hair-trimap-regression.mjs` asserts the
three classes, mixed hairline edges, forced-face background,
determinism, unchanged original pixels, corrupt mask rejection,
and explicit refusal to claim alpha inference. The real-browser
smoke additionally inspects all three class counts and requires
identical counts after full airplane-mode reload.

**Critical quality limitation:** Forehead face-protection being forced
to background can remove legitimate wisps overlapping skin. Conversely,
confidently predicted hair in the interior can be incorrectly
segmented. This system is NOT a ground-truth trimap. To improve visual
quality, collect consented hair-alpha labels and measure errors
versus those labels. Without that, it cannot certify strands.

## Model-license and mobile feasibility screening

| Model | Relevant capability | Weight rights status | Mobile/offline reality |
|---|---|---|---|
| MODNet `Xenova/modnet` | Whole-person alpha, not hair alpha | Apache-2.0 code/weights label and upstream notice | **Verified** on local Chromium WASM in Phase 38, ~13MB; not physical Android |
| ViTMatte small `hustvl/vitmatte-small-composition-1k` | **Trimap-conditioned alpha**, useful for hair boundaries | HF model card states Apache-2.0, but Composition-1k dataset and checkpoint distribution rights must be independently confirmed | ~103MB original safetensors; needs verified ONNX export, WebAssembly RAM/time and Android real-photo tests; **not bundled** |
| FBA Matting (Forte/Pitié) | Foreground + background + alpha from trimap | Official published **pretrained weights explicitly noncommercial** because trained on Adobe dataset; **do not bundle for salon** | ~139MB weights, official GPU recommendation >=11GB on high resolution; unsupported Android |
| PyMatting | Classical trimap/foreground estimation algorithms | MIT library code | Python/NumPy/Numba stack, not a ready Android PWA model; potential open-licensed algorithm reference, no measured browser inference |
| HairFastGAN / HairPort | Actual hairstyle generation/3D-aware transfer | Different research and noncommercial/third-party licensing caveats recorded in prior reports | Not verified on Android browser and not commercially cleared |

Sources:
- https://huggingface.co/hustvl/vitmatte-small-composition-1k
- https://github.com/azuredsky/FBA-Matting
- https://github.com/pymatting/pymatting
- https://github.com/ZHKKKe/MODNet
- https://huggingface.co/Xenova/modnet

**Development decision:** invest in a grounded, reproducible
**hair alpha evaluator** and real different-person human visual
comparisons before spending mobile bandwidth on a 103MB model
which might lack commercial checkpoint rights or useful performance.
An offline hair trimap is a necessary input for that research, not
an inferred alpha output. All manufacturing of photorealism claims is
blocked. The original 53px suspicious forehead cap has **not**
been fixed.

## Verification pending

The latest GitHub Actions workflow must complete with unit tests,
real MediaPipe hair/multiclass inference, MI-GAN, the Phase 38
MODNet and **Phase 39 known/unknown/background trimap** operating
with browser networking disabled and consent withdrawal enforced.
A passing unit suite alone is not the full-integrated PASS.


## Verified real-browser results (October 22, 2026)

**Complete GitHub Actions SUCCESS on commit**
`4fe9af76c9dc60e88027690430f5bf8faa1e247e`:
https://github.com/jjh167910-cloud/Hanane-beauty/actions/runs/39820050056

The integrated browser run used the *actual* local hair segmentation,
semantic face veto, MI-GAN inpainting and packaged MODNet assets
(not synthetic-only masks). Full-image resolution: **512 x 512**.

| Actual hair-trimap class | Number of pixels | Fraction |
|---|---:|---:|
| Known hair interior (255) | 12,986 | 4.95% |
| Unknown edge region (128) | 11,284 | 4.30% |
| Definite background / protected face (0) | 237,874 | 90.74% |
| **Total** | **262,144** | **100%** |

**669 pixels** with confidently predicted hair were overridden by the
independent protected-face/skin veto. This is evidence of *model
disagreement*, not proof the hair labels or face veto are
anatomically correct. Human scrutiny is necessary for legitimate
fringe strands crossing the forehead.

The counts repeated **exactly** with all browser networking disabled.
Consent revocation discarded previous trimap results. All software
unit tests and the complete headless neural/browser workflow succeeded.

**Conclusion:** A model-ready, face-protected, locally computed hair
trimap works offline and quantifies an uncertain region of **11,284
pixels** on the tested image. It does **not** predict hair alpha,
recover natural wisps, demonstrate improvement in photo realism, or
authorize commercial use. The hair-cap forehead issue remains.
