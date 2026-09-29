const {buildSaldoMessage}=require('../lib/saldoScheduler')

module.exports={
  commands:['saldoceir'],
  registered:true,
  ownerOnly:true,
  menu:'saldoceir',
  async run({msg,reply,phone}){
    if(msg.key.remoteJid?.endsWith('@g.us'))return reply('❌ Command ini hanya dapat digunakan di private chat.')
    try{
      return reply(await buildSaldoMessage(phone||String(process.env.OWNER_NUMBER||'').replace(/\D/g,'')))
    }catch(e){
      console.error('[SALDOCEIR]',e)
      return reply('❌ Gagal mengambil saldo provider.')
    }
  }
}
