/*
 * Phase 35 — locked geometric crop for REAL visual A/B evaluation.
 * The same ROI is applied to source, baseline and edge-refined images;
 * we never pick a flattering region separately for each method.
 * Coordinates and canvas pixel buffers stay only in the local page.
 */
const err=(reason)=>({
 ok:false,reason,independentFaceVerification:false,
 qualityVerified:false,exportAllowed:false,commercialReleaseAllowed:false
});
const valid=x=>typeof x==='number'&&Number.isFinite(x);
export function deriveMatchedHairlineReviewCrop({
 sourceFace,width,height,zoom=3
}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<128||height<128||width*height>1024*1024||
  !valid(zoom)||zoom<2||zoom>5)
  throw new TypeError('Invalid local hairline crop frame');
 const f=sourceFace;
 if(!f||![f.eyeX,f.eyeY,f.eyeDistance].every(valid)||
  f.eyeX<.24||f.eyeX>.76||f.eyeY<.27||f.eyeY>.67||
  f.eyeDistance<.08||f.eyeDistance>.34)
  return err('Missing reliable eye separation and frontal forehead geometry');
 // ROI deliberately includes eyebrows/upper facial context AND hairline.
 // It is not derived from a specific candidate's edge artefacts, to
 // avoid choosing a biasing crop for one of the A/B methods.
 const xc=f.eyeX*width,yc=f.eyeY*height,e=f.eyeDistance*width;
 const roiW=Math.round(Math.min(width*.65,Math.max(88,2.58*e)));
 const roiH=Math.round(Math.min(height*.51,Math.max(72,1.79*e)));
 const roiX=Math.round(xc-roiW/2);
 const roiY=Math.round(yc-1.45*e);
 if(roiX<0||roiY<0||roiX+roiW>width||roiY+roiH>height)
  return err('Hairline crop would extrapolate outside photograph');
 if(roiW<48||roiH<48)return err('Hairline crop lacks adequate pixels');
 const scaleX=Math.max(1,Math.round(roiW*zoom)),scaleY=Math.max(1,Math.round(roiH*zoom));
 if(scaleX>2048||scaleY>2048)return err('Excessively large review canvas');
 return {
  ok:true,reason:'Fixed shared source-face ROI, not candidate-specific framing',
  width,height,rect:{x:roiX,y:roiY,width:roiW,height:roiH},
  output:{width:scaleX,height:scaleY},zoom,
  sourceFaceCoordinatesNotExported:true,
  candidateBasedCropSelection:false,
  qualityVerified:false,photorealismVerified:false,
  distinctHumanSubjectsVerified:false,
  exportAllowed:false,commercialReleaseAllowed:false
 };
}
