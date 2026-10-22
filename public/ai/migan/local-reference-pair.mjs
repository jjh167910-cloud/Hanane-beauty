/* Phase 30 — image-pair integrity guard for LOCAL reference hairstyle previews.
 * Pixel differences never establish distinct human identities, portrait
 * consent, benchmark independence or photo rights. No hashes or photos logged.
 */
const finite=Number.isFinite;
export function inspectLocalReferencePair({
 sourceRGBA,referenceRGBA,width,height
}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||
  height<32||n>1024*1024||
  !(sourceRGBA instanceof Uint8Array||sourceRGBA instanceof Uint8ClampedArray)||
  !(referenceRGBA instanceof Uint8Array||referenceRGBA instanceof Uint8ClampedArray)||
  sourceRGBA.length!==n*4||referenceRGBA.length!==n*4)
  throw new TypeError('Invalid in-memory image buffers');
 let changed=0,sum=0,invalidAlpha=0;
 for(let i=0;i<n;i++){
  const k=i*4;
  if(sourceRGBA[k+3]!==255||referenceRGBA[k+3]!==255)invalidAlpha++;
  const d=Math.abs(sourceRGBA[k]-referenceRGBA[k])+
   Math.abs(sourceRGBA[k+1]-referenceRGBA[k+1])+
   Math.abs(sourceRGBA[k+2]-referenceRGBA[k+2]);
  if(d)changed++;
  sum+=d;
 }
 if(invalidAlpha) return {ok:false,reason:'Nonopaque or invalid portrait pixels',
  differentPersonVerified:false,rightsVerified:false,
  locallyProcessed:true,commercialExportAllowed:false};
 if(!changed)return {ok:false,reason:'Source and reference are the identical rendered picture',
  differentPersonVerified:false,rightsVerified:false,
  locallyProcessed:true,commercialExportAllowed:false};
 // Intentionally do not publish pixel-level ratios, path, cryptographic
 // photo fingerprints or unique device identifiers in telemetry.
 return {ok:true,reason:'Two distinct rendered image buffers were provided',
  differentPictureObserved:true,
  differentPersonVerified:false,
  rightsVerified:false,
  consentIndependentlyVerified:false,
  photoHashExported:false,
  locallyProcessed:true,commercialExportAllowed:false};
}
