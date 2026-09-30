const db=require('../lib/database')
const {formatRupiah}=require('../lib/utils')
const {getRoamerAccount,roamerBalance,getSickwBalance,getAirbotBalance,getEsimAccessBalance,getOrderKuotaBalance}=require('../lib/providers')
const {isProviderEnabled}=require('../lib/providerSettings')

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

    const [roamer,sickw,airbot,esimAccess,orderKuota]=await Promise.all([
      isProviderEnabled('roamercheck')?getRoamerAccount():null,
      isProviderEnabled('sickw')?getSickwBalance():null,
      isProviderEnabled('airbot')?getAirbotBalance():null,
      isProviderEnabled('esimaccess')?getEsimAccessBalance():null,
      isProviderEnabled('orderkuota')?getOrderKuotaBalance():null
    ])
    const rb=roamerBalance(roamer)
    const show=(k,value)=>isProviderEnabled(k)?value:'⚫ OFF'

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
      `│    ${show('roamercheck',rb===null?'Tidak terhubung':formatRupiah(rb))}`,
      '│',
      `│ 💰 AirBot`,
      `│    ${show('airbot',airbot===null?'Tidak terhubung':formatRupiah(airbot.balance))}`,
      '│',
      `│ 🌐 SickW`,
      `│    ${show('sickw',sickw===null?'Tidak terhubung':`${formatRupiah(sickw.idr)}  •  ${sickw.usd.toFixed(3)}`)}`,
      '│',
      `│ 📡 eSIMAccess`,
      `│    ${show('esimaccess',esimAccess===null?'Tidak terhubung':`${formatRupiah(esimAccess.idr)}  •  ${esimAccess.usd.toFixed(3)}`)}`,
      '│',
      `│ 🧾 Order Kuota`,
      `│    ${show('orderkuota',orderKuota===null?'Tidak terhubung':formatRupiah(orderKuota.balance))}`,
      '│',
      '╰───〔 *CONNECTED* 〕',
      '_SUPER-BOT • Account Center_'
    ].join('\n'))
  }
}
