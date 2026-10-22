// OffHair Phase 20: deterministic perturbation STRESS test of facial zone geometry.
// This is a sensitivity analysis, not calibrated confidence, not an anatomy ground truth,
// and NEVER grants permission to edit pixels or infer a person's private traits.
import {makeLandmarkFaceZones} from './offhair-face-zones.mjs';

const finite=Number.isFinite;
function validMask(mask,n){
 return (mask instanceof Uint8Array||mask instanceof Uint8ClampedArray)&&
  mask.length===n;
}
function shiftedFace(face,{dx=0,dy=0,scale=1,noseDx=0,noseDy=0,earDx=0}={}){
 const e=face.eyeDistance, sx=e*dx,sy=e*dy;
 const point=p=>({x:p.x+sx,y:p.y+sy});
 const eyes=face.eyes.map(point);
 const ears=face.earPoints?.map(point);
 return {...face,eyeX:face.eyeX+sx,eyeY:face.eyeY+sy,eyeDistance:e*scale,
  eyes,noseX:face.noseX+sx+e*noseDx,noseY:face.noseY+sy+e*noseDy,
  mouthX:face.mouthX+sx,mouthY:face.mouthY+sy,
  earPoints:ears?.map((p,i)=>({...p,x:p.x+(i===0?-1:1)*e*earDx}))};
}
export function studyLandmarkStability({face,width,height,hairMask,threshold=178,jitter=0.06}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||
    n>1024*1024||!validMask(hairMask,n))throw new TypeError('Invalid mask/dimensions');
 if(!Number.isInteger(threshold)||threshold<1||threshold>255||
    !finite(jitter)||jitter<0||jitter>.25)throw new TypeError('Invalid jitter policy');
 // Fixed, public, reproducible perturbation protocol; NOT a statistical model of FaceDetector errors.
 const j=jitter;
 const cases=[{},
  {dx:j},{dx:-j},{dy:j},{dy:-j},
  {dx:j,dy:j},{dx:-j,dy:-j},
  {scale:1+j},{scale:1-j},
  {noseDx:j},{noseDx:-j},{noseDy:j},{noseDy:-j},
  {earDx:j},{earDx:-j}];
 const zoneCounts=new Uint8Array(n),protectCounts=new Uint8Array(n),
  foreheadCounts=new Uint8Array(n);
 let valid=0,rejections=0;
 for(const perturb of cases){
  const item=makeLandmarkFaceZones(shiftedFace(face,perturb),width,height);
  if(!item.ok){rejections++;continue;}
  valid++;
  for(let i=0;i<n;i++){
   const z=item.zones[i];
   if(z===1)protectCounts[i]++;
   if(z===2)foreheadCounts[i]++;
   if(z!==0)zoneCounts[i]++;
  }
 }
 if(rejections||valid!==cases.length)return {
  ok:false,reason:'At least one perturbed face geometry is invalid: fail closed',
  invalidPerturbations:rejections,testedPerturbations:cases.length,
  eligibleForAutomaticEditing:false};
 let changedZones=0,hairPixels=0,
   hairWithAnyCoreRisk=0,hairWithGuaranteedCore=0,
   hairWithPotentialForehead=0,hairWithChangingZoning=0,
   hairSafeOutsideAllZones=0,
   coreUnion=0,coreIntersection=0,foreheadUnion=0;
 const overlay=new Uint8Array(n);
 for(let i=0;i<n;i++){
  const p=protectCounts[i],f=foreheadCounts[i],z=zoneCounts[i];
  if(p>0)coreUnion++;
  if(p===valid)coreIntersection++;
  if(f>0)foreheadUnion++;
  if((p>0&&p<valid)||(f>0&&f<valid))changedZones++;
  const hair=hairMask[i]>=threshold;
  if(!hair)continue;
  hairPixels++;
  if(p>0)hairWithAnyCoreRisk++;
  if(p===valid)hairWithGuaranteedCore++;
  if(f>0)hairWithPotentialForehead++;
  if(z>0&&z<valid)hairWithChangingZoning++;
  if(z===0)hairSafeOutsideAllZones++;
  // 1: any protected core (block); 2: forehead or sensitivity risk (manual only);
  // 3: no face-zone exposure in the tested perturbations (STILL not automatically safe).
  overlay[i]=p>0?1:(f>0?2:3);
 }
 return {ok:true,
  policy:'synthetic landmark perturbation stress; not calibrated uncertainty',
  jitterFractionOfEyeDistance:jitter,testedPerturbations:cases.length,
  invalidPerturbations:rejections,eligibleForAutomaticEditing:false,
  hasHumanValidatedLandmarks:false,
  counts:{maskPixels:n,hairPixels,changedZones,coreUnion,coreIntersection,
   foreheadUnion,hairWithAnyCoreRisk,hairWithGuaranteedCore,
   hairWithPotentialForehead,hairWithChangingZoning,hairSafeOutsideAllZones},
  fractions:{hairWithAnyCoreRisk:hairPixels?hairWithAnyCoreRisk/hairPixels:null,
   hairWithChangingZoning:hairPixels?hairWithChangingZoning/hairPixels:null,
   changedZones:changedZones/n},
  overlay,
  cautions:['No measured FaceDetector error distribution; sensitivity to synthetic jitter only.',
   'Crossing a forehead does not authorize editing eyes, nose, ears or identity features.',
   'Pixel labels are not independent evidence of actual human anatomy.']};
}
