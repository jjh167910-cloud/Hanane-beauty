/**
 * Dedicated on-device neural background-reconstruction worker.
 * The image and mask are ArrayBuffers received from the PWA, never uploaded.
 * Memory policy: sequential single-flight jobs, one WASM thread.
 */
const MODEL_DIGEST='6f1f3530a1a2324b19752018ce756088b07973cda8d7d890034ace5c8a48c40b';
const PARTS=['model-part-00.bin','model-part-01.bin','model-part-02.bin'];
let sessionPromise=null,running=false;
async function initialize(){
 const runtime=await import('./inpaint/runtime/ort.wasm.min.mjs');
 const ort=runtime.InferenceSession?runtime:runtime.default;
 if(!ort?.InferenceSession||!ort?.Tensor)throw Error('Local ONNX Runtime unavailable');
 ort.env.wasm.wasmPaths=new URL('./inpaint/runtime/',import.meta.url).href;
 ort.env.wasm.numThreads=1;
 ort.env.wasm.proxy=false;
 const parts=[];
 let size=0;
 for(const name of PARTS){
  const response=await fetch(new URL('./inpaint/'+name,import.meta.url),{cache:'force-cache'});
  if(!response.ok||response.redirected)throw Error('AI file not cached: '+name);
  const binary=new Uint8Array(await response.arrayBuffer());
  // Reject truncated or unexpectedly large cache entries before allocating a
  // second copy of the ONNX model on memory-constrained Android devices.
  if(binary.length<1024||binary.length>12*1024*1024)
   throw Error('Invalid neural model shard: '+name);
  parts.push(binary);size+=binary.length;
 }
 if(size!==28079181)throw Error('Incorrect offline neural model size: '+size);
 const binary=new Uint8Array(size);
 let offset=0;
 for(const part of parts){binary.set(part,offset);offset+=part.length;}
 if(!crypto?.subtle)throw Error('Secure checksum verification unavailable');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',binary)))
  .map(v=>v.toString(16).padStart(2,'0')).join('');
 if(digest!==MODEL_DIGEST)throw Error('AI model integrity verification failed');
 const session=await ort.InferenceSession.create(binary,{
  executionProviders:['wasm'],graphOptimizationLevel:'all',executionMode:'sequential'
 });
 // Support the known official MI-GAN v2 model only.
 if(!session.inputNames.includes('image')||!session.inputNames.includes('mask'))
  throw Error('Incompatible neural model inputs');
 return {session,ort};
}
async function run(message){
 const {session,ort}=await (sessionPromise||(sessionPromise=initialize().catch(error=>{
  sessionPromise=null;throw error;
 })));
 const width=message.width,height=message.height,n=width*height;
 if(width!==512||height!==512)throw Error('Unsupported MI-GAN crop dimensions');
 const image=new Uint8Array(message.image),mask=new Uint8Array(message.mask);
 if(image.length!==n*3||mask.length!==n)throw Error('Invalid model tensor payload');
 const tensors={
  image:new ort.Tensor('uint8',image,[1,3,height,width]),
  mask:new ort.Tensor('uint8',mask,[1,1,height,width])
 };
 const output=await session.run(tensors);
 const tensor=output.result||output[session.outputNames[0]];
 if(!tensor||tensor.type!=='uint8'||tensor.data?.length!==n*3)
  throw Error('Unexpected MI-GAN output tensor');
 const pixels=new Uint8Array(tensor.data);
 return pixels.buffer;
}
/**
 * True model smoke test: opens the actual SHA-verified ONNX weights, creates a
 * Wasm inference session and runs synthetic RGB pixels with a known hole.
 * No customer photograph is required for device compatibility testing.
 */
async function selfTest(){
 const n=512*512;
 const image=new Uint8Array(n*3);
 image.fill(160);
 const mask=new Uint8Array(n);mask.fill(255);
 for(let y=216;y<296;y++)for(let x=216;x<296;x++)mask[y*512+x]=0;
 const start=performance.now();
 const output=await run({width:512,height:512,image:image.buffer,mask:mask.buffer});
 if(output.byteLength!==n*3)throw Error('Unexpected synthetic inference output size');
 const pixels=new Uint8Array(output);
 // Input pixels are 160 gray; the official pipeline composites its output
 // onto unmasked input regions. A large mismatch means the ONNX contract or
 // tensor interpretation changed, so keep the feature locked.
 for(const i of [20*512+20,480*512+480,40*512+460]){
  for(const ch of [0,1,2])
   if(Math.abs(pixels[ch*n+i]-160)>8)
    throw Error('Synthetic inference did not preserve known image pixels');
 }
 return {durationMs:Math.round(performance.now()-start),outputBytes:output.byteLength,
  modelVerified:true,provider:'wasm'};
}
self.addEventListener('message',event=>{
 const d=event.data||{};
 if(d.type!=='RUN'&&d.type!=='SELF_TEST')return;
 if(running){self.postMessage({type:'ERROR',id:d.id,error:'Neural engine is busy'});return;}
 running=true;
 const isTest=d.type==='SELF_TEST';
 Promise.resolve().then(()=>isTest?selfTest():run(d)).then(result=>{
  if(isTest)self.postMessage({type:'TEST_RESULT',id:d.id,metrics:result});
  else self.postMessage({type:'RESULT',id:d.id,image:result},[result]);
 }).catch(e=>self.postMessage({type:'ERROR',id:d.id,error:String(e?.message||e)}))
  .finally(()=>{running=false;});
});
