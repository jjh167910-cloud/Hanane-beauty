# حنانه بیوتی — Offline Hairstyle Web App

A Persian right-to-left, mobile-first **static Progressive Web App**.

## Contents
- **265** hairstyle families; **270** bundled style images.
- Private selfie upload, style selection, approximate hairstyle compositing, positioning/rotation/opacity adjustments, before/after view and local JPEG export.
- No paid service, account, cloud inference, external image URLs or tracking.
- Once the PWA is installed, its full asset bank is precached by the service worker (subject to the browser's available storage and eviction policy).

## Limits — read before customer use
**The current try-on mode is an approximate, NON-AI overlay.** It is NOT photorealistic hairstyle transfer. The planned MediaPipe segmentation / local generative model is **not bundled or production-verified in this release**. Don't claim realistic AI try-on is available. It is a visual consultation aid only.

## Deploy on Cloudflare Workers
- Build command: **none**
- Deploy command: `npx wrangler deploy`
- Root directory: `/`
- Wrangler reads `wrangler.toml` and serves files from `./public`.
- After the first successful HTTPS deployment, open it in Android Chrome, install to home screen, wait for the service worker's precache to finish, then test in airplane mode.
- If Cloudflare Workers build is unavailable or capped, any HTTPS static hosting can serve the `public` directory; no backend required.

## Local testing
```sh
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
