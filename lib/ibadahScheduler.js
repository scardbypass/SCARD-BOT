const db = require('./database')
const GROUP = '120363430536068297@g.us'
const ZONE = 'Asia/Jakarta'
const DEFAULTS = {pagi:'05:00',siang:'12:00',malam:'18:00'}
let getSocket = () => null
let running = false
let timer = null

function settings(){
  const saved=db.getSetting('ibadahharian',{})||{}
  return {enabled:saved.enabled===true,group:GROUP,sessions:Object.fromEntries(Object.entries(DEFAULTS).map(([name,time])=>[name,{enabled:saved.sessions?.[name]?.enabled!==false,time:saved.sessions?.[name]?.time||time}]))}
}
function save(config){db.setSetting('ibadahharian',config)}
function localNow(){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date())
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]))
  return {date:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute}
}
function message(session,date){
  const title=session.toUpperCase()
  return ['🙏 *IBADAH HARIAN — '+title+'*','📅 '+date,'','Materi ibadah lengkap:','https://ibadahharian.net/','','_Sumber: Ibadah Harian_'].join('\n')
}
async function send(session,manual=false){
  const cfg=settings()
  if(!manual&&(!cfg.enabled||!cfg.sessions[session]?.enabled))return false
  const now=localNow()
  const key='ibadahharian:'+now.date+':'+session
  if(!manual&&db.wasSent(key))return false
  const sock=getSocket()
  if(!sock?.user)throw new Error('WhatsApp belum terhubung')
  await sock.sendMessage(cfg.group,{text:message(session,now.date)})
  if(!manual)db.markSent(key)
  return true
}
function startIbadahScheduler(sockGetter){
  getSocket=typeof sockGetter==='function'?sockGetter:()=>sockGetter
  if(timer)return
  timer=setInterval(async()=>{
    if(running)return
    const cfg=settings(),now=localNow()
    if(!cfg.enabled)return
    const sessions=Object.entries(cfg.sessions).filter(([,v])=>v.enabled&&v.time===now.time)
    if(!sessions.length)return
    running=true
    try{for(const [session] of sessions)await send(session).catch(e=>console.error('[IBADAH HARIAN]',e.message))}
    finally{running=false}
  },15000)
  timer.unref?.()
}
module.exports={settings,save,send,startIbadahScheduler,DEFAULTS,GROUP}
