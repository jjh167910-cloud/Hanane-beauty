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
 // Avoid a cropped-off inpainting mask: the GAN cannot reconstruct content
 // outside its input crop, and would create a conspicuous straight seam.
 const pad=Math.max(2,Math.round(Math.min(width,height)*.025));
 let edgeCount=0;
 for(let y=0;y<maxY;y++)for(let x=0;x<width;x++){
  const i=y*width+x;
  if(wanted[i]&&(x<pad||x>=width-pad||y<pad||y>=maxY-pad))edgeCount++;
 }
 if(edgeCount>Math.max(12,Math.floor(coverage*.01)))
   return {eligible:false,reason:'crop-boundary',coverage,mask:null};
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

/**
 * Composite the neural reconstruction with a short distance-to-boundary
 * feather. Unlike an abrupt one-pixel blend, this avoids visible rectangular
 * seams across salon lighting gradients and naturally soft hair silhouettes.
 * The known/input area is always fully transparent; face-protected regions
 * remain untouched. This is blending, not synthetic hairstyle generation.
 */
export function neuralOutputToRGBA(chw,knownMask,width,height){
 const n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
    n>1024*1024||chw?.length!==n*3||knownMask?.length!==n)
   throw new TypeError('Invalid neural output');
 const rgba=new Uint8ClampedArray(n*4);
 // Compact Manhattan-distance ramp; at most 6 pixels within erased regions.
 // Uint8Array keeps mobile memory bounded (262 KiB for a 512px model).
 const distance=new Uint8Array(n),maxFeather=6;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;
  if(knownMask[i])continue;
  let d=maxFeather;
  if(x===0||y===0||x===width-1||y===height-1)d=1;
  if(x&&distance[i-1]&&distance[i-1]+1<d)d=distance[i-1]+1;
  if(y&&distance[i-width]&&distance[i-width]+1<d)d=distance[i-width]+1;
  if(x&&knownMask[i-1])d=1;
  if(y&&knownMask[i-width])d=1;
  distance[i]=d;
 }
 for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
  const i=y*width+x;
  if(knownMask[i])continue;
  let d=distance[i];
  if(x+1<width){d=Math.min(d,knownMask[i+1]?1:distance[i+1]+1)}
  if(y+1<height){d=Math.min(d,knownMask[i+width]?1:distance[i+width]+1)}
  distance[i]=Math.min(maxFeather,d);
 }
 for(let i=0;i<n;i++){
  if(knownMask[i])continue;
  const k=i*4;
  rgba[k]=chw[i];rgba[k+1]=chw[n+i];rgba[k+2]=chw[n*2+i];
  rgba[k+3]=Math.round(255*Math.min(1,(distance[i]-.25)/(maxFeather-.25)));
 }
 return rgba;
}
