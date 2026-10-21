import test from 'node:test';
import assert from 'node:assert/strict';
import {differenceMaskStudy,mapTopologyToRGBA} from '../public/ai/offhair-difference-masks.mjs';
const W=128,H=128,N=W*H;
const face={eyeX:.5,eyeY:.48,eyeDistance:.18};
function mask(rectangles){
 const a=new Uint8Array(N*4);
 for(const [x0,y0,x1,y1] of rectangles)
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)a[(y*W+x)*4]=255;
 return a;
}
const top=(s,r,opts={})=>differenceMaskStudy({
 sourceRGBA:mask(s),referenceRGBA:mask(r),width:W,height:H,
 sourceFace:face,referenceFace:face,...opts
});
test('correct remove/add/overlap topology on translated scalp shapes',()=>{
 const v=top([[28,4,69,28]],[[44,4,87,28]]);
 assert.equal(v.ok,true,v.reason);
 assert.equal(v.counts.remove,16*24);
 assert.equal(v.counts.add,18*24);
 assert.equal(v.counts.overlap,25*24);
 assert.equal(v.counts.faceConflict,0);
 assert.equal(v.counts.sourceHair,41*24);
 assert.equal(v.counts.targetHairProxy,43*24);
 assert.equal(v.counts.preserve+v.counts.remove+v.counts.add+v.counts.overlap+v.counts.faceConflict,N);
 assert.equal(v.referenceHairstyleGenerated,false);
});
test('identical masks are entirely overlap and preserve; not a hypothetical edit cost saving',()=>{
 const v=top([[28,4,69,28]],[[28,4,69,28]]);
 assert.equal(v.ok,true);
 assert.equal(v.counts.remove,0);assert.equal(v.counts.add,0);
 assert.equal(v.counts.overlap,41*24);
});
test('rejects unreliable landmarks and extreme source/reference face scales',()=>{
 const s=[[25,4,70,30]];
 assert.match(top(s,s,{sourceFace:null}).reason,/landmarks/);
 const tiny={...face,eyeDistance:.056};
 assert.match(top(s,s,{referenceFace:tiny}).reason,/scale/);
});
test('hair over protected central face is not assigned to edit',()=>{
 const s=[[28,4,69,28],[50,58,70,72]];
 const v=top(s,[[28,4,69,28]]);
 assert.ok(v.counts.faceConflict>0);
 const i=65*W+60;
 assert.equal(v.labels[i],4);
});
test('rejects implausibly large source and reference hair regions',()=>{
 const massive=[[1,1,127,127]];
 assert.match(top(massive,[[28,4,69,28]]).reason,/Source/);
 assert.match(top([[28,4,69,28]],massive).reason,/Reference/);
});
test('does not silently treat clipped reference hair as a valid aligned hairstyle',()=>{
 const hugeTarget=[[2,2,67,36]];
 const v=top([[22,4,70,30]],hugeTarget,{
   referenceFace:{eyeX:.8,eyeY:.48,eyeDistance:.11}
 });
 assert.equal(v.ok,false);
 assert.ok(v.reason.includes('reference_head_hair_cropped')||v.reason.includes('hair_overlaps_protected_face'),v.reason);
});
test('RGBA visualization has consistent alpha and distinct topology colors',()=>{
 const v=top([[28,4,69,28]],[[44,4,87,28]]);
 const rgb=mapTopologyToRGBA(v);
 assert.equal(rgb.length,N*4);
 const index=(x,y)=>(y*W+x)*4;
 assert.equal(rgb[index(32,10)],217);
 assert.equal(rgb[index(80,10)],55);
 assert.equal(rgb[index(50,10)],163);
 assert.equal(rgb[index(5,5)+3],0);
});
test('strict dimensional and option validation blocks malformed masks',()=>{
 assert.throws(()=>differenceMaskStudy({sourceRGBA:new Uint8Array(3),referenceRGBA:mask([]),width:W,height:H}),/RGBA/);
 assert.throws(()=>top([[28,4,69,28]],[[44,4,87,28]],{threshold:10}),/options/);
 assert.throws(()=>mapTopologyToRGBA({labels:new Uint8Array(2),width:3,height:3}),/missing/);
});
test('mapping translates reference origin via normalized eye anchors',()=>{
 const srcFace={...face,eyeX:.50},refFace={...face,eyeX:.60};
 const v=top([[31,4,65,29]],[[43,4,77,29]],{sourceFace:srcFace,referenceFace:refFace});
 assert.equal(v.ok,true,v.reason);
 // Destination to reference x shift is +0.1*W, i.e. 13 pixels after rounding.
 assert.ok(v.counts.overlap>500);
 assert.ok(v.counts.add<200);
});

test('eye-roll similarity alignment restores scalp support under synthetic rigid roll',()=>{
 const deg=Math.PI/6,cs=Math.cos(deg),sn=Math.sin(deg);
 const src=mask([[45,9,84,30]]);
 const dst=new Uint8Array(N*4);
 const cx=face.eyeX*W,cy=face.eyeY*H;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const dx=x-cx,dy=y-cy;
  const ox=Math.round(cx+cs*dx+sn*dy),oy=Math.round(cy-sn*dx+cs*dy);
  if(ox>=0&&ox<W&&oy>=0&&oy<H)dst[(y*W+x)*4]=src[(oy*W+ox)*4];
 }
 const a={...face,eyeSpan:face.eyeDistance,eyeRollRadians:0};
 const b={...face,eyeSpan:face.eyeDistance,eyeRollRadians:deg};
 const options={sourceRGBA:src,referenceRGBA:dst,width:W,height:H,sourceFace:a,referenceFace:b};
 const simple=differenceMaskStudy({...options,alignment:'eye-scale'});
 const rotated=differenceMaskStudy({...options,alignment:'eye-similarity'});
 assert.ok(rotated.counts.overlap>simple.counts.overlap,
  'Similarity correction must improve overlap for pure head-roll data');
 assert.ok(rotated.counts.remove<simple.counts.remove,
  'Similarity correction should reduce false hair-removal regions');
});
test('roll-corrected mapping fails closed when roll inputs are unknown',()=>{
 const a=mask([[28,4,69,28]]);
 const v=differenceMaskStudy({sourceRGBA:a,referenceRGBA:a,width:W,height:H,
  sourceFace:face,referenceFace:face,alignment:'eye-similarity'});
 assert.equal(v.ok,false);assert.match(v.reason,/rotation/);
});
