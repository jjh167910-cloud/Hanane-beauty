/* Research-only reusable Google MediaPipe 6-category segmentation (Apache-2.0).
 * Does not execute network inference. All model bytes and WASM resolve same-origin.
 * API: await getLocalMulticlassSegmenter() -> .analyze(canvas) -> typed labels
 * NOT a validated model of eyes/nose/ears nor a photograph-modification authorizer.
 */
export const MEDIA_PIPE_MULTICLASS=Object.freeze({
 background:0,hair:1,bodySkin:2,faceSkin:3,clothes:4,accessories:5
});
export function describeMulticlassLabels(labels,width,height){
 if(!(labels instanceof Uint8Array)||!Number.isInteger(width)||!Number.isInteger(height)||
    width<1||height<1||width*height>2e6||labels.length!==width*height)
 throw new TypeError('Invalid multiclass mask');
 const counts=new Array(6).fill(0);
 for(const label of labels){if(label>5)throw new TypeError('Unrecognized semantic category');counts[label]++;}
 return {width,height,totalPixels:labels.length,counts,
  hairPixels:counts[MEDIA_PIPE_MULTICLASS.hair],
  faceSkinPixels:counts[MEDIA_PIPE_MULTICLASS.faceSkin],
  faceSkinFraction:counts[MEDIA_PIPE_MULTICLASS.faceSkin]/labels.length};
}
export function compareHairModelMasks(multiclassLabels,multiWidth,multiHeight,hairRGBA,hairWidth,hairHeight,threshold=178){
 if(!(multiclassLabels instanceof Uint8Array)||multiclassLabels.length!==multiWidth*multiHeight||
  !Number.isInteger(multiWidth)||!Number.isInteger(multiHeight)||
  !Number.isInteger(hairWidth)||!Number.isInteger(hairHeight)||
  multiWidth<1||multiHeight<1||hairWidth<1||hairHeight<1||
  multiWidth*multiHeight>2e6||hairWidth*hairHeight>2e6||
  hairRGBA?.length!==hairWidth*hairHeight*4||!Number.isInteger(threshold)||threshold<1||threshold>255)
 throw new TypeError('Malformed comparison dimensions or masks');
 let intersection=0,union=0,multiclassHair=0,originalHair=0,
  hairInsideMulticlassFaceSkin=0,faceSkin=0;
 for(let y=0;y<multiHeight;y++)for(let x=0;x<multiWidth;x++){
  const i=y*multiWidth+x,category=multiclassLabels[i];
  if(category>5)throw new TypeError('Unrecognized semantic category');
  const xx=Math.min(hairWidth-1,Math.floor((x+.5)*hairWidth/multiWidth));
  const yy=Math.min(hairHeight-1,Math.floor((y+.5)*hairHeight/multiHeight));
  const a=hairRGBA[(yy*hairWidth+xx)*4]>=threshold,b=category===MEDIA_PIPE_MULTICLASS.hair;
  if(a)originalHair++;if(b)multiclassHair++;
  if(a&&b)intersection++;if(a||b)union++;
  if(category===MEDIA_PIPE_MULTICLASS.faceSkin){
   faceSkin++;if(a)hairInsideMulticlassFaceSkin++;
  }
 }
 return {
  multiclassHairPixels:multiclassHair,originalHairPixels:originalHair,
  crossModelHairIoU:union?intersection/union:null,intersection,union,
  faceSkinPixels:faceSkin,hairInsideMulticlassFaceSkin,
  skinConflictFractionOfOriginalHair:originalHair?hairInsideMulticlassFaceSkin/originalHair:null,
  hasIndependentGroundTruth:false,facialCoreVerified:false,usableForAutomaticEditing:false,
  interpretation:'Cross-model agreement is NOT quality, and face-skin prediction cannot protect individual facial landmarks.'
 };
}
let initialization;
export async function getLocalMulticlassSegmenter(){
 if(!initialization)initialization=initialize().catch(e=>{initialization=null;throw e});
 return initialization;
}
async function initialize(){
 const {FilesetResolver,ImageSegmenter}=await import('./vendor/vision_bundle.mjs');
 const fileset=await FilesetResolver.forVisionTasks(new URL('./wasm',import.meta.url).href);
 const segmenter=await ImageSegmenter.createFromOptions(fileset,{
  baseOptions:{modelAssetPath:new URL('./models/selfie_multiclass_256x256.tflite',import.meta.url).href,delegate:'CPU'},
  runningMode:'IMAGE',outputConfidenceMasks:false,outputCategoryMask:true
 });
 return {
  analyze(image){
   const response=segmenter.segment(image);
   try{
    const mask=response.categoryMask;
    if(!mask)throw Error('Six-class category output unavailable');
    const width=mask.width,height=mask.height;
    const labels=Uint8Array.from(mask.getAsUint8Array());
    return {labels,...describeMulticlassLabels(labels,width,height),
     model:'Google MediaPipe SelfieMulticlass, Apache-2.0',privacy:'all inference on device'};
   }finally{response.close();}
  },
  close(){segmenter.close();}
 };
}

/**
 * Conservative two-model semantic disagreement map for ANNOTATOR REVIEW only.
 * Labels: 0 neither-hair/background; 1 hair consensus; 2 old hair only;
 *         3 new model hair only; 4 old hair versus predicted face skin;
 *         5 predicted face skin without old hair.
 * This is NOT ground truth, a photo editor, a learned fusion network, or
 * permission to synthesize new hair. Reject automatic editing unconditionally.
 */
export function reviewMulticlassHairConsensus(multiclassLabels,multiWidth,multiHeight,
 hairRGBA,hairWidth,hairHeight,threshold=178){
 // Strict validation shared with the quantification function.
 const compared=compareHairModelMasks(multiclassLabels,multiWidth,multiHeight,
  hairRGBA,hairWidth,hairHeight,threshold);
 const classification=new Uint8Array(multiWidth*multiHeight),
  counts={background:0,consensusHair:0,originalOnlyHair:0,multiclassOnlyHair:0,
   originalHairVsFaceSkin:0,faceSkin:0};
 for(let y=0;y<multiHeight;y++)for(let x=0;x<multiWidth;x++){
  const i=y*multiWidth+x;
  const xx=Math.min(hairWidth-1,Math.floor((x+.5)*hairWidth/multiWidth));
  const yy=Math.min(hairHeight-1,Math.floor((y+.5)*hairHeight/multiHeight));
  const a=hairRGBA[(yy*hairWidth+xx)*4]>=threshold;
  const b=multiclassLabels[i]===MEDIA_PIPE_MULTICLASS.hair;
  const skin=multiclassLabels[i]===MEDIA_PIPE_MULTICLASS.faceSkin;
  let v=0;
  if(skin)v=a?4:5;
  else if(a&&b)v=1;
  else if(a)v=2;
  else if(b)v=3;
  classification[i]=v;
  const k=['background','consensusHair','originalOnlyHair','multiclassOnlyHair',
    'originalHairVsFaceSkin','faceSkin'][v];
  counts[k]++;
 }
 return {labels:classification,width:multiWidth,height:multiHeight,counts,
  ...compared,needsHumanReview:counts.originalOnlyHair+counts.multiclassOnlyHair+
   counts.originalHairVsFaceSkin>0,
  editingAllowed:false,geometryValidated:false,
  policy:'model disagreement triage only; human ground truth and facial topology absent'};
}
