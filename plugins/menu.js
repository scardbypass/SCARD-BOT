const {loadPlugins}=require('../lib/pluginLoader')
const db=require('../lib/database')

function item(icon,cmd,desc){return `│ ${icon} *${cmd}*\n│    _${desc}_`}

module.exports={
  commands:['menu','help'],
  registered:true,
  async run({reply,isOwner}){
    const plugins=loadPlugins()
    const lines=[
      '╭───〔 *SUPER-BOT* 〕',
      '│ _WhatsApp Automation Center_',
      '│',
      '├──〔 👤 *ACCOUNT* 〕',
      item('◈','akun','Profil & saldo akun'),
      item('◈','qris <nominal>','Buat QRIS pembayaran • public'),
      item('◈','groupinfo','Informasi grup'),
      '│',
      '├──〔 🎬 *MEDIA TOOLS* 〕',
      item('◈','download','TikTok • IG • FB • YouTube'),
      item('◈','stiker','Buat stiker dari gambar'),
      item('◈','lihat','Lihat media sekali lihat'),
      '│',
      '├──〔 🌐 *WEB & DOMAIN* 〕',
      item('◈','whois','Informasi domain'),
      item('◈','statusweb','Cek status website')
    ]

    if(isOwner){
      const ai=db.getSetting('aiEnabled',false)
      const monitors=db.getSetting('websiteMonitors',[])
      const voting=String(process.env.VOTING_ENABLED||'true').toLowerCase()==='true'
      const interval=Number(process.env.MONITOR_INTERVAL_MINUTES||60)
      lines.push(
        item('◈','monitor','Kelola uptime monitor'),
        '│',
        '├──〔 💳 *CEIR & PROVIDER* 〕',
        item('◈','saldoceir','Saldo semua provider'),
        item('◈','airbot <nominal>','Buat deposit + QRIS'),
        item('◈','depoapi','Konfirmasi topup API'),
        item('◈','qristxt on/off','Tampilkan/sembunyikan pesan proses QRIS'),
        '│',
        '├──〔 ✨ *AI CENTER* 〕',
        item('◈','aion','Aktifkan Gemini AI'),
        item('◈','aioff','Nonaktifkan Gemini AI'),
        item('◈','aistatus','Status Gemini AI'),
        '│',
        '├──〔 🙏 *IBADAH HARIAN MULTI-GRUP* 〕',
        item('◈','ih set 18:00','Aktifkan malam saja dalam 1 perintah'),
        item('◈','ih set 12:00 18:00','Aktifkan siang dan malam'),
        item('◈','ih pagi 05:00','Aktifkan hanya sesi Pagi'),
        item('◈','ih siang 12:00','Aktifkan hanya sesi Siang'),
        item('◈','ih malam 18:00','Aktifkan hanya sesi Malam'),
        item('◈','ih setup 05:00 12:00 18:00','Daftar grup + set 3 jam + audio/tag ON + otomatis ON'),
        item('◈','ih help','Daftar lengkap perintah Ibadah Harian'),
        item('◈','ih grup / add / del','Daftarkan atau hapus grup'),
        item('◈','ih status / on / off','Status dan otomatisasi per grup'),
        item('◈','ih jam pagi 05:00','Jadwal khusus tiap grup'),
        item('◈','ih audio on/off','Audio per grup'),
        item('◈','ih tag on/off','Tag @semua per grup'),
        item('◈','ih test malam','Tes materi ke grup'),
        '│',
        '├──〔 ⚙️ *SYSTEM* 〕',
        item('◈','addowner 628xxx','Tambah owner via chat pribadi'),
        item('◈','delowner 628xxx','Hapus owner tambahan'),
        item('◈','listowner','Lihat daftar owner'),
        item('◈','vps','Status resource VPS'),
        item('◈','clear','Bersihkan file temporary & download'),
        item('◈','logs','Lihat log PM2 terbaru'),
        item('◈','updatebot','Update bot dari GitHub'),
        item('◈','backup','Buat backup bot'),
        '│',
        '├──〔 📡 *LIVE STATUS* 〕',
        `│ 🟢 Bot       *ONLINE*`,
        `│ ${ai?'🟢':'⚪'} Gemini    *${ai?'ACTIVE':'OFF'}*`,
        `│ ${monitors.length?'🟢':'⚪'} Monitor   *${monitors.length?`ACTIVE • ${interval} MIN`:'NO TARGET'}*`,
        `│ ${voting?'🟢':'⚪'} Voting    *${voting?'ACTIVE':'OFF'}*`,
        `│ 🧩 Plugins   *${plugins.length} LOADED*`
      )
    }

    lines.push(
      '│',
      '╰────────────────────',
      `   *SUPER-BOT* • ${isOwner?'OWNER':'MEMBER'}`,
      '   _Simple tools. Serious automation._'
    )
    return reply(lines.join('\n'))
  }
}
