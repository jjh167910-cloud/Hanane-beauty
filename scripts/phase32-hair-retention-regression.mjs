import test from 'node:test';
import assert from 'node:assert/strict';
import {auditHairEdgeRetention as audit} from '../public/ai/migan/hair-retention-risk.mjs';
const W=80,H=80,N=W*H;
const make=()=>{
 const sourceHairRGBA=new Uint8ClampedArray(4*N),
  restoredRGBA=new Uint8ClampedArray(4*N),
  a=new Uint8ClampedArray(4*N),b=new Uint8ClampedArray(4*N),
  old=new Uint8Array(N),next=new Uint8Array(N),
  keepMask=new Uint8Array(N),guard=new Uint8Array(N),faceZones=new Uint8Array(N);
 keepMask.fill(255);
 for(let i=0;i<N;i++){
  a.set([90,95,101,255],4*i);b.set([90,95,101,255],4*i);
  restoredRGBA.set([90,95,101,255],4*i);sourceHairRGBA.set([0,0,0,255],4*i);
 }
 for(let y=10;y<40;y++)for(let x=17;x<60;x++){
  const i=y*W+x;old[i]=255;next[i]=254;
  const strand=(x%6===0?12:0);
  a.set([47+strand,50+strand,38+strand,255],4*i);
  b.set([47+strand,50+strand,38+strand,255],4*i);
  if(y===10||x===17||x===59||y===39){
   next[i]=237;b.set([55,57,46,255],4*i);
  }
  if(y<20){keepMask[i]=0;sourceHairRGBA[4*i]=255;}
 }
 for(let y=52;y<70;y++)for(let x=25;x<55;x++)guard[y*W+x]=1;
 const baseline={ok:true,previewOnly:true,exportAllowed:false,
  rgba:a,opacity:old,width:W,height:H};
 const variant={ok:true,previewOnly:true,exportAllowed:false,
  rgba:b,opacity:next,width:W,height:H};
 return {width:W,height:H,baseline,variant,restoredRGBA,sourceHairRGBA,
  keepMask,faceZones,semanticVeto:{ok:true,editingAllowed:false,
   independentGroundTruth:false,width:W,height:H,guard}};
};
test('small guarded donor reduction passes proxy audit without pretending real quality',()=>{
 const p=make(),r=audit(p);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.proxyCheckPassed,true);
 assert.equal(r.exportAllowed,false);assert.equal(r.qualityVerified,false);
 assert.equal(r.verifiedSeparateHumanSubjects,false);
 assert.ok(r.metrics.donorOpacityRetentionFraction>.985);
 assert.equal(r.metrics.criticallyExposedSourceHairPixels,0);
 assert.ok(r.metrics.hairInteriorNeighbourPairs>0);
 assert.ok(r.metrics.gradientEnergyRatio>0);
 const again=audit(p);assert.deepEqual(r,again,'Repeatable pure local proxy audit');
});
test('flat donor or lost detail never obtains a passing proxy score',()=>{
 const p=make();
 for(let y=10;y<40;y++)for(let x=17;x<60;x++){
  const i=y*W+x;
  p.baseline.rgba.set([40,40,40,255],4*i);
  p.variant.rgba.set([40,40,40,255],4*i);
 }
 let r=audit(p);
 assert.equal(r.ok,true);
 assert.equal(r.proxyCheckPassed,false);
 assert.ok(r.warnings.includes('no_measurable_donor_strand_detail'));
 const q=make();
 for(let y=10;y<40;y++)for(let x=17;x<60;x++){
  const i=y*W+x;
  q.variant.rgba.set([47,50,38,255],4*i);
 }
 r=audit(q);
 assert.equal(r.ok,true);
 assert.equal(r.proxyCheckPassed,false);
 assert.ok(r.warnings.includes('loss_of_local_hair_texture_gradient_proxy'));
});

test('strong fade can improve seam but fails scalp-exposure and coverage safety',()=>{
 const p=make();
 for(let y=10;y<30;y++)for(let x=17;x<60;x++){
  const i=y*W+x;
  p.variant.opacity[i]=110;
  p.variant.rgba.set([80,83,86,255],4*i);
 }
 const r=audit(p);
 assert.equal(r.ok,true);
 assert.equal(r.proxyCheckPassed,false);
 assert.ok(r.warnings.includes('donor_opacity_mass_loss'));
 assert.ok(r.warnings.includes('newly_reconstructed_scalp_visibility_risk'));
 assert.ok(r.metrics.criticallyExposedSourceHairPixels>0);
 assert.equal(r.qualityVerified,false);
});
test('even one newly edited background, increased alpha or face overlap is refused',()=>{
 let p=make();p.variant.rgba[0]=99;
 assert.equal(audit(p).ok,false);
 p=make();p.variant.opacity[15*W+20]=255+0;
 p.variant.opacity[15*W+20]=p.baseline.opacity[15*W+20]+0;
 p.variant.opacity[0]=1;
 assert.equal(audit(p).ok,false);
 p=make();p.faceZones[10*W+18]=1;
 assert.equal(audit(p).ok,false);
 p=make();p.semanticVeto.guard[15*W+20]=1;
 assert.equal(audit(p).ok,false);
 p=make();p.variant.rgba[3]=2;
 assert.equal(audit(p).ok,false);
});
test('invalid masks, missing provenance and forged customer approval fail closed',()=>{
 let p=make();p.keepMask[0]=12;
 assert.equal(audit(p).ok,false);
 p=make();p.semanticVeto.editingAllowed=true;
 assert.equal(audit(p).ok,false);
 p=make();p.variant.exportAllowed=true;
 assert.equal(audit(p).ok,false);
 p=make();p.sourceHairRGBA=new Uint8Array(3);
 assert.equal(audit(p).ok,false);
 assert.throws(()=>audit({...make(),width:1,height:80}),/Invalid/);
 assert.throws(()=>audit({...make(),minTotalOpacityRetention:1.4}),/Invalid/);
});
