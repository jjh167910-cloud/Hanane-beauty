/*
 * Phase 33 — an actual rater must make each blinded side-by-side judgment.
 * This module stores NO images, photographic hashes, hardware fingerprints,
 * identifying file names or human ratings on its own. All votes are real
 * explicit user interactions, not generated scores. No certified blindness:
 * one rater may have previously seen the method labels or both originals.
 */
const QUESTIONS=Object.freeze([
 {id:'overall',fa:'به‌طور کلی کدام نتیجه قابل‌قبول‌تر است؟'},
 {id:'scalp_realism',fa:'در کدام نتیجه خط رویش مو و پوست سر طبیعی‌تر است؟'},
 {id:'identity',fa:'در کدام نتیجه چهرهٔ اصلی کمتر تغییر کرده است؟'},
 {id:'hairstyle_fidelity',fa:'کدام نتیجه به مدل موی مرجع وفادارتر است؟'}
]);
const VOTE=new Set(['A','B','tie','cannot_judge']);
const isId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{8,110}$/.test(x);
const isDigest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export const REVIEW_QUESTIONS=QUESTIONS;
export function createBlindedHairReview({
 studyId,trialId,subjectId,raterId,sourceTag,referenceTag,randomByte,
 baselineMethod='rigid-reference-composition',
 candidateMethod='guarded-inner-edge-matting'
}){
 if(![studyId,trialId,subjectId,raterId].every(isId)||
    ![sourceTag,referenceTag].every(isDigest)||
    !Number.isInteger(randomByte)||randomByte<0||randomByte>255||
    !isId(baselineMethod)||!isId(candidateMethod)||
    baselineMethod===candidateMethod)
   throw new TypeError('Invalid ephemeral blind review identifiers');
 const candidateSide=(randomByte&1)?'B':'A';
 const choices=new Map();
 let closed=false;
 const view=()=>({
  assignedSideLabels:['A','B'],
  answeredCount:choices.size,
  totalQuestions:QUESTIONS.length,
  complete:choices.size===QUESTIONS.length,
  closed,
  questions:QUESTIONS.map(q=>({id:q.id,fa:q.fa,vote:choices.get(q.id)||null})),
  imageDataRetained:false,anonymousRaterOnly:true,
  realHumanVoteProven:false,studyIndependentlyBlinded:false
 });
 return {
  view,
  candidateSide:()=>candidateSide,
  vote(question,choice){
   if(closed)throw Error('Cannot change finalized blind review');
   if(!QUESTIONS.some(q=>q.id===question)||!VOTE.has(choice))
    throw new TypeError('Invalid explicit reviewer vote');
   choices.set(question,choice);
   return view();
  },
  finalize(){
   if(closed)throw Error('Cannot submit the same review again');
   if(choices.size!==QUESTIONS.length)
    throw Error('All review questions require an explicit choice or abstention');
   closed=true;
   return {
    version:1,study_id:studyId,candidate_method:candidateMethod,
    baseline_method:baselineMethod,includes_images:false,
    image_fingerprints_not_exported:true,
    source_reference_tokens_are_random_not_photo_hashes:true,
    independent_participants_verified:false,
    subject_identities_verified:false,
    model_permissions_verified:false,
    human_preferences_verified:false,
    is_publication_ready:false,commercial_release_approved:false,
    ratings:QUESTIONS.map(q=>({
     subject_id:subjectId,trial_id:trialId,rater_id:raterId,
     source_sha256:sourceTag,reference_sha256:referenceTag,
     candidate_side:candidateSide,vote:choices.get(q.id),question:q.id
    }))
   };
  },
  destroy(){
   choices.clear();closed=true;
   return {destroyed:true,imageDataRetained:false};
  }
 };
}
