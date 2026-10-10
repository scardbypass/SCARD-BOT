const {execFile}=require('child_process')
const path=require('path')
function exec(command,args=[],options={}){return new Promise((resolve,reject)=>execFile(command,args,{timeout:180000,maxBuffer:2*1024*1024,...options},(e,out,err)=>{if(e){e.stdout=out;e.stderr=err;return reject(e)}resolve({stdout:String(out||'').trim(),stderr:String(err||'').trim()})}))}
async function git(args,cwd){return exec('git',args,{cwd})}
module.exports={commands:['updatebot'],registered:true,ownerOnly:true,menu:'updatebot',async run({reply}){
 const cwd=path.resolve(process.cwd()),branch=String(process.env.GIT_BRANCH||'main').trim(),remote=String(process.env.GIT_REMOTE||'origin').trim(),name=String(process.env.PM2_PROCESS_NAME||'SCARD-BOT').trim()
 try{
  await reply('🔄 *SUPER-BOT UPDATE*\nMengecek update GitHub...')
  const before=(await git(['rev-parse','--short','HEAD'],cwd)).stdout
  const changes=(await git(['status','--porcelain'],cwd)).stdout
  if(changes)return reply('⚠️ *UPDATE DITUNDA*\nPerubahan lokal ditemukan:\n'+changes.slice(0,700)+'\n\nData bot tidak disentuh. Di VPS, backup database lalu simpan perubahan dengan git stash sebelum menjalankan update kembali.')
  await git(['fetch',remote,branch],cwd)
  const behind=Number((await git(['rev-list','--count',`HEAD..${remote}/${branch}`],cwd)).stdout)
  if(!behind)return reply(`✅ *Sudah versi terbaru*\nCommit: ${before}`)
  await git(['pull','--ff-only',remote,branch],cwd)
  const after=(await git(['rev-parse','--short','HEAD'],cwd)).stdout
  await reply(`📦 *Update ditemukan*\n${before} → ${after}\n\n⏳ npm install & restart...`)
  await exec('npm',['install','--omit=dev','--package-lock=false'],{cwd,timeout:300000})
  await reply(`✅ *UPDATE BERHASIL*\nCommit: ${after}\nBot akan restart otomatis.`)
  setTimeout(()=>exec('pm2',['restart',name,'--update-env'],{cwd,timeout:30000}).catch(e=>console.error('[UPDATEBOT RESTART]',e.stderr||e.message)),1200)
 }catch(e){console.error('[UPDATEBOT]',e.stderr||e.message);return reply(`❌ *Update gagal*\n${String(e.stderr||e.message||'').slice(0,800)}`)}
}}