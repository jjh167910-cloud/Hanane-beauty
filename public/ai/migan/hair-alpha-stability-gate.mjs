/*
 * Phase 44 — local RGB perturbation stability gate for Phase43 NEW hypotheses.
 *
 * A modest pixel-level color perturbation checks whether a proposed alpha
 * is conditional on tiny changes to raw RGB. It is not a proof of correct
 * real hair alpha: a consistently wrong hypothesis can still be stable.
 * Never changes the user's portrait, the original accepted alpha, or the
 * protected-face / hard trimap classes.
 */
import {refineGuardedHairAlphaLocalRGB} from './hair-alpha-local-regression.mjs';
const isRGBA=x=>x instanceof Uint8Array||x instanceof Uint8ClampedArray;
const fail=reason=>({ok:false,reason,exportAllowed:false,
  hairAlphaGroundTruthVerified:false,photorealismVerified:false,
  commercialReleaseAllowed:false});
const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
function perturb(image,w,h,strength,polarity){
 const out=new Uint8ClampedArray(image);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const base=4*(y*w+x);
  for(let c=0;c<3;c++){
   // Deterministic spatial low-amplitude RGB noise. It deliberately
   // varies within a region (not a global color-offset invariance).
   let z=Math.imul(x+173,0x9e3779b1)^Math.imul(y+73,0x85ebca6b)^
    Math.imul(c+11,0xc2b2ae35);
   z^=z>>>16;z=Math.imul(z,0x7feb352d);z^=z>>>15;
   const dir=(z&1)?1:-1;
   out[base+c]=cap(image[base+c]+polarity*strength*dir,0,255);
  }
 }
 return out;
}
export function auditHairAlphaRGBStability({
 sourceRGBA,baseline,candidate,trimap,semanticVeto,faceZones,
 width,height,perturbation=3,maxAlphaDrift=.045
}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<64||
   height<64||n>1024*1024||
   !Number.isInteger(perturbation)||perturbation<1||perturbation>6||
   !Number.isFinite(maxAlphaDrift)||maxAlphaDrift<=0||
   maxAlphaDrift>.15)
  throw new TypeError('Invalid local RGB stability experiment settings');
 if(!isRGBA(sourceRGBA)||sourceRGBA.length!==4*n||
    !baseline?.ok||baseline.exportAllowed!==false||
    baseline.width!==width||baseline.height!==height||
    !(baseline.alpha instanceof Float32Array)||baseline.alpha.length!==n||
    !(baseline.valid instanceof Uint8Array)||baseline.valid.length!==n||
    !candidate?.ok||candidate.exportAllowed!==false||
    candidate.width!==width||candidate.height!==height||
    candidate.method!=='single-pass-accepted-pixel-local-RGB-conditional-regression'||
    !(candidate.alpha instanceof Float32Array)||candidate.alpha.length!==n||
    !(candidate.valid instanceof Uint8Array)||candidate.valid.length!==n||
    !trimap?.ok||trimap.exportAllowed!==false||trimap.width!==width||
    trimap.height!==height||!(trimap.trimap instanceof Uint8Array)||
    trimap.trimap.length!==n||
    semanticVeto?.ok!==true||semanticVeto.editingAllowed!==false||
    semanticVeto.independentGroundTruth!==false||
    semanticVeto.width!==width||semanticVeto.height!==height||
    !(semanticVeto.guard instanceof Uint8Array)||semanticVeto.guard.length!==n||
    !(faceZones instanceof Uint8Array)||faceZones.length!==n)
  return fail('Actual protected Phase40 baseline and Phase43 local-alpha hypotheses required');
 const t=trimap.trimap;
 let newlyAccepted=0,unknown=0,protectedPixels=0;
 for(let i=0;i<n;i++){
  const srcAlpha=sourceRGBA[4*i+3],base=baseline.alpha[i],
   c=candidate.alpha[i],v=baseline.valid[i],cv=candidate.valid[i],hard=t[i],
   guard=semanticVeto.guard[i]||faceZones[i];
  if(srcAlpha!==255||!Number.isFinite(base)||base<0||base>1||
     !Number.isFinite(c)||c<0||c>1||
     guard>2||faceZones[i]>2||semanticVeto.guard[i]>1||
     ![0,128,255].includes(hard)||![0,1].includes(v)||
     ![0,1].includes(cv))
   return fail('Corrupt RGB, alpha values or protected face/trimap state');
  if(guard){protectedPixels++;if(hard!==0)return fail('Hair overlaps protected face');}
  if(hard!==128&&(!v||!cv||base!==(hard===255?1:0)||c!==base))
   return fail('Definite hair/background was altered');
  if(v&&(cv!==1||c!==base))
   return fail('Original Phase40 accepted alpha cannot be overwritten');
  if(!v&&cv&&hard!==128)
   return fail('New estimates must stay inside trimap uncertainty band');
  if(hard===128){unknown++;if(!v&&cv)newlyAccepted++;}
 }
 // Recompute ONLY Phase43 using a deterministic, photo-local RGB stress.
 // The original accepted Phase40 anchor set and all photo alpha remain
 // immutable. No diffusion or feedback from newly inferred pixels.
 const plus=refineGuardedHairAlphaLocalRGB({
   sourceRGBA:perturb(sourceRGBA,width,height,perturbation,1),
   baseline,trimap,semanticVeto,faceZones,width,height
 });
 const minus=refineGuardedHairAlphaLocalRGB({
   sourceRGBA:perturb(sourceRGBA,width,height,perturbation,-1),
   baseline,trimap,semanticVeto,faceZones,width,height
 });
 if(!plus.ok||!minus.ok)return fail('RGB stress rerun refused: '+(plus.reason||minus.reason));
 const resultAlpha=new Float32Array(candidate.alpha),
  resultValid=new Uint8Array(candidate.valid);
 const diagnosticRGBA=new Uint8ClampedArray(4*n);
 let kept=0,withdrawn=0,failedOneOrBoth=0,excessDrift=0;
 let maxStableDrift=0;
 for(let i=0;i<n;i++){
  const k=i*4,hard=t[i],original=baseline.valid[i],
   isNew=!original&&candidate.valid[i]===1&&hard===128;
  if(isNew){
   const available=plus.valid[i]===1&&minus.valid[i]===1;
   const drift=available?Math.max(
    Math.abs(plus.alpha[i]-candidate.alpha[i]),
    Math.abs(minus.alpha[i]-candidate.alpha[i])):Infinity;
   if(!available||drift>maxAlphaDrift){
    resultValid[i]=0;resultAlpha[i]=baseline.alpha[i];
    withdrawn++;
    if(!available)failedOneOrBoth++;else excessDrift++;
    diagnosticRGBA.set([238,153,63,255],k); // orange withdrawn
   }else{
    kept++;maxStableDrift=Math.max(maxStableDrift,drift);
    diagnosticRGBA.set([39,168,151,255],k); // teal retained
   }
  }else if(hard===128&&candidate.valid[i]===0){
   diagnosticRGBA.set([210,50,113,255],k); // unresolved magenta
  }else{
   const v=Math.round(resultAlpha[i]*255);
   diagnosticRGBA.set([v,v,v,255],k);
  }
 }
 if(kept+withdrawn!==newlyAccepted)return fail('New-hypothesis accounting mismatch');
 // Never trust an optional summary object to count original anchors.
 let trueBaselineAccepted=0;
 for(let i=0;i<n;i++)if(t[i]===128&&baseline.valid[i]===1)trueBaselineAccepted++;
 return {
  ok:true,width,height,alpha:resultAlpha,valid:resultValid,diagnosticRGBA,
  method:'two-sided-local-RGB-stress-test-of-frozen-new-alpha-hypotheses',
  previewOnly:true,exportAllowed:false,commercialReleaseAllowed:false,
  alphaGroundTruth:false,neuralHairMattingExecuted:false,
  hairAlphaGroundTruthVerified:false,photorealismVerified:false,
  independentlyValidatedHairAlpha:false,actualNewHairGenerated:false,
  metrics:{
   unknownPixels:unknown,originalAcceptedPixels:trueBaselineAccepted,
   previouslyNewEstimatedPixels:newlyAccepted,stressStableNewPixels:kept,
   withdrawnUnstablePixels:withdrawn,
   failedPerturbedModel:failedOneOrBoth,excessAlphaDrift:excessDrift,
   originalPhase43AcceptedCount:trueBaselineAccepted+newlyAccepted,
   finalAcceptedPixels:trueBaselineAccepted+kept,
   remainingAbstentions:unknown-trueBaselineAccepted-kept,
   originalPhase43Coverage:unknown?(trueBaselineAccepted+newlyAccepted)/unknown:0,
   finalStressGatedCoverage:unknown?(trueBaselineAccepted+kept)/unknown:0,
   maximumSurvivingAlphaDrift:maxStableDrift,
   perturbationRGBLevels:perturbation,maxAllowedAlphaDrift:maxAlphaDrift,
   originalPhase40PixelsModified:0,protectedFacePixelsModified:0,
   protectedPixels
  },
  warning:'A passing small-noise stability check is not a correct real hair alpha label or evidence of photorealism. Orange means withdrawn. Magenta means unresolved. Only independently annotated hair alpha can establish error.'
 };
}
