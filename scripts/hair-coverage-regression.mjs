import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../public/ai/hair-coverage.js',import.meta.url),'utf8');
const env={window:{}};vm.createContext(env);vm.runInContext(code,env);
const {evaluate}=env.window.HananehCoverage;
function sample(){
 const w=80,h=60,source=new Uint8ClampedArray(w*h*4),donor=new Uint8ClampedArray(w*h*4);
 return {w,h,source,donor,rect(x1,y1,x2,y2,kind,val=255){
  for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++){
   const p=(y*w+x)*4;
   if(kind==='source')source[p]=val;else donor[p+3]=val;
  }
 }};
}
test('well aligned hairstyle covers original hair',()=>{
 const a=sample();a.rect(15,8,65,40,'source');a.rect(15,8,65,40,'donor');
 assert.equal(evaluate(a.source,a.donor,a.w,a.h).status,'clear');
});
test('long-to-short uncovered original hair blocks export',()=>{
 const a=sample();a.rect(15,8,65,52,'source');a.rect(15,8,65,30,'donor');
 const r=evaluate(a.source,a.donor,a.w,a.h);
 assert.equal(r.status,'blocked');assert.ok(r.uncoveredFraction>0.4);
});
test('moderate hair mismatch warns without blocking export',()=>{
 const a=sample();a.rect(15,8,65,48,'source');a.rect(15,8,65,40,'donor');
 assert.equal(evaluate(a.source,a.donor,a.w,a.h).status,'warning');
});
test('uncertain or empty segmentations cannot certify a good fit',()=>{
 const a=sample();a.rect(5,2,15,10,'source');
 assert.equal(evaluate(a.source,a.donor,a.w,a.h).status,'inconclusive');
});
test('invalid shapes and options fail closed',()=>{
 const a=sample();
 assert.throws(()=>evaluate(a.source,new Uint8Array(8),a.w,a.h),/Invalid/);
 assert.throws(()=>evaluate(a.source,a.donor,a.w,a.h,{hairThreshold:300}),/Invalid/);
});
test('small isolated edge flyaways do not trigger a false hard block',()=>{
 const a=sample();a.rect(15,8,65,38,'source');a.rect(15,8,65,38,'donor');
 for(let y=8;y<38;y+=3)for(let x=15;x<65;x+=3)a.donor[(y*a.w+x)*4+3]=0;
 assert.equal(evaluate(a.source,a.donor,a.w,a.h).status,'clear');
});
