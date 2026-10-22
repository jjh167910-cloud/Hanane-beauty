import test from 'node:test';
import assert from 'node:assert/strict';
import {createModelDisagreementReviewSession,prioritizeModelDisagreements}
 from '../public/ai/offhair-review-regions.mjs';

const W=16,H=12;
const labels=new Uint8Array(W*H);
for(const [x,y,v] of [[0,0,4],[2,0,2],[4,0,4],[6,0,3],
 [8,0,4],[10,0,2],[12,0,4],[14,0,3],[1,4,2],[1,5,2],
 [13,9,4],[4,9,2]])labels[y*W+x]=v;

test('memory-only session matches the original one-shot API across pages',()=>{
 const source=new Uint8Array(labels);
 const session=createModelDisagreementReviewSession(source,W,H,{connectivity:8});
 for(const minPixels of [1,8])for(const maxRegions of [1,3,20]){
  const first=session.page({minPixels,maxRegions,pageIndex:0});
  const ids=new Set();let critical=0,eligible=0;
  for(let p=0;p<first.totalPages;p++){
   const options={connectivity:8,minPixels,maxRegions,pageIndex:p};
   const current=session.page(options);
   assert.deepEqual(current,prioritizeModelDisagreements(source,W,H,options));
   for(const region of current.regions){
    assert.equal(ids.has(region.regionId),false);
    ids.add(region.regionId);eligible++;
    if(region.hasFaceSkinConflict)critical++;
   }
  }
  assert.equal(critical,first.totalCriticalRegions);
  assert.equal(eligible,ids.size);
  if(minPixels===1)assert.equal(eligible,first.reviewRegionCount);
  else assert.ok(eligible<=first.reviewRegionCount);
  assert.equal(first.allRegionsHumanReviewed,false);
  assert.equal(first.editingAllowed,false);
  assert.equal(first.groundTruthAvailable,false);
 }
});

test('session does not retain or reference the original semantic pixel buffer',()=>{
 const source=new Uint8Array(labels);
 const session=createModelDisagreementReviewSession(source,W,H);
 const before=session.page({minPixels:1,maxRegions:4,pageIndex:0});
 source.fill(0);
 const after=session.page({minPixels:1,maxRegions:4,pageIndex:0});
 assert.deepEqual(after,before);
 assert.equal(prioritizeModelDisagreements(source,W,H).reviewRegionCount,0);
 assert.equal('labels' in session,false);
 assert.deepEqual(Object.keys(session),['page']);
});

test('mutating the returned region and centroid does not corrupt subsequent pages',()=>{
 const session=createModelDisagreementReviewSession(labels,W,H);
 const original=session.page({minPixels:1,maxRegions:3});
 const originalCount=original.regions[0].pixels;
 original.regions[0].pixels=-5;
 original.regions[0].centroid.x=999;
 const again=session.page({minPixels:1,maxRegions:3});
 assert.equal(again.regions[0].pixels,originalCount);
 assert.notEqual(again.regions[0].centroid.x,999);
});
test('invalid dimensions, categories, connectivity and page sizes still fail closed',()=>{
 const bad=new Uint8Array(labels);bad[0]=6;
 assert.throws(()=>createModelDisagreementReviewSession(bad,W,H),/Unknown/);
 assert.throws(()=>createModelDisagreementReviewSession(labels,W,H,{connectivity:6}),/settings/);
 assert.throws(()=>createModelDisagreementReviewSession(labels,W,H-1),/Invalid/);
 const s=createModelDisagreementReviewSession(labels,W,H);
 assert.throws(()=>s.page({maxRegions:0}),/settings/);
 assert.throws(()=>s.page({pageIndex:999}),/out of bounds/);
});
