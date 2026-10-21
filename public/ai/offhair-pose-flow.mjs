/* OffHair exploratory synthetic head-flow predictor; never a real head-shape model. */
const finite=Number.isFinite;
export const FEATURE_NAMES=Object.freeze(['nose_difference','ear_difference',
'nose_difference_times_v','ear_difference_times_v',
'nose_difference_times_u','ear_difference_times_u',
'nose_difference_times_u2','ear_difference_times_u2',
'nose_difference_times_uv','ear_difference_times_uv',
'nose_square_difference','ear_square_difference',
'nose_square_difference_times_v','ear_square_difference_times_v',
'nose_square_difference_times_uv','ear_square_difference_times_uv']);
export function flowFeatures(u,v,s,r){
 if(![u,v,s?.noseBias,s?.earBias,r?.noseBias,r?.earBias].every(finite))throw TypeError('Missing observed geometry');
 const dn=s.noseBias-r.noseBias,de=s.earBias-r.earBias;
 const qn=s.noseBias**2-r.noseBias**2,qe=s.earBias**2-r.earBias**2;
 return [dn,de,dn*v,de*v,dn*u,de*u,dn*u*u,de*u*u,
  dn*u*v,de*u*v,qn,qe,qn*v,qe*v,qn*u*v,qe*u*v];
}
function solve(a,b){
 const n=b.length,m=Array.from({length:n},(_,i)=>[...a[i],b[i]]);
 for(let i=0;i<n;i++){
  let pivot=i;for(let k=i+1;k<n;k++)if(Math.abs(m[k][i])>Math.abs(m[pivot][i]))pivot=k;
  if(Math.abs(m[pivot][i])<1e-12)throw Error('Ill-conditioned normal equations');
  [m[pivot],m[i]]=[m[i],m[pivot]];
  const p=m[i][i];for(let j=i;j<=n;j++)m[i][j]/=p;
  for(let k=0;k<n;k++)if(k!==i){
   const factor=m[k][i];for(let j=i;j<=n;j++)m[k][j]-=factor*m[i][j];
  }
 }
 return m.map(row=>row[n]);
}
export function fitPoseFlow(samples,{ridge=.02}={}){
 if(!Array.isArray(samples)||samples.length<64)throw TypeError('Need 64+ supervised synthetic examples');
 if(!finite(ridge)||ridge<=0||ridge>100)throw TypeError('Invalid regularizer');
 const n=FEATURE_NAMES.length,xtx=Array.from({length:n},()=>new Float64Array(n));
 const xTy=[new Float64Array(n),new Float64Array(n)];
 for(const item of samples){
  const x=flowFeatures(item.u,item.v,item.source,item.reference);
  if(![item.dx,item.dy].every(finite)||Math.max(...x.map(Math.abs))>100)throw TypeError('Invalid training target');
  for(let i=0;i<n;i++){
   xTy[0][i]+=x[i]*item.dx;xTy[1][i]+=x[i]*item.dy;
   for(let j=0;j<n;j++)xtx[i][j]+=x[i]*x[j];
  }
 }
 for(let i=0;i<n;i++)xtx[i][i]+=ridge;
 return {schema:'OFFHAIR-SYNTHETIC-POSE-FLOW-v1',features:[...FEATURE_NAMES],
  coefficients:xTy.map(rhs=>solve(xtx,rhs)),trainingExamples:samples.length,
  regularization:ridge,syntheticOnly:true,
  validatedOnRealHeadGeometry:false,trainedHairstyleGenerator:false};
}
export function predictPoseFlow(model,u,v,source,reference){
 if(model?.schema!=='OFFHAIR-SYNTHETIC-POSE-FLOW-v1'||
 model.features?.join('|')!==FEATURE_NAMES.join('|')||
 !Array.isArray(model.coefficients)||model.coefficients.length!==2||
 model.coefficients.some(a=>!Array.isArray(a)||a.length!==FEATURE_NAMES.length||a.some(c=>!finite(c))))
 throw TypeError('Invalid pose-flow model');
 const f=flowFeatures(u,v,source,reference);
 return model.coefficients.map(coef=>coef.reduce((sum,c,i)=>sum+c*f[i],0));
}
export function projectToFrame(u,v,face){
 const {cx,cy,scale,roll}=face||{};
 if(![u,v,cx,cy,scale,roll].every(finite)||scale<=0)throw TypeError('Invalid frame');
 const a=Math.cos(roll),b=Math.sin(roll);
 return [cx+scale*(u*a-v*b),cy+scale*(u*b+v*a)];
}
export function fromFrame(x,y,face){
 const {cx,cy,scale,roll}=face||{};
 if(![x,y,cx,cy,scale,roll].every(finite)||scale<=0)throw TypeError('Invalid frame');
 const a=Math.cos(roll),b=Math.sin(roll),dx=(x-cx)/scale,dy=(y-cy)/scale;
 return [dx*a+dy*b,-dx*b+dy*a];
}
export function transferSupportMask(referenceMask,width,height,source,reference,{model=null,mode='similarity'}={}){
 if(!(referenceMask instanceof Uint8Array)||referenceMask.length!==width*height||
 !Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||width*height>1e6)
 throw TypeError('Invalid input mask dimensions');
 if(!['eye-scale','similarity','learned'].includes(mode))throw TypeError('Invalid flow mode');
 if(mode==='learned'&&!model)throw TypeError('Learned mode requires trained weights');
 const result=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const [u,v]=fromFrame(x+.5,y+.5,mode==='eye-scale'?{...source,roll:0}:source);
  let refU=u,refV=v;
  if(mode==='learned')for(let k=0;k<3;k++){
   const [dx,dy]=predictPoseFlow(model,refU,refV,source,reference);
   refU=u-dx;refV=v-dy;
  }
  const [xx,yy]=projectToFrame(refU,refV,mode==='eye-scale'?{...reference,roll:0}:reference);
  const ix=Math.floor(xx),iy=Math.floor(yy);
  if(ix>=0&&ix<width&&iy>=0&&iy<height)result[y*width+x]=referenceMask[iy*width+ix];
 }
 return result;
}
export function maskMetrics(pred,truth){
 if(!(pred instanceof Uint8Array)||!(truth instanceof Uint8Array)||pred.length!==truth.length)
 throw TypeError('Masks mismatch');
 let intersection=0,union=0,fp=0,fn=0;
 for(let i=0;i<pred.length;i++){
  const p=pred[i]>0,t=truth[i]>0;
  if(p&&t)intersection++;if(p||t)union++;if(p&&!t)fp++;if(!p&&t)fn++;
 }
 return {iou:union?intersection/union:null,intersection,union,falsePositive:fp,falseNegative:fn};
}
/** MediaPipe 2D landmark observation. This is NOT head yaw or 3D geometry. */
export function observationFromFaceAnchor(face,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||
 !face||![face.eyeX,face.eyeY,face.eyeSpan,face.eyeRollRadians,face.noseX].every(finite)||
 !Array.isArray(face.earPoints)||face.earPoints.length!==2||
 !face.earPoints.every(p=>[p?.x,p?.y].every(finite))||
 face.eyeSpan<.045||face.eyeSpan>.4)return {ok:false,reason:'insufficient_observed_face_landmarks'};
 const noseBias=(face.noseX-face.eyeX)/face.eyeSpan;
 const earBias=((face.earPoints[0].x+face.earPoints[1].x)/2-face.eyeX)/face.eyeSpan;
 if(![noseBias,earBias].every(finite)||Math.abs(noseBias)>.42||Math.abs(earBias)>.78)
 return {ok:false,reason:'observed_geometry_outside_synthetic_training_support',noseBias,earBias};
 return {ok:true,source:'MediaPipe_2D_landmarks',noseBias,earBias,
  frame:{cx:face.eyeX*width,cy:face.eyeY*height,
   scale:face.eyeSpan*width,roll:face.eyeRollRadians},
  validatedOnRealHeadGeometry:false};
}
/** Face conflicts always prevent automatic use, regardless of synthetic model score. */
export function gateTargetSupport(targetMask,protectedCoreMask,unresolvedMask){
 if(!(targetMask instanceof Uint8Array)||!(protectedCoreMask instanceof Uint8Array)||
 !(unresolvedMask instanceof Uint8Array)||targetMask.length!==protectedCoreMask.length||
 targetMask.length!==unresolvedMask.length)throw TypeError('Mismatched face safety masks');
 let protectedConflicts=0,foreheadUnresolved=0,hairPixels=0;
 for(let i=0;i<targetMask.length;i++)if(targetMask[i]){
  hairPixels++;
  if(protectedCoreMask[i])protectedConflicts++;
  if(unresolvedMask[i])foreheadUnresolved++;
 }
 return {automaticEditingAllowed:false,requiresManualReview:true,
  protectedConflicts,foreheadUnresolved,hairPixels,
  trainingEvidenceOnly:true,
  reason:protectedConflicts?'proposed_target_hair_intersects_protected_features':
   foreheadUnresolved?'target_fringe_forehead_occlusion_unvalidated':'target_geometry_not_independently_validated'};
}
