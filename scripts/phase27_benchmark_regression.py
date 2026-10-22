#!/usr/bin/env python3
"""Stdlib tests: rights/consent preflight is fail closed, no GPU or portrait upload."""
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("phase27_hairfastgan_benchmark.py")

class Phase27GateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.data = self.root / "data"
        self.data.mkdir()
        self.manifest = self.root / "pairs.json"
        self.case = {"case_id":"licensed-trial-01",
                     "source_subject_id":"consented-person-A",
                     "reference_subject_id":"consented-person-B"}
        # A tiny header-valid fixture; intentionally NOT a photograph or valid
        # image decoder target. The preflight is an integrity gate, NOT real inference.
        for key,name in [
            ("source_image","source.jpg"),("shape_image","ref.jpg"),
            ("color_image","ref-color.jpg"),
            ("source_rights_record","source-rights.txt"),
            ("source_consent_record","source-consent.txt"),
            ("reference_rights_record","reference-rights.txt"),
            ("reference_consent_record","reference-consent.txt")]:
            blob = (b"\xff\xd8\xff" + bytes([len(name)])*5000) if key.endswith("_image") else (
                b"TEST_ONLY_SYNTHETIC_ATTESTATION_NOT_VALID_LEGAL_DOCUMENT____")
            (self.data/name).write_bytes(blob)
            self.case[key] = {"path":name,
                "sha256":hashlib.sha256(blob).hexdigest()}
        # Frozen two-person protocol: one reference image supplies both
        # hairstyle shape and color; no unconsented third person is accepted.
        self.case["color_image"] = dict(self.case["shape_image"])
        self.write()

    def write(self):
        self.manifest.write_text(json.dumps({"schema":"HANANEH-PHASE27-PAIR-v1",
                                             "cases":[self.case]}),encoding="utf-8")
    def run_gate(self, *extra):
        return subprocess.run([sys.executable,str(SCRIPT),"--manifest",str(self.manifest),
              "--data-root",str(self.data), *extra],text=True,capture_output=True,timeout=12)

    def test_preflight_is_not_inference_or_licensing_certification(self):
        p=self.run_gate()
        self.assertEqual(p.returncode,0,p.stderr)
        out=json.loads(p.stdout)
        self.assertFalse(out["gpu_inference_performed"])
        self.assertFalse(out["license_certified"])
        self.assertFalse(out["commercial_release_allowed"])
        self.assertFalse(out["photorealism_verified"])
        self.assertFalse(out["network_isolation_verified"])
        self.assertEqual(out["records"][0]["status"],"preflight_only")

    def test_missing_or_corrupt_rights_file_rejected(self):
        p=self.data/"source-rights.txt";p.unlink()
        self.assertNotEqual(self.run_gate().returncode,0)
        p.write_text("tampered but not correct sha "+("x"*32))
        self.assertIn("SHA-256 mismatch",self.run_gate().stderr)

    def test_original_and_reference_subjects_must_differ(self):
        self.case["reference_subject_id"]=self.case["source_subject_id"]
        self.write()
        self.assertIn("DISTINCT",self.run_gate().stderr)
    def test_unverified_catalog_identity_rejected(self):
        self.case["source_subject_id"]="catalog-unverified-identity"
        self.write()
        self.assertNotEqual(self.run_gate().returncode,0)

    def test_unconsented_third_color_reference_rejected(self):
        blob=(b"\xff\xd8\xff"+b"x"*5000)
        name="unconsented-third.jpg"
        (self.data/name).write_bytes(blob)
        self.case["color_image"]={"path":name,
          "sha256":hashlib.sha256(blob).hexdigest()}
        self.write()
        self.assertIn("SAME consented reference",self.run_gate().stderr)

    def test_duplicate_cases_rejected(self):
        self.manifest.write_text(json.dumps({"schema":"HANANEH-PHASE27-PAIR-v1",
                                             "cases":[self.case,self.case]}))
        self.assertIn("Duplicate",self.run_gate().stderr)

    def test_input_hash_tampering_rejected(self):
        p=self.data/"source.jpg";p.write_bytes(p.read_bytes()+b"x")
        self.assertIn("SHA-256 mismatch",self.run_gate().stderr)

    def test_path_escape_and_symlink_rejected(self):
        self.case["source_image"]["path"]="../outside.jpg"
        self.write()
        self.assertNotEqual(self.run_gate().returncode,0)
        self.case["source_image"]["path"]="source.jpg"
        (self.data/"source.jpg").unlink()
        (self.data/"source.jpg").symlink_to(self.data/"ref.jpg")
        self.write()
        self.assertIn("symlinked",self.run_gate().stderr)

    def test_gpu_execution_refuses_absent_or_unpinned_checkout(self):
        self.assertIn("--upstream-dir",self.run_gate("--execute").stderr)
        self.assertIn("source checkout",self.run_gate("--execute","--upstream-dir",str(self.data)).stderr)

if __name__=="__main__":
    unittest.main(verbosity=2)
