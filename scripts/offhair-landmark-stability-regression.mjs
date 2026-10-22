import test from 'node:test';
import assert from 'node:assert/strict';
import {studyLandmarkStability} from '../public/ai/offhair-landmark-stability.mjs';
const W=128,H=128,N=W*H;
const face={eyeX:.5,eyeY:.48,eyeDistance:.18,eyeSpan:.18,eyeRollRadians:0,
 eyes:[{x:.41,y:.48},{x:.59,y:.48}],
 noseX:.5,noseY:.565,mouthX:.5,mouthY:.67,
 earPoints:[{x:.32,y:.55},{x:.68,y:.55}]};
const rect=(a,b,c,d)=>{
 const out=new Uint8Array(N);
 for(let y=b;y<d;y++)for(let x=a;x<c;x++)out[y*W+x]=255;
 return out;
};
test('No jitter creates no zoning variation, still withholds editing permission',()=>{
 const s=studyLandmarkStability({face,width:W,height:H,hairMask:rect(45,4,85,30),jitter:0});
 assert.equal(s.ok,true);
 assert.equal(s.counts.changedZones,0);
 assert.equal(s.counts.hairWithChangingZoning,0);
 assert.equal(s.testedPerturbations,15);
 assert.equal(s.eligibleForAutomaticEditing,false);
 assert.equal(s.hasHumanValidatedLandmarks,false);
});
test('Deterministic drift creates uncertainty at facial-zone boundaries',()=>{
 const s=studyLandmarkStability({face,width:W,height:H,hairMask:rect(33,33,96,75),jitter:.12});
 assert.equal(s.ok,true,s.reason);
 assert.ok(s.counts.changedZones>0);
 assert.ok(s.counts.hairWithChangingZoning>0);
 assert.ok(s.counts.hairWithAnyCoreRisk>0);
 assert.ok(s.counts.foreheadUnion>0);
 assert.ok(s.fractions.hairWithChangingZoning>0);
 assert.ok(s.overlay.some(x=>x===1));
});
test('All annotated hair pixels counted exactly once by risk overlay categories',()=>{
 const s=studyLandmarkStability({face,width:W,height:H,hairMask:rect(25,7,100,67)});
 assert.equal(s.ok,true,s.reason);
 const mask=rect(25,7,100,67);
 let total=0;
 for(let i=0;i<N;i++)if(mask[i]){
  assert.ok(s.overlay[i]>=1&&s.overlay[i]<=3);
  total++;
 }else assert.equal(s.overlay[i],0);
 assert.equal(total,s.counts.hairPixels);
 assert.equal(s.counts.hairPixels,
  [...s.overlay].filter(x=>x>=1&&x<=3).length);
});
test('Both foreground and calibration parameters reject malformed inputs',()=>{
 assert.throws(()=>studyLandmarkStability({face,width:W,height:H,hairMask:new Uint8Array(3)}),/Invalid mask/);
 assert.throws(()=>studyLandmarkStability({face,width:W,height:H,hairMask:rect(20,2,70,40),jitter:.3}),/jitter/);
 assert.throws(()=>studyLandmarkStability({face,width:W,height:H,hairMask:rect(20,2,70,40),threshold:300}),/jitter/);
});
test('Missing nose/ear geometry cannot be silently designated stable',()=>{
 const absent=studyLandmarkStability({face:null,width:W,height:H,hairMask:rect(20,2,70,40)});
 assert.equal(absent.ok,false);
 assert.equal(absent.eligibleForAutomaticEditing,false);
 const noFeatures=studyLandmarkStability({
  face:{eyeX:.5,eyeY:.45,eyeDistance:.18},width:W,height:H,hairMask:rect(20,2,70,40)});
 assert.equal(noFeatures.ok,false);
 assert.equal(noFeatures.eligibleForAutomaticEditing,false);
});
test('Same run produces identical results and no protected-category leakage',()=>{
 const a=studyLandmarkStability({face,width:W,height:H,hairMask:rect(20,5,90,50)});
 const b=studyLandmarkStability({face,width:W,height:H,hairMask:rect(20,5,90,50)});
 assert.deepEqual(a,b);
 assert.equal(a.eligibleForAutomaticEditing,false);
});
test('Landmark uncertainty is not misrepresented as a fitted error probability',()=>{
 const a=studyLandmarkStability({face,width:W,height:H,hairMask:rect(10,5,90,55)});
 assert.match(a.policy,/not calibrated uncertainty/);
 assert.equal(a.invalidPerturbations,0);
 assert.equal(a.cautions.length,3);
});
