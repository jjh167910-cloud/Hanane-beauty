// OffHair Phase 22 — connected-component triage for reviewing disagreements
// between two real pretrained segmentation models. No image editing, no inference,
// no claim of classifier accuracy, and no approval of research-data rights.
// Input labels from reviewMulticlassHairConsensus: 0 background, 1 agreement,
// 2 original-only hair, 3 multiclass-only hair, 4 original hair vs face skin,
// 5 face skin. Components include only 2/3/4; face skin by itself isn't an error.
const KINDS=['background','consensusHair','originalOnlyHair','multiclassOnlyHair',
 'originalHairVsFaceSkin','faceSkin'];
const REVIEW=new Set([2,3,4]);
const cmp=(a,b)=>Number(b.hasFaceSkinConflict)-Number(a.hasFaceSkinConflict)||
 b.faceSkinConflictPixels-a.faceSkinConflictPixels||
 b.pixels-a.pixels||a.minY-b.minY||a.minX-b.minX;
export function prioritizeModelDisagreements(labels,width,height,{
 minPixels=8,maxRegions=20,connectivity=8,pageIndex=0
}={}){
 if(!(labels instanceof Uint8Array)||!Number.isInteger(width)||!Number.isInteger(height)||
 width<1||height<1||width*height>2_000_000||labels.length!==width*height)
 throw new TypeError('Invalid semantic review labels or dimensions');
 if(!Number.isInteger(minPixels)||minPixels<1||minPixels>1e5||
 !Number.isInteger(maxRegions)||maxRegions<1||maxRegions>200||
 !Number.isInteger(pageIndex)||pageIndex<0||pageIndex>100000||
 ![4,8].includes(connectivity))
 throw new TypeError('Invalid review prioritization settings');
 const n=labels.length,seen=new Uint8Array(n),queue=new Int32Array(n),
 countByLabel=new Uint32Array(6);
 for(let i=0;i<n;i++){
  const v=labels[i];if(v>5)throw new TypeError('Unknown semantic review label');
  countByLabel[v]++;
 }
 const components=[];
 let totalReviewPixels=0;
 for(let origin=0;origin<n;origin++){
  if(!REVIEW.has(labels[origin])||seen[origin])continue;
  let head=0,tail=1;
  seen[origin]=1;queue[0]=origin;
  const oX=origin%width,oY=Math.floor(origin/width);
  let minX=oX,maxX=oX,minY=oY,maxY=oY,sumX=0,sumY=0;
  const kinds={originalOnlyHair:0,multiclassOnlyHair:0,originalHairVsFaceSkin:0};
  let touchesImageEdge=false;
  while(head<tail){
   const i=queue[head++],x=i%width,y=Math.floor(i/width);
   const value=labels[i];
   kinds[KINDS[value]]++;
   sumX+=x;sumY+=y;
   minX=Math.min(x,minX);maxX=Math.max(x,maxX);
   minY=Math.min(y,minY);maxY=Math.max(y,maxY);
   if(x===0||y===0||x===width-1||y===height-1)touchesImageEdge=true;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;
    if(connectivity===4&&dx&&dy)continue;
    const xx=x+dx,yy=y+dy;
    if(xx<0||yy<0||xx>=width||yy>=height)continue;
    const j=yy*width+xx;
    if(!seen[j]&&REVIEW.has(labels[j])){seen[j]=1;queue[tail++]=j;}
   }
  }
  totalReviewPixels+=tail;
  const conflict=kinds.originalHairVsFaceSkin;
  if(components.length>=20000)throw new RangeError('Excessive mask fragmentation; human review unavailable');
  components.push({
   regionId:'review-'+String(components.length+1).padStart(4,'0'),
   pixels:tail,minX,minY,maxX,maxY,
   width:maxX-minX+1,height:maxY-minY+1,
   centroid:{x:Math.round(sumX/tail),y:Math.round(sumY/tail)},
   ...kinds,faceSkinConflictPixels:conflict,
   hasFaceSkinConflict:conflict>0,touchesImageEdge,
   priorityClass:conflict>0?'face_skin_conflict':'segmentation_disagreement',
   reviewOnly:true,editingAllowed:false
  });
 }
 components.sort(cmp);
 // Preserve all facial-skin conflicts even if smaller than minPixels.
 const eligible=components.filter(c=>c.pixels>=minPixels||c.hasFaceSkinConflict);
 const totalPages=Math.max(1,Math.ceil(eligible.length/maxRegions));
 if(pageIndex>=totalPages)throw new RangeError('Review page is out of bounds');
 const selected=eligible.slice(pageIndex*maxRegions,(pageIndex+1)*maxRegions);
 const selectedIds=new Set(selected.map(c=>c.regionId));
 const omitted=components.filter(c=>!selectedIds.has(c.regionId));
 const totalCritical=components.filter(c=>c.hasFaceSkinConflict).length;
 const criticalOnPage=selected.filter(c=>c.hasFaceSkinConflict).length;
 const criticalBeforePage=eligible.slice(0,pageIndex*maxRegions)
  .filter(c=>c.hasFaceSkinConflict).length;
 const omittedCritical=omitted.filter(c=>c.hasFaceSkinConflict);
 const reviewedPixels=selected.reduce((s,r)=>s+r.pixels,0);
 return {
  policy:'Deterministic paginated triage of pretrained model disagreement; human annotation required',
  width,height,connectivity,minPixels,maxRegions,pageIndex,totalPages,
  nextPageIndex:pageIndex+1<totalPages?pageIndex+1:null,
  previousPageIndex:pageIndex>0?pageIndex-1:null,
  reviewRegionCount:components.length,allComponentsAddressable:minPixels===1,
  allCriticalComponentsAddressable:true,
  totalCriticalRegions:totalCritical,criticalRegionsOnPage:criticalOnPage,
  criticalRegionsOnPriorPages:criticalBeforePage,
  criticalRegionsOnSubsequentPages:totalCritical-criticalBeforePage-criticalOnPage,
  shortlistedRegionCount:selected.length,
  totalReviewPixels,reviewedPixels,omittedPixels:totalReviewPixels-reviewedPixels,
  omittedRegions:omitted.length,
  omittedFaceSkinConflictRegions:omittedCritical.length,
  omittedFaceSkinConflictPixels:omittedCritical.reduce((s,r)=>s+r.faceSkinConflictPixels,0),
  distribution:{
   background:countByLabel[0],consensusHair:countByLabel[1],
   originalOnlyHair:countByLabel[2],multiclassOnlyHair:countByLabel[3],
   originalHairVsFaceSkin:countByLabel[4],faceSkin:countByLabel[5]
  },
  regions:selected,
  shortlistCoversAllComponents:selected.length===components.length,
  allRegionsHumanReviewed:false,
  editingAllowed:false,groundTruthAvailable:false,
  privacyNote:'Bounding boxes derived from portraits may be personal data; do not publish for actual clients without consent.'
 };
}
