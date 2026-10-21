# Phase 7 — real on-device segmentation gate (2026-10-21)

## Artifact
A downloadable test package named **Hananeh_Phase7_Real_Model_Gate.zip** was built in the companion ChatGPT conversation. It includes `ai-model-gate.html`, `install_into_hananeh.py`, `test_ai_model_gate.py`, and `test_installer.py`.

The research page uses the repository's **actual** `public/ai/hair-segmenter.mjs` and does not contain proprietary model assets or external AI services.

## What it does
- Reads locally built `ai/model-info.json`, verifies SHA-256 of both TFLite models, and audits Cache Storage for all runtime/model assets.
- Loads `getLocalHairSegmenter()` from the same origin, runs `analyze()` on a user-chosen portrait entirely in the browser, and displays the output mask.
- Exports timestamps, model hashes, cache status and elapsed inference time as JSON. The original portrait and mask are **never** included in JSON.
- States clearly that segmentation is not reference-guided hairstyle synthesis.

## How to install the research page in a checkout
```bash
python install_into_hananeh.py /path/to/Hanane-beauty
cd /path/to/Hanane-beauty
npm install
npm run build
npm test
```

The installer only edits the checkout: copies the HTML into `public/`, adds it to the service-worker CORE list, and rolls the cache version. Do not merge or deploy to production without review.

## Local verification performed
- Chromium 144 interface smoke test: fake/controlled model module with a generated portrait; 0 external network requests, 0 page errors.
- Injected model byte/hash fixture: two expected hashes verified through a stubbed digest; missing Cache Storage **correctly fails** offline readiness.
- Invalid portrait rejected; mocked mask displayed; privacy-safe JSON exported.
- Installer idempotence, service-worker registration, unknown-layout rejection tests passed.

**Do not interpret these mock tests as real MediaPipe inference.** The test runner explicitly injects a stub because the sandbox denies localhost navigation and model-host access.

## Release gates not met
1. Real MediaPipe model/wasm binaries fetched in a trusted build and distributed with the PWA.
2. Android Chrome test on the user device, with airplane-mode relaunch and repeat inference.
3. Correct segmentation mask on at least 30 consented portraits, including difficult hairlines and lighting.
4. A legally usable *reference-conditioned hairstyle generator* verified on-device, separate from this segmentation check.
5. Blind human appraisal of facial-identity, hairline, hair reference, occlusion and lighting quality.

**Status: RESEARCH / NOT GENERATIVE / NOT PRODUCTION VERIFIED.** Existing salon web application has not been changed by this research commit.
