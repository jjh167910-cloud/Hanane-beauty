/*
 * Phase 42 — photograph-local, independently supplied hair-alpha comparison.
 *
 * Critical: a matching PNG and checkbox are SELF-ATTESTATION, not evidence
 * that the labels were independently prepared, legally cleared or aligned.
 * No portraits, fingerprints or ground-truth bytes are exported.
 */
const isRGBA=x=>x instanceof Uint8Array||x instanceof Uint8ClampedArray;
const deny=reason=>({ok:false,reason,photographicGroundTruthVerified:false,
 independentlyLabeledHairVerified:false,commercialReleaseAllowed:false,
 exportAllowed:false});
export function readOpaqueGrayHairAlpha({
 maskRGBA,width,height,grayscaleTolerance=2
}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<64||height<64||n>1024*1024||
  !isRGBA(maskRGBA)||maskRGBA.length!==n*4||
  !Number.isInteger(grayscaleTolerance)||grayscaleTolerance<0||grayscaleTolerance>4)
  throw new TypeError('Invalid hair-alpha PNG dimensions or pixels');
 const alpha=new Float32Array(n);
 let fractional=0,nonGrayscale=0,transparent=0;
 for(let i=0;i<n;i++){
  const k=4*i,r=maskRGBA[k],g=maskRGBA[k+1],b=maskRGBA[k+2],a=maskRGBA[k+3];
  if(a!==255){transparent++;continue;}
  if(Math.max(r,g,b)-Math.min(r,g,b)>grayscaleTolerance){
   nonGrayscale++;continue;
  }
  const value=(r+g+b)/(3*255);
  alpha[i]=value;
  if(value>.025&&value<.975)fractional++;
 }
 if(transparent||nonGrayscale)return deny(
  'Mask must be fully opaque grayscale PNG encoding hair alpha in RGB; no colored labels/transparency');
 if(fractional<20)return deny(
  'Hair-only fractional alpha label required; a binary semantic mask cannot benchmark fine strands');
 return {ok:true,alpha,width,height,fractionalPixels:fractional,
  isTrueGroundTruthProven:false,licenseVerified:false};
}
export function assessLocalHairAlphaLabel({
 prediction,trimap,labelAlpha,semanticVeto,faceZones,
 width,height,claims,badErrorThreshold=.1
}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<64||height<64||n>1024*1024||
  !Number.isFinite(badErrorThreshold)||badErrorThreshold<=0||badErrorThreshold>=1)
  throw new TypeError('Invalid hair-label assessment dimensions');
 if(claims?.subjectPhotoConsent!==true||claims?.labelRightsSelfAttested!==true||
    claims?.hairOnlyMaskSelfAttested!==true||claims?.pixelAlignmentSelfAttested!==true||
    claims?.separateFromPredictionSelfAttested!==true)
  return deny('Explicit rights, hair-only label, source alignment and annotation independence attestations required');
 if(!prediction?.ok||prediction.exportAllowed!==false||
  prediction.alphaGroundTruth!==false||prediction.neuralHairMattingExecuted!==false||
  prediction.width!==width||prediction.height!==height||
  !(prediction.alpha instanceof Float32Array)||prediction.alpha.length!==n||
  !(prediction.valid instanceof Uint8Array)||prediction.valid.length!==n||
  !trimap?.ok||trimap.exportAllowed!==false||trimap.width!==width||
  trimap.height!==height||!(trimap.trimap instanceof Uint8Array)||
  trimap.trimap.length!==n||
  !(labelAlpha instanceof Float32Array)||labelAlpha.length!==n||
  semanticVeto?.ok!==true||semanticVeto.editingAllowed!==false||
  semanticVeto.independentGroundTruth!==false||
  !(semanticVeto.guard instanceof Uint8Array)||semanticVeto.guard.length!==n||
  !(faceZones instanceof Uint8Array)||faceZones.length!==n)
  return deny('Protected estimator, labelled alpha and independently generated face veto are required');
 let unknown=0,accepted=0,abstained=0,soft=0,softAccepted=0;
 let errorSum=0,errorSq=0,softError=0,aboveError=0,protectedLabelConflict=0;
 let hardHairDisagree=0,hardBgDisagree=0;
 let fractionalTruthCount=0;
 const heatmapRGBA=new Uint8ClampedArray(n*4);
 for(let i=0;i<n;i++){
  const k=i*4,t=trimap.trimap[i],gt=labelAlpha[i],
   v=prediction.valid[i],a=prediction.alpha[i],
   protectedFace=semanticVeto.guard[i]!==0||faceZones[i]!==0;
  if(![0,128,255].includes(t)||!Number.isFinite(gt)||gt<0||gt>1||
    !Number.isFinite(a)||a<0||a>1||(v!==0&&v!==1)||
    semanticVeto.guard[i]>1||faceZones[i]>2)
   return deny('Nonphysical mask/face/alpha data');
  if(protectedFace&&t!==0)return deny('Predicted trimap changed protected facial skin');
  if(gt>.025&&gt<.975)fractionalTruthCount++;
  if(protectedFace&&gt>.05)protectedLabelConflict++;
  if(t===255){
   if(v!==1||a!==1)return deny('Known hair core was altered');
   if(gt<.95)hardHairDisagree++;
  }else if(t===0){
   if(v!==1||a!==0)return deny('Known background was altered');
   if(gt>.05)hardBgDisagree++;
  }else{
   unknown++;
   const isSoft=gt>.025&&gt<.975;
   if(isSoft)soft++;
   if(v===0){
    abstained++;
    heatmapRGBA.set([207,45,133,255],k);
    continue;
   }
   accepted++;
   const err=Math.abs(a-gt);
   errorSum+=err;errorSq+=err*err;
   if(err>badErrorThreshold)aboveError++;
   if(isSoft){softAccepted++;softError+=err;}
   const red=Math.round(Math.min(1,err/.3)*255);
   heatmapRGBA.set([red,Math.round(200*(1-err)),35,255],k);
   continue;
  }
  heatmapRGBA.set([53,65,71,255],k);
 }
 if(!unknown)return deny('No unknown hair-edge pixels to evaluate');
 if(!fractionalTruthCount)return deny('Label lacks any fractional opacity at the evaluated resolution');
 const coverage=accepted/unknown;
 const metrics={
  totalPixels:n,unknownPixels:unknown,acceptedPixels:accepted,abstainedPixels:abstained,
  coverage,selectiveMAE:accepted?errorSum/accepted:null,
  selectiveRMSE:accepted?Math.sqrt(errorSq/accepted):null,
  errorAboveThresholdRate:accepted?aboveError/accepted:null,
  fractionalTruthPixels:fractionalTruthCount,
  trueSoftEdgePixelsInUnknown:soft,acceptedSoftEdgePixels:softAccepted,
  softEdgeCoverage:soft?softAccepted/soft:null,
  selectiveSoftEdgeMAE:softAccepted?softError/softAccepted:null,
  definiteForegroundDisagreement:hardHairDisagree,
  definiteBackgroundDisagreement:hardBgDisagree,
  labelConflictsWithProtectedFacePixels:protectedLabelConflict,
  coverageErrorBothReported:true
 };
 return {
  ok:true,previewOnly:true,exportAllowed:false,commercialReleaseAllowed:false,
  photographicGroundTruthVerified:false,
  independentlyLabeledHairVerified:false,
  userSuppliedGroundTruthSelfAttested:true,
  hairAlphaLabelIsExternallyVerified:false,
  actualPortraitHairlineQualityProven:false,
  syntheticTestFixture:false,
  metrics,heatmapRGBA,
  warning:'Self-attested local label ONLY. This calculation cannot establish image ownership, independent annotation, subject identity, hair-only correctness or commercial rights. Protected-face/label conflicts are reported, not silently erased.'
 };
}
