const fs=require('fs')
const path=require('path')
const os=require('os')

function bytes(n){
  n=Number(n)||0
  const units=['B','KB','MB','GB','TB']
  let i=0
  while(n>=1024&&i<units.length-1){n/=1024;i++}
  return `${n.toFixed(i<2?0:1)} ${units[i]}`
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
  async run({reply}){
    try{
      const targets=[
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
      return reply([
        '╭───〔 *SUPER-BOT CLEANER* 〕',
        '│ _Safe Temporary File Cleanup_',
        '│',
        '├──〔 🧹 *CLEANED* 〕',
        '│',
        ...details,
        '│',
        '├──〔 📦 *RESULT* 〕',
        `│  🗑️ Removed  •  *${files} file*`,
        `│  💾 Freed    •  *${bytes(freed)}*`,
        '│',
        '╰───〔 *SYSTEM FRESH* 〕'
      ].join('\n'))
    }catch(e){
      console.error('[CLEAR]',e)
      return reply('❌ Gagal membersihkan temporary file.')
    }
  }
}
