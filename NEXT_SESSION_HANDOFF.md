# Hananeh Beauty continuation checkpoint

Date: 2026-10-21
Authoritative application directory: `public/` (see `wrangler.toml`).

## Completed in this update

Preserved 265 Persian hairstyle families and 270 bundled images. Fixed portrait distortion with proportional fitting into a 768 × 960 working canvas; invalidated pending generations when inputs change; disabled stale export; separated browsing a style from choosing it. Rolled the service-worker cache to v4.

## Verification

`npm test` passes catalog/payload integrity checks and 8 behavioral regressions. Five cover portrait fitting, stale export, asynchronous photo replacement and dismissed style selection. Three execute the shipped service-worker handlers with actual file bytes to check offline image-pack loading, missing-pack repair and navigation fallback.

A Chromium browser check was prepared but could not execute: no Chromium executable was installed and its download returned an invalid/truncated ZIP. No screenshots or browser success claims are included in this checkpoint.

## Deployment status

GitHub access is writable. Cloudflare account listing succeeded, but the worker/pages inventory request returned UNAUTHORIZED with reauthentication required; the Cloudflare connector then became unavailable. No deployment was changed or verified. Do not describe the site as live based only on the repository commit.

When Cloudflare access is restored, inspect existing projects before creating anything. Deploy the `public/` directory using the existing Wrangler configuration; verify HTTPS, full cache audit, cache repair, offline reload, photo upload, chosen-style persistence, JPEG export and layout at phone/tablet/desktop widths. Real Android installation and airplane-mode checks remain outstanding.

## Product boundary

Browser try-on remains approximate non-AI compositing. Neither a verified segmentation model nor photorealistic generative hairstyle transfer is bundled. Do not claim either works. Photo processing remains on the device. No Android APK has been produced in this update.

## Follow-up: replacement portrait safety
Rejected, oversized and corrupt replacement photos now clear the old preview, restore the empty placeholder and disable old exports instead of retaining another person's image on screen. Photo input without a trustworthy MIME type can also be accepted by a supported image filename and is still subject to actual decode. Added three deterministic regression tests; new cache key v7. This is a source change, not evidence of an Android browser run or a live Cloudflare redeploy.

## v0.4.0 MediaPipe offline AI integration
Added browser-only hair extraction using the pinned `@mediapipe/tasks-vision@0.10.32` runtime and Google's HairSegmenter. New `npm run build` stage vendors WASM plus model into `public/ai`. PWA caches them opportunistically and independently of the core offline catalog, with separate AI audit fields and an approximate fallback. The model and runtime are **not committed as binary files**; the Cloudflare build must execute `npm install && npm run build`. No in-browser, Android or live-deployment verification is implied by this source commit. New pure regression tests cover confidence masks and bundle composition.

## Eye landmark augmentation
Source commit added offline BlazeFace short-range face detection, normalized eye anchoring, and image-local fallback (a single non-hair photograph no longer permanently disables the segmentation engine). 9 optional AI assets now include two TFLite models. Offline audit checks core app and AI bundle independently. Added face anchor and cache-count regression expectations. Build/run verification and live redeploy still pending.

## Quality V2 residual-hair cleanup checkpoint (experimental branch)

Branch: `feature/quality-compositor-v2`; PR: https://github.com/jjh167910-cloud/Hanane-beauty/pull/1 (draft). The live site remains on main.

Added `public/ai/residual-hair-repair.mjs`: strictly bounded, color-consistency-gated repair for small exposed hair areas against uniform backgrounds; input images/masks are not mutated; excludes detected face and rejects large source-hair regions. Integrated repaired transparent layer into preview and HD export. Preserved controls and per-portrait privacy. UI toggle allows opting out. Recomputes overlap warning/repair when sliders settle and upon pointer release, clearing stale overlay during drag. Service worker now uses `hananeh-static-20261021-v11`, precaches both quality modules, and `test:unit` includes `scripts/residual-hair-regression.mjs` alongside previous regressions. Synthetic checks passed for flat backdrop repair, busy-background refusal, face protection, and JavaScript parsing. Full branch `npm test`, real-device screenshot review, and production deployment **not yet validated**. Do not merge into main or claim photorealism before validation.
