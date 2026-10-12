const { settings, save, send, allGroups, addGroup, removeGroup, DEFAULTS, GROUP } = require('../lib/ibadahScheduler')
const validTime = value => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)
const validGroup = value => /^[0-9]+(?:-[0-9]+)?@g\.us$/.test(value)
const usage = [
  '╭────────────────────╮',
  '🙏 *IBADAH HARIAN V2*',
  '   *PUSAT PENGATURAN GRUP*',
  '╰────────────────────╯',
  '',
  '👑 Khusus owner SUPER-BOT',
  '🕒 Zona waktu: WIB',
  '',
  '━━━━━━━━━━━━━━━━━━',
  '⚡ *PENGATURAN CEPAT*',
  '',
  '*/ih pagi 05:00*',
  '   └ Hanya sesi pagi',
  '*/ih siang 12:00*',
  '   └ Hanya sesi siang',
  '*/ih malam 18:00*',
  '   └ Hanya sesi malam',
  '*/ih set 12:00 18:00*',
  '   └ Siang dan malam',
  '*/ih setup 05:00 12:00 18:00*',
  '   └ Semua sesi aktif',
  '',
  '━━━━━━━━━━━━━━━━━━',
  '📱 *MANAJEMEN GRUP*',
  '',
  '*/ih grup* — Daftar nama grup',
  '*/ih add* — Daftarkan grup',
  '*/ih del* — Hapus grup',
  '*/ih status* — Lihat pengaturan',
  '*/ih on* / */ih off* — Otomatis',
  '',
  '━━━━━━━━━━━━━━━━━━',
  '🕒 *JADWAL & SESI*',
  '',
  '*/ih jam pagi 05:00*',
  '*/ih jam siang 12:00*',
  '*/ih jam malam 18:00*',
  '*/ih pagi on/off*',
  '*/ih siang on/off*',
  '*/ih malam on/off*',
  '',
  '━━━━━━━━━━━━━━━━━━',
  '⚙️ *PENGATURAN TAMBAHAN*',
  '',
  '*/ih audio on/off* — Audio',
  '*/ih tag on/off* — Tag @semua',
  '*/ih test malam* — Uji pengiriman',
  '',
  '━━━━━━━━━━━━━━━━━━',
  '💡 *TIPS*',
  '• Jalankan setup cepat di grup tujuan.',
  '• Gunakan */ih setup 06:00 off 19:00* untuk mematikan siang.',
  '• Dari chat pribadi, sertakan ID grup.',
  '• Ketik */ih help lengkap* untuk seluruh contoh.',
  '',
  '_mdcjombang.id • SUPER-BOT_'
].join('\n')
const usageFull = [
  '📖 *IBADAH HARIAN V2 • PANDUAN LENGKAP*',
  '',
  '*Pengaturan cepat (di grup)*',
  '/ih pagi 05:00',
  '/ih siang 12:00',
  '/ih malam 18:00',
  '/ih set 18:00',
  '/ih set 12:00 18:00',
  '/ih set 05:00 12:00 18:00',
  '/ih setup 05:00 12:00 18:00',
  '/ih setup 06:00 off 19:00',
  '',
  '*Manajemen grup*',
  '/ih grup  •  /ih list',
  '/ih add  •  /ih del',
  '/ih status  •  /ih on  •  /ih off',
  '',
  '*Jadwal dan opsi*',
  '/ih jam pagi 05:00',
  '/ih jam siang 12:00',
  '/ih jam malam 18:00',
  '/ih pagi on/off',
  '/ih siang on/off',
  '/ih malam on/off',
  '/ih audio on/off',
  '/ih tag on/off',
  '/ih test pagi|siang|malam',
  '',
  '*Dari chat pribadi owner (ID grup)*',
  '/ih add 120xxx@g.us',
  '/ih del 120xxx@g.us',
  '/ih status 120xxx@g.us',
  '/ih on 120xxx@g.us',
  '/ih jam malam 19:00 120xxx@g.us',
  '/ih audio off 120xxx@g.us',
  '/ih tag on 120xxx@g.us',
  '/ih test malam 120xxx@g.us',
  '',
  '🕒 Seluruh jadwal mengikuti WIB.',
  '👑 Hanya owner yang dapat mengatur.'
].join('\n')

module.exports = {
  commands: ['ibadahharian', 'ih', 'ihv2'],
  registered: true,
  ownerOnly: true,
  menu: '/ih pagi 05:00 | siang 12:00 | malam 18:00 | set 18:00 | set 12:00 18:00 | setup 05:00 12:00 18:00 | help | grup | add | del | status | on/off | jam | audio | tag | test',
  async run({ args = [], msg, reply, sock }) {
    const [action = 'help', second, third, fourth] = args.map(v => String(v).toLowerCase())
    const chat = msg?.key?.remoteJid || ''
    const inGroup = validGroup(chat)
    const target = [fourth, third, second].find(validGroup) || (inGroup ? chat : null)
    if (action === 'help' || action === 'menu') return reply(second === 'lengkap' || second === 'full' ? usageFull : usage)
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
        const sessionLine = (key, label) => {
          const item = cfg.sessions?.[key]
          return '    ' + label + '  ' + (item?.enabled ? item.time + ' WIB' : 'OFF')
        }
        return [
          String(i + 1).padStart(2, '0') + '. 📱 *' + String(name).replace(/[\r\n]+/g, ' ').trim() + '*',
          '    ' + (cfg.enabled ? '🟢 Aktif' : '⚪ Nonaktif'),
          '    🆔 ' + id,
          '',
          sessionLine('pagi', '🌅 Pagi '),
          sessionLine('siang', '☀️ Siang'),
          sessionLine('malam', '🌙 Malam'),
          '',
          '    🔊 Audio ' + (cfg.audioEnabled !== false ? 'ON' : 'OFF') +
            '  •  📣 Tag ' + (cfg.tagEnabled !== false ? 'ON' : 'OFF')
        ].join('\n')
      }))
      const active = groups.filter(([, cfg]) => cfg.enabled).length
      return reply([
        '╭─ 🙏 *IBADAH HARIAN*',
        '│  📋 *DAFTAR GRUP TERDAFTAR*',
        '╰────────────────────',
        '',
        details.length ? details.join('\n\n────────────────────\n\n') : 'Belum ada grup terdaftar.',
        '',
        '────────────────────',
        '📊 Total: ' + groups.length + ' grup',
        '🟢 Aktif: ' + active + '  |  ⚪ Nonaktif: ' + (groups.length - active),
        '🕒 Zona waktu: WIB'
      ].join('\n'))
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
