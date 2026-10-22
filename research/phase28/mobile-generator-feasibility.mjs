/**
 * Phase 28: policy-driven *feasibility* screen for pretrained hair generators.
 * This file does NOT load weights, validate real image quality or grant
 * commercial/legal permission. Inputs are evidence claims, never certificates.
 */
const RE = /^[a-f0-9]{64}$/;
const ext = /\.(onnx|ort|tflite)$/i;
const DEFAULTS = Object.freeze({
 maxPackBytes: 384*1024*1024, // HANANEH ENGINEERING target, not an Android API limit
 maxPeakRuntimeBytes: 1024*1024*1024, // only independently measured memory
 maxP95InferenceMs: 15000, // salon UX target, not a published benchmark
 minIndependentSubjects: 10,
});
const reason=(code,detail)=>({code,detail});
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const isSafePath=p=>typeof p==='string'&&p.length>4&&p.length<240&&
 !p.startsWith('/')&&!p.includes('\\')&&!p.split('/').some(x=>x==='..'||x==='.'||!x)&&
 ext.test(p);
const validatePolicy=p=>p&&Object.values(p).every(x=>finite(x)&&x>=0)&&p.maxPackBytes>=1024;
export function evaluateMobileGeneratorPack(candidate,policy=DEFAULTS){
 if(!validatePolicy(policy))throw new TypeError('Invalid research device budget');
 const failures=[];
 if(candidate?.schema!=='HANANEH-MOBILE-MODEL-PACK-v1')failures.push(reason('SCHEMA','Unsupported or missing model pack schema'));
 if(candidate?.task!=='reference-hairstyle-transfer')failures.push(reason('TASK','Not a specific reference-guided hairstyle generator'));
 const runtime=candidate?.runtime;
 if(!runtime||runtime.target!=='android-chromium-pwa'||
  !['wasm','webgpu'].includes(runtime.backend)||runtime.library!=='onnxruntime-web'&&runtime.library!=='mediapipe-tasks')
  failures.push(reason('RUNTIME','No supported mobile browser runtime asserted'));
 const assets=candidate?.assets;
 let declaredBytes=0;
 if(!Array.isArray(assets)||assets.length===0||assets.length>100||
  candidate?.inventoryComplete!==true)
  failures.push(reason('INVENTORY','No complete audited runtime asset inventory'));
 else{
  const seen=new Set();
  for(const a of assets){
   if(!a||!isSafePath(a.path)||seen.has(a.path)||
    !Number.isSafeInteger(a.bytes)||a.bytes<4096||
    !RE.test(a.sha256||'')){
    failures.push(reason('ASSET_METADATA','Malformed runtime asset path/size/checksum'));continue;
   }
   seen.add(a.path);
   declaredBytes+=a.bytes;
   if(!Number.isSafeInteger(declaredBytes))
    failures.push(reason('SIZE_OVERFLOW','Untrusted pack size sum'));
   if(a.licenseReview!=='independently-commercial-cleared'||
    a.checkpointProvenance!=='independently-reviewed')
    failures.push(reason('RIGHTS','Some runtime weights lack independent commercial and provenance review'));
   if(/\.(pkl|pt|pth|pickle|bin)$/i.test(a.path))
    failures.push(reason('SERIALIZATION','No untrusted Python checkpoint deserialization in PWA'));
  }
 }
 if(candidate?.reportedUpstreamBytes>policy.maxPackBytes)
  failures.push(reason('PUBLISHED_MODEL_SIZE','Published upstream weights exceed mobile packaging target; no small student verified'));
 if(declaredBytes>policy.maxPackBytes)
  failures.push(reason('BROWSER_PACK_SIZE','Pack exceeds declared salon download budget'));
 const measured=candidate?.measurements;
 if(measured?.platform!=='physical-android-chrome'||
   measured?.offlineModelAndPortraitRun!==true||
   measured?.offlineExternalRequests!==0||
   measured?.browserNoServerInference!==true)
   failures.push(reason('PHYSICAL_OFFLINE','Offline Android Chrome inference not independently measured'));
 if(!finite(measured?.peakProcessBytes)||measured.peakProcessBytes<=0||
    measured.peakProcessBytes>policy.maxPeakRuntimeBytes)
   failures.push(reason('PEAK_MEMORY','No acceptable measured peak runtime memory'));
 if(!finite(measured?.p95InferenceMs)||measured.p95InferenceMs<=0||
    measured.p95InferenceMs>policy.maxP95InferenceMs)
   failures.push(reason('LATENCY','No acceptable physical-phone inference p95'));
 const q=candidate?.quality;
 if(!q||q.independentSubjectCount<policy.minIndependentSubjects||
   q.blindedHumanFidelityApproved!==true||
   q.faceIdentityIndependentReviewPassed!==true||
   q.hairlineArtifactsReviewed===false||q.hairlineArtifactsReviewed===undefined)
   failures.push(reason('INDEPENDENT_QUALITY','Missing enough independently consented human-reviewed portrait results'));
 if(q?.hairlineArtifactsReviewed!==true)
   failures.push(reason('HAIRLINE','Hairline/occlusion review not accepted'));
 // Even an apparently positive self-reported manifest never grants a legal
 // release or vouches for uploaded data; independent authorization outside
 // the JSON is required. This module only reports technical preflight.
 const codes=[...new Set(failures.map(f=>f.code))];
 return {
  schema:'HANANEH-MOBILE-FEASIBILITY-v1',
  candidateId:typeof candidate?.id==='string'&&candidate.id.length<=100?candidate.id:'unknown',
  assumptions:{...policy},
  declaredBytes:Number.isSafeInteger(declaredBytes)?declaredBytes:null,
  reportedUpstreamBytes:Number.isSafeInteger(candidate?.reportedUpstreamBytes)?candidate.reportedUpstreamBytes:null,
  technicalPreflightPassed:codes.length===0,
  legalClearanceVerified:false,modelBytesIndependentlyVerified:false,
  scientificImageQualityVerified:false,
  readyForAndroidDeployment:false,commercialReleaseAllowed:false,
  blockers:codes,details:failures,
  caveat:'Claims in model manifests are not licenses, phone measurements or human ratings. A true deployment gate requires independent external verification.'
 };
}
export const DEFAULT_MOBILE_GENERATOR_POLICY=DEFAULTS;
