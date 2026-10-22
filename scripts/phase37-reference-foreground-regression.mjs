import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateBoundedReferenceForeground as estimate}
 from '../public/ai/migan/reference-foreground-color-research.mjs';
const W=96,H=96,N=W*H;
function fixture({flat=false}={}){
 const rgba=new Uint8ClampedArray(N*4),
  mask=new Uint8ClampedArray(N*4);
 const F=[42,34,28],B=flat?[48,44,38]:[210,218,227];
 const a=((182-95)/125)**2*(3-2*(182-95)/125);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x,k=i*4,inside=x>=18&&x<78&&y>=8&&y<45;
  let p=inside?F:B,m=inside?255:0;
  if(inside&&y===44){
   m=182;p=F.map((v,c)=>Math.round(a*v+(1-a)*B[c]));
  }
  rgba.set([...p,255],k);mask[k]=m;mask[k+3]=255;
 }
 return {referenceRGBA:rgba,referenceHairRGBA:mask,width:W,height:H,F,B};
}
test('synthetic spill reduces foreground mismatch without inventing hair',()=>{
 const p=fixture(),r=estimate(p),again=estimate(p);
 assert.equal(r.ok,true,r.reason);
 assert.deepEqual(r.rgba,again.rgba);
 assert.ok(r.metrics.candidatePixels>=50);
 assert.ok(r.metrics.pixelsChanged>=50);
 assert.ok(r.metrics.maxObservedChannelChange<=18);
 assert.equal(r.metrics.newHairPixels,0);
 assert.equal(r.trueAlphaMeasured,false);
 assert.equal(r.photorealismVerified,false);
 assert.equal(r.exportAllowed,false);
 const i=(44*W+30)*4;
 for(let c=0;c<3;c++){
  assert.ok(Math.abs(r.rgba[i+c]-p.F[c])<
   Math.abs(p.referenceRGBA[i+c]-p.F[c]));
 }
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=(y*W+x)*4;
  if(y!==44||x<18||x>=78)
   assert.deepEqual(r.rgba.slice(i,i+4),p.referenceRGBA.slice(i,i+4));
  assert.equal(r.rgba[i+3],255);
 }
 assert.notDeepEqual(r.rgba,p.referenceRGBA);
});
test('flat hair-vs-background color refuses speculative inversion',()=>{
 const p=fixture({flat:true}),r=estimate(p);
 assert.equal(r.ok,true);
 assert.equal(r.metrics.pixelsChanged,0);
 assert.ok(r.metrics.lowContrast>0);
 assert.equal(r.trueAlphaMeasured,false);
});
test('insufficient foreground/background, malformed dimensions, transparency fail closed',()=>{
 let p=fixture();p.referenceHairRGBA.fill(255);
 assert.equal(estimate(p).ok,false);
 p=fixture();p.referenceRGBA[3]=128;
 assert.equal(estimate(p).ok,false);
 p=fixture();p.referenceRGBA=new Uint8Array(2);
 assert.equal(estimate(p).ok,false);
 p=fixture();assert.throws(()=>estimate({...p,radius:99}),/Invalid/);
 assert.throws(()=>estimate({...p,width:4096,height:4096}),/Invalid/);
 assert.throws(()=>estimate({...p,maxChannelChange:40}),/Invalid/);
});
test('outside transition is always immutable even when neighboring hair is dark',()=>{
 const p=fixture(),before=p.referenceRGBA.slice(),mask=p.referenceHairRGBA.slice();
 const r=estimate({...p,maxChannelChange:3});
 assert.equal(r.ok,true);
 assert.ok(r.metrics.maxObservedChannelChange<=3);
 assert.deepEqual(p.referenceRGBA,before);
 assert.deepEqual(p.referenceHairRGBA,mask);
 for(let i=0;i<N;i++)if(mask[i*4]<=165||mask[i*4]>=219)
  assert.deepEqual(r.rgba.slice(i*4,i*4+4),before.slice(i*4,i*4+4));
});
