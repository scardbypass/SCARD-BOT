const db=require('./database')
const {formatRupiah}=require('./utils')
const {getRoamerAccount,roamerBalance,getSickwBalance,getAirbotBalance,getEsimAccessBalance,getOrderKuotaBalance}=require('./providers')

function timeParts(date=new Date()){
  const tz=process.env.TIMEZONE||'Asia/Jakarta'
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
  }).formatToParts(date)
  return Object.fromEntries(parts.map(p=>[p.type,p.value]))
}

async function buildSaldoMessage(owner){
  const [roamer,sickw,airbot,esimAccess,orderKuota]=await Promise.all([
    getRoamerAccount(),
    getSickwBalance(),
    getAirbotBalance(),
    getEsimAccessBalance(),
    getOrderKuotaBalance()
  ])
  const rb=roamerBalance(roamer)
  const connected=[rb!==null,airbot!==null,sickw!==null,esimAccess!==null,orderKuota!==null].filter(Boolean).length
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
    `│     ${sickw===null?'⚠️ Tidak terhubung':`💰 ${formatRupiah(sickw.idr)}  •  ${sickw.usd.toFixed(3)}`}`,
    '│',
    '│  ◈ *eSIMAccess*',
    `│     ${esimAccess===null?'⚠️ Tidak terhubung':`💰 ${formatRupiah(esimAccess.idr)}  •  ${esimAccess.usd.toFixed(3)}`}`,
    '│',
    '│  ◈ *Order Kuota*',
    `│     ${orderKuota===null?'⚠️ Tidak terhubung':`💰 ${formatRupiah(orderKuota.balance)}`}`,
    '│',
    '├──〔 📡 *CONNECTION* 〕',
    `│  ${connected===5?'🟢':'🟡'} Provider  •  *${connected}/5 CONNECTED*`,
    '│',
    '╰───〔 *SUPER-BOT • CEIR CENTER* 〕'
  ].join('\n')
}

let schedulerState=null

function startSaldoScheduler(sockOrGetter){
  const enabled=String(process.env.SALDOCEIR_AUTO_ENABLED||'true').toLowerCase()==='true'
  if(!enabled){console.log('[SALDOCEIR AUTO] disabled');return}
  const owner=String(process.env.OWNER_NUMBER||'').replace(/\D/g,'')
  if(!owner){console.error('[SALDOCEIR AUTO] OWNER_NUMBER kosong');return}

  const hours=String(process.env.SALDOCEIR_AUTO_HOURS||'07,18')
    .split(',').map(x=>Number(x.trim())).filter(x=>Number.isInteger(x)&&x>=0&&x<=23)
  const minute=Number(process.env.SALDOCEIR_AUTO_MINUTE||0)
  const jid=owner+'@s.whatsapp.net'
  const getSock=typeof sockOrGetter==='function'?sockOrGetter:()=>sockOrGetter
  if(schedulerState){schedulerState.getSock=getSock;console.log('[SALDOCEIR AUTO] socket diperbarui setelah reconnect');return}
  let timer=null
  schedulerState={getSock,timer:null}

  const send=async(hour)=>{
    const p=timeParts()
    const date=`${p.year}-${p.month}-${p.day}`
    const key=`saldoceir:auto:${date}:${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`
    if(db.wasSent(key))return
    try{
      const text=await buildSaldoMessage(owner)
      let lastError=null
      for(let attempt=1;attempt<=3;attempt++){
        try{
          const currentSock=schedulerState?.getSock?.()
          if(!currentSock)throw new Error('Socket WhatsApp belum siap')
          await currentSock.sendMessage(jid,{text})
          lastError=null
          break
        }catch(err){
          lastError=err
          console.warn('[SALDOCEIR AUTO] kirim gagal, retry',attempt,'/3:',err?.message||err)
          if(attempt<3)await new Promise(r=>setTimeout(r,15000))
        }
      }
      if(lastError)throw lastError
      db.markSent(key)
      console.log('[SALDOCEIR AUTO] terkirim',date,`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`)
    }catch(e){
      console.error('[SALDOCEIR AUTO]',e)
    }
  }

  const nextSchedule=()=>{
    const now=new Date()
    const p=timeParts(now)
    const nowSeconds=Number(p.hour)*3600+Number(p.minute)*60+Number(p.second)
    const targets=hours.map(hour=>({hour,seconds:hour*3600+minute*60})).sort((a,b)=>a.seconds-b.seconds)
    let next=targets.find(x=>x.seconds>nowSeconds)
    let delaySeconds
    if(next){
      delaySeconds=next.seconds-nowSeconds
    }else{
      next=targets[0]
      delaySeconds=(24*3600-nowSeconds)+next.seconds
    }
    return {hour:next.hour,delayMs:Math.max(1000,delaySeconds*1000)}
  }

  const scheduleNext=()=>{
    if(timer)clearTimeout(timer)
    const next=nextSchedule()
    const label=`${String(next.hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`
    console.log('[SALDOCEIR AUTO] next',label,'in',Math.round(next.delayMs/60000),'minutes')
    timer=setTimeout(async()=>{
      await send(next.hour)
      scheduleNext()
    },next.delayMs)
    schedulerState.timer=timer
  }

  console.log('[SALDOCEIR AUTO] aktif jam',hours.map(h=>String(h).padStart(2,'0')+':'+String(minute).padStart(2,'0')).join(', '),process.env.TIMEZONE||'Asia/Jakarta')
  if(!hours.length){console.error('[SALDOCEIR AUTO] jadwal kosong');return}
  scheduleNext()
}

module.exports={startSaldoScheduler,buildSaldoMessage}
