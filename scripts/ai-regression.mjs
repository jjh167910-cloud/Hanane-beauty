import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildConfidenceMask} from '../public/ai/mask-utils.mjs';
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
  const files=['models/hair_segmenter.tflite','wasm/vision_wasm_internal.wasm',
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
