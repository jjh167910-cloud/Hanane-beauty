import test from 'node:test';
import assert from 'node:assert/strict';
import {createSemanticSkinVeto} from '../public/ai/migan/semantic-skin-veto.mjs';
import {prepareHairRemoval} from '../public/ai/migan/hair-removal-core.mjs';

const W=128,H=128,N=W*H,face={eyeX:.5,eyeY:.47,eyeDistance:.18};
function hair(){
 const m=new Uint8Array(N*4);
 for(let y=8;y<35;y++)for(let x=35;x<92;x++)m[(y*W+x)*4]=255;
 return m;
}
function semantics(){
 const c=new Uint8Array(N);c.fill(0);
 for(let y=42;y<95;y++)for(let x=37;x<95;x++)c[y*W+x]=3;
 return c;
}
test('semantic veto cannot expand the original removal region',()=>{
 const baseline=prepareHairRemoval(hair(),W,H,face);
 assert.equal(baseline.ok,true);
 const labels=semantics();
 for(let y=10;y<22;y++)for(let x=43;x<53;x++)labels[y*W+x]=2;
 const veto=createSemanticSkinVeto(labels,W,H,W,H);
 assert.equal(veto.ok,true);
 const protectedResult=prepareHairRemoval(hair(),W,H,face,{semanticVeto:veto});
 assert.equal(protectedResult.ok,true,protectedResult.reason);
 assert.equal(protectedResult.semanticGuardApplied,true);
 assert.ok(protectedResult.semanticConflicts>0);
 assert.ok(protectedResult.hairPixels<baseline.hairPixels);
 for(let i=0;i<N;i++)if(protectedResult.keepMask[i]===0)
  assert.equal(baseline.keepMask[i],0,'A second model cannot authorize any new edited pixel');
 for(let y=10;y<22;y++)for(let x=43;x<53;x++)
  assert.equal(protectedResult.keepMask[y*W+x],255,'Predicted body skin must be preserved');
 for(let i=0;i<N;i++)if(veto.guard[i])
  assert.equal(protectedResult.keepMask[i],255,'Dilated skin veto is absolute');
 assert.equal(protectedResult.semanticFaceFraction,veto.semanticFaceFraction);
});
test('guard dilation and nearest-neighbor resampling are pixel-deterministic',()=>{
 const labels=semantics(),a=createSemanticSkinVeto(labels,W,H,W,H,{radius:2});
 const b=createSemanticSkinVeto(labels,W,H,W,H,{radius:2});
 assert.deepEqual(a.guard,b.guard);
 assert.equal(a.guard[40*W+64],1,'Face skin dilation includes near neighbor');
 assert.equal(a.guard[38*W+64],0,'Guard does not grow unbounded');
 const half=new Uint8Array(64*64);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++)
  half[y*64+x]=labels[(y*2)*W+x*2];
 const resized=createSemanticSkinVeto(half,64,64,W,H,{radius:0});
 assert.equal(resized.ok,true);
 assert.equal(resized.guard[50*W+70],1);
 assert.equal(resized.guard[12*W+70],0);
});
test('unreliable semantics or malformed supplied guard fail closed',()=>{
 const blank=new Uint8Array(N);
 const rejected=createSemanticSkinVeto(blank,W,H,W,H);
 assert.equal(rejected.ok,false);
 assert.equal(rejected.editingAllowed,false);
 assert.equal(prepareHairRemoval(hair(),W,H,face,{semanticVeto:rejected}).ok,false);
 const malformed=createSemanticSkinVeto(semantics(),W,H,W,H);
 malformed.guard[0]=255;
 assert.equal(prepareHairRemoval(hair(),W,H,face,{semanticVeto:malformed}).ok,false);
 assert.throws(()=>createSemanticSkinVeto(new Uint8Array(5),W,H,W,H),/Invalid/);
 const unknown=semantics();unknown[0]=8;
 assert.throws(()=>createSemanticSkinVeto(unknown,W,H,W,H),/Unrecognized/);
 assert.throws(()=>createSemanticSkinVeto(semantics(),W,H,W,H,{radius:9}),/settings/);
});
test('semantic protection preserves all customer pixels outside bounded deletion mask',()=>{
 const labels=semantics();
 for(let y=10;y<22;y++)for(let x=43;x<53;x++)labels[y*W+x]=2;
 const veto=createSemanticSkinVeto(labels,W,H,W,H);
 const r=prepareHairRemoval(hair(),W,H,face,{semanticVeto:veto,margin:4});
 assert.equal(r.ok,true,r.reason);
 for(let i=0;i<N;i++)if(veto.guard[i])assert.equal(r.keepMask[i],255);
 assert.equal(r.semanticGuardApplied,true);
 assert.equal(veto.independentGroundTruth,false);
 assert.equal(veto.editingAllowed,false);
});
