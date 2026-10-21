// Compare two independent OffHair candidate annotations with exactly matched image hashes.
// Agreement is exploratory; never automatically approves photos for research or training.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateAnnotation,CLASS_BITS} from '../public/ai/offhair-annotation-core.mjs';
const fail=m=>{throw Error('OffHair agreement invalid: '+m)};
export function compareIndependentLabels(a,b){
 const aa=validateAnnotation(a),bb=validateAnnotation(b);
 if(a.portraitSha256!==b.portraitSha256||a.subjectId!==b.subjectId||
    a.width!==b.width||a.height!==b.height||a.studySplit!==b.studySplit)
  fail('annotators did not label exactly the same image and subject split');
 if(a.annotatorId===b.annotatorId)fail('independent annotator IDs are identical');
 if(a.annotationId===b.annotationId)fail('annotation IDs are identical');
 const names=['protectedCore','occludableForehead','targetHair','scalpReconstruction'];
 const counts=Object.fromEntries(names.map(n=>[n,{first:0,second:0,intersection:0,union:0}]));
 let disagreements=0,bothAnnotated=0,uncertain=0,anyAnnotated=0;
 const N=aa.labels.length;
 for(let i=0;i<N;i++){
  const x=aa.labels[i],y=bb.labels[i];
  if(x||y)anyAnnotated++;
  if(x&&y)bothAnnotated++;
  if((x|y)&CLASS_BITS.uncertain){uncertain++;continue;}
  if(x!==y)disagreements++;
  for(const name of names){
   const bit=CLASS_BITS[name],p=(x&bit)!==0,q=(y&bit)!==0,c=counts[name];
   if(p)c.first++;if(q)c.second++;if(p&&q)c.intersection++;if(p||q)c.union++;
  }
 }
 const layerAgreement=Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,{
  ...v,iou:v.union?v.intersection/v.union:null,
  dice:v.first+v.second?2*v.intersection/(v.first+v.second):null,
  absentInBoth:v.union===0}]));
 return {schema:'OFFHAIR-INDEPENDENT-LABEL-AGREEMENT-v1',
  portraitSha256:a.portraitSha256,subjectId:a.subjectId,
  annotationIDs:[a.annotationId,b.annotationId],
  independentAnnotatorIds:[a.annotatorId,b.annotatorId],
  dimensions:[a.width,a.height],
  imagePixels:N,evaluablePixels:N-uncertain,
  unreviewedOrPartiallyCoveredPixels:N-bothAnnotated,
  unionAnnotatedPixels:anyAnnotated,uncertainPixels:uncertain,
  disagreeingLabelPixels:disagreements,
  labelAgreement:layerAgreement,
  validScientificGroundTruth:false,adjudicationRequired:true,
  notes:'IoU/Dice compare independently painted candidate labels, not verified target geometry. Absence of a label is not independently validated as negative.'};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 try{
  const [x,y]=process.argv.slice(2);
  if(!x||!y)throw Error('Usage: node scripts/offhair-annotation-agreement.mjs first.json second.json');
  const a=JSON.parse(fs.readFileSync(x,'utf8')),b=JSON.parse(fs.readFileSync(y,'utf8'));
  console.log(JSON.stringify(compareIndependentLabels(a,b),null,2));
 }catch(e){console.error(String(e));process.exitCode=1;}
}
