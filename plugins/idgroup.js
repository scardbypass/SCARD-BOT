'use strict';
module.exports={
 commands:['idgroup','idgrup'],
 registered:false,
 ownerOnly:false,
 async run({msg,reply}){
  const id=String(msg?.key?.remoteJid||'');
  if(!id.endsWith('@g.us'))return reply('❌ Perintah /idgroup hanya dapat digunakan di dalam grup WhatsApp.');
  return reply(['╭──〔 🤖 CUAN-BOT 〕','│ INFORMASI GRUP','╰──────────────────','','👥 *ID Grup Seller*','\`'+id+'\`','','📋 Salin ID grup di atas, lalu kirim ke admin CUAN-BOT untuk aktivasi layanan.','🔒 Jangan bagikan API key atau password di grup.'].join('\n'));
 }
};
