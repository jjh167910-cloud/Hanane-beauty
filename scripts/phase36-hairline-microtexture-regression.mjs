import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreDonorHairlineDetailResearch as recover}
 from '../public/ai/migan/hairline-microtexture-research.mjs';
const W=128,H=128,N=W*H;
function input(){
 const rgba=new Uint8ClampedArray(N*4),soft=new Uint8ClampedArray(N*4),
  opacity=new Uint8Array(N),alpha=new Uint8Array(N),
  guard=new Uint8Array(N),zones=new Uint8Array(N);
 for(let i=0;i<N;i++){
  rgba.set([170,150,135,255],4*i);
  soft.set([170,150,135,255],4*i);
 }
 for(let y=13;y<53;y++)for(let x=34;x<94;x++){
  const i=y*W+x,k=4*i,v=32+(x%6)*9;
  rgba.set([v,v+11,v+7,255],k);
  soft.set(y>=49?[v+5,v+16,v+12,255]:[v,v+11,v+7,255],k);
  opacity[i]=255;alpha[i]=y>=49?250:255;
 }
 for(let y=57;y<100;y++)for(let x=42;x<87;x++)guard[y*W+x]=1;
 return {
  baseline:{ok:true,previewOnly:true,exportAllowed:false,
   width:W,height:H,rgba,opacity,diagnosticFlags:['fringe_occlusion_unresolved']},
  softened:{ok:true,previewOnly:true,exportAllowed:false,
   width:W,height:H,rgba:soft,opacity:alpha,
   diagnosticFlags:['fringe_occlusion_unresolved']},
  sourceFace:{eyeX:.5,eyeY:.48,eyeDistance:.23},
  semanticVeto:{ok:true,editingAllowed:false,independentGroundTruth:false,
   width:W,height:H,guard},
  faceZones:zones,width:W,height:H
 };
}
test('genuine donor texture can modify the softened hairline, nowhere else',()=>{
 const p=input(),before=p.softened.rgba.slice();
 const a=recover(p),b=recover(p);
 assert.equal(a.ok,true,a.reason);
 assert.deepEqual(a.rgba,b.rgba);
 assert.ok(a.metrics.consideredBoundaryPixels>0);
 assert.ok(a.metrics.changedPixels>0);
 assert.ok(a.metrics.changedChannels>0);
 assert.ok(a.metrics.maxObservedDelta<=9);
 assert.equal(a.addedHairSupportPixels,0);
 assert.equal(a.protectedFaceEdits,0);
 assert.equal(a.exportAllowed,false);
 assert.equal(a.photorealismVerified,false);
 assert.equal(a.referenceHairstyleGenerated,false);
 assert.deepEqual(a.opacity,p.softened.opacity);
 assert.deepEqual(p.softened.rgba,before,'Input texture cannot be modified');
 for(let i=0;i<N;i++){
  const k=4*i;
  if(!p.baseline.opacity[i]||p.faceZones[i]||p.semanticVeto.guard[i]||i/W>=53){
   assert.deepEqual(a.rgba.slice(k,k+4),before.slice(k,k+4));
  }
  assert.equal(a.rgba[k+3],255);
 }
 assert.ok(a.diagnosticFlags.includes('suspicious_forehead_cutout_still_requires_human_review'));
});
test('flat donor cannot have invented new strands or false positive detail',()=>{
 const p=input();
 for(let y=13;y<53;y++)for(let x=34;x<94;x++){
  const i=4*(y*W+x);
  p.baseline.rgba.set([60,60,60,255],i);
  p.softened.rgba.set(y>=49?[64,64,64,255]:[60,60,60,255],i);
 }
 const r=recover(p);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.metrics.changedPixels,0);
 assert.equal(r.independentHumanReviewPassed,false);
});
test('all protected skin, face and outside-support modifications fail closed',()=>{
 let p=input();p.baseline.opacity[57*W+50]=255;
 assert.equal(recover(p).ok,false);
 p=input();p.softened.rgba[0]=12;
 assert.equal(recover(p).ok,false);
 p=input();p.baseline.opacity[18*W+45]=205;
 p.softened.opacity[18*W+45]=220;
 assert.equal(recover(p).ok,false);
 p=input();p.semanticVeto.guard[0]=8;
 assert.equal(recover(p).ok,false);
 p=input();p.softened.exportAllowed=true;
 assert.equal(recover(p).ok,false);
});
test('uncertain facial fit and invalid settings are rejected',()=>{
 const p=input();
 assert.equal(recover({...p,sourceFace:{...p.sourceFace,eyeY:0}}).ok,false);
 assert.throws(()=>recover({...p,maxDelta:200}),/Invalid/);
 assert.throws(()=>recover({...p,gain:2}),/Invalid/);
 assert.throws(()=>recover({...p,width:12}),/Invalid/);
});
