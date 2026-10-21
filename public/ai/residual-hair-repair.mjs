/**
 * Conservative, fully offline repair for SMALL residual patches of old hair.
 *
 * It is NOT semantic background synthesis. Patches are filled only when
 * nearby non-hair background is demonstrably uniform, and never when face
 * protection or model confidence is missing. Uncertain regions stay intact.
 *
 * RGBA masks use the red channel as hair confidence (0..255).
 */
export function repairSmallHairPatches(portrait, original, projected, protection, width, height) {
  const n=width*height, expected=n*4;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
     n>600000||portrait?.length!==expected||original?.length!==expected||
     projected?.length!==expected||protection?.length!==n)
    throw new TypeError('Invalid hair-repair raster dimensions');
  const patch=new Uint8ClampedArray(expected);
  const candidate=new Uint8Array(n),visited=new Uint8Array(n);
  const maxY=Math.floor(height*.78);
  let considered=0,corrected=0,rejected=0,components=0;
  // A small expansion catches hairs at the edge of the thresholded matte.
  for(let y=1;y<maxY-1;y++)for(let x=1;x<width-1;x++){
    const i=y*width+x, k=i*4;
    if(original[k]>=190&&projected[k]<70&&protection[i]<35){
      candidate[i]=1;considered++;
    }
  }
  const raw=candidate.slice();
  for(let y=2;y<maxY-2;y++)for(let x=2;x<width-2;x++){
    const i=y*width+x,k=i*4;
    if(raw[i]||original[k]<105||projected[k]>95||protection[i]>30)continue;
    if(raw[i-1]||raw[i+1]||raw[i-width]||raw[i+width])
      candidate[i]=1;
  }
  const queue=new Int32Array(n);
  const limit=Math.min(8500,Math.floor(n*.055));
  for(let i=0;i<n;i++){
    if(!candidate[i]||visited[i])continue;
    let start=0,end=1;queue[0]=i;visited[i]=1;
    // Fixed 4-connected components; avoid unsafe diagonal bridging.
    while(start<end){
      const point=queue[start++],x=point%width,y=Math.floor(point/width);
      for(const next of [x?point-1:-1,x+1<width?point+1:-1,
                         y?point-width:-1,y+1<maxY?point+width:-1]){
        if(next>=0&&candidate[next]&&!visited[next]){
          visited[next]=1;queue[end++]=next;
        }
      }
    }
    components++;
    if(end<4||end>limit){rejected++;continue;}
    // Harvest immediate known background only, never existing hair or face.
    let count=0,r=0,g=0,b=0,rr=0,gg=0,bb=0;
    let faceTouch=false;
    for(let a=0;a<end;a++){
      const index=queue[a],x=index%width,y=Math.floor(index/width);
      for(const next of [x?index-1:-1,x+1<width?index+1:-1,
                         y?index-width:-1,y+1<maxY?index+width:-1]){
        if(next<0||candidate[next])continue;
        if(protection[next]>70){faceTouch=true;continue;}
        const k=next*4;
        if(original[k]>65||projected[k]>95)continue;
        const p=portrait[k],q=portrait[k+1],t=portrait[k+2];
        r+=p;g+=q;b+=t;rr+=p*p;gg+=q*q;bb+=t*t;count++;
      }
    }
    if(faceTouch||count<12){rejected++;continue;}
    r/=count;g/=count;b/=count;
    const stdev=Math.max(
      Math.sqrt(Math.max(0,rr/count-r*r)),
      Math.sqrt(Math.max(0,gg/count-g*g)),
      Math.sqrt(Math.max(0,bb/count-b*b)));
    // Low-variance studio background only. Do not blur skin, clothes, foliage.
    if(stdev>21){rejected++;continue;}
    for(let a=0;a<end;a++){
      const index=queue[a],k=index*4,x=index%width,y=Math.floor(index/width);
      let boundaries=0;
      if(x===0||!candidate[index-1])boundaries++;
      if(x===width-1||!candidate[index+1])boundaries++;
      if(y===0||!candidate[index-width])boundaries++;
      if(y===height-1||!candidate[index+width])boundaries++;
      patch[k]=Math.round(r);patch[k+1]=Math.round(g);patch[k+2]=Math.round(b);
      patch[k+3]=boundaries?232:255;
    }
    corrected+=end;
  }
  return {patch,considered,corrected,rejected,components};
}
