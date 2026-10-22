/**
 * Phase 29: conservative facial-landmark *research* deformation for a 2D
 * reference-hair cutout. Not face reenactment, 3D fitting, or a generative model.
 * Existing source skin/face edit prohibitions remain outside this utility.
 */
const finite=Number.isFinite;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function point(p){return p&&finite(p.x)&&finite(p.y)&&p.x>0&&p.x<1&&p.y>0&&p.y<1;}
function pointPair(pts){
 if(!Array.isArray(pts)||pts.length!==2||!pts.every(point))return null;
 return [...pts].sort((a,b)=>a.x-b.x);
}
function anchors(f){
 if(!f||!finite(f.eyeX)||!finite(f.eyeY)||!finite(f.eyeSpan)||
   !finite(f.eyeRollRadians)||f.eyeSpan<.055||f.eyeSpan>.38)return null;
 const eyes=pointPair(f.eyes),ears=pointPair(f.earPoints);
 if(!eyes||!ears||!['noseX','noseY','mouthX','mouthY'].every(k=>finite(f[k])))return null;
 const nose={x:f.noseX,y:f.noseY},mouth={x:f.mouthX,y:f.mouthY};
 if(!point(nose)||!point(mouth)||nose.y<=f.eyeY+.01||mouth.y<=nose.y+.01||
   Math.abs(eyes[1].x-eyes[0].x)<.065||
   Math.abs(ears[1].x-ears[0].x)<f.eyeSpan*.9)return null;
 return [eyes[0],eyes[1],nose,mouth,ears[0],ears[1]];
}
const refusals=reason=>({ok:false,reason,verified3D:false,photorealismVerified:false,
 commercialReleaseAllowed:false});
/**
 * Inverse, source->donor coordinate warp using bounded smooth residuals
 * atop the existing rigid eye similarity transform. All measurements
 * are deterministic pixel geometry, never a visual-quality certificate.
 */
export function createConservativeLandmarkHairWarp({
 sourceFace,referenceFace,width,height,
 maxCorrectionRatio=.34,influenceRadiusRatio=.8,
 maxPostFitMeanPx=6,
}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||
  height<32||width*height>1024*1024)throw new TypeError('Invalid warp frame');
 if(![maxCorrectionRatio,influenceRadiusRatio,maxPostFitMeanPx].every(finite)||
  maxCorrectionRatio<.02||maxCorrectionRatio>.65||
  influenceRadiusRatio<.35||influenceRadiusRatio>1.4||
  maxPostFitMeanPx<.5||maxPostFitMeanPx>20)
  throw new TypeError('Invalid bounded warp settings');
 const src=anchors(sourceFace),ref=anchors(referenceFace);
 if(!src||!ref)return refusals('Six matched facial features, including both ears, are required');
 const ratio=sourceFace.eyeSpan/referenceFace.eyeSpan;
 const turn=referenceFace.eyeRollRadians-sourceFace.eyeRollRadians;
 if(ratio<1/1.6||ratio>1.6||Math.abs(turn)>.25)
  return refusals('Incompatible 2D face scale or roll');
 const sx=sourceFace.eyeX*width,sy=sourceFace.eyeY*height,
  rx=referenceFace.eyeX*width,ry=referenceFace.eyeY*height;
 const c=Math.cos(turn),s=Math.sin(turn);
 const rigid=(x,y)=>{
  const dx=(x-sx)/ratio,dy=(y-sy)/ratio;
  return {x:rx+c*dx-s*dy,y:ry+s*dx+c*dy};
 };
 const span=sourceFace.eyeSpan*width,radius=span*influenceRadiusRatio;
 const limit=maxCorrectionRatio*span;
 let peak=0,meanPre=0;
 const pairs=[];
 for(let i=0;i<src.length;i++){
  const x=src[i].x*width,y=src[i].y*height,q=rigid(x,y);
  const tx=ref[i].x*width,ty=ref[i].y*height;
  const dx=tx-q.x,dy=ty-q.y,d=Math.hypot(dx,dy);
  if(d>limit)return refusals('Landmark mismatch beyond safe nonrigid deformation radius');
  peak=Math.max(peak,d);meanPre+=d;
  pairs.push({x,y,dx,dy});
 }
 meanPre/=pairs.length;
 function map(x,y){
  if(!finite(x)||!finite(y)||x<0||y<0||x>width||y>height)return null;
  const q=rigid(x,y);
  let sum=.15,dx=0,dy=0;
  for(const p of pairs){
   const a=x-p.x,b=y-p.y;
   const w=Math.exp(-(a*a+b*b)/(2*radius*radius));
   sum+=w;dx+=w*p.dx;dy+=w*p.dy;
  }
  const ax=clamp(dx/sum,-limit,limit),ay=clamp(dy/sum,-limit,limit);
  return {x:q.x+ax,y:q.y+ay};
 }
 let meanPost=0,maxPost=0;
 for(let i=0;i<src.length;i++){
  const p=map(pairs[i].x,pairs[i].y),t=ref[i];
  const e=Math.hypot(p.x-t.x*width,p.y-t.y*height);
  meanPost+=e;maxPost=Math.max(maxPost,e);
 }
 meanPost/=src.length;
 // Must improve the fit of actual landmarks, and not create folds in the
 // image mapping. This is a coarse Jacobian check, NOT 3D pose estimation.
 if(peak>.2&&meanPost>meanPre+.05)
  return refusals('Landmark warp worsened fitted facial feature alignment');
 if(meanPost>maxPostFitMeanPx)
  return refusals('Residual landmark mismatch remains too large');
 for(let y=4;y<height-4;y+=Math.max(10,Math.floor(height/16)))
  for(let x=4;x<width-4;x+=Math.max(10,Math.floor(width/16))){
   const p=map(x,y),px=map(x+1,y),py=map(x,y+1);
   const determinant=(px.x-p.x)*(py.y-p.y)-(px.y-p.y)*(py.x-p.x);
   if(!finite(determinant)||determinant<.32||determinant>3.2)
    return refusals('Potential folded or sharply stretched 2D hair geometry');
  }
 return {ok:true,method:'bounded-six-anchor-local-warp',map,
  stats:{anchorCount:pairs.length,preFitMeanPx:+meanPre.toFixed(4),
   postFitMeanPx:+meanPost.toFixed(4),postFitMaxPx:+maxPost.toFixed(4),
   inputMaxResidualPx:+peak.toFixed(4),maxCorrectionPx:+limit.toFixed(4)},
  verified3D:false,photorealismVerified:false,commercialReleaseAllowed:false,
  caveat:'Local face-anchor fit alone does not establish hairstyle geometry or perceptual realism'};
}
