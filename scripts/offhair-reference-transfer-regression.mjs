import test from 'node:test';
import assert from 'node:assert/strict';
import {createSemanticSkinVeto} from '../public/ai/migan/semantic-skin-veto.mjs';
import {composeReferenceHairResearch} from '../public/ai/migan/reference-transfer-research.mjs';

const W=128,H=128,N=W*H;
const face={eyeX:.5,eyeY:.48,eyeDistance:.2,eyeSpan:.2,
 eyeRollRadians:0,eyes:[{x:.4,y:.48},{x:.6,y:.48}],
 noseX:.5,noseY:.61,mouthX:.5,mouthY:.71,
 earPoints:[{x:.28,y:.51},{x:.72,y:.51}]};
const image=(r,g,b)=>{
 const out=new Uint8ClampedArray(N*4);
 for(let i=0;i<N;i++){const k=4*i;out[k]=r;out[k+1]=g;out[k+2]=b;out[k+3]=255;}
 return out;
};
const hair=()=>{
 const out=new Uint8ClampedArray(N*4);
 for(let y=12;y<50;y++)for(let x=38;x<90;x++)
  out[4*(y*W+x)]=255;
 return out;
};
const skin=()=>{
 const labels=new Uint8Array(N);
 for(let y=53;y<105;y++)for(let x=37;x<91;x++)labels[y*W+x]=3;
 return createSemanticSkinVeto(labels,W,H,W,H);
};
function setup(){
 const sourceRGBA=image(26,30,35),restoredRGBA=new Uint8ClampedArray(sourceRGBA);
 const referenceRGBA=image(140,65,22),sourceHairRGBA=hair(),referenceHairRGBA=hair(),
  keepMask=new Uint8Array(N);keepMask.fill(255);
 for(let y=15;y<41;y++)for(let x=42;x<86;x++){
  const i=y*W+x;keepMask[i]=0;
  restoredRGBA[4*i]=90;restoredRGBA[4*i+1]=88;restoredRGBA[4*i+2]=85;
 }
 return {sourceRGBA,restoredRGBA,sourceHairRGBA,referenceRGBA,
  referenceHairRGBA,keepMask,sourceFace:face,referenceFace:face,
  semanticVeto:skin(),width:W,height:H};
}
test('generates a deterministic two-stage diagnostic but NEVER customer export',()=>{
 const opts=setup();
 const a=composeReferenceHairResearch(opts),b=composeReferenceHairResearch(opts);
 assert.equal(a.ok,true,a.reason);
 assert.deepEqual(a.rgba,b.rgba);
 assert.equal(a.exportAllowed,false);
 assert.equal(a.referenceHairstyleGenerated,false);
 assert.equal(a.realisticHairTransferVerified,false);
 assert.equal(a.requiresHumanReview,true);
 assert.ok(a.counts.removed>100);
 assert.ok(a.counts.pasted>100);
 assert.ok(a.counts.foreheadOverlaps>0);
 assert.ok(a.diagnosticFlags.includes('fringe_occlusion_unresolved'));
 assert.equal(a.rgba.length,N*4);
 for(let i=0;i<N;i++){
  const k=4*i;
  if(opts.keepMask[i]===255&&a.opacity[i]===0)
   for(let c=0;c<4;c++)assert.equal(a.rgba[k+c],opts.sourceRGBA[k+c],
    'Source outside remove/transfer support is byte-identical');
  assert.equal(a.rgba[k+3],opts.sourceRGBA[k+3]);
  if(opts.semanticVeto.guard[i])assert.equal(a.opacity[i],0);
 }
 assert.equal(opts.sourceRGBA[0],26,'Source immutable');
});
test('tampered output outside mask and invalid semantic guard fail closed',()=>{
 let p=setup();p.restoredRGBA[4*(100*W+2)]=255;
 assert.match(composeReferenceHairResearch(p).reason,/outside the removal/);
 p=setup();p.semanticVeto.guard[0]=99;
 assert.match(composeReferenceHairResearch(p).reason,/Missing or untrusted/);
 p=setup();p.semanticVeto=null;
 assert.equal(composeReferenceHairResearch(p).ok,false);
});
test('scale/roll mismatch rejects rather than guessing pose',()=>{
 let p=setup();p.referenceFace={...face,eyeSpan:.065};
 assert.match(composeReferenceHairResearch(p).reason,/scale or roll/);
 p=setup();p.referenceFace={...face,eyeRollRadians:.31};
 assert.match(composeReferenceHairResearch(p).reason,/scale or roll/);
});
test('all-alpha editing cannot overwrite protected skin',()=>{
 const p=setup();
 p.referenceHairRGBA.fill(255);
 assert.match(composeReferenceHairResearch(p).reason,/implausible/);
 const r=setup();r.keepMask[72*W+55]=0;
 assert.match(composeReferenceHairResearch(r).reason,/protected skin/);
});
test('rejects malformed buffers, masks and alignment options',()=>{
 const p=setup();p.sourceRGBA=new Uint8Array(8);
 assert.throws(()=>composeReferenceHairResearch(p),/Invalid source/);
 const q=setup();q.keepMask[0]=128;
 assert.throws(()=>composeReferenceHairResearch(q),/binary/);
 const t=setup();
 assert.throws(()=>composeReferenceHairResearch({...t,maxRoll:2}),/Invalid research/);
});
