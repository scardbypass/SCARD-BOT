'use strict';
const {state}=require('../lib/imeiCenter/store');
const fmt=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
const dateWib=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
const today=()=>dateWib(new Date());
module.exports={
 commands:['cekgrup'],
 registered:false,
 ownerOnly:true,
 async run({reply,isOwner,args}){
  if(!isOwner)return reply('❌ Perintah ini khusus owner.');
  const day=today();
  const orders=(state.orders||[]).filter(o=>dateWib(o.createdAt)===day);
  const sellers=state.settings.sellerGroups||{};
  const groups=[...new Set([...Object.keys(sellers),...orders.map(o=>o.group).filter(Boolean)])].sort();
  const lines=['╭──〔 📊 CUAN-BOT • CEK GRUP 〕','📅 '+day+' (WIB)','👥 Grup: '+groups.length,'📦 Total order: '+orders.length];
  let allSuccess=0,allRevenue=0,allPending=0,allFailed=0;
  for(const g of groups){
   const list=orders.filter(o=>o.group===g);
   const success=list.filter(o=>o.status==='success');
   const pending=list.filter(o=>['checking','pending','processing','manual_review'].includes(o.status));
   const failed=list.filter(o=>['failed','rejected','unavailable','cancelled'].includes(o.status));
   const total=success.reduce((sum,o)=>sum+Number(o.price||0),0);
   allSuccess+=success.length;allRevenue+=total;allPending+=pending.length;allFailed+=failed.length;
   const account=state.settings.apiAccounts?.[g];
   lines.push('','━━━━━━━━━━━━━━━━','👥 '+(account?.username||g),'🆔 '+g,'📦 Order: '+list.length+' | Sukses: '+success.length,'⏳ Pending: '+pending.length+' | Gagal: '+failed.length,'💰 TRX sukses: '+fmt(total));
   for(const service of ['1b','3b','3bs','3bd']){
    const rows=list.filter(o=>o.service===service);
    if(rows.length)lines.push('  '+service.toUpperCase()+': '+rows.length+' order / '+rows.filter(o=>o.status==='success').length+' sukses');
   }
  }
  lines.push('','━━━━━━━━━━━━━━━━','📊 TOTAL HARI INI','✅ Sukses: '+allSuccess,'⏳ Pending: '+allPending,'❌ Gagal: '+allFailed,'💰 Nilai order sukses: '+fmt(allRevenue),'ℹ️ Pending belum dihitung sebagai pendapatan.');
  const text=lines.join('\n');
  if(text.length<=3800)return reply(text);
  let chunk='';for(const line of lines){if((chunk+'\n'+line).length>3500){await reply(chunk);chunk=''}chunk+=(chunk?'\n':'')+line}if(chunk)await reply(chunk);
 }
};
