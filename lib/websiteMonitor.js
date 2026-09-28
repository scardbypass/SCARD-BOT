const db=require('./database');const {checkWebsite}=require('./webStatus');
let timer=null,running=false;
async function tick(sock){
 if(running)return;running=true;
 try{
  const list=db.getSetting('websiteMonitors',[]);let changed=false;
  for(const item of list){
   try{
    const x=await checkWebsite(item.domain);const now=x.up?'up':'down';const before=item.lastStatus;
    item.lastHttp=x.status||0;item.lastCheckedAt=new Date().toISOString();
    if(before&&before!==now){
     item.changedAt=new Date().toISOString();
     const icon=now==='up'?'🟢':'🔴';const title=now==='up'?'WEBSITE KEMBALI ONLINE':'WEBSITE DOWN';
     await sock.sendMessage(item.chatId,{text:icon+' *'+title+'*\n\n🌐 '+item.domain+'\n📡 Status: '+now.toUpperCase()+'\n🌍 HTTP: '+(x.status||'-')+'\n⚡ Response: '+x.responseMs+' ms\n🕒 '+new Date().toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}).catch(()=>{});
    }
    item.lastStatus=now;changed=true;
   }catch(e){console.error('[MONITOR]',item.domain,e.message)}
  }
  if(changed)db.setSetting('websiteMonitors',list);
 }finally{running=false}
}
function startWebsiteMonitor(sock){
 if(timer)return;const minutes=Math.max(1,Number(process.env.MONITOR_INTERVAL_MINUTES||5));
 console.log('🌐 Website monitor aktif setiap '+minutes+' menit.');
 setTimeout(()=>tick(sock),10000);timer=setInterval(()=>tick(sock),minutes*60*1000);
}
module.exports={startWebsiteMonitor};
