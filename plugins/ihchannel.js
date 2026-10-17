const { allChannels, channelSettings, addChannel, saveChannel, deleteChannel, send, DEFAULTS, CHANNEL_RE } = require('../lib/ibadahScheduler')
const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
const help = [
  '📢 *IBADAH HARIAN • CHANNEL*',
  'Hanya owner, lewat chat pribadi.',
  '/ihchannel add 123456@newsletter',
  '/ihchannel list',
  '/ihchannel pagi 05:00 123456@newsletter',
  '/ihchannel siang 12:00 123456@newsletter',
  '/ihchannel malam 18:00 123456@newsletter',
  '/ihchannel setup 05:00 12:00 18:00 123456@newsletter',
  '/ihchannel setup off 12:00 18:00 123456@newsletter',
  '/ihchannel audio on|off 123456@newsletter',
  '/ihchannel on|off 123456@newsletter',
  '/ihchannel status 123456@newsletter',
  '/ihchannel test pagi|siang|malam 123456@newsletter',
  '/ihchannel del 123456@newsletter',
  'Bot wajib admin Channel dengan izin posting. Tag @semua tidak digunakan.'
].join('\n')
module.exports = {
  commands: ['ihchannel', 'ihch'],
  registered: true,
  ownerOnly: true,
  menu: '/ihchannel help — kelola jadwal Channel WhatsApp (owner, chat pribadi)',
  async run({ args = [], msg, reply }) {
    if ((msg?.key?.remoteJid || '').endsWith('@g.us')) return reply('❌ Atur Channel lewat chat pribadi owner.')
    const [action = 'help', ...rest] = args.map(v => String(v).toLowerCase())
    if (action === 'help' || action === 'menu') return reply(help)
    if (action === 'list') {
      const entries = Object.entries(allChannels())
      return reply(entries.length ? '📢 *CHANNEL TERDAFTAR*\n' + entries.map(([id,c]) => id + ' • ' + (c.enabled ? 'ON' : 'OFF')).join('\n') : 'Belum ada Channel. Gunakan /ihchannel add ID')
    }
    const id = rest[rest.length - 1]
    if (!CHANNEL_RE.test(id || '')) return reply('❌ Sertakan ID Channel, contoh: 123456@newsletter\n/ihchannel help')
    if (action === 'add') return reply(addChannel(id) ? '✅ Channel terdaftar. Atur jadwal untuk mengaktifkan.' : 'ℹ️ Channel sudah terdaftar.')
    if (action === 'del') return reply(deleteChannel(id) ? '✅ Channel dihapus.' : '❌ Channel belum terdaftar.')
    const cfg = channelSettings(id)
    if (!cfg) return reply('❌ Channel belum terdaftar. Jalankan /ihchannel add ' + id)
    if (action === 'status') return reply(['📢 *STATUS CHANNEL*', 'ID: ' + id,
      'Otomatis: ' + (cfg.enabled ? 'ON' : 'OFF'),
      'Audio: ' + (cfg.audioEnabled ? 'ON' : 'OFF'),
      ...Object.entries(cfg.sessions).map(([name,v]) => name + ': ' + (v.enabled ? v.time + ' WIB' : 'OFF'))].join('\n'))
    if (action === 'test' && DEFAULTS[rest[0]]) {
      try { await send(rest[0], true, id); return reply('✅ Tes posting Channel berhasil dikirim.') }
      catch(e) { return reply('❌ Gagal posting Channel: ' + e.message + '\nPastikan bot admin dengan izin posting dan versi Baileys mendukung newsletter.') }
    }
    if (action === 'on' || action === 'off') cfg.enabled = action === 'on'
    else if (action === 'audio' && ['on','off'].includes(rest[0])) cfg.audioEnabled = rest[0] === 'on'
    else if (DEFAULTS[action] && validTime(rest[0] || '') && rest.length === 2) {
      for (const name of Object.keys(DEFAULTS)) cfg.sessions[name] = {
        enabled: name === action, time: name === action ? rest[0] : (cfg.sessions[name]?.time || DEFAULTS[name])
      }
      cfg.enabled = true
    } else if (action === 'setup' && rest.length === 4 && rest.slice(0,3).every(v => v === 'off' || validTime(v))) {
      for (const [i,name] of Object.keys(DEFAULTS).entries()) {
        const value = rest[i]
        cfg.sessions[name] = { enabled: value !== 'off', time: value === 'off' ? (cfg.sessions[name]?.time || DEFAULTS[name]) : value }
      }
      cfg.enabled = true
    } else return reply('❌ Format tidak valid. /ihchannel help')
    saveChannel(id, cfg)
    return reply(['✅ *CHANNEL DIPERBARUI*', 'ID: ' + id, 'Otomatis: ' + (cfg.enabled ? 'ON' : 'OFF'),
      'Audio: ' + (cfg.audioEnabled ? 'ON' : 'OFF'),
      ...Object.entries(cfg.sessions).map(([name,v]) => name + ': ' + (v.enabled ? v.time + ' WIB' : 'OFF'))].join('\n'))
  }
}
