// OFFHAIR-STUDY-MANIFEST-v1: metadata-only, intentionally UNAPPROVED for training.
// A valid manifest establishes mechanical consistency, NOT verified consent or rights.
import {validateAnnotation} from './offhair-annotation-core.mjs';

const SHA=/^[a-f0-9]{64}$/i,ID=/^[A-Za-z0-9_-]{3,100}$/;
const SPLITS=new Set(['pilot','train','validation','test']);
const STATES=new Set(['active','quarantined','withdrawn']);
const err=m=>{throw new TypeError('OffHair manifest rejected: '+m);};
const validId=(id,field)=>{if(typeof id!=='string'||!ID.test(id))err('invalid '+field);};
const exact=(data,keys,path)=>{
 if(!data||typeof data!=='object'||Array.isArray(data))err(path+' must be an object');
 const actual=Object.keys(data);
 for(const key of actual)if(!keys.includes(key))err(path+' contains forbidden field '+key);
 for(const key of keys)if(!(key in data))err(path+' missing '+key);
};
const FIELDS=['sampleId','sourceSubjectId','referenceSubjectId','sourceSha256','referenceSha256',
 'sourceConsentReceiptId','referenceConsentReceiptId','sourceRightsReceiptId',
 'referenceRightsReceiptId','split','status','labelingStatus'];
export function evaluateStudyManifest(manifest){
 exact(manifest,['schema','version','studyId','status','includes_images',
  'permissionChecksComplete','trainingAuthorized','records'],'manifest');
 if(manifest.schema!=='OFFHAIR-STUDY-MANIFEST-v1'||manifest.version!==1||
   manifest.status!=='draft_unverified'||manifest.includes_images!==false||
   manifest.permissionChecksComplete!==false||manifest.trainingAuthorized!==false)
   err('unsupported schema or unauthorized clearance claim');
 validId(manifest.studyId,'studyId');
 if(!Array.isArray(manifest.records)||!manifest.records.length||manifest.records.length>100000)
   err('must contain 1 to 100000 records');
 const ids=new Set(),subjects=new Map(),hashes=new Map(),pairs=new Set();
 const summaries={pilot:0,train:0,validation:0,test:0},states={active:0,quarantined:0,withdrawn:0};
 const issues=[];
 const bindSubject=(identity,split,role,sampleId)=>{
  // Even withdrawn identities stay sealed: withdrawal is NOT permission to reuse
  // the same person in the other data split or relabel it as a different subject.
  const prior=subjects.get(identity);
  if(prior&&prior!==split)issues.push({
   type:'person_split_leakage',subjectId:identity,firstSplit:prior,
   laterSplit:split,role,sampleId});
  else subjects.set(identity,split);
 };
 const bindHash=(sha,identity,role,sampleId)=>{
  const previous=hashes.get(sha);
  if(previous&&previous!==identity)issues.push({
   type:'photo_identity_collision',imageSha256:sha,
   previousSubjectId:previous,subjectId:identity,role,sampleId});
  else hashes.set(sha,identity);
 };
 for(const [index,r] of manifest.records.entries()){
  exact(r,FIELDS,'records['+index+']');
  for(const field of FIELDS.filter(k=>/Id$/.test(k)))validId(r[field],field);
  for(const field of ['sourceSha256','referenceSha256'])
   if(typeof r[field]!=='string'||!SHA.test(r[field]))err('invalid '+field+' at '+index);
  if(!SPLITS.has(r.split)||!STATES.has(r.status)||r.labelingStatus!=='not_adjudicated')
    err('invalid split/status/labelingStatus at '+index);
  if(ids.has(r.sampleId))issues.push({type:'duplicate_sample',sampleId:r.sampleId});
  ids.add(r.sampleId);
  const key=r.sourceSha256+'|'+r.referenceSha256+'|'+r.split;
  if(pairs.has(key))issues.push({type:'duplicate_pair',sampleId:r.sampleId});
  pairs.add(key);
  if(r.sourceSha256===r.referenceSha256&&r.sourceSubjectId!==r.referenceSubjectId)
    issues.push({type:'same_photo_incompatible_identities',sampleId:r.sampleId});
  bindSubject(r.sourceSubjectId,r.split,'source',r.sampleId);
  bindSubject(r.referenceSubjectId,r.split,'reference',r.sampleId);
  bindHash(r.sourceSha256,r.sourceSubjectId,'source',r.sampleId);
  bindHash(r.referenceSha256,r.referenceSubjectId,'reference',r.sampleId);
  summaries[r.split]++;states[r.status]++;
 }
 return {schema:'OFFHAIR-MANIFEST-AUDIT-v1',
  accepted:issues.length===0,issues,
  records:manifest.records.length,
  subjectCount:subjects.size,imageDigestCount:hashes.size,
  splitCounts:summaries,statusCounts:states,
  authorizedTrainingRecords:0,rightsVerificationPerformed:false,
  caution:'This validates metadata consistency only; never approve data rights or claim independent human review.'};
}
export function associateAnnotation(manifest,annotation){
 const audit=evaluateStudyManifest(manifest);
 if(!audit.accepted)err('study manifest has unresolved leakage or duplicate records');
 const {labels}=validateAnnotation(annotation);
 const matches=manifest.records.filter(r=>
  r.sourceSubjectId===annotation.subjectId&&r.sourceSha256===annotation.portraitSha256&&
  r.split===annotation.studySplit);
 if(matches.length!==1)err('annotation is not bound to a unique source image in the study');
 const r=matches[0];
 if(r.status!=='active')err('annotation source has withdrawn or quarantined status');
 if(r.sourceConsentReceiptId!==annotation.consentRecordId||
    r.sourceRightsReceiptId!==annotation.rightsRecordId)
   err('annotation receipt identifiers mismatch study registry');
 if(annotation.photoOrigin==='bundled_catalog_demo')
   err('bundled catalog photos cannot be promoted into a research cohort');
 return {matches:true,sampleId:r.sampleId,annotationId:annotation.annotationId,
  subjectId:annotation.subjectId,labeledPixels:labels.filter(v=>v!==0).length,
  permissionVerified:false,trainingAuthorized:false,groundTruthApproved:false};
}
export function createUnverifiedStudy(records,studyId){
 validId(studyId,'studyId');
 const manifest={schema:'OFFHAIR-STUDY-MANIFEST-v1',version:1,studyId,
  status:'draft_unverified',includes_images:false,
  permissionChecksComplete:false,trainingAuthorized:false,records};
 const report=evaluateStudyManifest(manifest);
 if(!report.accepted)err('draft manifest has '+report.issues.length+' consistency violations: '+JSON.stringify(report.issues.slice(0,5)));
 return manifest;
}
