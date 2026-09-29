const os=require('os')
const fs=require('fs')
const {execFile}=require('child_process')

function exec(command,args=[]){
  return new Promise(resolve=>{
    execFile(command,args,{timeout:5000},(error,stdout)=>resolve(error?null:String(stdout||'').trim()))
  })
}
function bytes(n){
  n=Number(n)||0
  const units=['B','KB','MB','GB','TB']
  let i=0
  while(n>=1024&&i<units.length-1){n/=1024;i++}
  return `${n.toFixed(i<2?0:1)} ${units[i]}`
}
function duration(sec){
  sec=Math.floor(Number(sec)||0)
  const d=Math.floor(sec/86400);sec%=86400
  const h=Math.floor(sec/3600);sec%=3600
  const m=Math.floor(sec/60)
  return [d&&`${d}d`,h&&`${h}h`,m&&`${m}m`].filter(Boolean).join(' ')||'< 1m'
}
async function disk(){
  const out=await exec('df',['-k','/'])
  if(!out)return null
  const row=out.split('\n').filter(Boolean).pop().trim().split(/\s+/)
  if(row.length<5)return null
  return {total:Number(row[1])*1024,used:Number(row[2])*1024,free:Number(row[3])*1024,percent:row[4]}
}
async function pm2Status(){
  const out=await exec('pm2',['jlist'])
  if(!out)return null
  try{
    const list=JSON.parse(out)
    const current=list.find(p=>p.pid===process.pid)||list.find(p=>String(p.name||'').toLowerCase().includes('scard'))||list.find(p=>String(p.name||'').toLowerCase().includes('super'))
    if(!current)return null
    return {name:current.name,status:current.pm2_env?.status||'-',restarts:current.pm2_env?.restart_time??0}
  }catch{return null}
}

module.exports={
  commands:['vps','statusvps'],
  registered:true,
  ownerOnly:true,
  menu:'vps',
  async run({reply}){
    try{
      const total=os.totalmem()
      const free=os.freemem()
      const used=total-free
      const ramPct=total?((used/total)*100).toFixed(1):'0'
      const loads=os.loadavg()
      const cpus=os.cpus()
      const [storage,pm2]=await Promise.all([disk(),pm2Status()])

      return reply([
        '╭───〔 *VPS STATUS* 〕',
        '│',
        `│ 🖥️ *Server*`,
        `│  • Host     : ${os.hostname()}`,
        `│  • OS       : ${os.type()} ${os.release()}`,
        `│  • Uptime   : ${duration(os.uptime())}`,
        '│',
        '├───〔 ⚡ *VPS RESOURCE* 〕',
        '│',
        `│  ⚙️ *CPU*      •  ${cpus.length} Core`,
        `│  📊 *Load*     •  ${loads.map(v=>v.toFixed(2)).join(' / ')}`,
        `│  🧠 *RAM*      •  ${bytes(used)} / ${bytes(total)}  •  ${ramPct}%`,
        `│  💾 *Disk*     •  ${storage?`${bytes(storage.used)} / ${bytes(storage.total)}  •  ${storage.percent}`:'Tidak tersedia'}`,
        '│',
        '├───〔 🤖 *BOT PROCESS* 〕',
        '│',
        `│ 🤖 Process  : ${pm2?.name||process.title||'node'}`,
        `│ 🟢 Status   : ${String(pm2?.status||'online').toUpperCase()}`,
        `│ 🔄 Restart  : ${pm2?.restarts??'-'}`,
        `│ 🟩 Node.js  : ${process.version}`,
        `│ ⏱️ Bot Up   : ${duration(process.uptime())}`,
        '│',
        `╰───〔 *${new Date().toLocaleString('id-ID',{timeZone:process.env.TIMEZONE||'Asia/Jakarta'})}* 〕`
      ].join('\n'))
    }catch(e){
      console.error('[VPS STATUS]',e)
      return reply('❌ Gagal membaca status VPS.')
    }
  }
}
