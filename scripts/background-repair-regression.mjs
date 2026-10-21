import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const sourceCode=fs.readFileSync(new URL('../public/ai/background-repair.js',import.meta.url),'utf8');
const env={window:{}};vm.createContext(env);vm.runInContext(sourceCode,env);
const repair=env.window.HananehBackgroundRepair.repair;
const W=192,H=240,FACE={eyeX:.5,eyeY:.42,eyeDistance:.12};
function scene(){
 const source=new Uint8ClampedArray(W*H*4),mask=source.slice(),donor=source.slice();
 for(let i=0;i<source.length;i+=4){
  source[i]=source[i+1]=source[i+2]=180;source[i+3]=255;mask[i]=0;mask[i+3]=255;donor[i+3]=0;
 }
 return {source,mask,donor};
}
function rect(buf,x1,y1,x2,y2,channel,value){
 for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++)buf[(y*W+x)*4+channel]=value;
}
function fixture(){
 const o=scene();
 rect(o.mask,28,5,164,41,0,255);rect(o.donor,28,5,164,41,3,255);
 rect(o.mask,19,15,25,34,0,255);
 for(let y=15;y<34;y++)for(let x=19;x<25;x++){
  const k=4*(y*W+x);o.source[k]=30;o.source[k+1]=24;o.source[k+2]=22;
 }
 return o;
}
test('small old-hair wisps can be patched only against plain background',()=>{
 const o=fixture(),v=repair(o.source,o.mask,o.donor,W,H,FACE);
 assert.equal(v.stats.status,'partial-repair');assert.ok(v.stats.repairedPixels>=110);
 const k=(24*W+21)*4;assert.equal(v.overlay[k],180);assert.ok(v.overlay[k+3]>0);
});
test('outside hair region the output is strictly transparent',()=>{
 const o=fixture(),v=repair(o.source,o.mask,o.donor,W,H,FACE);
 assert.equal(v.overlay[(80*W+180)*4+3],0);
});
test('reject textured background',()=>{
 const o=fixture();
 for(let y=0;y<54;y++)for(let x=0;x<50;x++){
  const k=(y*W+x)*4;
  if(o.mask[k]===0)o.source[k]=o.source[k+1]=o.source[k+2]=((x+y)%2)?40:245;
 }
 assert.equal(repair(o.source,o.mask,o.donor,W,H,FACE).stats.repairedPixels,0);
});
test('reject large hair reconstruction requests',()=>{
 const o=fixture();rect(o.mask,5,50,45,120,0,255);
 const v=repair(o.source,o.mask,o.donor,W,H,FACE);
 assert.equal(v.stats.reason,'substantial-residual-hair');assert.equal(v.stats.repairedPixels,0);
});
test('missing face alignment stops repair',()=>{
 const o=fixture();assert.equal(repair(o.source,o.mask,o.donor,W,H,null).stats.reason,'unreliable-face-location');
});
test('malformed mask sizes are rejected',()=>{
 const o=fixture();assert.throws(()=>repair(o.source,o.mask,new Uint8Array(5),W,H,FACE),/Invalid/);
});
test('cropped boundary wisps remain untouched',()=>{
 const o=fixture();rect(o.mask,0,10,5,30,0,255);
 const v=repair(o.source,o.mask,o.donor,W,H,FACE);
 assert.equal(v.overlay[(13*W+1)*4+3],0);
});
test('protected facial region remains untouched',()=>{
 const o=fixture();rect(o.mask,85,85,95,100,0,255);
 const v=repair(o.source,o.mask,o.donor,W,H,FACE);
 assert.equal(v.overlay[(90*W+90)*4+3],0);
});
test('invalid thresholds are rejected',()=>{
 const o=fixture();assert.throws(()=>repair(o.source,o.mask,o.donor,W,H,FACE,{sourceThreshold:-4}),/Invalid/);
});
