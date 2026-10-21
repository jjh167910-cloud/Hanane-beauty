import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {test} from 'node:test';

// Run the shipped worker handlers with real file bytes and Response objects.
// This covers cache routing and failure recovery; Android browser behavior still
// requires device testing.
function markRedirected(response){
  const clone=response.clone.bind(response);
  Object.defineProperty(response,'redirected',{value:true});
  response.clone=()=>markRedirected(clone());
  return response;
}
function worker({redirectIndex=false}={}){
  const origin='https://offline.test/',handlers={},stores=new Map();let online=true;
  const key=request=>new URL(typeof request==='string'?request:request.url,origin).href;
  const network=async request=>{
    if(!online)throw Error('Offline');
    const pathname=new URL(key(request)).pathname;
    try{
      const response=new Response(await fs.readFile(new URL('../public'+(pathname==='/'?'/index.html':pathname),import.meta.url)));
      if(redirectIndex && pathname==='/index.html')markRedirected(response);
      return response;
    }
    catch{return new Response('Not found',{status:404})}
  };
  const caches={
    async keys(){return [...stores.keys()]},
    async delete(name){return stores.delete(name)},
    async open(name){
      if(stores.has(name))return stores.get(name);
      const data=new Map(),cache={
        async match(request,options={}){let k=key(request);if(options.ignoreSearch){const u=new URL(k);u.search='';k=u.href}return data.get(k)?.clone()},
        async put(request,response){data.set(key(request),response.clone())},
        async delete(request){return data.delete(key(request))},
        async addAll(paths){const responses=await Promise.all(paths.map(network));if(responses.some(r=>!r.ok))throw Error('Precache failed');for(let i=0;i<paths.length;i++)await cache.put(paths[i],responses[i])},
      };stores.set(name,cache);return cache;
    },
  };
  const scope={URL,Response,Headers,caches,fetch:network,self:{location:{origin:'https://offline.test'},clients:{async claim(){}},async skipWaiting(){},addEventListener(name,handler){handlers[name]=handler}}};
  const ready=fs.readFile(new URL('../public/sw.js',import.meta.url),'utf8').then(source=>vm.runInNewContext(source,scope));
  return {caches,setOffline:()=>{online=false},async dispatch(name,event={}){await ready;let task;handlers[name]({...event,waitUntil:p=>task=p,respondWith:p=>task=p});return task}};
}

test('Installed cache serves every catalog pack with no network',async()=>{
  const w=worker();await w.dispatch('install');w.setOffline();
  for(const file of ['index.html','catalog.js','manifest.webmanifest','icons/app-192.png','icons/app-512.png',...Array.from({length:14},(_,i)=>`data/pack-${String(i+1).padStart(2,'0')}.js`)]){
    const response=await w.dispatch('fetch',{request:new Request('https://offline.test/'+file)});
    assert.equal(response.status,200,file);assert.ok((await response.arrayBuffer()).byteLength>0,file);
  }
});

test('Missing catalog pack is reported and cache repair restores it',async()=>{
  const w=worker();await w.dispatch('install');const [name]=await w.caches.keys();
  await (await w.caches.open(name)).delete('./data/pack-14.js');
  const messages=[],source={postMessage:m=>messages.push(m)};
  await w.dispatch('message',{source,data:{type:'CACHE_STATUS'}});
  assert.equal(typeof messages.at(-1).aiReady,'boolean');
  assert.equal(messages.at(-1).aiTotal,9);
  assert.equal(messages.at(-1).ready,false);assert.deepEqual(Array.from(messages.at(-1).missing),['./data/pack-14.js']);
  await w.dispatch('message',{source,data:{type:'CACHE_REPAIR'}});
  assert.equal(messages.at(-1).type,'CACHE_FINISHED');assert.equal(messages.at(-1).ready,true);
});

test('Offline navigation falls back to cached homepage',async()=>{
  const w=worker();await w.dispatch('install');w.setOffline();
  const response=await w.dispatch('fetch',{request:{url:'https://offline.test/consultation',method:'GET',mode:'navigate'}});
  assert.equal(response.status,200);assert.match(await response.text(),/lang="fa" dir="rtl"/);
});

// Cloudflare follows /index.html -> / during precaching. A navigation with
// redirect mode manual cannot consume that followed-redirect response.
test('Installed app can launch offline at legacy index URL after Cloudflare redirect',async()=>{
  const w=worker({redirectIndex:true});await w.dispatch('install');w.setOffline();
  const response=await w.dispatch('fetch',{request:{url:'https://offline.test/index.html',method:'GET',mode:'navigate',redirect:'manual'}});
  assert.equal(response.status,200);assert.equal(response.redirected,false);
  assert.match(await response.text(),/lang="fa" dir="rtl"/);
});

test('New installs launch at the canonical root and retain their app identity',async()=>{
  const manifest=JSON.parse(await fs.readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.start_url,'./');assert.equal(manifest.id,'./index.html');
});
