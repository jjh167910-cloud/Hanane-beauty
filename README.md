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
