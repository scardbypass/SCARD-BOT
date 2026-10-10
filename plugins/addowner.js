const db = require('../lib/database')

const normalize = value => String(value || '').replace(/\D/g, '')
const validPhone = value => /^62[1-9]\d{7,12}$/.test(value)

module.exports = {
  commands: ['addowner', 'delowner', 'listowner'],
  registered: true,
  ownerOnly: true,
  menu: '/addowner 628xxx | /delowner 628xxx | /listowner (chat pribadi)',
  async run({ command, args = [], msg, reply, isOwner }) {
    if (!isOwner) return
    const chat = msg?.key?.remoteJid || ''
    if (chat.endsWith('@g.us')) return reply('❌ Kelola owner hanya melalui chat pribadi dengan SUPER-BOT.')
    const primary = normalize(process.env.OWNER_NUMBER)
    const number = normalize(args[0])
    if (command === 'listowner') {
      const extras = db.getSetting('extraOwners', [])
      return reply('👑 *OWNER SUPER-BOT*\nUtama: ' + (primary || '-') +
        '\nTambahan:\n' + (extras.length ? extras.map((n, i) => (i + 1) + '. ' + n).join('\n') : '(belum ada)'))
    }
    if (!validPhone(number)) return reply('❌ Nomor belum lengkap. Gunakan format /' + command + ' 6281234567890')
    if (number === primary) return reply('ℹ️ Nomor tersebut adalah owner utama dari .env.')
    const extras = db.getSetting('extraOwners', [])
    if (command === 'addowner') {
      if (extras.includes(number)) return reply('ℹ️ Nomor sudah menjadi owner.')
      db.setSetting('extraOwners', [...new Set([...extras, number])])
      return reply('✅ Owner tambahan berhasil disimpan: ' + number)
    }
    if (!extras.includes(number)) return reply('❌ Nomor tidak ditemukan pada owner tambahan.')
    db.setSetting('extraOwners', extras.filter(n => n !== number))
    return reply('✅ Akses owner tambahan dicabut: ' + number)
  }
}
