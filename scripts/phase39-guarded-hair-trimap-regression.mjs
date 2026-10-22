import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGuardedHairTrimap as trimap}
 from '../public/ai/migan/guarded-hair-trimap.mjs';
const W=128,H=128,N=W*H;
function fixture(){
 const hairRGBA=new Uint8ClampedArray(N*4);
 const guard=new Uint8Array(N),faceZones=new Uint8Array(N);
 for(let y=20;y<80;y++)for(let x=27;x<102;x++)
  hairRGBA[4*(y*W+x)]=255;
 // The forehead is protected: no fake 'hair' can enter the face
 // even though the segmentation confidently calls it hair.
 for(let y=67;y<90;y++)for(let x=50;x<81;x++)
  faceZones[y*W+x]=2;
 for(let y=86;y<112;y++)for(let x=45;x<87;x++)
  guard[y*W+x]=1;
 return {hairRGBA,semanticVeto:{ok:true,editingAllowed:false,
  independentGroundTruth:false,guard,width:W,height:H},
  faceZones,width:W,height:H};
}
test('real trimap produces meaningful known hair/background/unknown, not alpha',()=>{
 const p=fixture(),hairBefore=p.hairRGBA.slice();
 const a=trimap(p),b=trimap(p);
 assert.equal(a.ok,true,a.reason);
 assert.deepEqual(a.trimap,b.trimap);
 assert.deepEqual(p.hairRGBA,hairBefore);
 assert.equal(a.trimap[40*W+45],255);
 assert.equal(a.trimap[20*W+27],128);
 assert.equal(a.trimap[18*W+30],128);
 assert.equal(a.trimap[5*W+6],0);
 assert.equal(a.trimap[75*W+67],0,'Protected forehead must never become hair or uncertain');
 assert.ok(a.metrics.foreground>100);
 assert.ok(a.metrics.unknown>100);
 assert.ok(a.metrics.background>100);
 assert.ok(a.metrics.originalPredictedHairProtectedConflicts>0);
 assert.equal(a.metrics.foreground+a.metrics.unknown+a.metrics.background,N);
 assert.equal(a.visualRGBA.length,N*4);
 assert.equal(a.exportAllowed,false);
 assert.equal(a.estimatedHairAlpha,false);
 assert.equal(a.neuralHairMattingExecuted,false);
 assert.equal(a.commercialReleaseAllowed,false);
});
test('face conflicts are surfaced and face protection overrides even high hair confidence',()=>{
 const p=fixture(),r=trimap(p);
 assert.equal(r.ok,true,r.reason);
 for(let y=67;y<90;y++)for(let x=50;x<81;x++)
  assert.equal(r.trimap[y*W+x],0);
 assert.ok(r.metrics.originalPredictedHairProtectedConflicts>200);
});
test('confidence uncertainty band never manufactures foreground',()=>{
 const p=fixture();
 for(let y=20;y<80;y++)for(let x=27;x<102;x++)
  p.hairRGBA[4*(y*W+x)]=140;
 const r=trimap(p);
 assert.equal(r.ok,false);
 assert.equal(r.neuralHairMattingExecuted,false);
 assert.equal(r.exportAllowed,false);
});
test('fail closed on model safety corruption, wrong input and invalid thresholds',()=>{
 const p=fixture();
 p.semanticVeto.editingAllowed=true;
 assert.equal(trimap(p).ok,false);
 p.semanticVeto.editingAllowed=false;
 p.faceZones[0]=4;
 assert.equal(trimap(p).ok,false);
 p.faceZones[0]=0;
 p.hairRGBA=new Uint8Array(7);
 assert.equal(trimap(p).ok,false);
 const q=fixture();
 assert.throws(()=>trimap({...q,radius:0}),/Invalid/);
 assert.throws(()=>trimap({...q,foregroundThreshold:65}),/Invalid/);
 assert.throws(()=>trimap({...q,width:9000,height:9000}),/Invalid/);
});
