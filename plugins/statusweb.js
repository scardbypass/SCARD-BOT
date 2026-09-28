const {normalizeDomain,checkWebsite}=require('../lib/webStatus');
function fmtDate(v){if(!v)return '-';return new Date(v).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'});}
module.exports={
 commands:['statusweb'],registered:false,menuSection:'TOOLS',menu:'/statusweb <domain>',
 async run({reply,text}){
  const domain=normalizeDomain(text);if(!domain)return reply('❌ Contoh: /statusweb ceirgo.id');
  await reply('🔎 Mengecek '+domain+' ...');
  try{
   const x=await checkWebsite(domain);
   return reply('🌐 *WEBSITE STATUS*\n\n🔗 Domain : '+x.domain+'\n📡 Status : '+(x.up?'🟢 ONLINE':'🔴 DOWN')+'\n🌍 HTTP : '+(x.status||'-')+'\n⚡ Response : '+x.responseMs+' ms\n🔒 SSL : '+(x.ssl.valid?'✅ Valid':'❌ Bermasalah')+'\n📅 SSL Expired : '+fmtDate(x.ssl.expires)+'\n🏢 SSL Issuer : '+(x.ssl.issuer||'-')+(x.error?'\n⚠️ Error : '+x.error:''));
  }catch(e){console.error('[STATUSWEB]',e.message);return reply('❌ Gagal mengecek website.');}
 }
};
