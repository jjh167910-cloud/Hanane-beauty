import test from 'node:test';
import assert from 'node:assert/strict';
import {prioritizeModelDisagreements} from '../public/ai/offhair-review-regions.mjs';
const W=12,H=9,N=W*H;
function grid(points=[]){const v=new Uint8Array(N);
 for(const [x,y,label] of points)v[y*W+x]=label;
 return v;}
const point=(x,y,v)=>[x,y,v];
test('face/skin disagreements have explicit priority over large hair-only regions',()=>{
 const pts=[point(1,1,4),point(1,2,4),point(2,2,2)];
 for(let y=1;y<4;y++)for(let x=6;x<9;x++)pts.push(point(x,y,3));
 pts.push(point(11,8,2));
 const r=prioritizeModelDisagreements(grid(pts),W,H,{minPixels:4,maxRegions:2});
 assert.equal(r.reviewRegionCount,3);
 assert.equal(r.shortlistedRegionCount,2);
 assert.equal(r.totalReviewPixels,13);
 assert.equal(r.reviewedPixels,12);
 assert.equal(r.omittedPixels,1);
 assert.equal(r.omittedFaceSkinConflictRegions,0);
 assert.equal(r.regions[0].priorityClass,'face_skin_conflict');
 assert.equal(r.regions[0].pixels,3);
 assert.equal(r.regions[0].faceSkinConflictPixels,2);
 assert.deepEqual([r.regions[0].minX,r.regions[0].minY,r.regions[0].maxX,r.regions[0].maxY],[1,1,2,2]);
 assert.equal(r.regions[1].pixels,9);
 assert.equal(r.regions[1].touchesImageEdge,false);
 assert.equal(r.editingAllowed,false);
 assert.equal(r.groundTruthAvailable,false);
});
test('truncation retains disclosure of omitted critical face/skin disagreements',()=>{
 const a=grid([[1,1,4],[1,2,4],[8,7,4]]);
 const r=prioritizeModelDisagreements(a,W,H,{minPixels:8,maxRegions:1});
 assert.equal(r.reviewRegionCount,2);
 assert.equal(r.omittedFaceSkinConflictRegions,1);
 assert.equal(r.omittedFaceSkinConflictPixels,1);
 assert.equal(r.omittedPixels,1);
 assert.equal(r.allRegionsHumanReviewed,false);
 assert.equal(r.shortlistCoversAllComponents,false);
});
test('4-connected vs 8-connected diagonal components are well defined',()=>{
 const pixels=grid([[1,1,2],[2,2,3]]);
 assert.equal(prioritizeModelDisagreements(pixels,W,H,{connectivity:4}).reviewRegionCount,2);
 assert.equal(prioritizeModelDisagreements(pixels,W,H,{connectivity:8}).reviewRegionCount,1);
});
test('background, predicted skin and consensus hair are not miscategorized as conflicts',()=>{
 const a=grid([[0,0,0],[1,1,1],[2,2,5]]);
 const r=prioritizeModelDisagreements(a,W,H);
 assert.equal(r.reviewRegionCount,0);
 assert.equal(r.totalReviewPixels,0);
 assert.equal(r.shortlistCoversAllComponents,true);
 assert.equal(r.allRegionsHumanReviewed,false);
 assert.equal(r.distribution.consensusHair,1);
 assert.equal(r.distribution.faceSkin,1);
 assert.equal(Object.values(r.distribution).reduce((a,b)=>a+b,0),N);
});
test('region sorting and box/centroid are reproducible',()=>{
 const a=grid([[1,1,2],[2,1,3],[10,6,2],[11,6,2]]);
 const r=prioritizeModelDisagreements(a,W,H,{minPixels:1});
 const s=prioritizeModelDisagreements(a,W,H,{minPixels:1});
 assert.deepEqual(r,s);
 assert.deepEqual(r.regions.map(x=>[x.minX,x.minY]),[[1,1],[10,6]]);
 assert.deepEqual(r.regions[0].centroid,{x:2,y:1});
});
test('all regions/pixels accounted for when maxRegions limits human review list',()=>{
 const pixels=grid([[0,0,4],[3,0,2],[6,0,3],[9,0,4]]);
 const r=prioritizeModelDisagreements(pixels,W,H,{maxRegions:1,minPixels:1});
 assert.equal(r.reviewRegionCount,4);
 assert.equal(r.shortlistedRegionCount,1);
 assert.equal(r.reviewedPixels+r.omittedPixels,r.totalReviewPixels);
 assert.equal(r.omittedFaceSkinConflictRegions,1);
 assert.equal(r.omittedFaceSkinConflictPixels,1);
});
test('malformed review maps and abusive settings fail closed',()=>{
 assert.throws(()=>prioritizeModelDisagreements(grid(),W,1),/Invalid semantic/);
 const invalid=grid();invalid[3]=6;
 assert.throws(()=>prioritizeModelDisagreements(invalid,W,H),/Unknown/);
 assert.throws(()=>prioritizeModelDisagreements(grid(),W,H,{maxRegions:0}),/settings/);
 assert.throws(()=>prioritizeModelDisagreements(grid(),W,H,{connectivity:6}),/settings/);
 assert.throws(()=>prioritizeModelDisagreements(new Uint16Array(N),W,H),/Invalid semantic/);
});
