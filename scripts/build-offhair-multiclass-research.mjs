// Build-time ONLY: pinned Apache-2.0 Google MediaPipe multiclass segmentation checkpoint.
// Not required by the shipping catalog or npm run build; opt-in research dependency.
// Model card: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf
// Official original: https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'public/ai/models/selfie_multiclass_256x256.tflite');
const url='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';
const expected='c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0';
let model;
try{model=await fs.readFile(file);}catch(e){if(e.code!=='ENOENT')throw e;}
if(!model){
 const response=await fetch(url,{signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error('Cannot fetch upstream Apache-2.0 model: HTTP '+response.status);
 const length=Number(response.headers.get('content-length'))||0;
 if(length>20000000)throw Error('Checkpoint exceeds permitted research download size');
 model=Buffer.from(await response.arrayBuffer());
}
if(model.length<1000000||model.length>20000000||model.toString('ascii',4,8)!=='TFL3')
 throw Error('Multiclass checkpoint fails size/format validation');
const sha=createHash('sha256').update(model).digest('hex');
if(sha!==expected)throw Error('Multiclass model checksum mismatch; block substitution. Got '+sha);
await fs.mkdir(path.dirname(file),{recursive:true});
await fs.writeFile(file,model);
const provenance={name:'MediaPipe Selfie Multiclass Segmentation 256x256',
 origin:url,modelCard:'https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf',
 license:'Apache-2.0, official Google model card, May 10 2023',
 sha256:sha,bytes:model.length,modifiedWeights:false,
 audit:'Checkpoint is usable under the public model-card license; separately assess data provenance and intended use before commercialization.'};
await fs.writeFile(path.join(root,'public/ai/models/offhair-multiclass-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
// Distribute the full license text alongside the model, not merely a link.
const licenseDir=path.join(root,'public/ai/licenses');
await fs.mkdir(licenseDir,{recursive:true});
let license;
for(const candidate of [
 path.join(root,'node_modules/@mediapipe/tasks-vision/LICENSE'),
 path.join(root,'node_modules/@mediapipe/tasks-vision/LICENSE.txt')]){
 try{license=await fs.readFile(candidate,'utf8');break;}catch(e){if(e.code!=='ENOENT')throw e;}
}
if(!license){
 const response=await fetch('https://www.apache.org/licenses/LICENSE-2.0.txt',
  {signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Cannot obtain full Apache-2.0 distribution terms');
 license=await response.text();
}
if(!/Apache License\s+Version 2\.0/.test(license)||license.length<8000)
 throw Error('Invalid or incomplete Apache-2.0 license text');
await fs.writeFile(path.join(licenseDir,'Apache-2.0.txt'),license);
console.log('PINNED GOOGLE MULTICLASS BASELINE '+JSON.stringify({bytes:model.length,sha256:sha,license:provenance.license}));
