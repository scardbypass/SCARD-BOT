const fs=require('fs')
const path=require('path')
const os=require('os')
const {execFile}=require('child_process')

function bytes(n){
  n=Number(n)||0
  const units=['B','KB','MB','GB','TB']
  let i=0
  while(n>=1024&&i<units.length-1){n/=1024;i++}
  return `${n.toFixed(i<2?0:1)} ${units[i]}`
}

function exec(command,args=[]){
  return new Promise(resolve=>{
    execFile(command,args,{timeout:5000},(error,stdout)=>resolve(error?null:String(stdout||'').trim()))
  })
}

async function disk(){
  const out=await exec('df',['-k','/'])
  if(!out)return null
  const row=out.split('\n').filter(Boolean).pop().trim().split(/\s+/)
  if(row.length<5)return null
  return {total:Number(row[1])*1024,used:Number(row[2])*1024,percent:row[4]}
}

async function cleanDirectory(dir,{maxAgeMs=0}={}){
  let removed=0,freed=0
  let entries=[]
  try{entries=await fs.promises.readdir(dir,{withFileTypes:true})}catch{return {removed,freed}}
  const now=Date.now()
  for(const entry of entries){
    const file=path.join(dir,entry.name)
    try{
      const stat=await fs.promises.stat(file)
      if(maxAgeMs&&now-stat.mtimeMs<maxAgeMs)continue
      if(entry.isFile()){
        freed+=stat.size
        await fs.promises.unlink(file)
        removed++
      }
    }catch{}
  }
  return {removed,freed}
}

module.exports={
  commands:['clear','clearcache'],
  registered:true,
  ownerOnly:true,
  menu:'clear',
  async run({reply,args=[]}){
    try{
      const waOnly=String(args[0]||'').toLowerCase()==='wa'
      if(args.length&&!waOnly)return reply('❌ Gunakan: /clear atau /clear wa')
      const targets=waOnly
        ? [{name:'WhatsApp media cache',dir:path.join(os.tmpdir(),'scard-bot-viewonce'),maxAgeMs:0}]
        : [
        {name:'Download cache',dir:path.join(os.tmpdir(),'scard-bot-downloads'),maxAgeMs:0},
        {name:'Temp sticker',dir:path.join(os.tmpdir(),'scard-bot-stickers'),maxAgeMs:0}
      ]
      let files=0,freed=0
      const details=[]
      for(const target of targets){
        const result=await cleanDirectory(target.dir,{maxAgeMs:target.maxAgeMs})
        files+=result.removed
        freed+=result.freed
        details.push(`│  ◈ ${target.name}  •  ${result.removed} file`)
      }
      if(global.gc){try{global.gc()}catch{}}

      const total=os.totalmem()
      const used=total-os.freemem()
      const ramPct=total?((used/total)*100).toFixed(1):'0'
      const loads=os.loadavg()
      const cpus=os.cpus()
      const storage=await disk()

      return reply([
        '╭───〔 *SUPER-BOT CLEANER* 〕',
        waOnly?'│ _WhatsApp Media Cache Cleanup_':'│ _Safe Temporary File Cleanup_',
        '│',
        '├──〔 🧹 *CLEANED* 〕',
        '│',
        ...details,
        '│',
        '├──〔 📦 *RESULT* 〕',
        `│  🗑️ Removed  •  *${files} file*`,
        `│  💾 Freed    •  *${bytes(freed)}*`,
        '│',
        '├──〔 ✨ *SYSTEM FRESH* 〕',
        '│',
        '├──〔 ⚡ *VPS RESOURCE* 〕',
        '│',
        `│  ⚙️ *CPU*      •  ${cpus.length} Core`,
        `│  📊 *Load*     •  ${loads.map(v=>v.toFixed(2)).join(' / ')}`,
        `│  🧠 *RAM*      •  ${bytes(used)} / ${bytes(total)}  •  ${ramPct}%`,
        `│  💾 *Disk*     •  ${storage?`${bytes(storage.used)} / ${bytes(storage.total)}  •  ${storage.percent}`:'Tidak tersedia'}`,
        '│',
        '╰───〔 *SUPER-BOT • SYSTEM* 〕'
      ].join('\n'))
    }catch(e){
      console.error('[CLEAR]',e)
      return reply('❌ Gagal membersihkan temporary file.')
    }
  }
}
