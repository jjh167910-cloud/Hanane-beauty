import test from 'node:test';
import assert from 'node:assert/strict';
import {createUnverifiedStudy,evaluateStudyManifest,associateAnnotation}
 from '../public/ai/offhair-study-manifest.mjs';
import {makeAnnotation,CLASS_BITS} from '../public/ai/offhair-annotation-core.mjs';
import {auditStudyBundle} from './offhair-study-audit.mjs';

const sha=v=>v.repeat(64);
const make=(sampleId,sourceSubjectId,referenceSubjectId,split,ext={})=>({
 sampleId,sourceSubjectId,referenceSubjectId,
 sourceSha256:sha(sourceSubjectId==='personA'?'a':sourceSubjectId==='personC'?'c':'e'),
 referenceSha256:sha(referenceSubjectId==='personB'?'b':referenceSubjectId==='personD'?'d':'f'),
 sourceConsentReceiptId:'consent-'+sourceSubjectId,
 referenceConsentReceiptId:'consent-'+referenceSubjectId,
 sourceRightsReceiptId:'rights-'+sourceSubjectId,
 referenceRightsReceiptId:'rights-'+referenceSubjectId,
 split,status:'active',labelingStatus:'not_adjudicated',...ext
});
const recordA=()=>make('sample-001','personA','personB','train');
const recordB=()=>make('sample-002','personC','personD','test');
const study=records=>createUnverifiedStudy(records,'offhair-study-001');
test('Creating a clean study leaves every image and training permission unverified',()=>{
 const m=study([recordA(),recordB()]),result=evaluateStudyManifest(m);
 assert.equal(result.accepted,true);assert.equal(result.subjectCount,4);
 assert.equal(result.splitCounts.train,1);assert.equal(result.splitCounts.test,1);
 assert.equal(result.authorizedTrainingRecords,0);
 assert.equal(m.permissionChecksComplete,false);assert.equal(m.trainingAuthorized,false);
});
test('Reference-model identities crossing data splits are leaks, even if source subjects differ',()=>{
 const a=recordA(),b=make('sample-002','personC','personB','test',{
  referenceSha256:sha('b')
 });
 const m={...study([recordA(),recordB()]),records:[a,b]};
 const audit=evaluateStudyManifest(m);
 assert.equal(audit.accepted,false);
 assert.ok(audit.issues.some(i=>i.type==='person_split_leakage'&&i.subjectId==='personB'));
 assert.throws(()=>createUnverifiedStudy([a,b],'offhair-study-001'),/consistency violations/);
});
test('Source and reference identities must also not leak through role swaps',()=>{
 const a=recordA();
 const b=make('sample-002','personB','personC','validation',{
  sourceSha256:sha('b'),referenceSha256:sha('c')
 });
 const r=evaluateStudyManifest({...study([recordA()]),records:[a,b]});
 assert.ok(r.issues.some(x=>x.type==='person_split_leakage'));
});
test('Same portrait hash cannot represent two different study people',()=>{
 const b=recordB();b.sourceSha256=sha('a');
 const r=evaluateStudyManifest({...study([recordA()]),records:[recordA(),b]});
 assert.ok(r.issues.some(x=>x.type==='photo_identity_collision'));
});
test('Duplicate samples and exact source-reference pairs are rejected',()=>{
 const r=evaluateStudyManifest({...study([recordA()]),records:[recordA(),{...recordA()}]});
 assert.ok(r.issues.some(i=>i.type==='duplicate_sample'));
 assert.ok(r.issues.some(i=>i.type==='duplicate_pair'));
});
test('Withdrawn persons stay sealed against cross-split reuse',()=>{
 const a={...recordA(),status:'withdrawn'};
 const b=make('sample-002','personA','personD','test');
 const result=evaluateStudyManifest({...study([recordA()]),records:[a,b]});
 assert.ok(result.issues.some(i=>i.type==='person_split_leakage'));
});
test('A valid annotation can be mechanically linked but not approved',()=>{
 const m=study([recordA()]);
 const labels=new Uint8Array(64*64);labels[97]=CLASS_BITS.protectedCore;
 const a=makeAnnotation({labels,width:64,height:64,
  portraitSha256:sha('a'),subjectId:'personA',
  annotatorId:'labeler-001',consentRecordId:'consent-personA',
  rightsRecordId:'rights-personA',annotationId:'annotation-001',
  annotationTimeUtc:'2026-10-21T18:00:00Z',photoOrigin:'local_portrait',
  studySplit:'train'});
 const result=associateAnnotation(m,a);
 assert.equal(result.matches,true);assert.equal(result.labeledPixels,1);
 assert.equal(result.permissionVerified,false);
 assert.equal(result.groundTruthApproved,false);
});
test('Cannot promote demonstration, withdrawn, mismatched or ambiguous annotations',()=>{
 const m=study([recordA()]);
 const labels=new Uint8Array(64*64);labels[11]=CLASS_BITS.protectedCore;
 const a=makeAnnotation({labels,width:64,height:64,
  portraitSha256:sha('a'),subjectId:'personA',
  annotatorId:'labeler-001',consentRecordId:'consent-personA',
  rightsRecordId:'rights-personA',annotationId:'annotation-001',
  annotationTimeUtc:'2026-10-21T18:00:00Z',studySplit:'train'});
 assert.throws(()=>associateAnnotation(m,{...a,photoOrigin:'bundled_catalog_demo'}),/catalog/);
 assert.throws(()=>associateAnnotation(m,{...a,consentRecordId:'consent-other'}),/receipt/);
 assert.throws(()=>associateAnnotation(
  {...m,records:[{...recordA(),status:'withdrawn'}]},a),/withdrawn/);
 assert.throws(()=>associateAnnotation(m,{...a,studySplit:'test'}),/unique source/);
});
test('Malicious fields cannot smuggle photographs or preapproved rights into records',()=>{
 const m=study([recordA()]);
 assert.throws(()=>evaluateStudyManifest({...m,includes_images:true}),/unauthorized clearance/);
 assert.throws(()=>evaluateStudyManifest({...m,trainingAuthorized:true}),/unauthorized clearance/);
 assert.throws(()=>evaluateStudyManifest({...m,records:[{...recordA(),portraitBytes:'data:image/jpeg;base64,...'}]}),/forbidden field/);
});
test('Invalid subject IDs, image SHA, statuses or empty records are rejected',()=>{
 assert.throws(()=>createUnverifiedStudy([],'offhair-study-001'),/1 to 100000/);
 assert.throws(()=>createUnverifiedStudy([{...recordA(),referenceSha256:'bad'}],'offhair-study-001'),/referenceSha256/);
 assert.throws(()=>createUnverifiedStudy([{...recordA(),labelingStatus:'certified'}],'offhair-study-001'),/labelingStatus/);
});

test('Bundle audit is mechanically valid but never independently rights-authorized',()=>{
 const a=auditStudyBundle(study([recordA()]));
 assert.equal(a.mechanicalValidity,true);
 assert.equal(a.modelTrainingPermitted,false);
 assert.equal(a.verifiedResearchParticipants,0);
 assert.equal(a.manifest.authorizedTrainingRecords,0);
});
test('Bundle audit explicitly reports leakage and invalid annotation binding',()=>{
 const a={...study([recordA()]),records:[recordA(),make('sample-002','personA','personD','test')]};
 const r=auditStudyBundle(a);
 assert.equal(r.mechanicalValidity,false);
 assert.ok(r.problems.some(x=>x.type==='manifest_issue'));
});
