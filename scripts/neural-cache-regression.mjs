import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

function fixture(){
 const origin='https://offline.hananeh.test/',handlers={},stored=new Map();
 let online=true,networkRequests=[];
 const key=path=>new URL(typeof path==='string'?path:path.url,origin).href;
 const network=async request=>{
  const url=key(request);networkRequests.push(url);
  if(!online)throw Error('Network unreachable');
  return new Response('asset-data-'+url,{status:200,headers:{'content-type':'application/octet-stream'}});
 };
 const caches={
  async keys(){return [...stored.keys()]},
  async delete(k){return stored.delete(k)},
  async open(k){
   if(stored.has(k))return stored.get(k);
   const files=new Map();
   const cache={
    async match(uri,{ignoreSearch=false}={}){
     let u=key(uri);
     if(ignoreSearch){const parsed=new URL(u);parsed.search='';u=parsed.href;}
     return files.get(u)?.clone();
    },
    async put(uri,res){files.set(key(uri),res.clone())},
    async addAll(paths){for(const p of paths){const r=await network(p);await cache.put(p,r)}}
   };
   stored.set(k,cache);return cache;
  }
 };
 const scope={URL,Response,caches,fetch:network,self:{location:{origin},clients:{async claim(){}},async skipWaiting(){},addEventListener:(name,fn)=>handlers[name]=fn}};
 vm.runInNewContext(fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),scope);
 return {
  requests:()=>networkRequests.slice(),
  offline(){online=false},
  async message(type){
   const messages=[];let task;
   handlers.message({source:{postMessage:m=>messages.push(m)},data:{type},waitUntil:p=>task=p});
   await task;return messages;
  },
  async install(){let task;handlers.install({waitUntil:p=>task=p});await task},
  async activate(){let task;handlers.activate({waitUntil:p=>task=p});await task},
  async fetch(path){
   let task;handlers.fetch({request:new Request(key(path)),respondWith:p=>task=p});
   return await task;
  },
  async keys(){return caches.keys()}
 };
}

test('Ordinary PWA installation does not download the large MI-GAN binary',async()=>{
 const w=fixture();await w.install();
 const downloaded=w.requests();
 assert.ok(downloaded.some(x=>x.includes('pack-14.js')));
 assert.equal(downloaded.some(x=>x.includes('model-part-')),false);
 assert.equal(downloaded.some(x=>x.includes('ort-wasm-simd-threaded')),false);
 const status=(await w.message('HQ_STATUS')).at(-1);
 assert.equal(status.ready,false);
 assert.equal(status.total,6);
});
test('Explicit opt-in downloads six model/runtime assets once and persists offline',async()=>{
 const w=fixture();await w.install();
 const prep=await w.message('HQ_PREPARE');
 assert.equal(prep.at(-1).type,'HQ_FINISHED');
 assert.equal(prep.at(-1).ready,true);
 const n=w.requests().length;
 await w.message('HQ_PREPARE');
 assert.equal(w.requests().length,n,'Cache repair should not redownload present assets');
 w.offline();
 const response=await w.fetch('/ai/inpaint/model-part-00.bin');
 assert.equal(response.status,200);
 assert.match(await response.text(),/model-part-00/);
 const audit=(await w.message('HQ_STATUS')).at(-1);
 assert.equal(audit.ready,true);
});
test('Normal service worker activation does not evict the optional neural model',async()=>{
 const w=fixture();await w.install();await w.message('HQ_PREPARE');
 await w.activate();
 assert.ok((await w.keys()).includes('hananeh-hq-inpaint-model-v1'));
 assert.equal((await w.message('HQ_STATUS')).at(-1).ready,true);
});
