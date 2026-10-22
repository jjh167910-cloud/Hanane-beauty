/*
 * Phase 34: conservative local hairline CUTOUT ARTIFACT locator.
 * The model is a 2D heuristic, not a learned realism detector.
 * It highlights a face-adjacent nearly horizontal donor-hair boundary
 * for human inspection; it never authorizes photo edits or exports.
 */
const bytes=v=>v instanceof Uint8Array||v instanceof Uint8ClampedArray;
const error=reason=>({ok:false,reason,
  photorealismVerified:false,commercialReleaseAllowed:false,exportAllowed:false});
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function meanStep(rgba,i,j){
 const a=4*i,b=4*j;
 return (Math.abs(rgba[a]-rgba[b])+Math.abs(rgba[a+1]-rgba[b+1])+
  Math.abs(rgba[a+2]-rgba[b+2]))/3;
}
export function locateForeheadCutoutRisk({
 candidate,sourceFace,semanticVeto,faceZones,
 width,height,hairThreshold=160,
 horizontalTolerance=2,minRunRatio=.31
}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<64||height<64||n>1024*1024||
  !Number.isInteger(hairThreshold)||hairThreshold<128||hairThreshold>230||
  !Number.isInteger(horizontalTolerance)||horizontalTolerance<0||horizontalTolerance>5||
  !Number.isFinite(minRunRatio)||minRunRatio<.15||minRunRatio>.85)
  throw new TypeError('Invalid forehead-risk settings');
 if(!candidate?.ok||candidate.previewOnly!==true||
  candidate.exportAllowed!==false||candidate.width!==width||
  candidate.height!==height||!bytes(candidate.rgba)||
  !bytes(candidate.opacity)||candidate.rgba.length!==4*n||
  candidate.opacity.length!==n)
  return error('A successful non-exportable research preview is required');
 if(semanticVeto?.ok!==true||semanticVeto.editingAllowed!==false||
  semanticVeto.independentGroundTruth!==false||
  semanticVeto.width!==width||semanticVeto.height!==height||
  !(semanticVeto.guard instanceof Uint8Array)||
  semanticVeto.guard.length!==n||
  !(faceZones instanceof Uint8Array)||faceZones.length!==n)
  return error('Face/skin model and independent landmark veto are required');
 const f=sourceFace;
 if(!f||![f.eyeX,f.eyeY,f.eyeDistance].every(Number.isFinite)||
  f.eyeX<.2||f.eyeX>.8||f.eyeY<.2||f.eyeY>.7||
  f.eyeDistance<.07||f.eyeDistance>.38)
  return error('Unreliable eye location and forehead proportions');
 for(let i=0;i<n;i++){
  if(semanticVeto.guard[i]>1||faceZones[i]>2)
   return error('Corrupted semantic or anatomical region');
  if(candidate.opacity[i]&&(semanticVeto.guard[i]||faceZones[i]===1||
    faceZones[i]===2))
   return error('Already prohibited donor hair across protected skin or forehead');
 }
 const eyeWidth=f.eyeDistance*width;
 const x0=clamp(Math.ceil((f.eyeX-1.05*f.eyeDistance)*width),2,width-3);
 const x1=clamp(Math.floor((f.eyeX+1.05*f.eyeDistance)*width),2,width-3);
 const y0=clamp(Math.ceil((f.eyeY-1.5*f.eyeDistance)*height),2,height-3);
 const y1=clamp(Math.floor((f.eyeY-.12*f.eyeDistance)*height),2,height-3);
 if(x1<=x0||y1<=y0)return error('No valid forehead inspection region');
 const byColumn=[];
 let vetoNeighbours=0;
 for(let x=x0;x<=x1;x++){
  let p=null;
  // Prefer the LOWEST in-band hair-to-forehead transition. Never use a
  // bare color edge: require the original donor mask support to end.
  for(let y=y0+1;y<=y1;y++){
   const i=y*width+x,above=i-width,below=Math.min(height-1,y+1)*width+x;
   if(candidate.opacity[above]<hairThreshold||
      candidate.opacity[i]>=95||
      candidate.opacity[below]>=95)continue;
   const context=faceZones[i]===2||semanticVeto.guard[i]===1||
      (y+2<height&&(faceZones[i+2*width]===2||
       semanticVeto.guard[i+2*width]===1));
   const contrast=meanStep(candidate.rgba,above,i);
   p={x,y,contrast,faceContext:context};
  }
  if(p){byColumn.push(p);if(p.faceContext)vetoNeighbours++;}
 }
 const coverage=byColumn.length/(x1-x0+1);
 const contrastMean=byColumn.length?
  byColumn.reduce((a,p)=>a+p.contrast,0)/byColumn.length:null;
 let maxRun=0,best=null,current=[];
 function flush(){
  if(current.length>maxRun){
   maxRun=current.length;
   best={x0:current[0].x,x1:current[current.length-1].x,
    y:Math.round(current.reduce((a,p)=>a+p.y,0)/current.length),
    meanContrast:current.reduce((a,p)=>a+p.contrast,0)/current.length,
    faceContextCount:current.filter(p=>p.faceContext).length};
  }
  current=[];
 }
 for(const p of byColumn){
  if(current.length&&
     (p.x!==current[current.length-1].x+1||
      Math.abs(p.y-current[0].y)>horizontalTolerance))
   flush();
  current.push(p);
 }
 flush();
 const runRatio=maxRun/Math.max(1,eyeWidth),
  foreheadContactFraction=byColumn.length?vetoNeighbours/byColumn.length:0;
 const risk=Boolean(best&&coverage>=.28&&maxRun>=9&&
  runRatio>=minRunRatio&&best.meanContrast>=22&&
  (foreheadContactFraction>.03||
   candidate.diagnosticFlags?.includes('fringe_occlusion_unresolved')));
 const roi=best?{
  x:clamp(best.x0-10,0,width-1),
  y:clamp(best.y-12,0,height-1),
  width:Math.min(width-clamp(best.x0-10,0,width-1),best.x1-best.x0+21),
  height:Math.min(height-clamp(best.y-12,0,height-1),25)
 }:null;
 return {
  ok:true,method:'local-donor-boundary-flatness-inspection-v1',
  possibleArtificialHairline:risk,needsHumanHairlineReview:true,
  photorealismVerified:false,commercialReleaseAllowed:false,
  exportAllowed:false,generatedHair:false,
  findings:{
   hairlineColumns:byColumn.length,eligibleColumns:x1-x0+1,
   coveredColumnFraction:coverage,maximumNearHorizontalRunPx:maxRun,
   runLengthRelativeToEyeDistance:runRatio,meanStepContrast:contrastMean,
   nearFaceProtectionFraction:foreheadContactFraction,
   continuedFringeWarning:candidate.diagnosticFlags?.includes('fringe_occlusion_unresolved')===true
  },
  // Coordinates are in-memory paint instructions only: never export
  // photographic landmark positions as anonymous telemetry.
  privateOverlay:roi?{box:roi,segment:best?{x0:best.x0,
   x1:best.x1,y:best.y}:null}:null,
  limitations:'Near-horizontal hairline and skin proximity are 2D proxies; genuine pixie/buzz haircuts can be naturally straight. An unflagged result is never realistic by certification.'
 };
}
