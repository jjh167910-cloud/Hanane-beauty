import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASS_BITS,encodeRuns,decodeRuns,annotationCoverage,makeAnnotation,
 validateAnnotation,evaluateZones} from '../public/ai/offhair-annotation-core.mjs';
const W=64,H=64,N=W*H,SHA='a'.repeat(64);
const b=CLASS_BITS;
function labels(){
 const a=new Uint8Array(N);
 for(let y=10;y<40;y++)for(let x=10;x<40;x++)a[y*W+x]=b.protectedCore;
 for(let y=3;y<13;y++)for(let x=16;x<36;x++)a[y*W+x]|=b.occludableForehead;
 for(let y=0;y<22;y++)for(let x=4;x<30;x++)a[y*W+x]|=b.targetHair;
 a[20*W+20]|=b.uncertain;
 return a;
}
const args=l=>({labels:l,width:W,height:H,portraitSha256:SHA,
 subjectId:'subject-001',annotatorId:'annotator-001',consentRecordId:'consent-001',
 rightsRecordId:'rights-001',annotationId:'annotation-001',
 annotationTimeUtc:'2026-10-21T17:00:00Z',photoOrigin:'local_portrait'});
test('RLE is byte-reversible with all five overlapping bitplanes',()=>{
 const a=labels(),runs=encodeRuns(a,W,H),b=decodeRuns(runs,W,H);
 assert.deepEqual(b,a);assert.ok(runs.length<N);
});
test('Roundtrip export is metadata-only and cannot assert training rights',()=>{
 const r=makeAnnotation(args(labels()));
 assert.equal(r.includes_images,false);assert.equal(r.usable_for_training,false);
 assert.equal(r.external_rights_verified,false);assert.equal(r.runs[0].length,2);
 assert.deepEqual(validateAnnotation(r).labels,labels());
 assert.doesNotMatch(JSON.stringify(r),/data:image|base64|png|jpg/);
});
test('Reject injected portrait data, unauthorized rights fields and mutated coverage',()=>{
 const r=makeAnnotation(args(labels()));
 assert.throws(()=>validateAnnotation({...r,portrait_data:'data:image/png;base64,AA=='}),/disallowed/);
 assert.throws(()=>validateAnnotation({...r,usable_for_training:true}),/rights/);
 assert.throws(()=>validateAnnotation({...r,coverage:{...r.coverage,annotatedPixels:1}}),/coverage/);
});
test('Reject RLE overflow, truncation, malformed pixels and unknown bits',()=>{
 assert.throws(()=>decodeRuns([[0,N+1]],W,H),/RLE/);
 assert.throws(()=>decodeRuns([[0,N-1]],W,H),/length/);
 const m=labels();m[0]=32;
 assert.throws(()=>encodeRuns(m,W,H),/bitmask/);
});
test('Reject unknown consent and missing identifiers without importing photos',()=>{
 const r=args(labels());r.consentRecordId='';
 assert.throws(()=>makeAnnotation(r),/consentRecordId/);
 const q=args(labels());q.portraitSha256='abcd';
 assert.throws(()=>makeAnnotation(q),/SHA/);
});
test('Protection violations are recorded as critical errors even if overall IoU is high',()=>{
 const gt=labels(),pred=new Uint8Array(gt);
 pred[22*W+22]=b.targetHair;
 const e=evaluateZones(pred,gt,W,H);
 assert.ok(e.protectedCoreUnsafeEditPixels>=1);
 assert.equal(e.safetyCertified,false);
 assert.equal(e.scientificQualityCertified,false);
 assert.ok(e.regionMetrics.targetHair.iou<1);
});
test('Unlabeled and uncertain pixels do not artificially improve IoU',()=>{
 const gt=new Uint8Array(N);gt[10]=b.protectedCore;gt[11]=b.uncertain;
 const pred=new Uint8Array(N);pred[11]=b.protectedCore;
 const e=evaluateZones(pred,gt,W,H);
 assert.equal(e.evaluablePixels,1);
 assert.equal(e.protectedCorePixels,1);
 assert.equal(e.regionMetrics.protectedCore.recall,0);
 assert.equal(e.regionMetrics.protectedCore.iou,0);
});
test('Perfect annotation mask yields IoU 1 only for actually labeled positive classes',()=>{
 const gt=labels(),e=evaluateZones(gt,gt,W,H);
 assert.equal(e.regionMetrics.protectedCore.iou,1);
 assert.equal(e.regionMetrics.occludableForehead.iou,1);
 assert.equal(e.regionMetrics.targetHair.iou,1);
 assert.equal(e.regionMetrics.scalpReconstruction.iou,null);
});
test('Unlabeled-only ground truth gives null metrics, not a false success',()=>{
 const blank=new Uint8Array(N),result=evaluateZones(blank,blank,W,H);
 assert.equal(result.regionMetrics.protectedCore.iou,null);
 assert.equal(result.evaluablePixels,0);
});
test('Bitplane coverage tracks overlaps and each class independently',()=>{
 const c=annotationCoverage(labels(),W,H);
 assert.ok(c.overlappingLabels>0);
 assert.ok(c.layers.protectedCore>0);
 assert.ok(c.layers.targetHair>0);
 assert.equal(c.layers.scalpReconstruction,0);
});
test('Validate the export rejects modified metadata and extra fields',()=>{
 const x=makeAnnotation(args(labels()));
 assert.throws(()=>validateAnnotation({...x,foo:'untrusted'}),/disallowed/);
 assert.throws(()=>validateAnnotation({...x,encoding:'raw-photo'}),/schema/);
 assert.throws(()=>validateAnnotation({...x,studySplit:'test',annotationId:'bad id'}),/annotationId/);
});
