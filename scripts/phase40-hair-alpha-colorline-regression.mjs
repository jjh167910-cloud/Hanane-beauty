import test from 'node:test';
import assert from 'node:assert/strict';
import {inferGuardedHairAlphaColorLine as infer}
 from '../public/ai/migan/hair-alpha-colorline-research.mjs';
const W=96,H=96,N=W*H,fg=[30,55,70],bg=[225,200,150];
function fixture(){
 const sourceRGBA=new Uint8ClampedArray(N*4),t=new Uint8Array(N),
   guard=new Uint8Array(N),faceZones=new Uint8Array(N);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x,k=4*i,alpha=x<=39?1:x>=47?0:(47-x)/8;
  t[i]=x<=39?255:x>=47?0:128;
  sourceRGBA.set(fg.map((v,c)=>Math.round(alpha*v+(1-alpha)*bg[c])).concat(255),k);
 }
 for(let y=70;y<91;y++)for(let x=58;x<87;x++)guard[y*W+x]=1;
 return {
  width:W,height:H,sourceRGBA,
  trimap:{ok:true,estimatedHairAlpha:false,neuralHairMattingExecuted:false,
   exportAllowed:false,width:W,height:H,trimap:t},
  semanticVeto:{ok:true,editingAllowed:false,independentGroundTruth:false,
   guard,width:W,height:H},faceZones
 };
}
test('color-line estimates true fractional opacity of controlled synthetic hair edge',()=>{
 const p=fixture(),input=p.sourceRGBA.slice(),r=infer(p);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.metrics.unknownPixels,H*7);
 assert.equal(r.metrics.resolvedUnknownPixels,H*7);
 assert.equal(r.metrics.unresolvedUnknownPixels,0);
 assert.equal(r.metrics.fractionalUnknownPixels,H*7);
 assert.ok(r.metrics.averageAcceptedRGBLineResidual<1);
 assert.equal(r.alpha[27*W+12],1);
 assert.equal(r.alpha[27*W+70],0);
 for(let x=40;x<=46;x++){
  const a=r.alpha[27*W+x];
  assert.ok(Math.abs(a-(47-x)/8)<.012,'synthetic alpha inaccurate at '+x+': '+a);
 }
 for(let i=0;i<N;i++)if(p.semanticVeto.guard[i]||p.faceZones[i]){
  assert.equal(r.alpha[i],0);
  assert.equal(r.valid[i],1);
 }
 assert.deepEqual(p.sourceRGBA,input);
 assert.deepEqual(infer(p).alpha,r.alpha);
 assert.equal(r.exportAllowed,false);
 assert.equal(r.neuralHairMattingExecuted,false);
 assert.equal(r.alphaGroundTruth,false);
 assert.equal(r.metrics.learnedModelWeightsUsed,0);
});
test('unsupported color becomes explicit pink abstention, never fake transparent alpha',()=>{
 const p=fixture();
 for(let y=0;y<H;y++){
  const i=(y*W+43)*4;
  p.sourceRGBA.set([20,247,20,255],i);
 }
 const r=infer(p);
 assert.equal(r.ok,true,r.reason);
 assert.ok(r.metrics.unresolvedUnknownPixels>=H);
 assert.equal(r.valid[25*W+43],0);
 assert.deepEqual(Array.from(r.diagnosticRGBA.slice(4*(25*W+43),4*(25*W+43)+4)),
  [210,50,113,255]);
 assert.equal(r.commercialReleaseAllowed,false);
});
test('face shield cannot be overridden by an untrusted hair trimap',()=>{
 const p=fixture();p.faceZones[41*W+42]=2;
 const r=infer(p);
 assert.equal(r.ok,false);
 assert.equal(r.exportAllowed,false);
 assert.equal(r.neuralHairMattingExecuted,false);
});
test('wrong dimensions, transparency, invalid trimap or veto refuse',()=>{
 let p=fixture();p.sourceRGBA[3]=10;
 assert.equal(infer(p).ok,false);
 p=fixture();p.trimap.trimap[20*W+40]=42;
 assert.equal(infer(p).ok,false);
 p=fixture();p.semanticVeto.editingAllowed=true;
 assert.equal(infer(p).ok,false);
 p=fixture();p.trimap.estimatedHairAlpha=true;
 assert.equal(infer(p).ok,false);
 p=fixture();p.trimap.trimap=new Uint8Array(1);
 assert.equal(infer(p).ok,false);
 p=fixture();assert.throws(()=>infer({...p,radius:100}),/Invalid/);
 assert.throws(()=>infer({...p,width:1024,height:1024}),/Invalid/);
});
