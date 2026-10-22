import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateMobileGeneratorPack,DEFAULT_MOBILE_GENERATOR_POLICY as P}
 from '../research/phase28/mobile-generator-feasibility.mjs';
const upstream=JSON.parse(fs.readFileSync(
  new URL('../research/phase28/hairfastgan-published-snapshot.json',import.meta.url),'utf8'));
const clean=()=>({
 schema:'HANANEH-MOBILE-MODEL-PACK-v1',
 id:'not-real-synthetic-gate-fixture',
 task:'reference-hairstyle-transfer',
 runtime:{target:'android-chromium-pwa',backend:'wasm',library:'onnxruntime-web'},
 inventoryComplete:true,
 reportedUpstreamBytes:100000,
 assets:[{path:'models/hair-generator.onnx',bytes:8*1024*1024,
  sha256:'f'.repeat(64),licenseReview:'independently-commercial-cleared',
  checkpointProvenance:'independently-reviewed'}],
 measurements:{platform:'physical-android-chrome',offlineModelAndPortraitRun:true,
  offlineExternalRequests:0,browserNoServerInference:true,
  peakProcessBytes:128*1024*1024,p95InferenceMs:1500},
 quality:{independentSubjectCount:10,blindedHumanFidelityApproved:true,
  faceIdentityIndependentReviewPassed:true,hairlineArtifactsReviewed:true}
});
test('official HairFastGAN TEACHER is no-go for offline mobile and licensing',()=>{
 const r=evaluateMobileGeneratorPack(upstream);
 assert.equal(r.candidateId,'HairFastGAN-official-unconverted-teacher');
 assert.equal(r.reportedUpstreamBytes,7730000000);
 for(const code of ['RUNTIME','INVENTORY','PUBLISHED_MODEL_SIZE','PHYSICAL_OFFLINE',
  'PEAK_MEMORY','LATENCY','INDEPENDENT_QUALITY','HAIRLINE'])
  assert.ok(r.blockers.includes(code),code);
 assert.equal(r.readyForAndroidDeployment,false);
 assert.equal(r.commercialReleaseAllowed,false);
});
test('seemingly good self-declared manifest never grants deployment or legal rights',()=>{
 const r=evaluateMobileGeneratorPack(clean());
 assert.equal(r.technicalPreflightPassed,true);
 assert.equal(r.modelBytesIndependentlyVerified,false);
 assert.equal(r.scientificImageQualityVerified,false);
 assert.equal(r.readyForAndroidDeployment,false);
 assert.equal(r.legalClearanceVerified,false);
 assert.equal(r.commercialReleaseAllowed,false);
});
test('no unknown right provenance, even with valid SHA metadata',()=>{
 const c=clean();c.assets[0].licenseReview='mit-looking-repository';
 const r=evaluateMobileGeneratorPack(c);
 assert.ok(r.blockers.includes('RIGHTS'));
 c.assets[0].licenseReview='independently-commercial-cleared';
 c.assets[0].checkpointProvenance='unknown';
 assert.ok(evaluateMobileGeneratorPack(c).blockers.includes('RIGHTS'));
});
test('duplicate, traversal, malformed sha, and unsupported Python weights are refused',()=>{
 let c=clean();c.assets.push({...c.assets[0]});
 assert.ok(evaluateMobileGeneratorPack(c).blockers.includes('ASSET_METADATA'));
 c=clean();c.assets[0].path='../steal.onnx';
 assert.ok(evaluateMobileGeneratorPack(c).blockers.includes('ASSET_METADATA'));
 c=clean();c.assets[0].sha256='nothash';
 assert.ok(evaluateMobileGeneratorPack(c).blockers.includes('ASSET_METADATA'));
 c=clean();c.assets[0].path='models/ffhq.pkl';
 assert.ok(evaluateMobileGeneratorPack(c).blockers.includes('ASSET_METADATA'));
 c=clean();c.assets[0].bytes=Number.MAX_SAFE_INTEGER+1;
 assert.ok(evaluateMobileGeneratorPack(c).blockers.includes('ASSET_METADATA'));
});
test('large even genuine ONNX fails realistic app package budget',()=>{
 const c=clean();c.assets[0].bytes=P.maxPackBytes+1;
 assert.ok(evaluateMobileGeneratorPack(c).blockers.includes('BROWSER_PACK_SIZE'));
 c.assets[0].bytes=8192;c.reportedUpstreamBytes=7730000000;
 assert.ok(evaluateMobileGeneratorPack(c).blockers.includes('PUBLISHED_MODEL_SIZE'));
});
test('non-offline online mode and missing physical memory measurements block app',()=>{
 const c=clean();c.measurements.offlineExternalRequests=1;
 assert.ok(evaluateMobileGeneratorPack(c).blockers.includes('PHYSICAL_OFFLINE'));
 c.measurements.offlineExternalRequests=0;
 c.measurements.peakProcessBytes=null;
 assert.ok(evaluateMobileGeneratorPack(c).blockers.includes('PEAK_MEMORY'));
 c.measurements.peakProcessBytes=128*1024*1024;
 c.measurements.p95InferenceMs=50000;
 assert.ok(evaluateMobileGeneratorPack(c).blockers.includes('LATENCY'));
});
test('insufficient independent portrait evidence blocks use',()=>{
 const c=clean();c.quality.independentSubjectCount=1;
 assert.ok(evaluateMobileGeneratorPack(c).blockers.includes('INDEPENDENT_QUALITY'));
 c.quality.independentSubjectCount=15;c.quality.hairlineArtifactsReviewed=false;
 const r=evaluateMobileGeneratorPack(c);
 assert.ok(r.blockers.includes('HAIRLINE'));
 assert.ok(r.blockers.includes('INDEPENDENT_QUALITY')===false,
  'Missing particular review is separately represented');
});
test('incomplete pack inventory and unknown task cannot pass by declaring low bytes',()=>{
 const c=clean();c.inventoryComplete=false;c.assets=[];
 const r=evaluateMobileGeneratorPack(c);
 assert.ok(r.blockers.includes('INVENTORY'));
 c.task='hair-segmentation';
 assert.ok(evaluateMobileGeneratorPack(c).blockers.includes('TASK'));
 assert.throws(()=>evaluateMobileGeneratorPack(c,{maxPackBytes:NaN}),/Invalid/);
});
