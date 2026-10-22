/* Independent research adapter: MediaPipe hair pixels -> strictly bounded MI-GAN removal mask.
   Masks are image confidence red channel; ANNOTATED mask==0 means inpaint; 255 means preserve.
   Never auto-remove on missing eye anchors or low-confidence segmentation. */
export function prepareHairRemoval(maskRGBA, width, height, face, opts={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||
   width*height>1024*1024||maskRGBA?.length!==width*height*4)
   throw new TypeError('Invalid hair mask');
 const {threshold=178,minFraction=.006,maxFraction=.30,margin=2,semanticVeto=null,faceZones=null}=opts;
 if(![threshold,minFraction,maxFraction,margin].every(Number.isFinite) ||
   threshold<1||threshold>255||minFraction<=0||maxFraction>=.8||maxFraction<=minFraction||
   !Number.isInteger(margin)||margin<0||margin>8)
   throw new TypeError('Invalid hair mask options');
 if(!face||![face.eyeX,face.eyeY,face.eyeDistance].every(Number.isFinite)||
   face.eyeX<=.13||face.eyeX>=.87||face.eyeY<=.16||face.eyeY>=.75||
   face.eyeDistance<.055||face.eyeDistance>.38){
  return {ok:false,reason:'Face landmarks unavailable or unreliable',hairPixels:0,areaFraction:0,protectedPixels:0};
 }
 const n=width*height,primary=new Uint8Array(n),keep=new Uint8Array(n);
 if(faceZones!==null &&
  (!(faceZones instanceof Uint8Array)||faceZones.length!==n||
   faceZones.some(z=>z>2)))
  return {ok:false,reason:'Face landmark protection unavailable or invalid',
   hairPixels:0,areaFraction:0,protectedPixels:0};
 // Research-only optional SECOND veto. Absent means the original baseline;
 // malformed or unreliable supplied semantic analysis never silently falls back.
 if(semanticVeto!==null &&
  (semanticVeto.ok!==true||!(semanticVeto.guard instanceof Uint8Array)||
   semanticVeto.guard.length!==n||semanticVeto.width!==width||
   semanticVeto.height!==height||semanticVeto.editingAllowed!==false||
   semanticVeto.independentGroundTruth!==false||
   semanticVeto.guard.some(v=>v!==0&&v!==1)))
  return {ok:false,reason:'Semantic skin protection unavailable or invalid',
   hairPixels:0,areaFraction:0,protectedPixels:0,semanticGuardApplied:false};
 keep.fill(255);
 const cx=face.eyeX*width,cy=(face.eyeY+face.eyeDistance*.72)*height;
 const rx=face.eyeDistance*width*1.56;
 const ry=face.eyeDistance*height*2.05;
 const isProtected=(x,y)=>{
  const a=(x-cx)/rx,b=(y-cy)/ry;
  return a*a+b*b<=1 || (faceZones!==null&&faceZones[y*width+x]===1);
 };
 let possible=0,protectedPixels=0,semanticConflicts=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;
  if(maskRGBA[i*4]<threshold)continue;
  possible++;
  if(isProtected(x,y)){protectedPixels++;continue;}
  if(semanticVeto?.guard[i]){semanticConflicts++;continue;}
  primary[i]=1;
 }
 if(possible/n<minFraction||possible/n>maxFraction)
  return {ok:false,reason:'Hair mask area outside safe limits',hairPixels:possible,areaFraction:possible/n,protectedPixels};
 const area=primary.reduce((a,b)=>a+b,0);
 if(area/n<minFraction/2)
  return {ok:false,reason:'Too little hair remains outside face protection',hairPixels:area,areaFraction:area/n,protectedPixels};
 // Slightly extend silhouette into immediate hair boundary, but never into protected face or image border.
 let removed=0;
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
  const i=y*width+x;
  if(isProtected(x,y)||semanticVeto?.guard[i])continue;
  let selected=primary[i]===1;
  if(!selected)for(let dy=-margin;dy<=margin&&!selected;dy++){
   for(let dx=-margin;dx<=margin;dx++){
    const xx=x+dx,yy=y+dy;
    if(xx<1||xx>=width-1||yy<1||yy>=height-1)continue;
    if(dx*dx+dy*dy<=margin*margin&&primary[yy*width+xx]){selected=true;break;}
   }
  }
  if(selected){keep[i]=0;removed++;}
 }
 if(removed/n>maxFraction*1.12)
  return {ok:false,reason:'Unsafe expanded hair area',hairPixels:removed,areaFraction:removed/n,protectedPixels};
 return {ok:true,reason:'research-only removal mask',keepMask:keep,
   hairPixels:removed,areaFraction:removed/n,protectedPixels,eyeX:face.eyeX,eyeY:face.eyeY,
   faceLandmarkGuardApplied:faceZones!==null,
   semanticGuardApplied:semanticVeto!==null,semanticConflicts,
   semanticFaceFraction:semanticVeto?.semanticFaceFraction??null};
}
export function composeInpaintedRGBA(source,output,keepMask,width,height){
 const n=width*height;
 if(source?.length!==n*4||output?.length!==n*3||keepMask?.length!==n)
  throw new TypeError('Inpainting tensors do not match');
 const dst=new Uint8ClampedArray(source),blendWidth=3;
 const selected=new Uint8Array(n);
 for(let i=0;i<n;i++)if(keepMask[i]===0)selected[i]=1;
 let changes=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;if(!selected[i])continue;
  let nearEdge=false;
  for(let dy=-blendWidth;dy<=blendWidth&&!nearEdge;dy++)
   for(let dx=-blendWidth;dx<=blendWidth;dx++){
    const xx=x+dx,yy=y+dy;
    if(xx<0||yy<0||xx>=width||yy>=height||!selected[yy*width+xx]){nearEdge=true;break;}
   }
  const alpha=nearEdge?.75:1;
  for(let c=0;c<3;c++){
   const value=output[c*n+i];
   if(!Number.isFinite(value))throw new TypeError('Model produced nonfinite pixel');
   const v=Math.max(0,Math.min(255,Math.round(value*alpha+source[i*4+c]*(1-alpha))));
   if(v!==source[i*4+c])changes++;
   dst[i*4+c]=v;
  }
 }
 return {rgba:dst,changedChannels:changes};
}
