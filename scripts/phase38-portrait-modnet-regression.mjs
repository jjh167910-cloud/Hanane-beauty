import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePortraitMatteInput,comparePortraitMatteToHair,
 runPortraitMatteOnDevice} from '../public/ai/migan/portrait-modnet-neural-audit.mjs';
const N=512*512;
const source=()=>{
 const a=new Uint8ClampedArray(N*4);
 for(let i=0;i<N;i++)a.set([25,127,229,255],4*i);
 return a;
};
const mask=()=>{
 const m=new Uint8ClampedArray(N*4);
 for(let y=55;y<195;y++)for(let x=150;x<365;x++)m[4*(y*512+x)]=255;
 return m;
};
const face={eyeX:.5,eyeY:.47,eyeDistance:.20};
test('MODNet preprocessor exactly follows published mean .5/std .5 NCHW',()=>{
 const x=preparePortraitMatteInput(source());
 assert.equal(x.length,N*3);
 assert.ok(Math.abs(x[0]-(25/255*2-1))<1e-6);
 assert.ok(Math.abs(x[N]-(127/255*2-1))<1e-6);
 assert.ok(Math.abs(x[2*N]-(229/255*2-1))<1e-6);
 assert.throws(()=>preparePortraitMatteInput(new Uint8Array(5)),/512x512/);
 const s=source();s[3]=10;
 assert.throws(()=>preparePortraitMatteInput(s),/transparent/);
});
test('real neural output shape comparison is only model agreement, not human approval',()=>{
 const alpha=new Float32Array(N);
 alpha.fill(.92);
 const a=comparePortraitMatteToHair({
  portraitAlpha:alpha,sourceHairRGBA:mask(),sourceFace:face
 });
 assert.equal(a.ok,true,a.reason);
 assert.equal(a.metrics.hairInsidePredictedPersonFraction,1);
 assert.equal(a.metrics.personForegroundPixels,N);
 assert.equal(a.modelIsHairSpecific,false);
 assert.equal(a.alphaIsGroundTruth,false);
 assert.equal(a.commercialReleaseApproved,false);
 assert.equal(a.realisticHairstyleVerified,false);
 assert.equal(a.exportAllowed,false);
 assert.equal(a.diagnosticRGBA.length,N*4);
});
test('missing hair support, unsafe frame, out of range alpha fail closed',()=>{
 const t=new Float32Array(N),z=new Uint8ClampedArray(N*4);
 assert.equal(comparePortraitMatteToHair({portraitAlpha:t,
  sourceHairRGBA:z,sourceFace:face}).ok,false);
 t[0]=Number.NaN;
 assert.equal(comparePortraitMatteToHair({portraitAlpha:t,
  sourceHairRGBA:mask(),sourceFace:face}).ok,false);
 t[0]=0;
 assert.equal(comparePortraitMatteToHair({portraitAlpha:t,
  sourceHairRGBA:mask(),sourceFace:{...face,eyeX:NaN}}).ok,false);
});
test('runner refuses untrusted model length before inference or internet usage',async()=>{
 const s=source();
 let attempted=false;
 const ort={Tensor:function(){attempted=true},InferenceSession:{create:async()=>{attempted=true;}}};
 await assert.rejects(()=>runPortraitMatteOnDevice({
  ort,modelBytes:new Uint8Array(8),sourceRGBA:s,
  sourceHairRGBA:mask(),sourceFace:face
 }),/length/);
 assert.equal(attempted,false);
});
