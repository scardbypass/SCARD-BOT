const db=require('./database')
const {formatRupiah}=require('./utils')
const {getRoamerAccount,roamerBalance,getSickwBalance,getAirbotBalance}=require('./providers')

function timeParts(){
  const tz=process.env.TIMEZONE||'Asia/Jakarta'
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(new Date())
  return Object.fromEntries(parts.map(p=>[p.type,p.value]))
}

async function buildSaldoMessage(owner){
  const [roamer,sickw,airbot]=await Promise.all([
    getRoamerAccount(),
    getSickwBalance(),
    getAirbotBalance()
  ])
  const rb=roamerBalance(roamer)
  const connected=[rb!==null,airbot!==null,sickw!==null].filter(Boolean).length
  return [
    '╭───〔 *SUPER-BOT CEIR* 〕',
    '│ _Daily Provider Balance Report_',
    '│',
    '├──〔 👤 *OWNER* 〕',
    `│  WhatsApp  •  ${owner||'-'}`,
    '│',
    '├──〔 💳 *PROVIDER BALANCE* 〕',
    '│',
    '│  ◈ *RoamerCheck*',
    `│     ${rb===null?'⚠️ Tidak terhubung':`💰 ${formatRupiah(rb)}`}`,
    '│',
    '│  ◈ *AirBot*',
    `│     ${airbot===null?'⚠️ Tidak terhubung':`💰 ${formatRupiah(airbot.balance)}`}`,
    '│',
    '│  ◈ *SickW*',
    `│     ${sickw===null?'⚠️ Tidak terhubung':`💰 ${formatRupiah(sickw.idr)}  •  $${sickw.usd.toFixed(3)}`}`,
    '│',
    '├──〔 📡 *CONNECTION* 〕',
    `│  ${connected===3?'🟢':'🟡'} Provider  •  *${connected}/3 CONNECTED*`,
    '│',
    '╰───〔 *SUPER-BOT • CEIR CENTER* 〕'
  ].join('\n')
}

function startSaldoScheduler(sock){
  const enabled=String(process.env.SALDOCEIR_AUTO_ENABLED||'true').toLowerCase()==='true'
  if(!enabled){console.log('[SALDOCEIR AUTO] disabled');return}
  const owner=String(process.env.OWNER_NUMBER||'').replace(/\D/g,'')
  if(!owner){console.error('[SALDOCEIR AUTO] OWNER_NUMBER kosong');return}
  const hours=String(process.env.SALDOCEIR_AUTO_HOURS||'07,18').split(',').map(x=>Number(x.trim())).filter(Number.isFinite)
  const minute=Number(process.env.SALDOCEIR_AUTO_MINUTE||0)
  const jid=owner+'@s.whatsapp.net'
  console.log('[SALDOCEIR AUTO] aktif jam',hours.map(h=>String(h).padStart(2,'0')+':'+String(minute).padStart(2,'0')).join(', '),process.env.TIMEZONE||'Asia/Jakarta')

  const check=async()=>{
    try{
      const p=timeParts()
      const hour=Number(p.hour),min=Number(p.minute)
      if(!hours.includes(hour)||min!==minute)return
      const date=`${p.year}-${p.month}-${p.day}`
      const key=`saldoceir:auto:${date}:${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`
      if(db.wasSent(key))return
      const text=await buildSaldoMessage(owner)
      await sock.sendMessage(jid,{text})
      db.markSent(key)
      console.log('[SALDOCEIR AUTO] terkirim',date,hour+':'+String(min).padStart(2,'0'))
    }catch(e){console.error('[SALDOCEIR AUTO]',e)}
  }
  setTimeout(check,3000)
  setInterval(check,30000)
}

module.exports={startSaldoScheduler,buildSaldoMessage}
