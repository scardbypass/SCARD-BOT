const {execFile}=require('child_process')
const path=require('path')

function exec(command,args=[],options={}){
  return new Promise((resolve,reject)=>execFile(command,args,{timeout:300000,maxBuffer:4*1024*1024,...options},(e,out,err)=>{
    if(e){e.stdout=out;e.stderr=err;return reject(e)}
    resolve({stdout:String(out||'').trim(),stderr:String(err||'').trim()})
  }))
}
function npm(args,cwd){return exec('npm',args,{cwd})}
function short(v=''){return String(v).replace(/^\^|^~/,'')}

module.exports={
  commands:['cekupdate'],
  registered:true,
  ownerOnly:true,
  menuSection:'OWNER',
  menu:'/cekupdate',
  async run({reply}){
    const cwd=path.resolve(process.cwd())
    const pm2=String(process.env.PM2_PROCESS_NAME||'SCARD-BOT').trim()
    let backup=''
    try{
      await reply('🔎 *CEK UPDATE LIBRARY*\n\n⏳ Mengecek dependency npm dan Baileys...')

      const pkg=require(path.join(cwd,'package.json'))
      const currentBaileys=short(pkg.dependencies?.baileys||'-')
      let outdated={}
      try{
        const r=await npm(['outdated','--json'],cwd)
        outdated=r.stdout?JSON.parse(r.stdout):{}
      }catch(e){
        // npm outdated memakai exit code 1 ketika update tersedia.
        if(e.stdout){
          try{outdated=JSON.parse(String(e.stdout))}catch{}
        }else throw e
      }

      const entries=Object.entries(outdated||{}).filter(([,v])=>v&&v.current&&v.latest)
      if(!entries.length){
        return reply(`✅ *SEMUA LIBRARY TERBARU*\n\n📦 Baileys : ${currentBaileys}\n📚 Dependency: tidak ada update tersedia\n🛡️ Sistem tidak diubah.`)
      }

      const lines=entries.map(([name,v])=>`• ${name}: ${v.current} → ${v.latest}`)
      await reply(`📦 *UPDATE DITEMUKAN*\n\n${lines.join('\n')}\n\n🛡️ Membuat backup package lalu melakukan update aman...`)

      const lock=path.join(cwd,'package-lock.json')
      const pkgPath=path.join(cwd,'package.json')
      backup=path.join(cwd,'.scard-update-backup-'+Date.now())
      await exec('mkdir',['-p',backup],{cwd})
      await exec('cp',[pkgPath,path.join(backup,'package.json')],{cwd})
      try{await exec('cp',[lock,path.join(backup,'package-lock.json')],{cwd})}catch{}

      // Update hanya dependency yang memang sudah terdaftar di project.
      // npm install <pkg>@latest akan memperbarui package.json + lock secara konsisten.
      for(const [name] of entries)await npm(['install',name+'@latest','--save'],cwd)

      // Validasi dependency tree dan syntax core sebelum mempertahankan update.
      await npm(['ls','--omit=dev'],cwd)
      await exec(process.execPath,['--check',path.join(cwd,'index.js')],{cwd})

      const newPkg=JSON.parse(require('fs').readFileSync(pkgPath,'utf8'))
      const newBaileys=short(newPkg.dependencies?.baileys||currentBaileys)
      await reply(`✅ *UPDATE LIBRARY BERHASIL*\n\n📦 Baileys : ${currentBaileys} → ${newBaileys}\n📚 Library diperbarui: ${entries.length}\n🧪 Dependency tree: OK\n🧪 Syntax core: OK\n\n♻️ Bot akan restart otomatis.`)
      setTimeout(()=>exec('pm2',['restart',pm2,'--update-env'],{cwd,timeout:30000}).catch(e=>console.error('[CEKUPDATE RESTART]',e.stderr||e.message)),1200)
    }catch(e){
      console.error('[CEKUPDATE]',e.stderr||e.message)
      if(backup){
        try{
          await exec('cp',[path.join(backup,'package.json'),path.join(cwd,'package.json')],{cwd})
          try{await exec('cp',[path.join(backup,'package-lock.json'),path.join(cwd,'package-lock.json')],{cwd})}catch{}
          await npm(['install','--omit=dev'],cwd)
          return reply(`❌ *UPDATE DIBATALKAN & ROLLBACK*\n\nUpdate gagal divalidasi sehingga package lama dipulihkan.\n\nDetail: ${String(e.stderr||e.message||'').slice(0,700)}`)
        }catch(rollbackErr){
          console.error('[CEKUPDATE ROLLBACK]',rollbackErr.stderr||rollbackErr.message)
        }
      }
      return reply(`❌ *CEK UPDATE GAGAL*\n\n${String(e.stderr||e.message||'').slice(0,700)}`)
    }
  }
}
