import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectLocalReferencePair as inspect} from '../public/ai/migan/local-reference-pair.mjs';
const make=(v=50)=>{
 const a=new Uint8ClampedArray(64*64*4);
 for(let i=0;i<64*64;i++){a[4*i]=v;a[4*i+1]=v;a[4*i+2]=v;a[4*i+3]=255;}
 return a;
};
test('same exact rendered reference rejected, never identities certified',()=>{
 const a=make();
 const r=inspect({sourceRGBA:a,referenceRGBA:new Uint8ClampedArray(a),width:64,height:64});
 assert.equal(r.ok,false);assert.match(r.reason,/identical/);
 assert.equal(r.differentPersonVerified,false);
 assert.equal(r.commercialExportAllowed,false);
});
test('different photo buffers allowed for research but people and rights unverified',()=>{
 const a=make(50),b=make(53);
 const r=inspect({sourceRGBA:a,referenceRGBA:b,width:64,height:64});
 assert.equal(r.ok,true);assert.equal(r.differentPictureObserved,true);
 assert.equal(r.differentPersonVerified,false);
 assert.equal(r.rightsVerified,false);
 assert.equal(r.consentIndependentlyVerified,false);
 assert.equal(r.photoHashExported,false);
 assert.equal(JSON.stringify(r).includes('53'),false);
});
test('transparent and invalid image shape rejected',()=>{
 const a=make(),b=make(60);b[3]=100;
 assert.equal(inspect({sourceRGBA:a,referenceRGBA:b,width:64,height:64}).ok,false);
 assert.throws(()=>inspect({sourceRGBA:a,referenceRGBA:new Uint8Array(99),width:64,height:64}),/buffers/);
 assert.throws(()=>inspect({sourceRGBA:a,referenceRGBA:make(),width:4096,height:4096}),/buffers/);
});
