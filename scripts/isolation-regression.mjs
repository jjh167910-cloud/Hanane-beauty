import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const headers=fs.readFileSync(new URL('../public/_headers',import.meta.url),'utf8');
const source=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
const events=new Map();
const scope={self:{addEventListener:(event,handler)=>events.set(event,handler)},Response,Headers};
vm.createContext(scope);
vm.runInContext(source,scope);
const navigationResponse=vm.runInContext('navigationResponse',scope);

test('Cloudflare static hosting declares an isolated document environment',()=>{
 assert.match(headers,/Cross-Origin-Opener-Policy:\s*same-origin/);
 assert.match(headers,/Cross-Origin-Embedder-Policy:\s*require-corp/);
 assert.match(headers,/Cross-Origin-Resource-Policy:\s*same-origin/);
 assert.match(headers,/^\/\*/m);
});
test('older cached HTML gains isolation headers even if original lacked them',async()=>{
 const response=navigationResponse(new Response('<html></html>',{headers:{'Content-Type':'text/html'}}));
 assert.equal(response.headers.get('Cross-Origin-Opener-Policy'),'same-origin');
 assert.equal(response.headers.get('Cross-Origin-Embedder-Policy'),'require-corp');
 assert.equal(response.headers.get('Cross-Origin-Resource-Policy'),'same-origin');
 assert.equal(await response.text(),'<html></html>');
});
test('offline navigation preserves HTTP status, mime and existing security headers',async()=>{
 const response=navigationResponse(new Response('ok',{status:200,headers:{'X-Test':'yes','Content-Type':'text/html; charset=utf-8'}}));
 assert.equal(response.status,200);
 assert.equal(response.headers.get('X-Test'),'yes');
 assert.match(response.headers.get('Content-Type'),/text\/html/);
});
test('missing cached response stays absent',()=>{
 assert.equal(navigationResponse(undefined),undefined);
});
test('real service-worker listeners remain registered',()=>{
 for(const name of ['install','activate','fetch','message'])assert.equal(events.has(name),true);
});
