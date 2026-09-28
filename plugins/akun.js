const db = require('../lib/database')
const { formatRupiah } = require('../lib/utils')
const { getRoamerAccount, roamerBalance, getSickwBalance } = require('../lib/providers')

function level(role) { return String(role || 'member').toUpperCase() }
function row(label,value){return '  '+String(label).padEnd(16,' ')+' : '+value}

module.exports = {
  commands: ['akun', 'profil'],
  registered: true,
  menu: 'akun',
  async run({ reply, user, isOwner, phone }) {
    const accountPhone = user?.phone || phone || String(process.env.OWNER_NUMBER||'').replace(/\D/g,'')
    if (!isOwner) {
      return reply([
        '*MEMBER ACCOUNT*','━━━━━━━━━━━━━━━━━━━━━━━━','',
        '*ACCOUNT*',
        row('WhatsApp', accountPhone || '-'),
        row('Level', level(user?.role)),
        row('Balance', formatRupiah(user?.balance || 0)),
        row('Transactions', db.countTransactions(phone || accountPhone)),
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        '*SUPER-BOT*  /  MEMBER',
        '_System account connected._'
      ].join('\n'))
    }

    const [roamer, sickw] = await Promise.all([getRoamerAccount(), getSickwBalance()])
    const rb = roamerBalance(roamer)
    const sickwBalance = sickw === null ? 'Unavailable' : formatRupiah(sickw.idr) + ' ($' + sickw.usd.toFixed(3) + ')'

    return reply([
      '*OWNER ACCOUNT*','━━━━━━━━━━━━━━━━━━━━━━━━','',
      '*ACCOUNT*',
      row('WhatsApp', accountPhone || '-'),
      row('Level', 'OWNER'),
      row('Members', db.totalUsers()),
      '',
      '*PROVIDER BALANCE*',
      row('RoamerCheck', rb === null ? 'Unavailable' : formatRupiah(rb)),
      row('SickW', sickwBalance),
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '*SUPER-BOT*  /  OWNER',
      '_System account connected._'
    ].join('\n'))
  }
}
