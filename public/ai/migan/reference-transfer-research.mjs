/*
 * OffHair Phase 25 — deterministic reference-guided 2D research preview.
 * This is NOT a generative hairstyle network, validated anatomy, or a
 * customer-approved result. It can show why generic bald inpainting plus a
 * segmented hairstyle still fails on many portraits.
 */
import {makeLandmarkFaceZones} from '../offhair-face-zones.mjs';

const finite=Number.isFinite;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(x,a,b)=>{const v=clamp((x-a)/(b-a),0,1);return v*v*(3-2*v);};
const invalid=(reason,diagnostics={})=>({
 ok:false,reason,previewOnly:true,exportAllowed:false,
 referenceHairstyleGenerated:false,realisticHairTransferVerified:false,
 ...diagnostics
});
function faceOK(face){
 return face&&['eyeX','eyeY','eyeSpan','eyeRollRadians','eyeDistance']
  .every(k=>finite(face[k]))&&face.eyeX>.13&&face.eyeX<.87&&
  face.eyeY>.16&&face.eyeY<.75&&face.eyeSpan>=.055&&
  face.eyeSpan<=.38&&face.eyeDistance>=.055&&face.eyeDistance<=.38;
}
function bilinear(rgba,width,height,x,y,channel){
 const X=clamp(x,0,width-1),Y=clamp(y,0,height-1),
  x0=Math.floor(X),y0=Math.floor(Y),x1=Math.min(width-1,x0+1),
  y1=Math.min(height-1,y0+1),a=X-x0,b=Y-y0;
 return (1-b)*((1-a)*rgba[4*(y0*width+x0)+channel]+
  a*rgba[4*(y0*width+x1)+channel])+
  b*((1-a)*rgba[4*(y1*width+x0)+channel]+
  a*rgba[4*(y1*width+x1)+channel]);
}
function linearBlend(base,donor,alpha){
 // Blending edge colors in approximate linear light avoids dark cut-out halos.
 const x=(base/255)**2.2,y=(donor/255)**2.2;
 return Math.round(255*(x*(1-alpha)+y*alpha)**(1/2.2));
}
/** No network calls and no mutation. Fail closed for missing skin/face protection. */
export function composeReferenceHairResearch({
 sourceRGBA,restoredRGBA,sourceHairRGBA,referenceRGBA,referenceHairRGBA,
 keepMask,semanticVeto,sourceFace,referenceFace,width,height,
 threshold=178,maxScale=1.6,maxRoll=.25,allowNoInpainting=false
}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||
  height<32||n>1024*1024||
  [sourceRGBA,restoredRGBA,sourceHairRGBA,referenceRGBA,referenceHairRGBA]
   .some(a=>!(a instanceof Uint8Array||a instanceof Uint8ClampedArray)||a.length!==4*n)||
  !(keepMask instanceof Uint8Array)||keepMask.length!==n)
  throw new TypeError('Invalid source, donor, mask or image dimensions');
 if(!Number.isInteger(threshold)||threshold<128||threshold>230||
  !finite(maxScale)||maxScale<1||maxScale>2||
  !finite(maxRoll)||maxRoll<0||maxRoll>.5||
  typeof allowNoInpainting!=='boolean')
  throw new TypeError('Invalid research alignment settings');
 if(!faceOK(sourceFace)||!faceOK(referenceFace))
  return invalid('Two reliable eye anchors required');
 const scale=sourceFace.eyeSpan/referenceFace.eyeSpan;
 const delta=referenceFace.eyeRollRadians-sourceFace.eyeRollRadians;
 if(scale<1/maxScale||scale>maxScale||Math.abs(delta)>maxRoll)
  return invalid('Face scale or roll outside 2D alignment limits',{scale,delta});
 if(semanticVeto?.ok!==true||semanticVeto.editingAllowed!==false||
  semanticVeto.independentGroundTruth!==false||
  semanticVeto.width!==width||semanticVeto.height!==height||
  !(semanticVeto.guard instanceof Uint8Array)||semanticVeto.guard.length!==n||
  semanticVeto.guard.some(x=>x!==0&&x!==1))
  return invalid('Missing or untrusted semantic face/skin protection');
 const zones=makeLandmarkFaceZones(sourceFace,width,height);
 if(!zones.ok)return invalid('Face landmarks insufficient to protect eyes, nose, ears and forehead');
 // Never accept a corrupted inpainting result that already modified skin,
 // background or any non-removal pixel.
 let removed=0,changedInside=0;
 for(let i=0;i<n;i++){
  const k=4*i,keep=keepMask[i];
  if(keep!==0&&keep!==255)throw new TypeError('Removal mask must be binary');
  if(keep===0){
   removed++;
   if(semanticVeto.guard[i]||zones.zones[i]===1)
    return invalid('Removal mask intersects predicted protected skin or face core');
   if(sourceRGBA[k]!==restoredRGBA[k]||sourceRGBA[k+1]!==restoredRGBA[k+1]||
    sourceRGBA[k+2]!==restoredRGBA[k+2])changedInside++;
  }else for(let c=0;c<4;c++)
   if(sourceRGBA[k+c]!==restoredRGBA[k+c])
    return invalid('Upstream inpainting modified pixels outside the removal region');
  if(sourceRGBA[k+3]!==restoredRGBA[k+3])
   return invalid('Upstream inpainting modified source transparency');
 }
 if((!removed&&!allowNoInpainting)||removed/n>.35)
  return invalid('Unsafe inpainting region');
 let donorHair=0,referenceClipped=0;
 const cos=Math.cos(delta),sin=Math.sin(delta);
 const sx=sourceFace.eyeX*width,sy=sourceFace.eyeY*height,
  rx=referenceFace.eyeX*width,ry=referenceFace.eyeY*height;
 // Check clipping in the reference -> source direction independently.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  if(referenceHairRGBA[4*(y*width+x)]<threshold)continue;
  donorHair++;
  const dx=(x-rx)*scale,dy=(y-ry)*scale;
  const px=sx+cos*dx+sin*dy,py=sy-sin*dx+cos*dy;
  if(px<0||px>=width||py<0||py>=height)referenceClipped++;
 }
 if(donorHair/n<.005||donorHair/n>.55)
  return invalid('Reference image hair support is implausible');
 const clipFraction=referenceClipped/donorHair;
 if(clipFraction>.08)
  return invalid('Too much transferred hairstyle would leave the image',{clipFraction});
 const output=new Uint8ClampedArray(restoredRGBA),opacity=new Uint8Array(n);
 let pasted=0,faceOverlaps=0,foreheadOverlaps=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,k=4*i;
  const dx=(x+.5-sx)/scale,dy=(y+.5-sy)/scale;
  const ux=rx+cos*dx-sin*dy-.5,uy=ry+sin*dx+cos*dy-.5;
  if(ux<0||uy<0||ux>=width-1||uy>=height-1)continue;
  const confidence=bilinear(referenceHairRGBA,width,height,ux,uy,0);
  if(confidence<95)continue;
  const alpha=smooth(confidence,95,220);
  if(alpha<=0)continue;
  if(semanticVeto.guard[i]||zones.zones[i]===1){faceOverlaps++;continue;}
  if(zones.zones[i]===2){foreheadOverlaps++;continue;}
  const applied=Math.round(alpha*255);
  if(applied<5)continue;
  opacity[i]=applied;pasted++;
  for(let c=0;c<3;c++)
   output[k+c]=linearBlend(restoredRGBA[k+c],
    bilinear(referenceRGBA,width,height,ux,uy,c),applied/255);
 }
 if(pasted/n<.002)return invalid('No viable donor hair outside protected zones',
  {pasted,faceOverlaps,foreheadOverlaps});
 let sourceHair=0,residualSourceHair=0;
 for(let i=0;i<n;i++){
  if(sourceHairRGBA[4*i]>=threshold){
   sourceHair++;
   if(keepMask[i]===255&&opacity[i]<160)residualSourceHair++;
  }
 }
 const remainingFraction=sourceHair?residualSourceHair/sourceHair:null;
 const diagnosticFlags=[];
 if(!removed)diagnosticFlags.push('all_original_hair_covered_by_opaque_donor_according_to_2d_proxy');
 if(remainingFraction===null)diagnosticFlags.push('missing_source_hair');
 else if(remainingFraction>.1)diagnosticFlags.push('visible_original_hair_risk');
 if(foreheadOverlaps>0)diagnosticFlags.push('fringe_occlusion_unresolved');
 if(faceOverlaps>0)diagnosticFlags.push('predicted_skin_occlusion_unresolved');
 if(clipFraction>.03)diagnosticFlags.push('reference_border_clipping_risk');
 return {ok:true,reason:'2D diagnostic preview only',rgba:output,opacity,
  width,height,previewOnly:true,exportAllowed:false,referenceHairstyleGenerated:false,
  realisticHairTransferVerified:false,requiresHumanReview:true,
  counts:{sourceHair,donorHair,removed,changedInside,pasted,
   residualSourceHair,faceOverlaps,foreheadOverlaps,referenceClipped},
  measures:{scale,rollDifferenceRadians:delta,referenceClippingFraction:clipFraction,
   exposedOriginalHairFraction:remainingFraction,pastedFraction:pasted/n},
  diagnosticFlags,protectedCoreVerifiedByGroundTruth:false,
  warning:'No synthesized strands, pose depth or reconstructed real scalp. Never use as an approved customer hairstyle.'};
}
