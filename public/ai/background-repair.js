/* Hananeh Beauty: conservative, local background repair for TINY, isolated hair wisps.
   Not an old-hair removal/generative model. It refuses large or uncertain areas.
   Masks: source-hair confidence RED, transferred hair ALPHA. */
(function(root){
'use strict';
function repair(source,sourceMask,donor,width,height,face,options={}){
  const n=width*height;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||n>600000||
     source?.length!==n*4||sourceMask?.length!==n*4||donor?.length!==n*4)
    throw new TypeError('Invalid image/mask dimensions');
  const result=new Uint8ClampedArray(n*4);
  const stats={status:'no-repair',repairedPixels:0,rejectedComponents:0,acceptedComponents:0,reason:'',totalResidual:0};
  if(!face||![face.eyeX,face.eyeY,face.eyeDistance].every(Number.isFinite)||face.eyeDistance<.045||face.eyeDistance>.5){stats.reason='unreliable-face-location';return {overlay:result,stats};}
  const threshold=options.sourceThreshold??165,donorThreshold=options.donorThreshold??48;
  const maxArea=options.maxComponentArea??Math.round(n*.008),maxThickness=options.maxThickness??Math.max(5,Math.round(width*.045));
  const maxRepairFraction=options.maxRepairFraction??.1;
  if(![threshold,donorThreshold,maxArea,maxThickness,maxRepairFraction].every(Number.isFinite)||
     threshold<0||threshold>255||donorThreshold<0||donorThreshold>255||maxArea<=0||maxThickness<=0||maxRepairFraction<=0||maxRepairFraction>1)
    throw new TypeError('Invalid repair options');
  // Broad, deliberately conservative facial exclusion extending past eyes, ears and jaw.
  const cx=face.eyeX*width,cy=face.eyeY*height,d=face.eyeDistance*width;
  const protectX=d*2.15,protectY=d*3.45;
  function protectedPixel(x,y){
    const dx=(x-cx)/protectX,dy=(y-(cy+d*.9))/protectY;
    return dx*dx+dy*dy<1;
  }
  const pixels=new Uint8Array(n);let originalPixels=0;
  for(let i=0;i<n;i++){
    const k=i*4,x=i%width,y=(i-x)/width;
    if(sourceMask[k]>=threshold)originalPixels++;
    if(sourceMask[k]>=threshold&&donor[k+3]<donorThreshold&&!protectedPixel(x,y)){
      pixels[i]=1;stats.totalResidual++;
    }
  }
  if(originalPixels<150){stats.reason='insufficient-hair-mask';return {overlay:result,stats};}
  if(stats.totalResidual/originalPixels>maxRepairFraction){stats.reason='substantial-residual-hair';return {overlay:result,stats};}
  const queue=new Int32Array(n),ringRadius=10;
  for(let i=0;i<n;i++){
    if(pixels[i]!==1)continue;
    let head=0,tail=1,minX=width,minY=height,maxX=-1,maxY=-1;
    queue[0]=i;pixels[i]=2;
    while(head<tail){
      const p=queue[head++],x=p%width,y=(p-x)/width;
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
      const a=[x>0?p-1:-1,x+1<width?p+1:-1,y>0?p-width:-1,y+1<height?p+width:-1];
      for(let j=0;j<4;j++){const z=a[j];if(z>=0&&pixels[z]===1){pixels[z]=2;queue[tail++]=z;}}
    }
    const w=maxX-minX+1,h=maxY-minY+1;
    if(tail>maxArea||Math.min(w,h)>maxThickness||minX<1||maxX>=width-1||minY<1||maxY>=height-1){stats.rejectedComponents++;continue;}
    let count=0,mean=[0,0,0],sq=[0,0,0];
    for(let y=Math.max(0,minY-ringRadius);y<=Math.min(height-1,maxY+ringRadius);y++){
      for(let x=Math.max(0,minX-ringRadius);x<=Math.min(width-1,maxX+ringRadius);x++){
        if(x>=minX&&x<=maxX&&y>=minY&&y<=maxY)continue;
        if(protectedPixel(x,y))continue;
        const k=4*(y*width+x);
        if(sourceMask[k]>55||donor[k+3]>=donorThreshold||source[k+3]<240)continue;
        for(let c=0;c<3;c++){const v=source[k+c];mean[c]+=v;sq[c]+=v*v;}
        count++;
      }
    }
    if(count<Math.max(24,Math.round(tail*.25))){stats.rejectedComponents++;continue;}
    for(let c=0;c<3;c++)mean[c]/=count;
    const rms=Math.sqrt([0,1,2].reduce((a,c)=>a+Math.max(0,sq[c]/count-mean[c]*mean[c]),0)/3);
    if(rms>14){stats.rejectedComponents++;continue;}
    // Keep exact pixels outside the candidate region unchanged (alpha=0).
    for(let j=0;j<tail;j++){
      const p=queue[j],k=p*4;
      for(let c=0;c<3;c++)result[k+c]=Math.round(mean[c]);
      result[k+3]=Math.min(255,Math.max(0,(sourceMask[k]-110)*2));
    }
    stats.acceptedComponents++;stats.repairedPixels+=tail;
  }
  stats.status=stats.repairedPixels?'partial-repair':'no-repair';
  stats.reason=stats.repairedPixels?'flat-background-wisps-only':'unsafe-or-uniformity-failed';
  return {overlay:result,stats};
}
root.HananehBackgroundRepair={repair};
})(typeof window!=='undefined'?window:globalThis);
