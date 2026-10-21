import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {buildNeuralEraseMask,imageDataToCHW,neuralOutputToRGBA}
 from '../public/ai/neural-inpaint-core.mjs';
const sample=(width=32,height=32)=>{
 const n=width*height,original=new Uint8ClampedArray(n*4),
 projected=new Uint8ClampedArray(n*4),guard=new Uint8Array(n);
 for(let y=6;y<22;y++)for(let x=8;x<20;x++)original[(y*width+x)*4]=255;
 return {original,projected,guard,width,height};
};
test('Neural erase mask only removes original hair not covered by the new style',()=>{
 const f=sample();
 for(let y=6;y<11;y++)for(let x=8;x<20;x++)f.projected[(y*f.width+x)*4]=255;
 const out=buildNeuralEraseMask(...Object.values(f));
 assert.equal(out.eligible,true);
 assert.equal(out.mask[8*f.width+12],255);
 assert.equal(out.mask[16*f.width+12],0);
 assert.equal(out.mask[29*f.width+28],255);
});
test('Facial identity mask excludes protected eyes and facial regions',()=>{
 const f=sample();
 for(let y=12;y<18;y++)for(let x=11;x<17;x++)f.guard[y*f.width+x]=255;
 const out=buildNeuralEraseMask(...Object.values(f));
 assert.equal(out.eligible,true);
 assert.equal(out.mask[14*f.width+14],255);
 assert.equal(out.mask[20*f.width+14],0);
});
test('Large erasure areas are rejected instead of inventing a complete scalp',()=>{
 const f=sample(64,64);
 f.original.fill(0);
 for(let y=2;y<55;y++)for(let x=2;x<62;x++)f.original[(y*f.width+x)*4]=255;
 const out=buildNeuralEraseMask(...Object.values(f));
 assert.equal(out.eligible,false);
 assert.equal(out.reason,'oversized-removal');
});
test('Insufficient or invalid segmentation never starts expensive inference',()=>{
 const f=sample();
 f.original.fill(0);
 assert.equal(buildNeuralEraseMask(...Object.values(f)).eligible,false);
 assert.throws(()=>buildNeuralEraseMask(f.original,f.projected,new Uint8Array(10),f.width,f.height),/Invalid/);
});
test('Image conversion uses uint8 CHW RGB as required by MI-GAN ONNX pipeline',()=>{
 const inpx=new Uint8ClampedArray([20,30,40,255,50,60,70,255]);
 const out=imageDataToCHW(inpx,2,1);
 assert.deepEqual([...out],[20,50,30,60,40,70]);
});
test('MI-GAN output patches leave non-hair pixels transparent',()=>{
 const w=4,h=4,n=w*h,chw=new Uint8Array(n*3);
 chw.fill(180);const mask=new Uint8Array(n);mask.fill(255);mask[5]=0;mask[6]=0;
 const out=neuralOutputToRGBA(chw,mask,w,h);
 assert.equal(out[0+3],0);
 assert.equal(out[5*4],180);
 assert.ok(out[5*4+3]>0&&out[5*4+3]<=255);
 assert.equal(out[15*4+3],0);
});
test('Cloudflare 25 MiB limit is respected by splitting the pinned model into shards',()=>{
 const source=fs.readFileSync(new URL('../scripts/build-neural-inpaint.mjs',import.meta.url),'utf8');
 assert.match(source,/const shardSize=12\*1024\*1024/);
 assert.match(source,/if\(parts\.length!==3\)/);
 assert.match(source,/6f1f3530a1a2324b19752018ce756088b07973cda8d7d890034ace5c8a48c40b/);
 assert.match(source,/if\(digest!==expectedSha\)/);
});
test('PWA keeps large advanced model optional while caching control modules offline',()=>{
 const sw=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(sw,/HQ_PREPARE/);
 assert.match(sw,/HQ_AUDIT/);
 assert.match(sw,/hananeh-hq-inpaint-model-v1/);
 assert.match(sw,/\.\/ai\/neural-inpaint-core\.mjs/);
 assert.doesNotMatch(sw.match(/const CORE=\[[^;]+/s)?.[0]||'',/model-part-00/);
 assert.match(html,/id="neuralInstall"/);
 assert.match(html,/id="neuralRun"/);
 assert.match(html,/function neuralTicket/);
 assert.match(html,/async function runNeuralHairRepair/);
});
test('Neural worker confines image processing to one local worker and checks model integrity',()=>{
 const code=fs.readFileSync(new URL('../public/ai/neural-inpaint-worker.mjs',import.meta.url),'utf8');
 assert.match(code,/crypto\.subtle\.digest\('SHA-256',binary\)/);
 assert.match(code,/executionProviders:\['wasm'\]/);
 assert.match(code,/numThreads=1/);
 assert.doesNotMatch(code,/fetch\(['"]https?:/);
});

test('The actual offline production bundle contains verified MI-GAN weights and runtime',()=>{
 const root=new URL('../public/ai/inpaint/',import.meta.url);
 const shards=['model-part-00.bin','model-part-01.bin','model-part-02.bin'];
 const buffers=shards.map(p=>{
  const file=new URL(p,root);
  assert.ok(fs.existsSync(file),'Missing offline model file: '+p);
  const data=fs.readFileSync(file);
  assert.ok(data.length>100000&&data.length<=12*1024*1024,'Invalid shard: '+p);
  return data;
 });
 const model=Buffer.concat(buffers);
 assert.equal(model.length,28079181);
 assert.equal(createHash('sha256').update(model).digest('hex'),
  '6f1f3530a1a2324b19752018ce756088b07973cda8d7d890034ace5c8a48c40b');
 for(const p of ['runtime/ort.wasm.min.mjs','runtime/ort-wasm-simd-threaded.mjs','runtime/ort-wasm-simd-threaded.wasm'])
  assert.ok(fs.statSync(new URL(p,root)).size>1000,'Missing local ONNX runtime: '+p);
});

test('Neural restoration rejects a removal mask cut off by the crop edge',()=>{
 const w=128,h=128,n=w*h;
 const original=new Uint8ClampedArray(n*4),projected=new Uint8ClampedArray(n*4),
  guard=new Uint8Array(n);
 for(let y=1;y<60;y++)for(let x=20;x<65;x++)original[(y*w+x)*4]=255;
 const out=buildNeuralEraseMask(original,projected,guard,w,h);
 assert.equal(out.eligible,false);
 assert.equal(out.reason,'crop-boundary');
});
test('Interior neural removal regions remain eligible when otherwise valid',()=>{
 const w=128,h=128,n=w*h;
 const original=new Uint8ClampedArray(n*4),projected=new Uint8ClampedArray(n*4),
  guard=new Uint8Array(n);
 for(let y=30;y<70;y++)for(let x=25;x<60;x++)original[(y*w+x)*4]=255;
 const out=buildNeuralEraseMask(original,projected,guard,w,h);
 assert.equal(out.eligible,true);
 assert.ok(out.coverage>100);
});

test('Neural inpainting avoids the invisible lower safety-band cutoff on long hair',()=>{
 const w=128,h=128,n=w*h;
 const old=new Uint8ClampedArray(n*4),newHair=new Uint8ClampedArray(n*4),
       guard=new Uint8Array(n);
 for(let y=30;y<115;y++)for(let x=25;x<80;x++)old[(y*w+x)*4]=255;
 const output=buildNeuralEraseMask(old,newHair,guard,w,h);
 assert.equal(output.eligible,false);
 assert.equal(output.reason,'crop-boundary');
});
