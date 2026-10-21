import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.json':'application/json','.tflite':'application/octet-stream',
 '.wasm':'application/wasm','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep))throw Error('Unsafe asset path');
  const data=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream',
   'Cross-Origin-Opener-Policy':'same-origin',
   'Cross-Origin-Embedder-Policy':'require-corp',
   'Cross-Origin-Resource-Policy':'same-origin'});
  res.end(data);
 }catch(error){res.writeHead(404);res.end('Missing local file');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const address=server.address(),origin='http://127.0.0.1:'+address.port;
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage();
 const external=[],errors=[],warnings=[];
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('console',msg=>{if(msg.type()==='error')warnings.push(msg.text())});
 await page.route('**/*',route=>{
  const url=route.request().url();
  if(!url.startsWith(origin+'/')){external.push(url);return route.abort('blockedbyclient');}
  return route.continue();
 });
 await page.goto(origin+'/index.html',{waitUntil:'load'});
 const result=await page.evaluate(async()=>{
  const start=performance.now();
  const {FilesetResolver,ImageSegmenter}=await import('/ai/vendor/vision_bundle.mjs');
  const fileset=await FilesetResolver.forVisionTasks('/ai/wasm');
  const segmenter=await ImageSegmenter.createFromOptions(fileset,{
   baseOptions:{modelAssetPath:'/ai/models/hair_segmenter.tflite',delegate:'CPU'},
   runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false
  });
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#c2c1b7';ctx.fillRect(0,0,512,512);
  ctx.fillStyle='#30271f';ctx.beginPath();ctx.ellipse(256,175,122,152,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#c08f71';ctx.beginPath();ctx.ellipse(256,267,91,114,0,0,Math.PI*2);ctx.fill();
  const prediction=segmenter.segment(canvas);
  try{
   const masks=prediction.confidenceMasks||[];
   const hair=masks[1];
   if(!hair)throw Error('No hair confidence output');
   const a=hair.getAsFloat32Array();
   if(a.length!==hair.width*hair.height)throw Error('Output size mismatch');
   let finite=0,min=Infinity,max=-Infinity;
   for(let i=0;i<a.length;i++){if(Number.isFinite(a[i])){finite++;min=Math.min(min,a[i]);max=Math.max(max,a[i]);}}
   return {realLocalInference:true,dimensions:[hair.width,hair.height],finiteCount:finite,
     pixelCount:a.length,range:[min,max],durationMs:Math.round(performance.now()-start),
     crossOriginIsolated:self.crossOriginIsolated,wasmAvailable:!!self.WebAssembly};
  }finally{prediction.close();segmenter.close();}
 });
 assert.ok(result.realLocalInference);
 assert.equal(result.finiteCount,result.pixelCount);
 assert.ok(result.pixelCount>10000);
 assert.equal(result.crossOriginIsolated,true);
 assert.deepEqual(errors,[]);
 assert.deepEqual(external,[]);
 console.log('REAL LOCAL MEDIAPIPE BROWSER INFERENCE PASSED '+JSON.stringify(result));
 if(warnings.length)console.log('Browser warnings (not assertion failures):',warnings.slice(0,3));
}finally{
 await browser?.close();
 await new Promise(r=>server.close(r));
}
