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
 assert.equal(result.faceLandmarkGuardApplied,true,'Observed facial feature regions must be protected');
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
 // Phase 25: combine the REAL reconstructed source with REAL reference hair
 // segmentation. This is only a photo-compositing feasibility experiment.
 const previewStudy=await page.evaluate(async()=>{
  const {getLocalHairSegmenter}=await import('/ai/hair-segmenter.mjs');
  const {getLocalMulticlassSegmenter}=await import('/ai/offhair-multiclass-baseline.mjs');
  const {createSemanticSkinVeto}=await import('/ai/migan/semantic-skin-veto.mjs');
  const {makeLandmarkFaceZones}=await import('/ai/offhair-face-zones.mjs');
  const {prepareHairRemoval}=await import('/ai/migan/hair-removal-core.mjs');
  const {composeReferenceHairResearch}=await import('/ai/migan/reference-transfer-research.mjs');
  const {planTargetAwareRemoval}=await import('/ai/migan/target-aware-repair.mjs');
  const {composeInpaintedRGBA}=await import('/ai/migan/hair-removal-core.mjs');
  const W=512, H=512;
  const sourceCanvas=document.querySelector('#portrait');
  const restoredCanvas=document.querySelector('#after');
  const hairEngine=await getLocalHairSegmenter();
  const multiEngine=await getLocalMulticlassSegmenter();
  const sourceDetection=hairEngine.analyze(sourceCanvas);
  if(!sourceDetection.mask||!sourceDetection.face)throw Error('Missing measured source hair/face');
  const sourceMask=document.createElement('canvas');sourceMask.width=sourceMask.height=W;
  sourceMask.getContext('2d').drawImage(sourceDetection.mask,0,0,W,H);
  const sourceHairRGBA=sourceMask.getContext('2d').getImageData(0,0,W,H).data;
  const original=sourceCanvas.getContext('2d').getImageData(0,0,W,H).data;
  const restored=restoredCanvas.getContext('2d').getImageData(0,0,W,H).data;
  const m=multiEngine.analyze(sourceCanvas);
  const veto=createSemanticSkinVeto(m.labels,m.width,m.height,W,H);
  if(!veto.ok)throw Error('Reference study cannot obtain semantic safety veto');
  const anatomical=makeLandmarkFaceZones(sourceDetection.face,W,H);
  if(!anatomical.ok)throw Error('Reference study lacks facial landmark protection');
  const prepared=prepareHairRemoval(sourceHairRGBA,W,H,sourceDetection.face,
   {semanticVeto:veto,faceZones:anatomical.zones});
  if(!prepared.ok)throw Error('Reference study cannot regenerate exact source removal mask');
  const out=[];
  let shown=false,targetAwareEvidence=null;
  for(const id of ['2','3','6','9']){
   const data=window.OFFLINE_IMAGES?.[id];
   if(!data){out.push({id,ok:false,reason:'Reference sample unavailable'});continue;}
   const img=new Image();img.src=data;await img.decode();
   const refCanvas=document.createElement('canvas');refCanvas.width=refCanvas.height=W;
   const x=refCanvas.getContext('2d');x.fillStyle='#eee6dc';x.fillRect(0,0,W,H);
   const scale=Math.min(W/img.naturalWidth,H/img.naturalHeight);
   x.drawImage(img,(W-img.naturalWidth*scale)/2,(H-img.naturalHeight*scale)/2,
    img.naturalWidth*scale,img.naturalHeight*scale);
   const detection=hairEngine.analyze(refCanvas);
   if(!detection.face||!detection.mask){
    out.push({id,ok:false,reason:'Reference hair or eyes undetected'});continue;
   }
   const maskCanvas=document.createElement('canvas');maskCanvas.width=maskCanvas.height=W;
   maskCanvas.getContext('2d').drawImage(detection.mask,0,0,W,H);
   const study=composeReferenceHairResearch({
    sourceRGBA:original,restoredRGBA:restored,sourceHairRGBA,
    referenceRGBA:x.getImageData(0,0,W,H).data,
    referenceHairRGBA:maskCanvas.getContext('2d').getImageData(0,0,W,H).data,
    keepMask:prepared.keepMask,semanticVeto:veto,
    sourceFace:sourceDetection.face,referenceFace:detection.face,
    width:W,height:H
   });
   out.push({id,ok:study.ok,reason:study.reason,counts:study.counts,
    measures:study.measures,diagnosticFlags:study.diagnosticFlags,
    exportAllowed:study.exportAllowed,
    referenceHairstyleGenerated:study.referenceHairstyleGenerated});
   if(!study.ok)continue;
   if(study.exportAllowed||study.referenceHairstyleGenerated)
    throw Error('Experimental overlay wrongly authorized commercial export');
   for(let i=0;i<W*H;i++){
    if(veto.guard[i]&&study.opacity[i])throw Error('Transferred hair crossed skin veto');
    if(prepared.keepMask[i]===255&&!study.opacity[i])
     for(let c=0;c<4;c++)if(study.rgba[i*4+c]!==original[i*4+c])
      throw Error('Source outside edited regions was not preserved');
   }
   if(!shown){
    // A genuine second MI-GAN inference with a TARGET-AWARE smaller mask,
    // not an image filter and not a reused first neural output.
    const plan=planTargetAwareRemoval({
     approvedKeepMask:prepared.keepMask,
     referenceHairRGBA:maskCanvas.getContext('2d').getImageData(0,0,W,H).data,
     sourceFace:sourceDetection.face,referenceFace:detection.face,
     semanticVeto:veto,faceZones:anatomical.zones,width:W,height:H
    });
    if(!plan.ok)throw Error('Target-aware reconstruction plan failed: '+plan.reason);
    if(!(plan.skippedHiddenPixels>0&&plan.targetRemovalPixels<prepared.hairPixels))
     throw Error('Real donor mask did not reduce unnecessary scalp erasure');
    // The original full mask is not changed. Verify subset permission explicitly.
    for(let i=0;i<W*H;i++){
     if(plan.keepMask[i]===0&&prepared.keepMask[i]!==0)
      throw Error('Target-aware proposal introduced an unauthorized edit');
     if(veto.guard[i]||anatomical.zones[i]===1)
      if(plan.keepMask[i]===0)throw Error('Target-aware proposal reaches protected facial pixels');
    }
    let selectiveRGBA;
    let secondaryInferenceMs=0;
    if(plan.requiresInpainting){
     const manifest=await (await fetch('/ai/migan/model-manifest.json')).json();
     const modelBytes=new Uint8Array(manifest.size);
     let cursor=0;
     for(const part of manifest.parts){
      const response=await fetch('/ai/migan/parts/'+part.name);
      if(!response.ok)throw Error('Offline MI-GAN model part missing');
      const data=new Uint8Array(await response.arrayBuffer());
      const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)))
       .map(x=>x.toString(16).padStart(2,'0')).join('');
      if(data.length!==part.bytes||sha!==part.sha256)
       throw Error('MI-GAN part failed checksum');
      modelBytes.set(data,cursor);cursor+=data.length;
     }
     if(cursor!==manifest.size)throw Error('Incomplete local MI-GAN bytes');
     const modelHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',modelBytes)))
       .map(x=>x.toString(16).padStart(2,'0')).join('');
     if(modelHash!==manifest.model_sha256)throw Error('MI-GAN model SHA mismatch');
     const researchSession=await ort.InferenceSession.create(modelBytes,{executionProviders:['wasm']});
     const rgb=new Uint8Array(W*H*3);
     for(let i=0;i<W*H;i++)for(let c=0;c<3;c++)rgb[c*W*H+i]=original[4*i+c];
     const started=performance.now();
     const pred=await researchSession.run({
      image:new ort.Tensor('uint8',rgb,[1,3,W,H]),
      mask:new ort.Tensor('uint8',plan.keepMask,[1,1,W,H])
     });
     secondaryInferenceMs=Math.round(performance.now()-started);
     const output=pred[researchSession.outputNames[0]];
     if(output.type!=='uint8'||output.dims.join(',')!=='1,3,512,512')
      throw Error('Unexpected target-aware ONNX tensor');
     selectiveRGBA=composeInpaintedRGBA(original,output.data,plan.keepMask,W,H).rgba;
     await researchSession.release();
    }else selectiveRGBA=new Uint8ClampedArray(original);
    const alternate=composeReferenceHairResearch({
     sourceRGBA:original,restoredRGBA:selectiveRGBA,sourceHairRGBA,
     referenceRGBA:x.getImageData(0,0,W,H).data,
     referenceHairRGBA:maskCanvas.getContext('2d').getImageData(0,0,W,H).data,
     keepMask:plan.keepMask,semanticVeto:veto,
     sourceFace:sourceDetection.face,referenceFace:detection.face,
     width:W,height:H
    });
    if(!alternate.ok)throw Error('Target-aware hairstyle composition failed: '+alternate.reason);
    if(alternate.exportAllowed!==false)throw Error('Target-aware stage incorrectly authorized export');
    let actualChanged=0,changedUnderOpaqueDonor=0;
    for(let i=0;i<W*H;i++){
     const k=4*i;let changed=false;
     for(let c=0;c<4;c++)if(alternate.rgba[k+c]!==study.rgba[k+c])changed=true;
     if(changed)actualChanged++;
     if(changed&&study.opacity[i]>=254)changedUnderOpaqueDonor++;
     if(plan.keepMask[i]===255)
      for(let c=0;c<4;c++)if(selectiveRGBA[k+c]!==original[k+c])
       throw Error('New neural restoration changed an unapproved source pixel');
    }
    targetAwareEvidence={
     targetStyle:id,originalRemoved:plan.originalRemovalPixels,
     targetRemoved:plan.targetRemovalPixels,unnecessaryErasureAvoided:plan.skippedHiddenPixels,
     reductionFraction:plan.reductionFraction,secondaryInferenceMs,
     comparisonChangedPixels:actualChanged,changesUnderOpaqueDonor:changedUnderOpaqueDonor,
     baselineResidual:study.measures.exposedOriginalHairFraction,
     candidateResidual:alternate.measures.exposedOriginalHairFraction,
     candidateFlags:alternate.diagnosticFlags,
     safety:{exportAllowed:alternate.exportAllowed,unapprovedEdits:0,
      customerPhotoUploaded:false,realSecondNeuralRun:plan.requiresInpainting}
    };
    const section=document.createElement('section');
    section.style.cssText='margin:20px auto;max-width:1050px;padding:16px;border:2px solid #92704b;border-radius:14px';
    const heading=document.createElement('h2');
    heading.textContent='Phase 25: offline 2D hair transfer — NOT photorealistic AI';
    section.appendChild(heading);
    for(const [title,canvas,bytes] of [
     ['Customer source',sourceCanvas,null],
     ['MI-GAN restored source',restoredCanvas,null],
     ['Reference hairstyle '+id,refCanvas,null],
     ['Research-only composition (not for customers)',null,study.rgba],
     ['Phase 26 donor-aware restoration (NOT quality certified)',null,alternate.rgba]]){
     const block=document.createElement('div');
     block.style.cssText='display:inline-block;vertical-align:top;width:min(49%,300px);padding:6px';
     const label=document.createElement('p');label.textContent=title;
     const frame=document.createElement('canvas');frame.width=frame.height=W;
     frame.style.cssText='width:100%;height:auto';
     if(canvas)frame.getContext('2d').drawImage(canvas,0,0);
     else frame.getContext('2d').putImageData(new ImageData(bytes,W,H),0,0);
     block.append(label,frame);section.appendChild(block);
    }
    document.body.appendChild(section);
    shown=true;
   }
  }
  return {trials:out,renderedComparison:shown,targetAwareEvidence,sourceRemovalPixels:prepared.hairPixels,
   actualModels:['MediaPipe HairSegmenter','MediaPipe SelfieMulticlass','MI-GAN'],
   photorealismVerified:false,androidVerified:false};
 });
 console.log('PHASE25 REAL TWO-STAGE REFERENCE TRANSFER '+JSON.stringify(previewStudy));
 assert.equal(previewStudy.trials.length,4);
 assert.ok(previewStudy.targetAwareEvidence?.unnecessaryErasureAvoided>0);
 assert.equal(previewStudy.targetAwareEvidence?.safety?.unapprovedEdits,0);
 assert.equal(previewStudy.targetAwareEvidence?.safety?.exportAllowed,false);
 console.log('PHASE26 TARGET-AWARE GENUINE SECOND MI-GAN RUN '+
  JSON.stringify(previewStudy.targetAwareEvidence));
 for(const trial of previewStudy.trials)if(trial.ok){
  assert.equal(trial.exportAllowed,false);
  assert.equal(trial.referenceHairstyleGenerated,false);
 }
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 const eligible=previewStudy.trials.find(x=>x.ok);
 assert.ok(eligible,'No actual reference hairstyle could be conservatively previewed');
 await page.locator('#referenceSample').selectOption(eligible.id);
 await page.locator('#previewTransfer').click();
 await page.waitForFunction(()=>window.__hananehTransferStage!==null,{timeout:60000});
 const uiTransfer=await page.evaluate(()=>window.__hananehTransferStage);
 assert.equal(uiTransfer.ok,true,
  'Research UI must render the same real-source preview as the core: '+uiTransfer.reason);
 assert.equal(uiTransfer.previewOnly,true);
 assert.equal(uiTransfer.exportAllowed,false);
 assert.equal(uiTransfer.generatedNewHair,false);
 await page.locator('#targetAware').click();
 await page.waitForFunction(()=>!!window.__hananehTargetAwareStage,{timeout:180000});
 const liveTarget=await page.evaluate(()=>window.__hananehTargetAwareStage);
 assert.equal(liveTarget.ok,true,'Real second MI-GAN comparison failed: '+liveTarget.reason);
 assert.ok(liveTarget.unnecessaryErasureAvoided>0);
 assert.equal(liveTarget.exportAllowed,false);
 assert.equal(liveTarget.oldRemovalPixels,
  liveTarget.targetRemovalPixels+liveTarget.unnecessaryErasureAvoided);
 assert.equal(await page.locator('#download').isEnabled(),true,
  'The separate research inpainting export may remain enabled only while consent is active');
 if(previewStudy.renderedComparison){
  await page.screenshot({path:path.join(root,'ai/migan/reference-transfer-evidence.png'),fullPage:true});
 }

 // Phase 28: browser-generated ANONYMOUS performance evidence is downloaded
 // only through a user click, with NO images, landmarks or personal file data.
 assert.equal(await page.locator('#deviceEvidence').isEnabled(),true);
 const [deviceDownload]=await Promise.all([
  page.waitForEvent('download'),
  page.locator('#deviceEvidence').click()
 ]);
 assert.equal(deviceDownload.suggestedFilename(),'hananeh-anonymous-device-evidence.json');
 const deviceEvidence=JSON.parse(await fs.readFile(await deviceDownload.path(),'utf8'));
 assert.equal(deviceEvidence.ok,true);
 assert.equal(deviceEvidence.commercialReleaseAllowed,false);
 assert.equal(deviceEvidence.measurement.neuralInpaintingMs,result.inferenceMs);
 assert.equal(deviceEvidence.referencePreview.completed,true);
 assert.equal(deviceEvidence.credibility.photoContentExcluded,true);
 const deviceString=JSON.stringify(deviceEvidence);
 for(const bad of ['data:image','base64,','rgba','faceAnchor','eyeX',
  'sample_id','userAgent','portrait','filename','photoCode']){
  assert.equal(deviceString.includes(bad),false,'Anonymous field export leaked '+bad);
 }
 console.log('PHASE28 ANONYMOUS BROWSER PERFORMANCE EXPORT PASSED '+JSON.stringify({
  exportedBytes:deviceString.length,photoContentExcluded:true,verifiedGenerator:false,
  commercialReleaseAllowed:false}));
 // Withdrawal must remove export permission and discard any previous proof.
 await page.locator('#approve').uncheck();
 assert.equal(await page.locator('#download').isDisabled(),true,
  'Revoked approval must disable previous neural output export');
 assert.equal(await page.evaluate(()=>window.__hananehHairStage),null,
  'Revoked approval must delete prior evidence from page state');
 assert.equal(await page.locator('#deviceEvidence').isDisabled(),true,
  'Revoked approval must disable performance evidence download');
 await page.locator('#approve').check();
 assert.equal(await page.locator('#run').isEnabled(),true,
  'Consent reapproval may begin a new independent inference');
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
 assert.equal(result.faceLandmarkGuardApplied,true,'Airplane mode must retain facial feature protection');
 assert.ok(Number.isFinite(result.predictedFaceSkinFraction));
 assert.equal(result.outsideMaskChangedPixels,0,'Airplane-mode reconstruction must not alter protected pixels');
 // Full reference hairstyle overlay is independently repeated with the browser
 // network disabled, including real face/skin model inference and provenance.
 await page.locator('#referenceSample').selectOption(eligible.id);
 await page.locator('#previewTransfer').click();
 await page.waitForFunction(()=>window.__hananehTransferStage!==null,{timeout:60000});
 const offlinePreview=await page.evaluate(()=>window.__hananehTransferStage);
 assert.equal(offlinePreview.ok,true,
  'Offline end-to-end reference research preview failed: '+offlinePreview.reason);
 assert.equal(offlinePreview.exportAllowed,false);
 assert.equal(offlinePreview.generatedNewHair,false);
 assert.deepEqual(offlinePreview.counts,uiTransfer.counts,
  'Protected transfer pixel counts must match across online and offline inference');
 assert.deepEqual(offlinePreview.diagnosticFlags,uiTransfer.diagnosticFlags,
  'Offline reload must not conceal the same visual failure warnings');
 await page.locator('#targetAware').click();
 await page.waitForFunction(()=>!!window.__hananehTargetAwareStage,{timeout:180000});
 const offlineTarget=await page.evaluate(()=>window.__hananehTargetAwareStage);
 assert.equal(offlineTarget.ok,true,
  'Airplane-mode target-aware actual second MI-GAN inference failed: '+offlineTarget.reason);
 assert.equal(offlineTarget.oldRemovalPixels,liveTarget.oldRemovalPixels);
 assert.equal(offlineTarget.targetRemovalPixels,liveTarget.targetRemovalPixels);
 assert.equal(offlineTarget.unnecessaryErasureAvoided,liveTarget.unnecessaryErasureAvoided);
 assert.equal(offlineTarget.exportAllowed,false);
 const [offlineEvidenceDownload]=await Promise.all([
  page.waitForEvent('download'),page.locator('#deviceEvidence').click()
 ]);
 const offlineDeviceEvidence=JSON.parse(await fs.readFile(
  await offlineEvidenceDownload.path(),'utf8'));
 assert.equal(offlineDeviceEvidence.ok,true);
 assert.equal(offlineDeviceEvidence.runtime.disconnectedAtExport,true,
  'Device evidence must accurately record browser network-offline state');
 assert.equal(offlineDeviceEvidence.targetAware.completed,true);
 assert.equal(offlineDeviceEvidence.credibility.fullNetworkIsolationIndependentlyVerified,false,
  'Device evidence must not pretend to certify independent OS isolation');
 assert.equal(offlineDeviceEvidence.commercialReleaseAllowed,false);
 console.log('PHASE28 OFFLINE ANONYMOUS DEVICE JSON PASSED '+JSON.stringify({
  modelRanWithNetworkDisabled:true,
  noPhotosOrHardwareIdentifiersExported:true,commercialReleaseAllowed:false}));

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
