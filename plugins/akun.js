const db = require('../lib/database')
const { formatRupiah } = require('../lib/utils')
const { getRoamerAccount, roamerBalance, getSickwBalance } = require('../lib/providers')

function level(role) { return String(role || 'member').toUpperCase() }

module.exports = {
  commands: ['akun', 'profil'],
  registered: true,
  menu: '/akun',
  async run({ reply, user, isOwner, phone }) {
    if (!isOwner) {
      return reply(`✅ *Profil Akun CeirGo.id Anda*\n\nUsername : ${user.username || '-'}\nSaldo    : ${formatRupiah(user.balance)}\nPhone    : ${user.phone || phone}\nLevel    : ${level(user.role)}\nTotal Trx: ${db.countTransactions(phone)}`)
    }

    const [roamer, sickw] = await Promise.all([getRoamerAccount(), getSickwBalance()])
    const rb = roamerBalance(roamer)
    const pricing = roamer?.pricing || {}

    return reply(
`✅ *Profil Akun CeirGo.id Anda*

Total member : ${db.totalUsers()} aktif
Saldo member : ${formatRupiah(db.totalBalance())}
Phone        : ${phone}
Level        : OWNER

────────────
Sumber : RoamerCheck.id
Saldo  : ${rb === null ? 'Tidak dapat terhubung' : formatRupiah(rb)}
────────────
Sumber : sickw.com
Saldo  : ${sickw === null ? 'Tidak dapat terhubung' : `${formatRupiah(sickw.idr)} ($${sickw.usd.toFixed(3)})`}
────────────

*Harga Layanan RoamerCheck*
────────────────────────
Status           : ${formatRupiah(pricing.status || 0)}
History          : ${formatRupiah(pricing.history || 0)}
Digipos          : ${formatRupiah(pricing.digipos || 0)}
Cek SF           : ${formatRupiah(pricing.sf || 0)}
Generate Barcode : ${formatRupiah(pricing.genbarcode || 2000)}
────────────────────────`)
  }
}
