const {normalizeDomain,checkWebsite}=require('../lib/webStatus');
module.exports={
 commands:['monitor'],registered:true,ownerOnly:true,menuSection:'OWNER',menu:'/monitor add|del|list <domain>',
 async run({reply,args,db,msg}){
  const action=String(args[0]||'').toLowerCase();const domain=normalizeDomain(args[1]||'');
  const list=db.getSetting('websiteMonitors',[]);
  if(action==='list'){
   if(!list.length)return reply('🚨 Belum ada website yang dimonitor.');
   return reply('🚨 *WEBSITE MONITOR*\n\n'+list.map((x,i)=>(i+1)+'. '+x.domain+' — '+(x.lastStatus==='up'?'🟢 UP':x.lastStatus==='down'?'🔴 DOWN':'⚪ Belum dicek')).join('\n'));
  }
  if(action==='add'){
   if(!domain)return reply('❌ Contoh: /monitor add ceirgo.id');
   if(list.some(x=>x.domain===domain))return reply('⚠️ '+domain+' sudah ada di monitor.');
   const initial=await checkWebsite(domain);
   list.push({domain,chatId:msg.key.remoteJid,lastStatus:initial.up?'up':'down',lastHttp:initial.status||0,addedAt:new Date().toISOString(),changedAt:new Date().toISOString()});
   db.setSetting('websiteMonitors',list);
   return reply('✅ Monitor ditambahkan\n\n🌐 '+domain+'\nStatus awal: '+(initial.up?'🟢 UP':'🔴 DOWN')+'\nNotifikasi dikirim hanya jika status berubah.');
  }
  if(action==='del'||action==='delete'||action==='remove'){
   if(!domain)return reply('❌ Contoh: /monitor del ceirgo.id');
   const next=list.filter(x=>x.domain!==domain);if(next.length===list.length)return reply('❌ Domain tidak ada di monitor.');
   db.setSetting('websiteMonitors',next);return reply('✅ Monitor '+domain+' dihapus.');
  }
  return reply('🚨 *WEBSITE MONITOR*\n\n/monitor add ceirgo.id\n/monitor del ceirgo.id\n/monitor list');
 }
};
