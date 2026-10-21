'use strict';
/**
 * Hananeh Beauty offline cache.
 * Every script pack contains pre-bundled images, so success means the complete
 * catalog can open without a network connection (until browser data is evicted).
 */
const VERSION='hananeh-static-20261021-v6';
const PACKS=Array.from({length:14},(_,i)=>'./data/pack-'+String(i+1).padStart(2,'0')+'.js');
const CORE=['./','./index.html','./catalog.js','./manifest.webmanifest','./icons/app.svg','./icons/app-192.png','./icons/app-512.png',...PACKS];
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
  await send(client,{type:'CACHE_AUDIT',ready:missing.length===0,done:CORE.length-missing.length,total:CORE.length,missing});
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
  await auditCache(client);
  await send(client,{type:'CACHE_FINISHED',ready:failed.length===0,failed});
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(VERSION);
  await cache.addAll(CORE);
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
