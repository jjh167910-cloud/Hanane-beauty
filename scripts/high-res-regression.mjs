import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../public/ai/high-res-engine.js',import.meta.url),'utf8');
const scope={window:{}};vm.createContext(scope);vm.runInContext(code,scope);
const {exportScale,sourcePlacement,paintHair}=scope.window.HananehExport;

test('12-megapixel portraits retain bounded 2x export resolution',()=>{
 assert.equal(exportScale(3000,4000,768,960),2);
});
test('small sources are not artificially enlarged at export',()=>{
 assert.equal(exportScale(384,480,768,960),1);
});
test('landscape photo stays proportional and centered',()=>{
 const r=sourcePlacement(1600,900,768,960,2);
 assert.deepEqual(Object.values(r),[0,528,1536,864]);
});
test('portrait photo stays proportional and centered',()=>{
 const r=sourcePlacement(800,1600,768,960);
 assert.deepEqual(Object.values(r),[144,0,480,960]);
});
test('pixel budget prevents excessive allocations',()=>{
 const scale=exportScale(9000,9000,768,960,{maxPixels:1000000});
 assert.ok(scale>=1&&scale<1.2);
});
test('invalid source dimensions fail closed',()=>{
 assert.throws(()=>exportScale(0,1024,768,960),/Invalid/);
});
test('hair placement is identical after uniform export scaling',()=>{
 const calls=[];
 const ctx=Object.fromEntries(['save','scale','translate','rotate','drawImage','restore']
  .map(name=>[name,(...args)=>calls.push([name,...args])]));
 paintHair(ctx,{}, {x:200,y:210,s:1.3,refEyeX:100,refEyeY:110},
           {x:5,y:-3,rotation:0,scale:100},2);
 assert.equal(calls[0][0],'save');
 assert.deepEqual(Array.from(calls[1]),['scale',2,2]);
 assert.deepEqual(Array.from(calls[2]),['translate',205,207]);
 assert.deepEqual(Array.from(calls[calls.length-2]).slice(1),[{},-100,-110,512,512]);
});
