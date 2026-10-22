/*
 * OffHair Phase 26: occlusion-aware inpainting plan, research only.
 * Rejects uncertain protection. The target reference can only CANCEL pixels
 * from the previously safety-approved removal mask; it cannot create edits.
 * Model confidence is not verified anatomy and photo realism is not proven.
 */
const finite=Number.isFinite;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function faceOK(f){
 return f&&['eyeX','eyeY','eyeSpan','eyeRollRadians','eyeDistance'].every(k=>finite(f[k]))&&
  f.eyeX>.13&&f.eyeX<.87&&f.eyeY>.16&&f.eyeY<.75&&
  f.eyeSpan>=.055&&f.eyeSpan<=.38&&f.eyeDistance>=.055&&f.eyeDistance<=.38;
}
function fail(reason){return {ok:false,reason,automaticEditingApproved:false,photorealismVerified:false};}
function hairConfidence(mask,width,height,x,y){
 const xx=clamp(x,0,width-1),yy=clamp(y,0,height-1);
 const x0=Math.floor(xx),y0=Math.floor(yy),x1=Math.min(width-1,x0+1),
  y1=Math.min(height-1,y0+1),dx=xx-x0,dy=yy-y0;
 const sample=(a,b)=>mask[4*(b*width+a)];
 return (1-dy)*((1-dx)*sample(x0,y0)+dx*sample(x1,y0))+
  dy*((1-dx)*sample(x0,y1)+dx*sample(x1,y1));
}
export function planTargetAwareRemoval({
 approvedKeepMask,referenceHairRGBA,sourceFace,referenceFace,
 semanticVeto,faceZones,width,height,
 coverConfidence=220,erosionRadius=2,maxScale=1.6,maxRoll=.25
}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||
  width*height>1024*1024)
  throw new TypeError('Invalid target-aware dimensions');
 const n=width*height;
 if(!(approvedKeepMask instanceof Uint8Array)||approvedKeepMask.length!==n||
  !(referenceHairRGBA instanceof Uint8Array||referenceHairRGBA instanceof Uint8ClampedArray)||
  referenceHairRGBA.length!==4*n||
  !(faceZones instanceof Uint8Array)||faceZones.length!==n)
  throw new TypeError('Invalid target-aware masks');
 if(!Number.isInteger(coverConfidence)||coverConfidence<210||coverConfidence>255||
  !Number.isInteger(erosionRadius)||erosionRadius<0||erosionRadius>6||
  !finite(maxScale)||maxScale<1||maxScale>2||
  !finite(maxRoll)||maxRoll<0||maxRoll>.5)
  throw new TypeError('Invalid target-aware settings');
 if(!faceOK(sourceFace)||!faceOK(referenceFace))return fail('Missing reliable source/reference eye anchors');
 if(semanticVeto?.ok!==true||semanticVeto.editingAllowed!==false||
  semanticVeto.independentGroundTruth!==false||
  semanticVeto.width!==width||semanticVeto.height!==height||
  !(semanticVeto.guard instanceof Uint8Array)||semanticVeto.guard.length!==n)
  return fail('Missing trusted local semantic veto');
 const ratio=sourceFace.eyeSpan/referenceFace.eyeSpan,
  rotation=referenceFace.eyeRollRadians-sourceFace.eyeRollRadians;
 if(ratio<1/maxScale||ratio>maxScale||Math.abs(rotation)>maxRoll)
  return fail('Unreliable scale or roll alignment');
 let approved=0,donorPixels=0;
 for(let i=0;i<n;i++){
  if((approvedKeepMask[i]!==0&&approvedKeepMask[i]!==255)||
   faceZones[i]>2||semanticVeto.guard[i]>1)
   throw new TypeError('Invalid safety labels');
  if(approvedKeepMask[i]===0){
   approved++;
   if(faceZones[i]===1||semanticVeto.guard[i])
    return fail('Upstream removal intersects protected skin or facial core');
  }
  if(referenceHairRGBA[i*4]>=coverConfidence)donorPixels++;
 }
 if(!approved||approved/n>.35||donorPixels/n<.005||donorPixels/n>.55)
  return fail('Unreliable old-hair or reference-hair area');
 const confidence=new Uint8Array(n),sX=sourceFace.eyeX*width,sY=sourceFace.eyeY*height,
  rX=referenceFace.eyeX*width,rY=referenceFace.eyeY*height,
  cos=Math.cos(rotation),sin=Math.sin(rotation);
 // Target geometry is 2D similarity only: opaque reference hair is
 // NEVER evidence for editing facial pixels.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;
  if(approvedKeepMask[i]!==0||faceZones[i]!==0||semanticVeto.guard[i])continue;
  const dx=(x+.5-sX)/ratio,dy=(y+.5-sY)/ratio,
   u=rX+cos*dx-sin*dy-.5,v=rY+sin*dx+cos*dy-.5;
  if(u<0||v<0||u>=width-1||v>=height-1)continue;
  if(hairConfidence(referenceHairRGBA,width,height,u,v)>=coverConfidence)confidence[i]=1;
 }
 // Erode the solid-cover region so wispy/feathered boundaries STILL receive
 // neural repair; do not keep potentially visible old hair at donor edges.
 const keep=new Uint8Array(approvedKeepMask);let suppressed=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;
  if(!confidence[i])continue;
  let interior=true;
  for(let dy=-erosionRadius;dy<=erosionRadius&&interior;dy++)
   for(let dx=-erosionRadius;dx<=erosionRadius;dx++){
    if(dx*dx+dy*dy>erosionRadius*erosionRadius)continue;
    const xx=x+dx,yy=y+dy;
    if(xx<0||yy<0||xx>=width||yy>=height||!confidence[yy*width+xx]){
     interior=false;break;
    }
   }
  if(interior){keep[i]=255;suppressed++;}
 }
 const remaining=approved-suppressed;
 return {ok:true,reason:'Conservative target-aware inpainting research proposal',
  keepMask:keep,originalRemovalPixels:approved,targetRemovalPixels:remaining,
  skippedHiddenPixels:suppressed,reductionFraction:suppressed/approved,
  requiresInpainting:remaining>0,coverConfidence,erosionRadius,
  referenceAlignmentScale:ratio,referenceRollDifference:rotation,
  automaticEditingApproved:false,photorealismVerified:false,
  policy:'Only discard previously approved edits beneath completely opaque reference hair; never authorize new edits'};
}
