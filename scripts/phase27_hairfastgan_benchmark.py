#!/usr/bin/env python3
"""Phase 27. Local CUDA HairFastGAN benchmark; NEVER a production app route.

Preflight is Python-stdlib-only and does NOT load model weights or run inference.
Execution needs a local, user-provided, PINNED upstream checkout, weights, CUDA
and independent rights-cleared image pairs. No images are uploaded by this tool.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from datetime import datetime, timezone

UPSTREAM_COMMIT = "49e98019c9243d1991c19d45764fc3340a498de2"
SCHEMA = "HANANEH-PHASE27-PAIR-v1"
SHA256 = re.compile(r"^[0-9a-f]{64}$")
CASE_ID = re.compile(r"^[a-zA-Z0-9_-]{3,64}$")
REQUIRED_WEIGHTS = [
    "pretrained_models/StyleGAN/ffhq.pt",
    "pretrained_models/Rotate/rotate_best.pth",
    "pretrained_models/Blending/checkpoint.pth",
    "pretrained_models/PostProcess/pp_model.pth",
    "pretrained_models/encoder4editing/e4e_ffhq_encode.pt",
    "pretrained_models/ShapeAdaptor/shape_predictor_68_face_landmarks.dat",
]

class GateError(Exception):
    pass

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(2**20), b""):
            h.update(chunk)
    return h.hexdigest()

def local_file(root, rel, expected_sha, what):
    if not isinstance(rel, str) or not rel or Path(rel).is_absolute() or "\\" in rel:
        raise GateError(f"{what}: unsafe or absolute path")
    root = root.resolve()
    dest = (root / rel).resolve()
    if not dest.is_relative_to(root) or not dest.is_file() or dest.is_symlink():
        raise GateError(f"{what}: missing, symlinked or outside the designated local root")
    if not isinstance(expected_sha, str) or not SHA256.fullmatch(expected_sha):
        raise GateError(f"{what}: missing SHA-256")
    if sha256(dest) != expected_sha:
        raise GateError(f"{what}: SHA-256 mismatch")
    return dest

def parse_manifest(path, data_root):
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or data.get("schema") != SCHEMA:
        raise GateError("Unsupported benchmark manifest version")
    cases = data.get("cases")
    if not isinstance(cases, list) or not 1 <= len(cases) <= 100:
        raise GateError("Expected between 1 and 100 independent paired trials")
    seen = set()
    validated = []
    for case in cases:
        if not isinstance(case, dict) or not CASE_ID.fullmatch(str(case.get("case_id", ""))):
            raise GateError("Invalid case identifier")
        cid = case["case_id"]
        if cid in seen:
            raise GateError("Duplicate benchmark case")
        seen.add(cid)
        sid = case.get("source_subject_id")
        rid = case.get("reference_subject_id")
        if not isinstance(sid, str) or not isinstance(rid, str) or not sid or not rid or sid == rid:
            raise GateError(f"{cid}: two DISTINCT subject IDs are mandatory")
        if sid.startswith("catalog-") or rid.startswith("catalog-"):
            raise GateError(f"{cid}: unverified catalog identities cannot be independent subjects")
        assets = {}
        # Independent rights/consent documents must exist on the local user's
        # device with a provided hash; this proves presence, not legal sufficiency.
        for key in ("source_image", "shape_image", "color_image",
                    "source_rights_record", "source_consent_record",
                    "reference_rights_record", "reference_consent_record"):
            item = case.get(key)
            if not isinstance(item, dict):
                raise GateError(f"{cid}: missing {key} descriptor")
            file = local_file(data_root, item.get("path"), item.get("sha256"), f"{cid}/{key}")
            if key.endswith("_image"):
                # Prevent accidental model evaluation on renamed non-image files.
                if file.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
                    raise GateError(f"{cid}: {key} must be PNG/JPEG/WebP")
                if not 4096 <= file.stat().st_size <= 12 * 1024 * 1024:
                    raise GateError(f"{cid}: {key} size outside bounds")
                if file.read_bytes()[:8] not in (b"\x89PNG\r\n\x1a\n",):
                    # JPEG/WebP checked by signature separately.
                    with file.open("rb") as f:
                        sig = f.read(12)
                    if not (sig.startswith(b"\xff\xd8\xff") or
                            (sig.startswith(b"RIFF") and sig[8:12] == b"WEBP")):
                        raise GateError(f"{cid}: image signature unrecognized")
            else:
                # Nonempty attestation document is needed; no assertion that
                # attached document alone establishes legal sufficiency.
                if file.stat().st_size < 32:
                    raise GateError(f"{cid}: empty/uninformative rights record")
            assets[key] = file
        if assets["source_image"] == assets["shape_image"]:
            raise GateError(f"{cid}: cannot transfer style from the identical source")
        validated.append((cid, assets))
    return validated

def verify_upstream(root):
    if not (root / "main.py").is_file() or not (root / "hair_swap.py").is_file():
        raise GateError("Local HairFastGAN source checkout is missing")
    p = subprocess.run(["git", "-C", str(root), "rev-parse", "HEAD"],
                       capture_output=True, text=True, check=False)
    if p.returncode or p.stdout.strip() != UPSTREAM_COMMIT:
        raise GateError("Upstream HairFastGAN commit not pinned as reviewed")
    for name in REQUIRED_WEIGHTS:
        if not (root / name).is_file():
            raise GateError(f"Missing pretrained dependency: {name}")
    # Build deterministic all-weight manifest. This validates files locally but
    # is NOT a substitute for reviewing third-party checkpoint licenses.
    weights = sorted(p for p in (root / "pretrained_models").rglob("*") if p.is_file())
    if len(weights) < len(REQUIRED_WEIGHTS):
        raise GateError("Incomplete local model inventory")
    return {str(p.relative_to(root)): sha256(p) for p in weights}

def execute_trial(upstream, case_id, assets, output, python_cmd):
    result = output / (case_id + ".png")
    args = [python_cmd, "main.py", "--input_dir", ".",
            "--face_path", str(assets["source_image"]),
            "--shape_path", str(assets["shape_image"]),
            "--color_path", str(assets["color_image"]),
            "--result_path", str(result)]
    env = os.environ.copy()
    env.update({"HF_HUB_OFFLINE": "1", "HF_DATASETS_OFFLINE": "1",
                "TRANSFORMERS_OFFLINE": "1", "WANDB_MODE": "disabled",
                "WANDB_DISABLED": "true", "CUDA_VISIBLE_DEVICES":
                os.environ.get("CUDA_VISIBLE_DEVICES", "0")})
    t = time.monotonic()
    p = subprocess.run(args, cwd=upstream, env=env,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                       text=True, timeout=900, check=False)
    ms = round((time.monotonic()-t)*1000)
    if p.returncode or not result.is_file() or result.stat().st_size < 4096:
        # Do not log subprocess stderr unfiltered: third-party code may reveal
        # personal file locations. Only report exit code + generic failure.
        raise GateError(f"{case_id}: local inference failed (exit {p.returncode})")
    return {"case_id": case_id, "status": "generated_unrated",
            "output_sha256": sha256(result), "output_file": result.name,
            "wall_time_ms": ms, "identity_approved": False,
            "photorealism_approved": False, "phone_offline_verified": False}

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", required=True, type=Path)
    p.add_argument("--data-root", required=True, type=Path)
    p.add_argument("--upstream-dir", type=Path)
    p.add_argument("--output-dir", type=Path, default=Path("research/results/phase27-local"))
    p.add_argument("--python", default=sys.executable)
    p.add_argument("--execute", action="store_true",
                   help="Opt-in local CUDA execution, NO remote inference")
    args = p.parse_args()
    try:
        cases = parse_manifest(args.manifest, args.data_root)
        evidence = {"schema": "HANANEH-PHASE27-LOCAL-EVIDENCE-v1",
            "input_manifest_sha256": sha256(args.manifest),
            "upstream_git_sha": UPSTREAM_COMMIT,
            "method": "HairFastGAN-original-local-CUDA",
            "independent_subject_ids_declared": True,
            "license_certified": False, "consent_validated_by_legal_review": False,
            "commercial_release_allowed": False, "network_isolation_verified": False,
            "android_offline_verified": False,
            "photorealism_verified": False, "gpu_inference_performed": False,
            "records": []}
        if args.execute:
            if args.upstream_dir is None:
                raise GateError("Pass --upstream-dir for local execution")
            upstream = args.upstream_dir.resolve()
            evidence["weights_sha256"] = verify_upstream(upstream)
            if not args.output_dir.is_absolute():
                args.output_dir = (Path.cwd() / args.output_dir).resolve()
            args.output_dir.mkdir(parents=True, exist_ok=True)
            for cid, assets in cases:
                evidence["records"].append(
                    execute_trial(upstream, cid, assets, args.output_dir, args.python))
            evidence["gpu_inference_performed"] = True
        else:
            evidence["records"] = [{"case_id": cid, "status": "preflight_only",
                "photorealism_approved": False} for cid, _ in cases]
        # Avoid storing filenames, raw images, PII, or source rights documents in report.
        print(json.dumps(evidence, indent=2, sort_keys=True))
    except (GateError, OSError, ValueError, subprocess.TimeoutExpired) as error:
        print("PHASE27_FAIL_CLOSED: " + str(error), file=sys.stderr)
        return 2
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
