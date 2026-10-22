/* Phase 38 build-time only. No CDN, Hugging Face or cloud call at
 * inference time. Licensed portrait-MATTING is not hair-specific alpha.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const folder=path.join(root,'public/ai/migan/models');
const cache=path.join(root,'.model-cache/portrait-modnet-fp16.onnx');
const modelName='portrait-modnet-fp16.onnx';
const source='https://huggingface.co/Xenova/modnet/resolve/7e0f55f28727b43369531f75e0539ecc4912af82/onnx/model_fp16.onnx';
const sha='25f165da9bfd30830a575f1f0490f1acd995975cb349bc02f3d79332e1fe5cf6';
const size=12984781;
const hash=data=>createHash('sha256').update(data).digest('hex');
let data;
try{data=await fs.readFile(cache)}catch{
 const res=await fetch(source,{signal:AbortSignal.timeout(100000)});
 if(!res.ok||res.redirected===false&&res.url.includes('login'))
  throw Error('Pinned MODNet file unavailable: HTTP '+res.status);
 data=Buffer.from(await res.arrayBuffer());
}
if(data.length!==size||hash(data)!==sha)
 throw Error('Pinned MODNet ONNX mismatch, refusing untrusted model bytes');
await fs.mkdir(folder,{recursive:true});
await fs.writeFile(path.join(folder,modelName),data);
await fs.mkdir(path.dirname(cache),{recursive:true});
await fs.writeFile(cache,data);
const manifest={
 schema:'HANANEH-MODNET-PORTRAIT-RESEARCH-v1',
 id:'Xenova/modnet',
 model: './models/'+modelName,
 description:'Portrait alpha matting; NOT a hair-only alpha matte or hair generator',
 source:source,
 original:'https://github.com/ZHKKKe/MODNet',
 sha256:sha,bytes:size,
 modelRepoLicenseLabel:'apache-2.0',
 input:{name:'input',type:'float32',shape:[1,3,512,512],
  normalizedRGB:'(channel/255-.5)/.5; NCHW'},
 output:{name:'output',type:'float32',shape:[1,1,512,512]},
 allowedForCommercialSalon:false,
 independentHairAlphaQualityVerified:false,
 physicalAndroidOfflineVerified:false
};
await fs.writeFile(path.join(folder,'portrait-modnet-manifest.json'),
 JSON.stringify(manifest,null,2)+'\n');
console.log('PHASE38 VERIFIED PINNED PORTRAIT MATTING MODEL '+JSON.stringify({
 bytes:data.length,sha256:hash(data),licenseClaim:'Apache-2.0',
 hairAlphaGroundTruth:false,portraitImageUpload:false}));
