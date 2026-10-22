import test from 'node:test';
import assert from 'node:assert/strict';
import {inferGuardedHairAlphaColorLine as colorline}
 from '../public/ai/migan/hair-alpha-colorline-research.mjs';
import {refineGuardedHairAlphaLocalRGB as refine}
 from '../public/ai/migan/hair-alpha-local-regression.mjs';
import {auditHairAlphaRGBStability as stress}
 from '../public/ai/migan/hair-alpha-stability-gate.mjs';
import {auditAlphaAgainstGroundTruth as assess}
 from './alpha-quality-metrics.mjs';
const W=128,H=128,N=W*H;
function scene({noisy=false,flat=false,untrusted=false}={}){
 const sourceRGBA=new Uint8ClampedArray(N*4),classes=new Uint8Array(N),
  guard=new Uint8Array(N),faceZones=new Uint8Array(N),truth=new Float32Array(N);
 const F=flat?[115,120,117]:[43,35,27],B=flat?[124,124,126]:[214,198,166];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x,k=4*i;
  const border=50+5*Math.sin(x*.055);
  const opacity=Math.max(0,Math.min(1,(border-y)/13+.5));
  truth[i]=opacity;
  classes[i]=border-y>=8?255:border-y<=-8?0:128;
  for(let c=0;c<3;c++){
   const jitter=noisy&&classes[i]===128?(((x*31+y*19+c*47)%9)-4)*.7:0;
   sourceRGBA[k+c]=Math.round(Math.max(0,Math.min(255,opacity*F[c]+(1-opacity)*B[c]+jitter)));
  }
  sourceRGBA[k+3]=255;
 }
 for(let y=90;y<110;y++)for(let x=45;x<93;x++)guard[y*W+x]=1;
 const trimap={ok:true,width:W,height:H,exportAllowed:false,trimap:classes,
  estimatedHairAlpha:false,neuralHairMattingExecuted:false},
  semanticVeto={ok:true,width:W,height:H,independentGroundTruth:false,
   editingAllowed:false,guard};
 const baseline=colorline({sourceRGBA,trimap,semanticVeto,faceZones,
  width:W,height:H});
 assert.equal(baseline.ok,true,baseline.reason);
 if(!flat){
  // Pure test-only holdouts: make the earlier model abstain in a
  // deterministic subset even though those values originally existed.
  for(let i=0;i<N;i++)if(classes[i]===128&&baseline.valid[i]&&i%5===0){
   baseline.valid[i]=0;baseline.alpha[i]=0;
  }
 }
 const candidate=refine({sourceRGBA,baseline,trimap,semanticVeto,faceZones,
  width:W,height:H});
 assert.equal(candidate.ok,true,candidate.reason);
 if(untrusted)baseline.exportAllowed=true;
 return {sourceRGBA,baseline,candidate,trimap,semanticVeto,faceZones,
  width:W,height:H,truth};
}
test('two-sided RGB stress can only withdraw newly estimated alpha, never change original accepted values',()=>{
 const p=scene(),prior=p.candidate.alpha.slice(),priorValid=p.candidate.valid.slice(),
  source=p.sourceRGBA.slice(),original=p.baseline.alpha.slice();
 const a=stress(p),b=stress(p);
 assert.equal(a.ok,true,a.reason);
 assert.deepEqual(a.alpha,b.alpha);assert.deepEqual(a.valid,b.valid);
 assert.ok(a.metrics.previouslyNewEstimatedPixels>20);
 assert.equal(a.metrics.previouslyNewEstimatedPixels,
  a.metrics.stressStableNewPixels+a.metrics.withdrawnUnstablePixels);
 assert.ok(a.metrics.finalStressGatedCoverage<=a.metrics.originalPhase43Coverage);
 assert.equal(a.metrics.remainingAbstentions+a.metrics.finalAcceptedPixels,
  a.metrics.unknownPixels);
 assert.equal(a.metrics.originalPhase40PixelsModified,0);
 assert.equal(a.metrics.protectedFacePixelsModified,0);
 assert.equal(a.hairAlphaGroundTruthVerified,false);
 assert.equal(a.photorealismVerified,false);
 assert.equal(a.exportAllowed,false);
 assert.deepEqual(p.sourceRGBA,source);
 assert.deepEqual(p.candidate.alpha,prior);assert.deepEqual(p.candidate.valid,priorValid);
 assert.deepEqual(p.baseline.alpha,original);
 for(let i=0;i<N;i++){
  if(p.baseline.valid[i]){
   assert.equal(a.valid[i],1);assert.equal(a.alpha[i],p.baseline.alpha[i]);
  }
  if(p.trimap.trimap[i]!==128){
   assert.equal(a.valid[i],1);
   assert.equal(a.alpha[i],p.trimap.trimap[i]===255?1:0);
  }
  if(p.semanticVeto.guard[i]||p.faceZones[i]){
   assert.equal(a.alpha[i],0);assert.equal(a.valid[i],1);
  }
 }
 const againstGroundTruth=assess({prediction:a,groundTruthAlpha:p.truth,
  trimap:p.trimap.trimap,width:W,height:H});
 assert.equal(againstGroundTruth.ok,true,againstGroundTruth.reason);
 assert.equal(againstGroundTruth.metrics.coverage,
  a.metrics.finalStressGatedCoverage);
 console.log('PHASE44 STABILITY SYNTHETIC MEASUREMENT '+JSON.stringify({
  originalCoverage:a.metrics.originalPhase43Coverage,
  gatedCoverage:a.metrics.finalStressGatedCoverage,
  retainedHypotheses:a.metrics.stressStableNewPixels,
  withdrawn:a.metrics.withdrawnUnstablePixels,
  syntheticSelectiveMAE:againstGroundTruth.metrics.estimatedMeanAbsoluteError,
  realHairAlphaTruthMeasured:false}));
});
test('busy but plausible RGB has explicit failure/withdrawal reason counts',()=>{
 const p=scene({noisy:true});const a=stress({...p,perturbation:5,maxAlphaDrift:.018});
 assert.equal(a.ok,true,a.reason);
 assert.equal(a.metrics.withdrawnUnstablePixels,
  a.metrics.failedPerturbedModel+a.metrics.excessAlphaDrift);
 assert.ok(a.metrics.stressStableNewPixels>=0);
 assert.equal(a.metrics.maxAllowedAlphaDrift,.018);
 assert.equal(a.commercialReleaseAllowed,false);
});
test('low contrast cannot be silently promoted to alpha',()=>{
 const p=scene({flat:true}),a=stress(p);
 assert.equal(a.ok,true,a.reason);
 assert.equal(a.metrics.previouslyNewEstimatedPixels,0);
 assert.equal(a.metrics.finalAcceptedPixels,0);
 assert.equal(a.metrics.stressStableNewPixels,0);
});
test('forged baseline, invalid protection and dimensions refuse',()=>{
 const p=scene({untrusted:true});assert.equal(stress(p).ok,false);
 p.baseline.exportAllowed=false;
 p.faceZones[0]=9;assert.equal(stress(p).ok,false);
 p.faceZones[0]=0;p.baseline.alpha[0]=.4;
 assert.equal(stress(p).ok,false);
 const q=scene();
 assert.throws(()=>stress({...q,perturbation:15}),/Invalid/);
 assert.throws(()=>stress({...q,maxAlphaDrift:.4}),/Invalid/);
 assert.throws(()=>stress({...q,width:2048,height:2048}),/Invalid/);
});
