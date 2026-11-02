'use strict';
const {state,save,ceirConfig}=require('../lib/imeiCenter/store');
const money=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
const validGroup=g=>/^\d{8,25}@g\.us$/.test(g);
const usage=[
 '👑 CEIR MANAGEMENT • OWNER PRIVATE CHAT',
 '/ceirlist',
 '/ceirsetting ID_GRUP',
 '/ceirmode ID_GRUP free|seller|owner',
 '/ceirfee ID_GRUP 2500',
 'Trigger: REGISTERED / ROAMER',
 'UNKNOWN: lanjut; ERROR: fail closed'
].join('\n');
module.exports={
 commands:['ceirsetting','ceirmode','ceirfee','ceirlist'],
 registered:false,
 ownerOnly:true,
 async run({msg,reply,command,args=[],isOwner}){
  if(!isOwner)return reply('❌ Khusus owner.');
  if(String(msg?.key?.remoteJid||'').endsWith('@g.us'))
   return reply('🔒 Pengaturan CEIR hanya di chat pribadi owner.');
  const groups=state.settings.sellerGroups||{};
  const cmd=String(command||'').toLowerCase();
  if(cmd==='ceirlist'){
   const ids=Object.keys(groups).sort();
   return reply(ids.length?'👑 CEIR GROUP SETTINGS\n'+ids.map((g,i)=>{
    const c=ceirConfig(g);return (i+1)+'. '+g+'\n   '+c.mode.toUpperCase()+' • '+money(c.fee);
   }).join('\n'):'Belum ada grup seller.');
  }
  const g=String(args[0]||'').trim();
  if(!validGroup(g)||!Object.prototype.hasOwnProperty.call(groups,g))return reply(usage+'\n\n❌ ID grup belum valid atau tidak terdaftar.');
  if(cmd==='ceirmode'){
   if(args.length!==2||!['free','seller','owner'].includes(String(args[1]||'').toLowerCase()))
    return reply('Format: /ceirmode ID_GRUP free|seller|owner');
   groups[g].ceirBilling={...ceirConfig(g),mode:String(args[1]).toLowerCase()};
   save();
  }else if(cmd==='ceirfee'){
   const raw=String(args[1]||'');
   if(args.length!==2||!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)>1000000)
    return reply('Format: /ceirfee ID_GRUP 2500 (maks Rp1.000.000)');
   groups[g].ceirBilling={...ceirConfig(g),fee:Number(raw)};
   save();
  }else if(cmd!=='ceirsetting')return reply(usage);
  const c=ceirConfig(g);
  return reply(['╭──〔 👑 CEIR BILLING 〕','│ Grup: '+g,'│ Mode: '+c.mode.toUpperCase(),'│ Tarif: '+money(c.fee),'│ Trigger: REGISTERED / ROAMER','╰── CUAN-BOT','','/ceirmode '+g+' free|seller|owner','/ceirfee '+g+' 2500'].join('\n'));
 }
};
