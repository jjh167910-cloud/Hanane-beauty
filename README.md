# حنانه بیوتی — Offline Hairstyle Web App

A Persian right-to-left, mobile-first **static Progressive Web App**.

## Contents
- **265** hairstyle families; **270** bundled style images.
- Private selfie upload, style selection, approximate hairstyle compositing, positioning/rotation/opacity adjustments, before/after view and local JPEG export.
- No paid service, account, cloud inference, external image URLs or tracking.
- Once the PWA is installed, its full asset bank is precached by the service worker (subject to the browser's available storage and eviction policy).

## Limits — read before customer use
**The current try-on mode is an approximate, NON-AI overlay.** It is NOT photorealistic hairstyle transfer. The planned MediaPipe segmentation / local generative model is **not bundled or production-verified in this release**. Don't claim realistic AI try-on is available. It is a visual consultation aid only.

## Offline readiness in the app
After the first HTTPS visit, the service worker caches all **14 image packs** plus the catalog, homepage, icon and manifest. The homepage now displays a real cache-audit result and includes a **repair cache** control. An installed PWA is offline-ready only when it reports all core files stored; Chrome may evict site storage later.

## Deploy on Cloudflare Workers
- Build command: **`npm test`** (recommended validation, uses only Node.js built-ins; optional: none)
- Deploy command: `npx wrangler deploy`
- Root directory: `/`
- Wrangler reads `wrangler.toml` and serves files from `./public`.
- After the first successful HTTPS deployment, open it in Android Chrome, install to home screen, wait for the service worker's precache to finish, then test in airplane mode.
- If Cloudflare Workers build is unavailable or capped, any HTTPS static hosting can serve the `public` directory; no backend required.

## Local testing
```sh
npm test
cd public
python -m http.server 8000
```
Open http://localhost:8000 in a desktop browser. For phone install, HTTPS is required.

## Privacy
User photos remain in the device's browser memory; results are downloaded only when requested. There is no image upload endpoint. Users should still consent before using portrait photos in the salon.

## Production verification status
- Source catalog and UI have been browser-tested in the artifact workspace.
- The private GitHub repository commit does **not** prove a successful Cloudflare deploy.
- HTTPS install and real Android Chrome airplane-mode behavior must be tested after deployment.

## Current deployment checkpoint (2026-10-21)
The connected GitHub repository has the app source and deployment configuration, but the connected Cloudflare account currently shows **no Worker or Pages project named `hanane-beauty`**. A successful GitHub commit alone does not publish the app. Cloudflare Workers Builds must be connected to this repository (or `npx wrangler deploy` run with authorized credentials). Confirm the HTTPS deployment, install prompt, offline asset cache, Android airplane-mode behavior and image export on a real Android phone before calling the project production-ready.

## Verification
Run `npm test` to validate 265 families, 270 local WebP images, image references, PWA manifest, service-worker cache messaging, and JavaScript syntax. This static test does not prove photorealism, Android performance, or browser cache durability.

## Reliability update — 2026-10-21, v0.3.0
- Portraits are fitted into a bounded 768 × 960 working canvas without stretching or cropping; empty margins preserve the complete photograph.
- Changing a photo or confirming a different style invalidates pending output. Export stays disabled until a current result exists.
- Merely browsing and dismissing another style leaves the chosen style unchanged.
- The offline cache version is advanced so existing installations can receive the corrected page.
- `npm test` now runs five try-on regressions and three service-worker integration tests in addition to catalog integrity checks, using Node built-ins only.

This session could not run Chromium browser checks because no browser executable was installed and the browser download failed. The service-worker integration tests run real worker handlers against local app bytes, but do not replace real Android Chrome checks. Cloudflare returned a missing-permissions / reauthentication error while checking deployment; no deployment was created or verified in this session.

## Offline web AI hair segmentation (v0.4.0 source integration)
The optional Web MediaPipe HairSegmenter now extracts hair alpha locally when its assets have been built and cached. This is segmentation-assisted **compositing**, not generative hairstyle replacement or validated photorealism. The approximate fallback remains usable on unsupported devices.

Build before deploying:
```sh
npm install
npm run build
npm test
npx wrangler deploy
```
The `build` command copies a pinned local MediaPipe runtime and downloads Google's versioned HairSegmenter model to `public/ai/`. The browser imports only same-origin assets. The service worker caches these as optional assets and reports `aiReady` separately from the catalog's offline status; Android memory limits, segmentation accuracy and actual offline AI inference require physical-device validation. Third-party MediaPipe/model licensing and attribution should be reviewed before commercial release. Cloudflare builds must use `npm run build` (not `npm test` alone) to include the AI assets.

### Eye-landmark registration
The build also bundles the Google BlazeFace short-range detector. It supplies a normalized eye center and eye distance for matching the chosen style to the customer's portrait. Detection is entirely on-device. If either model or detection fails, manual alignment and the approximate fallback remain functional. Catalog offline readiness and AI asset readiness are reported separately.


## Quality compositor V2 (experimental; offline, not generative)

The quality branch adds **face-region preservation**: the customer's original eye/nose/mouth pixels can be layered above the hairstyle, using a softly feathered face ellipse anchored to local BlazeFace eyes. Users can turn this off for bangs/fringes. Eye-line tilt also drives bounded hairstyle rotation. A local mask-coverage metric warns when the customer's existing hair extends outside the desired hairstyle; it does **not** magically remove that hair.

The JPEG exporter is decoupled from the Before/After toggle and uses the decoded source photo at up to 1536×1920 when its resolution is sufficient. Hairstyle textures remain based on the 512px reference bank, so this change chiefly protects portrait/background clarity rather than adding hair detail. If high-resolution export runs out of memory, the app falls back to the preview output.

The pure quality functions live in `public/ai/quality-core.mjs` and are included in the offline service worker cache. Automated quality and export regressions are in `scripts/quality-regression.mjs` and `scripts/tryon-regression.mjs`.

**Still not solved:** automatic removal of the customer's previous long hair, synthesis of newly exposed background/scalp, hair relighting/shadow simulation, 3D pose-dependent occlusion, or realistic new strands. Actual salon-quality transfer requires an independently evaluated generative/inpainting engine. A passing source test alone is not visual proof. Never upload portraits to an online engine without explicit opt-in consent.

### Conservative offline removal of residual strands (quality prototype)

The `residual-hair-repair.mjs` module detects hair that remains visible outside the projected replacement hairstyle, and attempts **limited background-color reconstruction** only where the original background is locally uniform. It accepts existing HairSegmenter confidence masks and the BlazeFace face guard. It rejects noisy/background-inconsistent areas, large residual hair regions, and components touching the protected face; it does not invent a scalp, ears, or complex background. The customer can turn off the feature using the `ترمیم محدود موهای باقی‌مانده` toggle. Repair patches are discarded while dragging or changing hairstyle controls, then recalculated after placement settles.

The repaired pixels are an offline 384×480 transparent overlay, drawn between the original photograph and the hairstyle, and are included in the photo export. This can reduce distracting hair fragments against plain salon backgrounds but does **not** solve long-to-short conversions, hair geometry, specular lighting, or generative transfer. Every preview remains a consultation approximation.

Run `npm test` on the branch to execute the catalog/offline/image/face and residual-hair regression suites; static and pure JavaScript checks were performed during development. Visual accuracy must still be assessed on real portraits before this feature is promoted from a draft pull request to production.


## Experimental offline neural inpainting (MI-GAN)

The quality branch optionally uses **MI-GAN**, a small inpainting GAN designed for mobile devices, to reconstruct old hair visible beyond a selected style. This is a real neural background-restoration model, not a painted uniform-color patch. **It does not generate the new hairstyle**: hairstyles still come from the original 512px catalog references.

- Model: `andraniksargsyan/migan`, `migan_pipeline_v2.onnx`, pinned Hugging Face revision `1538c135034b8c535f198d2a3569eaefc0309d5a`, fixed SHA-256 `6f1f3530a1a2324b19752018ce756088b07973cda8d7d890034ace5c8a48c40b`.
- Licensing: MIT code and weights; upstream `Picsart-AI-Research/MI-GAN/LICENSE-WEIGHTS` and mirrored `public/ai/inpaint/LICENSE-WEIGHTS.txt`. ONNX Runtime Web is MIT; include its notices when commercially distributing.
- Build: `npm test` calls `npm run build`, which assembles local MediaPipe assets, downloads/validates the 28,079,181-byte MI-GAN model, and splits it into three 12-MiB-or-smaller parts for Cloudflare's 25-MiB per-asset limit. The pinned `onnxruntime-web@1.23.2` WASM runtime is copied locally, without CDN references.
- Offline installation: main salon PWA installs without the neural weight. The user explicitly taps **ذخیره موتور عصبی برای آفلاین** while online; the service worker downloads six optional local files into the version-independent `hananeh-hq-inpaint-model-v1` cache. Use offline after that. No photo files are uploaded.
- Inference: separate browser Worker, SHA-256 verified model sharding, one WASM thread for compatibility, uint8 CHW `image` and `mask` inputs, output composed only over AI-approved hair pixels. A visible opt-in **ترمیم هوشمند موهای قبلی** runs only when real (non-heuristic) hair and face detection succeeds. Incorrect face coverage, excessive removed hair area, stale photo/style changes and model failures leave the existing preview intact.
- Known limits: very large old hair, missing scalp/back-of-head and highly detailed lighting/strands may still look artificial; operating on a 512-pixel crop cannot reconstruct unlimited detail. Memory and runtime on Android phones remain **unverified**, and the inference path has **not been proven in a real phone browser**.

**Do not merge the draft PR into `main` or advertise real-world photorealism** before the neural model has successfully loaded and inferred on target Android hardware and blinded visual A/B testing beats the existing app. Cloudflare static assets are only a delivery mechanism, not GPU inference. Do not create a remote photo-processing fallback without user opt-in.

### Pose-compatibility and mobile cancellation (quality safety pass)

The optional local face detector supplies **nose and eye keypoints**, permitting a rough left/right head-angle compatibility test (`poseCompatibility`). When the customer's pose differs substantially from the hairstyle reference, the app displays a Persian warning and disables experimental neural restoration for that pair. This is a conservative 2D proxy—not a full 3D face-pose solver.

The expensive ONNX Worker is terminated, pending model tasks are rejected, and sensitive pixel buffers become eligible for release when a different portrait/style is selected, a hairstyle is moved mid-inference, or the browser page is hidden. Native browser memory recovery timing depends on the device.

A second inpainting gate rejects masks that touch the top, sides or internal lower boundary of its 512px inference crop, preventing artificial horizontal lines where the reconstruction would abruptly stop. That means long hair extending beyond the safe crop may be **intentionally refused**, not erased.

Verification in this pass: 28/28 targeted try-on interaction checks; 6/6 isolated MediaPipe mask/face regression checks; additional synthetic tests for pose and cropped reconstruction. This is **not** an Android inference/photorealism certification; the full project build and real-model image tests remain pending.
