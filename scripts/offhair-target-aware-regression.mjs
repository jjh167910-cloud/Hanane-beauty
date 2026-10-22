import test from 'node:test';
import assert from 'node:assert/strict';
import {planTargetAwareRemoval} from '../public/ai/migan/target-aware-repair.mjs';

const W=128,H=128,N=W*H,face={eyeX:.5,eyeY:.49,eyeSpan:.19,
 eyeDistance:.19,eyeRollRadians:0};
function fixture(){
 const approvedKeepMask=new Uint8Array(N);approvedKeepMask.fill(255);
 const referenceHairRGBA=new Uint8ClampedArray(N*4),faceZones=new Uint8Array(N),
  guard=new Uint8Array(N);
 for(let y=9;y<40;y++)for(let x=37;x<91;x++)approvedKeepMask[y*W+x]=0;
 for(let y=4;y<37;y++)for(let x=33;x<97;x++)referenceHairRGBA[4*(y*W+x)]=255;
 for(let y=65;y<99;y++)for(let x=43;x<88;x++)guard[y*W+x]=1;
 return {width:W,height:H,approvedKeepMask,referenceHairRGBA,
  sourceFace:face,referenceFace:face,faceZones,
  semanticVeto:{ok:true,guard,width:W,height:H,editingAllowed:false,independentGroundTruth:false}};
}
test('opaque donor hides original hair, never expands the neural removal region',()=>{
 const p=fixture(),result=planTargetAwareRemoval(p);
 assert.equal(result.ok,true,result.reason);
 assert.ok(result.skippedHiddenPixels>100,'Must avoid needless scalp reconstruction');
 assert.ok(result.targetRemovalPixels<result.originalRemovalPixels);
 assert.ok(result.targetRemovalPixels>0,'Eroded edge remains eligible for repair');
 assert.equal(result.originalRemovalPixels,
   result.skippedHiddenPixels+result.targetRemovalPixels);
 for(let i=0;i<N;i++){
  if(result.keepMask[i]===0)assert.equal(p.approvedKeepMask[i],0);
  if(p.approvedKeepMask[i]===255)assert.equal(result.keepMask[i],255);
 }
 assert.equal(result.automaticEditingApproved,false);
 assert.equal(result.photorealismVerified,false);
 const copy=planTargetAwareRemoval(p);
 assert.deepEqual(result.keepMask,copy.keepMask,'Stable deterministic offline mask');
});
test('donor fringe is not treated as opaque and still undergoes neural cleanup',()=>{
 const p=fixture();
 for(let y=4;y<37;y++)for(let x=33;x<97;x++)
  p.referenceHairRGBA[4*(y*W+x)]=200;
 assert.equal(planTargetAwareRemoval(p).ok,false,'No high-confidence donor makes strategy unsafe');
 const q=fixture();
 q.referenceHairRGBA[4*(20*W+65)]=140;
 const a=planTargetAwareRemoval(q);
 assert.equal(a.ok,true);
 assert.equal(a.keepMask[20*W+65],0);
 for(let y=18;y<=22;y++)for(let x=63;x<=67;x++)
  assert.equal(a.keepMask[y*W+x],0,'Feather boundary must not expose original hair');
});
test('all potentially protected source pixels remain untouched',()=>{
 const p=fixture();const x=39,y=12,i=y*W+x;
 p.faceZones[i]=1;
 assert.equal(planTargetAwareRemoval(p).ok,false,'Untrusted upstream edit must fail');
 p.approvedKeepMask[i]=255;
 const r=planTargetAwareRemoval(p);
 assert.equal(r.ok,true);
 assert.equal(r.keepMask[i],255);
 const q=fixture();q.semanticVeto.guard[20*W+65]=1;
 assert.equal(planTargetAwareRemoval(q).ok,false,'Skin conflict in old mask must fail');
});
test('invalid reference geometry and corrupted masks fail closed',()=>{
 let p=fixture();p.referenceFace={...face,eyeSpan:.052};
 assert.equal(planTargetAwareRemoval(p).ok,false);
 p=fixture();p.referenceFace={...face,eyeRollRadians:.9};
 assert.equal(planTargetAwareRemoval(p).ok,false);
 p=fixture();p.approvedKeepMask[0]=128;
 assert.throws(()=>planTargetAwareRemoval(p),/safety labels/);
 p=fixture();p.semanticVeto=null;
 assert.equal(planTargetAwareRemoval(p).ok,false);
 p=fixture();p.referenceHairRGBA=new Uint8Array(3);
 assert.throws(()=>planTargetAwareRemoval(p),/masks/);
 p=fixture();
 assert.throws(()=>planTargetAwareRemoval({...p,erosionRadius:7}),/settings/);
});
test('no-op rendering is explicitly reported instead of calling a model with zero holes',()=>{
 const p=fixture();
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)
  p.referenceHairRGBA[4*(y*W+x)]=y<49?255:0;
 const r=planTargetAwareRemoval(p,{erosionRadius:0});
 assert.equal(r.ok,true);
 if(r.targetRemovalPixels===0)assert.equal(r.requiresInpainting,false);
});
