// Build-time only. Browser execution never requests a third-party server.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'node_modules','@mediapipe','tasks-vision');
const destination=path.join(root,'public','ai');
const wasm=['vision_wasm_internal.js','vision_wasm_internal.wasm',
            'vision_wasm_nosimd_internal.js','vision_wasm_nosimd_internal.wasm'];
for(const file of ['vision_bundle.mjs']){
  await fs.mkdir(path.join(destination,'vendor'),{recursive:true});
  await fs.copyFile(path.join(source,file),path.join(destination,'vendor',file));
}
await fs.mkdir(path.join(destination,'wasm'),{recursive:true});
for(const file of wasm){
  await fs.copyFile(path.join(source,'wasm',file),path.join(destination,'wasm',file));
}
const modelFolder=path.join(destination,'models');
const modelFile=path.join(modelFolder,'hair_segmenter.tflite');
await fs.mkdir(modelFolder,{recursive:true});
const modelURL='https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/1/hair_segmenter.tflite';
let model;
try{model=await fs.readFile(modelFile);}catch{}
if(!model){
  const response=await fetch(modelURL,{signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error('Hair model download failed: HTTP '+response.status);
  model=Buffer.from(await response.arrayBuffer());
}
if(model.length<100000||model.length>20000000||model.toString('ascii',4,8)!=='TFL3'){
  throw Error('Invalid hair-segmentation TFLite model');
}
await fs.writeFile(modelFile,model);
const packageJSON=JSON.parse(await fs.readFile(path.join(source,'package.json'),'utf8'));
const manifest={
  runtime:'@mediapipe/tasks-vision',
  version:packageJSON.version,
  model:'HairSegmenter float32 version 1',
  modelSha256:createHash('sha256').update(model).digest('hex'),
  modelBytes:model.length,
  runtimeFiles:wasm
};
await fs.writeFile(path.join(destination,'model-info.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Offline MediaPipe bundle created; model SHA256 '+manifest.modelSha256);
