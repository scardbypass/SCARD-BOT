const {execFile}=require('child_process')

function exec(command,args=[]){
  return new Promise((resolve,reject)=>{
    execFile(command,args,{timeout:15000,maxBuffer:1024*1024},(error,stdout,stderr)=>{
      if(error){error.stderr=stderr;return reject(error)}
      resolve(String(stdout||'')+String(stderr||''))
    })
  })
}

function clean(text){
  return String(text||'')
    .replace(/(api[_-]?key|api[_-]?secret|token|authorization|password|passwd|secret)(\s*[:=]\s*)([^\s,;"']+)/gi,'$1$2***')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]+/gi,'$1***')
    .replace(/sk_[A-Za-z0-9_-]+/g,'***')
}

module.exports={
  commands:['logs'],
  registered:true,
  ownerOnly:true,
  menu:'logs [jumlah]',
  async run({reply,args}){
    const requested=parseInt(args?.[0],10)
    const lines=Number.isFinite(requested)?Math.min(Math.max(requested,10),100):40
    const name=String(process.env.PM2_PROCESS_NAME||'SCARD-BOT').trim()
    try{
      let out=clean(await exec('pm2',['logs',name,'--lines',String(lines),'--nostream','--raw'])).trim()
      if(!out)out='Tidak ada log.'
      if(out.length>12000)out=out.slice(-12000)
      const message=[
        '📋 *SUPER-BOT LOGS*',
        `Process : ${name}`,
        `Lines   : ${lines}`,
        '',
        out
      ].join('\n')
      return reply(message)
    }catch(error){
      console.error('[LOGS]',error.message)
      return reply('❌ Gagal membaca log PM2. Cek PM2_PROCESS_NAME di .env.')
    }
  }
}
