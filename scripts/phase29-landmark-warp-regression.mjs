import test from 'node:test';
import assert from 'node:assert/strict';
import {createConservativeLandmarkHairWarp as build}
 from '../public/ai/migan/landmark-hair-warp.mjs';
const face={
 eyeX:.5,eyeY:.47,eyeSpan:.20,eyeRollRadians:0,eyeDistance:.20,
 eyes:[{x:.40,y:.47},{x:.60,y:.47}],
 noseX:.5,noseY:.58,mouthX:.5,mouthY:.69,
 earPoints:[{x:.29,y:.53},{x:.71,y:.53}]
};
const params=()=>({sourceFace:face,
 referenceFace:{...face,
  noseX:.502,noseY:.58,mouthX:.502,
  earPoints:[{x:.276,y:.526},{x:.725,y:.534}]},
 width:512,height:512});
test('measured nonrigid fit reduces independent ear/nose feature mismatch',()=>{
 const p=params(),warp=build(p);
 assert.equal(warp.ok,true,warp.reason);
 assert.equal(warp.stats.anchorCount,6);
 assert.ok(warp.stats.preFitMeanPx>0);
 assert.ok(warp.stats.postFitMeanPx<warp.stats.preFitMeanPx,
  JSON.stringify(warp.stats));
 assert.ok(warp.stats.inputMaxResidualPx<=warp.stats.maxCorrectionPx);
 assert.equal(warp.verified3D,false);
 assert.equal(warp.photorealismVerified,false);
 assert.equal(warp.commercialReleaseAllowed,false);
 for(const [x,y] of [[0,0],[150,50],[256,165],[110,280],[450,360],[512,512]]){
  const q=warp.map(x,y);assert.ok(Number.isFinite(q.x)&&Number.isFinite(q.y));
 }
});
test('the same source and reference produces stable identity mapping',()=>{
 const p=params();p.referenceFace={...face};
 const warp=build(p);assert.equal(warp.ok,true,warp.reason);
 assert.equal(warp.stats.inputMaxResidualPx,0);
 for(const [x,y] of [[0,0],[250,120],[256,240],[512,500]]){
  const q=warp.map(x,y);assert.ok(Math.abs(q.x-x)<1e-8);assert.ok(Math.abs(q.y-y)<1e-8);
 }
});
test('rejects mismatched features, pose extrapolation and unreasonable shifts',()=>{
 let p=params();p.referenceFace={...p.referenceFace,earPoints:null};
 assert.equal(build(p).ok,false);
 p=params();p.referenceFace={...p.referenceFace,noseY:.40};
 assert.equal(build(p).ok,false);
 p=params();p.referenceFace={...p.referenceFace,earPoints:
  [{x:.10,y:.52},{x:.9,y:.54}]};
 assert.equal(build(p).ok,false);
 p=params();p.referenceFace={...p.referenceFace,eyeRollRadians:.45};
 assert.equal(build(p).ok,false);
 p=params();p.referenceFace={...p.referenceFace,eyeSpan:.045};
 assert.equal(build(p).ok,false);
});
test('refuses invalid frames and unsafe settings',()=>{
 assert.throws(()=>build({...params(),width:0}),/frame/);
 assert.throws(()=>build({...params(),width:4096,height:4096}),/frame/);
 assert.throws(()=>build({...params(),maxCorrectionRatio:10}),/settings/);
 const r=build(params());
 assert.equal(r.map(-1,0),null);
 assert.equal(r.map(0,NaN),null);
});
test('the mapping is deterministic under repeated evaluation',()=>{
 const a=build(params()),b=build(params());
 assert.equal(a.ok,true);assert.equal(b.ok,true);
 for(let y=0;y<512;y+=29)for(let x=0;x<512;x+=31)
  assert.deepEqual(a.map(x,y),b.map(x,y));
});
