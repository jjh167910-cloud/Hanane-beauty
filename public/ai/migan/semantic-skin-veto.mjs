/*
 * OffHair Phase 24 — SECOND, conservative pretrained semantic protection.
 * Local semantic predictions are not anatomy ground truth. This layer is solely
 * a veto against edits; it cannot grant editing permission to any source pixel.
 * MediaPipe selfie multiclass codes: background=0, hair=1, bodySkin=2,
 * faceSkin=3, clothing=4, accessories=5.
 */
export function createSemanticSkinVeto(labels,semanticWidth,semanticHeight,width,height,{
 radius=2,minFaceFraction=.005,maxFaceFraction=.65
}={}){
 if(!(labels instanceof Uint8Array)||
  ![semanticWidth,semanticHeight,width,height].every(v=>Number.isInteger(v)&&v>=32&&v<=2048)||
  semanticWidth*semanticHeight>2_000_000||width*height>1024*1024||
  labels.length!==semanticWidth*semanticHeight)
  throw new TypeError('Invalid semantic mask shape');
 if(!Number.isInteger(radius)||radius<0||radius>8||
  ![minFaceFraction,maxFaceFraction].every(Number.isFinite)||
  minFaceFraction<0||maxFaceFraction>1||maxFaceFraction<=minFaceFraction)
  throw new TypeError('Invalid semantic skin veto settings');
 let faceSkinPixels=0,bodySkinPixels=0;
 for(const label of labels){
  if(label>5)throw new TypeError('Unrecognized semantic category');
  if(label===3)faceSkinPixels++;
  if(label===2)bodySkinPixels++;
 }
 const fraction=faceSkinPixels/labels.length;
 if(fraction<minFaceFraction||fraction>maxFaceFraction){
  return {ok:false,reason:'Unreliable semantic face-skin extent',
   semanticFaceFraction:fraction,semanticFacePixels:faceSkinPixels,
   editingAllowed:false,independentGroundTruth:false};
 }
 const n=width*height,raw=new Uint8Array(n),guard=new Uint8Array(n);
 // Center-coordinate nearest-neighbor resampling avoids shifted protection.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sx=Math.min(semanticWidth-1,Math.floor((x+.5)*semanticWidth/width));
  const sy=Math.min(semanticHeight-1,Math.floor((y+.5)*semanticHeight/height));
  const label=labels[sy*semanticWidth+sx];
  if(label===2||label===3)raw[y*width+x]=1;
 }
 let protectedPixels=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let protect=false;
  for(let dy=-radius;dy<=radius&&!protect;dy++){
   const yy=y+dy;if(yy<0||yy>=height)continue;
   for(let dx=-radius;dx<=radius;dx++){
    if(dx*dx+dy*dy>radius*radius)continue;
    const xx=x+dx;
    if(xx>=0&&xx<width&&raw[yy*width+xx]){protect=true;break;}
   }
  }
  if(protect){guard[y*width+x]=1;protectedPixels++;}
 }
 return {ok:true,reason:'Pretrained semantic skin veto, not anatomical certification',
  guard,width,height,semanticFaceFraction:fraction,
  semanticFacePixels:faceSkinPixels,semanticBodySkinPixels:bodySkinPixels,
  protectedPixels,editingAllowed:false,independentGroundTruth:false};
}
