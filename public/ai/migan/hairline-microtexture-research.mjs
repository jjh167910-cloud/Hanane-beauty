/*
 * Phase 36: a strictly in-support donor-detail restoration experiment.
 * This nudges guarded-matted RGB back toward ACTUAL high-frequency texture
 * already present in the original aligned reference hair. It cannot create
 * wisps outside the donor support or reconstruct the person's hairline.
 * Not a pretrained hair model, not foreground color estimation/true matting,
 * not human-rated appearance evidence, not customer export.
 */
const isBytes=a=>a instanceof Uint8Array||a instanceof Uint8ClampedArray;
const fail=reason=>({ok:false,reason,exportAllowed:false,photorealismVerified:false,
 referenceHairstyleGenerated:false,independentHumanReviewPassed:false});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function restoreDonorHairlineDetailResearch({
 baseline,softened,sourceFace,semanticVeto,faceZones,
 width,height,gain=.6,maxDelta=9,bandRadius=3
}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<64||height<64||n>1024*1024||
  !Number.isFinite(gain)||gain<=0||gain>1||
  !Number.isInteger(maxDelta)||maxDelta<1||maxDelta>16||
  !Number.isInteger(bandRadius)||bandRadius<1||bandRadius>5)
  throw new TypeError('Invalid texture-recovery research settings');
 if(!baseline?.ok||!softened?.ok||baseline.previewOnly!==true||
  softened.previewOnly!==true||baseline.exportAllowed!==false||
  softened.exportAllowed!==false||
  baseline.width!==width||baseline.height!==height||
  softened.width!==width||softened.height!==height||
  !isBytes(baseline.rgba)||!isBytes(softened.rgba)||
  !isBytes(baseline.opacity)||!isBytes(softened.opacity)||
  baseline.rgba.length!==n*4||softened.rgba.length!==n*4||
  baseline.opacity.length!==n||softened.opacity.length!==n)
  return fail('Verified non-exportable donor baseline and guarded matting are required');
 const f=sourceFace;
 if(!f||![f.eyeX,f.eyeY,f.eyeDistance].every(Number.isFinite)||
  f.eyeX<.2||f.eyeX>.8||f.eyeY<.22||f.eyeY>.72||
  f.eyeDistance<.06||f.eyeDistance>.38)
  return fail('Invalid source forehead geometry');
 if(semanticVeto?.ok!==true||semanticVeto.editingAllowed!==false||
  semanticVeto.independentGroundTruth!==false||
  semanticVeto.width!==width||semanticVeto.height!==height||
  !(semanticVeto.guard instanceof Uint8Array)||semanticVeto.guard.length!==n||
  !(faceZones instanceof Uint8Array)||faceZones.length!==n)
  return fail('Independent face and predicted skin veto are required');
 const x0=clamp(Math.round((f.eyeX-1.2*f.eyeDistance)*width),1,width-2);
 const x1=clamp(Math.round((f.eyeX+1.2*f.eyeDistance)*width),1,width-2);
 const y0=clamp(Math.round((f.eyeY-1.8*f.eyeDistance)*height),2,height-2);
 const y1=clamp(Math.round((f.eyeY-.06*f.eyeDistance)*height),2,height-2);
 if(x1<=x0||y1<=y0)return fail('Forehead inspection region outside reliable geometry');
 for(let i=0;i<n;i++){
  if(semanticVeto.guard[i]>1||faceZones[i]>2)
   return fail('Corrupted skin/face protection');
  const a=baseline.opacity[i],b=softened.opacity[i],k=4*i;
  if(b>a)return fail('Earlier matting expanded donor opacity');
  if((a||b)&&(semanticVeto.guard[i]||faceZones[i]))
   return fail('Donor support overlaps protected face');
  if(baseline.rgba[k+3]!==softened.rgba[k+3])
   return fail('Matting changed original alpha');
  if(a===0)for(let c=0;c<4;c++){
   if(baseline.rgba[k+c]!==softened.rgba[k+c])
    return fail('Matting changed background outside donor support');
  }
 }
 const out=new Uint8ClampedArray(softened.rgba);
 let considered=0,textureSites=0,changedPixels=0,changedChannels=0;
 let maxObservedDelta=0;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const i=y*width+x,k=4*i;
  if(baseline.opacity[i]<128||softened.opacity[i]<128)continue;
  if(faceZones[i]||semanticVeto.guard[i])continue;
  // Stay at the LOWER foreground boundary, inside the existing donor mask.
  // True long wisps need support OUTSIDE the current mask: impossible here.
  let distance=bandRadius+1;
  for(let d=1;d<=bandRadius;d++)
   if(y+d>=height||baseline.opacity[i+d*width]<96){distance=d;break;}
  if(distance>bandRadius)continue;
  considered++;
  let didPixel=false;
  for(let c=0;c<3;c++){
   if(baseline.rgba[k+c]===softened.rgba[k+c])continue;
   let count=0,sum=0;
   // Only original reference-supported hair contributes to the texture
   // estimate; do not sample reconstructed skin, eyes, or background.
   for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++){
    if(xx<0||yy<0||xx>=width||yy>=height)continue;
    const j=yy*width+xx;
    if(baseline.opacity[j]<160||semanticVeto.guard[j]||faceZones[j])continue;
    sum+=baseline.rgba[4*j+c];count++;
   }
   if(count<4)continue;
   const detail=baseline.rgba[k+c]-sum/count;
   if(Math.abs(detail)<1.5)continue;
   const delta=clamp(Math.round(gain*detail),-maxDelta,maxDelta);
   if(!delta)continue;
   const next=clamp(softened.rgba[k+c]+delta,0,255);
   if(next===softened.rgba[k+c])continue;
   out[k+c]=next;changedChannels++;didPixel=true;
   maxObservedDelta=Math.max(maxObservedDelta,Math.abs(next-softened.rgba[k+c]));
  }
  if(didPixel){changedPixels++;textureSites++;}
 }
 return {
  ok:true,method:'in-mask-source-donor-microtexture-ablation',
  rgba:out,opacity:new Uint8Array(softened.opacity),width,height,
  previewOnly:true,exportAllowed:false,referenceHairstyleGenerated:false,
  photorealismVerified:false,independentHumanReviewPassed:false,
  protectedFaceEdits:0,addedHairSupportPixels:0,
  metrics:{consideredBoundaryPixels:considered,referenceTextureSites:textureSites,
   changedPixels,changedChannels,maxObservedDelta,gain,bandRadius},
  diagnosticFlags:[...(softened.diagnosticFlags||[]),
   'microtexture_only_existing_donor_not_new_strands',
   'suspicious_forehead_cutout_still_requires_human_review'],
  warning:'A bounded local high-pass colour adjustment is not real hairline reconstruction. More contrast may amplify artifacts. Research preview only.'
 };
}
