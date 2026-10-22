/*
 * OffHair Phase 31 — protective, non-generative donor-edge blending A/B.
 * Diffuses ONLY the outer 1-4 pixels of the already authorized donor-hair
 * cutout. Never expands support, removes old hair, invents scalp or modifies
 * semantic skin / facial landmarks. Proxy seam contrast is NOT realism.
 */
const isBytes=v=>v instanceof Uint8Array||v instanceof Uint8ClampedArray;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const linearBlend=(base,over,alpha)=>Math.round(255*Math.pow(
  (1-alpha)*Math.pow(base/255,2.2)+alpha*Math.pow(over/255,2.2),1/2.2));
const fail=(reason)=>({
 ok:false,reason,exportAllowed:false,referenceHairstyleGenerated:false,
 photorealismVerified:false
});
const luminanceDifference=(rgba,a,b)=>{
 let d=0;
 for(let c=0;c<3;c++)d+=Math.abs(rgba[a*4+c]-rgba[b*4+c]);
 return d/3;
};
function boundaryProxy(rgba,opacity,width,height){
 let sum=0,count=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;
  if(x+1<width){
   const j=i+1;
   if((opacity[i]===0)!==(opacity[j]===0)){
    sum+=luminanceDifference(rgba,i,j);count++;
   }
  }
  if(y+1<height){
   const j=i+width;
   if((opacity[i]===0)!==(opacity[j]===0)){
    sum+=luminanceDifference(rgba,i,j);count++;
   }
  }
 }
 return {pairs:count,meanRGBJump:count?sum/count:null};
}
/** Call only with the successful baseline result from composeReferenceHairResearch. */
export function refineReferenceHairEdgeResearch({
 baseline,restoredRGBA,semanticVeto,faceZones,width,height,
 radius=3,strength=.52
}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||
   n>1024*1024||!Number.isInteger(radius)||radius<1||radius>4||
   !Number.isFinite(strength)||strength<.1||strength>.8)
  throw new TypeError('Invalid hair-boundary experiment settings');
 if(!baseline?.ok||baseline.exportAllowed!==false||
  baseline.previewOnly!==true||baseline.width!==width||baseline.height!==height||
  !(baseline.rgba instanceof Uint8ClampedArray)||
  !isBytes(baseline.opacity)||baseline.opacity.length!==n||
  baseline.rgba.length!==n*4||
  !isBytes(restoredRGBA)||restoredRGBA.length!==n*4)
  return fail('Missing verified non-exportable baseline composition');
 if(semanticVeto?.ok!==true||semanticVeto.editingAllowed!==false||
  semanticVeto.independentGroundTruth!==false||
  semanticVeto.width!==width||semanticVeto.height!==height||
  !(semanticVeto.guard instanceof Uint8Array)||semanticVeto.guard.length!==n||
  !(faceZones instanceof Uint8Array)||faceZones.length!==n)
  return fail('Missing independent protective face and semantic model outputs');
 const source=baseline.rgba,opacity=baseline.opacity;
 let supported=0,forbidden=0;
 for(let i=0;i<n;i++){
  if(semanticVeto.guard[i]>1||faceZones[i]>2)
   return fail('Untrusted skin/face label values');
  if(opacity[i]){
   supported++;
   if(semanticVeto.guard[i]||faceZones[i]===1||faceZones[i]===2)
    forbidden++;
  }
  if(source[4*i+3]!==restoredRGBA[4*i+3])
   return fail('Baseline alpha integrity failure');
  if(opacity[i]===0)for(let c=0;c<4;c++)
   if(source[4*i+c]!==restoredRGBA[4*i+c])
    return fail('Baseline edited pixels outside authorised donor support');
 }
 if(forbidden)return fail('Baseline already crosses protected source skin or facial features');
 if(supported<width*height*.002)return fail('Baseline lacks meaningful donor support');
 const result=new Uint8ClampedArray(source),newOpacity=new Uint8Array(opacity);
 let changed=0,softened=0,maxDelta=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,initial=opacity[i];if(!initial)continue;
  let nearest=radius+1;
  // Geometrically nearest protected/empty neighbour, not weighted by the
  // color of the portrait. Feather only a thin edge on the INSIDE.
  for(let dy=-radius;dy<=radius;dy++){
   const yy=y+dy;
   for(let dx=-radius;dx<=radius;dx++){
    const sq=dx*dx+dy*dy;if(sq>=nearest*nearest)continue;
    const xx=x+dx;
    if(xx<0||yy<0||xx>=width||yy>=height||
       opacity[yy*width+xx]===0)nearest=Math.sqrt(sq);
   }
  }
  if(nearest>radius)continue;
  const t=clamp(nearest/(radius+1),0,1);
  const eased=t*t*(3-2*t);
  const factor=1-strength*(1-eased);
  const adjusted=Math.min(initial,Math.round(initial*factor));
  if(adjusted===initial)continue;
  newOpacity[i]=adjusted;softened++;
  // Given C_initial=blend(R, D, a), blend(R, C_initial, b/a)
  // is equivalent to blend(R, D, b) in linear light. This reduces the
  // donor's contribution without synthesizing new image content.
  const ratio=adjusted/initial,k=i*4;
  for(let c=0;c<3;c++){
   const next=linearBlend(restoredRGBA[k+c],source[k+c],ratio);
   if(next!==source[k+c]){
    changed++;
    maxDelta=Math.max(maxDelta,Math.abs(next-source[k+c]));
    result[k+c]=next;
   }
  }
 }
 const before=boundaryProxy(source,opacity,width,height);
 const after=boundaryProxy(result,opacity,width,height);
 return {
  ok:true,reason:'Non-generative inner-boundary matting research only',
  rgba:result,opacity:newOpacity,width,height,
  exportAllowed:false,previewOnly:true,referenceHairstyleGenerated:false,
  photorealismVerified:false,realHumanPreferenceMeasured:false,
  protectedPixelChanges:0,externalInferenceCalls:0,
  counts:{supported,softenedPixels:softened,changedColorChannels:changed,
   maximumChannelDelta:maxDelta,boundaryPairs:before.pairs},
  measures:{radius,strength,boundaryMeanRGBJumpBefore:before.meanRGBJump,
   boundaryMeanRGBJumpAfter:after.meanRGBJump,
   boundaryJumpDelta:before.meanRGBJump===null||after.meanRGBJump===null?
    null:after.meanRGBJump-before.meanRGBJump},
  diagnosticFlags:[...(baseline.diagnosticFlags||[]),
   'softened_inner_cutout_edge_not_new_hair',
   'boundary_jump_proxy_not_visual_quality'],
  warning:'This can lose strands or expose old hair and cannot resolve missing 3D hair geometry. Never use as customer-approved output.'
 };
}
