import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEvidence} from './research-evidence.mjs';
const h=(c)=>c.repeat(64),commit='f'.repeat(40);
const mk=(overrides={})=>({
 sample_id:'demo-1',source_subject_id:'subject-1',reference_subject_id:'reference-1',
 source_image_sha256:h('a'),reference_image_sha256:h('b'),consent_record_id:'smoke-not-confirmed',
 license_record_id:'smoke-not-confirmed',split:'pilot',method_id:'migan-baseline',
 method_commit:commit,status:'ok',device_id:'CI-Linux',hardware_environment_id:'runner-2026-10',
 run_utc:'2026-10-21T12:00:00Z',seed:19,
 metrics:{inference_ms:2000,outside_mask_changed_pixels:0,network_requests_external:0},
 ...overrides
});
const manifest=(records,extra={})=>({
 protocol_id:'OFFHAIR-PROTOCOL-2026-10-21-v1',study_kind:'engineering_smoke',
 study_id:'smoke-2026-10-21',dataset_version:'catalog-unverified',includes_images:false,records,...extra
});
test('Engineering smoke evidence is valid but NEVER qualifies as photorealistic science',()=>{
 const r=validateEvidence(manifest([mk()]));
 assert.equal(r.evaluated_records,1);assert.equal(r.can_claim_photorealism,false);
 assert.equal(r.can_claim_offline_android,false);assert.equal(r.inferential_statistics_permitted,false);
});
test('Transparent failures stay in denominator',()=>{
 const result=validateEvidence(manifest([mk(),mk({
  sample_id:'demo-2',status:'rejected',failure_reason:'Bad hair mask',
  source_image_sha256:h('c'),seed:20
 })]));
 assert.equal(result.outcomes.rejected,1);assert.equal(result.methods['migan-baseline'].success_fraction,.5);
});
test('Disallow subject identity leakage across splits',()=>{
 assert.throws(()=>validateEvidence(manifest([mk(),mk({
  sample_id:'demo-2',split:'test',seed:20,source_image_sha256:h('c')
 })])),/source subject/);
});
test('Disallow duplicate source image crossing splits even with different subject IDs',()=>{
 assert.throws(()=>validateEvidence(manifest([mk(),mk({
  sample_id:'demo-2',source_subject_id:'subject-2',split:'test',seed:20
 })])),/source image/);
});
test('Same method+sample+device+seed cannot be counted twice',()=>{
 assert.throws(()=>validateEvidence(manifest([mk(),mk()])),/duplicate/);
});
test('Do not contaminate evaluation subjects with reference identities',()=>{
 assert.throws(()=>validateEvidence(manifest([mk(),mk({
  sample_id:'demo-2',seed:20,source_subject_id:'subject-2',
  reference_subject_id:'subject-1',source_image_sha256:h('c')
 })])),/reference subject overlaps/);
});
test('Human studies cannot proceed without verified rights and consent registries',()=>{
 assert.throws(()=>validateEvidence(manifest([mk()],{study_kind:'pilot'})),/consent registry/);
 assert.throws(()=>validateEvidence(manifest([mk()],{study_kind:'pilot',consent_registry_verified:true})),/license registry/);
});
test('Confirmatory study requires preregistered identity split AND ratings',()=>{
 assert.throws(()=>validateEvidence(manifest([mk()],{
  study_kind:'confirmatory',consent_registry_verified:true,rights_registry_verified:true
 })),/split must/);
 assert.throws(()=>validateEvidence(manifest([mk()],{
  study_kind:'confirmatory',consent_registry_verified:true,rights_registry_verified:true,
  split_frozen_before_evaluation:true
 })),/blinded judgments/);
});
test('Unverified or nonfinite model metrics fail validation',()=>{
 assert.throws(()=>validateEvidence(manifest([mk({metrics:{inference_ms:NaN}})])),/nonfinite/);
 assert.throws(()=>validateEvidence(manifest([mk({metrics:{inference_ms:12,network_requests_external:0}})])),/nonfinite/);
});
test('External calls or outside-mask edits become explicit failure flags',()=>{
 const r=validateEvidence(manifest([mk({
  metrics:{inference_ms:1,outside_mask_changed_pixels:14,network_requests_external:1}
 })]));
 assert.equal(r.outside_mask_changed_pixels,14);
 assert.equal(r.external_requests,1);assert.equal(r.issues.length,3);
});
test('Median latency computed only from successful cases with rejections included in rate',()=>{
 const r=validateEvidence(manifest([mk({metrics:{inference_ms:2,outside_mask_changed_pixels:0,network_requests_external:0}}),
  mk({sample_id:'s2',seed:20,source_image_sha256:h('c'),metrics:{inference_ms:8,outside_mask_changed_pixels:0,network_requests_external:0}}),
  mk({sample_id:'s3',seed:21,source_image_sha256:h('d'),status:'failed',failure_reason:'OOM'})]));
 assert.equal(r.methods['migan-baseline'].median_inference_ms,5);
 assert.equal(r.methods['migan-baseline'].success_fraction,2/3);
});
test('Never admit raw image payloads in metadata manifest',()=>{
 assert.throws(()=>validateEvidence(manifest([mk()],{includes_images:true})),/images/);
});

test('Bald-conversion placeholder cannot inflate independent reference-identity count',()=>{
 const r=validateEvidence(manifest([mk({reference_subject_id:'no-reference-hair-removal'})]));
 assert.equal(r.distinct_reference_people,0);
});
