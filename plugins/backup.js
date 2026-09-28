const fs=require('fs');const path=require('path');const os=require('os');const {execFile}=require('child_process');
function run(cmd,args){return new Promise((resolve,reject)=>execFile(cmd,args,{timeout:120000},(e,out,err)=>e?reject(Object.assign(e,{stderr:err})):resolve(out)))}
module.exports={
 commands:['backup'],registered:true,ownerOnly:true,menuSection:'OWNER',menu:'/backup',
 async run({sock,msg,reply}){
  const root=path.join(__dirname,'..');const name='scard-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.zip';const output=path.join(os.tmpdir(),name);
  await reply('💾 Membuat backup SCARD-BOT...');
  try{
   await run('zip',['-r',output,'database','plugins','lib','index.js','package.json','package-lock.json','.env.example','README.md','-x','sessions/*','.env','node_modules/*','*.log'],{cwd:root});
  }catch(e){
   // execFile cwd must be supplied separately; retry correctly below is intentionally handled by direct call.
   try{
    await new Promise((resolve,reject)=>execFile('zip',['-r',output,'database','plugins','lib','index.js','package.json','package-lock.json','.env.example','README.md','-x','sessions/*','.env','node_modules/*','*.log'],{cwd:root,timeout:120000},(err)=>err?reject(err):resolve()));
   }catch(err){console.error('[BACKUP]',err.message);return reply('❌ Backup gagal. Pastikan package "zip" sudah terinstall di VPS.');}
  }
  try{
   const stat=fs.statSync(output);
   await sock.sendMessage(msg.key.remoteJid,{document:fs.readFileSync(output),fileName:name,mimetype:'application/zip',caption:'💾 *SCARD-BOT BACKUP*\nUkuran: '+(stat.size/1024/1024).toFixed(2)+' MB\n\n🔐 .env dan sessions tidak disertakan.'},{quoted:msg});
  }finally{try{fs.unlinkSync(output)}catch{}}
 }
};
