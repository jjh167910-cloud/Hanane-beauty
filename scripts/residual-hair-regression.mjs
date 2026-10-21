import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {repairSmallHairPatches} from '../public/ai/residual-hair-repair.mjs';

function fixture(width=40,height=42) {
 const portrait=new Uint8ClampedArray(width*height*4);
 const original=new Uint8ClampedArray(width*height*4);
 const projected=new Uint8ClampedArray(width*height*4);
 const protection=new Uint8ClampedArray(width*height);
 for(let i=0;i<width*height;i++){
  portrait[i*4]=205;portrait[i*4+1]=198;portrait[i*4+2]=185;portrait[i*4+3]=255;
 }
 for(let y=7;y<28;y++)for(let x=12;x<18;x++){
  const i=y*width+x,k=i*4;
  original[k]=255;portrait[k]=52;portrait[k+1]=42;portrait[k+2]=33;
  if(y<14)projected[k]=255;
 }
 return {portrait,original,projected,protection,width,height};
}
test('Removes limited residual hair against uniform salon backgrounds',()=>{
 const f=fixture(),out=repairSmallHairPatches(...Object.values(f));
 assert.ok(out.corrected>40);
 const i=(25*f.width+15)*4;
 assert.deepEqual([...out.patch.slice(i,i+3)],[205,198,185]);
 assert.ok(out.patch[i+3]>=200);
});
test('Non-uniform backgrounds are not replaced by a guessed flat color',()=>{
 const f=fixture();
 for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){
  const i=(y*f.width+x)*4;
  if(f.original[i]===0)f.portrait[i]=((x+y)%2)*170+65;
 }
 const out=repairSmallHairPatches(...Object.values(f));
 assert.equal(out.corrected,0);
 assert.ok(out.rejected>0);
});
test('Face proximity blocks repair and protects identity',()=>{
 const f=fixture();
 for(let y=12;y<30;y++)for(let x=18;x<23;x++)f.protection[y*f.width+x]=255;
 const out=repairSmallHairPatches(...Object.values(f));
 assert.equal(out.corrected,0);
 assert.ok(out.rejected>0);
});
test('Missing segmentation and invalid dimensions never infer hair replacement',()=>{
 const f=fixture();
 const noHair=f.original.slice();noHair.fill(0);
 assert.equal(repairSmallHairPatches(f.portrait,noHair,f.projected,f.protection,f.width,f.height).corrected,0);
 assert.throws(()=>repairSmallHairPatches(f.portrait,f.original,f.projected,new Uint8Array(10),f.width,f.height),/Invalid/);
});
test('New repair module is precached and optional in the customer UI',()=>{
 const sw=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
 const page=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const module=fs.readFileSync(new URL('../public/ai/residual-hair-repair.mjs',import.meta.url),'utf8');
 assert.match(sw,/\.\/ai\/residual-hair-repair\.mjs/);
 assert.match(page,/id="repairHair"/);
 assert.match(page,/import\('\.\/ai\/residual-hair-repair\.mjs'\)/);
 assert.doesNotMatch(module,/https?:\/\//);
});
