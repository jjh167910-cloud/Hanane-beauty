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
await fs.mkdir(modelFolder,{recursive:true});
const specs=[
 ['hair_segmenter.tflite','https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/1/hair_segmenter.tflite'],
 ['blaze_face_short_range.tflite','https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite']
];
const models=[];
for(const [name,url] of specs){
 const file=path.join(modelFolder,name);
 let data;
 try{data=await fs.readFile(file);}catch{}
 if(!data){
  const response=await fetch(url,{signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error('Model download failed: '+name+' (HTTP '+response.status+')');
  data=Buffer.from(await response.arrayBuffer());
 }
 if(data.length<100000||data.length>20000000||data.toString('ascii',4,8)!=='TFL3'){
  throw Error('Invalid TFLite model: '+name);
 }
 await fs.writeFile(file,data);
 models.push({name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
const packageJSON=JSON.parse(await fs.readFile(path.join(source,'package.json'),'utf8'));
const manifest={runtime:'@mediapipe/tasks-vision',version:packageJSON.version,models,runtimeFiles:wasm};
await fs.writeFile(path.join(destination,'model-info.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Offline models bundled: '+models.map(m=>m.name+' '+m.sha256).join(' / '));
