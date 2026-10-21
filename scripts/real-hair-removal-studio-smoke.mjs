import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.json':'application/json','.bin':'application/octet-stream',
 '.tflite':'application/octet-stream','.wasm':'application/wasm',
 '.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');const relative=decodeURIComponent(u.pathname).replace(/^\/+/, '')||'index.html';
  const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))throw Error('Unsafe path');
  const data=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream',
  'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp',
  'Cross-Origin-Resource-Policy':'same-origin'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,errors=[],external=[];
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage();
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',route=>{
  if(!route.request().url().startsWith(origin+'/')){
   external.push(route.request().url());return route.abort('blockedbyclient');
  }return route.continue();
 });
 await page.goto(origin+'/ai/migan/hair-removal-studio.html',{waitUntil:'load'});
 const trials=[];
 for(const id of ['1','2','3','6','9']){
  await page.locator('#sample').selectOption(id);
  await page.waitForFunction(()=>!document.querySelector('#analyze').disabled,{timeout:15000});
  await page.locator('#analyze').click();
  await page.waitForFunction(()=>!document.querySelector('#analyze').disabled,{timeout:45000});
  const state=await page.evaluate(()=>({
   accepted:!document.getElementById('approve').disabled,
   info:document.getElementById('metrics').textContent,
   status:document.getElementById('status').textContent
  }));
  trials.push({id,...state});
  if(state.accepted)break;
 }
 console.log('REAL HAIR AUTO-MASK QUALIFICATION '+JSON.stringify(trials).slice(0,4500));
 const pass=trials.find(t=>t.accepted);
 // Browser may reject images with uncertain geometry. Refusal is safer than erasing a face;
 // record it as a deliberate QUALITY-GATE failure rather than inventing a passing mask.
 assert.ok(pass,'No consent-free bundled salon catalog portrait passed face/hair gating');
 await page.locator('#approve').check();
 await page.locator('#run').click();
 await page.waitForFunction(()=>!!window.__hananehHairStage,{timeout:180000});
 let result=await page.evaluate(()=>window.__hananehHairStage);
 assert.ok(!result.error,result.error);
 assert.equal(result.realSegmentation,true);
 assert.equal(result.realInpainting,true);
 assert.equal(result.generatedHair,false);
 assert.equal(result.faceOutsideMaskPreserved,true);
 assert.ok(result.changedChannels>1000);
 const comparison=await page.evaluate(()=>{
  const a=document.querySelector('#portrait').getContext('2d').getImageData(0,0,512,512).data;
  const b=document.querySelector('#after').getContext('2d').getImageData(0,0,512,512).data;
  const m=document.querySelector('#mask').getContext('2d').getImageData(0,0,512,512).data;
  let changed=0,untouched=0;
  for(let i=0;i<512*512;i++){
   const k=i*4;const diff=a[k]!==b[k]||a[k+1]!==b[k+1]||a[k+2]!==b[k+2];
   // Original alpha identity remains exactly unchanged throughout.
   if(a[k+3]!==b[k+3])throw Error('Alpha channel changed');
   if(diff)changed++;else untouched++;
  }
  return {changed,untouched};
 });
 assert.ok(comparison.changed>1000,'Neural inpainting made no visible pixel change');
 assert.deepEqual(external,[]);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(root,'ai/migan/hair-removal-studio-evidence.png'),fullPage:true});
 console.log('REAL MEDIAPIPE TO MI-GAN INPAINTING PASSED '+JSON.stringify({...result,trial:pass.id,...comparison}));
 await page.evaluate(async()=>{
   await navigator.serviceWorker.register('/sw.js');
   await navigator.serviceWorker.ready;
 });
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:30000});
 await page.reload({waitUntil:'load'});
 // Warm browser cache and save model parts; production SW uses cache-on-first-read for this experimental engine.
 const stored=await page.evaluate(async()=>{
   const name=(await caches.keys()).find(x=>x.startsWith('hananeh-static-'));
   const cache=await caches.open(name);
   const manifest=await (await cache.match('/ai/migan/model-manifest.json')).json();
   const files=['/ai/migan/hair-removal-studio.html','/ai/migan/hair-removal-core.mjs',
    '/ai/hair-segmenter.mjs','/ai/models/hair_segmenter.tflite',
    '/ai/migan/ort/ort.min.js',...manifest.parts.map(p=>'/ai/migan/parts/'+p.name)];
   return {files:files.length,present:await Promise.all(files.map(async p=>!!(await cache.match(p))))};
 });
 assert.ok(stored.present.every(Boolean),'Offline model cache incomplete');
 await page.context().setOffline(true);
 await page.reload({waitUntil:'load'});
 await page.locator('#sample').selectOption(pass.id);
 await page.waitForFunction(()=>!document.querySelector('#analyze').disabled,{timeout:15000});
 await page.locator('#analyze').click();
 await page.waitForFunction(()=>!document.querySelector('#analyze').disabled,{timeout:60000});
 assert.equal(await page.locator('#approve').isEnabled(),true);
 await page.locator('#approve').check();
 await page.locator('#run').click();
 await page.waitForFunction(()=>!!window.__hananehHairStage,{timeout:180000});
 result=await page.evaluate(()=>window.__hananehHairStage);
 assert.ok(!result.error,'Offline repeat: '+result.error);
 assert.equal(result.realInpainting,true);assert.equal(result.realSegmentation,true);
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 console.log('AIRPLANE MODE FULL MEDIAPIPE TO MI-GAN INPAINTING PASSED '+JSON.stringify({inferenceMs:result.inferenceMs,cacheFiles:stored.files,referenceHairstyleTransfer:result.generatedHair}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
