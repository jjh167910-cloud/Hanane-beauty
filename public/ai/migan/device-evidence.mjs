/**
 * Only coarse, explicitly whitelisted performance counters leave this module.
 * Never serialize the portrait, segmented hair pixels, face landmarks, paths,
 * samples, raw errors, user agent, phone model, or local file names.
 * This is a USER-INITIATED LOCAL DOWNLOAD, not analytics or an upload.
 */
const nn=(value,max=1e8)=>Number.isFinite(value)&&value>=0&&value<=max?Math.round(value):null;
const frac=value=>Number.isFinite(value)&&value>=0&&value<=1?
 Math.round(value*10000)/10000:null;
export function createOfflineDeviceEvidence({
  hair,transfer,target,runtime={},offlinePackageReady=false
}={}){
 const valid=hair?.realSegmentation===true&&hair.realInpainting===true&&
  hair.outsideMaskChangedPixels===0&&hair.semanticGuardApplied===true&&
  hair.faceLandmarkGuardApplied===true&&hair.generatedHair===false;
 if(!valid)return {ok:false,reason:'No trustworthy completed local neural experiment',
  commercialReleaseAllowed:false};
 const output={
  schema:'HANANEH-PHASE28-ANONYMOUS-DEVICE-EVIDENCE-v1',
  ok:true,
  scope:'MI-GAN hair removal + 2D reference preview, NOT generated hairstyle',
  runtime:{
   platformClass:runtime.isAndroid===true?'android':'other',
   disconnectedAtExport:runtime.disconnected===true,
   crossOriginIsolated:runtime.crossOriginIsolated===true,
   serviceWorkerControlled:runtime.serviceWorkerControlled===true,
   explicitOfflinePackageVerified:offlinePackageReady===true,
   approximateDeviceMemoryGiB:nn(runtime.deviceMemoryGiB,16),
   hardwareConcurrencyBucket:nn(runtime.hardwareConcurrencyBucket,16),
   // API may be unsupported or reflect only JS heap; not process memory.
   jsHeapUsedBytes:nn(runtime.jsHeapUsedBytes,2**34)
  },
  measurement:{
   neuralInpaintingMs:nn(hair.inferenceMs,3.6e6),
   totalHairRemovalMs:nn(hair.totalMs,3.6e6),
   sourceRemovalPixels:nn(hair.removedPixels,1048576),
   externalPhotoUploadObservedByThisModule:null,
   networkCapturePerformed:false,
   faceOutsideEditChangedPixels:nn(hair.outsideMaskChangedPixels,1048576),
   semanticMaskConflicts:nn(hair.semanticConflicts,1048576),
   faceSkinPredictionFraction:frac(hair.predictedFaceSkinFraction)
  },
  referencePreview:{
   completed:transfer?.ok===true,
   isGenerative:false,
   exportAllowed:false,
   predictedFaceOcclusionUnresolved:transfer?.diagnosticFlags?.includes(
    'predicted_skin_occlusion_unresolved')===true,
   predictedFringeOcclusionUnresolved:transfer?.diagnosticFlags?.includes(
    'fringe_occlusion_unresolved')===true
  },
  targetAware:{
   completed:target?.ok===true,
   inferenceMs:target?.ok===true?nn(target.inferenceMs,3.6e6):null,
   skippedUnnecessaryEdits:target?.ok===true?nn(target.unnecessaryErasureAvoided,1048576):null,
   reductionFraction:target?.ok===true?frac(target.removalReductionFraction):null,
   commercialExportAllowed:false
  },
  credibility:{
   onlyLimitedBrowserMetrics:true,
   fullNetworkIsolationIndependentlyVerified:false,
   peakProcessMemoryMeasured:false,
   photoContentExcluded:true,
   personallyIdentifyingDeviceFieldsExcluded:true,
   independentPhysicalHardwareConfirmation:false,
   humanRatedPhotorealism:false,
   modelLicensedForCommercialHairstyleGeneration:false
  },
  androidGeneratorDeploymentApproved:false,commercialReleaseAllowed:false
 };
 return output;
}
