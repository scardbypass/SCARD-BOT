const {settings,save,send,DEFAULTS,GROUP}=require('../lib/ibadahScheduler')
const validTime=v=>/^([01]\\d|2[0-3]):[0-5]\\d$/.test(v)
module.exports={
 commands:['ibadahharian'],registered:true,ownerOnly:true,menu:'/ibadahharian status | on | off | test pagi | jam pagi 05:00 | pagi off',
 async run({args,reply}){
  const cfg=settings()
  const [action,second,third]=args.map(x=>String(x).toLowerCase())
  if(!action||action==='status'){
   return reply(['🙏 *IBADAH HARIAN*','Grup: '+GROUP,'Otomatis: '+(cfg.enabled?'ON':'OFF'),...Object.entries(cfg.sessions).map(([k,v])=>k+': '+v.time+' • '+(v.enabled?'ON':'OFF')),'','/ibadahharian on|off','/ibadahharian pagi|siang|malam on|off','/ibadahharian jam pagi|siang|malam HH:MM','/ibadahharian test pagi|siang|malam'].join('\n'))
  }
  if(['on','off'].includes(action)&&!second){cfg.enabled=action==='on';save(cfg);return reply('✅ Ibadah Harian otomatis '+action.toUpperCase())}
  if(action==='test'&&DEFAULTS[second]){
   try{await send(second,true);return reply('✅ Test '+second+' terkirim ke grup.')}
   catch(e){return reply('❌ '+e.message)}
  }
  if(DEFAULTS[action]&&['on','off'].includes(second)){cfg.sessions[action].enabled=second==='on';save(cfg);return reply('✅ Sesi '+action+' '+second.toUpperCase())}
  if(action==='jam'&&DEFAULTS[second]&&validTime(third)){cfg.sessions[second].time=third;save(cfg);return reply('✅ Jam '+second+' diubah menjadi '+third+' WIB')}
  return reply('❌ Perintah tidak valid. Ketik /ibadahharian status')
 }
}
