import test from 'node:test';
import assert from 'node:assert/strict';
import {locateForeheadCutoutRisk as locate}
 from '../public/ai/migan/hairline-hotspot-audit.mjs';
const W=128,H=128,N=W*H;
const fixture=(flat=true)=>{
 const rgba=new Uint8ClampedArray(N*4),
  opacity=new Uint8Array(N),zones=new Uint8Array(N),guard=new Uint8Array(N);
 for(let i=0;i<N;i++)rgba.set([220,195,181,255],4*i);
 for(let x=30;x<98;x++){
  const edge=flat?42:38+(x%9)*2;
  for(let y=16;y<edge;y++){
   const i=y*W+x;opacity[i]=255;rgba.set([33,27,25,255],i*4);
  }
  for(let y=edge;y<90;y++)zones[y*W+x]=2;
 }
 return {
  candidate:{ok:true,previewOnly:true,exportAllowed:false,width:W,height:H,
    rgba,opacity,diagnosticFlags:['fringe_occlusion_unresolved']},
  sourceFace:{eyeX:.5,eyeY:.51,eyeDistance:.22},
  semanticVeto:{ok:true,editingAllowed:false,independentGroundTruth:false,
    guard,width:W,height:H},
  faceZones:zones,width:W,height:H
 };
};
test('flat, high contrast face-adjacent cutout is a private inspection hotspot',()=>{
 const input=fixture();
 const result=locate(input),again=locate(input);
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.possibleArtificialHairline,true);
 assert.equal(result.needsHumanHairlineReview,true);
 assert.ok(result.findings.maximumNearHorizontalRunPx>20);
 assert.ok(result.findings.meanStepContrast>100);
 assert.ok(result.privateOverlay?.box?.width>10);
 assert.deepEqual(result,again);
 assert.equal(result.photorealismVerified,false);
 assert.equal(result.exportAllowed,false);
 assert.equal(result.commercialReleaseAllowed,false);
 // Review detection never mutates real displayed portrait.
 const before=input.candidate.rgba.slice();
 locate(input);
 assert.deepEqual(input.candidate.rgba,before);
});
test('jagged face-contact boundary cannot be misrepresented as a long flat run',()=>{
 const result=locate(fixture(false));
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.possibleArtificialHairline,false);
 assert.equal(result.needsHumanHairlineReview,true);
 assert.equal(result.photorealismVerified,false);
});
test('missing supported donor transition means undecidable, not automatic realism',()=>{
 const p=fixture();
 p.candidate.opacity.fill(0);
 const result=locate(p);
 assert.equal(result.ok,true);
 assert.equal(result.possibleArtificialHairline,false);
 assert.equal(result.findings.hairlineColumns,0);
 assert.equal(result.needsHumanHairlineReview,true);
});
test('tampered semantic guard, incorrect model provenance or face edits refuse',()=>{
 let p=fixture();p.semanticVeto.guard[0]=3;
 assert.equal(locate(p).ok,false);
 p=fixture();p.semanticVeto.editingAllowed=true;
 assert.equal(locate(p).ok,false);
 p=fixture();p.faceZones[20*W+40]=1;
 assert.equal(locate(p).ok,false,'Donor overlap with protected face core');
 p=fixture();p.candidate.exportAllowed=true;
 assert.equal(locate(p).ok,false);
 p=fixture();p.candidate.opacity=new Uint8Array(4);
 assert.equal(locate(p).ok,false);
});
test('invalid frames and proxy thresholds throw rather than silently degrade',()=>{
 const p=fixture();
 assert.throws(()=>locate({...p,width:20}),/Invalid/);
 assert.throws(()=>locate({...p,minRunRatio:2}),/Invalid/);
 assert.throws(()=>locate({...p,hairThreshold:-1}),/Invalid/);
});
