// Offline, same-origin MediaPipe hair segmentation. Portraits never leave this device.
import {buildConfidenceMask} from './mask-utils.mjs';
let initialization;
export async function getLocalHairSegmenter(){
  if(!initialization)initialization=initialize().catch(error=>{initialization=null;throw error;});
  return initialization;
}
async function initialize(){
  // This module is installed by the build step, not loaded from any CDN at runtime.
  const {FilesetResolver,ImageSegmenter}=await import('./vendor/vision_bundle.mjs');
  const wasmRoot=new URL('./wasm',import.meta.url).href;
  const fileset=await FilesetResolver.forVisionTasks(wasmRoot);
  const instance=await ImageSegmenter.createFromOptions(fileset,{
    baseOptions:{
      modelAssetPath:new URL('./models/hair_segmenter.tflite',import.meta.url).href,
      delegate:'CPU'
    },
    runningMode:'IMAGE',
    outputConfidenceMasks:true,
    outputCategoryMask:false
  });
  return {
    segment(image){
      // MediaPipe's HairSegmenter uses confidence channel 1 for hair.
      const result=instance.segment(image);
      try{
        const hair=result.confidenceMasks?.[1];
        if(!hair)throw Error('Hair probability channel unavailable');
        const {pixels,positivePixels}=buildConfidenceMask(
          hair.getAsFloat32Array(),hair.width,hair.height
        );
        if(positivePixels<80)throw Error('No reliable hair pixels detected');
        const canvas=document.createElement('canvas');
        canvas.width=hair.width;canvas.height=hair.height;
        const context=canvas.getContext('2d');
        if(!context)throw Error('Canvas 2D unsupported');
        const imageData=context.createImageData(hair.width,hair.height);
        imageData.data.set(pixels);
        context.putImageData(imageData,0,0);
        return canvas;
      }finally{result.close();}
    },
    close(){instance.close();}
  };
}
