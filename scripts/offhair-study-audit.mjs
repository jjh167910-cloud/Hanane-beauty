// Validate rights-aware dataset manifest and optional annotation bindings.
// This tool cannot confirm legal consent, subject identity or actual human review.
import fs from 'node:fs';
import {evaluateStudyManifest,associateAnnotation} from '../public/ai/offhair-study-manifest.mjs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export function auditStudyBundle(manifest,annotations=[]){
 const audit=evaluateStudyManifest(manifest);
 const bindings=[],problems=[];
 if(!audit.accepted)problems.push(...audit.issues.map(i=>({type:'manifest_issue',detail:i})));
 if(!Array.isArray(annotations))throw TypeError('Expected annotation array');
 for(const [index,annotation] of annotations.entries()){
  try{bindings.push(associateAnnotation(manifest,annotation));}
  catch(error){problems.push({type:'annotation_binding_rejected',index,reason:String(error.message||error)});}
 }
 const approved=false;
 return {
  schema:'OFFHAIR-STUDY-AUDIT-REPORT-v1',mechanicalValidity:problems.length===0,
  modelTrainingPermitted:approved,
  verifiedResearchParticipants:0,
  independentAnnotationsCertified:0,
  manifest:audit,annotationCount:annotations.length,
  annotationBindings:bindings,problems,
  caveat:'No consent receipts or portrait rights have been independently verified; subject hashes and mask shapes may still be personal data.'
 };
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 try{
  const [manifestFile,...annotationFiles]=process.argv.slice(2);
  if(!manifestFile)throw Error('Usage: node scripts/offhair-study-audit.mjs manifest.json [annotation.json ...]');
  const parse=file=>JSON.parse(fs.readFileSync(file,'utf8'));
  const report=auditStudyBundle(parse(manifestFile),annotationFiles.map(parse));
  console.log(JSON.stringify(report,null,2));
  if(!report.mechanicalValidity)process.exitCode=2;
 }catch(e){console.error(String(e));process.exitCode=1;}
}
