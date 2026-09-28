const {formatRupiah}=require('../lib/utils')
const {getRoamerAccount,roamerBalance,getSickwBalance,getAirbotBalance}=require('../lib/providers')

function line(label,value){return `│ ${String(label).padEnd(12,' ')} : ${value}`}

module.exports={
  commands:['saldoceir'],
  registered:true,
  ownerOnly:true,
  menu:'saldoceir',
  async run({msg,reply,phone}){
    if(msg.key.remoteJid?.endsWith('@g.us'))return reply('❌ Command ini hanya dapat digunakan di private chat.')

    const [roamer,sickw,airbot]=await Promise.all([
      getRoamerAccount(),
      getSickwBalance(),
      getAirbotBalance()
    ])
    const rb=roamerBalance(roamer)

    return reply([
      '╭─ *SUPER-BOT • BALANCE*',
      line('WhatsApp',phone||'-'),
      line('Level','OWNER'),
      '├──────────────────',
      line('RoamerCheck',rb===null?'Tidak terhubung':formatRupiah(rb)),
      line('AirBot',airbot===null?'Tidak terhubung':formatRupiah(airbot.balance)),
      line('SickW',sickw===null?'Tidak terhubung':`${formatRupiah(sickw.idr)} ($${sickw.usd.toFixed(3)})`),
      '╰──────────────────'
    ].join('\n'))
  }
}
