/*
 * Phase 32 — non-self-certifying diagnostic for alpha erosion, old-hair
 * exposure and rendered high-frequency texture. Pure local arrays, no
 * photo uploads, no identity, and NO realism or commercial certification.
 *
 * A lower RGB seam metric can be gamed by fading away all the donor hair;
 * compare it to source-hair coverage and detail loss before considering
 * any softer 2D reference-cutout research preview.
 */
const bytes=a=>a instanceof Uint8Array||a instanceof Uint8ClampedArray;
const finite=Number.isFinite;
const error=reason=>({ok:false,reason,qualityVerified:false,
  commercialReleaseAllowed:false,exportAllowed:false});
const pix=(a,i)=>i*4;
const gradient=(a,i,j)=>{
 const p=4*i,q=4*j;
 return (Math.abs(a[p]-a[q])+Math.abs(a[p+1]-a[q+1])+
  Math.abs(a[p+2]-a[q+2]))/3;
};
/**
 * Never auto-certifies customer quality. The *proxy* decision can reject
 * over-erasure and must be complemented by blinded real-person evaluation.
 */
export function auditHairEdgeRetention({
 baseline,variant,restoredRGBA,sourceHairRGBA,keepMask,semanticVeto,
 faceZones,width,height,opacityThreshold=160,
 minTotalOpacityRetention=.985,minErasedHairOpacityRetention=.97
}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||
  height<32||n>1024*1024||!Number.isInteger(opacityThreshold)||
  opacityThreshold<100||opacityThreshold>240||
  !finite(minTotalOpacityRetention)||minTotalOpacityRetention<.8||
  minTotalOpacityRetention>1||
  !finite(minErasedHairOpacityRetention)||minErasedHairOpacityRetention<.8||
  minErasedHairOpacityRetention>1)
  throw new TypeError('Invalid source or risk thresholds');
 if(!baseline?.ok||!variant?.ok||baseline.exportAllowed!==false||
  variant.exportAllowed!==false||baseline.previewOnly!==true||
  variant.previewOnly!==true||baseline.width!==width||baseline.height!==height||
  variant.width!==width||variant.height!==height||
  !bytes(baseline.rgba)||!bytes(variant.rgba)||
  baseline.rgba.length!==4*n||variant.rgba.length!==4*n||
  !bytes(baseline.opacity)||!bytes(variant.opacity)||
  baseline.opacity.length!==n||variant.opacity.length!==n||
  !bytes(restoredRGBA)||restoredRGBA.length!==4*n||
  !bytes(sourceHairRGBA)||sourceHairRGBA.length!==4*n||
  !(keepMask instanceof Uint8Array)||keepMask.length!==n)
  return error('Missing valid baseline, candidate or local hair buffers');
 if(semanticVeto?.ok!==true||semanticVeto.editingAllowed!==false||
  semanticVeto.independentGroundTruth!==false||
  semanticVeto.width!==width||semanticVeto.height!==height||
  !(semanticVeto.guard instanceof Uint8Array)||semanticVeto.guard.length!==n||
  !(faceZones instanceof Uint8Array)||faceZones.length!==n)
  return error('No reliable local face/skin veto');
 let alphaBefore=0,alphaAfter=0,erasedBefore=0,erasedAfter=0;
 let criticalExposures=0,criticalSourcePixels=0,alphaIncreases=0;
 let alteredOutsideSupport=0,alteredProtected=0,alphaViolations=0;
 let changedInsideSupport=0;
 const donor=new Uint8Array(n);
 for(let i=0;i<n;i++){
  const k=4*i,old=baseline.opacity[i],next=variant.opacity[i];
  if((keepMask[i]!==0&&keepMask[i]!==255)||
   semanticVeto.guard[i]>1||faceZones[i]>2)
   return error('Invalid binary semantic, face or inpainting mask');
  const protectedPixel=semanticVeto.guard[i]!==0||faceZones[i]!==0;
  if(old>0)donor[i]=1;
  alphaBefore+=old;alphaAfter+=next;
  if(next>old)alphaIncreases++;
  if(keepMask[i]===0&&sourceHairRGBA[k]>=178){
   erasedBefore+=old;erasedAfter+=next;
   if(old>=opacityThreshold){
    criticalSourcePixels++;
    if(next<opacityThreshold)criticalExposures++;
   }
  }
  let different=false;
  for(let c=0;c<4;c++){
   if(baseline.rgba[k+c]!==variant.rgba[k+c])different=true;
   if(c===3&&(baseline.rgba[k+c]!==restoredRGBA[k+c]||
     variant.rgba[k+c]!==restoredRGBA[k+c]))alphaViolations++;
   if(old===0&&(baseline.rgba[k+c]!==restoredRGBA[k+c]||
     variant.rgba[k+c]!==restoredRGBA[k+c]))alteredOutsideSupport++;
  }
  if(different){
   changedInsideSupport++;
   if(protectedPixel)alteredProtected++;
  }
  if(protectedPixel&&(old!==0||next!==0))alteredProtected++;
 }
 if(!alphaBefore||alphaIncreases||alteredOutsideSupport||alteredProtected||alphaViolations)
  return error('Candidate expanded edits, touched face/background or changed source alpha');
 // Same fixed set of neighbouring donor-support pixels. Texture gradient is
 // a raw RGB proxy confounded by original scalp tone; not strand accuracy.
 let textureBefore=0,textureAfter=0,texturePairs=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;
  if(!donor[i])continue;
  if(x+1<width&&donor[i+1]){
   textureBefore+=gradient(baseline.rgba,i,i+1);
   textureAfter+=gradient(variant.rgba,i,i+1);texturePairs++;
  }
  if(y+1<height&&donor[i+width]){
   textureBefore+=gradient(baseline.rgba,i,i+width);
   textureAfter+=gradient(variant.rgba,i,i+width);texturePairs++;
  }
 }
 const totalRetention=alphaAfter/alphaBefore,
  erasedRetention=erasedBefore?erasedAfter/erasedBefore:null;
 const warnings=[];
 if(totalRetention<minTotalOpacityRetention)warnings.push('donor_opacity_mass_loss');
 if(erasedRetention!==null&&erasedRetention<minErasedHairOpacityRetention)
  warnings.push('newly_reconstructed_scalp_visibility_risk');
 if(criticalExposures>0)warnings.push('newly_low_coverage_over_erased_source_hair');
 if(!texturePairs||textureBefore/Math.max(1,texturePairs)<.25)
  warnings.push('no_measurable_donor_strand_detail');
 else if(textureAfter/textureBefore<.85)
  warnings.push('loss_of_local_hair_texture_gradient_proxy');
 const proxyCheckPassed=warnings.length===0;
 return {
  ok:true,reason:'Bounded donor-layer opacity risk audit, NOT appearance verification',
  width,height,qualityVerified:false,humanPreferenceMeasured:false,
  verifiedSeparateHumanSubjects:false,commercialReleaseAllowed:false,
  exportAllowed:false,facePixelChanges:0,
  proxyCheckPassed,warnings,
  metrics:{
   donorOpacityRetentionFraction:totalRetention,
   erasedSourceHairOpacityRetentionFraction:erasedRetention,
   criticallyExposedSourceHairPixels:criticalExposures,
   highCoverageErasedSourcePixelsBefore:criticalSourcePixels,
   changedDonorSupportPixels:changedInsideSupport,
   hairInteriorNeighbourPairs:texturePairs,
   averageRGBNeighbourGradientBefore:texturePairs?textureBefore/texturePairs:null,
   averageRGBNeighbourGradientAfter:texturePairs?textureAfter/texturePairs:null,
   gradientEnergyRatio:textureBefore?textureAfter/textureBefore:null
  },
  caveat:'Alpha and pixel-gradient retention cannot establish natural-looking strands, scalp realism or correct hairstyle fit.'
 };
}
