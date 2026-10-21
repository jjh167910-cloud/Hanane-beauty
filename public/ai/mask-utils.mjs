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
