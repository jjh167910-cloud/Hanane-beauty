// OffHair experimental anatomical zoning: ONLY an occlusion-risk diagnostic.
// This does NOT segment a true face or infer 3D depth; facial edits stay blocked.
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const ellipse=(x,y,cx,cy,rx,ry)=>{
 const dx=(x-cx)/rx,dy=(y-cy)/ry;
 return dx*dx+dy*dy<=1;
};
export function makeLandmarkFaceZones(face,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||
 width*height>1024*1024)throw new TypeError('Invalid face zone dimensions');
 const coordinates=['eyeX','eyeY','eyeDistance','noseX','noseY','mouthX','mouthY'];
 if(!face||!coordinates.every(k=>finite(face[k]))||
 face.eyeX<=.13||face.eyeX>=.87||face.eyeY<=.16||face.eyeY>=.75||
 face.eyeDistance<.055||face.eyeDistance>.38||
 !Array.isArray(face.eyes)||face.eyes.length!==2||
 !face.eyes.every(pt=>finite(pt?.x)&&finite(pt?.y))||
 face.noseY<=face.eyeY+face.eyeDistance*.12||
 face.mouthY<=face.noseY+face.eyeDistance*.12||
 face.mouthY>=face.eyeY+face.eyeDistance*2.7){
  return {ok:false,reason:'Insufficient validated nose/mouth/eye geometry'};
 }
 const e=face.eyeDistance;
 const zones=new Uint8Array(width*height);
 // 0 = normal, 1 = immutable facial landmarks/core, 2 = unresolved
 // forehead/hairline area potentially occluded by target fringe.
 // All radii are provisional geometric priors, NOT scientific guarantees.
 const fx=(x)=>x/width,fy=(y)=>y/height;
 const earp=Array.isArray(face.earPoints)&&face.earPoints.length===2&&
 face.earPoints.every(pt=>finite(pt?.x)&&finite(pt?.y))?face.earPoints:null;
 let core=0,forehead=0,earProtected=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=fx(x+.5),v=fy(y+.5);
  const protectedEyes=face.eyes.some(pt=>ellipse(u,v,pt.x,pt.y,e*.30,e*.27));
  const protectedNose=ellipse(u,v,face.noseX,face.noseY,e*.53,e*.52);
  const lowerCenterY=(face.noseY+face.mouthY)/2+e*.27;
  const protectedLower=ellipse(u,v,
    (face.noseX+face.mouthX)/2,lowerCenterY,e*1.05,
    (face.mouthY-face.noseY)/2+e*.72);
  const protectedEars=earp?.some(pt=>ellipse(u,v,pt.x,pt.y,e*.28,e*.36))||false;
  const immutable=protectedEyes||protectedNose||protectedLower||protectedEars;
  const front=ellipse(u,v,face.eyeX,face.eyeY-e*.58,e*1.20,e*.52);
  if(immutable){zones[y*width+x]=1;core++;if(protectedEars)earProtected++;}
  else if(front){zones[y*width+x]=2;forehead++;}
 }
 return {ok:true,zones,counts:{protectedCorePixels:core,
   potentiallyOccludableForeheadPixels:forehead,earProtectionPixels:earProtected},
  reason:'Provisional landmark-based face zoning; pending anatomical validation',
  legalForAutomaticFaceEditing:false,hasEarAnchors:!!earp};
}
