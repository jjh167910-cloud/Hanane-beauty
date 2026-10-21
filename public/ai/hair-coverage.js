/* Hananeh Beauty: conservative read-only mask coverage analysis.
   Source hair is red channel of image mask; donor hair is alpha channel.
   Does not remove/generate hair or prove photographic realism. */
(function(root){
 'use strict';
 function evaluate(original,donor,width,height,options={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>300000 ||
   original?.length!==width*height*4||donor?.length!==width*height*4){
    throw new TypeError('Invalid source and donor coverage mask dimensions');
  }
  const hairThreshold=options.hairThreshold??115;
  const donorThreshold=options.donorThreshold??48;
  const minHair=options.minHair??180;
  if(![hairThreshold,donorThreshold,minHair].every(Number.isFinite)||hairThreshold<0||hairThreshold>255||donorThreshold<0||donorThreshold>255||minHair<1){
   throw new TypeError('Invalid coverage thresholds');
  }
  const n=width*height, exposed=new Uint8Array(n);
  let originalPixels=0, uncoveredPixels=0;
  for(let i=0;i<n;i++){
   if(original[i*4]>=hairThreshold){
    originalPixels++;
    if(donor[i*4+3]<donorThreshold){exposed[i]=1;uncoveredPixels++;}
   }
  }
  if(originalPixels<minHair)return {status:'inconclusive',originalPixels,uncoveredPixels,uncoveredFraction:null,largestExposedRegion:0};
  const queue=new Int32Array(n);let largest=0;
  for(let i=0;i<n;i++){
   if(exposed[i]!==1)continue;
   let head=0,tail=1;queue[0]=i;exposed[i]=2;
   while(head<tail){
    const current=queue[head++],x=current%width,y=(current-x)/width;
    const neighbors=[x>0?current-1:-1,x+1<width?current+1:-1,y>0?current-width:-1,y+1<height?current+width:-1];
    for(let j=0;j<4;j++){const z=neighbors[j];if(z>=0&&exposed[z]===1){exposed[z]=2;queue[tail++]=z;}}
   }
   if(tail>largest)largest=tail;
  }
  const fraction=uncoveredPixels/originalPixels;
  const significantBlock=largest>=Math.max(90,Math.ceil(originalPixels*0.07));
  const significantWarn=largest>=Math.max(45,Math.ceil(originalPixels*0.03));
  const status=fraction>=0.24&&significantBlock?'blocked':fraction>=0.12&&significantWarn?'warning':'clear';
  return {status,originalPixels,uncoveredPixels,uncoveredFraction:fraction,largestExposedRegion:largest};
 }
 root.HananehCoverage={evaluate};
})(typeof window!=='undefined'?window:globalThis);
