import test from 'node:test';
import assert from 'node:assert/strict';
import {MEDIA_PIPE_MULTICLASS,describeMulticlassLabels,compareHairModelMasks}
 from '../public/ai/offhair-multiclass-baseline.mjs';
const hair=(pixels)=>{const rgba=new Uint8Array(pixels.length*4);
 pixels.forEach((x,i)=>{rgba[i*4]=x?255:0;rgba[i*4+3]=255;});return rgba};
test('Labels obey the documented six-class category mapping',()=>{
 assert.deepEqual(Object.values(MEDIA_PIPE_MULTICLASS),[0,1,2,3,4,5]);
 const r=describeMulticlassLabels(Uint8Array.from([0,1,1,2,3,4,5,3]),4,2);
 assert.deepEqual(r.counts,[1,2,1,2,1,1]);
 assert.equal(r.faceSkinPixels,2);assert.equal(r.faceSkinFraction,.25);
});
test('Independent hair models show perfect agreement only with matching labels',()=>{
 const classes=Uint8Array.from([1,1,3,0]);
 const r=compareHairModelMasks(classes,2,2,hair([1,1,0,0]),2,2);
 assert.equal(r.crossModelHairIoU,1);
 assert.equal(r.skinConflictFractionOfOriginalHair,0);
 assert.equal(r.usableForAutomaticEditing,false);
});
test('Face-skin conflict does not silently count as hair or trusted ground truth',()=>{
 const r=compareHairModelMasks(Uint8Array.from([3,1,1,0]),2,2,
  hair([1,1,0,0]),2,2);
 assert.equal(r.crossModelHairIoU,1/3);
 assert.equal(r.hairInsideMulticlassFaceSkin,1);
 assert.equal(r.skinConflictFractionOfOriginalHair,.5);
 assert.equal(r.hasIndependentGroundTruth,false);
 assert.equal(r.facialCoreVerified,false);
});
test('Different mask resolutions use pixel-center nearest-neighbor correspondence',()=>{
 const h=hair([1,1,0,0,1,1,0,0,0,0,1,1,0,0,1,1]);
 const categories=Uint8Array.from([1,0,0,1]);
 const r=compareHairModelMasks(categories,2,2,h,4,4);
 assert.equal(r.crossModelHairIoU,1);
});
test('Invalid dimensions/classes never masquerade as zero model error',()=>{
 assert.throws(()=>describeMulticlassLabels(Uint8Array.from([1,2]),2,2),/Invalid/);
 assert.throws(()=>describeMulticlassLabels(Uint8Array.from([6]),1,1),/Unrecognized/);
 assert.throws(()=>compareHairModelMasks(Uint8Array.from([1]),2,2,hair([1]),1,1),/Malformed/);
 assert.throws(()=>compareHairModelMasks(Uint8Array.from([6]),1,1,hair([1]),1,1),/Unrecognized/);
});
test('Cross-model perfect agreement still does not imply anatomical correctness',()=>{
 const x=compareHairModelMasks(Uint8Array.from([1,1,1,1]),2,2,
  hair([1,1,1,1]),2,2);
 assert.equal(x.crossModelHairIoU,1);
 assert.equal(x.usableForAutomaticEditing,false);
 assert.equal(x.hasIndependentGroundTruth,false);
});
