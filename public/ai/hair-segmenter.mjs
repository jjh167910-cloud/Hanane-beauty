// Local MediaPipe hair and eye extraction; zero server-side portrait processing.
import {buildConfidenceMask,faceAnchor} from './mask-utils.mjs';
let initialization;
export async function getLocalHairSegmenter(){
 if(!initialization)initialization=initialize().catch(error=>{initialization=null;throw error;});
 return initialization;
}
async function initialize(){
 const {FilesetResolver,ImageSegmenter,FaceDetector}=await import('./vendor/vision_bundle.mjs');
 const fileset=await FilesetResolver.forVisionTasks(new URL('./wasm',import.meta.url).href);
 const segmenter=await ImageSegmenter.createFromOptions(fileset,{
  baseOptions:{modelAssetPath:new URL('./models/hair_segmenter.tflite',import.meta.url).href,delegate:'CPU'},
  runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false
 });
 let detector=null;
 try{
  detector=await FaceDetector.createFromOptions(fileset,{
   baseOptions:{modelAssetPath:new URL('./models/blaze_face_short_range.tflite',import.meta.url).href,delegate:'CPU'},
   runningMode:'IMAGE',minDetectionConfidence:.5
  });
 }catch(error){console.warn('Local eye alignment unavailable:',error);}
 return {
  analyze(image){
   let face=null,mask=null;
   if(detector)try{face=faceAnchor(detector.detect(image).detections);}
   catch(error){console.warn('Face detection failed for this portrait:',error);}
   try{
    const result=segmenter.segment(image);
    try{
     const hair=result.confidenceMasks?.[1];
     if(!hair)throw Error('Hair confidence map unavailable');
     const {pixels,positivePixels}=buildConfidenceMask(hair.getAsFloat32Array(),hair.width,hair.height);
     if(positivePixels>=80){
      const canvas=document.createElement('canvas');
      canvas.width=hair.width;canvas.height=hair.height;
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('2D canvas unavailable');
      const data=ctx.createImageData(hair.width,hair.height);
      data.data.set(pixels);ctx.putImageData(data,0,0);mask=canvas;
     }
    }finally{result.close();}
   }catch(error){console.warn('Hair extraction failed for this portrait:',error);}
   return {mask,face};
  },
  close(){detector?.close();segmenter.close();}
 };
}
