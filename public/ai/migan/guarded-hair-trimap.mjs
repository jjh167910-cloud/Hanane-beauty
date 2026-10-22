/*
 * Phase 39: per-hair-segmentation TRIMAP for later licensed hair alpha
 * reconstruction. A tri-map is a set of labelled constraints, NOT an
 * inferred alpha matte or new strands. 0=known background, 128=unknown,
 * 255=known hair foreground. Protected face is always background.
 */
const byte=x=>x instanceof Uint8Array||x instanceof Uint8ClampedArray;
const deny=reason=>({ok:false,reason,estimatedHairAlpha:false,
  neuralHairMattingExecuted:false,realismVerified:false,
  exportAllowed:false,commercialReleaseAllowed:false});
export function makeGuardedHairTrimap({
 hairRGBA,semanticVeto,faceZones,width,height,
 radius=3,foregroundThreshold=240,backgroundThreshold=35
}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<64||
   height<64||n>1024*1024||!Number.isInteger(radius)||radius<2||
   radius>7||!Number.isInteger(foregroundThreshold)||
   foregroundThreshold<190||foregroundThreshold>255||
   !Number.isInteger(backgroundThreshold)||backgroundThreshold<0||
   backgroundThreshold>75||
   backgroundThreshold+50>=foregroundThreshold)
  throw new TypeError('Invalid trimap dimensions or priors');
 if(!byte(hairRGBA)||hairRGBA.length!==4*n||
    semanticVeto?.ok!==true||semanticVeto.editingAllowed!==false||
    semanticVeto.independentGroundTruth!==false||
    semanticVeto.width!==width||semanticVeto.height!==height||
    !(semanticVeto.guard instanceof Uint8Array)||
    semanticVeto.guard.length!==n||
    !(faceZones instanceof Uint8Array)||faceZones.length!==n)
  return deny('Source hair confidence, semantic skin and landmark face veto required');
 let conflict=0,protectedPixels=0,highConfidence=0;
 const allowed=new Uint8Array(n);
 for(let i=0;i<n;i++){
  if(faceZones[i]>2||semanticVeto.guard[i]>1)
   return deny('Invalid anatomical guard categories');
  const blocked=faceZones[i]!==0||semanticVeto.guard[i]!==0;
  if(blocked){
   protectedPixels++;
   if(hairRGBA[4*i]>=foregroundThreshold)conflict++;
  }else{
   allowed[i]=1;
   if(hairRGBA[4*i]>=foregroundThreshold)highConfidence++;
  }
 }
 if(highConfidence<100)return deny('Not enough unprotected hair support');
 const hardHair=new Uint8Array(n),trimap=new Uint8Array(n);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,m=hairRGBA[i*4];
  if(!allowed[i])continue;
  // Erode hair interior: an entire (2r+1)^2 neighbourhood must be
  // strong, unprotected hair. Near the frame is conservatively unknown.
  let interior=m>=foregroundThreshold,
      background=m<=backgroundThreshold;
  for(let dy=-radius;dy<=radius&&(interior||background);dy++){
   for(let dx=-radius;dx<=radius&&(interior||background);dx++){
    const xx=x+dx,yy=y+dy;
    if(xx<0||yy<0||xx>=width||yy>=height){
     interior=false;background=false;continue;
    }
    const j=yy*width+xx,other=hairRGBA[j*4];
    if(interior&&(!allowed[j]||other<foregroundThreshold))interior=false;
    // A confident background seed must be away from ALL predicted
    // hair support, regardless of whether that hair pixel is blocked.
    if(background&&other>backgroundThreshold)background=false;
   }
  }
  if(interior){trimap[i]=255;hardHair[i]=1;}
  else if(background)trimap[i]=0;
  else trimap[i]=128;
 }
 let foreground=0,background=0,unknown=0,protectedUnknown=0;
 for(let i=0;i<n;i++){
  if(!allowed[i]&&trimap[i]!==0)protectedUnknown++;
  const k=trimap[i];
  if(k===255)foreground++;
  else if(k===128)unknown++;
  else if(k===0)background++;
  else return deny('Unexpected trimap state');
 }
 if(foreground<30||background<n*.05||unknown<30||protectedUnknown)
  return deny('Insufficient safe definite-foreground/background/unknown seeds');
 const canvas=new Uint8ClampedArray(4*n);
 for(let i=0;i<n;i++){
  const k=4*i,t=trimap[i];
  if(t===255)canvas.set([54,159,105,255],k);
  else if(t===128)canvas.set([222,171,70,255],k);
  else canvas.set([45,49,57,255],k);
 }
 return {ok:true,method:'local-hair-trimap-not-alpha-v1',
  trimap,visualRGBA:canvas,width,height,
  previewOnly:true,exportAllowed:false,
  estimatedHairAlpha:false,neuralHairMattingExecuted:false,
  realismVerified:false,commercialReleaseAllowed:false,
  requirements:{hairMattingWeightsCleared:false,humanQualityMeasured:false,
    androidPhysicalDeviceVerified:false},
  metrics:{foreground,unknown,background,protectedPixels,
   highConfidenceSourceHair:highConfidence,
   originalPredictedHairProtectedConflicts:conflict,
   hairCoreRetainedFraction:foreground/highConfidence,
   unknownFraction:unknown/n},
  warning:'This trimap is a segmented-hair constraint, NOT alpha. Face-protected pixels are forced to background; authentic wisps crossing skin can be lost. Requires independently licensed hair-specific matting and human evaluation.'
 };
}
