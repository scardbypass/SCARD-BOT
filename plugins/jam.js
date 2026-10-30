const {state,save,schedule,operational}=require('../lib/imeiCenter/store');
const services=['3b','1b','3bs','3bd'];
const valid=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
module.exports={commands:['jam'],registered:false,ownerOnly:true,async run({args,reply}){
 const service=String(args[0]||'').toLowerCase(),action=String(args[1]||'').toLowerCase();
 if(!service||service==='list'||service==='status')return reply('⏰ JAM OPERASIONAL (WIB)\n'+services.map(s=>{const h=schedule(s);return s.toUpperCase()+' • '+(!h.enabled?'24 JAM':h.open+'–'+h.close)+' • '+(operational(s)?'🟢 BUKA':'🔴 TUTUP')}).join('\n')+'\n\n/jam 3b 07:00 22:00\n/jam 3b on|off');
 if(!services.includes(service))return reply('❌ Layanan: '+services.join(', '));
 if(action==='status'){const h=schedule(service);return reply(service.toUpperCase()+': '+(h.enabled?h.open+'–'+h.close+' WIB':'24 JAM')+' • '+(operational(service)?'BUKA':'TUTUP'))}
 if(action==='on'||action==='off'){const old=schedule(service);state.settings.operatingHours[service]={...old,enabled:action==='on'};save();return reply('✅ Pembatasan jam '+service.toUpperCase()+' '+action.toUpperCase())}
 const close=String(args[2]||'');
 if(!valid(action)||!valid(close))return reply('❌ Format: /jam 3b 07:00 22:00 atau /jam 3b on|off');
 state.settings.operatingHours[service]={enabled:true,open:action,close};save();return reply('✅ '+service.toUpperCase()+' buka '+action+'–'+close+' WIB. Order di luar jam otomatis ditolak.');
}};