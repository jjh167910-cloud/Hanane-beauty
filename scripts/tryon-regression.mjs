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

test('Choosing a hairstyle opens portrait picker when no photo exists',()=>{
  const a=app();let clicks=0;
  a.elements.get('photoInput').click=()=>clicks++;
  a.run("window.OFFLINE_IMAGES={'1':'x'};catalog=[{id:1,name:'first',code:'A',variantIds:[1],variantNames:['first']}];openStyle(1);chooseStyle()");
  assert.equal(clicks,1);assert.equal(a.run('selected.id'),1);
});

test('Choosing a new hairstyle reuses portrait and automatically requests preview',()=>{
  const a=app();a.scope.calls=[];
  a.run("generate=()=>calls.push(selected.id);userImage={};window.OFFLINE_IMAGES={'1':'x','2':'y'};catalog=[{id:1,name:'first',code:'A',variantIds:[1],variantNames:['first']},{id:2,name:'second',code:'B',variantIds:[2],variantNames:['second']}];openStyle(1);chooseStyle();openStyle(2);chooseStyle()");
  assert.deepEqual(a.scope.calls,[1,2]);
});

test('Portrait upload automatically previews the selected hairstyle',async()=>{
  const a=app();a.scope.calls=[];a.scope.photo={width:800,height:1000};
  a.run("loadImage=async()=>photo;selected={id:9};generate=()=>calls.push(selected.id)");
  await a.run("uploadFile({type:'image/jpeg',size:2000})");
  assert.deepEqual(a.scope.calls,[9]);assert.equal(a.run('loadingPhoto'),false);
});

test('Invalid portrait cannot generate a result with the previous photo',async()=>{
  const a=app();a.scope.calls=[];
  a.run("userImage={};selected={id:9};loadImage=async()=>{throw Error('Invalid image')};generate=()=>calls.push(selected.id)");
  await a.run("uploadFile({type:'image/jpeg',size:2000})");
  assert.deepEqual(a.scope.calls,[]);assert.equal(a.run('userImage'),null);
});

test('Rejected non-image replacement clears the old portrait and disables stale export',async()=>{
  const a=app();
  a.run("userImage={oldPhoto:true};hasResult=true;referenceLayer={};$('saveBtn').disabled=false;$('canvasPlaceholder').style.display='none'");
  await a.run("uploadFile({type:'text/plain',name:'not-a-photo.txt',size:200})");
  assert.equal(a.run('userImage'),null);
  assert.equal(a.run('hasResult'),false);
  assert.equal(a.elements.get('saveBtn').disabled,true);
  assert.equal(a.elements.get('canvasPlaceholder').style.display,'flex');
});

test('Oversized portrait replacement clears the old result before reporting an error',async()=>{
  const a=app();
  a.run("userImage={oldPhoto:true};hasResult=true;$('saveBtn').disabled=false");
  await a.run("uploadFile({type:'image/jpeg',size:19*1024*1024})");
  assert.equal(a.run('userImage'),null);
  assert.equal(a.run('hasResult'),false);
  assert.equal(a.elements.get('saveBtn').disabled,true);
});

test('Corrupt portrait leaves the canvas in an empty state',async()=>{
  const a=app();
  a.run("userImage={oldPhoto:true};hasResult=true;$('saveBtn').disabled=false;loadImage=async()=>{throw Error('corrupt')}");
  await a.run("uploadFile({type:'image/jpeg',size:2000})");
  assert.equal(a.run('userImage'),null);
  assert.equal(a.elements.get('canvasPlaceholder').style.display,'flex');
  assert.equal(a.elements.get('saveBtn').disabled,true);
});

test('Preview preserves the original face after adding the style layer',()=>{
 const a=app();
 a.scope.photo={photo:true};a.scope.hair={hair:true};a.scope.face={face:true};
 a.run("userImage=photo;referenceLayer=hair;faceLayer=face;fitted={x:300,y:300,s:1,refEyeX:200,refEyeY:150,rotation:0};$('protectFace').checked=true;$('scaleRange').value=100;$('xRange').value=0;$('yRange').value=0;$('rotRange').value=0;drawResult()");
 const stack=a.draws.map(args=>args[0]);
 assert.ok(stack.indexOf(a.scope.hair)>=0);
 assert.ok(stack.indexOf(a.scope.face)>stack.indexOf(a.scope.hair));
});

