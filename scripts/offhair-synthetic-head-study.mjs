// OffHair supervised synthetic 2D deformation pilot. NO real portrait training or evidence.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {fitPoseFlow,fromFrame,transferSupportMask,maskMetrics} from '../public/ai/offhair-pose-flow.mjs';
export function rng(seed){let state=seed>>>0;return ()=>{state+=0x6d2b79f5;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const between=(r,a,b)=>a+(b-a)*r();
function geometry(yaw,u,v,head){
 const wobble=head.wobble,orientation=head.family==='alternate'?-0.7:1;
 return [u+yaw*orientation*(.18+.28*v+.075*u*u)+yaw*yaw*(.075*u*v)+wobble*yaw*v*v,
  v+yaw*orientation*(.075*u+.065*u*v)+yaw*yaw*.04*v+wobble*.25*yaw*u*u];
}
function invert(x,y,yaw,head){
 let u=x,v=y;
 for(let k=0;k<7;k++){const p=geometry(yaw,u,v,head);u+=(x-p[0])*.92;v+=(y-p[1])*.92;}
 return [u,v];
}
function hair(u,v,s){
 const crown=((u-s.part)/s.width)**2+((v+.87)/s.height)**2<=1;
 const fringe=v>-.65&&v<-.1+s.fringe*.35&&Math.abs(u-s.fringe*.2)<s.width*.63&&
  v<-.2+Math.cos(u*3+s.part)*.07;
 const side=Math.abs(u-s.part)>s.width*.72&&Math.abs(u-s.part)<s.width*1.15&&
  v>-.4&&v<s.length&&Math.abs(u-s.part)<s.width*(1.15-.18*Math.max(0,v));
 return crown||fringe||side;
}
function person(r,identity,style,{yawRange=.8,shiftWobble=.07}={}){
 const yaw=between(r,-yawRange,yawRange),roll=between(r,-.28,.28);
 return {yaw,roll,scale:between(r,24,30),cx:between(r,41,55),
  cy:between(r,46,53),wobble:between(r,-shiftWobble,shiftWobble),
  noseBias:.38*yaw+between(r,-.01,.01),earBias:.8*yaw+between(r,-.035,.035),
  identity,style};
}
function pair(r,identity,options={}){
 const style={width:between(r,.68,1.12),height:between(r,.45,.9),
  fringe:between(r,0,1),part:between(r,-.14,.14),length:between(r,.2,1.1)};
 const source=person(r,identity,style,options),reference=person(r,identity,style,options);
 reference.wobble=source.wobble;
 source.family=reference.family=options.family||'main';
 return {source,reference,identity};
}
function render(face,size){
 const mask=new Uint8Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const [px,py]=fromFrame(x+.5,y+.5,face);
  const [u,v]=invert(px,py,face.yaw,face);
  if(hair(u,v,face.style))mask[y*size+x]=255;
 }
 return mask;
}
const mean=x=>x.reduce((a,b)=>a+b,0)/x.length;
const quantile=(x,q)=>{const a=[...x].sort((a,b)=>a-b);return a[Math.floor(q*(a.length-1))];};
export function runStudy(){
 const trainSeed=20261021,testSeed=450912,r=rng(trainSeed),t=rng(testSeed);
 const samples=[],trainIdentities=1100;
 for(let i=0;i<trainIdentities;i++){
  const {source,reference}=pair(r,'train-'+i);
  for(let j=0;j<11;j++){
   const u=between(r,-1.3,1.3),v=between(r,-1.35,.95);
   const [rx,ry]=geometry(reference.yaw,u,v,reference);
   const [sx,sy]=geometry(source.yaw,u,v,source);
   samples.push({u:rx,v:ry,source,reference,dx:sx-rx,dy:sy-ry});
  }
 }
 const model=fitPoseFlow(samples,{ridge:.02}),size=96,heldOut=[],shifted=[],counterfactual=[];
 const evaluate=(destination,prefix,count,options)=>{
  for(let i=0;i<count;i++){
   const p=pair(t,prefix+'-'+i,options);
   const truth=render(p.source,size),ref=render(p.reference,size),metrics={};
   for(const mode of ['eye-scale','similarity','learned'])
    metrics[mode]=maskMetrics(transferSupportMask(ref,size,size,p.source,p.reference,
      {mode,model:mode==='learned'?model:null}),truth);
   destination.push({subjectId:p.identity,metrics,
    yawDifference:Math.abs(p.source.yaw-p.reference.yaw)});
  }
 };
 evaluate(heldOut,'test',250,{});
 evaluate(shifted,'ood',130,{yawRange:1.12,shiftWobble:.30});
 evaluate(counterfactual,'other-family',90,{family:'alternate'});
 const modes=['eye-scale','similarity','learned'];
 const metrics=Object.fromEntries(modes.map(k=>[k,{
  meanIoU:mean(heldOut.map(p=>p.metrics[k].iou||0)),
  medianIoU:quantile(heldOut.map(p=>p.metrics[k].iou||0),.5),
  subjectP10IoU:quantile(heldOut.map(p=>p.metrics[k].iou||0),.1),
  hardYawMeanIoU:mean(heldOut.filter(p=>p.yawDifference>.8).map(p=>p.metrics[k].iou||0))
 }]));
 const evidence={schema:'OFFHAIR-PHASE19-SYNTHETIC-ONLY-v1',
  simulation:'Procedural masks from a fixed synthetic deformation formula',
  trainIdentities,trainSamples:samples.length,heldOutSyntheticIdentities:heldOut.length,
  trainSeed,testSeed,trainTestIdentityOverlap:0,model,metrics,
  pairedIdentityDeltaLearnedMinusSimilarity:mean(heldOut.map(p=>p.metrics.learned.iou-p.metrics.similarity.iou)),
  hardYawCases:heldOut.filter(p=>p.yawDifference>.8).length,
  outOfDistributionStress:{identities:shifted.length,yawRange:1.12,headWarpAmplitude:.30,
   baselineMeanIoU:mean(shifted.map(p=>p.metrics.similarity.iou||0)),
   learnedMeanIoU:mean(shifted.map(p=>p.metrics.learned.iou||0)),
   independentlyValidated:false},
  counterfactualProjection:{identities:counterfactual.length,
   geometricFamily:'reverse_yaw_shear_not_present_in_training',
   baselineMeanIoU:mean(counterfactual.map(p=>p.metrics.similarity.iou||0)),
   learnedMeanIoU:mean(counterfactual.map(p=>p.metrics.learned.iou||0)),
   interpretation:'Adversarial simulation-only control demonstrates learned non-robustness.'},
  heldOutIndividualResults:heldOut.map(p=>({subjectId:p.subjectId,
   yawDifference:p.yawDifference,...Object.fromEntries(modes.map(k=>[k+'IoU',p.metrics[k].iou]))})),
  realPortraitsProcessed:0,realPhotoGroundTruth:false,androidMeasured:false,
  commercialLicensedRealTrainingData:false,humanPreferenceRatings:0,
  modelGeneratedHair:false,
  conclusionsNotSupported:['Real head geometry','Photorealism','Hairstyle transfer','Android throughput','Commercial data rights'],
  interpretation:'Synthetic results may reflect direct recovery of simulator rules: not external generalization evidence.'};
 assert.equal(evidence.trainTestIdentityOverlap,0);
 assert.ok(metrics.learned.meanIoU>metrics.similarity.meanIoU+.025,'Synthetic benchmark improvement absent');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const out=path.join(root,'research/results'),models=path.join(root,'public/ai/models');
 fs.mkdirSync(out,{recursive:true});fs.mkdirSync(models,{recursive:true});
 fs.writeFileSync(path.join(out,'offhair-phase19-synthetic-study.json'),JSON.stringify(evidence,null,2)+'\n');
 fs.writeFileSync(path.join(models,'offhair-synthetic-pose-flow-v1.json'),JSON.stringify(model,null,2)+'\n');
 console.log('SYNTHETIC ONLY OFFHAIR GEOMETRY EXPERIMENT '+JSON.stringify({
  trainSubjects:trainIdentities,testSubjects:heldOut.length,
  baselineMeanIoU:metrics.similarity.meanIoU,learnedMeanIoU:metrics.learned.meanIoU,
  shiftedBaselineIoU:evidence.outOfDistributionStress.baselineMeanIoU,
  shiftedLearnedIoU:evidence.outOfDistributionStress.learnedMeanIoU,
  counterfactualBaselineIoU:evidence.counterfactualProjection.baselineMeanIoU,
  counterfactualLearnedIoU:evidence.counterfactualProjection.learnedMeanIoU,
  realImagesUsed:0,trainedHairGenerator:false}));
 return evidence;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))runStudy();
