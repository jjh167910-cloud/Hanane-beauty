// Build-time only: vendored inpainting experiment, NEVER a runtime cloud request.
// Source: andraniksargsyan/migan, migan.onnx (MIT weights, see upstream LICENSE-WEIGHTS).
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'public/ai/migan');
const runtime=path.join(root,'node_modules/onnxruntime-web/dist');
const sha256=b=>createHash('sha256').update(b).digest('hex');
const expected='593eba0b7e04730f1b61c0a3cbca68d97d8d6a7ff5c6a44a7b9d7fcd880fc5ae';
const url='https://huggingface.co/andraniksargsyan/migan/resolve/main/migan.onnx';
await fs.mkdir(path.join(target,'parts'),{recursive:true});
await fs.mkdir(path.join(target,'ort'),{recursive:true});
let model;
const cached=path.join(root,'.model-cache/migan.onnx');
try{model=await fs.readFile(cached)}catch{
 const result=await fetch(url,{signal:AbortSignal.timeout(180000)});
 if(!result.ok)throw new Error('MI-GAN checkpoint unavailable: HTTP '+result.status);
 model=Buffer.from(await result.arrayBuffer());
 await fs.mkdir(path.dirname(cached),{recursive:true});
 await fs.writeFile(cached,model);
}
if(model.length<25000000||model.length>40000000||sha256(model)!==expected)
 throw new Error('MI-GAN checkpoint integrity mismatch; expected '+expected+' got '+sha256(model));
const chunkSize=4*1024*1024,parts=[];
for(let i=0,offset=0;offset<model.length;i++,offset+=chunkSize){
 const data=model.subarray(offset,offset+chunkSize);
 const name='part-'+String(i).padStart(3,'0')+'.bin';
 await fs.writeFile(path.join(target,'parts',name),data);
 parts.push({name,bytes:data.length,sha256:sha256(data)});
}
const filenames=await fs.readdir(runtime);
const copyNames=filenames.filter(n=>n==='ort.min.js'||n==='ort.all.min.js'||(n.startsWith('ort-wasm')&&(n.endsWith('.wasm')||n.endsWith('.mjs'))));
if(!copyNames.some(n=>n==='ort.min.js'||n==='ort.all.min.js')||!copyNames.some(n=>n.endsWith('.wasm')))
 throw new Error('ONNX Runtime Web distribution incompatible: '+filenames.join(','));
for(const name of copyNames)await fs.copyFile(path.join(runtime,name),path.join(target,'ort',name));
const rtPkg=JSON.parse(await fs.readFile(path.join(root,'node_modules/onnxruntime-web/package.json'),'utf8'));
const manifest={model:'MI-GAN 512 Places2',purpose:'experimental inpainting, not hairstyle generation',
 source:url,model_sha256:expected,size:model.length,chunkBytes:chunkSize,parts,
 runtime:'onnxruntime-web',runtimeVersion:rtPkg.version,runtimeFiles:copyNames};
await fs.writeFile(path.join(target,'model-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Verified offline MI-GAN packaged',JSON.stringify({bytes:model.length,chunks:parts.length,runtime:rtPkg.version,runtimeFiles:copyNames}));