test('Face-preservation toggle can disable the overlay for fringe styles',()=>{
 const a=app();
 a.scope.photo={photo:true};a.scope.hair={hair:true};a.scope.face={face:true};
 a.run("userImage=photo;referenceLayer=hair;faceLayer=face;fitted={x:300,y:300,s:1,refEyeX:200,refEyeY:150,rotation:0};$('protectFace').checked=false;$('scaleRange').value=100;$('xRange').value=0;$('yRange').value=0;$('rotRange').value=0;drawResult()");
 assert.ok(a.draws.some(args=>args[0]===a.scope.hair));
 assert.equal(a.draws.some(args=>args[0]===a.scope.face),false);
});

test('Tilted reference and customer eyes produce bounded automatic orientation correction',()=>{
 const a=app();
 a.run("maskBox=()=>({x:.2,y:.1,w:.55,h:.40});userMask={mask:{}};referenceMask={mask:{}};faceUser={eyeX:.5,eyeY:.35,eyeDistance:.2,eyeSlope:.10};faceRef={eyeX:.5,eyeY:.35,eyeDistance:.2,eyeSlope:-.08};fitTransform()");
 const rotation=a.run('fitted.rotation');
 assert.ok(rotation>.15 && rotation<=.23);
 assert.ok(Number.isFinite(a.run('fitted.s')));
});

test('Excessive original hair exposure yields a clear caution, not a realism claim',()=>{
 const a=app();
 a.run("userMask={estimated:false};referenceMask={estimated:false};updateQualityNotice({reliable:true,fraction:.6})");
 assert.match(a.elements.get('qualityNotice').textContent,/هشدار/);
 a.run("updateQualityNotice({reliable:true,fraction:0})");
 assert.match(a.elements.get('qualityNotice').textContent,/پیش‌نمایش/);
});

test('Export includes the hairstyle even while viewing the before photo',()=>{
 const a=app();a.scope.photo={width:1600,height:2400};a.scope.hair={kind:'hairstyle'};
 a.run("selfie=photo;userImage={};referenceLayer=hair;showBefore=true;faceLayer=null;fitted={x:300,y:250,s:1,refEyeX:256,refEyeY:256,rotation:0};$('scaleRange').value=100;$('xRange').value=0;$('yRange').value=0;$('rotRange').value=0");
 const width=a.run("createExportCanvas().width");
 assert.equal(width,1536);
 assert.ok(a.draws.some(args=>args[0]===a.scope.hair));
 assert.equal(a.run("showBefore"),true);
});

test('Smaller portrait export avoids unsupported fake 2x sharpness',()=>{
 const a=app();a.scope.photo={width:720,height:1100};a.scope.hair={kind:'hairstyle'};
 a.run("selfie=photo;userImage={};referenceLayer=hair;faceLayer=null;fitted={x:300,y:250,s:1,refEyeX:256,refEyeY:256,rotation:0};$('scaleRange').value=100;$('xRange').value=0;$('yRange').value=0;$('rotRange').value=0");
 assert.equal(a.run("createExportCanvas().width"),768);
});

test('Residual hair repair stays behind the chosen hairstyle and the original face',()=>{
 const a=app();
 a.scope.photo={kind:'customer'};a.scope.repair={kind:'repair'};a.scope.hair={kind:'hairstyle'};a.scope.face={kind:'face'};
 a.run("userImage=photo;repairLayer=repair;referenceLayer=hair;faceLayer=face;fitted={x:300,y:250,s:1,refEyeX:200,refEyeY:150,rotation:0};$('repairHair').checked=true;$('protectFace').checked=true;$('scaleRange').value=100;$('xRange').value=0;$('yRange').value=0;$('rotRange').value=0;drawResult()");
 const order=a.draws.map(x=>x[0]);
 assert.equal(order.indexOf(a.scope.repair)>order.indexOf(a.scope.photo),true);
 assert.equal(order.indexOf(a.scope.hair)>order.indexOf(a.scope.repair),true);
 assert.equal(order.indexOf(a.scope.face)>order.indexOf(a.scope.hair),true);
});
test('User can turn residual hair repair off without disabling hairstyle preview',()=>{
 const a=app();a.scope.photo={kind:'customer'};a.scope.repair={kind:'repair'};a.scope.hair={kind:'hairstyle'};
 a.run("userImage=photo;repairLayer=repair;referenceLayer=hair;faceLayer=null;fitted={x:250,y:250,s:1,refEyeX:250,refEyeY:250,rotation:0};$('repairHair').checked=false;$('scaleRange').value=100;$('xRange').value=0;$('yRange').value=0;$('rotRange').value=0;drawResult()");
 assert.equal(a.draws.some(x=>x[0]===a.scope.repair),false);
 assert.equal(a.draws.some(x=>x[0]===a.scope.hair),true);
});
test('Dragging a style clears stale repair pixels before the next frame',()=>{
 const a=app();const handlers={},canvas=a.elements.get('resultCanvas');
 canvas.addEventListener=(key,fn)=>handlers[key]=fn;
 canvas.setPointerCapture=()=>{};
 canvas.getBoundingClientRect=()=>({width:768,height:960});
 a.run("hasResult=true;userImage={};repairLayer={kind:'previousRepair'};referenceLayer={};faceLayer=null;fitted={x:250,y:250,s:1,refEyeX:250,refEyeY:250,rotation:0};$('scaleRange').value=100;$('xRange').value=0;$('yRange').value=0;$('rotRange').value=0;handleDrag()");
 handlers.pointerdown({clientX:100,clientY:120,pointerId:1});
 handlers.pointermove({clientX:102,clientY:122,pointerId:1});
 assert.equal(a.run('repairLayer'),null);
});

