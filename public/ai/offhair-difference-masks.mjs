import {makeLandmarkFaceZones} from './offhair-face-zones.mjs';
// OffHair-DM feasibility instrument, NOT a trained hairstyle generator.
// The destination support is a TWO-EYE-SCALE proxy, NOT true 3D target geometry.
// Quantifies remove/add/overlap topology only; it must NOT be used to claim fidelity.
function fail(reason){return {ok:false,reason,proxyAlignment:true};}
function validFace(f){
 return f&&[f.eyeX,f.eyeY,f.eyeDistance].every(Number.isFinite)&&
 f.eyeX>.13&&f.eyeX<.87&&f.eyeY>.16&&f.eyeY<.75&&f.eyeDistance>=.055&&f.eyeDistance<=.38;
}
export function differenceMaskStudy({sourceRGBA,referenceRGBA,width,height,sourceFace,referenceFace,threshold=178,maxScale=1.8,alignment='eye-scale',faceProtection='legacy-ellipse'}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||
  width*height>1024*1024||sourceRGBA?.length!==width*height*4||
  referenceRGBA?.length!==width*height*4)throw new TypeError('Both masks must have identical RGBA dimensions');
 if(!Number.isInteger(threshold)||threshold<128||threshold>245||
 !Number.isFinite(maxScale)||maxScale<1||maxScale>3||
 !['eye-scale','eye-similarity'].includes(alignment)||
 !['legacy-ellipse','landmark-core'].includes(faceProtection))throw new TypeError('Invalid topology options');
 if(!validFace(sourceFace)||!validFace(referenceFace))return fail('Unreliable face landmarks');
 const hasRoll=[sourceFace.eyeRollRadians,referenceFace.eyeRollRadians,
  sourceFace.eyeSpan,referenceFace.eyeSpan].every(Number.isFinite);
 if(alignment==='eye-similarity'&&!hasRoll)return fail('Two-eye rotation coordinates unavailable');
 const ratio=alignment==='eye-similarity'?
  sourceFace.eyeSpan/referenceFace.eyeSpan:
  sourceFace.eyeDistance/referenceFace.eyeDistance;
 const delta=alignment==='eye-similarity'?
  referenceFace.eyeRollRadians-sourceFace.eyeRollRadians:0;
 const cos=Math.cos(delta),sin=Math.sin(delta);
 if(ratio<1/maxScale||ratio>maxScale)return fail('Face-scale mismatch exceeds study bounds');
 const n=width*height,labels=new Uint8Array(n);
 // Labels: 0 preserve background; 1 remove source only; 2 add reference only;
 // 3 replace/reshape both; 4 face-protected conflict (no edit permitted).
 const sx=sourceFace.eyeX*width,sy=sourceFace.eyeY*height;
 const rx=referenceFace.eyeX*width,ry=referenceFace.eyeY*height;
 const faceCX=sx,faceCY=sy+sourceFace.eyeDistance*.72*height;
 const faceRX=sourceFace.eyeDistance*width*1.56;
 const faceRY=sourceFace.eyeDistance*height*2.05;
 const protectedAt=(x,y)=>{
  const a=(x-faceCX)/faceRX,b=(y-faceCY)/faceRY;
  return a*a+b*b<=1;
 };
 const protectedZones=faceProtection==='landmark-core'?makeLandmarkFaceZones(sourceFace,width,height):null;
 if(protectedZones&&!protectedZones.ok)return fail(protectedZones.reason);
 const counts={preserve:0,remove:0,add:0,overlap:0,faceConflict:0,
  foreheadPending:0,
  sourceHair:0,targetHairProxy:0};
 let refClipped=0,refTotal=0,coveredOutOfBounds=0;
 // Map EVERY reference hair pixel to source coordinates to quantify likely cropping.
 for(let yy=0;yy<height;yy++)for(let xx=0;xx<width;xx++){
  if(referenceRGBA[(yy*width+xx)*4]<threshold)continue;
  refTotal++;
  // Reference -> source inverse of the source -> reference similarity map.
  const dx=xx-rx,dy=yy-ry;
  const tx=sx+(cos*dx+sin*dy)*ratio;
  const ty=sy+(-sin*dx+cos*dy)*ratio;
  if(tx<0||tx>=width||ty<0||ty>=height)refClipped++;
 }
 if(refTotal/n<.005||refTotal/n>.5)return fail('Reference segmentation outside plausible support');
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,source=sourceRGBA[i*4]>=threshold;
  const dx=(x-sx)/ratio,dy=(y-sy)/ratio;
  const tx=Math.round(rx+cos*dx-sin*dy);
  const ty=Math.round(ry+sin*dx+cos*dy);
  const mapped=tx>=0&&tx<width&&ty>=0&&ty<height;
  const target=mapped&&referenceRGBA[(ty*width+tx)*4]>=threshold;
  if(!mapped)coveredOutOfBounds++;
  if(source)counts.sourceHair++;
  if(target)counts.targetHairProxy++;
  if(source||target){
   const category=protectedZones?protectedZones.zones[i]:(protectedAt(x,y)?1:0);
   if(category===1){labels[i]=4;counts.faceConflict++;continue;}
   // A fringe crossing the forehead is NOT an approved facial edit.
   // It is deliberately separated as an unresolved, manual-review region.
   if(category===2){labels[i]=5;counts.foreheadPending++;continue;}
  }
  const code=(source?1:0)|(target?2:0);
  labels[i]=code;
  if(code===0)counts.preserve++;
  if(code===1)counts.remove++;
  if(code===2)counts.add++;
  if(code===3)counts.overlap++;
 }
 if(counts.sourceHair/n<.005||counts.sourceHair/n>.5)return fail('Source segmentation outside plausible support');
 const clippingFraction=refClipped/refTotal;
 const conflictFraction=counts.faceConflict/Math.max(1,counts.sourceHair+counts.targetHairProxy);
 const editable=counts.remove+counts.add+counts.overlap;
 // A negative result is itself valuable: reject if the proxy lies mostly on the face,
 // has too little mapped hair, or gets cropped beyond reasonable 2D salvage.
 const flags=[];
 if(clippingFraction>.05)flags.push('reference_head_hair_cropped');
 if(conflictFraction>.18)flags.push('hair_overlaps_protected_face');
 if(editable/n<.002)flags.push('insufficient_editable_region');
 const valid=flags.length===0;
 return {ok:valid,reason:valid?'2D pose proxy only; visual quality unverified':flags.join(', '),
  proxyAlignment:true,alignment,faceProtection,rollDifferenceRadians:delta,
  eligibleForAutomatedEditing:faceProtection==='legacy-ellipse'&&valid,
  manualReviewRequired:faceProtection==='landmark-core',
  referenceHairstyleGenerated:false,labels,
  width,height,scaleRatio:ratio,counts,
  measures:{sourceHairFraction:counts.sourceHair/n,targetProxyHairFraction:counts.targetHairProxy/n,
   editUnionFraction:editable/n,unmodifiedFraction:counts.preserve/n,
   removeFraction:counts.remove/n,addFraction:counts.add/n,overlapFraction:counts.overlap/n,
   conflictFraction,foreheadPendingFraction:counts.foreheadPending/n,
   referenceClippingFraction:clippingFraction,
   relativeUnknownMappedFraction:coveredOutOfBounds/n},
  cautions:['Landmark scale/translation is not head-pose estimation.',
   'Label counts do not predict generative FLOPs, latency, naturalness or reference fidelity.',
   'Two-eye roll correction does not model yaw, occlusion, perspective or 3D head shape.',
   'Landmark-based forehead labels are UNRESOLVED and NEVER authorize face editing.',
   'Facial anatomy, ear visibility and consent remain unverified.']};
}
export function mapTopologyToRGBA(result){
 if(!result||!result.labels||result.labels.length!==result.width*result.height)
  throw new TypeError('Study result missing topology labels');
 const colors=[[0,0,0,0],[217,83,70,190],[55,126,222,190],[163,91,200,190],[232,171,57,185],[43,167,151,190]];
 const rgba=new Uint8ClampedArray(result.labels.length*4);
 for(let i=0;i<result.labels.length;i++){
  const p=i*4,c=colors[result.labels[i]];
  if(!c)throw new TypeError('Unknown topology label');
  rgba[p]=c[0];rgba[p+1]=c[1];rgba[p+2]=c[2];rgba[p+3]=c[3];
 }
 return rgba;
}
