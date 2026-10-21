// Pure mask conversion; kept separate so it can be regression-tested in Node.
export function buildConfidenceMask(confidences,width,height){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
     width*height>3000000||confidences?.length!==width*height){
    throw new TypeError('Invalid segmentation dimensions or confidence map');
  }
  const pixels=new Uint8ClampedArray(width*height*4);
  let positivePixels=0;
  for(let i=0;i<confidences.length;i++){
    const confidence=Number.isFinite(confidences[i])?confidences[i]:0;
    if(confidence>=0.5)positivePixels++;
    // Soft edges: premultiplied alpha is prepared downstream by the compositor.
    const alpha=Math.round(Math.min(1,Math.max(0,(confidence-0.27)/0.57))*255);
    const offset=i*4;
    pixels[offset]=alpha;pixels[offset+1]=alpha;
    pixels[offset+2]=alpha;pixels[offset+3]=255;
  }
  return {pixels,positivePixels};
}

export function faceAnchor(detections){
 if(!Array.isArray(detections)||!detections.length)return null;
 const best=[...detections].sort((a,b)=>(b.categories?.[0]?.score||0)-(a.categories?.[0]?.score||0))[0];
 const points=best.keypoints;
 if(!Array.isArray(points)||points.length<2)return null;
 const [a,b]=points;
 if(![a.x,b.x,a.y,b.y].every(Number.isFinite))return null;
 const eyeDistance=Math.abs(a.x-b.x);
 if(eyeDistance<.045||eyeDistance>.5)return null;
 const eyeX=(a.x+b.x)/2,eyeY=(a.y+b.y)/2;
 if(eyeX<0||eyeX>1||eyeY<0||eyeY>1)return null;
 // Preserve legacy horizontal eyeDistance for current try-on positioning.
 // Additional geometry is research-only; nonrigid yaw is NOT recovered by roll.
 const dx=b.x-a.x,dy=b.y-a.y;
 return {eyeX,eyeY,eyeDistance,eyeSpan:Math.hypot(dx,dy),
   eyeRollRadians:Math.atan2(dy,dx)};
}
