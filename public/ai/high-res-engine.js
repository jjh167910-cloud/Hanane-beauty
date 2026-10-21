(function(root){
'use strict';
/* Pixel-budgeted, fully local high-resolution export geometry. */
function exportScale(imageWidth,imageHeight,previewWidth,previewHeight,{maxScale=2,maxPixels=3000000}={}){
 const v=[imageWidth,imageHeight,previewWidth,previewHeight,maxScale,maxPixels];
 if(!v.every(Number.isFinite)||v.some(n=>n<=0))throw new TypeError('Invalid source or canvas dimensions');
 const fit=Math.min(previewWidth/imageWidth,previewHeight/imageHeight);
 const drawnWidth=imageWidth*fit,drawnHeight=imageHeight*fit;
 const sourceScale=Math.min(imageWidth/drawnWidth,imageHeight/drawnHeight);
 const budgetScale=Math.sqrt(maxPixels/(previewWidth*previewHeight));
 return Math.max(1,Math.min(sourceScale,maxScale,budgetScale));
}
function sourcePlacement(imageWidth,imageHeight,previewWidth,previewHeight,scale=1){
 if(![imageWidth,imageHeight,previewWidth,previewHeight,scale].every(n=>Number.isFinite(n)&&n>0))throw new TypeError('Invalid placement');
 const fit=Math.min(previewWidth/imageWidth,previewHeight/imageHeight);
 const width=imageWidth*fit,height=imageHeight*fit;
 return {x:(previewWidth-width)*scale/2,y:(previewHeight-height)*scale/2,width:width*scale,height:height*scale};
}
function paintHair(ctx,referenceLayer,fitted,adjustments,multiplier=1){
 if(!referenceLayer||!fitted||!Number.isFinite(multiplier)||multiplier<=0)throw new TypeError('Invalid overlay');
 const {x=0,y=0,rotation=0,scale=100}=adjustments;
 if(![x,y,rotation,scale].every(Number.isFinite)||scale<=0)throw new TypeError('Invalid transform');
 ctx.save();
 ctx.scale(multiplier,multiplier);
 ctx.translate(fitted.x+x,fitted.y+y);
 ctx.rotate(rotation*Math.PI/180);
 ctx.scale(fitted.s*scale/100,fitted.s*scale/100);
 ctx.drawImage(referenceLayer,-fitted.refEyeX,-fitted.refEyeY,512,512);
 ctx.restore();
}
root.HananehExport={exportScale,sourcePlacement,paintHair};
})(typeof window!=='undefined'?window:globalThis);
