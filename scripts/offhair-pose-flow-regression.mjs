import test from 'node:test';
import assert from 'node:assert/strict';
import {fitPoseFlow,predictPoseFlow,projectToFrame,fromFrame,transferSupportMask,
 maskMetrics,observationFromFaceAnchor,gateTargetSupport,FEATURE_NAMES} from '../public/ai/offhair-pose-flow.mjs';
const face={cx:50,cy:48,scale:28,roll:.2,noseBias:.13,earBias:.29};
const zero={cx:50,cy:48,scale:28,roll:0,noseBias:0,earBias:0};
test('Inverse frame coordinates across roll and scale',()=>{
 for(const [u,v] of [[.5,.4],[-1.3,.6],[0,0]]){
  const [x,y]=projectToFrame(u,v,face),[uu,vv]=fromFrame(x,y,face);
  assert.ok(Math.abs(uu-u)<1e-10&&Math.abs(vv-v)<1e-10);
 }
});
test('Trainable ridge model estimates withheld synthetic translations',()=>{
 const records=[];
 for(let i=0;i<250;i++){
  const source={noseBias:(i%17-8)*.028,earBias:(i%19-9)*.056};
  for(const v of [-.9,-.1,.4])for(const u of [-.7,0,.9]){
   const dn=source.noseBias;
   records.push({u,v,source,reference:{noseBias:0,earBias:0},
    dx:.5*dn+.17*dn*v,dy:.12*dn*u});
  }
 }
 const model=fitPoseFlow(records),pred=predictPoseFlow(model,.4,.3,
  {noseBias:.15,earBias:.22},{noseBias:0,earBias:0});
 assert.ok(Math.abs(pred[0]-(.5*.15+.17*.15*.3))<.015);
 assert.equal(model.syntheticOnly,true);assert.equal(model.trainedHairstyleGenerator,false);
 assert.deepEqual(model.features,FEATURE_NAMES);
});
test('Identical frames preserve support mask',()=>{
 const m=new Uint8Array(96*96);
 for(let y=20;y<37;y++)for(let x=30;x<68;x++)m[y*96+x]=255;
 const result=transferSupportMask(m,96,96,zero,zero);
 assert.deepEqual(result,m);assert.equal(maskMetrics(m,result).iou,1);
});
test('MediaPipe two-dimensional nose/ear observations are not 3D yaw',()=>{
 const a={eyeX:.5,eyeY:.4,eyeSpan:.18,eyeRollRadians:.1,
  noseX:.53,earPoints:[{x:.29,y:.54},{x:.75,y:.55}]};
 const obs=observationFromFaceAnchor(a,512,512);
 assert.equal(obs.ok,true);assert.equal(obs.source,'MediaPipe_2D_landmarks');
 assert.ok(Math.abs(obs.noseBias-.03/.18)<1e-9);
 assert.ok(Math.abs(obs.earBias-(.52-.5)/.18)<1e-9);
 assert.equal(obs.validatedOnRealHeadGeometry,false);
});
test('Missing or extrapolated real landmarks fail closed',()=>{
 assert.equal(observationFromFaceAnchor(null,512,512).ok,false);
 assert.equal(observationFromFaceAnchor({eyeX:.5,eyeY:.4,eyeSpan:.18,
  eyeRollRadians:0,noseX:.9,earPoints:[{x:.2,y:.4},{x:.8,y:.4}]},512,512).ok,false);
});
test('All protected-face collisions forbid automatic editing',()=>{
 const target=new Uint8Array(512),core=new Uint8Array(512),forehead=new Uint8Array(512);
 target[10]=255;target[20]=255;core[10]=1;forehead[20]=1;
 const risk=gateTargetSupport(target,core,forehead);
 assert.equal(risk.protectedConflicts,1);assert.equal(risk.foreheadUnresolved,1);
 assert.equal(risk.automaticEditingAllowed,false);
});
test('No overlap still does not constitute geometric validation',()=>{
 const m=new Uint8Array(256);m[12]=255;
 const r=gateTargetSupport(m,new Uint8Array(256),new Uint8Array(256));
 assert.equal(r.automaticEditingAllowed,false);assert.equal(r.requiresManualReview,true);
});
test('Corrupt masks, weights, or training data fail closed',()=>{
 const m=new Uint8Array(96*96);
 assert.throws(()=>transferSupportMask(m,96,96,zero,zero,{mode:'learned'}),/requires/);
 assert.throws(()=>fitPoseFlow([]),/64\+/);
 assert.throws(()=>predictPoseFlow({schema:'OFFHAIR-SYNTHETIC-POSE-FLOW-v1',
  features:FEATURE_NAMES,coefficients:[[1],[2]]},0,0,zero,zero),/Invalid/);
 assert.throws(()=>maskMetrics(new Uint8Array(2),new Uint8Array(3)),/mismatch/);
});
