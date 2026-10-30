const crypto=require('crypto');
const {state,save}=require('./imeiCenter/store');
const {invoice}=require('./imeiCenter/core');
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
module.exports={commands:['apikey','api'],registered:false,async run({msg,reply,command,args,isOwner}){
 const group=msg.key.remoteJid;
 if(!group?.endsWith('@g.us'))return reply('❌ Gunakan di grup seller.');
 const seller=state.settings.sellerGroups[group];
 if(!seller)return reply('🔒 Grup seller belum terdaftar.');
 const a=String(args[0]||'').toLowerCase();
 if(command==='apikey'){
  const account=createAccount(group);
  return reply('╭──〔 DHRU API 〕\n│ 👤 Username : '+account.username+'\n│ 🔑 API Key : '+account.key+'\n│ 🌐 Endpoint : '+(process.env.DHRU_PUBLIC_URL||'Atur DHRU_PUBLIC_URL')+'\n│ 📡 Status : '+(state.settings.apiGlobalEnabled&&account.enabled?'ACTIVE':'OFFLINE')+'\n│ 💳 POSTPAID\n╰────────────');
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
  const account=getAccount(group);if(!account)return reply('❌ Buat dahulu dengan /apikey');
  if(args[1]!=='confirm')return reply('⚠️ API key lama akan langsung dinonaktifkan. Ketik /api reset confirm');
  account.key=newKey();account.resetAt=new Date().toISOString();save();return reply('✅ API KEY BARU\n👤 '+account.username+'\n🔑 '+account.key);
 }
 if(a==='status')return reply('📡 DHRU API : '+(state.settings.apiGlobalEnabled?'GLOBAL ON':'GLOBAL OFF')+'\n👥 Grup : '+(getAccount(group)?.enabled===false?'OFF':'ON')+'\n💳 '+invoice(group).split('│ 💵 TOTAL : ')[1]?.split('\n')[0]);
 return reply('Perintah: /apikey, /api status, /api reset, /api reset confirm, /api on|off (owner), /api global on|off (owner)');
}};