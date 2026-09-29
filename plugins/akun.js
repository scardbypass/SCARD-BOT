const db=require('../lib/database')
const {formatRupiah}=require('../lib/utils')
const {getRoamerAccount,roamerBalance,getSickwBalance,getAirbotBalance}=require('../lib/providers')

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

    const [roamer,sickw,airbot]=await Promise.all([
      getRoamerAccount(),
      getSickwBalance(),
      getAirbotBalance()
    ])
    const rb=roamerBalance(roamer)

    return reply([
      '╭───〔 *SUPER-BOT ACCOUNT* 〕',
      '│',
      `│ 👤 *OWNER PROFILE*`,
      `│  • WhatsApp : ${accountPhone||'-'}`,
      `│  • Level    : OWNER`,
      `│  • Members  : ${db.totalUsers()}`,
      '│',
      '├───〔 *PROVIDER BALANCE* 〕',
      '│',
      `│ 💳 RoamerCheck`,
      `│    ${rb===null?'Tidak terhubung':formatRupiah(rb)}`,
      '│',
      `│ 💰 AirBot`,
      `│    ${airbot===null?'Tidak terhubung':formatRupiah(airbot.balance)}`,
      '│',
      `│ 🌐 SickW`,
      `│    ${sickw===null?'Tidak terhubung':`${formatRupiah(sickw.idr)}  •  ${sickw.usd.toFixed(3)}`}`,
      '│',
      '╰───〔 *CONNECTED* 〕',
      '_SUPER-BOT • Account Center_'
    ].join('\n'))
  }
}
