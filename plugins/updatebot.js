const {execFile}=require('child_process')
const path=require('path')

function exec(command,args=[],options={}){
  return new Promise((resolve,reject)=>{
    execFile(command,args,{timeout:180000,maxBuffer:2*1024*1024,...options},(error,stdout,stderr)=>{
      if(error){error.stdout=stdout;error.stderr=stderr;return reject(error)}
      resolve({stdout:String(stdout||'').trim(),stderr:String(stderr||'').trim()})
    })
  })
}
async function git(args,cwd){return exec('git',args,{cwd})}

module.exports={
  commands:['updatebot'],
  registered:true,
  ownerOnly:true,
  menu:'updatebot',
  async run({reply}){
    const cwd=path.resolve(process.cwd())
    const branch=String(process.env.GIT_BRANCH||'main').trim()
    const remote=String(process.env.GIT_REMOTE||'origin').trim()
    const pm2Name=String(process.env.PM2_PROCESS_NAME||'SCARD-BOT').trim()
    try{
      await reply('🔄 *SUPER-BOT Update*\nMengecek update GitHub...')
      const before=(await git(['rev-parse','--short','HEAD'],cwd)).stdout
      const dirty=(await git(['status','--porcelain'],cwd)).stdout
      if(dirty){
        return reply('❌ Update dibatalkan. Ada perubahan lokal di VPS.\n\nSimpan/stash perubahan tersebut terlebih dahulu agar tidak tertimpa.')
      }

      await git(['fetch',remote,branch],cwd)
      const behind=(await git(['rev-list','--count',`HEAD..${remote}/${branch}`],cwd)).stdout
      if(Number(behind)===0){
        return reply(`✅ *SUPER-BOT sudah terbaru*\nCommit: ${before}`)
      }

      await git(['pull','--ff-only',remote,branch],cwd)
      const after=(await git(['rev-parse','--short','HEAD'],cwd)).stdout
      await reply(`📦 Update ditemukan\n${before} → ${after}\n\n⏳ Menjalankan npm install lalu restart...`)

      await exec('npm',['install','--omit=dev'],{cwd,timeout:300000})
      setTimeout(()=>{
        exec('pm2',['restart',pm2Name,'--update-env'],{cwd,timeout:30000})
          .catch(e=>console.error('[UPDATEBOT RESTART]',e.stderr||e.message))
      },1500)

      return reply(`✅ *UPDATE BERHASIL*\nCommit: ${before} → ${after}\nPM2: ${pm2Name}\n\nBot akan restart otomatis.`)
    }catch(e){
      console.error('[UPDATEBOT]',e.stderr||e.message)
      const detail=String(e.stderr||e.message||'').slice(0,1000)
      return reply(`❌ *Update gagal*\n\n${detail}`)
    }
  }
}
