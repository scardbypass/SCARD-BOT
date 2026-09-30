const {execFile}=require('child_process')
const path=require('path')

function exec(command,args=[],options={}){
  return new Promise((resolve,reject)=>execFile(command,args,{timeout:180000,maxBuffer:4*1024*1024,...options},(e,out,err)=>{
    if(e){e.stdout=out;e.stderr=err;return reject(e)}
    resolve({stdout:String(out||'').trim(),stderr:String(err||'').trim()})
  }))
}
async function git(args,cwd){return exec('git',args,{cwd})}

module.exports={
  commands:['uploadgithub'],
  registered:true,
  ownerOnly:true,
  menuSection:'OWNER',
  menu:'/uploadgithub [pesan commit]',
  async run({reply,text}){
    const cwd=path.resolve(process.cwd())
    const remote=String(process.env.GIT_REMOTE||'origin').trim()
    const allowedBranch=String(process.env.GIT_BRANCH||'v2').trim()
    const message=String(text||'Update from SCARD-BOT VPS').trim().slice(0,150)
    try{
      await reply('🔎 *UPLOAD GITHUB*\n\n⏳ Memeriksa perubahan source di VPS...')
      const branch=(await git(['branch','--show-current'],cwd)).stdout
      if(!branch)return reply('❌ Branch Git tidak dapat dideteksi.')
      if(branch!==allowedBranch)return reply(`❌ Upload dibatalkan.\n\nBranch aktif: *${branch}*\nBranch yang diizinkan: *${allowedBranch}*\n\nPindah ke branch yang benar terlebih dahulu.`)

      const status=(await git(['status','--porcelain'],cwd)).stdout
      if(!status)return reply(`✅ *TIDAK ADA PERUBAHAN*\n\nBranch: ${branch}\nSource VPS sudah bersih.`)

      // Jangan pernah ikut mengunggah secret/session/runtime files.
      const blocked=status.split('\n').filter(x=>/(^|\/)(\.env|sessions?|node_modules|\.scard-update-backup-|.*\.log)(\/|$)/i.test(x.slice(3)))
      if(blocked.length)return reply(`❌ *UPLOAD DIBATALKAN*\n\nDitemukan file sensitif/runtime pada Git status:\n${blocked.slice(0,10).join('\n')}\n\nHapus/untrack file tersebut sebelum upload.`)

      await git(['fetch',remote,branch],cwd)
      const behind=Number((await git(['rev-list','--count',`HEAD..${remote}/${branch}`],cwd)).stdout||0)
      if(behind)return reply(`❌ *UPLOAD DIBATALKAN*\n\nGitHub branch *${branch}* lebih maju ${behind} commit. Jalankan /updatebot terlebih dahulu agar perubahan tidak tertimpa.`)

      const changed=status.split('\n').filter(Boolean).length
      await git(['add','-A'],cwd)
      const staged=(await git(['diff','--cached','--name-only'],cwd)).stdout
      if(!staged)return reply('✅ Tidak ada perubahan source yang dapat di-upload.')

      await git(['commit','-m',message],cwd)
      const commit=(await git(['rev-parse','--short','HEAD'],cwd)).stdout
      await git(['push',remote,branch],cwd)

      return reply(`✅ *UPLOAD GITHUB BERHASIL*\n\n🌿 Branch : ${branch}\n📝 Commit : ${commit}\n📦 File berubah: ${changed}\n💬 Pesan  : ${message}\n\n☁️ Source VPS berhasil dipush ke GitHub.`)
    }catch(e){
      console.error('[UPLOADGITHUB]',e.stderr||e.message)
      return reply(`❌ *UPLOAD GITHUB GAGAL*\n\n${String(e.stderr||e.message||'').slice(0,900)}`)
    }
  }
}
