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
