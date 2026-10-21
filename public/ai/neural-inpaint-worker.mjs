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
  if(binary.length<1024)throw Error('Invalid neural model shard');
  parts.push(binary);size+=binary.length;
 }
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
self.addEventListener('message',event=>{
 const d=event.data||{};
 if(d.type!=='RUN')return;
 if(running){self.postMessage({type:'ERROR',id:d.id,error:'Neural engine is busy'});return;}
 running=true;
 Promise.resolve().then(()=>run(d)).then(buffer=>{
  self.postMessage({type:'RESULT',id:d.id,image:buffer},[buffer]);
 }).catch(e=>self.postMessage({type:'ERROR',id:d.id,error:String(e?.message||e)}))
  .finally(()=>{running=false;});
});
