import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlindedHairReview as create,REVIEW_QUESTIONS} from '../public/ai/migan/blind-human-review.mjs';
import {analyzeBlindedPairs} from './offhair-paired-preference.mjs';
const make=(randomByte=0)=>create({
 studyId:'hananeh_test_study',trialId:'test_trial_one',subjectId:'pseudo_subject',
 raterId:'anonymous_rater',sourceTag:'a'.repeat(64),referenceTag:'b'.repeat(64),
 randomByte
});
test('randomized presentation reverses candidate votes and uses existing research analyzer',()=>{
 const a=make(0),b=make(1);
 assert.equal(a.candidateSide(),'A');assert.equal(b.candidateSide(),'B');
 for(const q of REVIEW_QUESTIONS)a.vote(q.id,'A');
 const data=a.finalize();
 assert.equal(data.includes_images,false);
 assert.equal(data.image_fingerprints_not_exported,true);
 assert.equal(data.human_preferences_verified,false);
 assert.equal(data.is_publication_ready,false);
 assert.equal(data.ratings.length,4);
 assert.equal(data.ratings.every(r=>r.candidate_side==='A'),true);
 assert.equal(analyzeBlindedPairs(data,{replicates:100}).questions.overall.votes.candidate,1);
 for(const q of REVIEW_QUESTIONS)b.vote(q.id,'A');
 const bData=b.finalize();
 assert.equal(analyzeBlindedPairs(bData,{replicates:100}).questions.overall.votes.baseline,1);
 assert.throws(()=>b.vote('overall','A'),/finalized/);
 assert.throws(()=>b.finalize(),/again/);
});
test('no fabricated ratings; abstention, tie and all four questions required',()=>{
 const s=make();
 assert.equal(s.view().answeredCount,0);
 assert.throws(()=>s.finalize(),/explicit/);
 s.vote('identity','cannot_judge');
 s.vote('overall','tie');
 assert.throws(()=>s.finalize(),/explicit/);
 s.vote('scalp_realism','B');s.vote('hairstyle_fidelity','cannot_judge');
 const out=s.finalize();
 assert.equal(out.ratings.find(r=>r.question==='identity').vote,'cannot_judge');
 assert.equal(out.ratings.find(r=>r.question==='overall').vote,'tie');
 assert.equal(out.commercial_release_approved,false);
 assert.equal(out.subject_identities_verified,false);
});
test('input cannot smuggle a file name, image bytes, or malformed digest',()=>{
 assert.throws(()=>create({
 studyId:'valid_study',trialId:'valid_trial',subjectId:'valid_subject',
 raterId:'valid_rater',sourceTag:'data:image/png;base64,PRIVATE',
 referenceTag:'b'.repeat(64),randomByte:0
 }),/Invalid/);
 assert.throws(()=>make(-1),/Invalid/);
 assert.throws(()=>make(256),/Invalid/);
 const s=make();assert.throws(()=>s.vote('unknown','A'),/Invalid/);
 assert.throws(()=>s.vote('overall','definitely_good'),/Invalid/);
 const text=JSON.stringify(s.view());
 assert.equal(text.includes('candidateSide'),false);
 assert.equal(text.includes('rigid'),false);
 assert.equal(text.includes('guarded'),false);
});
test('destroy on consent withdrawal clears votes and refuses export',()=>{
 const s=make();s.vote('overall','B');
 assert.deepEqual(s.destroy(),{destroyed:true,imageDataRetained:false});
 assert.equal(s.view().answeredCount,0);
 assert.throws(()=>s.finalize(),/explicit|again/);
 assert.throws(()=>s.vote('overall','B'),/finalized/);
});
