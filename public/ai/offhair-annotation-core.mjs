// OffHair research annotations: metadata-only local export; never embeds source photos.
// Version 1 has independent bit planes (overlaps explicit, not silently discarded).
export const CLASS_BITS=Object.freeze({
 protectedCore:1,occludableForehead:2,targetHair:4,scalpReconstruction:8,uncertain:16
});
const ALL_BITS=31,SHA=/^[a-f0-9]{64}$/i,ID=/^[a-zA-Z0-9_-]{3,100}$/;
const fail=s=>{throw new TypeError('Invalid OffHair annotation: '+s)};
function dimensions(w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<64||h<64||
    w*h>1024*1024)fail('dimensions out of range');
 return w*h;
}
function checkMask(mask,n){
 if(!(mask instanceof Uint8Array)||mask.length!==n)fail('expected one Uint8Array label per pixel');
 for(let i=0;i<n;i++)if((mask[i]&~ALL_BITS)!==0)fail('unrecognized bitmask at pixel '+i);
}
export function encodeRuns(mask,width,height){
 const n=dimensions(width,height);checkMask(mask,n);
 const runs=[];let last=mask[0],count=1;
 for(let i=1;i<n;i++){
  if(mask[i]===last&&count<1048576)count++;
  else{runs.push([last,count]);last=mask[i];count=1;}
 }
 runs.push([last,count]);return runs;
}
export function decodeRuns(runs,width,height){
 const n=dimensions(width,height);
 if(!Array.isArray(runs)||!runs.length||runs.length>n)fail('invalid RLE data');
 const out=new Uint8Array(n);let offset=0;
 for(const run of runs){
  if(!Array.isArray(run)||run.length!==2||
   !Number.isInteger(run[0])||run[0]<0||run[0]>ALL_BITS||
   !Number.isSafeInteger(run[1])||run[1]<1||run[1]>n||
   offset+run[1]>n)fail('invalid RLE run');
  out.fill(run[0],offset,offset+run[1]);offset+=run[1];
 }
 if(offset!==n)fail('RLE length mismatch');
 return out;
}
export function annotationCoverage(mask,width,height){
 const n=dimensions(width,height);checkMask(mask,n);
 const layers=Object.fromEntries(Object.keys(CLASS_BITS).map(k=>[k,0]));
 let annotated=0,overlap=0;
 for(const v of mask){
  if(v)annotated++;
  if(v&&(v&(v-1)))overlap++;
  for(const [name,bit] of Object.entries(CLASS_BITS))if(v&bit)layers[name]++;
 }
 return {annotatedPixels:annotated,unlabeledPixels:n-annotated,overlappingLabels:overlap,layers};
}
function exactKeys(o,allowed,path){
 for(const k of Object.keys(o))if(!allowed.includes(k))fail('disallowed '+path+'.'+k);
}
export function makeAnnotation({labels,width,height,portraitSha256,subjectId,annotatorId,
 consentRecordId,rightsRecordId,annotationId,annotationTimeUtc,
 photoOrigin='local_portrait',studySplit='pilot'}){
 const n=dimensions(width,height);checkMask(labels,n);
 for(const [key,value] of Object.entries({subjectId,annotatorId,consentRecordId,
  rightsRecordId,annotationId}))if(typeof value!=='string'||!ID.test(value))fail(key+' must be a pseudonymous ID');
 if(typeof portraitSha256!=='string'||!SHA.test(portraitSha256))fail('image SHA-256 required');
 if(!['local_portrait','bundled_catalog_demo'].includes(photoOrigin))fail('photo origin');
 if(!['pilot','train','validation','test'].includes(studySplit))fail('study split');
 if(typeof annotationTimeUtc!=='string'||!Number.isFinite(Date.parse(annotationTimeUtc))||
    !annotationTimeUtc.endsWith('Z'))fail('valid UTC time required');
 const coverage=annotationCoverage(labels,width,height);
 if(!coverage.annotatedPixels)fail('annotation is empty');
 return {
  schema:'OFFHAIR-MASK-ANNOTATION-v1',version:1,annotationId,
  subjectId,annotatorId,portraitSha256,consentRecordId,rightsRecordId,
  createdUtc:annotationTimeUtc,photoOrigin,studySplit,width,height,
  encoding:'uint5-bitplanes-rle',runs:encodeRuns(labels,width,height),
  coverage,includes_images:false,external_rights_verified:false,
  usable_for_training:false,
  provenance_status:'self_reported_pending_independent_review'
 };
}
export function validateAnnotation(annotation){
 if(!annotation||typeof annotation!=='object'||Array.isArray(annotation))fail('root object required');
 exactKeys(annotation,['schema','version','annotationId','subjectId','annotatorId',
  'portraitSha256','consentRecordId','rightsRecordId','createdUtc','photoOrigin',
  'studySplit','width','height','encoding','runs','coverage','includes_images',
  'external_rights_verified','usable_for_training','provenance_status'],'annotation');
 if(annotation.schema!=='OFFHAIR-MASK-ANNOTATION-v1'||annotation.version!==1||
    annotation.encoding!=='uint5-bitplanes-rle')fail('schema mismatch');
 if(annotation.includes_images!==false||
    annotation.usable_for_training!==false||
    annotation.external_rights_verified!==false||
    annotation.provenance_status!=='self_reported_pending_independent_review')
    fail('research annotation cannot assert verified rights');
 const labels=decodeRuns(annotation.runs,annotation.width,annotation.height);
 const regenerated=makeAnnotation({
  labels,width:annotation.width,height:annotation.height,
  annotationId:annotation.annotationId,subjectId:annotation.subjectId,
  annotatorId:annotation.annotatorId,portraitSha256:annotation.portraitSha256,
  consentRecordId:annotation.consentRecordId,rightsRecordId:annotation.rightsRecordId,
  annotationTimeUtc:annotation.createdUtc,
  photoOrigin:annotation.photoOrigin,studySplit:annotation.studySplit
 });
 if(JSON.stringify(regenerated.coverage)!==JSON.stringify(annotation.coverage))fail('coverage mismatch');
 return {labels,coverage:regenerated.coverage};
}
export function evaluateZones(predicted,groundTruth,width,height,{excludeUncertain=true}={}){
 const n=dimensions(width,height);checkMask(groundTruth,n);
 if(!(predicted instanceof Uint8Array)||predicted.length!==n)fail('invalid prediction');
 for(let i=0;i<n;i++)if(predicted[i]>ALL_BITS)fail('invalid prediction bits');
 if(typeof excludeUncertain!=='boolean')fail('invalid uncertainty option');
 const metrics={},bitNames=['protectedCore','occludableForehead','targetHair','scalpReconstruction'];
 let criticalEdits=0,knownCore=0,ignored=0;
 // Evaluated unit is the annotated pixel, not the whole portrait. Unlabeled = unknown.
 for(const name of bitNames){
  const bit=CLASS_BITS[name];let tp=0,fp=0,fn=0,tn=0,evaluable=0;
  for(let i=0;i<n;i++){
   const gt=groundTruth[i],pred=predicted[i];
   if(!gt||(excludeUncertain&&(gt&CLASS_BITS.uncertain))){continue;}
   evaluable++;
   if(pred&bit){if(gt&bit)tp++;else fp++;}
   else{if(gt&bit)fn++;else tn++;}
  }
  metrics[name]={tp,fp,fn,tn,evaluable,
    iou:tp+fp+fn?tp/(tp+fp+fn):null,
    recall:tp+fn?tp/(tp+fn):null,
    precision:tp+fp?tp/(tp+fp):null};
 }
 for(let i=0;i<n;i++){
  const gt=groundTruth[i],pred=predicted[i];
  if(!gt||(excludeUncertain&&(gt&CLASS_BITS.uncertain))){ignored++;continue;}
  if(gt&CLASS_BITS.protectedCore){
   knownCore++;
   // Exposing protected pixels to hair/scalp modification is a critical safety defect.
   if(pred&(CLASS_BITS.targetHair|CLASS_BITS.scalpReconstruction|CLASS_BITS.occludableForehead))criticalEdits++;
  }
 }
 return {width,height,evaluablePixels:n-ignored,ignoredPixels:ignored,
   protectedCorePixels:knownCore,protectedCoreUnsafeEditPixels:criticalEdits,
   protectedCoreUnsafeEditRate:knownCore?criticalEdits/knownCore:null,
   regionMetrics:metrics,
   safetyCertified:false,scientificQualityCertified:false,
   warning:'Ground-truth annotations and portrait rights require independent verification; unlabeled regions excluded.'};
}
