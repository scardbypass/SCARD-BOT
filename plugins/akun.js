const db = require('../lib/database')
const { formatRupiah } = require('../lib/utils')
const { getRoamerAccount, roamerBalance, getSickwBalance } = require('../lib/providers')

function level(role) { return String(role || 'member').toUpperCase() }

module.exports = {
  commands: ['akun', 'profil'],
  registered: true,
  menu: '/akun',
  async run({ reply, user, isOwner, phone }) {
    const username = user?.username || (isOwner ? 'SCARD' : 'Member')
    const accountPhone = user?.phone || phone
    if (!isOwner) {
      return reply([
        '*S C A R D*', '_MEMBER ACCOUNT_', '━━━━━━━━━━━━━━━━━━━━━━━━', '',
        '*' + username + '*', 'Member Account', '',
        '*ACCOUNT*',
        '  Username        ' + username,
        '  WhatsApp        ' + accountPhone,
        '  Level           ' + level(user?.role), '',
        '*BALANCE*',
        '  Available       ' + formatRupiah(user?.balance || 0),
        '  Transactions    ' + db.countTransactions(phone), '',
        '━━━━━━━━━━━━━━━━━━━━━━━━', '*SCARD-BOT*  /  MEMBER', '_Account connected successfully._'
      ].join('\n'))
    }
    const [roamer, sickw] = await Promise.all([getRoamerAccount(), getSickwBalance()])
    const rb = roamerBalance(roamer)
    const pricing = roamer?.pricing || {}
    const sickwBalance = sickw === null ? 'Unavailable' : formatRupiah(sickw.idr) + ' ($' + sickw.usd.toFixed(3) + ')'
    return reply([
      '*S C A R D*', '_OWNER ACCOUNT_', '━━━━━━━━━━━━━━━━━━━━━━━━', '',
      '*' + username + '*', 'Owner Account', '',
      '*ACCOUNT*',
      '  WhatsApp        ' + accountPhone,
      '  Level           OWNER',
      '  Members         ' + db.totalUsers(),
      '  Member Balance  ' + formatRupiah(db.totalBalance()), '',
      '*PROVIDER BALANCE*',
      '  RoamerCheck     ' + (rb === null ? 'Unavailable' : formatRupiah(rb)),
      '  SickW           ' + sickwBalance, '',
      '*ROAMERCHECK PRICE*',
      '  Status          ' + formatRupiah(pricing.status || 0),
      '  History         ' + formatRupiah(pricing.history || 0),
      '  Digipos         ' + formatRupiah(pricing.digipos || 0),
      '  Cek SF          ' + formatRupiah(pricing.sf || 0),
      '  Barcode         ' + formatRupiah(pricing.genbarcode || 2000), '',
      '━━━━━━━━━━━━━━━━━━━━━━━━', '*SCARD-BOT*  /  OWNER', '_System account connected._'
    ].join('\n'))
  }
}
