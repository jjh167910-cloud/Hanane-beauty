// OffHair: transparent blinded paired-preference analysis. Metadata only.
// Does not certify genuine human reviews, participant consent, or model quality.
// Usage: node scripts/offhair-paired-preference.mjs ratings.json
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const VOTE=new Set(['A','B','tie','cannot_judge']);
const TOPIC=new Set(['overall','scalp_realism','identity','hairstyle_fidelity']);
const nonempty=s=>typeof s==='string'&&s.length>=1&&s.length<=150;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const sha=/^[a-f0-9]{64}$/i;
function fail(s){throw Error('OffHair blinded study invalid: '+s)}
function prng(seed){
 let x=seed>>>0;
 return ()=>{x=(x+0x6d2b79f5)|0;let t=Math.imul(x^(x>>>15),1|x);
 t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}
function percentile(sorted,q){
 if(!sorted.length)return null;
 const at=q*(sorted.length-1),i=Math.floor(at),f=at-i;
 return sorted[i]+((sorted[Math.min(i+1,sorted.length-1)]-sorted[i])*f);
}
export function analyzeBlindedPairs(data,{replicates=2000,seed=160723}={}){
 if(!data||typeof data!=='object'||Array.isArray(data))fail('root must be object');
 if(data.version!==1||!nonempty(data.study_id)||!nonempty(data.candidate_method)||
    !nonempty(data.baseline_method)||data.candidate_method===data.baseline_method)
    fail('missing comparison identity');
 if(data.includes_images!==false)fail('images are prohibited in metadata');
 if(!Array.isArray(data.ratings)||data.ratings.length===0)fail('no ratings');
 if(!Number.isSafeInteger(replicates)||replicates<100||replicates>100000||
    !Number.isSafeInteger(seed)||seed<0)fail('invalid bootstrap configuration');
 const comparisons=new Map(),keys=new Set(),referenced=new Set();
 for(const [i,r] of data.ratings.entries()){
  if(!r||typeof r!=='object'||Array.isArray(r))fail('invalid rating '+i);
  for(const key of ['subject_id','trial_id','rater_id','source_sha256','reference_sha256','candidate_side','vote','question']){
   if(!(key in r))fail('missing '+key+' row '+i);
  }
  if(![r.subject_id,r.trial_id,r.rater_id].every(nonempty))fail('empty pseudonymous identifiers');
  if(!sha.test(r.source_sha256)||!sha.test(r.reference_sha256))fail('invalid source/reference digest');
  if(!['A','B'].includes(r.candidate_side)||!VOTE.has(r.vote)||!TOPIC.has(r.question))
    fail('invalid presentation or vote');
  const key=[r.trial_id,r.rater_id,r.question].join('|');
  if(keys.has(key))fail('duplicate rater/question/trial '+key);
  keys.add(key);
  const pairKey=r.trial_id;
  const canonical=[r.subject_id,r.source_sha256,r.reference_sha256,r.candidate_side].join('|');
  if(comparisons.has(pairKey)&&comparisons.get(pairKey)!==canonical)fail('trial changed image/subject or blind assignment');
  comparisons.set(pairKey,canonical);
  // Avoid a "subject" ID accidentally aliasing two source photos in this study:
  referenced.add(r.subject_id);
 }
 const result={},rng=prng(seed);
 for(const question of TOPIC){
  const relevant=data.ratings.filter(r=>r.question===question);
  if(!relevant.length)continue;
  const bySubject=new Map(),votes={candidate:0,baseline:0,tie:0,cannot_judge:0};
  for(const r of relevant){
   let points=null;
   if(r.vote==='cannot_judge')votes.cannot_judge++;
   else if(r.vote==='tie'){votes.tie++;points=.5;}
   else if(r.vote===r.candidate_side){votes.candidate++;points=1;}
   else{votes.baseline++;points=0;}
   if(points===null)continue;
   if(!bySubject.has(r.subject_id))bySubject.set(r.subject_id,[]);
   bySubject.get(r.subject_id).push(points);
  }
  const scores=[...bySubject.values()].map(v=>v.reduce((a,b)=>a+b,0)/v.length);
  const n=scores.length;
  let estimate=null,interval=null;
  if(n){estimate=scores.reduce((a,b)=>a+b,0)/n;
   const draws=new Float64Array(replicates);
   for(let k=0;k<replicates;k++){
    let sum=0;for(let j=0;j<n;j++)sum+=scores[Math.floor(rng()*n)];
    draws[k]=sum/n;
   }
   const arr=Array.from(draws).sort((a,b)=>a-b);
   interval=[percentile(arr,.025),percentile(arr,.975)];
  }
  result[question]={subject_averaged_candidate_score:estimate,
    cluster_bootstrap_95_percent_interval:interval,subjects_with_usable_votes:n,
    total_votes:relevant.length,usable_votes:relevant.length-votes.cannot_judge,
    votes};
 }
 return {study_id:data.study_id,candidate_method:data.candidate_method,
   baseline_method:data.baseline_method,distinct_trials:comparisons.size,
   distinct_subjects:referenced.size,method:'subject-averaged paired preference, subject bootstrap',
   bootstrap_replicates:replicates,seed,questions:result,
   interpretation:'Descriptive only. Authentic rater provenance, consent, power, device performance, and external validation are not inferred.',
   is_verified_human_study:false,is_publication_ready:false};
}
const invoked=process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]);
if(invoked){
 try{const [input]=process.argv.slice(2);
  if(!input)throw Error('Usage: node scripts/offhair-paired-preference.mjs <ratings.json>');
  const data=JSON.parse(fs.readFileSync(input,'utf8'));
  process.stdout.write(JSON.stringify(analyzeBlindedPairs(data),null,2)+'\n');
 }catch(e){console.error(String(e));process.exitCode=1;}
}
