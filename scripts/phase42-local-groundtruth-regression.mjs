import test from 'node:test';
import assert from 'node:assert/strict';
import {readOpaqueGrayHairAlpha as decode,assessLocalHairAlphaLabel as assess}
 from '../public/ai/migan/hair-alpha-local-groundtruth.mjs';
import {inferGuardedHairAlphaColorLine as infer}
 from '../public/ai/migan/hair-alpha-colorline-research.mjs';
const W=96,H=96,N=W*H;
const F=[35,52,66],B=[220,205,180];
const permission={subjectPhotoConsent:true,labelRightsSelfAttested:true,
 hairOnlyMaskSelfAttested:true,pixelAlignmentSelfAttested:true,
 separateFromPredictionSelfAttested:true};
function sample(){
 const sourceRGBA=new Uint8ClampedArray(N*4),hairRGBA=new Uint8ClampedArray(N*4),
 t=new Uint8Array(N),guard=new Uint8Array(N),faceZones=new Uint8Array(N);
 const gt=new Float32Array(N);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x,k=4*i,v=x<36?1:x>=48?0:(48-x)/12;
  gt[i]=v;
  t[i]=x<36?255:x>=48?0:128;
  for(let c=0;c<3;c++)sourceRGBA[k+c]=Math.round(v*F[c]+(1-v)*B[c]);
  sourceRGBA[k+3]=255;hairRGBA[k]=t[i];
 }
 for(let y=65;y<85;y++)for(let x=68;x<88;x++)guard[y*W+x]=1;
 const semanticVeto={ok:true,editingAllowed:false,independentGroundTruth:false,
  width:W,height:H,guard};
 const trimap={ok:true,exportAllowed:false,width:W,height:H,trimap:t,
  estimatedHairAlpha:false,neuralHairMattingExecuted:false};
 const prediction=infer({sourceRGBA,trimap,semanticVeto,faceZones,width:W,height:H});
 assert.equal(prediction.ok,true,prediction.reason);
 const rgba=new Uint8ClampedArray(N*4);
 for(let i=0;i<N;i++){
  const v=Math.round(gt[i]*255);rgba.set([v,v,v,255],4*i);
 }
 return {rgba,gt,trimap,prediction,semanticVeto,faceZones,width:W,height:H};
}
test('independent grayscale mask decodes fractional alpha but cannot certify its provenance',()=>{
 const p=sample(),r=decode({maskRGBA:p.rgba,width:W,height:H});
 assert.equal(r.ok,true,r.reason);
 assert.ok(r.fractionalPixels>100);
 assert.equal(r.isTrueGroundTruthProven,false);
 assert.equal(r.licenseVerified,false);
 assert.ok(Math.abs(r.alpha[20*W+42]-.5)<.003);
 const before=p.rgba.slice();decode({maskRGBA:p.rgba,width:W,height:H});
 assert.deepEqual(p.rgba,before);
});
test('local alpha label error is numerical, jointly reported with abstentions and false-certification veto',()=>{
 const p=sample(),d=decode({maskRGBA:p.rgba,width:W,height:H});
 const result=assess({prediction:p.prediction,trimap:p.trimap,labelAlpha:d.alpha,
  semanticVeto:p.semanticVeto,faceZones:p.faceZones,width:W,height:H,
  claims:permission});
 assert.equal(result.ok,true,result.reason);
 assert.ok(result.metrics.coverage>.8);
 assert.ok(result.metrics.selectiveMAE<.01);
 assert.equal(result.metrics.coverageErrorBothReported,true);
 assert.equal(result.metrics.unknownPixels,
  result.metrics.acceptedPixels+result.metrics.abstainedPixels);
 assert.equal(result.photographicGroundTruthVerified,false);
 assert.equal(result.independentlyLabeledHairVerified,false);
 assert.equal(result.commercialReleaseAllowed,false);
 assert.equal(result.exportAllowed,false);
 assert.equal(result.heatmapRGBA.length,N*4);
 assert.equal(result.actualPortraitHairlineQualityProven,false);
 assert.equal(result.maskPlausibilityReviewRequired,false);
 assert.equal(result.scoreUsableAsHairQualityEvidence,false);
});
test('no image/mask consent, forged gt certainty or unreadable mask fails closed',()=>{
 const p=sample(),d=decode({maskRGBA:p.rgba,width:W,height:H});
 for(const field of Object.keys(permission)){
  const claims={...permission,[field]:false};
  assert.equal(assess({prediction:p.prediction,trimap:p.trimap,
   labelAlpha:d.alpha,semanticVeto:p.semanticVeto,faceZones:p.faceZones,
   width:W,height:H,claims}).ok,false);
 }
 const color=p.rgba.slice();color[1]=90;
 assert.equal(decode({maskRGBA:color,width:W,height:H}).ok,false);
 const trans=p.rgba.slice();trans[3]=0;
 assert.equal(decode({maskRGBA:trans,width:W,height:H}).ok,false);
 const binary=p.rgba.slice();
 for(let i=0;i<N;i++){
  const v=binary[i*4]>127?255:0;binary.set([v,v,v,255],i*4);
 }
 assert.equal(decode({maskRGBA:binary,width:W,height:H}).ok,false);
});
test('conflicting real hair labels on protected skin are counted, never edited',()=>{
 const p=sample(),d=decode({maskRGBA:p.rgba,width:W,height:H});
 const label=d.alpha.slice();
 const i=72*W+75;label[i]=.8;
 const before=p.prediction.alpha.slice();
 const r=assess({prediction:p.prediction,trimap:p.trimap,
  labelAlpha:label,semanticVeto:p.semanticVeto,faceZones:p.faceZones,
  width:W,height:H,claims:permission});
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.metrics.labelConflictsWithProtectedFacePixels,1);
 assert.equal(r.maskPlausibilityReviewRequired,false,
  'A single plausible hair-over-forehead wisp cannot force gross misalignment');
 assert.deepEqual(p.prediction.alpha,before);
 assert.equal(r.photographicGroundTruthVerified,false);
 p.trimap.trimap[i]=128;
 assert.equal(assess({prediction:p.prediction,trimap:p.trimap,
  labelAlpha:label,semanticVeto:p.semanticVeto,faceZones:p.faceZones,
  width:W,height:H,claims:permission}).ok,false);
});
test('all unknown abstentions produce null MAE, not fictitious zero error',()=>{
 const p=sample(),d=decode({maskRGBA:p.rgba,width:W,height:H});
 const prediction={...p.prediction,valid:p.prediction.valid.slice(),alpha:p.prediction.alpha.slice()};
 for(let i=0;i<N;i++)if(p.trimap.trimap[i]===128){prediction.valid[i]=0;prediction.alpha[i]=0;}
 const r=assess({prediction,trimap:p.trimap,labelAlpha:d.alpha,
  semanticVeto:p.semanticVeto,faceZones:p.faceZones,width:W,height:H,claims:permission});
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.metrics.coverage,0);
 assert.equal(r.metrics.selectiveMAE,null);
 assert.equal(r.metrics.selectiveRMSE,null);
 assert.equal(r.metrics.abstainedPixels,r.metrics.unknownPixels);
});

test('severely misaligned mask is marked unsuitable, never a quality score',()=>{
 const p=sample(),d=decode({maskRGBA:p.rgba,width:W,height:H});
 const fake=d.alpha.slice();
 // Incorrectly label the whole protected lower-face region as hair.
 for(let y=65;y<85;y++)for(let x=68;x<88;x++)fake[y*W+x]=.85;
 const report=assess({prediction:p.prediction,trimap:p.trimap,
  labelAlpha:fake,semanticVeto:p.semanticVeto,faceZones:p.faceZones,
  width:W,height:H,claims:permission});
 assert.equal(report.ok,true,report.reason);
 assert.equal(report.maskPlausibilityReviewRequired,true);
 assert.equal(report.metrics.severeFaceDisagreement,true);
 assert.equal(report.scoreUsableAsHairQualityEvidence,false);
 assert.equal(report.photographicGroundTruthVerified,false);
 assert.equal(report.exportAllowed,false);
});
