const {execFile}=require('child_process')
function exec(command,args=[]){return new Promise((resolve,reject)=>execFile(command,args,{timeout:15000,maxBuffer:1024*1024},(e,out,err)=>{if(e){e.stderr=err;return reject(e)}resolve(String(out||'')+String(err||''))}))}
function clean(s){return String(s||'').replace(/(api[_-]?key|api[_-]?secret|token|authorization|password|passwd|secret)(\s*[:=]\s*)([^\s,;"']+)/gi,'$1$2***').replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]+/gi,'$1***').replace(/sk_[A-Za-z0-9_-]+/g,'***')}
module.exports={commands:['logs'],registered:true,ownerOnly:true,menu:'logs [jumlah]',async run({reply,args}){
 const n=parseInt(args?.[0],10),lines=Number.isFinite(n)?Math.min(Math.max(n,10),100):40
 const name=String(process.env.PM2_PROCESS_NAME||'SCARD-BOT').trim()
 try{let out=clean(await exec('pm2',['logs',name,'--lines',String(lines),'--nostream','--raw'])).trim()||'Tidak ada log.';if(out.length>12000)out=out.slice(-12000);return reply(`📋 *SUPER-BOT LOGS*\nProcess: ${name}\nLast: ${lines} lines\n\n```\n${out}\n````)}
 catch(e){console.error('[LOGS]',e.message);return reply('❌ Gagal membaca log PM2. Cek PM2_PROCESS_NAME di .env.')}
}}