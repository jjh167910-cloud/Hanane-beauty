import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAnnotation,CLASS_BITS} from '../public/ai/offhair-annotation-core.mjs';
import {compareIndependentLabels} from './offhair-annotation-agreement.mjs';
const W=64,H=64,N=W*H,b=CLASS_BITS;
function annotated(annotatorId,edits={}){
 const labels=new Uint8Array(N);
 for(let i=80;i<190;i++)labels[i]=b.protectedCore;
 for(let i=200;i<320;i++)labels[i]=b.targetHair;
 for(const [idx,value] of Object.entries(edits))labels[Number(idx)]=value;
 return makeAnnotation({labels,width:W,height:H,portraitSha256:'a'.repeat(64),
  subjectId:'subject-001',annotatorId,annotationId:'annotation-'+annotatorId,
  consentRecordId:'consent-unknown',rightsRecordId:'rights-unknown',
  annotationTimeUtc:'2026-10-21T18:00:00Z'});
}
test('Two independent identical labels show explicit non-certified agreement',()=>{
 const r=compareIndependentLabels(annotated('annotator-1'),annotated('annotator-2'));
 assert.equal(r.labelAgreement.protectedCore.iou,1);
 assert.equal(r.labelAgreement.targetHair.dice,1);
 assert.equal(r.validScientificGroundTruth,false);
 assert.equal(r.adjudicationRequired,true);
});
test('Disagreement is measured, not silently corrected',()=>{
 const r=compareIndependentLabels(annotated('annotator-1'),
  annotated('annotator-2',{81:b.targetHair,201:0}));
 assert.ok(r.labelAgreement.protectedCore.iou<1);
 assert.ok(r.labelAgreement.targetHair.iou<1);
 assert.ok(r.disagreeingLabelPixels>=2);
});
test('Uncertainty remains visible and is excluded from score',()=>{
 const r=compareIndependentLabels(annotated('annotator-1'),
  annotated('annotator-2',{81:b.uncertain}));
 assert.equal(r.uncertainPixels,1);
 assert.equal(r.evaluablePixels,N-1);
});
test('Never compare different source image digests or subject IDs',()=>{
 const a=annotated('annotator-1'),b0=annotated('annotator-2');
 assert.throws(()=>compareIndependentLabels(a,{...b0,portraitSha256:'b'.repeat(64)}),/exactly the same image/);
 assert.throws(()=>compareIndependentLabels(a,{...b0,subjectId:'subject-002'}),/exactly the same image/);
});
test('Do not mistake the same annotator for two independent raters',()=>{
 const a=annotated('annotator-1'),b0=annotated('annotator-1');
 assert.throws(()=>compareIndependentLabels(a,{...b0,annotationId:'another-annotation'}),/identical/);
});
