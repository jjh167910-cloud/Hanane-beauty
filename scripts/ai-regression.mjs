import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildConfidenceMask,faceAnchor} from '../public/ai/mask-utils.mjs';
import fs from 'node:fs';

test('Confidence mask assigns transparent and opaque hair pixels',()=>{
  const m=buildConfidenceMask(new Float32Array([0,0.25,0.5,0.9]),2,2);
  assert.equal(m.positivePixels,2);
  assert.equal(m.pixels[0],0);
  assert.equal(m.pixels[4],0);
  assert.ok(m.pixels[8]>0&&m.pixels[8]<255);
  assert.equal(m.pixels[12],255);
  assert.equal(m.pixels[15],255);
});
test('Malformed or nonfinite segmentation data fails safely',()=>{
  assert.throws(()=>buildConfidenceMask(new Float32Array([1]),2,2),/Invalid/);
  const m=buildConfidenceMask(new Float32Array([NaN,Infinity]),2,1);
  assert.equal(m.positivePixels,0);
  assert.equal(m.pixels[0],0);
  assert.equal(m.pixels[4],0);
});
test('The shipped AI loader only references local assets at runtime',()=>{
  const source=fs.readFileSync(new URL('../public/ai/hair-segmenter.mjs',import.meta.url),'utf8');
  assert.match(source,/\.\/vendor\/vision_bundle\.mjs/);
  assert.match(source,/\.\/models\/hair_segmenter\.tflite/);
  assert.doesNotMatch(source,/https?:\/\//);
});
test('Build output includes local model and WASM when build has run',()=>{
  const files=['models/hair_segmenter.tflite','models/blaze_face_short_range.tflite','wasm/vision_wasm_internal.wasm',
    'wasm/vision_wasm_internal.js','wasm/vision_wasm_nosimd_internal.wasm',
    'wasm/vision_wasm_nosimd_internal.js','vendor/vision_bundle.mjs'];
  const root=new URL('../public/ai/',import.meta.url);
  const present=files.filter(f=>fs.existsSync(new URL(f,root)));
  assert.ok(present.length===0||present.length===files.length,'Partial AI build detected');
  if(present.length===files.length){
    const model=fs.readFileSync(new URL(files[0],root));
    assert.equal(model.toString('ascii',4,8),'TFL3');
  }
});

test('Eye-distance anchors improve automatic registration with valid face detections',()=>{
  const detected=faceAnchor([{categories:[{score:.95}],keypoints:[
    {x:.35,y:.36},{x:.62,y:.35},{x:.48,y:.48}
  ]}]);
  assert.ok(detected);
  assert.ok(Math.abs(detected.eyeX-.485)<.0001);
  assert.ok(Math.abs(detected.eyeDistance-.27)<.0001);
  assert.equal(faceAnchor([{keypoints:[{x:.5,y:.5},{x:.51,y:.5}]}]),null);
  assert.equal(faceAnchor([]),null);
});

test('Six-keypoint MediaPipe detection exposes anatomical anchors for research',()=>{
 const features=faceAnchor([{categories:[{score:.98}],keypoints:[
  {x:.40,y:.4},{x:.60,y:.4},{x:.5,y:.49},{x:.5,y:.61},
  {x:.34,y:.52},{x:.66,y:.52}
 ]}]);
 assert.ok(features);
 assert.equal(features.noseY,.49);
 assert.equal(features.mouthY,.61);
 assert.equal(features.eyes.length,2);
 assert.equal(features.earPoints.length,2);
});
test('Reject anatomically inverted nose and mouth without breaking legacy eye anchors',()=>{
 const features=faceAnchor([{keypoints:[
  {x:.40,y:.4},{x:.60,y:.4},{x:.5,y:.58},{x:.5,y:.42}
 ]}]);
 assert.ok(features);
 assert.equal(features.mouthY,undefined);
 assert.ok(Math.abs(features.eyeDistance-.2)<1e-9);
});
