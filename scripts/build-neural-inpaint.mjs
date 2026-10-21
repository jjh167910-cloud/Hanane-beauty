/**
 * Quality-first optional offline neural inpainting bundle.
 * All model/runtime bytes are downloaded at BUILD TIME, never during inference.
 * Cloudflare Workers static assets have a 25-MiB single-file limit: shard model.
 * Model rights: Picsart AI Research LICENSE-WEIGHTS (MIT), copyright 2024.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dest=path.join(root,'public','ai','inpaint');
const vendor=path.join(root,'node_modules','onnxruntime-web','dist');
const files=['ort.wasm.min.mjs','ort-wasm-simd-threaded.wasm','ort-wasm-simd-threaded.mjs'];
await fs.mkdir(path.join(dest,'runtime'),{recursive:true});
for(const file of files)await fs.copyFile(path.join(vendor,file),path.join(dest,'runtime',file));
const model='migan_pipeline_v2.onnx';
const remote='https://huggingface.co/andraniksargsyan/migan/resolve/1538c135034b8c535f198d2a3569eaefc0309d5a/'+model;
const expectedSha='6f1f3530a1a2324b19752018ce756088b07973cda8d7d890034ace5c8a48c40b';
const original=path.join(dest,model);
const sha=b=>createHash('sha256').update(b).digest('hex');
let bytes;
try{bytes=await fs.readFile(original);}catch{}
// Reuse verified shards on repeat builds to avoid needless model downloads.
if(!bytes)try{
 const existing=await Promise.all(['model-part-00.bin','model-part-01.bin','model-part-02.bin']
  .map(file=>fs.readFile(path.join(dest,file))));
 const previous=Buffer.concat(existing);
 if(sha(previous)===expectedSha)bytes=previous;
}catch{}
if(!bytes){
 const response=await fetch(remote,{redirect:'follow',signal:AbortSignal.timeout(180000)});
 if(!response.ok)throw Error('MI-GAN model download failed: HTTP '+response.status);
 bytes=Buffer.from(await response.arrayBuffer());
}
const digest=sha(bytes);
if(bytes.length!==28079181||digest!==expectedSha)throw Error('MI-GAN model size/hash mismatch; refusing unsafe binary: '+digest);
const shardSize=12*1024*1024;
const parts=[];
for(let offset=0;offset<bytes.length;offset+=shardSize){
 const name='model-part-'+String(parts.length).padStart(2,'0')+'.bin';
 const piece=bytes.subarray(offset,Math.min(bytes.length,offset+shardSize));
 await fs.writeFile(path.join(dest,name),piece);
 parts.push({file:name,size:piece.length});
}
if(parts.length!==3)throw Error('Expected exactly three Cloudflare-safe model parts');
await fs.rm(original,{force:true});
const meta={model:'MI-GAN ONNX pipeline v2',modelSha256:expectedSha,
  modelBytes:bytes.length,parts,runtime:'onnxruntime-web',
  license:'MIT Picsart AI Research',inference:'on-device-only',purpose:'background inpainting'};
await fs.writeFile(path.join(dest,'bundle.json'),JSON.stringify(meta,null,2)+'\n');
console.log('OFFLINE MI-GAN: packaged '+bytes.length+' bytes in '+parts.length+' shards; SHA256 '+digest);
