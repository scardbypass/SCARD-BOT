const db=require('./database');
const TZ=process.env.TIMEZONE||'Asia/Jakarta';
function parts(){const a=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());return Object.fromEntries(a.map(x=>[x.type,x.value]))}
async function sendPoll(sock,title){
  const jid=String(process.env.VOTING_GROUP_ID||'').trim();
  if(!jid)throw new Error('VOTING_GROUP_ID kosong');
  if(!jid.endsWith('@g.us'))throw new Error('VOTING_GROUP_ID harus berakhiran @g.us');
  const sent=await sock.sendMessage(jid,{poll:{name:title,values:['🏸 Gas','😁 Izin'],selectableCount:1}});
  if(!sent?.key?.id)throw new Error('WhatsApp tidak mengembalikan message ID untuk poll');
  console.log('[VOTING] terkirim',title,'id=',sent.key.id);
  return sent
}
function startVotingScheduler(sock){
  setInterval(async()=>{
    try{
      if(String(process.env.VOTING_ENABLED||'true').toLowerCase()!=='true')return;
      const p=parts(),hour=Number(process.env.VOTING_HOUR||10),minute=Number(process.env.VOTING_MINUTE||0);
      if(Number(p.hour)!==hour||Number(p.minute)!==minute)return;
      let event=null;
      if(p.weekday==='Sun')event='Senin';
      if(p.weekday==='Thu')event="Jum'at";
      if(!event)return;
      const key=`voting:${p.year}-${p.month}-${p.day}:${event}`;
      if(db.wasSent(key))return;
      await sendPoll(sock,`🏸 Badminton ${event}\nSiapa yang ikut?`);
      db.markSent(key)
    }catch(e){console.error('[VOTING ERROR]',e)}
  },30000)
}
module.exports={startVotingScheduler,sendPoll}
