const axios=require('axios');

function cleanDomain(input=''){
  let s=String(input).trim().toLowerCase();
  s=s.replace(/^https?:\/\//,'').split('/')[0].split(':')[0].replace(/^www\./,'');
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)?s:null;
}
function date(v){if(!v)return '-';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('id-ID',{timeZone:'Asia/Jakarta'});}
function arr(v){if(!v)return '-';return (Array.isArray(v)?v:[v]).join(', ');}
module.exports={
 commands:['whois'],registered:false,menuSection:'TOOLS',menu:'/whois <domain>',
 async run({reply,text}){
  const domain=cleanDomain(text);
  if(!domain)return reply('❌ Contoh: /whois ceirgo.id');
  try{
   const {data}=await axios.get('https://rdap.org/domain/'+encodeURIComponent(domain),{timeout:15000,headers:{Accept:'application/rdap+json, application/json'}});
   const events=Object.fromEntries((data.events||[]).map(x=>[x.eventAction,x.eventDate]));
   const registrar=(data.entities||[]).find(x=>(x.roles||[]).includes('registrar'));
   const registrarName=registrar?.vcardArray?.[1]?.find(x=>x[0]==='fn')?.[3]||'-';
   const ns=(data.nameservers||[]).map(x=>x.ldhName).filter(Boolean);
   const status=(data.status||[]).join(', ')||'-';
   return reply('🔎 *WHOIS / RDAP*\n\n🌐 Domain : '+domain+'\n📌 Status : '+status+'\n🏢 Registrar : '+registrarName+'\n📅 Dibuat : '+date(events.registration)+'\n♻️ Update : '+date(events['last changed'])+'\n⏳ Expired : '+date(events.expiration)+'\n🧭 Nameserver : '+arr(ns));
  }catch(e){
   const code=e.response?.status;
   if(code===404)return reply('❌ Domain tidak ditemukan pada RDAP.');
   console.error('[WHOIS]',e.message);return reply('❌ Gagal mengambil data WHOIS/RDAP.');
  }
 }
};
