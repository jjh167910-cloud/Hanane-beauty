import test from 'node:test';
import assert from 'node:assert/strict';
import {inferGuardedHairAlphaColorLine as infer}
 from '../public/ai/migan/hair-alpha-colorline-research.mjs';
import {auditAlphaAgainstGroundTruth as audit} from './alpha-quality-metrics.mjs';
const W=128,H=128,N=W*H;
function scene(kind){
 const sourceRGBA=new Uint8ClampedArray(4*N),hairMask=new Uint8Array(N),truth=new Float32Array(N);
 const guard=new Uint8Array(N),faceZones=new Uint8Array(N);
 const low=kind==='low-contrast',outlier=kind==='inconsistent-colors';
 const fg=low?[123,114,109]:[33,28,22],bg=low?[133,128,116]:[203,194,170];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x,k=4*i;
  const wave=(kind==='strand-wiggle'?4*Math.sin(x*.27)+2*Math.sin(x*.79):0);
  const edge=48+wave+(kind==='strand-wiggle'&&x%17<3?8:0);
  const d=edge-y;
  const a=Math.max(0,Math.min(1,d/8+.5));
  truth[i]=a;
  // Independently generated truth and a conservative 7px unknown band
  // on both sides of the hairline. There are real 0<a<1 pixels.
  hairMask[i]=d>=7?255:d<=-7?0:128;
  let colors=fg.map((v,c)=>v*a+bg[c]*(1-a));
  if(kind==='busy-background')
   colors=fg.map((v,c)=>v*a+(bg[c]+8*Math.sin(x*.37+c)+9*Math.sin(y*.14+c*.6))*(1-a));
  if(outlier&&hairMask[i]===128&&(x%7===0||x%7===1))colors=[20,250,20];
  for(let c=0;c<3;c++)
   sourceRGBA[k+c]=Math.max(0,Math.min(255,Math.round(colors[c])));
  sourceRGBA[k+3]=255;
 }
 for(let y=95;y<120;y++)for(let x=35;x<92;x++)guard[y*W+x]=1;
 return {
  width:W,height:H,sourceRGBA,groundTruthAlpha:truth,
  trimap:{ok:true,estimatedHairAlpha:false,neuralHairMattingExecuted:false,
   exportAllowed:false,width:W,height:H,trimap:hairMask},
  semanticVeto:{ok:true,editingAllowed:false,independentGroundTruth:false,
   guard,width:W,height:H},faceZones
 };
}
const names=['simple-straight','strand-wiggle','busy-background','low-contrast','inconsistent-colors'];
test('independently generated synthetic alpha scenes score BOTH error and abstention',()=>{
 const readings=[];
 for(const name of names){
  const p=scene(name),pixelBefore=p.sourceRGBA.slice();
  const pred=infer(p);assert.equal(pred.ok,true,`${name}: ${pred.reason}`);
  const score=audit({prediction:pred,groundTruthAlpha:p.groundTruthAlpha,
   trimap:p.trimap.trimap,width:W,height:H});
  assert.equal(score.ok,true,`${name}: ${score.reason}`);
  assert.equal(score.metrics.unknownPixels,pred.metrics.unknownPixels);
  assert.equal(score.metrics.estimatedPixels,pred.metrics.resolvedUnknownPixels);
  assert.equal(score.metrics.abstainedPixels,pred.metrics.unresolvedUnknownPixels);
  assert.ok(score.metrics.coverage>=0&&score.metrics.coverage<=1);
  assert.equal(score.metrics.meanErrorIfUnestimatedPixelsWereIncorrectlySetToZero,null);
  assert.deepEqual(p.sourceRGBA,pixelBefore);
  assert.equal(score.realHumanQualityVerified,false);
  assert.equal(score.commercialReleaseAllowed,false);
  readings.push({name,coverage:+score.metrics.coverage.toFixed(4),
   mae:score.metrics.estimatedMeanAbsoluteError===null?null:
    +score.metrics.estimatedMeanAbsoluteError.toFixed(4),
   softCoverage:+(score.metrics.softEdgeCoverage||0).toFixed(4),
   highRisk:score.metrics.aboveThresholdPixels});
 }
 assert.ok(readings.find(x=>x.name==='simple-straight').coverage>.8);
 assert.ok(readings.find(x=>x.name==='low-contrast').coverage<.2);
 assert.ok(readings.find(x=>x.name==='inconsistent-colors').coverage<readings[0].coverage);
 console.log('PHASE41 SYNTHETIC GROUND-TRUTH BENCHMARK '+JSON.stringify({
  syntheticOnly:true,independentFacePhotos:0,trainedWeights:0,scenes:readings}));
});
test('invalid ground truth, tampered known constraints, or false approval fail closed',()=>{
 const p=scene('simple-straight'),pred=infer(p);
 let gt=p.groundTruthAlpha.slice();gt[0]=NaN;
 assert.equal(audit({prediction:pred,groundTruthAlpha:gt,
  trimap:p.trimap.trimap,width:W,height:H}).ok,false);
 const forged={...pred,valid:pred.valid.slice(),alpha:pred.alpha.slice()};
 forged.alpha[0]=.6;
 assert.equal(audit({prediction:forged,groundTruthAlpha:p.groundTruthAlpha,
  trimap:p.trimap.trimap,width:W,height:H}).ok,false);
 forged.alpha[0]=pred.alpha[0];forged.exportAllowed=true;
 assert.equal(audit({prediction:forged,groundTruthAlpha:p.groundTruthAlpha,
  trimap:p.trimap.trimap,width:W,height:H}).ok,false);
});
test('all-abstained is NOT falsely high accuracy; no error becomes null',()=>{
 const p=scene('low-contrast'),pred=infer(p);
 const m=audit({prediction:pred,groundTruthAlpha:p.groundTruthAlpha,
  trimap:p.trimap.trimap,width:W,height:H});
 assert.equal(m.ok,true);assert.equal(m.metrics.coverage,0);
 assert.equal(m.metrics.estimatedMeanAbsoluteError,null);
 assert.equal(m.metrics.estimatedRootMeanSquaredError,null);
 assert.equal(m.metrics.abstentionFraction,1);
});
