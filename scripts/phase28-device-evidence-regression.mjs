import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfflineDeviceEvidence} from '../public/ai/migan/device-evidence.mjs';
const fixture=()=>({
 hair:{realSegmentation:true,realInpainting:true,outsideMaskChangedPixels:0,
  semanticGuardApplied:true,faceLandmarkGuardApplied:true,generatedHair:false,
  inferenceMs:1200,totalMs:3000,removedPixels:1400,semanticConflicts:10,
  predictedFaceSkinFraction:.24,
  portrait:'data:image/png;base64,PRIVATE_PORTRAIT',
  filename:'private-user-family.jpg',
  face:{eyeX:.5,eyeY:.5,eyes:['PRIVATE_LANDMARK']},
  rawHardwareId:'private'},
 transfer:{ok:true,diagnosticFlags:['fringe_occlusion_unresolved'],
  rgba:'PRIVATE_IMAGE_BYTES',referenceName:'person full name'},
 target:{ok:true,inferenceMs:900,unnecessaryErasureAvoided:14500,
  removalReductionFraction:.91,trace:'unsafe'},
 runtime:{isAndroid:true,disconnected:true,crossOriginIsolated:true,
  serviceWorkerControlled:true,deviceMemoryGiB:4,hardwareConcurrencyBucket:8,
  jsHeapUsedBytes:120000000,fullUserAgent:'unique-device-fingerprint',
  exactGeoLocation:'private geo'},
 offlinePackageReady:true
});
test('private image and device identifiers NEVER appear in evidence JSON',()=>{
 const e=createOfflineDeviceEvidence(fixture()),serial=JSON.stringify(e);
 assert.equal(e.ok,true);
 assert.equal(e.runtime.platformClass,'android');
 for(const forbidden of ['PRIVATE_PORTRAIT','PRIVATE_IMAGE_BYTES','PRIVATE_LANDMARK',
  'private-user-family','unique-device-fingerprint','person full name','private geo','rawHardwareId'])
  assert.equal(serial.includes(forbidden),false,forbidden);
 assert.equal(e.credibility.peakProcessMemoryMeasured,false);
 assert.equal(e.credibility.independentPhysicalHardwareConfirmation,false);
 assert.equal(e.androidGeneratorDeploymentApproved,false);
 assert.equal(e.commercialReleaseAllowed,false);
 assert.equal(e.targetAware.skippedUnnecessaryEdits,14500);
});
test('untrusted, incomplete or corrupted neural proof does not serialize metadata',()=>{
 const f=fixture();f.hair.realInpainting=false;
 assert.equal(createOfflineDeviceEvidence(f).ok,false);
 f.hair.realInpainting=true;f.hair.outsideMaskChangedPixels=2;
 assert.equal(createOfflineDeviceEvidence(f).ok,false);
 f.hair.outsideMaskChangedPixels=0;f.hair.generatedHair=true;
 assert.equal(createOfflineDeviceEvidence(f).ok,false);
});
test('unsupported memory API or weird performance floats are NULL, not certified',()=>{
 const f=fixture();f.runtime.jsHeapUsedBytes=undefined;
 f.runtime.hardwareConcurrencyBucket=Infinity;
 f.runtime.isAndroid=false;f.hair.inferenceMs=-1;
 f.transfer={ok:false};
 const e=createOfflineDeviceEvidence(f);
 assert.equal(e.runtime.jsHeapUsedBytes,null);
 assert.equal(e.runtime.hardwareConcurrencyBucket,null);
 assert.equal(e.measurement.neuralInpaintingMs,null);
 assert.equal(e.runtime.platformClass,'other');
 assert.equal(e.referencePreview.completed,false);
 assert.equal(e.runtime.approximateDeviceMemoryGiB,4);
});
test('offline browser signal is contextual, never independently verified',()=>{
 const f=fixture();f.runtime.disconnected=true;
 f.runtime.serviceWorkerControlled=true;
 const e=createOfflineDeviceEvidence(f);
 assert.equal(e.runtime.disconnectedAtExport,true);
 assert.equal(e.runtime.explicitOfflinePackageVerified,true);
 assert.equal(e.credibility.fullNetworkIsolationIndependentlyVerified,false);
 assert.equal(e.credibility.humanRatedPhotorealism,false);
});
