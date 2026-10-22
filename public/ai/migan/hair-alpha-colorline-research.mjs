/*
 * Phase 40 — hair-specific, weight-free LOCAL color-line alpha baseline.
 *
 * Matting model: I = alpha*F + (1-alpha)*B.  Unknown pixels use nearest
 * separately classified foreground and background color anchors from the
 * Phase39 protected HAIR trimap.  Alpha is projected onto the local RGB
 * line, only when both anchors exist with enough contrast and the residual
 * is low.  Other unknown pixels ABSTAIN; a zero placeholder must NEVER
 * be mistaken for a measured transparent background.
 *
 * This is a constrained classical baseline, NOT neural/ground-truth matting,
 * NOT independently rated quality, NOT permission to edit protected face.
 */
const isRGBA=x=>x instanceof Uint8Array||x instanceof Uint8ClampedArray;
const nope=reason=>({ok:false,reason,alphaGroundTruth:false,
  neuralHairMattingExecuted:false,photorealismVerified:false,
  commercialReleaseAllowed:false,exportAllowed:false});
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function inferGuardedHairAlphaColorLine({
 sourceRGBA,trimap,semanticVeto,faceZones,
 width,height,radius=12,minColorContrast=24,maxLineResidual=21
}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<64||height<64||n>1024*1024||
  !Number.isInteger(radius)||radius<4||radius>16||
  !Number.isFinite(minColorContrast)||minColorContrast<12||minColorContrast>90||
  !Number.isFinite(maxLineResidual)||maxLineResidual<5||maxLineResidual>35)
  throw new TypeError('Invalid hair-alpha research dimensions or thresholds');
 if(!isRGBA(sourceRGBA)||sourceRGBA.length!==n*4||
  trimap?.ok!==true||trimap.estimatedHairAlpha!==false||
  trimap.neuralHairMattingExecuted!==false||
  trimap.exportAllowed!==false||trimap.width!==width||trimap.height!==height||
  !(trimap.trimap instanceof Uint8Array)||trimap.trimap.length!==n||
  semanticVeto?.ok!==true||semanticVeto.editingAllowed!==false||
  semanticVeto.independentGroundTruth!==false||
  semanticVeto.width!==width||semanticVeto.height!==height||
  !(semanticVeto.guard instanceof Uint8Array)||semanticVeto.guard.length!==n||
  !(faceZones instanceof Uint8Array)||faceZones.length!==n)
  return nope('Need verified hair trimap, opaque source and original protected-face masks');
 const t=trimap.trimap,guard=semanticVeto.guard;
 let foreground=0,background=0,unknown=0,protectedPixels=0;
 for(let i=0;i<n;i++){
  const ti=t[i];
  if(ti!==0&&ti!==128&&ti!==255)return nope('Invalid tri-state class');
  if(sourceRGBA[4*i+3]!==255||guard[i]>1||faceZones[i]>2)
   return nope('Corrupt source alpha or face-protection mask');
  if(guard[i]||faceZones[i]){
   protectedPixels++;
   if(ti!==0)return nope('Hair alpha inference cannot enter protected face/skin');
  }
  if(ti===255)foreground++;
  if(ti===0)background++;
  if(ti===128)unknown++;
 }
 if(foreground<30||background<100||unknown<30)
  return nope('Insufficient actual hair seeds and uncertain pixels');
 const alpha=new Float32Array(n);
 const valid=new Uint8Array(n);
 const diagnosticRGBA=new Uint8ClampedArray(4*n);
 let estimated=0,fractional=0,missingAnchors=0,lowContrast=0,
  highResidual=0,outOfRange=0,residualTotal=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,k=4*i,ti=t[i];
  valid[i]=ti===128?0:1;
  alpha[i]=ti===255?1:0;
  if(ti!==128)continue;
  // TWO nearest hard seed classes, never a soft segmentation confidence.
  let fg=-1,bg=-1,dFg=Infinity,dBg=Infinity;
  for(let dy=-radius;dy<=radius;dy++){
   const yy=y+dy;if(yy<0||yy>=height)continue;
   for(let dx=-radius;dx<=radius;dx++){
    const xx=x+dx;if(xx<0||xx>=width)continue;
    const j=yy*width+xx,type=t[j],d=dx*dx+dy*dy;
    if(type===255&&d<dFg){dFg=d;fg=j;}
    if(type===0&&d<dBg){dBg=d;bg=j;}
   }
  }
  if(fg<0||bg<0){missingAnchors++;continue;}
  let dd=0,dot=0;
  for(let c=0;c<3;c++){
   const v=sourceRGBA[4*fg+c]-sourceRGBA[4*bg+c];
   dd+=v*v;
   dot+=(sourceRGBA[k+c]-sourceRGBA[4*bg+c])*v;
  }
  if(Math.sqrt(dd/3)<minColorContrast){lowContrast++;continue;}
  const raw=dot/dd;
  if(raw<-.04||raw>1.04){outOfRange++;continue;}
  const a=clamp(raw,0,1);
  let residual=0;
  for(let c=0;c<3;c++){
   const predicted=sourceRGBA[4*bg+c]+
    a*(sourceRGBA[4*fg+c]-sourceRGBA[4*bg+c]);
   const e=sourceRGBA[k+c]-predicted;
   residual+=e*e;
  }
  residual=Math.sqrt(residual/3);
  if(residual>maxLineResidual){highResidual++;continue;}
  alpha[i]=a;valid[i]=1;
  estimated++;residualTotal+=residual;
  if(a>.015&&a<.985)fractional++;
 }
 for(let i=0;i<n;i++){
  const k=4*i;
  if(t[i]===128&&valid[i]===0){
   diagnosticRGBA.set([210,50,113,255],k); // abstain: magenta
  }else{
   const v=Math.round(alpha[i]*255);
   diagnosticRGBA.set([v,v,v,255],k);
  }
 }
 return {
  ok:true,width,height,alpha,valid,diagnosticRGBA,
  method:'segmentation-trimap-constrained-local-RGB-projection',
  previewOnly:true,exportAllowed:false,
  alphaGroundTruth:false,neuralHairMattingExecuted:false,
  photorealismVerified:false,commercialReleaseAllowed:false,
  realHairQualityMeasured:false,
  metrics:{
   foregroundSeeds:foreground,backgroundSeeds:background,
   unknownPixels:unknown,resolvedUnknownPixels:estimated,
   unresolvedUnknownPixels:unknown-estimated,
   fractionalUnknownPixels:fractional,
   missingAnchorPairs:missingAnchors,
   poorColorSeparation:lowContrast,
   rejectedResiduals:highResidual,
   rejectedOutOfRange:outOfRange,
   protectedPixels,
   unknownResolvedFraction:estimated/unknown,
   averageAcceptedRGBLineResidual:estimated?residualTotal/estimated:null,
   learnedModelWeightsUsed:0
  },
  warning:'Unknown alpha values without two reliable color anchors ABSTAIN (magenta), not zero-background evidence. Segmentation-derived trimaps are not ground truth; no true new strands, no corrected old scalp, no independent hairstyle quality.'
 };
}
