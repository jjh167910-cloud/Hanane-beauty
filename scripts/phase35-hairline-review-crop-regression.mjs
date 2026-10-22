import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveMatchedHairlineReviewCrop as crop}
 from '../public/ai/migan/hairline-review-crop.mjs';
const face={eyeX:.5,eyeY:.47,eyeDistance:.20};
test('identical randomized A/B variants always get exactly same ROI and zoom',()=>{
 const a=crop({sourceFace:face,width:512,height:512});
 const b=crop({sourceFace:{...face},width:512,height:512});
 assert.equal(a.ok,true,a.reason);
 assert.deepEqual(a,b);
 assert.equal(a.zoom,3);
 assert.ok(a.rect.y<.47*512&&a.rect.y+a.rect.height>.47*512);
 assert.ok(a.rect.x<.4*512&&a.rect.x+a.rect.width>.6*512);
 assert.ok(a.output.width>a.rect.width*2);
 assert.ok(a.output.height>a.rect.height*2);
 assert.equal(a.qualityVerified,false);
 assert.equal(a.photorealismVerified,false);
 assert.equal(a.exportAllowed,false);
 assert.equal(a.candidateBasedCropSelection,false);
});
test('cropping is independent from image content and random side assignment',()=>{
 const a=crop({sourceFace:face,width:512,height:512,zoom:2});
 const b=crop({sourceFace:face,width:512,height:512,zoom:2});
 assert.deepEqual(a.rect,b.rect);
 assert.ok(a.rect.x>=0&&a.rect.y>=0);
 assert.ok(a.rect.x+a.rect.width<=512);
 assert.ok(a.rect.y+a.rect.height<=512);
 assert.equal(a.output.width,Math.round(a.rect.width*2));
});
test('reject yaw-equivalent margin clipping and unreliable facial geometry',()=>{
 const f={...face,eyeX:.75};
 const bad=crop({sourceFace:f,width:512,height:512});
 assert.equal(bad.ok,false);
 assert.equal(bad.commercialReleaseAllowed,false);
 assert.equal(crop({sourceFace:{...face,eyeY:.22},width:512,height:512}).ok,false);
 assert.equal(crop({sourceFace:{...face,eyeDistance:.04},width:512,height:512}).ok,false);
 assert.equal(crop({sourceFace:{...face,eyeX:NaN},width:512,height:512}).ok,false);
});
test('invalid dimensions and unbounded zoom refuse, not truncate silently',()=>{
 const p={sourceFace:face,width:512,height:512};
 assert.throws(()=>crop({...p,width:32}),/Invalid/);
 assert.throws(()=>crop({...p,width:5000}),/Invalid/);
 assert.throws(()=>crop({...p,zoom:12}),/Invalid/);
 assert.throws(()=>crop({...p,zoom:-1}),/Invalid/);
});
