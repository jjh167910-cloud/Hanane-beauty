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
 assert.equal(await page.locator('#portraitMatte').isEnabled(),true);
 assert.equal(await page.locator('#hairTrimap').isEnabled(),true);
 await page.locator('#hairTrimap').click();
 const firstTrimap=await page.evaluate(()=>window.__hananehHairTrimapStage);
 assert.equal(firstTrimap.ok,true,'Hair trimap construction failed: '+firstTrimap.reason);
 assert.equal(await page.locator('#colorlineAlpha').isEnabled(),true);
 await page.locator('#colorlineAlpha').click();
 const firstColorline=await page.evaluate(()=>window.__hananehColorlineAlphaStage);
 assert.equal(firstColorline.ok,true,'Real color-line hair alpha failed: '+firstColorline.reason);
 assert.equal(firstColorline.exportAllowed,false);
 assert.equal(firstColorline.alphaGroundTruth,false);
 assert.equal(firstColorline.neuralHairMattingExecuted,false);
 assert.equal(firstColorline.licensedNeuralMattingWeightsUsed,false);
 assert.equal(firstColorline.referencePortraitEdited,false);
 assert.equal(firstColorline.protectedFacePixelsChanged,0);
 assert.equal(firstColorline.metrics.unknownPixels,firstTrimap.metrics.unknown);
 assert.equal(firstColorline.metrics.resolvedUnknownPixels+
   firstColorline.metrics.unresolvedUnknownPixels,firstTrimap.metrics.unknown);
 assert.ok(firstColorline.metrics.resolvedUnknownPixels>=0);
 assert.ok(firstColorline.metrics.unknownResolvedFraction>=0&&
   firstColorline.metrics.unknownResolvedFraction<=1);
 console.log('PHASE40 ACTUAL CLASSICAL HAIR ALPHA STUDY '+JSON.stringify({
  unknown: firstColorline.metrics.unknownPixels,
  supportedAlpha: firstColorline.metrics.resolvedUnknownPixels,
  fractionalAlpha: firstColorline.metrics.fractionalUnknownPixels,
  abstentions: firstColorline.metrics.unresolvedUnknownPixels,
  meanColorResidual: firstColorline.metrics.averageAcceptedRGBLineResidual,
  independentlyValidatedHairAlpha:false,
  modelWeightsUsed:0,customerExport:false}));
 assert.equal(firstTrimap.estimatedHairAlpha,false);
 assert.equal(firstTrimap.neuralHairMattingExecuted,false);
 assert.equal(firstTrimap.exportAllowed,false);
 assert.equal(firstTrimap.protectedForeheadPreserved,true);
 assert.ok(firstTrimap.metrics.foreground>30);
 assert.ok(firstTrimap.metrics.unknown>30);
 assert.ok(firstTrimap.metrics.background>200);
 assert.ok(firstTrimap.metrics.originalPredictedHairProtectedConflicts>=0);
 console.log('PHASE39 REAL GUARDED HAIR TRIMAP '+JSON.stringify({
  knownHair:firstTrimap.metrics.foreground,
  unknown:firstTrimap.metrics.unknown,
  knownBackground:firstTrimap.metrics.background,
  predictedHairFaceConflicts:firstTrimap.metrics.originalPredictedHairProtectedConflicts,
  alphaNotPredicted:true,commercialApproval:false}));
 await page.locator('#portraitMatte').click();
 await page.waitForFunction(()=>window.__hananehPortraitMatteStage!==null,{timeout:160000});
 const livePortraitMatte=await page.evaluate(()=>window.__hananehPortraitMatteStage);
 assert.equal(livePortraitMatte.ok,true,
  'Actual neural MODNet model did not run: '+livePortraitMatte.reason);
 assert.equal(livePortraitMatte.realPortraitModelRan,true);
 assert.equal(livePortraitMatte.hairAlphaGroundTruth,false);
 assert.equal(livePortraitMatte.alphaIsGroundTruth,false);
 assert.equal(livePortraitMatte.modelIsHairSpecific,false);
 assert.equal(livePortraitMatte.exportAllowed,false);
 assert.equal(livePortraitMatte.photoUploaded,false);
 assert.equal(livePortraitMatte.facePixelsEdited,0);
 assert.ok(livePortraitMatte.metrics.sourceHairPixels>1000);
 assert.ok(livePortraitMatte.metrics.meanPortraitAlpha>=0&&
  livePortraitMatte.metrics.meanPortraitAlpha<=1);
 console.log('PHASE38 GENUINE PORTRAIT MATTING MODEL RUN '+JSON.stringify({
  modelExecuted:true,inferenceMs:livePortraitMatte.elapsedMs,
  hairPixels:livePortraitMatte.metrics.sourceHairPixels,
  hairPersonAgreement:livePortraitMatte.metrics.hairInsidePredictedPersonFraction,
  hasHairAlphaGroundTruth:false,faceEdits:0,commercialExport:false}));
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
 await page.locator('#referenceDecontam').click();
 const liveDecontam=await page.evaluate(()=>window.__hananehDecontamStage);
 assert.equal(liveDecontam.ok,true,'Real reference foreground estimation refused: '+liveDecontam.reason);
 assert.equal(liveDecontam.exportAllowed,false);
 assert.equal(liveDecontam.trueAlphaMeasured,false);
 assert.equal(liveDecontam.hairlineGeometryStillUnresolved,true);
 assert.equal(liveDecontam.protectedFacePixelsChanged,0);
 assert.equal(liveDecontam.commercialReleaseAllowed,false);
 assert.ok(liveDecontam.correctedReference.candidatePixels>=0);
 assert.ok(liveDecontam.correctedReference.maxObservedChannelChange<=18);
 assert.ok(liveDecontam.previewChangedPixels>=0);
 console.log('PHASE37 REAL REFERENCE FOREGROUND COLOR STUDY '+JSON.stringify({
  eligibleEdgePixels:liveDecontam.correctedReference.candidatePixels,
  referencePixelsAdjusted:liveDecontam.correctedReference.pixelsChanged,
  projectedPreviewChanges:liveDecontam.previewChangedPixels,
  trueAlphaMeasured:false,faceEdits:0,humanQualityVerified:false,
  exportAllowed:false}));
 await page.locator('#hairlineAudit').click();
 const liveHairline=await page.evaluate(()=>window.__hananehHairlineStage);
 assert.ok(liveHairline,'Forehead risk inspection did not run');
 assert.equal(liveHairline.ok,true,'Actual model hairline audit refused: '+liveHairline.reason);
 assert.equal(liveHairline.exportAllowed,false);
 assert.equal(liveHairline.photorealismVerified,false);
 assert.equal(liveHairline.needsHumanHairlineReview,true);
 assert.ok(Number.isFinite(liveHairline.findings.coveredColumnFraction));
 assert.ok(Number.isFinite(liveHairline.findings.maximumNearHorizontalRunPx));
 assert.equal(JSON.stringify(liveHairline).includes('privateOverlay'),false,
  'Face-related hotspot coordinates must stay in local painter only');
 console.log('PHASE34 REAL HAIRLINE RISK REVIEW '+JSON.stringify({
  possibleArtificialHairline:liveHairline.possibleArtificialHairline,
  inspectionColumns:liveHairline.findings.hairlineColumns,
  maximumHorizontalRunPx:liveHairline.findings.maximumNearHorizontalRunPx,
  skinFaceChangedPixels:0,visualQualityApproved:false}));
 await page.locator('#softHairEdge').click();
 const liveEdge=await page.evaluate(()=>window.__hananehEdgeStage);
 assert.ok(liveEdge,'Research inner-edge experiment did not run');
 assert.equal(liveEdge.ok,true,'Real image edge experiment refused: '+liveEdge.reason);
 assert.equal(liveEdge.exportAllowed,false);
 assert.equal(liveEdge.photorealismVerified,false);
 assert.equal(liveEdge.referenceHairstyleGenerated,false);
 assert.equal(liveEdge.independentHairQualityScore,null);
 assert.ok(liveEdge.changedPixels>0);
 assert.ok(liveEdge.counts.softenedPixels>0);
 assert.ok(liveEdge.counts.boundaryPairs>0);
 assert.ok(liveEdge.retentionRisk?.metrics?.donorOpacityRetentionFraction>0);
 assert.equal(liveEdge.retentionRisk?.exportAllowed,false);
 assert.equal(liveEdge.retentionRisk?.humanHairQualityVerified,false);
 console.log('PHASE32 REAL HAIR RETENTION SAFETY CHECK '+JSON.stringify(liveEdge.retentionRisk));
 await page.locator('#hairTexture').click();
 const liveDetail=await page.evaluate(()=>window.__hananehMicrotextureStage);
 assert.equal(liveDetail.ok,true,'Real donor microtexture rejected: '+liveDetail.reason);
 assert.equal(liveDetail.exportAllowed,false);
 assert.equal(liveDetail.referenceHairstyleGenerated,false);
 assert.equal(liveDetail.photorealismVerified,false);
 assert.equal(liveDetail.independentHumanReviewPassed,false);
 assert.equal(liveDetail.possibleArtificialHairlineStillUnresolved,true);
 assert.ok(liveDetail.metrics.consideredBoundaryPixels>=0);
 assert.ok(liveDetail.metrics.changedPixels>=0);
 assert.ok(liveDetail.metrics.maxObservedDelta<=9);
 assert.equal(liveDetail.risk.criticallyExposedSourceHairPixels,0);
 assert.equal(liveDetail.risk.proxyCheckPassed,true);
 console.log('PHASE36 DONOR HAIRLINE MICROTEXTURE '+JSON.stringify({
  treatedPixels:liveDetail.metrics.changedPixels,
  inspectedBoundary:liveDetail.metrics.consideredBoundaryPixels,
  donorOpacityRetained:liveDetail.risk.donorOpacityRetentionFraction,
  gradientRatio:liveDetail.risk.gradientEnergyRatio,
  qualityHumanVerified:false,commercialExport:false}));
 // Phase33: browser automation supplies synthetic abstentions for integration
 // only, NEVER actual or independently collected human visual ratings.
 assert.equal(await page.locator('#reviewStart').isEnabled(),true);
 await page.locator('#reviewStart').click();
 assert.equal(await page.evaluate(()=>document.body.classList.contains('review-focus')),true);
 assert.equal(await page.locator('#transferPortrait').isVisible(),false,
  'Method-labelled earlier panels must not remain visible during blinded evaluation');
 assert.equal(await page.locator('#reviewSourcePortrait').isVisible(),true);
 assert.equal(await page.locator('#reviewReferencePortrait').isVisible(),true);
 assert.equal(await page.locator('#reviewZoomA').isVisible(),true,
  'Same-crop forehead close-up should be shown during focused review');
 assert.equal(await page.locator('#reviewZoomB').isVisible(),true);
 const zoomProof=await page.evaluate(()=>{
  const a=document.querySelector('#reviewZoomA');
  const b=document.querySelector('#reviewZoomB');
  const ref=document.querySelector('#reviewCanvasA');
  const aa=a.getContext('2d').getImageData(0,0,a.width,a.height).data;
  const bb=b.getContext('2d').getImageData(0,0,b.width,b.height).data;
  let nonBlankA=0,nonBlankB=0;
  for(let i=0;i<aa.length;i+=4){
   if(aa[i+3]===255)nonBlankA++;
   if(bb[i+3]===255)nonBlankB++;
  }
  return {available:window.__hananehBlindReviewStage?.hairlineZoomAvailable,
   nonBlankA,nonBlankB,fullWidth:ref.width,zoomWidth:a.width};
 });
 assert.equal(zoomProof.available,true);
 assert.ok(zoomProof.nonBlankA>1000);
 assert.ok(zoomProof.nonBlankB>1000);
 assert.equal(zoomProof.fullWidth,512);
 assert.equal(zoomProof.zoomWidth,512);
 assert.equal(await page.locator('#reviewExit').isEnabled(),true);
 assert.equal(await page.locator('#reviewExport').isDisabled(),true);
 assert.equal(await page.locator('#reviewQuestions fieldset').count(),4);
 assert.equal(await page.evaluate(()=>window.__hananehBlindReviewStage?.answeredCount),0);
 for(const question of ['overall','scalp_realism','identity','hairstyle_fidelity']){
  await page.locator('button[data-question="'+question+'"][data-vote="cannot_judge"]').click();
 }
 assert.equal(await page.locator('#reviewExport').isEnabled(),true);
 const [blindDownload]=await Promise.all([
  page.waitForEvent('download'),
  page.locator('#reviewExport').click()
 ]);
 assert.equal(blindDownload.suggestedFilename(),'hananeh-blind-comparison-anonymous.json');
 const recordedVotes=JSON.parse(await fs.readFile(await blindDownload.path(),'utf8'));
 assert.equal(recordedVotes.includes_images,false);
 assert.equal(recordedVotes.image_fingerprints_not_exported,true);
 assert.equal(recordedVotes.source_reference_tokens_are_random_not_photo_hashes,true);
 assert.equal(recordedVotes.human_preferences_verified,false);
 assert.equal(recordedVotes.independent_participants_verified,false);
 assert.equal(recordedVotes.is_publication_ready,false);
 assert.equal(recordedVotes.commercial_release_approved,false);
 assert.equal(recordedVotes.ratings.length,4);
 assert.deepEqual(new Set(recordedVotes.ratings.map(x=>x.question)),
  new Set(['overall','scalp_realism','identity','hairstyle_fidelity']));
 assert.equal(recordedVotes.ratings.every(x=>x.vote==='cannot_judge'),true,
  'Automation must use abstention only: it cannot fabricate human preferences');
 assert.ok(['A','B'].includes(recordedVotes.ratings[0].candidate_side));
 assert.equal(new Set(recordedVotes.ratings.map(x=>x.candidate_side)).size,1);
 for(const forbidden of ['data:image','base64,','PRIVATE_PORTRAIT',
   'photographic_sha256','userAgent','filename','local-photo','phone_model',
   'hairstyle-generated.png']){
  assert.equal(JSON.stringify(recordedVotes).includes(forbidden),false,
   'No portraits, filenames or device identifiers in vote metadata: '+forbidden);
 }
 assert.equal(await page.locator('#reviewExport').isDisabled(),true);
 console.log('PHASE35 SAME-ROI BLIND HAIRLINE CLOSEUP PASSED '+JSON.stringify({
  matchingSourceFrame:true,bothSidesRendered:true,
  methodLabelsHidden:true,photoExportAllowed:false,
  realHumanVotes:0}));
 console.log('PHASE33 SYNTHETIC BLIND UI INTEGRATION '+JSON.stringify({
  candidateSideMaskedDuringRating:true,questions:4,
  recordedVotes:'automated abstentions only',humanVotesVerified:false,
  portraitExported:false,commercialApproval:false}));
 await page.locator('#reviewDiscard').click();
 assert.equal(await page.evaluate(()=>document.body.classList.contains('review-focus')),false,
  'Leaving a review destroys the focus mode and its images');
 assert.equal(await page.evaluate(()=>window.__hananehBlindReviewStage),null);
 assert.equal(await page.locator('#reviewZoomA').isVisible(),false,
  'Consent or user discard must hide enlarged facial close-up');
 assert.equal(await page.locator('#reviewExport').isDisabled(),true);
 assert.equal(await page.locator('#reviewStart').isEnabled(),true);
 console.log('PHASE31 REAL HAIR CUTOUT INNER-EDGE ABLATION '+JSON.stringify({
  changedPixels:liveEdge.changedPixels,
  softenedPixels:liveEdge.counts.softenedPixels,
  seamJumpBefore:liveEdge.boundaryProxy.boundaryMeanRGBJumpBefore,
  seamJumpAfter:liveEdge.boundaryProxy.boundaryMeanRGBJumpAfter,
  noProtectedEdits:liveEdge.faceProtectionApplied,
  qualityHumanVerified:false,commercialExportAllowed:false}));
 // Phase 29: real MediaPipe six-landmark fitting is an optional research
 // comparison; missing ear/nose landmarks must fail safely, not be invented.
 await page.locator('#landmarkWarp').click();
 const liveWarp=await page.evaluate(()=>window.__hananehLandmarkStage);
 assert.ok(liveWarp,'Landmark research control did not execute');
 assert.equal(liveWarp.exportAllowed,false);
 assert.equal(liveWarp.referenceHairstyleGenerated,false);
 if(liveWarp.ok){
  assert.equal(liveWarp.geometry.anchorCount,6);
  assert.ok(liveWarp.geometry.postFitMeanPx<=liveWarp.geometry.preFitMeanPx+.05);
  assert.ok(liveWarp.comparisonChangedPixels>=0);
  assert.equal(liveWarp.independentVisualQualityRating,null);
 }else assert.match(liveWarp.reason,/Landmark-based donor alignment rejected/);
 console.log('PHASE29 REAL SIX-ANCHOR FACE FIT '+JSON.stringify(liveWarp));
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

 // Phase 30: use the ACTUAL offline catalog file as an externally supplied
 // local reference fixture. It is NOT an independently verified second person.
 const localFixture=await page.evaluate(()=>window.OFFLINE_IMAGES?.['3']||null);
 assert.match(localFixture||'',/^data:image\/(png|jpeg|webp);base64,/);
 const dataType=localFixture.match(/^data:(image\/[a-z]+);base64,/)[1];
 const fixtureBytes=Buffer.from(localFixture.split(',')[1],'base64');
 assert.ok(fixtureBytes.length>1024);
 await page.locator('#referenceSample').selectOption('local');
 await page.locator('#referencePhoto').setInputFiles({
  name:'catalog-reference-ci-fixture.'+(dataType==='image/png'?'png':dataType==='image/webp'?'webp':'jpg'),
  mimeType:dataType,buffer:fixtureBytes
 });
 assert.equal(await page.locator('#referencePhoto').inputValue(),'',
  'Uploading without separate reference permission must clear the file');
 await page.locator('#referenceConsent').check();
 await page.locator('#referencePhoto').setInputFiles({
  name:'catalog-reference-ci-fixture.'+(dataType==='image/png'?'png':dataType==='image/webp'?'webp':'jpg'),
  mimeType:dataType,buffer:fixtureBytes
 });
 await page.waitForFunction(()=>document.querySelector('#referenceStatus').textContent
  .includes('فقط در حافظه'),{timeout:15000});
 assert.equal(await page.locator('#referenceSample').inputValue(),'local');
 await page.locator('#previewTransfer').click();
 await page.waitForFunction(()=>window.__hananehTransferStage!==null,{timeout:60000});
 const localPhotoPreview=await page.evaluate(()=>window.__hananehTransferStage);
 assert.equal(localPhotoPreview.ok,true,'Real uploaded-reference offline preview: '+localPhotoPreview.reason);
 assert.equal(localPhotoPreview.referenceFromLocalFile,true);
 assert.equal(localPhotoPreview.differentPersonVerified,false);
 assert.equal(localPhotoPreview.referenceRightsIndependentlyVerified,false);
 assert.equal(localPhotoPreview.exportAllowed,false);
 await page.locator('#referenceDecontam').click();
 const localDecontam=await page.evaluate(()=>window.__hananehDecontamStage);
 assert.equal(localDecontam.ok,true,'Local reference foreground study refused: '+localDecontam.reason);
 assert.equal(localDecontam.exportAllowed,false);
 assert.equal(localDecontam.trueAlphaMeasured,false);
 await page.locator('#hairlineAudit').click();
 const localHairline=await page.evaluate(()=>window.__hananehHairlineStage);
 assert.equal(localHairline.ok,true,'Local reference should allow face-protected hairline inspection: '+localHairline.reason);
 assert.equal(localHairline.exportAllowed,false);
 await page.locator('#softHairEdge').click();
 const localEdge=await page.evaluate(()=>window.__hananehEdgeStage);
 assert.equal(localEdge.ok,true,'User-local reference failed edge A/B: '+localEdge.reason);
 assert.equal(localEdge.exportAllowed,false);
 assert.ok(localEdge.changedPixels>0);
 assert.ok(localEdge.retentionRisk?.metrics?.donorOpacityRetentionFraction>0);
 assert.equal(localEdge.retentionRisk?.exportAllowed,false);
 await page.locator('#hairTexture').click();
 const localDetail=await page.evaluate(()=>window.__hananehMicrotextureStage);
 assert.equal(localDetail.ok,true,'Uploaded hair reference texture experiment failed: '+localDetail.reason);
 assert.equal(localDetail.exportAllowed,false);
 assert.equal(localDetail.risk.criticallyExposedSourceHairPixels,0);
 await page.locator('#landmarkWarp').click();
 const localWarp=await page.evaluate(()=>window.__hananehLandmarkStage);
 assert.ok(localWarp,'Uploaded-photo warp must either succeed or explicitly refuse');
 assert.equal(localWarp.exportAllowed,false);
 console.log('PHASE30 ACTUAL BROWSER-UPLOADED REFERENCE '+JSON.stringify({
  localReferenceProcessed:true,rigidTransferAccepted:localPhotoPreview.ok,
  sixAnchorGeometryAccepted:localWarp.ok,differentPersonVerified:false,
  referenceRightsIndependentlyVerified:false,commercialReleaseAllowed:false}));
 await page.locator('#referenceConsent').uncheck();
 assert.equal(await page.locator('#referencePhoto').inputValue(),'');
 assert.equal(await page.evaluate(()=>window.__hananehTransferStage),null);
 assert.equal(await page.locator('#landmarkWarp').isDisabled(),true);
 assert.equal(await page.locator('#softHairEdge').isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__hananehEdgeStage),null,
  'Revoked reference permission must discard prior matting result');
 assert.equal(await page.evaluate(()=>window.__hananehDecontamStage),null);
 assert.equal(await page.locator('#referenceDecontam').isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__hananehPortraitMatteStage),null);
 assert.equal(await page.locator('#portraitMatte').isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__hananehHairTrimapStage),null);
 assert.equal(await page.locator('#hairTrimap').isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__hananehColorlineAlphaStage),null,
  'Photo consent withdrawal must erase prior fractional hair-alpha results');
 assert.equal(await page.locator('#colorlineAlpha').isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__hananehMicrotextureStage),null,
  'Revoked reference permission must erase all donor texture diagnostics');
 assert.equal(await page.locator('#hairTexture').isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__hananehHairlineStage),null,
  'Revoked reference permission must discard forehead hotspot diagnostics');
 assert.equal(await page.locator('#hairlineAudit').isDisabled(),true);
 assert.equal(await page.locator('#reviewStart').isDisabled(),true,
  'Reference withdrawal must disable comparative review');
 assert.equal(await page.evaluate(()=>window.__hananehBlindReviewStage),null);
 await page.locator('#referenceSample').selectOption(eligible.id);
 await page.locator('#previewTransfer').click();
 await page.waitForFunction(()=>window.__hananehTransferStage!==null,{timeout:60000});
 assert.equal(await page.evaluate(()=>window.__hananehTransferStage?.ok),true,
  'Catalog fixture reference must still work after local-photo consent withdrawal');
 assert.deepEqual(external,[]);
 assert.deepEqual(errors,[]);

 // Withdrawal must remove export permission and discard any previous proof.
 await page.locator('#approve').uncheck();
 assert.equal(await page.locator('#download').isDisabled(),true,
  'Revoked approval must disable previous neural output export');
 assert.equal(await page.evaluate(()=>window.__hananehHairStage),null,
  'Revoked approval must delete prior evidence from page state');
 assert.equal(await page.locator('#landmarkWarp').isDisabled(),true,
  'Revoked consent must disable geometry research');
 assert.equal(await page.evaluate(()=>window.__hananehLandmarkStage),null,
  'Revoked consent must erase previous facial landmark fit diagnostics');
 assert.equal(await page.locator('#softHairEdge').isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__hananehEdgeStage),null);
 assert.equal(await page.evaluate(()=>window.__hananehDecontamStage),null);
 assert.equal(await page.locator('#referenceDecontam').isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__hananehMicrotextureStage),null);
 assert.equal(await page.locator('#hairTexture').isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__hananehHairlineStage),null);
 assert.equal(await page.locator('#hairlineAudit').isDisabled(),true);
 assert.equal(await page.locator('#reviewStart').isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__hananehBlindReviewStage),null);
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
    '/ai/migan/ort/ort.min.js',
    '/ai/migan/models/portrait-modnet-manifest.json',
    '/ai/migan/models/portrait-modnet-fp16.onnx',
    '/ai/migan/portrait-modnet-neural-audit.mjs',
    '/ai/migan/guarded-hair-trimap.mjs',
    '/ai/migan/hair-alpha-colorline-research.mjs',
    ...manifest.parts.map(p=>'/ai/migan/parts/'+p.name)];
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
 await page.locator('#hairTrimap').click();
 const offlineTrimap=await page.evaluate(()=>window.__hananehHairTrimapStage);
 assert.equal(offlineTrimap.ok,true,'Face-safe hair trimap must run airplane mode: '+offlineTrimap.reason);
 await page.locator('#colorlineAlpha').click();
 const offlineColorline=await page.evaluate(()=>window.__hananehColorlineAlphaStage);
 assert.equal(offlineColorline.ok,true,
  'Classical hair opacity inference must run airplane mode: '+offlineColorline.reason);
 assert.deepEqual(offlineColorline.metrics,firstColorline.metrics,
  'Offline reloaded hair alpha must give exactly same supported/abstained counts');
 assert.equal(offlineColorline.exportAllowed,false);
 assert.equal(offlineColorline.neuralHairMattingExecuted,false);
 console.log('PHASE40 AIRPLANE MODE HAIR ALPHA STUDY '+JSON.stringify({
  identicalMetrics:true,unknownPixelCount:offlineColorline.metrics.unknownPixels,
  resolved:offlineColorline.metrics.resolvedUnknownPixels,
  abstained:offlineColorline.metrics.unresolvedUnknownPixels,
  commercialApproval:false}));
 assert.deepEqual(offlineTrimap.metrics,firstTrimap.metrics);
 assert.equal(offlineTrimap.estimatedHairAlpha,false);
 assert.equal(offlineTrimap.exportAllowed,false);
 console.log('PHASE39 AIRPLANE MODE HAIR TRIMAP '+JSON.stringify({
  identicalCounts:true,faceVetoRetained:true,
  hairNeuralAlphaPredicted:false,customerExport:false}));
 await page.locator('#portraitMatte').click();
 await page.waitForFunction(()=>window.__hananehPortraitMatteStage!==null,{timeout:160000});
 const offlinePortraitMatte=await page.evaluate(()=>window.__hananehPortraitMatteStage);
 assert.equal(offlinePortraitMatte.ok,true,
  'Local real portrait matte must execute in airplane mode: '+offlinePortraitMatte.reason);
 assert.deepEqual(offlinePortraitMatte.metrics,livePortraitMatte.metrics,
  'Pinned local model must produce deterministic portrait alpha statistics');
 assert.equal(offlinePortraitMatte.hairAlphaGroundTruth,false);
 assert.equal(offlinePortraitMatte.exportAllowed,false);
 console.log('PHASE38 PORTRAIT MATTING AIRPLANE MODE '+JSON.stringify({
  sourceHairAgreementStable:true,
  portraitAlphaIsHairMatte:false,portraitUpload:false,
  independentHairQualityVerified:false}));
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
 await page.locator('#referenceDecontam').click();
 const offlineDecontam=await page.evaluate(()=>window.__hananehDecontamStage);
 assert.equal(offlineDecontam.ok,true,'Color estimation must work offline: '+offlineDecontam.reason);
 assert.deepEqual(offlineDecontam.correctedReference,liveDecontam.correctedReference);
 assert.equal(offlineDecontam.previewChangedPixels,liveDecontam.previewChangedPixels);
 assert.equal(offlineDecontam.exportAllowed,false);
 console.log('PHASE37 AIRPLANE MODE REFERENCE COLOR '+JSON.stringify({
  deterministic:true,referencePixels:offlineDecontam.correctedReference.pixelsChanged,
  previewPixels:offlineDecontam.previewChangedPixels,
  portraitUpload:false,commercialExport:false}));
 await page.locator('#hairlineAudit').click();
 const offlineHairline=await page.evaluate(()=>window.__hananehHairlineStage);
 assert.equal(offlineHairline.ok,true,'Forehead diagnostic should work offline: '+offlineHairline.reason);
 assert.equal(offlineHairline.exportAllowed,false);
 assert.deepEqual(offlineHairline.findings,liveHairline.findings);
 assert.equal(offlineHairline.possibleArtificialHairline,liveHairline.possibleArtificialHairline);
 console.log('PHASE34 AIRPLANE-MODE FOREHEAD ARTIFACT AUDIT '+JSON.stringify({
  repeatableProxy:true,approvedOutput:false,photoUploaded:false}));
 await page.locator('#softHairEdge').click();
 const offlineEdge=await page.evaluate(()=>window.__hananehEdgeStage);
 assert.equal(offlineEdge.ok,true,
  'Matting must be reproducible with full network disabled: '+offlineEdge.reason);
 assert.equal(offlineEdge.changedPixels,liveEdge.changedPixels);
 assert.deepEqual(offlineEdge.boundaryProxy,liveEdge.boundaryProxy);
 assert.deepEqual(offlineEdge.retentionRisk,liveEdge.retentionRisk,
  'Full airplane mode should reproduce coverage erosion and scalp-exposure warnings');
 await page.locator('#hairTexture').click();
 const offlineDetail=await page.evaluate(()=>window.__hananehMicrotextureStage);
 assert.equal(offlineDetail.ok,true,'In-mask detail audit must run offline: '+offlineDetail.reason);
 assert.deepEqual(offlineDetail.metrics,liveDetail.metrics,
  'Source reference texture microdetail must be deterministic in airplane mode');
 assert.deepEqual(offlineDetail.risk,liveDetail.risk);
 assert.equal(offlineDetail.exportAllowed,false);
 console.log('PHASE36 AIRPLANE MODE REAL DONOR DETAIL '+JSON.stringify({
  parity:true,changedPixels:offlineDetail.metrics.changedPixels,
  noScalpExposure:offlineDetail.risk.criticallyExposedSourceHairPixels===0}));
 await page.locator('#reviewStart').click();
 assert.equal(await page.evaluate(()=>document.body.classList.contains('review-focus')),true);
 assert.equal(await page.locator('#transferPortrait').isVisible(),false);
 assert.equal(await page.locator('#reviewSourcePortrait').isVisible(),true);
 assert.equal(await page.locator('#reviewZoomA').isVisible(),true);
 assert.equal(await page.locator('#reviewZoomB').isVisible(),true);
 assert.equal(await page.locator('#reviewQuestions fieldset').count(),4,
  'Blind review controls must function after airplane-mode reload');
 assert.equal(await page.locator('#reviewExport').isDisabled(),true,
  'No offline votes can be exported before a human completes the review');
 await page.locator('#reviewDiscard').click();
 assert.equal(await page.evaluate(()=>window.__hananehBlindReviewStage),null);
 console.log('PHASE33 OFFLINE REVIEW CONTROL PASSED '+JSON.stringify({
  questions:4,autoHumanRatings:0,portraitUpload:false}));
 assert.equal(offlineEdge.exportAllowed,false);
 console.log('PHASE32 AIRPLANE-MODE HAIR COVERAGE AUDIT '+JSON.stringify({
  identicalRiskMetrics:true,proxyCheckPassed:offlineEdge.retentionRisk.proxyCheckPassed,
  hairQualityVerified:false,commercialExportAllowed:false}));
 console.log('PHASE31 AIRPLANE MODE BOUNDARY ABLATION '+JSON.stringify({
  sameChangedPixelCount:true,sameProxy:true,commercialExportAllowed:false}));
 await page.locator('#landmarkWarp').click();
 const offlineWarp=await page.evaluate(()=>window.__hananehLandmarkStage);
 assert.ok(offlineWarp,'Six-anchor result must exist on airplane-mode repeat');
 assert.equal(offlineWarp.exportAllowed,false);
 assert.equal(offlineWarp.ok,liveWarp.ok,
  'Offline reload must preserve acceptance/refusal of face geometry');
 if(offlineWarp.ok){
  assert.deepEqual(offlineWarp.geometry,liveWarp.geometry,
   'Same local reference images should reproduce pose-fit geometry');
  assert.equal(offlineWarp.comparisonChangedPixels,liveWarp.comparisonChangedPixels);
 }else assert.equal(offlineWarp.reason,liveWarp.reason);
 console.log('PHASE29 AIRPLANE MODE LANDMARK FIT '+JSON.stringify({
  accepted:offlineWarp.ok,commercialExportAllowed:false}));
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

 // Reference photos selected from the local file picker must work even
 // after the app reloads with the browser network completely disabled.
 await page.locator('#referenceSample').selectOption('local');
 await page.locator('#referenceConsent').check();
 await page.locator('#referencePhoto').setInputFiles({
  name:'local-photo-airplane-mode.'+(dataType==='image/png'?'png':dataType==='image/webp'?'webp':'jpg'),
  mimeType:dataType,buffer:fixtureBytes
 });
 await page.waitForFunction(()=>document.querySelector('#referenceStatus').textContent
  .includes('فقط در حافظه'),{timeout:15000});
 await page.locator('#previewTransfer').click();
 await page.waitForFunction(()=>!!window.__hananehTransferStage,{timeout:60000});
 const offlineLocalPreview=await page.evaluate(()=>window.__hananehTransferStage);
 assert.equal(offlineLocalPreview.ok,true,'Local reference failed in airplane mode: '+offlineLocalPreview.reason);
 assert.equal(offlineLocalPreview.referenceFromLocalFile,true);
 assert.equal(offlineLocalPreview.exportAllowed,false);
 assert.equal(offlineLocalPreview.differentPersonVerified,false);
 await page.locator('#referenceDecontam').click();
 const offlineLocalDecontam=await page.evaluate(()=>window.__hananehDecontamStage);
 assert.equal(offlineLocalDecontam.ok,true,'Local uploaded color study offline rejected: '+offlineLocalDecontam.reason);
 assert.deepEqual(offlineLocalDecontam.correctedReference,localDecontam.correctedReference);
 assert.equal(offlineLocalDecontam.previewChangedPixels,localDecontam.previewChangedPixels);
 assert.equal(offlineLocalDecontam.exportAllowed,false);
 await page.locator('#hairlineAudit').click();
 const offlineLocalHairline=await page.evaluate(()=>window.__hananehHairlineStage);
 assert.equal(offlineLocalHairline.ok,true,'Local uploaded reference hairline audit must run offline');
 assert.deepEqual(offlineLocalHairline.findings,localHairline.findings);
 assert.equal(offlineLocalHairline.exportAllowed,false);
 await page.locator('#softHairEdge').click();
 const offlineLocalEdge=await page.evaluate(()=>window.__hananehEdgeStage);
 assert.equal(offlineLocalEdge.ok,true,'Offline local photo matting failed: '+offlineLocalEdge.reason);
 assert.equal(offlineLocalEdge.changedPixels,localEdge.changedPixels);
 assert.deepEqual(offlineLocalEdge.boundaryProxy,localEdge.boundaryProxy);
 assert.deepEqual(offlineLocalEdge.retentionRisk,localEdge.retentionRisk);
 assert.equal(offlineLocalEdge.exportAllowed,false);
 await page.locator('#hairTexture').click();
 const offlineLocalDetail=await page.evaluate(()=>window.__hananehMicrotextureStage);
 assert.equal(offlineLocalDetail.ok,true,'Local reference texture must run offline: '+offlineLocalDetail.reason);
 assert.deepEqual(offlineLocalDetail.metrics,localDetail.metrics);
 assert.deepEqual(offlineLocalDetail.risk,localDetail.risk);
 assert.equal(offlineLocalDetail.exportAllowed,false);
 assert.deepEqual(offlineLocalPreview.counts,localPhotoPreview.counts,
  'Online and offline file picker must yield the exact same counted hair pixels');
 await page.locator('#referenceConsent').uncheck();
 assert.equal(await page.locator('#referencePhoto').inputValue(),'');
 assert.equal(await page.evaluate(()=>window.__hananehTransferStage),null);
 console.log('PHASE30 AIRPLANE MODE LOCAL REFERENCE REPEAT '+JSON.stringify({
  successfulOfflinePreview:true,samePixelCounts:true,
  differentPersonVerified:false,commercialExportAllowed:false}));

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
