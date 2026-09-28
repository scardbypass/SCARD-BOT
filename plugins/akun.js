const db=require('../lib/database')
const {formatRupiah}=require('../lib/utils')
const {getRoamerAccount,roamerBalance,getSickwBalance}=require('../lib/providers')
const {waitAirbotBalance}=require('./saldoceir')

function line(label,value){return `│ ${String(label).padEnd(12,' ')} : ${value}`}

module.exports={
  commands:['akun','profil'],
  registered:true,
  menu:'akun',
  async run({sock,msg,reply,user,isOwner,phone}){
    const accountPhone=user?.phone||phone||String(process.env.OWNER_NUMBER||'').replace(/\D/g,'')

    if(!isOwner){
      return reply([
        '╭─ *SUPER-BOT ACCOUNT*',
        line('WhatsApp',accountPhone||'-'),
        line('Level',String(user?.role||'MEMBER').toUpperCase()),
        line('Saldo',formatRupiah(user?.balance||0)),
        line('Transaksi',db.countTransactions(phone||accountPhone)),
        '╰──────────────────',
        '_Account connected._'
      ].join('\n'))
    }

    const groupId=String(process.env.AIRBOT_GROUP_ID||'').trim()
    let airbotPromise=Promise.resolve(null)
    if(groupId){
      airbotPromise=waitAirbotBalance(sock,groupId)
      await sock.sendMessage(groupId,{text:process.env.AIRBOT_BALANCE_COMMAND||'/api saldo'}).catch(e=>console.error('[AKUN AIRBOT]',e.message))
    }

    const [roamer,sickw,airbot]=await Promise.all([
      getRoamerAccount(),
      getSickwBalance(),
      airbotPromise
    ])
    const rb=roamerBalance(roamer)

    return reply([
      '╭─ *SUPER-BOT • OWNER*',
      line('WhatsApp',accountPhone||'-'),
      line('Level','OWNER'),
      line('Members',db.totalUsers()),
      '├──────────────────',
      '│ *PROVIDER BALANCE*',
      line('RoamerCheck',rb===null?'Tidak terhubung':formatRupiah(rb)),
      line('AirBot',airbot===null?'Tidak terhubung':formatRupiah(airbot)),
      line('SickW',sickw===null?'Tidak terhubung':`${formatRupiah(sickw.idr)} ($${sickw.usd.toFixed(3)})`),
      '╰──────────────────',
      '_System account connected._'
    ].join('\n'))
  }
}
