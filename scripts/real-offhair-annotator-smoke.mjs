// Authentic browser annotation and airplane-mode reload regression.
// Only bundled demo portrait is used; the export is NOT an approved research dataset.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {validateAnnotation,evaluateZones,CLASS_BITS} from '../public/ai/offhair-annotation-core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.json':'application/json',
 '.wasm':'application/wasm','.tflite':'application/octet-stream'};
const server=http.createServer(async(req,res)=>{
 try{
  const uri=new URL(req.url,'http://localhost'),
   relative=decodeURIComponent(uri.pathname).replace(/^\/+/, '')||'index.html',
   file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep))throw Error('Path outside build');
  const data=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream',
   'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp',
   'Cross-Origin-Resource-Policy':'same-origin'});res.end(data);
 }catch{res.writeHead(404);res.end('Local file missing');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,external=[],errors=[];
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:980,height:940},acceptDownloads:true});
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',route=>{
  if(!route.request().url().startsWith(origin+'/')){
   external.push(route.request().url());return route.abort('blockedbyclient');
  }
  return route.continue();
 });
 await page.goto(origin+'/research/offhair-annotator.html',{waitUntil:'load'});
 await page.waitForFunction(()=>window.__offhairAnnotationReady===true);
 async function annotateAndExport(){
  await page.locator('#sample').selectOption('1');
  await page.waitForFunction(()=>!document.querySelector('#clear').disabled,{timeout:15000});
  await page.locator('#subject').fill('subject-demo-001');
  await page.locator('#annotator').fill('annotator-test-001');
  await page.locator('#consent').fill('consent-NOT-VERIFIED');
  await page.locator('#rights').fill('rights-NOT-VERIFIED');
  await page.locator('#ack').check();
  const canvas=page.locator('#overlay');
  async function stroke(bit,x,y){
   await page.locator('[data-bit="'+bit+'"]').click();
   await canvas.scrollIntoViewIfNeeded();
   const box=await canvas.boundingBox();assert.ok(box);
   await page.mouse.move(box.x+box.width*x,box.y+box.height*y);
   await page.mouse.down();
   await page.mouse.move(box.x+box.width*(x+.025),box.y+box.height*(y+.018),{steps:5});
   await page.mouse.up();
  }
  await stroke(1,.45,.52);
  await stroke(2,.50,.30);
  await stroke(4,.42,.15);
  await stroke(16,.48,.29);
  const count=Number((await page.locator('#annotated').textContent()).replaceAll(',',''));
  if(count<100){
    const debug=await page.evaluate(()=>({
      loaded:!document.getElementById('clear').disabled,
      status:document.getElementById('status').textContent,
      annotated:document.getElementById('annotated').textContent,
      canvasRect:document.getElementById('overlay').getBoundingClientRect().toJSON(),
      selected:[...document.querySelectorAll('[data-bit]')].filter(x=>x.getAttribute('aria-pressed')==='true').map(x=>x.dataset.bit)
    }));
    throw Error('UI did not paint enough mask pixels: '+JSON.stringify(debug));
  }
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#save').click();
  const download=await downloadPromise,downloadPath=await download.path();
  const exported=JSON.parse(await fs.readFile(downloadPath,'utf8'));
  const parsed=validateAnnotation(exported);
  assert.equal(exported.photoOrigin,'bundled_catalog_demo');
  assert.equal(exported.usable_for_training,false);
  assert.equal(exported.external_rights_verified,false);
  assert.equal(exported.includes_images,false);
  assert.equal(parsed.labels.length,512*512);
  assert.ok(parsed.coverage.annotatedPixels>100);
  const forbidden=['portrait_data','portrait_base64','photo','image_bytes'];
  for(const key of forbidden)assert.ok(!(key in exported),'Image data leaked into export');
  const predicted=new Uint8Array(parsed.labels);
  predicted[parseInt(parsed.labels.findIndex(v=>(v&CLASS_BITS.protectedCore)!==0),10)]=CLASS_BITS.targetHair;
  const e=evaluateZones(predicted,parsed.labels,512,512);
  assert.ok(e.protectedCoreUnsafeEditPixels>=1,'Predicted edit of a protected facial pixel went undetected');
  assert.equal(e.safetyCertified,false);
  return {exported,pixelCount:parsed.coverage.annotatedPixels,
   protectedCoreSafetyViolations:e.protectedCoreUnsafeEditPixels};
 }
 const first=await annotateAndExport();
 assert.deepEqual(external,[]);
 assert.deepEqual(errors,[]);
 await fs.mkdir(path.join(root,'research'),{recursive:true});
 await page.screenshot({path:path.join(root,'research/offhair-annotator-evidence.png'),fullPage:true});
 await page.evaluate(async()=>{
  await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
 });
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:30000});
 await page.reload({waitUntil:'load'});
 // This controlled online reload populates the research page in the Service Worker cache.
 await page.waitForFunction(()=>window.__offhairAnnotationReady===true);
 await page.context().setOffline(true);
 await page.reload({waitUntil:'load'});
 await page.waitForFunction(()=>window.__offhairAnnotationReady===true);
 const offline=await annotateAndExport();
 assert.equal(offline.pixelCount,first.pixelCount);
 assert.equal(offline.exported.portraitSha256,first.exported.portraitSha256);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const evidence={study_kind:'engineering_smoke',note:'NOT genuine human annotation',
  offlineBrowserReload:true,photographsExported:0,
  demonstrationAnnotations:2,firstAnnotatedPixels:first.pixelCount,
  offlineAnnotatedPixels:offline.pixelCount,
  protectedCoreSafetyViolationsDetected:offline.protectedCoreSafetyViolations,
  researchDataVerified:false,physicalAndroidTested:false};
 await fs.writeFile(path.join(root,'research/offhair-annotator-ci-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log('REAL OFFHAIR LOCAL ANNOTATION + OFFLINE EXPORT VERIFIED '+JSON.stringify(evidence));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
