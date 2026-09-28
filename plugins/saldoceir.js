const { formatRupiah, getText } = require('../lib/utils')
const { getRoamerAccount, roamerBalance, getSickwBalance } = require('../lib/providers')

function parseRupiah(value) {
  if (!value) return null
  const clean = String(value).replace(/Rp/gi, '').replace(/\./g, '').replace(/,/g, '').replace(/\s/g, '').replace(/[^\d]/g, '')
  if (!clean) return null
  const n = parseInt(clean, 10)
  return Number.isNaN(n) ? null : n
}

function parseAirbotBalance(text) {
  const match = String(text || '').match(/Saldo\s*API\s*:\s*Rp?\s*([\d.,]+)/i)
  return match ? parseRupiah(match[1]) : null
}

function waitAirbotBalance(sock, groupId) {
  return new Promise(resolve => {
    let finished = false
    let timer
    const finish = value => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      try { sock.ev.off('messages.upsert', listener) } catch {}
      resolve(value)
    }
    const listener = update => {
      try {
        for (const msg of update?.messages || []) {
          if (msg?.key?.remoteJid !== groupId || msg?.key?.fromMe) continue
          const text = getText(msg)
          if (!text || !/Saldo\s+CEIR\s+API/i.test(text)) continue
          console.log('[SALDOCEIR AIRBOT RESPONSE]', text)
          const balance = parseAirbotBalance(text)
          if (balance !== null) return finish(balance)
        }
      } catch (e) { console.error('[SALDOCEIR LISTENER]', e) }
    }
    sock.ev.on('messages.upsert', listener)
    timer = setTimeout(() => finish(null), Number(process.env.AIRBOT_TIMEOUT_MS || 15000))
  })
}

module.exports = {
  commands: ['saldoceir'],
  registered: true,
  ownerOnly: true,
  menu: '/saldoceir',
  async run({ sock, msg, reply, phone }) {
    if (msg.key.remoteJid?.endsWith('@g.us')) return reply('❌ Command ini hanya dapat digunakan di private chat.')
    const groupId = String(process.env.AIRBOT_GROUP_ID || '').trim()
    if (!groupId) return reply('❌ AIRBOT_GROUP_ID belum diatur di .env')

    const airbotPromise = waitAirbotBalance(sock, groupId)
    await sock.sendMessage(groupId, { text: process.env.AIRBOT_BALANCE_COMMAND || '/api saldo' })

    const [roamer, sickw, airbot] = await Promise.all([
      getRoamerAccount(),
      getSickwBalance(),
      airbotPromise
    ])
    const rb = roamerBalance(roamer)

    return reply(
`✅ *Profil Akun saldo Anda*

Phone        : ${phone}
Level        : OWNER

────────────
Sumber : RoamerCheck.id
Saldo  : ${rb === null ? 'Tidak dapat terhubung' : formatRupiah(rb)}
────────────
Sumber : airbot
Saldo  : ${airbot === null ? 'Tidak dapat terhubung' : formatRupiah(airbot)}
────────────
Sumber : sickw.com
Saldo  : ${sickw === null ? 'Tidak dapat terhubung' : `${formatRupiah(sickw.idr)} ($${sickw.usd.toFixed(3)})`}
────────────`)
  }
}
