import test from 'node:test';
import assert from 'node:assert/strict';
import {refineReferenceHairEdgeResearch as refine}
 from '../public/ai/migan/hair-boundary-refinement.mjs';
const W=96,H=96,N=W*H;
const fixture=()=>{
 const restoredRGBA=new Uint8ClampedArray(N*4),rgba=new Uint8ClampedArray(N*4),
  opacity=new Uint8Array(N),guard=new Uint8Array(N),faceZones=new Uint8Array(N);
 for(let i=0;i<N;i++){
  restoredRGBA.set([110,120,130,255],4*i);
  rgba.set([110,120,130,255],4*i);
 }
 for(let y=8;y<31;y++)for(let x=22;x<70;x++){
  const i=y*W+x,k=4*i;
  rgba.set([47,37,23,255],k);opacity[i]=255;
 }
 for(let y=44;y<76;y++)for(let x=30;x<65;x++)guard[y*W+x]=1;
 const baseline={ok:true,width:W,height:H,rgba,opacity,
  previewOnly:true,exportAllowed:false,diagnosticFlags:['fringe_occlusion_unresolved']};
 const semanticVeto={ok:true,width:W,height:H,guard,editingAllowed:false,
  independentGroundTruth:false};
 return {baseline,restoredRGBA,semanticVeto,faceZones,width:W,height:H};
};
test('non-generative interior feather reduces donor contribution only near original edges',()=>{
 const x=fixture(),a=refine(x),b=refine(x);
 assert.equal(a.ok,true,a.reason);
 assert.deepEqual(a.rgba,b.rgba);
 assert.ok(a.counts.softenedPixels>0);
 assert.ok(a.counts.changedColorChannels>0);
 assert.equal(a.counts.maximumChannelDelta>0,true);
 assert.equal(a.counts.boundaryPairs>0,true);
 assert.equal(a.measures.boundaryJumpDelta<0,true,
  'Synthetic high-contrast geometry should have a lower pixel-boundary jump');
 assert.equal(a.exportAllowed,false);
 assert.equal(a.referenceHairstyleGenerated,false);
 assert.equal(a.photorealismVerified,false);
 assert.equal(a.realHumanPreferenceMeasured,false);
 assert.deepEqual([...a.rgba.subarray((18*W+42)*4,(18*W+42)*4+3)],[47,37,23],
  'Interior hair texture cannot be changed');
 for(let i=0;i<N;i++){
  assert.ok(a.opacity[i]<=x.baseline.opacity[i],
   'Matting cannot add new hair or authorize new pixels');
  if(x.baseline.opacity[i]===0||x.semanticVeto.guard[i]||x.faceZones[i]){
   assert.equal(a.opacity[i],x.baseline.opacity[i]);
   assert.deepEqual(a.rgba.slice(i*4,i*4+4),x.baseline.rgba.slice(i*4,i*4+4));
  }
  assert.equal(a.rgba[i*4+3],255,'Preserve original transparency');
 }
 assert.equal(x.baseline.rgba[4*(8*W+22)],47,'Never mutate baseline input');
});
test('malformed baseline or unauthorized protected pixels fail closed',()=>{
 let x=fixture();x.baseline.rgba[0]=45;
 assert.equal(refine(x).ok,false,'Unapproved background edit must refuse');
 x=fixture();x.faceZones[8*W+22]=1;
 assert.equal(refine(x).ok,false,'Overlapping facial edit must refuse');
 x=fixture();x.semanticVeto.guard[9*W+23]=1;
 assert.equal(refine(x).ok,false,'Predicted face skin cannot accept hair');
 x=fixture();x.semanticVeto.independentGroundTruth=true;
 assert.equal(refine(x).ok,false,'Semantic provenance cannot be forged');
 x=fixture();x.baseline.exportAllowed=true;
 assert.equal(refine(x).ok,false,'Customer-approved baseline cannot be confused with research');
});
test('invalid dimensions, radius and excessive feather strength throw',()=>{
 const x=fixture();
 assert.throws(()=>refine({...x,radius:0}),/Invalid/);
 assert.throws(()=>refine({...x,radius:9}),/Invalid/);
 assert.throws(()=>refine({...x,strength:1}),/Invalid/);
 assert.throws(()=>refine({...x,width:4096,height:4096}),/Invalid/);
});
test('thin donor edges and image boundaries never create pixels outside mask',()=>{
 const x=fixture();
 x.baseline.rgba.set(x.restoredRGBA);
 x.baseline.opacity.fill(0);
 for(let y=0;y<5;y++)for(let xx=0;xx<80;xx++){
  const i=y*W+xx;
  x.baseline.opacity[i]=255;x.baseline.rgba.set([40,50,60,255],4*i);
 }
 const r=refine({...x,radius:4,strength:.7});
 assert.equal(r.ok,true,r.reason);
 for(let y=5;y<H;y++)for(let xx=0;xx<W;xx++){
  const i=y*W+xx;
  assert.equal(r.opacity[i],0);
  assert.deepEqual(r.rgba.slice(i*4,i*4+4),x.restoredRGBA.slice(i*4,i*4+4));
 }
});

test('guarded softening never drops originally erased source hair below required coverage',()=>{
 const q=fixture(),keepMask=new Uint8Array(N),sourceHairRGBA=new Uint8ClampedArray(N*4);
 keepMask.fill(255);
 const i=8*W+22;
 q.baseline.opacity[i]=170;
 keepMask[i]=0;sourceHairRGBA[4*i]=255;
 const ordinary=refine({...q,radius:3,strength:.8});
 const guarded=refine({...q,sourceHairRGBA,keepMask,
  protectErasedHair:true,radius:3,strength:.8});
 assert.equal(ordinary.ok,true);
 assert.equal(guarded.ok,true,guarded.reason);
 assert.ok(ordinary.opacity[i]<160,'Fixture should demonstrate exposure in naive feather');
 assert.ok(guarded.opacity[i]>=160,'Previously erased hair must not re-expose scalp');
 assert.ok(guarded.opacity[i]<=q.baseline.opacity[i]);
 assert.equal(guarded.exportAllowed,false);
 assert.equal(guarded.measures.protectErasedHair,true);
 for(let k=0;k<N;k++){
  assert.ok(guarded.opacity[k]<=q.baseline.opacity[k]);
  if(!q.baseline.opacity[k]){
   assert.deepEqual(guarded.rgba.slice(k*4,k*4+4),
    q.restoredRGBA.slice(k*4,k*4+4));
  }
 }
 const missing=refine({...q,protectErasedHair:true});
 assert.equal(missing.ok,false);
 const invalidMask=new Uint8Array(keepMask);invalidMask[i]=37;
 assert.equal(refine({...q,sourceHairRGBA,keepMask:invalidMask,
  protectErasedHair:true}).ok,false);
});
