const crypto=require('crypto');
const {state,save}=require('../lib/imeiCenter/store');
const {invoice}=require('../lib/imeiCenter/core');
const ENDPOINT='https://sinyalku.my.id/api/dhru';
function getAccount(group){return state.settings.apiAccounts[group]}
function newKey(){return 'sk_'+crypto.randomBytes(32).toString('hex')}
function createAccount(group){
 let a=getAccount(group);
 if(a)return a;
 const index=Object.keys(state.settings.apiAccounts).length+1;
 const username='seller_'+index.toString().padStart(4,'0')+'_'+crypto.randomBytes(3).toString('hex');
 a={username,key:newKey(),enabled:true,createdAt:new Date().toISOString()};
 state.settings.apiAccounts[group]=a;save();return a;
}
module.exports={commands:['apikey','api'],registered:false,async run({sock,msg,reply,command,args,isOwner}){
 const group=msg.key.remoteJid;
 if(!group?.endsWith('@g.us'))return reply('❌ Gunakan di grup seller.');
 const seller=state.settings.sellerGroups[group];
 if(!seller)return reply('🔒 Grup seller belum terdaftar.');
 const a=String(args[0]||'').toLowerCase();
 if(command==='apikey'){
  const account=createAccount(group);
  return reply([
   '🌐 *PROVIDER PUSAT*',
   '━━━━━━━━━━━━━━━━',
   '🔐 *DHRU API • SELLER*',
   '',
   '👤 *USERNAME*',
   account.username,
   '',
   '🔑 *API KEY*',
   account.key,
   '',
   '🔗 *ENDPOINT*',
   ENDPOINT,
   '',
   '━━━━━━━━━━━━━━━━',
   '📡 Status : '+(state.settings.apiGlobalEnabled&&account.enabled?'🟢 ACTIVE':'🔴 OFFLINE'),
   '💳 Billing : POSTPAID',
   '━━━━━━━━━━━━━━━━',
   '🔒 _Simpan API key dengan aman._'
  ].join('\n'));
 }
 if(a==='global'){
  if(!isOwner)return reply('❌ Khusus owner.');
  if(!['on','off'].includes(args[1]))return reply('/api global on|off');
  state.settings.apiGlobalEnabled=args[1]==='on';save();return reply('✅ DHRU API GLOBAL '+args[1].toUpperCase());
 }
 if(a==='on'||a==='off'){
  if(!isOwner)return reply('❌ Khusus owner.');
  const account=createAccount(group);account.enabled=a==='on';save();return reply('✅ DHRU API grup '+a.toUpperCase());
 }
 if(a==='reset'){
  if(!isOwner)return reply('❌ Reset API key hanya untuk owner.');
  const account=getAccount(group);if(!account)return reply('❌ Buat dahulu dengan /apikey');
  if(args[1]!=='confirm')return reply('⚠️ API key lama akan langsung dinonaktifkan. Ketik /api reset confirm');
  account.key=newKey();account.resetAt=new Date().toISOString();save();const recipient=msg.key.participantPn||msg.key.senderPn||msg.key.participantAlt||msg.key.participant||msg.key.remoteJid;
  if(!recipient||recipient.endsWith('@g.us')||recipient.endsWith('@lid'))return reply('⚠️ Key berhasil direset, tetapi nomor penerima tidak dapat diverifikasi. Hubungi owner secara privat.');
  try{await sock.sendMessage(recipient,{text:'🔐 *API KEY BARU*\\n👤 '+account.username+'\\n🔑 '+account.key+'\\n🌐 '+ENDPOINT});return reply('✅ API key berhasil direset. Kredensial baru dikirim melalui chat pribadi.')}catch(e){return reply('⚠️ API key direset, tetapi gagal mengirim pesan privat. Hubungi owner.')}
 }
 if(a==='docs'){
  const endpoint=ENDPOINT;
  return reply([
   '╭──〔 📘 DHRU API DOCS 〕',
   '│ 🤖 SUPER-BOT • POSTPAID',
   '│ 🌐 '+endpoint,
   '│ 📡 Method: POST',
   '│ 📦 Body: JSON / form-urlencoded',
   '├── 🔐 AUTHENTICATION',
   '│ username: username grup seller',
   '│ apiaccesskey: API key grup',
   '│ /apikey → lihat / buat akun',
   '├── 📋 ACTIONS',
   '│ accountinfo → informasi akun',
   '│ imeiservicelist → daftar layanan',
   '│ placeimeiorder → buat order',
   '│ orderstatus → cek satu order',
   '│ orderstatusbulk → cek banyak order',
   '├── 📲 CONTOH ORDER',
   '│ action: placeimeiorder',
   '│ service: 3b / 1b / 3bs / 3bd',
   '│ imei: 354542501034022',
   '│ + username dan apiaccesskey',
   '├── 📤 CONTOH RESPONSE',
   '│ {"SUCCESS":{"ORDERID":"DH...","STATUS":"PROCESSING"}}',
   '├── 🔎 CEK STATUS',
   '│ action: orderstatus',
   '│ orderid: DH...',
   '│ SUCCESS / FAILED / PROCESSING',
   '│ CANCELLED → owner reply /cancel',
   '├── ⏳ PROSES',
   '│ Order tetap PROCESSING sampai',
   '│ AirBot membalas atau owner cancel.',
   '│ Tidak ada timeout otomatis.',
   '│ Biaya hanya jika SUCCESS.',
   '├── 🛠️ COMMANDS',
   '│ /api status • /apikey',
   '╰── /api docs • SUPER-BOT'
  ].join('\n'));
 }
 if(a==='status')return reply('📡 DHRU API : '+(state.settings.apiGlobalEnabled?'GLOBAL ON':'GLOBAL OFF')+'\n👥 Grup : '+(getAccount(group)?.enabled===false?'OFF':'ON')+'\n💳 '+invoice(group).split('│ 💵 TOTAL : ')[1]?.split('\n')[0]);
 return reply(isOwner?'Perintah: /apikey, /api docs, /api status, /api reset confirm, /api on|off, /api global on|off':'Perintah: /apikey, /api docs, /api status');
}};