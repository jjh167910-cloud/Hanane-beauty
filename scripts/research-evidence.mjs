// OffHair research evidence validation and transparent aggregation.
// Usage: node scripts/research-evidence.mjs validate <manifest.json>
//        node scripts/research-evidence.mjs summarize <manifest.json>
// This never loads photos; JSON is metadata only, and no score is fabricated.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const protocolPath=new URL('../research/paper/protocol-v1.json',import.meta.url);
const PROTOCOL=JSON.parse(fs.readFileSync(protocolPath,'utf8'));
const SHA=/^[a-f0-9]{64}$/i,COMMIT=/^[a-f0-9]{40}$/i;
const ALLOWED_SPLITS=new Set(['train','validation','pilot','test']);
const ALLOWED_STATUSES=new Set(['ok','failed','rejected']);
function fail(message){throw Error('OffHair evidence invalid: '+message);}
const filled=v=>typeof v==='string'&&v.trim().length>0&&v.length<=256;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function validateEvidence(report){
 if(!report||typeof report!=='object'||Array.isArray(report))fail('root must be an object');
 if(report.protocol_id!==PROTOCOL.protocol_id)fail('protocol mismatch');
 if(!['engineering_smoke','pilot','confirmatory'].includes(report.study_kind))fail('unknown study kind');
 if(!filled(report.study_id)||!filled(report.dataset_version)||!Array.isArray(report.records)||report.records.length<1)fail('missing study metadata or records');
 if(report.includes_images!==false)fail('images must not be part of evidence report');
 if(report.study_kind!=='engineering_smoke'&&report.consent_registry_verified!==true)fail('human study requires verified consent registry');
 if(report.study_kind!=='engineering_smoke'&&report.rights_registry_verified!==true)fail('human study requires checked license registry');
 if(report.study_kind==='confirmatory'&&report.split_frozen_before_evaluation!==true)fail('confirmatory split must be prospectively frozen');
 if(report.study_kind==='confirmatory'&&report.reviewed_human_ratings!==true)fail('cannot label confirmatory until blinded judgments are verified');
 const splitByPerson=new Map(),splitByImage=new Map(),unique=new Set(),statuses={},methods=new Map();
 let identityLeakage=0,changedOutside=0,external=0,caseCount=0;
 const sources=new Set(),referenceSubjects=new Set();
 const required=PROTOCOL.record_fields_required;
 for(const [index,r] of report.records.entries()){
  if(!r||typeof r!=='object'||Array.isArray(r))fail('nonobject record #'+index);
  for(const field of required)if(r[field]===undefined||r[field]===null)fail('missing '+field+' record #'+index);
  for(const key of ['sample_id','source_subject_id','reference_subject_id','consent_record_id','license_record_id',
                    'method_id','device_id','hardware_environment_id','run_utc'])
   if(!filled(r[key]))fail(key+' is empty record #'+index);
  if(!SHA.test(r.source_image_sha256)||!SHA.test(r.reference_image_sha256))fail('invalid image digest');
  if(!COMMIT.test(r.method_commit))fail('commit must be full Git SHA');
  if(!ALLOWED_SPLITS.has(r.split)||!ALLOWED_STATUSES.has(r.status))fail('invalid split/status');
  if(!Number.isSafeInteger(r.seed)||r.seed<0)fail('invalid seed');
  const stamp=new Date(r.run_utc);
  if(Number.isNaN(stamp.getTime())||!/Z$/.test(r.run_utc))fail('non-UTC timestamp');
  if(r.status==='ok'){
   for(const field of ['inference_ms','outside_mask_changed_pixels','network_requests_external'])
    if(!finite(r.metrics?.[field])||r.metrics[field]<0)fail('missing/nonfinite '+field+' in successful run');
   if(!Number.isSafeInteger(r.metrics.outside_mask_changed_pixels)||!Number.isSafeInteger(r.metrics.network_requests_external))fail('invalid discrete count');
   if(r.metrics.peak_memory_mb!==null&&r.metrics.peak_memory_mb!==undefined&&(!finite(r.metrics.peak_memory_mb)||r.metrics.peak_memory_mb<=0))fail('invalid memory');
   changedOutside+=r.metrics.outside_mask_changed_pixels;
   external+=r.metrics.network_requests_external;
  }
  if(r.status!=='ok'&&!filled(r.failure_reason))fail('failed/rejected records need explicit reason');
  const compound=r.sample_id+'|'+r.method_id+'|'+r.device_id+'|'+r.seed;
  if(unique.has(compound))fail('duplicate repeated case/method/device/seed '+compound);
  unique.add(compound);
  const prior=splitByPerson.get(r.source_subject_id);
  if(prior&&prior!==r.split)fail('source subject '+r.source_subject_id+' appears in '+prior+' and '+r.split);
  splitByPerson.set(r.source_subject_id,r.split);
  const photoPrior=splitByImage.get(r.source_image_sha256);
  if(photoPrior&&photoPrior!==r.split)fail('identical source image crosses dataset split');
  splitByImage.set(r.source_image_sha256,r.split);
  sources.add(r.source_subject_id);
  referenceSubjects.add(r.reference_subject_id);
  statuses[r.status]=(statuses[r.status]||0)+1;caseCount++;
  let m=methods.get(r.method_id);if(!m){m={n:0,ok:0,failed:0,rejected:0,inference:[]};methods.set(r.method_id,m);}
  m.n++;m[r.status]++;
  if(r.status==='ok')m.inference.push(r.metrics.inference_ms);
 }
 // Unseen people in fixed reference pool may be used across splits; a benchmark subject must never appear as a reference identity.
 for(const person of sources)if(referenceSubjects.has(person))fail('reference subject overlaps evaluation subject: '+person);
 const reportByMethod=Object.fromEntries([...methods].sort(([a],[b])=>a.localeCompare(b)).map(([k,m])=>{
  const t=[...m.inference].sort((a,b)=>a-b);
  const median=t.length?(t.length%2?t[(t.length-1)/2]:(t[t.length/2-1]+t[t.length/2])/2):null;
  return [k,{cases:m.n,successes:m.ok,failures:m.failed,rejections:m.rejected,
    success_fraction:m.ok/m.n,median_inference_ms:median}];
 }));
 const smoke=report.study_kind==='engineering_smoke';
 const issues=[];
 if(smoke)issues.push('Engineering smoke testing only; no scientific quality or statistical significance claims permitted.');
 if(changedOutside>0)issues.push('Observed changes outside removal mask; pixel identity gate failed in at least one successful record.');
 if(external>0)issues.push('Observed external network requests in at least one successful record.');
 return {protocol_id:report.protocol_id,study_id:report.study_id,study_kind:report.study_kind,
  evaluated_records:caseCount,distinct_source_people:sources.size,distinct_reference_people:referenceSubjects.size,
  outcomes:statuses,methods:reportByMethod,
  outside_mask_changed_pixels:changedOutside,external_requests:external,
  can_claim_photorealism:false,
  can_claim_offline_android:false,
  inferential_statistics_permitted:!smoke&&report.reviewed_human_ratings===true,
  issues};
}
function cli(){
 const [mode,file]=process.argv.slice(2);
 if(!['validate','summarize'].includes(mode)||!file){process.stderr.write('Usage: node scripts/research-evidence.mjs validate|summarize file.json\n');process.exit(2);}
 const input=JSON.parse(fs.readFileSync(path.resolve(file),'utf8')),validated=validateEvidence(input);
 console.log(JSON.stringify(validated,null,2));
 if(validated.outside_mask_changed_pixels||validated.external_requests){process.stderr.write('Research integrity gate failed\n');process.exitCode=1;}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))cli();
