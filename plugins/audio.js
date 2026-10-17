const {execFile}=require('child_process')
const fs=require('fs')
const os=require('os')
const path=require('path')
const crypto=require('crypto')
const {getQuotedText}=require('../lib/utils')

const HOSTS=new Set(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','tiktok.com','www.tiktok.com','vm.tiktok.com','vt.tiktok.com','instagram.com','www.instagram.com','facebook.com','www.facebook.com','m.facebook.com','web.facebook.com','fb.watch'])
function sourceUrl(text){
  const found=String(text||'').match(/https?:\/\/[^\s<>]+/i)
  if(!found)return null
  try{const u=new URL(found[0]);return HOSTS.has(u.hostname.toLowerCase())?u.href:null}catch{return null}
}
function exec(command,args,timeout=180000){
  return new Promise((resolve,reject)=>execFile(command,args,{timeout,maxBuffer:1024*1024},(error,stdout,stderr)=>{
    if(error){error.details=stderr;reject(error)}else resolve(stdout)
  }))
}
async function downloader(){
  const paths=[process.env.YTDLP_PATH,'/usr/local/bin/yt-dlp','/usr/bin/yt-dlp','/root/.local/bin/yt-dlp'].filter(Boolean)
  for(const command of paths){try{await exec(command,['--version'],5000);return [command,[]]}catch{}}
  for(const command of ['python3','python']){try{await exec(command,['-m','yt_dlp','--version'],5000);return [command,['-m','yt_dlp']]}catch{}}
  throw new Error('yt-dlp belum terpasang')
}
module.exports={
  commands:['audio','mp3','dlaudio'],
  registered:false,
  menuSection:'PUBLIC',
  menu:'/audio (reply link YouTube/TikTok/Instagram/Facebook)',
  async run({sock,msg,reply}){
    const url=sourceUrl(getQuotedText(msg))
    if(!url)return reply('❌ Kirim link YouTube, TikTok, Instagram, atau Facebook, lalu reply dengan /audio')
    const dir=await fs.promises.mkdtemp(path.join(os.tmpdir(),'scard-audio-'))
    try{
      await reply('⏳ Mengambil audio dan mengonversi ke MP3...')
      await exec('ffmpeg',['-version'],5000)
      const [command,prefix]=await downloader()
      await exec(command,[...prefix,'--no-playlist','--max-filesize',process.env.DOWNLOAD_MAX_SIZE||'150M','-f','bestaudio/best','-x','--audio-format','mp3','--audio-quality','0','-o',path.join(dir,'audio.%(ext)s'),url],Number(process.env.DOWNLOAD_TIMEOUT_MS||180000))
      const files=await fs.promises.readdir(dir)
      const filename=files.find(f=>f.endsWith('.mp3'))
      if(!filename)throw new Error('Hasil konversi MP3 tidak ditemukan')
      const file=path.join(dir,filename)
      const size=(await fs.promises.stat(file)).size
      const max=Number(process.env.DOWNLOAD_MAX_BYTES||150*1024*1024)
      if(size>max)throw new Error('Ukuran MP3 melebihi batas '+Math.round(max/1024/1024)+' MB')
      await sock.sendMessage(msg.key.remoteJid,{audio:{url:file},mimetype:'audio/mpeg',ptt:false,fileName:'SUPER-BOT.mp3'},{quoted:msg})
    }catch(error){
      console.error('[AUDIO DOWNLOAD]',error.details||error.message)
      return reply('❌ Gagal mengunduh audio: '+String(error.message).slice(0,180))
    }finally{
      await fs.promises.rm(dir,{recursive:true,force:true}).catch(()=>{})
    }
  }
}
