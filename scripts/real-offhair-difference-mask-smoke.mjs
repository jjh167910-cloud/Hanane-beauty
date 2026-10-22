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
  const {getLocalMulticlassSegmenter,compareHairModelMasks}=await import('/ai/offhair-multiclass-baseline.mjs');
  const {differenceMaskStudy,mapTopologyToRGBA}=await import('/ai/offhair-difference-masks.mjs');
  const {observationFromFaceAnchor,transferSupportMask,gateTargetSupport}=await import('/ai/offhair-pose-flow.mjs');
  const {makeLandmarkFaceZones}=await import('/ai/offhair-face-zones.mjs');
  const {studyLandmarkStability}=await import('/ai/offhair-landmark-stability.mjs');
  const learnedWeights=await (await fetch('/ai/models/offhair-synthetic-pose-flow-v1.json')).json();
  const engine=await getLocalHairSegmenter(),
   semanticEngine=await getLocalMulticlassSegmenter(),dim=512;
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
   const semantics=semanticEngine.analyze(c);
   observations[id]={valid:!!(detection.mask&&detection.face),face:detection.face,
    semantic:{classCounts:semantics.counts,faceSkinFraction:semantics.faceSkinFraction,
      size:[semantics.width,semantics.height],crossModel:null}};
   if(detection.mask){
    const c2=document.createElement('canvas');c2.width=c2.height=dim;
    const ctx=c2.getContext('2d');ctx.drawImage(detection.mask,0,0,dim,dim);
    observations[id].mask=ctx.getImageData(0,0,dim,dim).data;
    observations[id].semantic.crossModel=compareHairModelMasks(
     semantics.labels,semantics.width,semantics.height,
     observations[id].mask,dim,dim);
   }
  }
  // Measure sensitivity on every available independently segmented source photo.
  // Same images/landmarks after offline reload. This is NOT calibrated error.
  const faceStability=ids.map(id=>{
   const observation=observations[id];
   if(!observation?.mask||!observation?.face)
    return {id,ok:false,reason:'Missing local face or hair prediction'};
   const downsampled=new Uint8Array(128*128);
   for(let yy=0;yy<128;yy++)for(let xx=0;xx<128;xx++){
    downsampled[yy*128+xx]=observation.mask[((yy*4+2)*512+(xx*4+2))*4];
   }
   const study=studyLandmarkStability({face:observation.face,
    width:128,height:128,hairMask:downsampled,jitter:.06});
   return {id,ok:study.ok,reason:study.reason,
    eligibleForAutomaticEditing:study.eligibleForAutomaticEditing,
    testedPerturbations:study.testedPerturbations,
    counts:study.counts,fractions:study.fractions,
    policy:study.policy};
  });
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
   // Compatibility stress: genuine detector observations, synthetic-only fitted weights.
   // DO NOT compare against a real target hairstyle ground truth (none exists).
   const left=observationFromFaceAnchor(x.face,128,128);
   const right=observationFromFaceAnchor(y.face,128,128);
   let student={eligibleForAutomaticEditing:false,
     simulationTrained:true,realPhotoGeometryValidated:false};
   if(!left.ok||!right.ok){
    student={...student,acceptedForDescriptiveAnalysis:false,
     reason:'landmarks_outside_synthetic_training_support',
     sourceReason:left.reason||null,referenceReason:right.reason||null};
   }else{
    const binary=new Uint8Array(128*128);
    for(let yy=0;yy<128;yy++)for(let xx=0;xx<128;xx++){
     // Sample the independent REAL reference mask at 512 resolution.
     const sx=xx*4+2,sy=yy*4+2;
     binary[yy*128+xx]=y.mask[(sy*512+sx)*4]>=178?255:0;
    }
    const learned=transferSupportMask(binary,128,128,
      {...left.frame,noseBias:left.noseBias,earBias:left.earBias},
      {...right.frame,noseBias:right.noseBias,earBias:right.earBias},
      {model:learnedWeights,mode:'learned'});
    const roll=transferSupportMask(binary,128,128,
      left.frame,right.frame,{mode:'similarity'});
    const zones=makeLandmarkFaceZones(x.face,128,128);
    if(!zones.ok)student={...student,acceptedForDescriptiveAnalysis:false,reason:zones.reason};
    else{
     const core=new Uint8Array(128*128),forehead=new Uint8Array(128*128);
     for(let i=0;i<core.length;i++){
      core[i]=zones.zones[i]===1?1:0;
      forehead[i]=zones.zones[i]===2?1:0;
     }
     const gate=gateTargetSupport(learned,core,forehead);
     let changed=0;
     for(let i=0;i<learned.length;i++)if((learned[i]>0)!==(roll[i]>0))changed++;
     student={...student,acceptedForDescriptiveAnalysis:true,
       sourceNoseBias:left.noseBias,referenceNoseBias:right.noseBias,
       sourceEarBias:left.earBias,referenceEarBias:right.earBias,
       proposedHairPixels:gate.hairPixels,
       disagreementWithSimilarityPixels:changed,
       immutableCoreConflicts:gate.protectedConflicts,
       unresolvedForeheadPixels:gate.foreheadUnresolved,
       eligibleForAutomaticEditing:gate.automaticEditingAllowed,
       reason:gate.reason};
    }
   }
   if(!presented&&a==='2'&&b==='6'&&dm.labels&&anatomical.labels){
    const section=document.createElement('section');
    section.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:16px;max-width:1050px;margin:auto';
    for(const [name,result] of [
      ['Legacy broad face ellipse — research topology',dm],
      ['Landmark core + unresolved forehead (teal) — NOT safe for export',anatomical]]){
      const frame=document.createElement('div');
      const title=document.createElement('p');title.textContent=name;
      title.style.cssText='font-weight:700;font-size:13px;line-height:1.5';
      const canvas=document.createElement('canvas');canvas.width=canvas.height=dim;
      canvas.style.cssText='width:100%;display:block;background:#fff;border:1px solid #ddd';
      canvas.setAttribute('aria-label',name);
      canvas.getContext('2d').putImageData(new ImageData(mapTopologyToRGBA(result),dim,dim),0,0);
      frame.append(title,canvas);section.append(frame);
    }
    document.body.appendChild(section);presented=true;
   }
   return {pair:a+'-'+b,accepted:dm.ok,reason:dm.reason,scaleRatio:dm.scaleRatio,
    counts:dm.counts,measures:dm.measures,
    rollAblation:{accepted:rolled.ok,reason:rolled.reason,
     rollDifferenceRadians:rolled.rollDifferenceRadians,
     counts:rolled.counts,measures:rolled.measures},
    learnedSyntheticStudent:student,
    landmarkAblation:{accepted:anatomical.ok,reason:anatomical.reason,
     hasValidatedFaceAnatomy:!String(anatomical.reason).includes('geometry'),
     eligibleForAutomatedEditing:anatomical.eligibleForAutomatedEditing===true,
     manualReviewRequired:anatomical.manualReviewRequired===true,
     coreConflictReviewRisk:anatomical.measures?.conflictFraction>.05?'high_exploratory':'review',
     counts:anatomical.counts,measures:anatomical.measures},
    referenceHairstyleGenerated:dm.referenceHairstyleGenerated};
  });
  return {observed:ids.map(id=>({id,hasRealMask:!!observations[id]?.mask,
   hasFace:!!observations[id]?.face,semantic:observations[id]?.semantic})),
    faceStability,evaluations,
   method:'2d_eye_anchor_proxy_topology',generatedHairstyles:0,photographicQualityVerified:false};
 };
 const first=await page.evaluate(measure);
 assert.equal(first.observed.filter(x=>x.semantic?.classCounts?.length===6).length,5,
  'All bundled portraits must execute the genuine Apache-2.0 six-class model');
 for(const item of first.observed){
  const m=item.semantic;
  assert.ok(m,'No multiclass prediction for '+item.id);
  assert.equal(m.classCounts.reduce((a,b)=>a+b,0),m.size[0]*m.size[1]);
  assert.equal(m.crossModel?.usableForAutomaticEditing,false);
  assert.equal(m.crossModel?.hasIndependentGroundTruth,false);
 }
 assert.ok(first.observed.filter(x=>x.hasRealMask&&x.hasFace).length>=3,
  'Insufficient genuine catalog masks and landmarks');
 assert.ok(first.evaluations.filter(x=>x.counts).length>=3,
  'No meaningful source-reference topology pairs were measurable');
 for(const entry of first.evaluations)if(entry.counts){
  const c=entry.counts;assert.equal(
   c.remove+c.add+c.overlap+c.preserve+c.faceConflict,512*512);
  assert.equal(entry.learnedSyntheticStudent?.eligibleForAutomaticEditing,false);
  const d=entry.landmarkAblation?.counts;
  if(d)assert.equal(d.remove+d.add+d.overlap+d.preserve+
    d.faceConflict+d.foreheadPending,512*512,'Anatomical topology must exhaust pixels');
  assert.equal(entry.referenceHairstyleGenerated,false);
 }
 assert.ok(first.faceStability.length===5);
 for(const study of first.faceStability){
  assert.equal(study.eligibleForAutomaticEditing,false);
  if(study.ok)assert.equal(study.testedPerturbations,15);
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
  analyzed: first.observed.length,semanticComparisons:first.observed.map(x=>({
   id:x.id,hairIoU:x.semantic?.crossModel?.crossModelHairIoU,
   skinConflictFraction:x.semantic?.crossModel?.skinConflictFractionOfOriginalHair,
   faceSkinPixels:x.semantic?.classCounts?.[3],verifiedGroundTruth:false})),
   faceStability:first.faceStability,
  measurable:first.evaluations.filter(x=>x.counts).length,
  accepted:first.evaluations.filter(x=>x.accepted).length,rejected:first.evaluations.filter(x=>!x.accepted).length,
  rollAccepted:first.evaluations.filter(x=>x.rollAblation?.accepted).length,
  anatomyAccepted:first.evaluations.filter(x=>x.landmarkAblation?.accepted).length,
  anatomyReady:first.evaluations.filter(x=>x.landmarkAblation?.hasValidatedFaceAnatomy).length,
  anatomyManualReview:first.evaluations.filter(x=>x.landmarkAblation?.manualReviewRequired).length,
  anatomyHighCoreConflictReview:first.evaluations.filter(x=>x.landmarkAblation?.coreConflictReviewRisk==='high_exploratory').length,
  syntheticStudentObservationAvailable:first.evaluations.filter(x=>x.learnedSyntheticStudent?.acceptedForDescriptiveAnalysis).length,
  syntheticStudentAutomaticApprovals:first.evaluations.filter(x=>x.learnedSyntheticStudent?.eligibleForAutomaticEditing).length,
  results:first.evaluations.map(x=>({pair:x.pair,accepted:x.accepted,reason:x.reason,
  measures:x.measures,rollAccepted:x.rollAblation?.accepted,
  rollReason:x.rollAblation?.reason,rollMeasures:x.rollAblation?.measures,
  landmarkAccepted:x.landmarkAblation?.accepted,
  landmarkReason:x.landmarkAblation?.reason,
  reviewOnly:x.landmarkAblation?.manualReviewRequired,
  coreConflictReviewRisk:x.landmarkAblation?.coreConflictReviewRisk,
  landmarkMeasures:x.landmarkAblation?.measures,
  syntheticStudent:x.learnedSyntheticStudent}))}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
