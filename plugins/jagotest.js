'use strict';
const tls=require('node:tls');
function testGmailImap(){
 return new Promise((resolve,reject)=>{
  const user=String(process.env.JAGO_GOOGLE_EMAIL||'').trim();
  const pass=String(process.env.JAGO_GOOGLE_PASSWORD||'').replace(/\s/g,'');
  if(!user||!pass)return reject(new Error('JAGO_GOOGLE_EMAIL / JAGO_GOOGLE_PASSWORD belum diisi di .env'));
  let settled=false,buffer='',stage=0,timer;
  const socket=tls.connect({host:'imap.gmail.com',port:993,servername:'imap.gmail.com',rejectUnauthorized:true});
  const finish=(err)=>{if(settled)return;settled=true;clearTimeout(timer);socket.destroy();err?reject(err):resolve(true)};
  timer=setTimeout(()=>finish(new Error('Koneksi IMAP timeout (15 detik)')),15000);
  socket.on('error',e=>finish(new Error('Koneksi TLS/IMAP gagal: '+e.code)));
  socket.on('data',chunk=>{
   buffer+=chunk.toString('utf8');
   if(buffer.length>16000)return finish(new Error('Respons IMAP terlalu besar'));
   let pos;
   while((pos=buffer.indexOf('\r\n'))>=0){
    const line=buffer.slice(0,pos);buffer=buffer.slice(pos+2);
    if(stage===0&&/^\* OK\b/i.test(line)){
     stage=1;socket.write('A001 LOGIN '+JSON.stringify(user)+' '+JSON.stringify(pass)+'\r\n');
    }else if(stage===1&&/^A001\s+/i.test(line)){
     if(!/^A001 OK\b/i.test(line))return finish(new Error('Login Gmail IMAP ditolak. Periksa App Password dan IMAP Gmail.'));
     stage=2;socket.write('A002 LOGOUT\r\n');
    }else if(stage===2&&/^A002\s+/i.test(line)){return finish();}
   }
  });
 });
}
module.exports={commands:['jagotest'],ownerOnly:true,registered:true,menuSection:'OWNER',menu:'/jagotest',async run({msg,reply}){
 if(msg?.key?.remoteJid?.endsWith('@g.us'))return reply('❌ /jagotest hanya di chat pribadi owner.');
 try{await testGmailImap();return reply('✅ BANK JAGO • GMAIL IMAP TERHUBUNG\n🔐 TLS: OK\n📨 Login Gmail: OK\nℹ️ Ini hanya tes koneksi, belum verifikasi email transaksi atau mengaktifkan deposit otomatis.');}
 catch(e){console.error('[JAGO IMAP TEST]',e.message);return reply('❌ BANK JAGO • GMAIL IMAP GAGAL\n'+e.message);}
}};
