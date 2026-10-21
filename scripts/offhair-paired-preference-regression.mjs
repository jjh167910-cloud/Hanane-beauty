import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeBlindedPairs} from './offhair-paired-preference.mjs';
const sha=c=>c.repeat(64);
const row=(t,sub,rater,side,vote,extra={})=>({
 subject_id:sub,trial_id:t,rater_id:rater,source_sha256:sha(sub==='s1'?'a':'c'),
 reference_sha256:sha('b'),candidate_side:side,vote,question:'overall',...extra});
const form=(ratings,extra={})=>({version:1,study_id:'DEMONSTRATION-NOT-REAL',candidate_method:'student',
 baseline_method:'migan',includes_images:false,ratings,...extra});
test('deterministic cluster bootstrap yields reproducible scores without claiming human verification',()=>{
 const rows=[row('a','s1','r1','A','A'),row('b','s2','r1','B','A')];
 const first=analyzeBlindedPairs(form(rows),{replicates:1000,seed:7});
 const second=analyzeBlindedPairs(form(rows),{replicates:1000,seed:7});
 assert.deepEqual(first,second);
 assert.equal(first.questions.overall.subject_averaged_candidate_score,.5);
 assert.deepEqual(first.questions.overall.votes,{candidate:1,baseline:1,tie:0,cannot_judge:0});
 assert.equal(first.is_verified_human_study,false);
 assert.equal(first.is_publication_ready,false);
});
test('ties count half a win; abstentions remain in the denominator',()=>{
 const rows=[row('a','s1','r1','A','tie'),row('b','s2','r1','B','cannot_judge')];
 const r=analyzeBlindedPairs(form(rows),{replicates:100,seed:9}).questions.overall;
 assert.equal(r.subject_averaged_candidate_score,.5);
 assert.equal(r.total_votes,2);assert.equal(r.usable_votes,1);
 assert.equal(r.votes.cannot_judge,1);assert.equal(r.subjects_with_usable_votes,1);
});
test('subject-clustered means stop prolific identities overpowering other subjects',()=>{
 const rows=[];
 for(let i=0;i<10;i++)rows.push(row('a'+i,'s1','r1','A','A'));
 rows.push(row('b','s2','r1','B','A'));
 const r=analyzeBlindedPairs(form(rows),{replicates:500,seed:1});
 assert.equal(r.questions.overall.subject_averaged_candidate_score,.5);
 assert.equal(r.questions.overall.subjects_with_usable_votes,2);
});
test('blind-position correctly reverses scoring',()=>{
 const r=analyzeBlindedPairs(form([row('a','s1','r1','B','B')]),{replicates:100});
 assert.equal(r.questions.overall.subject_averaged_candidate_score,1);
});
test('rejects duplicate trial and rater responses',()=>{
 assert.throws(()=>analyzeBlindedPairs(form([row('a','s1','r1','A','A'),row('a','s1','r1','A','B')])),/duplicate/);
});
test('rejects inconsistent blind assignments within the same trial',()=>{
 assert.throws(()=>analyzeBlindedPairs(form([row('a','s1','r1','A','A'),row('a','s1','r2','B','A')])),/changed/);
});
test('rejects image content and invalid vote',()=>{
 assert.throws(()=>analyzeBlindedPairs(form([row('a','s1','r1','A','A')],{includes_images:true})),/images/);
 assert.throws(()=>analyzeBlindedPairs(form([row('a','s1','r1','A','invalid')])),/vote/);
});
test('separately reports scalp realism and overall while refusing paper claims',()=>{
 const ratings=[row('a','s1','r1','A','A'),row('a','s1','r1','A','tie',{question:'scalp_realism'})];
 const r=analyzeBlindedPairs(form(ratings),{replicates:100});
 assert.equal(r.questions.overall.subject_averaged_candidate_score,1);
 assert.equal(r.questions.scalp_realism.subject_averaged_candidate_score,.5);
 assert.equal(r.is_publication_ready,false);
});
