import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const publicRoot = path.join(root, 'public');
const catalogScript = read('public/catalog.js');
const imagePacks = Array.from({length:14},(_,i)=>'public/data/pack-'+String(i+1).padStart(2,'0')+'.js');

function check(ok, explanation) {
  assert.ok(ok, explanation);
  console.log('PASS '+explanation);
}

const context = {window:{}};
vm.createContext(context);
vm.runInContext(catalogScript, context, {timeout:2000});
for (const pack of imagePacks) {
  vm.runInContext(read(pack),context,{timeout:4000});
}
const styles = context.window.OFFLINE_CATALOG;
const images = context.window.OFFLINE_IMAGES;
check(Array.isArray(styles)&&styles.length===265,'265 curated style families');
check(Object.keys(images||{}).length===270,'270 bundled hairstyle image assets');
const idSet = new Set();
const variantRefs = [];
for (const style of styles) {
  checkStyle(style);
  for (const id of style.variantIds) {
    assert.ok(!idSet.has(id),'Duplicate variant ID '+id);
    idSet.add(id);
    variantRefs.push(id);
    assert.ok(images[String(id)],'Missing image '+id);
  }
}
check(variantRefs.length===270,'All 270 source variants represented once');
for (const [id,data] of Object.entries(images)) {
  assert.ok(data.startsWith('data:image/webp;base64,'),'Unexpected image type: '+id);
  const bytes = Buffer.from(data.slice(23),'base64');
  assert.equal(bytes.toString('ascii',0,4),'RIFF','Invalid WebP RIFF header: '+id);
  assert.equal(bytes.toString('ascii',8,12),'WEBP','Invalid WebP signature: '+id);
}
check(true,'All image payloads decode as WebP files');
function checkStyle(style){
  assert.ok(Number.isInteger(style.id));
  assert.ok(style.name&&style.code&&style.category);
  assert.ok(Array.isArray(style.variantIds)&&style.variantIds.length>=1);
  assert.equal(style.variantIds.length,style.variantNames.length);
}
const html = read('public/index.html');
const manifest = JSON.parse(read('public/manifest.webmanifest'));
const sw = read('public/sw.js');
for (const p of ['catalog.js',...imagePacks.map(x=>x.slice('public/'.length))]){
  assert.ok(html.includes(p),'Missing script reference: '+p);
}
check(true,'Homepage references all required catalog packs');
check(manifest.display==='standalone'&&manifest.start_url,'PWA manifest configured');
check(sw.includes('CACHE_STATUS')&&sw.includes('CACHE_AUDIT')&&sw.includes('CACHE_REPAIR'),'Offline readiness and repair messaging');
check(!/https?:\/\//.test(html),'No external URL dependency in app shell');
for(const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)){
  const source=match[1].trim();if(!source)continue;
  new vm.Script(source,{filename:'index-inline-script.js'});
}
check(true,'All inline browser JavaScript parses');
check(fs.existsSync(path.join(publicRoot,'icons/app.svg')),'Local PWA icon exists');
console.log('QUALITY GATE PASS: all offline catalog checks completed.');
