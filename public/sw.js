'use strict';
const VERSION='hananeh-static-20261021-v1';
const PACKS=Array.from({length:14},(_,i)=>'./data/pack-'+String(i+1).padStart(2,'0')+'.js');
const CORE=['./','./index.html','./catalog.js','./manifest.webmanifest','./icons/app.svg',...PACKS];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(VERSION);await cache.addAll(CORE);await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('hananeh-static-')&&k!==VERSION)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;event.respondWith((async()=>{const c=await caches.open(VERSION);const cached=await c.match(req,{ignoreSearch:true});if(cached)return cached;try{const response=await fetch(req);if(response.ok)await c.put(req,response.clone());return response}catch(err){if(req.mode==='navigate')return await c.match('./index.html')||Response.error();return Response.error()}})())});
