'use strict';
/**
 * Hananeh Beauty offline cache.
 * Every script pack contains pre-bundled images, so success means the complete
 * catalog can open without a network connection (until browser data is evicted).
 */
const VERSION='hananeh-static-20261021-v8';
const PACKS=Array.from({length:14},(_,i)=>'./data/pack-'+String(i+1).padStart(2,'0')+'.js');
const CORE=['./','./index.html','./catalog.js','./manifest.webmanifest','./icons/app.svg','./icons/app-192.png','./icons/app-512.png',...PACKS];
// Optional AI assets: a missing model never prevents the offline catalog from installing.
const AI_FILES=['./ai/hair-segmenter.mjs','./ai/mask-utils.mjs',
  './ai/vendor/vision_bundle.mjs','./ai/models/hair_segmenter.tflite',
  './ai/wasm/vision_wasm_internal.js','./ai/wasm/vision_wasm_internal.wasm',
  './ai/wasm/vision_wasm_nosimd_internal.js','./ai/wasm/vision_wasm_nosimd_internal.wasm'];
async function cacheOptional(cache,path){
 try{
  if(await cache.match(path))return true;
  const response=await fetch(path,{cache:'reload'});
  if(!response.ok||response.redirected||(response.headers.get('content-type')||'').toLowerCase().includes('text/html'))return false;
  await cache.put(path,response);return true;
 }catch{return false;}
}

// Browsers reject followed-redirect responses for some offline navigations.
function navigationResponse(response){
  if(!response?.redirected)return response;
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:response.headers});
}
async function send(client,message){try{client?.postMessage(message)}catch(_){}}
async function auditCache(client){
  const cache=await caches.open(VERSION);
  const missing=[];
  for(const path of CORE)if(!(await cache.match(path)))missing.push(path);
  const aiMissing=[];
  for(const path of AI_FILES)if(!(await cache.match(path)))aiMissing.push(path);
  await send(client,{type:'CACHE_AUDIT',ready:missing.length===0,done:CORE.length-missing.length,total:CORE.length,missing,
    aiReady:aiMissing.length===0,aiDone:AI_FILES.length-aiMissing.length,aiTotal:AI_FILES.length,aiMissing});
}
async function repairCache(client){
  const cache=await caches.open(VERSION);
  let done=0;
  let failed=[];
  for(const path of CORE){
    try{
      if(!(await cache.match(path))){
        const response=await fetch(path,{cache:'reload'});
        if(!response.ok)throw new Error('HTTP '+response.status);
        await cache.put(path,response);
      }
      done++;
    }catch(err){failed.push(path);}
    await send(client,{type:'CACHE_PROGRESS',done,total:CORE.length,failed:failed.length});
  }
  for(const path of AI_FILES)await cacheOptional(cache,path);
  await auditCache(client);
  await send(client,{type:'CACHE_FINISHED',ready:failed.length===0,failed});
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(VERSION);
  await cache.addAll(CORE);
  // Never fail the PWA installation if optional native-sized ML assets are unavailable.
  // Populate them from the SAME origin, so a completed install runs fully offline.
  await Promise.all(AI_FILES.map(path=>cacheOptional(cache,path)));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys()){
    if(name.startsWith('hananeh-static-')&&name!==VERSION)await caches.delete(name);
  }
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  const client=event.source;
  if(event.data?.type==='CACHE_STATUS')event.waitUntil(auditCache(client));
  if(event.data?.type==='CACHE_REPAIR')event.waitUntil(repairCache(client));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(VERSION);
    const cached=await cache.match(req,{ignoreSearch:true});
    if(cached)return req.mode==='navigate'?navigationResponse(cached):cached;
    try{
      const response=await fetch(req);
      if(response.ok)await cache.put(req,response.clone());
      return response;
    }catch(_){
      if(req.mode==='navigate')return navigationResponse((await cache.match('./'))||(await cache.match('./index.html')))||Response.error();
      return Response.error();
    }
  })());
});
