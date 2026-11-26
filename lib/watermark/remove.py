import cv2, numpy as np, subprocess, sys, re, os
from PIL import Image
import pytesseract

src, dst, kind = sys.argv[1:4]
# Conservative detection: recognizable platform text near an edge.
def mask_for(frame):
    h,w=frame.shape[:2]
    scale=min(2.0,1600/max(h,w))
    im=cv2.resize(frame,None,fx=scale,fy=scale)
    d=pytesseract.image_to_data(cv2.cvtColor(im,cv2.COLOR_BGR2RGB),config='--psm 11',output_type=pytesseract.Output.DICT,timeout=15)
    mask=np.zeros((h,w),np.uint8)
    for i,t in enumerate(d['text']):
        token=re.sub(r'[^a-z0-9]','',t.lower())
        if token not in ('tiktok','capcut','inshot','filmora','kinemaster','watermark','vivavideo','viva video'): continue
        if float(d['conf'][i])<45: continue
        x,y,bw,bh=[int(d[k][i]/scale) for k in ('left','top','width','height')]
        if not (x<w*.22 or x+bw>w*.78 or y<h*.18 or y+bh>h*.82): continue
        p=max(3,int(bh*.18))
        cv2.rectangle(mask,(max(0,x-p),max(0,y-p)),(min(w-1,x+bw+p),min(h-1,y+bh+p)),255,-1)
    return mask

if kind=='image':
    frame=cv2.imread(src)
    if frame is None or frame.shape[0]*frame.shape[1]>16000000: raise ValueError('Foto tidak didukung atau terlalu besar')
    mask=mask_for(frame)
    if not mask.any(): sys.exit(3)
    if not cv2.imwrite(dst,cv2.inpaint(frame,mask,4,cv2.INPAINT_TELEA),[cv2.IMWRITE_JPEG_QUALITY,95]): raise ValueError('Gagal menyimpan foto')
else:
    cap=cv2.VideoCapture(src)
    fps=cap.get(cv2.CAP_PROP_FPS)
    n=int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    w=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); h=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if not (0<fps<=60 and 0<n<=fps*30 and 0<w*h<=1920*1080): raise ValueError('Video maksimal 30 detik dan 1080p')
    masks=[]
    for pos in sorted(set([0,n//4,n//2,3*n//4,max(0,n-1)])):
        cap.set(cv2.CAP_PROP_POS_FRAMES,pos)
        ok,frame=cap.read()
        if ok: masks.append(mask_for(frame))
    if not masks or not masks[0].any(): sys.exit(3)
    mask=masks[0]
    for m in masks[1:]:
        union=np.count_nonzero(cv2.bitwise_or(mask,m))
        if not union or np.count_nonzero(cv2.bitwise_and(mask,m))/union<.55: sys.exit(3)
        mask=cv2.bitwise_or(mask,m)
    cap.set(cv2.CAP_PROP_POS_FRAMES,0)
    proc=subprocess.Popen(['ffmpeg','-nostdin','-y','-loglevel','error','-f','rawvideo','-pix_fmt','bgr24','-s',f'{w}x{h}','-r',str(fps),'-i','pipe:0','-i',src,'-map','0:v:0','-map','1:a:0?','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',dst],stdin=subprocess.PIPE)
    try:
        for _ in range(n):
            ok,frame=cap.read()
            if not ok: break
            proc.stdin.write(cv2.inpaint(frame,mask,4,cv2.INPAINT_TELEA).tobytes())
        proc.stdin.close()
        if proc.wait()!=0: raise ValueError('FFmpeg gagal')
    finally:
        cap.release()
        if proc.poll() is None: proc.kill(); proc.wait()
