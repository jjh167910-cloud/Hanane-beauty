// Real MediaPipe topology research in Chromium; no generative hairstyle claim.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.json':'application/json',
 '.wasm':'application/wasm','.tflite':'application/octet-stream','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost'),rel=decodeURIComponent(u.pathname).replace(/^\/+/, '')||'index.html';
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep))throw Error('Bad request');
  const data=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream',
   'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp',
   'Cross-Origin-Resource-Policy':'same-origin'});res.end(data);
 }catch{res.writeHead(404);res.end('No such local asset');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage(),external=[],errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.route('**/*',route=>{
  if(!route.request().url().startsWith(origin+'/')){
   external.push(route.request().url());return route.abort('blockedbyclient');
  }
  return route.continue();
 });
 await page.goto(origin+'/ai/migan/hair-removal-studio.html',{waitUntil:'load'});
 await page.evaluate(async()=>{
  await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
 });
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:30000});
 await page.reload({waitUntil:'load'});
 const measure=async()=>{
  const {getLocalHairSegmenter}=await import('/ai/hair-segmenter.mjs');
  const {differenceMaskStudy,mapTopologyToRGBA}=await import('/ai/offhair-difference-masks.mjs');
  const engine=await getLocalHairSegmenter(),dim=512;
  const ids=['1','2','3','6','9'],observations={};
  for(const id of ids){
   const source=window.OFFLINE_IMAGES?.[id];
   if(!source){observations[id]={valid:false,reason:'Catalog image unavailable'};continue;}
   const img=new Image();img.decoding='async';img.src=source;await img.decode();
   const c=document.createElement('canvas');c.width=c.height=dim;
   const x=c.getContext('2d');
   x.fillStyle='#eee6dc';x.fillRect(0,0,dim,dim);
   const scale=Math.min(dim/img.naturalWidth,dim/img.naturalHeight);
   x.drawImage(img,(dim-img.naturalWidth*scale)/2,(dim-img.naturalHeight*scale)/2,
    img.naturalWidth*scale,img.naturalHeight*scale);
   const detection=engine.analyze(c);
   observations[id]={valid:!!(detection.mask&&detection.face),face:detection.face};
   if(detection.mask){
    const c2=document.createElement('canvas');c2.width=c2.height=dim;
    const ctx=c2.getContext('2d');ctx.drawImage(detection.mask,0,0,dim,dim);
    observations[id].mask=ctx.getImageData(0,0,dim,dim).data;
   }
  }
  const cases=[['1','2'],['1','3'],['2','6'],['3','1'],['6','2'],['9','1']];
  let presented=false;
  const evaluations=cases.map(([a,b])=>{
   const x=observations[a],y=observations[b];
   if(!x?.mask||!y?.mask||!x.face||!y.face)
    return {pair:a+'-'+b,accepted:false,reason:'missing real source/ref hair or face'};
   const props={sourceRGBA:x.mask,referenceRGBA:y.mask,
    width:dim,height:dim,sourceFace:x.face,referenceFace:y.face};
   const dm=differenceMaskStudy({...props,alignment:'eye-scale'});
   const rolled=differenceMaskStudy({...props,alignment:'eye-similarity'});
   const anatomical=differenceMaskStudy({...props,alignment:'eye-similarity',faceProtection:'landmark-core'});
   if(!presented&&dm.labels){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=dim;
    canvas.style.cssText='max-width:512px;width:100%;display:block;margin:12px auto;border:1px solid #ddd';
    canvas.setAttribute('aria-label','Source/reference hair topology, NOT generated hairstyle');
    const ctx=canvas.getContext('2d');
    ctx.putImageData(new ImageData(mapTopologyToRGBA(dm),dim,dim),0,0);
    document.body.appendChild(canvas);
    presented=true;
   }
   return {pair:a+'-'+b,accepted:dm.ok,reason:dm.reason,scaleRatio:dm.scaleRatio,
    counts:dm.counts,measures:dm.measures,
    rollAblation:{accepted:rolled.ok,reason:rolled.reason,
     rollDifferenceRadians:rolled.rollDifferenceRadians,
     counts:rolled.counts,measures:rolled.measures},
    landmarkAblation:{accepted:anatomical.ok,reason:anatomical.reason,
     hasValidatedFaceAnatomy:!String(anatomical.reason).includes('geometry'),
     eligibleForAutomatedEditing:anatomical.eligibleForAutomatedEditing===true,
     manualReviewRequired:anatomical.manualReviewRequired===true,
     counts:anatomical.counts,measures:anatomical.measures},
    referenceHairstyleGenerated:dm.referenceHairstyleGenerated};
  });
  return {observed:ids.map(id=>({id,hasRealMask:!!observations[id]?.mask,
   hasFace:!!observations[id]?.face})),evaluations,
   method:'2d_eye_anchor_proxy_topology',generatedHairstyles:0,photographicQualityVerified:false};
 };
 const first=await page.evaluate(measure);
 assert.ok(first.observed.filter(x=>x.hasRealMask&&x.hasFace).length>=3,
  'Insufficient genuine catalog masks and landmarks');
 assert.ok(first.evaluations.filter(x=>x.counts).length>=3,
  'No meaningful source-reference topology pairs were measurable');
 for(const entry of first.evaluations)if(entry.counts){
  const c=entry.counts;assert.equal(
   c.remove+c.add+c.overlap+c.preserve+c.faceConflict,512*512);
  const d=entry.landmarkAblation?.counts;
  if(d)assert.equal(d.remove+d.add+d.overlap+d.preserve+
    d.faceConflict+d.foreheadPending,512*512,'Anatomical topology must exhaust pixels');
  assert.equal(entry.referenceHairstyleGenerated,false);
 }
 assert.deepEqual(errors,[]);
 assert.deepEqual(external,[]);
 await fs.mkdir(path.join(root,'ai/offhair-dm'),{recursive:true});
 await page.screenshot({path:path.join(root,'ai/offhair-dm/topology-evidence.png'),fullPage:true});
 // After the first execution both local import modules and models are cached by
 // the controlling service worker. This is not a substitute for Android hardware.
 await page.context().setOffline(true);
 await page.reload({waitUntil:'load'});
 const second=await page.evaluate(measure);
 assert.deepEqual(second,first,'Offline mask extraction/topology must remain deterministic');
 assert.deepEqual(errors,[]);
 assert.deepEqual(external,[]);
 const evidence={study_kind:'engineering_smoke',dataset:'bundled salon catalog, not independently licensed training corpus',
  environment:'GitHub Linux Chromium, NOT physical Android',offline_reload_passed:true,
  model_training_performed:false,referenceHairstyleTransfer:false,
  first};
 await fs.writeFile(path.join(root,'ai/offhair-dm/topology-ci-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log('REAL OFFHAIR DIFFERENCE-MASK TOPOLOGY AND OFFLINE RELOAD PASSED '+JSON.stringify({
  analyzed: first.observed.length,measurable:first.evaluations.filter(x=>x.counts).length,
  accepted:first.evaluations.filter(x=>x.accepted).length,rejected:first.evaluations.filter(x=>!x.accepted).length,
  rollAccepted:first.evaluations.filter(x=>x.rollAblation?.accepted).length,
  anatomyAccepted:first.evaluations.filter(x=>x.landmarkAblation?.accepted).length,
  anatomyReady:first.evaluations.filter(x=>x.landmarkAblation?.hasValidatedFaceAnatomy).length,
  results:first.evaluations.map(x=>({pair:x.pair,accepted:x.accepted,reason:x.reason,
  measures:x.measures,rollAccepted:x.rollAblation?.accepted,
  rollReason:x.rollAblation?.reason,rollMeasures:x.rollAblation?.measures,
  landmarkAccepted:x.landmarkAblation?.accepted,
  landmarkReason:x.landmarkAblation?.reason,
  reviewOnly:x.landmarkAblation?.manualReviewRequired,
  landmarkMeasures:x.landmarkAblation?.measures}))}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
