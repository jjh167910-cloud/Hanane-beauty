/* Phase 41: independent ground-truth-only hair alpha error audit.
 * A nonexistent prediction is NOT zero-error. Abstentions remain explicit.
 * Synthetic ground truth does not validate real subjects or commercial use.
 */
const fail=reason=>({ok:false,reason,realHumanQualityVerified:false,commercialReleaseAllowed:false});
export function auditAlphaAgainstGroundTruth({prediction,groundTruthAlpha,trimap,width,height,badErrorThreshold=.1}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||n>1024*1024||
    !Number.isFinite(badErrorThreshold)||badErrorThreshold<=0||badErrorThreshold>=1)
  throw new TypeError('Invalid independent alpha audit geometry or risk threshold');
 if(!prediction?.ok||prediction.exportAllowed!==false||prediction.alphaGroundTruth!==false||
    !(prediction.alpha instanceof Float32Array)||prediction.alpha.length!==n||
    !(prediction.valid instanceof Uint8Array)||prediction.valid.length!==n||
    !(groundTruthAlpha instanceof Float32Array)||groundTruthAlpha.length!==n||
    !(trimap instanceof Uint8Array)||trimap.length!==n)
  return fail('Missing complete predicted alpha, separate validity and independent ground truth');
 let unknown=0,accepted=0,abstained=0,softUnknown=0,softAccepted=0;
 let abs=0,squared=0,softAbs=0,bad=0,softBad=0;
 let falseHair=0,falseBg=0;
 for(let i=0;i<n;i++){
  const t=trimap[i],gt=groundTruthAlpha[i],v=prediction.valid[i],a=prediction.alpha[i];
  if((t!==0&&t!==128&&t!==255)||!Number.isFinite(gt)||gt<0||gt>1||
     (v!==0&&v!==1)||!Number.isFinite(a)||a<0||a>1)
   return fail('Nonphysical ground truth, prediction or trimap input');
  if(t===0||t===255){
   if(v!==1||a!==(t===255?1:0))return fail('Known trimap class was not preserved exactly');
   continue;
  }
  unknown++;
  const soft=gt>.02&&gt<.98;
  if(soft)softUnknown++;
  if(!v){abstained++;continue;}
  accepted++;
  if(soft)softAccepted++;
  const e=Math.abs(a-gt);
  abs+=e;squared+=e*e;
  if(e>badErrorThreshold){bad++;if(soft)softBad++;}
  if(soft)softAbs+=e;
  if(gt<.1&&a>.9)falseHair++;
  if(gt>.9&&a<.1)falseBg++;
 }
 if(unknown<1||unknown!==accepted+abstained)return fail('No measurable unknown alpha region');
 return {
  ok:true,independentFromPrediction:true,syntheticGroundTruthOnly:true,
  realHumanQualityVerified:false,validatedNaturalHairStrands:false,
  commercialReleaseAllowed:false,
  metrics:{
   unknownPixels:unknown,estimatedPixels:accepted,abstainedPixels:abstained,
   coverage:accepted/unknown,abstentionFraction:abstained/unknown,
   estimatedMeanAbsoluteError:accepted?abs/accepted:null,
   estimatedRootMeanSquaredError:accepted?Math.sqrt(squared/accepted):null,
   errorAboveThresholdRate:accepted?bad/accepted:null,
   aboveThresholdPixels:bad,softEdgePixels:softUnknown,estimatedSoftPixels:softAccepted,
   softEdgeCoverage:softUnknown?softAccepted/softUnknown:null,
   estimatedSoftEdgeMeanAbsoluteError:softAccepted?softAbs/softAccepted:null,
   erroneousOpaquePredictions:falseHair,erroneousClearPredictions:falseBg,
   meanErrorIfUnestimatedPixelsWereIncorrectlySetToZero:null
  },
  caveat:'Selective error applies ONLY to accepted pixels. Report coverage jointly. Null errors must not be replaced by zero.'
 };
}