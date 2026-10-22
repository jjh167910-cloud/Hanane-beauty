/*
 * Phase 37: bounded reference foreground-color decontamination experiment.
 * A hair SEGMENTATION confidence is NOT an independently measured alpha
 * matte. The inverse-compositing equation is ill posed without true alpha.
 * Here it is only a small local RGB hypothesis at already existing hair
 * borders, never new geometry or an approved photorealistic hairstyle.
 */
const bytes = x=>x instanceof Uint8Array||x instanceof Uint8ClampedArray;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=t=>t*t*(3-2*t);
const reject=reason=>({ok:false,reason,exportAllowed:false,
 trueAlphaMeasured:false,photorealismVerified:false,commercialUseApproved:false});
export function estimateBoundedReferenceForeground({
 referenceRGBA,referenceHairRGBA,width,height,radius=5,
 maxChannelChange=18,minHairBackgroundContrast=24
}){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<64||
  height<64||n>1024*1024||!Number.isInteger(radius)||
  radius<2||radius>7||!Number.isInteger(maxChannelChange)||
  maxChannelChange<2||maxChannelChange>24||
  !Number.isFinite(minHairBackgroundContrast)||
  minHairBackgroundContrast<12||minHairBackgroundContrast>90)
  throw new TypeError('Invalid reference color-estimation settings');
 if(!bytes(referenceRGBA)||!bytes(referenceHairRGBA)||
  referenceRGBA.length!==n*4||referenceHairRGBA.length!==n*4)
  return reject('Reference color and segmented confidence must cover the same image');
 const original=referenceRGBA,confidence=referenceHairRGBA;
 let protectedOpacity=0,highHair=0,hardBg=0;
 for(let i=0;i<n;i++){
  if(original[4*i+3]!==255)return reject('Reference must be opaque and already locally normalized');
  const m=confidence[4*i];
  if(m>=240)highHair++;
  if(m<=40)hardBg++;
 }
 if(highHair/n<.002||hardBg/n<.01)
  return reject('Insufficient separately predicted foreground and background');
 const result=new Uint8ClampedArray(original);
 let candidatePixels=0,pixelsChanged=0,channelsChanged=0;
 let insufficientSamples=0,lowContrast=0,ambiguousAlpha=0,clippedChannels=0;
 let sumAbsCorrection=0,maxObserved=0;
 for(let y=radius;y<height-radius;y++){
  for(let x=radius;x<width-radius;x++){
   const i=y*width+x,k=4*i,m=confidence[k];
   if(m<=165||m>=219)continue; // narrow high-confidence edge band
   candidatePixels++;
   let fg=-1,bg=-1,fgDist=Infinity,bgDist=Infinity;
   for(let dy=-radius;dy<=radius;dy++){
    for(let dx=-radius;dx<=radius;dx++){
     if(dx===0&&dy===0)continue;
     const j=(y+dy)*width+x+dx,score=dx*dx+dy*dy,t=confidence[4*j];
     if(t>=240&&score<fgDist){fg=j;fgDist=score;}
     if(t<=40&&score<bgDist){bg=j;bgDist=score;}
    }
   }
   if(fg<0||bg<0){insufficientSamples++;continue;}
   let meanContrast=0;
   for(let c=0;c<3;c++)
    meanContrast+=Math.abs(original[4*fg+c]-original[4*bg+c])/3;
   if(meanContrast<minHairBackgroundContrast){lowContrast++;continue;}
   // The segmentation score only gives a conservative approximate
   // coverage hypothesis. Low alpha is too unstable to invert.
   const a=smooth(clamp((m-95)/125,0,1));
   if(a<.55||a>.95){ambiguousAlpha++;continue;}
   let modified=false;
   for(let c=0;c<3;c++){
    const observed=original[k+c],background=original[4*bg+c];
    const donorNeighbor=original[4*fg+c];
    const inverse=(observed-(1-a)*background)/a;
    // Opposite-valued pixels are likely background spill, but the
    // nearest opaque hair anchor limits large color extrapolations.
    const target=.75*inverse+.25*donorNeighbor;
    const wanted=Math.round(target-observed);
    if(Math.abs(wanted)<2)continue;
    const bounded=clamp(wanted,-maxChannelChange,maxChannelChange);
    const next=clamp(observed+bounded,0,255);
    if(next===observed)continue;
    if(bounded!==wanted)clippedChannels++;
    result[k+c]=next;modified=true;channelsChanged++;
    const delta=Math.abs(next-observed);
    sumAbsCorrection+=delta;maxObserved=Math.max(maxObserved,delta);
   }
   if(modified)pixelsChanged++;
  }
 }
 return {
  ok:true,rgba:result,width,height,
  method:'local-segmentation-guided-foreground-color-hypothesis',
  exportAllowed:false,previewOnly:true,
  trueAlphaMeasured:false,referenceHairstyleGenerated:false,
  photorealismVerified:false,commercialUseApproved:false,
  metrics:{candidatePixels,pixelsChanged,channelsChanged,
   insufficientSamples,lowContrast,ambiguousAlpha,clippedChannels,
   meanAbsoluteCorrection:channelsChanged?sumAbsCorrection/channelsChanged:0,
   maxObservedChannelChange:maxObserved,
   allChangedPixelsInsideOriginalTransition:true,
   newHairPixels:0},
  warning:'Only predicted hair confidence was available, not true alpha. Foreground inversion is ambiguous and may make halos worse; compare with independent human ratings.'
 };
}
