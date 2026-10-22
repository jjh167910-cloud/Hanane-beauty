#!/usr/bin/env python3
"""Optional Phase 27 output AB examiner. Offline, local-only; never certifies realism.

Requires Pillow on the reviewer's computer: python -m pip install Pillow
Every input is already aligned to exactly the same pixel coordinates; do NOT
mistake absolute pixel drift for verified ArcFace identity or human preference.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import statistics

def digest(p):
    h=sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def load(root, rel, mode):
    from PIL import Image
    if not isinstance(rel,str) or not rel or Path(rel).is_absolute():
        raise ValueError("Review assets must have relative paths")
    p=(root/rel).resolve()
    if not p.is_relative_to(root.resolve()) or not p.is_file():
        raise ValueError("Review asset missing or outside local data root")
    im=Image.open(p)
    im.load()
    if im.width<256 or im.height<256 or im.width*im.height>2048*2048:
        raise ValueError("Unusable review image dimensions")
    return im.convert(mode),digest(p)

def main():
    a=argparse.ArgumentParser()
    a.add_argument("--review-json",type=Path,required=True)
    a.add_argument("--data-root",type=Path,required=True)
    a.add_argument("--report",type=Path,required=True)
    a.add_argument("--contact-sheet",type=Path,required=True)
    args=a.parse_args()
    try:
        from PIL import Image,ImageDraw
    except ImportError:
        raise SystemExit("PHASE27_NOT_SCORED: Pillow not installed (not included in salon PWA)")
    raw=json.loads(args.review_json.read_text(encoding="utf-8"))
    if raw.get("schema")!="HANANEH-PHASE27-REVIEW-v1" or not isinstance(raw.get("cases"),list):
        raise SystemExit("PHASE27_NOT_SCORED: Invalid image review manifest")
    if not 1<=len(raw["cases"])<=50:
        raise SystemExit("PHASE27_NOT_SCORED: 1-50 local cases required")
    root=args.data_root.resolve()
    rows=[];tiles=[];seen=set()
    try:
        for c in raw["cases"]:
            cid=c["case_id"]
            if not isinstance(cid,str) or not cid.isascii() or not cid.replace("-","").replace("_","").isalnum() or cid in seen:
                raise ValueError("Invalid/duplicate case ID")
            seen.add(cid)
            source,hs=load(root,c["source_aligned"],"RGB")
            old,hb=load(root,c["phase26_aligned"],"RGB")
            generated,hg=load(root,c["candidate_aligned"],"RGB")
            protected,hm=load(root,c["independent_face_protect_mask"],"L")
            if not (source.size==old.size==generated.size==protected.size):
                raise ValueError(f"{cid}: Missing pixel-perfect registration to the source face")
            w,h=source.size
            src=list(source.getdata());base=list(old.getdata());gen=list(generated.getdata())
            mask=list(protected.getdata())
            # Manual facial mask is required; arbitrary segmentation alone
            # cannot establish identity. If nearly empty, refuse comparison.
            face=[i for i,v in enumerate(mask) if v>=240]
            if len(face)<int(w*h*.03):
                raise ValueError(f"{cid}: Insufficient independently protected facial region")
            def mae(a,b):
                return round(sum(abs(a[i][k]-b[i][k]) for i in face for k in range(3))/
                  (len(face)*3),4)
            candidate=mae(src,gen);baseline=mae(src,base)
            # This metric only captures *pixel difference* at the protected
            # face; generative edits and minor misalignment confound it.
            results={
                "case_id":cid,"source_sha256":hs,
                "phase26_sha256":hb,"candidate_sha256":hg,
                "manual_mask_sha256":hm,"protected_face_pixels":len(face),
                "protected_face_rgb_mae_phase26":baseline,
                "protected_face_rgb_mae_candidate":candidate,
                "candidate_minus_phase26_mae":round(candidate-baseline,4),
                "identity_embedding_similarity":None,
                "natural_hairline_human_rating":None,
                "reference_style_fidelity_human_rating":None,
                "perceptual_realism_human_rating":None,
                "commercial_go":False,
                "quality_grade":"NOT_RATED"
            }
            rows.append(results)
            # Deliberately labeled contact sheet for OFFLINE human review,
            # not a customer hair-try-on result or a publishable evidence set.
            dim=(320,320)
            imgs=[]
            for title,im in [("SOURCE",source),("PHASE26 BASELINE",old),
                             ("HAIRFAST CANDIDATE",generated)]:
                thumb=Image.new("RGB",(320,360),"white")
                im.thumbnail(dim)
                thumb.paste(im,((320-im.width)//2,20))
                d=ImageDraw.Draw(thumb)
                d.rectangle((0,327,320,360),fill=(40,35,34))
                d.text((9,335),title,fill=(255,255,255))
                imgs.append(thumb)
            tile=Image.new("RGB",(960,392),"white")
            for i,item in enumerate(imgs):tile.paste(item,(i*320,25))
            ImageDraw.Draw(tile).text((12,4),f"UNRATED LOCAL RESEARCH / {cid}",fill=(140,25,25))
            tiles.append(tile)
        sheet=Image.new("RGB",(960,392*len(tiles)),"white")
        for i,tile in enumerate(tiles):sheet.paste(tile,(0,i*392))
        report={"schema":"HANANEH-PHASE27-QA-v1",
           "observed_case_count":len(rows),
           "portrait_authorization_verified_by_assessor":False,
           "identity_verified_with_face_embedding":False,
           "blinded_human_scores_collected":False,
           "commercial_go":False,"android_pwa_verified":False,
           "interpretation":"Aligned protected-face pixel differences, not beauty/identity certification",
           "records":rows}
        args.report.parent.mkdir(parents=True,exist_ok=True)
        args.contact_sheet.parent.mkdir(parents=True,exist_ok=True)
        args.report.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
        sheet.save(args.contact_sheet,format="PNG")
        print(json.dumps({"cases":len(rows),"commercial_go":False,
           "report":str(args.report),"local_contact_sheet":str(args.contact_sheet)}))
    except (ValueError,KeyError,OSError) as error:
        raise SystemExit("PHASE27_NOT_SCORED: "+str(error))
if __name__=="__main__":
    main()
