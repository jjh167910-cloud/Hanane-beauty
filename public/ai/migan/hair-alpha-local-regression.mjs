/*
 * Phase 43 — conservative ONE-PASS hair-alpha local RGB regression.
 *
 * Uses ONLY accepted Phase40 unknown-band pixels as immutable regression
 * anchors. Never propagates from newly estimated pixels (no flood-fill),
 * never changes definite foreground/background or protected skin, and
 * never upgrades a rejected RGB outlier to "known background."
 *
 * Model: locally C(channel)=intercept(channel)+slope(channel)*alpha.
 * Weighted-least-squares inversion is admitted only when alpha anchors
 * have meaningful spread, spectral evidence is strong, accepted-anchor
 * residuals are low, and the candidate is consistent with its local
 * spectrum and alpha range. NOT a neural or certified hair-alpha model.
 */
const bytes=a=>a instanceof Uint8Array||a instanceof Uint8ClampedArray;
const fail=reason=>({ok:false,reason,exportAllowed:false,photorealismVerified:false,
 independentlyValidatedHairAlpha:false,commercialReleaseAllowed:false});
const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
export function refineGuardedHairAlphaLocalRGB({
 sourceRGBA,baseline,trimap,semanticVeto,faceZones,width,height,
 radius=7,minAnchorPixels=8,minAnchorAlphaSpan=.20,
 maxFitResidual=16,maxCandidateResidual=17
}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<64||
    height<64||n>1024*1024||
    !Number.isInteger(radius)||radius<3||radius>10||
    !Number.isInteger(minAnchorPixels)||minAnchorPixels<4||minAnchorPixels>24||
    !Number.isFinite(minAnchorAlphaSpan)||minAnchorAlphaSpan<.12||
    minAnchorAlphaSpan>.5||
    !Number.isFinite(maxFitResidual)||maxFitResidual<3||maxFitResidual>25||
    !Number.isFinite(maxCandidateResidual)||maxCandidateResidual<3||
    maxCandidateResidual>25)
  throw new TypeError('Invalid local RGB hair-alpha regression configuration');
 if(!bytes(sourceRGBA)||sourceRGBA.length!==n*4||
  !baseline?.ok||baseline.exportAllowed!==false||
  baseline.alphaGroundTruth!==false||
  baseline.neuralHairMattingExecuted!==false||
  baseline.width!==width||baseline.height!==height||
  !(baseline.alpha instanceof Float32Array)||baseline.alpha.length!==n||
  !(baseline.valid instanceof Uint8Array)||baseline.valid.length!==n||
  !trimap?.ok||trimap.exportAllowed!==false||
  trimap.width!==width||trimap.height!==height||
  !(trimap.trimap instanceof Uint8Array)||trimap.trimap.length!==n||
  semanticVeto?.ok!==true||semanticVeto.editingAllowed!==false||
  semanticVeto.independentGroundTruth!==false||
  semanticVeto.width!==width||semanticVeto.height!==height||
  !(semanticVeto.guard instanceof Uint8Array)||semanticVeto.guard.length!==n||
  !(faceZones instanceof Uint8Array)||faceZones.length!==n)
  return fail('Missing verified protected baseline, source, trimap or face veto');
 const t=trimap.trimap,accepted=baseline.valid,prior=baseline.alpha;
 let unknown=0,originalAccepted=0;
 for(let i=0;i<n;i++){
  const k=i*4,a=prior[i],v=accepted[i],type=t[i],blocked=
   semanticVeto.guard[i]||faceZones[i];
  if(sourceRGBA[k+3]!==255||semanticVeto.guard[i]>1||faceZones[i]>2||
   (v!==0&&v!==1)||![0,128,255].includes(type)||
   !Number.isFinite(a)||a<0||a>1)
   return fail('Invalid source pixel or unphysical alpha/trimap state');
  if(blocked&&type!==0)return fail('Uncertain hair alpha enters protected face');
  if(type!==128&&(v!==1||a!==(type===255?1:0)))
   return fail('Known foreground/background constraints changed');
  if(type===128){unknown++;if(v)originalAccepted++;}
 }
 if(unknown<1)return fail('Missing unknown hair edge');
 const outputAlpha=new Float32Array(prior),outputValid=new Uint8Array(accepted);
 const im=new Uint8ClampedArray(4*n);
 let newlyEstimated=0,fractionalNew=0,tooFew=0,flatAlpha=0,
  lowColorSignal=0,badFit=0,badCandidate=0;
 const results=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,k=4*i;
  if(t[i]!==128||accepted[i])continue;
  let count=0,sw=0,sa=0,saa=0,mi=1,ma=0;
  const neighbor=[];
  for(let dy=-radius;dy<=radius;dy++){
   const yy=y+dy;if(yy<0||yy>=height)continue;
   for(let dx=-radius;dx<=radius;dx++){
    const xx=x+dx;if(xx<0||xx>=width)continue;
    const j=yy*width+xx;
    // Use ONLY originally accepted UNKNOWN pixels, not fixed hard cores,
    // to avoid inferring hair alpha solely from binary trimap geometry.
    if(t[j]!==128||accepted[j]!==1)continue;
    const a=prior[j],d=dx*dx+dy*dy,w=1/(1+d/16);
    neighbor.push([j,w,a]);count++;sw+=w;sa+=w*a;saa+=w*a*a;
    mi=Math.min(mi,a);ma=Math.max(ma,a);
   }
  }
  if(count<minAnchorPixels){tooFew++;continue;}
  const meanA=sa/sw,variance=saa/sw-meanA*meanA;
  if(ma-mi<minAnchorAlphaSpan||variance<.008){flatAlpha++;continue;}
  const means=[0,0,0],cov=[0,0,0],slopes=[0,0,0],offsets=[0,0,0];
  for(const [j,w,a] of neighbor)
   for(let c=0;c<3;c++){
    means[c]+=w*sourceRGBA[j*4+c];
    cov[c]+=w*a*sourceRGBA[j*4+c];
   }
  let slopeSq=0;
  for(let c=0;c<3;c++){
   const meanC=means[c]/sw;
   const slope=(cov[c]/sw-meanA*meanC)/variance;
   slopes[c]=slope;offsets[c]=meanC-slope*meanA;
   slopeSq+=slope*slope;
  }
  if(Math.sqrt(slopeSq/3)<18){lowColorSignal++;continue;}
  let fitSq=0;
  for(const [j,w,a] of neighbor){
   let sq=0;
   for(let c=0;c<3;c++){
    const dif=sourceRGBA[j*4+c]-(offsets[c]+slopes[c]*a);
    sq+=dif*dif;
   }
   fitSq+=w*sq/3;
  }
  if(Math.sqrt(fitSq/sw)>maxFitResidual){badFit++;continue;}
  let dot=0;
  for(let c=0;c<3;c++)dot+=slopes[c]*(sourceRGBA[k+c]-offsets[c]);
  const raw=dot/slopeSq;
  if(raw<mi-.045||raw>ma+.045||raw<-.02||raw>1.02){
   badCandidate++;continue;
  }
  const a=cap(raw,0,1);
  let sq=0;
  for(let c=0;c<3;c++){
   const dif=sourceRGBA[k+c]-(offsets[c]+slopes[c]*a);
   sq+=dif*dif;
  }
  if(Math.sqrt(sq/3)>maxCandidateResidual){badCandidate++;continue;}
  outputValid[i]=1;outputAlpha[i]=a;newlyEstimated++;
  if(a>.015&&a<.985)fractionalNew++;
 }
 for(let i=0;i<n;i++){
  const k=i*4;
  if(t[i]===128&&!outputValid[i])im.set([210,50,113,255],k);
  else if(t[i]===128&&!accepted[i]){
   // Teal = NEW estimate from local anchor regression.
   im.set([46,183,174,255],k);
  }else{
   const v=Math.round(outputAlpha[i]*255);
   im.set([v,v,v,255],k);
  }
 }
 return {
  ok:true,width,height,alpha:outputAlpha,valid:outputValid,
  diagnosticRGBA:im,previewOnly:true,exportAllowed:false,
  method:'single-pass-accepted-pixel-local-RGB-conditional-regression',
  alphaGroundTruth:false,neuralHairMattingExecuted:false,
  independentlyValidatedHairAlpha:false,photorealismVerified:false,
  commercialReleaseAllowed:false,realHumanHairAlphaQualityVerified:false,
  metrics:{unknownPixels:unknown,originalAcceptedPixels:originalAccepted,
   newlyEstimatedPixels:newlyEstimated,
   newlyFractionalPixels:fractionalNew,
   totalAcceptedPixels:originalAccepted+newlyEstimated,
   abstainedPixels:unknown-originalAccepted-newlyEstimated,
   originalCoverage:originalAccepted/unknown,
   newCoverage:(originalAccepted+newlyEstimated)/unknown,
   additionalCoverage:newlyEstimated/unknown,
   missingLocalEvidence:tooFew,insufficientAlphaVariation:flatAlpha,
   insufficientColorSeparation:lowColorSignal,
   rejectedLocalFit:badFit,rejectedCandidate:badCandidate,
   baselinePixelsModified:0,protectedFaceEdits:0,
   modelWeightsUsed:0},
  warning:'Newly estimated color-consistent pixels (teal) are hypotheses only, not ground-truth hair wisps. Strictly one pass; unresolved remain magenta. Evaluate selective error vs coverage using independent labels before commercial use.'
 };
}
