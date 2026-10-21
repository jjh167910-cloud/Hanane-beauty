/**
 * Pure preparation for neural removal of ORIGINAL hair not hidden by target.
 * Mask red channel is a per-pixel confidence (0..255).
 * Face guard is scalar coverage (0..255). NO face or hair model => no run.
 */
export function buildNeuralEraseMask(original,projected,faceGuard,width,height){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<16||height<16||
    n>1024*1024||original?.length!==n*4||projected?.length!==n*4||faceGuard?.length!==n)
   throw new TypeError('Invalid neural erase mask shape');
 const wanted=new Uint8Array(n);
 let coverage=0;
 const maxY=Math.floor(height*.90);
 for(let y=1;y<maxY-1;y++)for(let x=1;x<width-1;x++){
  const i=y*width+x,k=i*4;
  if(original[k]>=190&&projected[k]<=85&&faceGuard[i]<20){
   wanted[i]=1;coverage++;
  }
 }
 if(coverage<100)return {eligible:false,reason:'insufficient-hair',coverage,mask:null};
 if(coverage>Math.floor(n*.38))return {eligible:false,reason:'oversized-removal',coverage,mask:null};
 const dilated=wanted.slice();
 for(let y=2;y<maxY-2;y++)for(let x=2;x<width-2;x++){
  const i=y*width+x;
  if(wanted[i]||faceGuard[i]>=20||projected[i*4]>135)continue;
  if(wanted[i-1]||wanted[i+1]||wanted[i-width]||wanted[i+width])dilated[i]=1;
 }
 // The MI-GAN ONNX pipeline uses 0 = erase, 255 = preserve.
 const knownMask=new Uint8Array(n);knownMask.fill(255);
 for(let i=0;i<n;i++)if(dilated[i])knownMask[i]=0;
 return {eligible:true,coverage,mask:knownMask};
}

export function imageDataToCHW(data,width,height){
 const n=width*height;
 if(!data||data.length!==n*4||n<1||n>1024*1024)
  throw new TypeError('Invalid RGBA image pixels');
 const chw=new Uint8Array(n*3);
 for(let i=0;i<n;i++){
  chw[i]=data[i*4];chw[n+i]=data[i*4+1];chw[n*2+i]=data[i*4+2];
 }
 return chw;
}

/** Convert CHW result to a transparent patch, changing only approved holes. */
export function neuralOutputToRGBA(chw,knownMask,width,height){
 const n=width*height;
 if(chw?.length!==n*3||knownMask?.length!==n)throw new TypeError('Invalid neural output');
 const rgba=new Uint8ClampedArray(n*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;
  if(knownMask[i])continue;
  // Slight feathering protects a hard seam from 512px GAN output.
  let boundary=false;
  if(x===0||x===width-1||y===0||y===height-1)boundary=true;
  else boundary=!!(knownMask[i-1]||knownMask[i+1]||knownMask[i-width]||knownMask[i+width]);
  rgba[i*4]=chw[i];rgba[i*4+1]=chw[n+i];rgba[i*4+2]=chw[2*n+i];
  rgba[i*4+3]=boundary?165:255;
 }
 return rgba;
}
