import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {faceProtectionAlpha, eyeRotation, exposedHairFraction, poseCompatibility} from '../public/ai/quality-core.mjs';
import {faceAnchor} from '../public/ai/mask-utils.mjs';

test('Central facial features are protected while hair above the forehead stays unprotected',()=>{
 const face={eyeX:.5,eyeY:.35,eyeDistance:.18,eyeSlope:0};
 const a=faceProtectionAlpha(200,250,face);
 const pixel=(x,y)=>a[y*200+x];
 assert.equal(a.length,50000);
 assert.equal(pixel(100,140),255);
 assert.equal(pixel(100,2),0);
 assert.equal(pixel(3,140),0);
 assert.ok(pixel(80,140)>0);
});

test('No face or invalid detection never produces an invented face overlay',()=>{
 const blank=faceProtectionAlpha(8,8,null);
 assert.ok(blank.every(x=>x===0));
 assert.throws(()=>faceProtectionAlpha(0,100,{}),/Invalid/);
 assert.throws(()=>faceProtectionAlpha(3000,3000,{}),/Invalid/);
 const broken=faceProtectionAlpha(16,16,{eyeX:NaN,eyeY:.3,eyeDistance:.2});
 assert.ok(broken.every(x=>x===0));
});

test('Eye slope reflects tilt and produces finite geometry',()=>{
 const face=faceAnchor([{categories:[{score:.9}],keypoints:[
  {x:.30,y:.35},{x:.60,y:.37}
 ]}]);
 assert.ok(face);
 assert.ok(Math.abs(face.eyeSlope-(.02/.30))<1e-7);
 assert.ok(eyeRotation(face,768,960)>0);
 assert.equal(eyeRotation(null,768,960),0);
 assert.equal(eyeRotation(face,-1,960),0);
});

test('Hair overlap reports uncovered original hair and ignores the lower 22% of the frame',()=>{
 const w=20,h=20,source=new Uint8ClampedArray(w*h*4),target=new Uint8ClampedArray(w*h*4);
 // 15 rows are inspected (0-15); 10 hair pixels remain uncovered.
 for(let y=0;y<15;y++){const i=4*(y*w+2);source[i]=255;if(y<5)target[i]=255;}
 for(let y=17;y<20;y++)source[4*(y*w+2)]=255;
 const q=exposedHairFraction(source,target,w,h);
 // Samples alternate rows: 0,2,4,6,8,10,12,14 = 8;
 // Covered rows are 0,2,4 = 3, uncovered = 5.
 assert.equal(q.total,8);
 assert.equal(q.exposed,5);
 assert.ok(Math.abs(q.fraction-.625)<1e-9);
 assert.equal(q.reliable,false);
});

test('Large, fully aligned masks report no exposed original hair',()=>{
 const w=40,h=40,source=new Uint8ClampedArray(w*h*4),target=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<25;y++)for(let x=0;x<30;x++){const i=4*(y*w+x);source[i]=255;target[i]=255;}
 const q=exposedHairFraction(source,target,w,h);
 assert.equal(q.fraction,0);
 assert.equal(q.reliable,true);
 assert.throws(()=>exposedHairFraction(source,target,39,40),/Invalid/);
});

test('Offline quality helper is shipped and precached without external runtime dependencies',()=>{
 const source=fs.readFileSync(new URL('../public/ai/quality-core.mjs',import.meta.url),'utf8');
 const sw=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.doesNotMatch(source,/https?:\/\//);
 assert.match(sw,/\.\/ai\/quality-core\.mjs/);
 assert.match(html,/import\('\.\/ai\/quality-core\.mjs'\)/);
 assert.match(html,/id="protectFace"/);
 assert.match(html,/id="qualityNotice"/);
});

test('Head-angle mismatches reject unrealistic frontal/side hair pairing',()=>{
 assert.deepEqual(poseCompatibility({yaw:.58},{yaw:0}),
  {known:true,mismatch:true,difference:.58});
 assert.equal(poseCompatibility({yaw:.12},{yaw:.20}).mismatch,false);
 const unknown=poseCompatibility({yaw:null},{yaw:.25});
 assert.equal(unknown.known,false);
 assert.equal(unknown.mismatch,false);
});
