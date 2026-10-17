const {normalizeDomain,checkWebsite}=require('../lib/webStatus');
module.exports={
 commands:['monitor'],registered:true,ownerOnly:true,menuSection:'OWNER',menu:'/monitor add|del|list|status|interval <menit|domain menit>',
 async run({reply,args,db,msg}){
  const action=String(args[0]||'').toLowerCase();const domain=normalizeDomain(args[1]||'');
  const list=db.getSetting('websiteMonitors',[]);
  const globalMinutes=Number(db.getSetting('websiteMonitorIntervalMinutes',Number(process.env.MONITOR_INTERVAL_MINUTES||30)));
  if(action==='interval'){
   const first=String(args[1]||'').toLowerCase();const second=String(args[2]||'').toLowerCase();
   const perDomain=!!second;const target=perDomain?normalizeDomain(first):null;
   if(perDomain&&!target)return reply('❌ Domain tidak valid.');
   if(perDomain&&!list.some(x=>x.domain===target))return reply('❌ Domain belum terdaftar di monitor.');
   if(perDomain&&second==='default'){
    const item=list.find(x=>x.domain===target);delete item.intervalMinutes;db.setSetting('websiteMonitors',list);
    return reply('✅ '+target+' kembali mengikuti interval global '+globalMinutes+' menit.');
   }
   const value=perDomain?second:first;
   if(!/^\\d+$/.test(value)||Number(value)<1||Number(value)>1440)return reply('❌ Interval harus 1–1440 menit. Contoh: /monitor interval 30 atau /monitor interval ceirgo.id 5');
   const minutes=Number(value);
   if(perDomain){const item=list.find(x=>x.domain===target);item.intervalMinutes=minutes;db.setSetting('websiteMonitors',list);return reply('✅ Interval '+target+' menjadi '+minutes+' menit.');}
   db.setSetting('websiteMonitorIntervalMinutes',minutes);return reply('✅ Interval global menjadi '+minutes+' menit. Website dengan interval khusus tidak berubah.');
  }
  if(action==='status')return reply('🚨 *PENGATURAN MONITOR*\\nGlobal: '+globalMinutes+' menit\\nWebsite: '+list.length+'\\nGunakan /monitor list untuk rincian.');
  if(action==='list'){
   if(!list.length)return reply('🚨 Belum ada website yang dimonitor.');
   return reply('🚨 *WEBSITE MONITOR*\n\n'+list.map((x,i)=>(i+1)+'. '+x.domain+' — setiap '+(x.intervalMinutes||globalMinutes)+' menit'+(x.intervalMinutes?' (khusus)':'')+' — '+(x.lastStatus==='up'?'🟢 UP':x.lastStatus==='down'?'🔴 DOWN':'⚪ Belum dicek')).join('\n'));
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
  return reply('🚨 *WEBSITE MONITOR*\n\n/monitor add ceirgo.id\n/monitor del ceirgo.id\n/monitor list\\n/monitor status\\n/monitor interval 30\\n/monitor interval ceirgo.id 5\\n/monitor interval ceirgo.id default');
 }
};
