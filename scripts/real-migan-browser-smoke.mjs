import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.json':'application/json','.bin':'application/octet-stream',
 '.wasm':'application/wasm','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  const relative=decodeURIComponent(u.pathname).replace(/^\/+/, '')||'index.html';
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep))throw Error('Unsafe asset path');
  const data=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream',
   'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp',
   'Cross-Origin-Resource-Policy':'same-origin'});
  res.end(data);
 }catch(error){res.writeHead(404);res.end('Missing local file');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage();
 const external=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',route=>{
  if(!route.request().url().startsWith(origin+'/')){external.push(route.request().url());return route.abort('blockedbyclient');}
  return route.continue();
 });
 await page.goto(origin+'/ai/migan/research.html',{waitUntil:'load'});
 await page.evaluate(async()=>{
  await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
 });
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:30000});
 await page.reload({waitUntil:'load'});
 async function execute(label){
  await page.getByRole('button',{name:'اجرای مدل با تصویر ساختگی'}).click();
  await page.waitForFunction(()=>!!window.__miganTest,{timeout:180000});
  const result=await page.evaluate(()=>window.__miganTest);
  assert.ok(!result.error,label+': '+result.error);
  assert.equal(result.onDevice,true);assert.equal(result.referenceHairstyleTransfer,false);
  assert.ok(result.pixelsGenerated>15000);
  assert.ok(result.changedChannels>1000);
  assert.equal(result.crossOriginIsolated,true);
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  console.log(label+' '+JSON.stringify(result));
 }
 await execute('REAL MI-GAN BROWSER INFERENCE PASSED');
 const preserved=await page.evaluate(()=>{
  const b=document.getElementById('before').getContext('2d');
  const a=document.getElementById('after').getContext('2d');
  const target=[260,300],original=Array.from(b.getImageData(...target,1,1).data),
        generated=Array.from(a.getImageData(...target,1,1).data);
  return {original,generated};
 });
 assert.deepEqual(preserved.generated,preserved.original,'Unmasked facial region was unexpectedly modified');
 await page.screenshot({path:path.join(root,'ai/migan/synthetic-result-evidence.png'),fullPage:true});
 console.log('SYNTHETIC OUTPUT SCREENSHOT AND UNMASKED PIXEL PRESERVATION VERIFIED');
 const audit=await page.evaluate(async()=>{
  const names=(await caches.keys()).filter(x=>x.startsWith('hananeh-static-'));
  if(!names.length)throw Error('No offline cache');
  const c=await caches.open(names[0]),manifest=await (await c.match('/ai/migan/model-manifest.json')).json();
  const paths=['/ai/migan/research.html','/ai/migan/ort/ort.min.js','/ai/migan/model-manifest.json',
   ...manifest.parts.map(x=>'/ai/migan/parts/'+x.name)];
  return {complete:await Promise.all(paths.map(async x=>!!(await c.match(x)))),parts:manifest.parts.length};
 });
 assert.ok(audit.complete.every(Boolean),'Research assets missing from offline cache');
 await page.context().setOffline(true);
 await page.reload({waitUntil:'load'});
 await execute('REAL MI-GAN OFFLINE RELOAD INFERENCE PASSED');
 console.log('OFFLINE MI-GAN MODEL PARTS VERIFIED '+audit.parts);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
