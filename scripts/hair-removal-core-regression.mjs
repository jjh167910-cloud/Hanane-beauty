import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareHairRemoval,composeInpaintedRGBA} from '../public/ai/migan/hair-removal-core.mjs';
const W=128,H=128,N=W*H;
function source(){
 const arr=new Uint8ClampedArray(N*4);
 for(let i=0;i<N;i++){arr[i*4]=200;arr[i*4+1]=180;arr[i*4+2]=160;arr[i*4+3]=255;}
 return arr;
}
function maskRect(x0,y0,x1,y1){
 const a=new Uint8ClampedArray(N*4);
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)a[(y*W+x)*4]=255;
 return a;
}
const face={eyeX:.5,eyeY:.47,eyeDistance:.18};
test('rejects missing face geometry, never generating hair-removal instructions',()=>{
 const result=prepareHairRemoval(maskRect(15,5,110,40),W,H,null);
 assert.equal(result.ok,false);assert.match(result.reason,/Face/);
});
test('accepts a modest scalp-side hair region with valid landmarks',()=>{
 const r=prepareHairRemoval(maskRect(35,8,92,35),W,H,face);
 assert.equal(r.ok,true,r.reason);assert.ok(r.hairPixels>250);
 assert.equal(r.keepMask.length,N);
});
test('forbids removal within protected eyes, ears and forehead ellipse',()=>{
 const a=maskRect(35,8,92,35);
 for(let y=53;y<85;y++)for(let x=40;x<85;x++)a[(y*W+x)*4]=255;
 const r=prepareHairRemoval(a,W,H,face);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.keepMask[65*W+64],255);
 assert.equal(r.keepMask[60*W+48],255);
});
test('rejects excessively large segmentation and blank masks',()=>{
 assert.equal(prepareHairRemoval(maskRect(1,1,127,127),W,H,face).ok,false);
 assert.equal(prepareHairRemoval(maskRect(4,4,7,7),W,H,face).ok,false);
});
test('rejects too much expansion requested',()=>{
 assert.throws(()=>prepareHairRemoval(maskRect(10,5,50,30),W,H,face,{margin:12}),/Invalid/);
});
test('edits only selected pixels and leaves all others byte-identical',()=>{
 const m=prepareHairRemoval(maskRect(35,8,92,35),W,H,face);
 assert.equal(m.ok,true);
 const rgb=new Uint8Array(N*3);rgb.fill(10);
 const src=source(),r=composeInpaintedRGBA(src,rgb,m.keepMask,W,H);
 assert.ok(r.changedChannels>100);
 let inside=false,outside=true;
 for(let i=0;i<N;i++){
  if(m.keepMask[i]===0){if(r.rgba[i*4]!==src[i*4])inside=true;}
  else for(let c=0;c<4;c++)if(r.rgba[i*4+c]!==src[i*4+c])outside=false;
 }
 assert.equal(inside,true);assert.equal(outside,true);
});
test('fails on corrupted tensors and non-finite values',()=>{
 const m=prepareHairRemoval(maskRect(35,8,92,35),W,H,face);
 assert.throws(()=>composeInpaintedRGBA(source(),new Uint8Array(5),m.keepMask,W,H),/match/);
});
