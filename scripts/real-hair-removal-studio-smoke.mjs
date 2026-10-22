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
 async function getRenderedImageSHA256(){
  return page.evaluate(async()=>{
   const rgba=document.querySelector('#portrait').getContext('2d').getImageData(0,0,512,512).data;
   const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',rgba));
   return Array.from(digest).map(x=>x.toString(16).padStart(2,'0')).join('');
  });
 }
 const imageHashById=new Map();
 for(const t of trials)if(t.accepted)imageHashById.set(t.id,await getRenderedImageSHA256());
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
 assert.equal(result.semanticGuardApplied,true,'Real pretrained semantic protection must execute');
 assert.ok(Number.isFinite(result.predictedFaceSkinFraction)&&result.predictedFaceSkinFraction>0,
  'Real face-skin prediction must be measured');
 assert.ok(result.semanticConflicts>=0,'Skin guard disagreement count must be recorded');
 assert.equal(result.faceOutsideMaskPreserved,true);
 assert.equal(result.outsideMaskChangedPixels,0,'Real browser must preserve every non-removal pixel');
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
 await page.locator('#prepareOffline').click();
 await page.waitForFunction(()=>typeof window.__hananehOfflineReady==='boolean',{timeout:90000});
 assert.equal(await page.evaluate(()=>window.__hananehOfflineReady),true,
   'Explicit offline preparation failed: '+await page.locator('#status').textContent());
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
 assert.equal(result.semanticGuardApplied,true,'Airplane mode must retain the real semantic veto');
 assert.ok(Number.isFinite(result.predictedFaceSkinFraction));
 assert.equal(result.outsideMaskChangedPixels,0,'Airplane-mode reconstruction must not alter protected pixels');
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 console.log('AIRPLANE MODE FULL MEDIAPIPE TO MI-GAN INPAINTING PASSED '+JSON.stringify({inferenceMs:result.inferenceMs,cacheFiles:stored.files,referenceHairstyleTransfer:result.generatedHair}));
 // Study existing bundled salon portraits without uploading them. Fail-closed rejects
 // are counted as useful findings rather than coerced into unsafe scalp hallucinations.
 const benchmarkCases=[{id:pass.id,status:'ok',inferenceMs:result.inferenceMs,
  outsideMaskChangedPixels:result.outsideMaskChangedPixels,
  sourceHash:imageHashById.get(pass.id),changedChannels:result.changedChannels,removedPixels:result.removedPixels}];
 const multi=[];
 for(const id of ['2','3','6','9']){
   await page.locator('#sample').selectOption(id);
   await page.waitForFunction(()=>!document.querySelector('#analyze').disabled,{timeout:15000});
   await page.locator('#analyze').click();
   await page.waitForFunction(()=>!document.querySelector('#analyze').disabled,{timeout:45000});
   const qualified=await page.locator('#approve').isEnabled();
   const sourceHash=await getRenderedImageSHA256();
   if(!qualified){
     const reason=await page.locator('#status').textContent();
     multi.push({id,status:'rejected',reason});
     benchmarkCases.push({id,status:'rejected',reason,sourceHash});
     continue;
   }
   await page.locator('#approve').check();
   await page.locator('#run').click();
   await page.waitForFunction(()=>!!window.__hananehHairStage,{timeout:180000});
   const evidence=await page.evaluate(()=>window.__hananehHairStage);
   multi.push({id,status:evidence.error?'error':'generated',inferenceMs:evidence.inferenceMs,
     removedPixels:evidence.removedPixels,changedChannels:evidence.changedChannels,error:evidence.error});
   benchmarkCases.push({id,status:evidence.error?'failed':'ok',
      reason:evidence.error,sourceHash,inferenceMs:evidence.inferenceMs,
      outsideMaskChangedPixels:evidence.outsideMaskChangedPixels,
      removedPixels:evidence.removedPixels,changedChannels:evidence.changedChannels});
   if(!evidence.error)await page.screenshot({path:path.join(root,'ai/migan/catalog-'+id+'-inpainting-evidence.png'),fullPage:true});
 }
 console.log('MULTI-PORTRAIT QUALITY STUDY (NOT HUMAN-RATED) '+JSON.stringify(multi));
 assert.deepEqual(errors,[]);
 assert.deepEqual(external,[]);
 await fs.writeFile(path.join(root,'ai/migan/portrait-benchmark.json'),JSON.stringify({model:'MI-GAN',offline:true,trialPortraits:multi,photographicQuality:'not certified',humanReviewRequired:true},null,2));
 // Machine-readable engineering smoke evidence; all passed/failed/rejected trials counted.
 // Catalog identities and content rights are NOT verified: all examples conservatively grouped
 // under a single unknown subject and blocked from independent scientific inference.
 const commit=process.env.GITHUB_SHA;
 assert.match(commit||'',/^[a-f0-9]{40}$/i,'Missing full method commit');
 const emptySha='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
 const recorded=benchmarkCases.map((c,index)=>({
   sample_id:'catalog-'+c.id,source_subject_id:'catalog-unverified-identity',
   reference_subject_id:'no-reference-hair-removal',source_image_sha256:c.sourceHash,
   reference_image_sha256:emptySha,consent_record_id:'NOT_VERIFIED_ENGINEERING_ONLY',
   license_record_id:'NOT_VERIFIED_ENGINEERING_ONLY',split:'pilot',method_id:'migan-original-hair-removal',
   method_commit:commit,status:c.status,device_id:'GitHub-Linux-Chromium',
   hardware_environment_id:'CI-ubuntu-latest',run_utc:new Date().toISOString(),seed:index+1,
   metrics:c.status==='ok'?{inference_ms:c.inferenceMs,
     outside_mask_changed_pixels:c.outsideMaskChangedPixels,network_requests_external:external.length,
     changed_channels:c.changedChannels,removed_pixels:c.removedPixels}: {},
   ...(c.status==='ok'?{}:{failure_reason:c.reason||'Processing failed'})
 }));
 for(const c of recorded)if(c.status==='ok')
   assert.equal(c.metrics.outside_mask_changed_pixels,0,'Face integrity metric missing or nonzero');
 const researchReport={protocol_id:'OFFHAIR-PROTOCOL-2026-10-21-v1',
   study_kind:'engineering_smoke',study_id:'phase13-ci-'+commit.slice(0,12),
   dataset_version:'bundled-catalog-identity-and-rights-not-verified',
   includes_images:false,consent_registry_verified:false,rights_registry_verified:false,
   reviewed_human_ratings:false,records:recorded};
 const output=path.resolve(root,'../research/results/offhair-ci-smoke-evidence.json');
 await fs.mkdir(path.dirname(output),{recursive:true});
 await fs.writeFile(output,JSON.stringify(researchReport,null,2)+'\n');
 console.log('OFFHAIR SOURCE-IDENTITY CONSERVATIVE SCIENTIFIC SMOKE EVIDENCE '+JSON.stringify({
    total:recorded.length,accepted:recorded.filter(x=>x.status==='ok').length,
    rejected:recorded.filter(x=>x.status==='rejected').length,
    distinctSubjectsClaimed:1,independentScientificBenchmark:false
 }));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
