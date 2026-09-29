const {execFile}=require('child_process')

function exec(command,args=[],options={}){
  return new Promise((resolve,reject)=>{
    execFile(command,args,{timeout:15000,maxBuffer:1024*1024,...options},(error,stdout,stderr)=>{
      if(error){error.stdout=stdout;error.stderr=stderr;return reject(error)}
      resolve(String(stdout||'')+String(stderr||''))
    })
  })
}
function clean(text){
  return String(text||'')
    .replace(/(api[_-]?key|api[_-]?secret|token|authorization|password|passwd|secret)(\s*[:=]\s*)([^\s,;"']+)/gi,'$1$2***')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]+/gi,'$1***')
    .replace(/(sk_[A-Za-z0-9_-]+)/g,'***')
}
module.exports={
  commands:['logs'],
  registered:true,
  ownerOnly:true,
  menu:'logs [jumlah]',
  async run({reply,args}){
    const requested=parseInt(args?.[0],10)
    const lines=Number.isFinite(requested)?Math.min(Math.max(requested,10),100):40
    const processName=String(process.env.PM2_PROCESS_NAME||'SCARD-BOT').trim()
    try{
      const out=await exec('pm2',['logs',processName,'--lines',String(lines),'--nostream','--raw'])
      let safe=clean(out).trim()
      if(!safe)safe='Tidak ada log.'
      if(safe.length>12000)safe=safe.slice(-12000)
      return reply(`📋 *SUPER-BOT LOGS*\nProcess: ${processName}\nLast: ${lines} lines\n\n```\n${safe}\n````)
    }catch(e){
      console.error('[LOGS]',e.message)
      return reply('❌ Gagal membaca log PM2. Pastikan PM2_PROCESS_NAME sesuai dengan nama proses bot.')
    }
  }
}
