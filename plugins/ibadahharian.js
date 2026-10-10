const { settings, save, send, saveContent, localNow, DEFAULTS, GROUP } = require('../lib/ibadahScheduler')
const { getQuotedText } = require('../lib/utils')
const validTime = value => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)

module.exports = {
  commands: ['ibadahharian'],
  registered: true,
  ownerOnly: true,
  menu: '/ibadahharian status | isi pagi | test pagi | on | off',
  async run({ args = [], msg, reply }) {
    const cfg = settings()
    const [action, second, third] = args.map(x => String(x).toLowerCase())
    if (!action || action === 'status') {
      return reply([
        '🙏 *IBADAH HARIAN*', 'Grup: ' + GROUP,
        'Otomatis: ' + (cfg.enabled ? 'ON' : 'OFF'),
        ...Object.entries(cfg.sessions).map(([name, v]) => name + ': ' + v.time + ' • ' + (v.enabled ? 'ON' : 'OFF') + ' • sumber: website otomatis'),
        '', 'Materi diambil otomatis dari ibadahharian.net saat dikirim.',
        '/ibadahharian isi pagi (opsional: simpan materi manual)',
        '/ibadahharian test pagi',
        '/ibadahharian on|off',
        '/ibadahharian pagi|siang|malam on|off',
        '/ibadahharian jam pagi|siang|malam HH:MM'
      ].join('\n'))
    }
    if (action === 'isi' && DEFAULTS[second]) {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(third || '') ? third : localNow().date
      const material = getQuotedText(msg)
      if (!material) return reply('❌ Reply pesan berisi materi ibadah lengkap, lalu ketik /ibadahharian isi ' + second + '\nUntuk tanggal lain: /ibadahharian isi ' + second + ' YYYY-MM-DD')
      try {
        const count = saveContent(date, second, material)
        return reply('✅ Materi ' + second + ' tanggal ' + date + ' tersimpan (' + count + ' karakter). Sekarang coba /ibadahharian test ' + second)
      } catch (e) { return reply('❌ ' + e.message) }
    }
    if (['on', 'off'].includes(action) && !second) {
      cfg.enabled = action === 'on'; save(cfg)
      return reply('✅ Ibadah Harian otomatis ' + action.toUpperCase())
    }
    if (action === 'test' && DEFAULTS[second]) {
      try { await send(second, true); return reply('✅ Materi ' + second + ' terkirim ke grup.') }
      catch (e) { return reply('❌ ' + e.message) }
    }
    if (DEFAULTS[action] && ['on', 'off'].includes(second)) {
      cfg.sessions[action].enabled = second === 'on'; save(cfg)
      return reply('✅ Sesi ' + action + ' ' + second.toUpperCase())
    }
    if (action === 'jam' && DEFAULTS[second] && validTime(third || '')) {
      cfg.sessions[second].time = third; save(cfg)
      return reply('✅ Jam ' + second + ' menjadi ' + third + ' WIB')
    }
    return reply('❌ Perintah tidak valid. Ketik /ibadahharian status')
  }
}
