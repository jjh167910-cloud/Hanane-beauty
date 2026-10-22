import test from 'node:test';
import assert from 'node:assert/strict';
import {inferGuardedHairAlphaColorLine as colorline}
 from '../public/ai/migan/hair-alpha-colorline-research.mjs';
import {refineGuardedHairAlphaLocalRGB as refine}
 from '../public/ai/migan/hair-alpha-local-regression.mjs';
import {auditAlphaAgainstGroundTruth as assess}
 from './alpha-quality-metrics.mjs';
const W=128,H=128,N=W*H;
function fixture({flat=false,injectOutlier=false}={}){
 const sourceRGBA=new Uint8ClampedArray(N*4),t=new Uint8Array(N),
  guard=new Uint8Array(N),faceZones=new Uint8Array(N),
  gt=new Float32Array(N);
 const F=flat?[103,103,103]:[38,51,63],
 B=flat?[110,108,107]:[209,195,161];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x,k=i*4;
  const edge=45+3*Math.sin(x/18);
  const delta=edge-y,a=Math.max(0,Math.min(1,delta/10+.5));
  gt[i]=a;t[i]=delta>=7?255:delta<=-7?0:128;
  for(let c=0;c<3;c++)sourceRGBA[k+c]=Math.round(F[c]*a+B[c]*(1-a));
  sourceRGBA[k+3]=255;
 }
 // The protected face is far below the hair edge and is always background.
 for(let y=85;y<112;y++)for(let x=42;x<91;x++)guard[y*W+x]=1;
 const trimap={ok:true,width:W,height:H,trimap:t,exportAllowed:false,
  neuralHairMattingExecuted:false,estimatedHairAlpha:false};
 const semanticVeto={ok:true,editingAllowed:false,independentGroundTruth:false,
  guard,width:W,height:H};
 const baseline=colorline({sourceRGBA,trimap,semanticVeto,faceZones,width:W,height:H});
 assert.equal(baseline.ok,true,baseline.reason);
 if(!flat){
  // Independent test-only dropout of originally well-supported pixels.
  // The local fitter must NOT feed its own newly estimated pixels back.
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const i=y*W+x;
   if(t[i]===128&&baseline.valid[i]&&((x+3*y)%7===0||
       (x+3*y)%7===1)){
    baseline.valid[i]=0;baseline.alpha[i]=0;
   }
  }
 }
 if(injectOutlier){
  for(let x=0;x<W;x+=11){
   const y=Math.round(45+3*Math.sin(x/18));
   const i=y*W+x,k=4*i;
   if(t[i]===128){
    baseline.valid[i]=0;baseline.alpha[i]=0;
    sourceRGBA.set([9,252,6,255],k);
   }
  }
 }
 return {sourceRGBA,baseline,trimap,semanticVeto,faceZones,width:W,height:H,truth:gt};
}
test('one-pass restores held-out fractional alpha without overwriting stage40 accepts',()=>{
 const p=fixture(),original=p.baseline.alpha.slice(),v=p.baseline.valid.slice(),input=p.sourceRGBA.slice();
 const a=refine(p),repeat=refine(p);
 assert.equal(a.ok,true,a.reason);
 assert.ok(a.metrics.newlyEstimatedPixels>15,JSON.stringify(a.metrics));
 assert.ok(a.metrics.newCoverage>a.metrics.originalCoverage);
 assert.equal(a.metrics.totalAcceptedPixels,
  a.metrics.originalAcceptedPixels+a.metrics.newlyEstimatedPixels);
 assert.equal(a.metrics.abstainedPixels+a.metrics.totalAcceptedPixels,a.metrics.unknownPixels);
 assert.deepEqual(a.alpha,repeat.alpha);assert.deepEqual(a.valid,repeat.valid);
 assert.deepEqual(p.baseline.alpha,original);
 assert.deepEqual(p.baseline.valid,v);assert.deepEqual(p.sourceRGBA,input);
 for(let i=0;i<N;i++){
  if(v[i]){assert.equal(a.valid[i],1);assert.equal(a.alpha[i],original[i]);}
  if(p.semanticVeto.guard[i]||p.faceZones[i]){
   assert.equal(a.alpha[i],0);assert.equal(a.valid[i],1);
  }
  if(p.trimap.trimap[i]!==128){
   assert.equal(a.alpha[i],p.trimap.trimap[i]===255?1:0);
  }
 }
 const baselineScore=assess({prediction:p.baseline,groundTruthAlpha:p.truth,
  trimap:p.trimap.trimap,width:W,height:H});
 const upgradedScore=assess({prediction:a,groundTruthAlpha:p.truth,
  trimap:p.trimap.trimap,width:W,height:H});
 assert.equal(baselineScore.ok,true);assert.equal(upgradedScore.ok,true);
 assert.ok(upgradedScore.metrics.coverage>baselineScore.metrics.coverage);
 assert.ok(upgradedScore.metrics.estimatedMeanAbsoluteError<.035);
 assert.equal(a.exportAllowed,false);
 assert.equal(a.independentlyValidatedHairAlpha,false);
 assert.equal(a.commercialReleaseAllowed,false);
 console.log('PHASE43 HELDOUT SYNTHETIC SELECTIVE-RISK '+JSON.stringify({
  baselineCoverage:baselineScore.metrics.coverage,
  enhancedCoverage:upgradedScore.metrics.coverage,
  baselineSelectiveMAE:baselineScore.metrics.estimatedMeanAbsoluteError,
  enhancedSelectiveMAE:upgradedScore.metrics.estimatedMeanAbsoluteError,
  photoGroundTruth:false,licensedNeuralWeightsUsed:0}));
});
test('contradictory saturated-colored outlier must not become plausible alpha',()=>{
 const p=fixture({injectOutlier:true}),r=refine(p);
 assert.equal(r.ok,true,r.reason);
 let outliers=0;
 for(let x=0;x<W;x+=11){
  const y=Math.round(45+3*Math.sin(x/18)),i=y*W+x;
  if(p.trimap.trimap[i]===128){
   outliers++;
   assert.equal(r.valid[i],0,'RGB outlier was falsely resolved x='+x);
  }
 }
 assert.ok(outliers>=5);
 assert.equal(r.metrics.baselinePixelsModified,0);
});
test('low-contrast data remains rejected, not magically new hair alpha',()=>{
 const p=fixture({flat:true}),r=refine(p);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.metrics.newlyEstimatedPixels,0);
 assert.equal(r.metrics.totalAcceptedPixels,0);
 assert.equal(r.metrics.newCoverage,0);
 assert.equal(r.photorealismVerified,false);
});
test('false protection, altered known classes or forged baseline fail safely',()=>{
 const p=fixture();
 p.faceZones[0]=3;
 assert.equal(refine(p).ok,false);
 p.faceZones[0]=0;
 p.baseline.exportAllowed=true;
 assert.equal(refine(p).ok,false);
 p.baseline.exportAllowed=false;
 p.baseline.alpha[0]=.6;
 assert.equal(refine(p).ok,false);
 p.baseline.alpha[0]=1;
 p.semanticVeto.editingAllowed=true;
 assert.equal(refine(p).ok,false);
});
test('bad dimension and unreasonable hyperparameters rejected',()=>{
 const p=fixture();
 assert.throws(()=>refine({...p,radius:25}),/Invalid/);
 assert.throws(()=>refine({...p,width:2048,height:2048}),/Invalid/);
 assert.throws(()=>refine({...p,maxCandidateResidual:100}),/Invalid/);
});
