'use strict';
/* Hananeh Beauty: cache every public style asset for private, offline use. */
const VERSION='hananeh-v1-20261021';
const PACKS=Array.from({length:14},(_,i)=>'./data/pack-'+String(i+1).padStart(2,'0')+'.js');
const ASSETS=['./','./index.html','./catalog.js','./manifest.webmanifest','./icons/app.svg',...PACKS];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
   const cache=await caches.open(VERSION);
   // Atomic installation: never activate a partial offline catalog.
   await cache.addAll(ASSETS);
   await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('hananeh-v1-')&&key!==VERSION)await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
   const cache=await caches.open(VERSION);
   const cached=await cache.match(req,{ignoreSearch:false});
   if(cached)return cached;
   try{
     const response=await fetch(req);
     if(response.ok && new URL(req.url).pathname.startsWith(new URL(self.registration.scope).pathname))await cache.put(req,response.clone());
     return response;
   }catch(err){
     if(req.mode==='navigate')return await cache.match('./index.html') || Response.error();
     return Response.error();
   }
 })());
});
