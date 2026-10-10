const { settings, save, send, allGroups, addGroup, removeGroup, DEFAULTS, GROUP } = require('../lib/ibadahScheduler')
const validTime = value => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)
const validGroup = value => /^[0-9]+(?:-[0-9]+)?@g\.us$/.test(value)
const usage = [
  '🙏 *IBADAH HARIAN • MULTI GRUP*',
  'Khusus owner SUPER-BOT.',
  '/ih help — menu lengkap',
  '/ih grup — daftar grup',
  '/ih setup 05:00 12:00 18:00 — daftar + aktifkan sekaligus',
  '/ih setup 06:00 off 19:00 — matikan sesi siang',
  '/ih add — daftar grup saat ini',
  '/ih add 120xxx@g.us — tambah via ID',
  '/ih del — hapus grup saat ini',
  '/ih del 120xxx@g.us — hapus via ID',
  '/ih status — pengaturan grup',
  '/ih on | off — otomatis grup',
  '/ih jam pagi 05:00 — atur waktu',
  '/ih jam siang 12:00',
  '/ih jam malam 18:00',
  '/ih pagi on|off — sesi pagi',
  '/ih siang on|off — sesi siang',
  '/ih malam on|off — sesi malam',
  '/ih audio on|off — audio per grup',
  '/ih tag on|off — @semua per grup',
  '/ih test pagi|siang|malam — uji grup',
  'Dari chat pribadi: /ih status 120xxx@g.us',
  'Dari chat pribadi: /ih on 120xxx@g.us',
  'Dari chat pribadi: /ih jam pagi 06:00 120xxx@g.us',
  'Dari chat pribadi: /ih test malam 120xxx@g.us',
  'Semua waktu Asia/Jakarta (WIB).'
].join('\n')

module.exports = {
  commands: ['ibadahharian', 'ih'],
  registered: true,
  ownerOnly: true,
  menu: '/ih setup 05:00 12:00 18:00 | help | grup | add | del | status | on/off | jam | audio | tag | test',
  async run({ args = [], msg, reply }) {
    const [action = 'help', second, third, fourth] = args.map(v => String(v).toLowerCase())
    const chat = msg?.key?.remoteJid || ''
    const inGroup = validGroup(chat)
    const target = [fourth, third, second].find(validGroup) || (inGroup ? chat : null)
    if (action === 'help' || action === 'menu') return reply(usage)
    if (action === 'grup' || action === 'list') {
      const groups = allGroups()
      return reply('🙏 *GRUP IBADAH HARIAN*\n' + Object.entries(groups).map(([id, c], i) =>
        (i + 1) + '. ' + id + ' • ' + (c.enabled ? 'ON' : 'OFF') +
        ' • Audio ' + (c.audioEnabled !== false ? 'ON' : 'OFF') +
        ' • Tag ' + (c.tagEnabled !== false ? 'ON' : 'OFF') +
        '\n   ' + Object.entries(c.sessions || {}).map(([n, v]) => n + ' ' + (v.enabled ? v.time : 'OFF')).join(' | ')
      ).join('\n'))
    }
    if (action === 'setup') {
      if (!inGroup) return reply('❌ /ih setup hanya dapat dijalankan langsung di grup tujuan.')
      const values = [second, third, fourth]
      if (!values.every(v => v === 'off' || validTime(v || ''))) {
        return reply('❌ Format: /ih setup 05:00 12:00 18:00\nUntuk menonaktifkan sesi: /ih setup 06:00 off 19:00')
      }
      if (!settings(chat)) addGroup(chat)
      const next = settings(chat)
      for (const [i, name] of Object.keys(DEFAULTS).entries()) {
        next.sessions[name] = { enabled: values[i] !== 'off', time: values[i] === 'off' ? (next.sessions[name]?.time || DEFAULTS[name]) : values[i] }
      }
      next.enabled = true
      next.audioEnabled = true
      next.tagEnabled = true
      save(next)
      return reply(['✅ *IBADAH HARIAN AKTIF*', 'Grup: ' + chat,
        ...Object.entries(next.sessions).map(([name, v]) => name.toUpperCase() + ': ' + (v.enabled ? v.time + ' WIB' : 'OFF')),
        'Audio: ON', 'Tag @semua: ON', 'Otomatis: ON', 'Gunakan /ih status untuk melihat pengaturan.'].join('\n'))
    }
    if (action === 'add') {
      if (!target) return reply('❌ Jalankan di grup tujuan atau gunakan /ih add 120xxx@g.us')
      return reply(addGroup(target) ? '✅ Grup terdaftar (jadwal OFF sampai /ih on). Tag otomatis ON.' : 'ℹ️ Grup sudah terdaftar.')
    }
    if (action === 'del') {
      if (!target) return reply('❌ Tentukan ID grup atau jalankan di grup.')
      return reply(removeGroup(target) ? '✅ Grup dihapus dari jadwal.' : '❌ Grup belum terdaftar.')
    }
    if (!target) return reply('❌ Jalankan di grup tujuan, atau sertakan ID grup.\n' + usage)
    const cfg = settings(target)
    if (!cfg) return reply('❌ Grup belum terdaftar. Gunakan /ih add')
    if (action === 'status') return reply([
      '🙏 *STATUS IBADAH HARIAN*',
      'Grup: ' + target,
      'Otomatis: ' + (cfg.enabled ? 'ON' : 'OFF'),
      'Audio: ' + (cfg.audioEnabled !== false ? 'ON' : 'OFF'),
      'Tag @semua: ' + (cfg.tagEnabled !== false ? 'ON' : 'OFF'),
      ...Object.entries(cfg.sessions).map(([name, v]) => name + ': ' + (v.enabled ? v.time + ' WIB' : 'OFF')),
      'Materi: ibadahharian.net • Dibagikan oleh mdcjombang.id',
      '/ih help untuk semua perintah'
    ].join('\n'))
    if (['on', 'off'].includes(action)) {
      cfg.enabled = action === 'on'; save(cfg)
      return reply('✅ Otomatis grup ' + action.toUpperCase())
    }
    if (['audio', 'tag'].includes(action) && ['on', 'off'].includes(second)) {
      cfg[action === 'audio' ? 'audioEnabled' : 'tagEnabled'] = second === 'on'
      save(cfg)
      return reply('✅ ' + action.toUpperCase() + ' ' + second.toUpperCase() + ' untuk grup ini.')
    }
    if (DEFAULTS[action] && ['on', 'off'].includes(second)) {
      cfg.sessions[action].enabled = second === 'on'; save(cfg)
      return reply('✅ Sesi ' + action + ' ' + second.toUpperCase())
    }
    if (action === 'jam' && DEFAULTS[second] && validTime(third || '')) {
      cfg.sessions[second].time = third; save(cfg)
      return reply('✅ Jam ' + second + ': ' + third + ' WIB')
    }
    if (action === 'test' && DEFAULTS[second]) {
      try { await send(second, true, target); return }
      catch (e) { return reply('❌ ' + e.message) }
    }
    return reply('❌ Perintah tidak valid. Gunakan /ih help')
  }
}