test('Neural repair is composited between the real portrait and selected hairstyle',()=>{
 const a=app();
 a.scope.photo={kind:'customer'};a.scope.smart={kind:'neural'};a.scope.hair={kind:'hairstyle'};
 a.run("userImage=photo;neuralLayer=smart;repairLayer={kind:'basic'};referenceLayer=hair;faceLayer=null;fitted={x:300,y:250,s:1,refEyeX:200,refEyeY:150,rotation:0};$('repairHair').checked=true;['scaleRange','xRange','yRange','rotRange'].forEach((id,i)=>$(id).value=i===0?100:0);drawResult()");
 const order=a.draws.map(d=>d[0]);
 assert.ok(order.indexOf(a.scope.smart)>order.indexOf(a.scope.photo));
 assert.ok(order.indexOf(a.scope.hair)>order.indexOf(a.scope.smart));
 assert.equal(order.some(d=>d.kind==='basic'),false);
});
test('Replacing the portrait invalidates neural results and prohibits stale export',async()=>{
 const a=app();
 a.run("neuralLayer={id:'oldClient'};hasResult=true;userImage={};$('saveBtn').disabled=false");
 await a.run("uploadFile({type:'text/plain',name:'bad.txt',size:100})");
 assert.equal(a.run('neuralLayer'),null);
 assert.equal(a.elements.get('saveBtn').disabled,true);
});
test('Stylist controls invalidate neural reconstruction when head placement changes',()=>{
 const a=app();
 a.run("userImage={};selected={id:1};hasResult=true;neuralLayer={id:'old'};repairLayer=null;qualityCore=null;userMask={estimated:true};referenceMask={estimated:true};$('scaleRange').value=100;resetControls()");
 assert.equal(a.run('neuralLayer'),null);
});
test('Neural readiness never enables inference with uncertain segmentation',()=>{
 const a=app();
 a.run("neuralInstalled=true;hasResult=true;userMask={estimated:true};referenceMask={estimated:false};faceUser={eyeX:.5,eyeY:.4,eyeDistance:.2};updateNeuralButtons()");
 assert.equal(a.elements.get('neuralRun').disabled,true);
 a.run("userMask={estimated:false};updateNeuralButtons()");
 assert.equal(a.elements.get('neuralRun').disabled,false);
});

test('Large customer-versus-reference pose differences disable neural restoration',()=>{
 const a=app();
 a.run("neuralInstalled=true;neuralBusy=false;hasResult=true;userImage={};userMask={mask:{},estimated:false};referenceMask={mask:{},estimated:false};faceUser={yaw:.58,eyeX:.4,eyeY:.35,eyeDistance:.22};faceRef={yaw:.03,eyeX:.5,eyeY:.35,eyeDistance:.22};qualityCore={poseCompatibility:(u,r)=>({mismatch:Math.abs(u.yaw-r.yaw)>=.34})};updateNeuralButtons()");
 assert.equal(a.elements.get('neuralRun').disabled,true);
 assert.match(a.run("updateQualityNotice({reliable:false});$('qualityNotice').textContent"),/زاویه/);
});
