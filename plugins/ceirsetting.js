const {state,save,ceirConfig}=require('../lib/imeiCenter/store');
const money=n=>'Rp'+Number(n).toLocaleString('id-ID');
module.exports={
 commands:['ceirsetting','ceirmode','ceirfee','ceirlist'],
 registered:false,
 async run({msg,reply,command,args=[],isOwner}){
  if(!isOwner)return reply('Khusus owner.');
  const groups=state.settings.sellerGroups||{};
  if(command==='ceirlist')return reply(Object.keys(groups).map(g=>g+' : '+ceirConfig(g).mode+' / '+money(ceirConfig(g).fee)).join('\n')||'Belum ada grup.');
  const g=msg?.key?.remoteJid;
  if(!g?.endsWith('@g.us')||!groups[g])return reply('Gunakan di grup seller terdaftar.');
  const cfg=ceirConfig(g);
  if(command==='ceirmode'){
   const mode=String(args[0]||'').toLowerCase();
   if(!['free','seller','owner'].includes(mode))return reply('Gunakan /ceirmode free|seller|owner');
   groups[g].ceirBilling={...cfg,mode};save();
  }
  if(command==='ceirfee'){
   const raw=String(args[0]||'');
   if(!/^\d+$/.test(raw)||Number(raw)>1000000)return reply('Gunakan /ceirfee 2500');
   groups[g].ceirBilling={...cfg,fee:Number(raw)};save();
  }
  const c=ceirConfig(g);
  return reply(['CEIR BILLING • CUAN-BOT','Mode: '+c.mode.toUpperCase(),'Tarif: '+money(c.fee),'Trigger: REGISTERED / ROAMER','','/ceirsetting','/ceirmode free|seller|owner','/ceirfee 2500','/ceirlist','/payment ceir'].join('\n'));
 }
};