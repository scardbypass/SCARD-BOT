const { settings, save, send, allGroups, addGroup, removeGroup, DEFAULTS, GROUP } = require('../lib/ibadahScheduler')
const validTime = value => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)
const validGroup = value => /^[0-9]+(?:-[0-9]+)?@g\.us$/.test(value)
const usage = [
  '🙏 *IBADAH HARIAN • MULTI GRUP*',
  'Khusus owner SUPER-BOT.',
  '/ih help — menu lengkap',
  '/ih grup — daftar grup',
  '/ih pagi 05:00 — aktifkan pagi saja',
  '/ih siang 12:00 — aktifkan siang saja',
  '/ih malam 18:00 — aktifkan malam saja',
  '/ih set 18:00 — aktifkan malam saja',
  '/ih set 12:00 18:00 — aktifkan siang dan malam',
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
  menu: '/ih pagi 05:00 | siang 12:00 | malam 18:00 | set 18:00 | set 12:00 18:00 | setup 05:00 12:00 18:00 | help | grup | add | del | status | on/off | jam | audio | tag | test',
  async run({ args = [], msg, reply, sock }) {
    const [action = 'help', second, third, fourth] = args.map(v => String(v).toLowerCase())
    const chat = msg?.key?.remoteJid || ''
    const inGroup = validGroup(chat)
    const target = [fourth, third, second].find(validGroup) || (inGroup ? chat : null)
    if (action === 'help' || action === 'menu') return reply(usage)
    if (action === 'grup' || action === 'list') {
      const groups = Object.entries(allGroups())
      const details = await Promise.all(groups.map(async ([id, cfg], i) => {
        let name = id
        if (typeof sock?.groupMetadata === 'function') {
          try {
            const info = await Promise.race([
              sock.groupMetadata(id),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ])
            name = info?.subject || id
          } catch (error) {
            console.warn('[IBADAH GROUP NAME]', id, error.message)
          }
        }
        const sessions = cfg.sessions || {}
        return [
          (i + 1) + '. 📱 *' + name + '*',
          '   ID: ' + id,
          '   Status: ' + (cfg.enabled ? 'ON' : 'OFF'),
          '   Audio: ' + (cfg.audioEnabled !== false ? 'ON' : 'OFF') +
            ' | Tag @semua: ' + (cfg.tagEnabled !== false ? 'ON' : 'OFF'),
          ...Object.entries(DEFAULTS).map(([key]) => {
            const label = { pagi: '🌅 Pagi', siang: '☀️ Siang', malam: '🌙 Malam' }[key]
            const value = sessions[key]
            return '   ' + label + ': ' + (value?.enabled ? value.time + ' WIB' : 'OFF')
          })
        ].join('\\n')
      }))
      return reply('🙏 *GRUP IBADAH HARIAN*\\n\\n' + (details.length ? details.join('\\n\\n') : 'Belum ada grup terdaftar.'))
    }
    if (DEFAULTS[action] && validTime(second || '') && !third) {
      if (!inGroup) return reply('❌ Pengaturan cepat sesi hanya dapat dijalankan di grup tujuan.')
      if (!settings(chat)) addGroup(chat)
      const next = settings(chat)
      for (const name of Object.keys(DEFAULTS)) {
        next.sessions[name] = {
          enabled: name === action,
          time: name === action ? second : (next.sessions[name]?.time || DEFAULTS[name])
        }
      }
      next.enabled = true
      next.audioEnabled = true
      next.tagEnabled = true
      save(next)
      return reply(['✅ *IBADAH HARIAN AKTIF*', 'Grup: ' + chat,
        ...Object.entries(next.sessions).map(([name, v]) => name.toUpperCase() + ': ' + (v.enabled ? v.time + ' WIB' : 'OFF')),
        'Audio: ON', 'Tag @semua: ON', 'Otomatis: ON'].join('\n'))
    }
    if (action === 'set') {
      if (!inGroup) return reply('❌ /ih set hanya dapat dijalankan langsung di grup tujuan.')
      const values = args.slice(1).map(v => String(v).toLowerCase())
      if (values.length < 1 || values.length > 3 || !values.every(validTime)) {
        return reply('❌ Gunakan /ih set 18:00 atau /ih set 12:00 18:00 atau /ih set 05:00 12:00 18:00')
      }
      if (!settings(chat)) addGroup(chat)
      const next = settings(chat)
      const sessions = values.length === 1 ? ['malam'] : values.length === 2 ? ['siang', 'malam'] : ['pagi', 'siang', 'malam']
      for (const name of Object.keys(DEFAULTS)) {
        const i = sessions.indexOf(name)
        next.sessions[name] = { enabled: i !== -1, time: i !== -1 ? values[i] : (next.sessions[name]?.time || DEFAULTS[name]) }
      }
      next.enabled = true
      next.audioEnabled = true
      next.tagEnabled = true
      save(next)
      return reply(['✅ *IBADAH HARIAN AKTIF*', 'Grup: ' + chat,
        ...Object.entries(next.sessions).map(([name, v]) => name.toUpperCase() + ': ' + (v.enabled ? v.time + ' WIB' : 'OFF')),
        'Audio: ON', 'Tag @semua: ON', 'Otomatis: ON'].join('\n'))
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
