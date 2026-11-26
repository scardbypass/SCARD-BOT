const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
let busy=false;
module.exports={
 commands:['hapus'],registered:true,ownerOnly:true,menu:'hapus watermark',
 async run({sock,msg,reply,args}){
  if(msg.key?.fromMe || args.join(' ').trim().toLowerCase()!=='watermark') return;
  const {normalizeMessageContent,downloadContentFromMessage}=await import('baileys');
  const c=normalizeMessageContent(msg.message)||{};
  const q=normalizeMessageContent((c.extendedTextMessage||c.imageMessage||c.videoMessage)?.contextInfo?.quotedMessage)||{};
  const media=q.imageMessage||q.videoMessage||c.imageMessage||c.videoMessage;
  const kind=(q.imageMessage||(!q.videoMessage&&c.imageMessage))?'image':'video';
  if(!media)return reply('Reply foto atau video dengan /hapus watermark');
  if(busy)return reply('Watermark remover sedang bekerja.');
  const limit=25*1024*1024;
  if(Number(media.fileLength||0)>limit || (kind==='video'&&Number(media.seconds||0)>30))return reply('Maksimal 25 MB dan video 30 detik.');
  busy=true;let dir;
  try{
   dir=await fs.mkdtemp(path.join(os.tmpdir(),'scard-wm-'));
   const src=path.join(dir,kind==='image'?'input.jpg':'input.mp4');
   const dst=path.join(dir,kind==='image'?'output.jpg':'output.mp4');
   const stream=await downloadContentFromMessage(media,kind);
   const chunks=[];let size=0;
   for await(const chunk of stream){size+=chunk.length;if(size>limit){stream.destroy?.();throw Error('File terlalu besar');}chunks.push(chunk);}
   await fs.writeFile(src,Buffer.concat(chunks));
   await reply('Memeriksa watermark...');
   const code=await new Promise((resolve,reject)=>{
    const p=spawn('/usr/bin/python3',[path.join(__dirname,'../lib/watermark/remove.py'),src,dst,kind],{stdio:['ignore','ignore','pipe']});
    let err='';p.stderr.on('data',b=>{err=(err+b.toString()).slice(-2000);});
    const timer=setTimeout(()=>p.kill('SIGTERM'),180000);
    p.once('error',e=>{clearTimeout(timer);reject(e);});
    p.once('close',c=>{clearTimeout(timer);if(c===0||c===3)resolve(c);else{console.error('[WM]',err);reject(Error('Pemrosesan gagal atau melebihi batas waktu'));}});
   });
   if(code===3)return await reply('Watermark teks tidak terdeteksi dengan yakin atau posisinya bergerak. Media tidak diubah.');
   await sock.sendMessage(msg.key.remoteJid,{[kind]:await fs.readFile(dst),caption:'Hasil penghapusan watermark'},{quoted:msg});
  }catch(e){console.error('[WM]',e.message);await reply('Gagal: '+e.message);}
  finally{if(dir)await fs.rm(dir,{recursive:true,force:true}).catch(()=>{});busy=false;}
 }
};
