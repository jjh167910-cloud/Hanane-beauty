import test from 'node:test';
import assert from 'node:assert/strict';
import {makeLandmarkFaceZones} from '../public/ai/offhair-face-zones.mjs';
import {differenceMaskStudy,mapTopologyToRGBA} from '../public/ai/offhair-difference-masks.mjs';
const W=128,H=128,N=W*H;
const face={eyeX:.50,eyeY:.48,eyeDistance:.18,eyeSpan:.18,eyeRollRadians:0,
 eyes:[{x:.41,y:.48},{x:.59,y:.48}],
 noseX:.50,noseY:.565,mouthX:.50,mouthY:.67,
 earPoints:[{x:.32,y:.55},{x:.68,y:.55}]};
function mask(parts){
 const a=new Uint8Array(N*4);
 for(const [x0,y0,x1,y1] of parts)
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)a[(y*W+x)*4]=255;
 return a;
}
const study=(source,ref,options={})=>differenceMaskStudy({
 sourceRGBA:mask(source),referenceRGBA:mask(ref),width:W,height:H,
 sourceFace:face,referenceFace:face,faceProtection:'landmark-core',...options});
test('Eyes, nose, mouth, and ear anchors form immutable core masks',()=>{
 const out=makeLandmarkFaceZones(face,W,H);
 assert.equal(out.ok,true,out.reason);
 const at=(x,y)=>out.zones[y*W+x];
 assert.equal(at(Math.round(face.eyes[0].x*W),Math.round(face.eyeY*H)),1);
 assert.equal(at(Math.round(face.noseX*W),Math.round(face.noseY*H)),1);
 assert.equal(at(Math.round(face.mouthX*W),Math.round(face.mouthY*H)),1);
 assert.equal(at(Math.round(face.earPoints[0].x*W),Math.round(face.earPoints[0].y*H)),1);
 assert.equal(out.hasEarAnchors,true);
});
test('Forehead above eye band is provisional and not authorized for editing',()=>{
 const z=makeLandmarkFaceZones(face,W,H);
 assert.equal(z.zones[47*W+64],2);
 assert.equal(z.legalForAutomaticFaceEditing,false);
});
test('Face detector with only eyes is insufficient for a feature-core policy',()=>{
 assert.equal(makeLandmarkFaceZones({eyeX:.5,eyeY:.48,eyeDistance:.18,eyes:face.eyes},W,H).ok,false);
 const m=differenceMaskStudy({sourceRGBA:mask([[30,4,86,30]]),
  referenceRGBA:mask([[30,4,86,30]]),width:W,height:H,
  sourceFace:{eyeX:.5,eyeY:.48,eyeDistance:.18},referenceFace:face,
  faceProtection:'landmark-core'});
 assert.equal(m.ok,false);assert.match(m.reason,/geometry/);
});
test('Bangs become explicit unresolved forehead, not approved hair edit',()=>{
 const s=[[30,4,86,30]],t=[[30,4,86,30],[52,39,76,51]];
 const v=study(s,t);
 assert.ok(v.counts.foreheadPending>0);
 assert.equal(v.manualReviewRequired,true);
 assert.equal(v.eligibleForAutomatedEditing,false);
 assert.ok(v.labels.includes(5));
 assert.equal(v.referenceHairstyleGenerated,false);
 assert.equal(v.counts.preserve+v.counts.remove+v.counts.add+
  v.counts.overlap+v.counts.faceConflict+v.counts.foreheadPending,N);
});
test('Hair covering nose remains blocked as immutable face core',()=>{
 const v=study([[30,4,86,30]],[[30,4,86,30],[60,69,68,79]]);
 assert.equal(v.labels[72*W+64],4);
 assert.ok(v.counts.faceConflict>0);
});
test('Legacy protection remains identical with or without additional landmarks',()=>{
 const src=mask([[30,4,86,30]]),ref=mask([[44,4,90,30]]);
 const a=differenceMaskStudy({sourceRGBA:src,referenceRGBA:ref,width:W,height:H,
  sourceFace:face,referenceFace:face});
 const bare={eyeX:face.eyeX,eyeY:face.eyeY,eyeDistance:face.eyeDistance};
 const b=differenceMaskStudy({sourceRGBA:src,referenceRGBA:ref,width:W,height:H,
  sourceFace:bare,referenceFace:bare});
 assert.deepEqual(a.counts,b.counts);
});
test('Invalid geometry cannot silently enable edits',()=>{
 const wrong={...face,mouthY:face.eyeY-.05};
 assert.equal(makeLandmarkFaceZones(wrong,W,H).ok,false);
 const v=study([[30,4,86,30]],[[30,4,86,30]],{sourceFace:wrong});
 assert.equal(v.ok,false);
});
test('Forehead can be rendered distinct teal from immutable amber core',()=>{
 const v=study([[30,4,86,30]],[[30,4,86,30],[52,39,76,51]]);
 const rgba=mapTopologyToRGBA(v);
 let i=v.labels.indexOf(5);
 assert.ok(i>=0);
 assert.deepEqual(Array.from(rgba.subarray(i*4,i*4+4)),[43,167,151,190]);
});
