import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

// Browser decoding is the only asynchronous boundary replaced here. The actual
// upload, generation, selection and drawing functions run from the shipped app.
function app(){
  const elements=new Map(),draws=[];
  const ctx={clearRect(){},fillRect(){},drawImage(...args){draws.push(args)},save(){},restore(){},translate(){},rotate(){},scale(){}};
  const element=()=>({value:0,style:{},disabled:false,textContent:'',classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},scrollIntoView(){},getContext:()=>ctx});
  const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},addEventListener(){},createElement:element};
  const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  const source=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)][0][1];
  const scope={document,window:{OFFLINE_CATALOG:[]},Intl,console,URL:{createObjectURL:()=> 'blob:photo',revokeObjectURL(){}},setTimeout,Image:class{}};
  vm.createContext(scope);vm.runInContext(source,scope);
  return {run:code=>vm.runInContext(code,scope),scope,elements,draws};
}

for(const [label,w,h,expected] of [
  ['landscape',1600,900,[0,264,768,432]],
  ['portrait',800,1600,[144,0,480,960]],
])test(`Photo upload preserves ${label} proportions without cropping`,async()=>{
  const a=app();a.scope.photo={width:w,height:h,naturalWidth:w,naturalHeight:h};
  a.run('loadImage=async()=>photo');
  await a.run("uploadFile({type:'image/jpeg',size:2000})");
  const draw=a.draws.find(d=>d[0]===a.scope.photo);
  assert.deepEqual(draw.slice(1),expected);
});

test('Replacing a photo disables export of the previous result',async()=>{
  const a=app();a.scope.photo={width:800,height:1000};
  a.run("loadImage=async()=>photo;hasResult=true;$('saveBtn').disabled=false");
  await a.run("uploadFile({type:'image/jpeg',size:2000})");
  assert.equal(a.elements.get('saveBtn').disabled,true);
});

test('A completed old render cannot overwrite a newly uploaded photo',async()=>{
  const a=app();let release;
  a.scope.pending=new Promise(r=>release=r);
  a.scope.photo={width:800,height:1000};
  a.run("userImage=photo;selected={variantIds:[1]};window.OFFLINE_IMAGES={'1':'data:image/png;base64,x'};getMask=async()=>{await pending;return {mask:{},face:null}};loadImage=async()=>photo;createHairLayer=()=>({});fitTransform=()=>{};$('scaleRange').value=100");
  const rendering=a.run('generate()');
  await a.run("uploadFile({type:'image/jpeg',size:2000})");
  release();await rendering;
  assert.equal(a.run('hasResult'),false);
  assert.equal(a.elements.get('saveBtn').disabled,true);
});

test('Dismissing a style preview retains the previously chosen style',()=>{
  const a=app();
  a.run("window.OFFLINE_IMAGES={'1':'x','2':'y'};catalog=[{id:1,name:'first',code:'A',variantIds:[1],variantNames:['first']},{id:2,name:'second',code:'B',variantIds:[2],variantNames:['second']}];selected=catalog[0];openStyle(2);closeSheet()");
  assert.equal(a.run('selected.id'),1);
});
