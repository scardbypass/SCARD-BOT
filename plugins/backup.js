const fs=require('fs');const path=require('path');const os=require('os');const {execFile}=require('child_process');
function zipBackup(root,output){
 return new Promise((resolve,reject)=>{
  execFile('zip',['-r',output,'database','plugins','lib','index.js','package.json','package-lock.json','.env.example','README.md','-x','sessions/*','.env','node_modules/*','*.log'],{cwd:root,timeout:120000},err=>err?reject(err):resolve());
 });
}
module.exports={
 commands:['backup'],registered:true,ownerOnly:true,menuSection:'OWNER',menu:'/backup',
 async run({sock,msg,reply}){
  const root=path.join(__dirname,'..');const name='scard-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.zip';const output=path.join(os.tmpdir(),name);
  await reply('💾 Membuat backup SCARD-BOT...');
  try{
   await zipBackup(root,output);
   const stat=fs.statSync(output);
   await sock.sendMessage(msg.key.remoteJid,{document:fs.readFileSync(output),fileName:name,mimetype:'application/zip',caption:'💾 *SCARD-BOT BACKUP*\nUkuran: '+(stat.size/1024/1024).toFixed(2)+' MB\n\n🔐 .env dan sessions tidak disertakan.'},{quoted:msg});
  }catch(err){
   console.error('[BACKUP]',err.message);return reply('❌ Backup gagal. Pastikan package "zip" sudah terinstall di VPS.');
  }finally{try{if(fs.existsSync(output))fs.unlinkSync(output)}catch{}}
 }
};
