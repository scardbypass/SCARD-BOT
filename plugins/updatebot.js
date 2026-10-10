const {execFile}=require('child_process')
const path=require('path')
const fs=require('fs')
function exec(command,args=[],options={}){return new Promise((resolve,reject)=>execFile(command,args,{timeout:180000,maxBuffer:2*1024*1024,...options},(e,out,err)=>{if(e){e.stdout=out;e.stderr=err;return reject(e)}resolve({stdout:String(out||'').trim(),stderr:String(err||'').trim()})}))}
async function git(args,cwd){return exec('git',args,{cwd})}
module.exports={commands:['updatebot'],registered:true,ownerOnly:true,menu:'updatebot',async run({reply}){
 const cwd=path.resolve(process.cwd()),branch=String(process.env.GIT_BRANCH||'main').trim(),remote=String(process.env.GIT_REMOTE||'origin').trim(),name=String(process.env.PM2_PROCESS_NAME||'SCARD-BOT').trim()
 try{
  await reply('🔄 *SUPER-BOT UPDATE*\nMengecek update GitHub...')
  const before=(await git(['rev-parse','--short','HEAD'],cwd)).stdout
  const status=(await git(['status','--porcelain','--untracked-files=all'],cwd)).stdout
  const entries=status ? status.split('\n') : []
  const safePaths=new Set(['database/database.json','package-lock.json'])
  const unsafe=entries.filter(line=>!safePaths.has(line.replace(/^\s*[MADRCU?!]{1,2}\s+/, '').trim()))
  if(unsafe.length)return reply('⚠️ *UPDATE DITUNDA*\nAda perubahan kode/file lain yang perlu diperiksa:\n'+unsafe.join('\n').slice(0,700)+'\n\nData tidak diubah. Periksa lewat git status --short.')
  const legacy=path.join(cwd,'database','database.json')
  const runtime=path.join(cwd,'database','runtime.json')
  const backupDir=path.join(cwd,'database','backups')
  fs.mkdirSync(backupDir,{recursive:true})
  // Buat salinan atomik data lama sebelum Git menyentuh file tracked.
  if(fs.existsSync(legacy)){
    const stamp=new Date().toISOString().replace(/[:.]/g,'-')
    fs.copyFileSync(legacy,path.join(backupDir,'legacy-before-update-'+stamp+'.json'))
    if(!fs.existsSync(runtime))fs.copyFileSync(legacy,runtime,fs.constants.COPYFILE_EXCL)
  }
  if(fs.existsSync(runtime)){
    JSON.parse(fs.readFileSync(runtime,'utf8'))
    const stamp=new Date().toISOString().replace(/[:.]/g,'-')
    fs.copyFileSync(runtime,path.join(backupDir,'runtime-before-update-'+stamp+'.json'))
  }
  // Hanya stash file tracked yang berubah; file ignored tidak boleh dijadikan pathspec.
  const trackedChanged=(await git(['diff','--name-only','HEAD','--','database/database.json'],cwd)).stdout
  if(trackedChanged.split('\n').includes('database/database.json')){
    await git(['stash','push','-m','superbot-update-legacy-backup','--','database/database.json'],cwd)
  }
  await git(['fetch',remote,branch],cwd)
  const behind=Number((await git(['rev-list','--count',`HEAD..${remote}/${branch}`],cwd)).stdout)
  if(!behind)return reply(`✅ *Sudah versi terbaru*\nCommit: ${before}\nData runtime aman; perubahan lokal lama tersimpan di git stash bila ada.`)
  await git(['pull','--ff-only',remote,branch],cwd)
  const after=(await git(['rev-parse','--short','HEAD'],cwd)).stdout
  await reply(`📦 *Update ditemukan*\n${before} → ${after}\n\n⏳ npm install & restart...`)
  await exec('npm',['install','--omit=dev','--package-lock=false'],{cwd,timeout:300000})
  await reply(`✅ *UPDATE TERPASANG*\nCommit: ${after}\nData tersimpan di database/runtime.json.\n⏳ Meminta restart PM2...`)
  setTimeout(()=>exec('pm2',['restart',name,'--update-env'],{cwd,timeout:30000}).catch(e=>console.error('[UPDATEBOT RESTART]',e.stderr||e.message)),1200)
 }catch(e){console.error('[UPDATEBOT]',e.stderr||e.message);return reply(`❌ *Update gagal*\n${String(e.stderr||e.message||'').slice(0,800)}`)}
}}