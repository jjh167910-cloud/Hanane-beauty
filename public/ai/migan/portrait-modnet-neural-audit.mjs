/*
 * Phase 38 MODNet portrait-alpha analysis. Real pretrained inference, entirely
 * in browser. NOT hair-only alpha and NEVER a replacement for semantic hair /
 * protected facial veto or proof of hairstyle quality.
 */
const bytes=x=>x instanceof Uint8Array||x instanceof Uint8ClampedArray;
const reject=reason=>({ok:false,reason,portraitNeuralInferenceVerified:false,
 hairAlphaGroundTruth:false,realisticHairstyleVerified:false,
 exportAllowed:false,commercialReleaseApproved:false});
export const SHAPE=[1,3,512,512];
export function preparePortraitMatteInput(rgba,width=512,height=512){
 if(width!==512||height!==512||!bytes(rgba)||rgba.length!==4*width*height)
  throw new TypeError('MODNet RGB input must be 512x512 opaque RGBA');
 const n=width*height,input=new Float32Array(n*3);
 for(let i=0;i<n;i++){
  if(rgba[i*4+3]!==255)throw Error('No transparent pixels accepted by portrait matting');
  for(let c=0;c<3;c++)input[c*n+i]=(rgba[i*4+c]/255-.5)/.5;
 }
 return input;
}
export function comparePortraitMatteToHair({
 portraitAlpha,sourceHairRGBA,sourceFace,
 width=512,height=512
}){
 const n=width*height;
 if(width!==512||height!==512||!portraitAlpha||
    !(portraitAlpha instanceof Float32Array)||
    portraitAlpha.length!==n||!bytes(sourceHairRGBA)||
    sourceHairRGBA.length!==4*n)
  return reject('Invalid actual portrait alpha or source hair segmentation buffers');
 const f=sourceFace;
 if(!f||![f.eyeX,f.eyeY,f.eyeDistance].every(Number.isFinite)||
    f.eyeX<.2||f.eyeX>.8||f.eyeY<.2||f.eyeY>.72||
    f.eyeDistance<.06||f.eyeDistance>.38)
  return reject('No reliable detected source forehead');
 let interiorHair=0,interiorForeground=0;
 let uncertainHair=0,totalForeground=0,transitionPixels=0,badAlpha=0;
 let sumAll=0;
 // Highlight only numerical diagnostic quantities, not scalp edits.
 const diagnostic=new Uint8ClampedArray(n*4);
 for(let i=0;i<n;i++){
  const a=portraitAlpha[i],m=sourceHairRGBA[i*4]/255;
  if(!Number.isFinite(a)||a<-.001||a>1.001){badAlpha++;continue;}
  const bounded=Math.min(1,Math.max(0,a));
  const k=i*4;
  diagnostic[k]=Math.round(255*bounded);
  diagnostic[k+1]=Math.round(255*bounded);
  diagnostic[k+2]=Math.round(255*bounded);
  diagnostic[k+3]=255;
  sumAll+=bounded;
  if(bounded>.5)totalForeground++;
  if(bounded>.1&&bounded<.9)transitionPixels++;
  if(m>=.75){interiorHair++;if(bounded>=.5)interiorForeground++;
    if(bounded<.6)uncertainHair++;}
 }
 if(badAlpha||!interiorHair)return reject('Neural portrait output invalid or absent hair support');
 return {ok:true,method:'real-local-MODNet-portrait-alpha-onnx',
  modelIsHairSpecific:false,alphaIsGroundTruth:false,
  diagnosticRGBA:diagnostic,width,height,
  portraitNeuralInferenceVerified:true,hairAlphaGroundTruth:false,
  realisticHairstyleVerified:false,exportAllowed:false,
  commercialReleaseApproved:false,
  metrics:{sourceHairPixels:interiorHair,
   hairPixelsAbovePortraitHalfAlpha:interiorForeground,
   uncertainPredictedHairPixels:uncertainHair,
   personForegroundPixels:totalForeground,
   portraitAlphaTransitionPixels:transitionPixels,
   meanPortraitAlpha:sumAll/n,
   hairInsidePredictedPersonFraction:interiorForeground/interiorHair},
  warning:'A matte for the WHOLE PERSON cannot replace hair-specific transparency or generate a different hairstyle. The metrics are model agreement, not verified ground truth.'
 };
}
export async function runPortraitMatteOnDevice({
 ort,modelBytes,sourceRGBA,sourceHairRGBA,sourceFace
}){
 if(!ort?.Tensor||!ort?.InferenceSession?.create)
  throw Error('Pinned local ONNX Runtime missing');
 if(!bytes(modelBytes)||modelBytes.length!==12984781)
  throw Error('Pinned portrait model bytes missing or incorrect length');
 const input=preparePortraitMatteInput(sourceRGBA);
 const t=performance.now();
 const session=await ort.InferenceSession.create(modelBytes,{
  executionProviders:['wasm']});
 try{
  const result=await session.run({input:new ort.Tensor('float32',input,SHAPE)});
  const out=result?.output;
  if(out?.type!=='float32'||out.dims?.join(',')!=='1,1,512,512'||
     !(out.data instanceof Float32Array))
   throw Error('Unexpected local neural portrait alpha output tensor');
  const audit=comparePortraitMatteToHair({
   portraitAlpha:out.data,sourceHairRGBA,sourceFace});
  if(!audit.ok)throw Error(audit.reason);
  return {...audit,elapsedMs:performance.now()-t,
   executedWithBrowserONNXRuntime:true,originalPortraitModified:false};
 }finally{await session.release?.();}
}
