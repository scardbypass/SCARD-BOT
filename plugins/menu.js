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
    { command: 'importwa', description: 'Export database WA ke JSON' },
    { command: 'getid', description: 'Lihat JID semua grup bot' },
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
        '│',
        '├──〔 ✨ *AI CENTER* 〕',
        item('◈','aion','Aktifkan Gemini AI'),
        item('◈','aioff','Nonaktifkan Gemini AI'),
        item('◈','aistatus','Status Gemini AI'),
        '│',
        '├──〔 ⚙️ *SYSTEM* 〕',
        item('◈','vps','Status resource VPS'),
        item('◈','clear','Bersihkan file temporary & download'),
        item('◈','logs','Lihat log PM2 terbaru'),
        item('◈','updatebot','Update bot dari GitHub'),
        item('◈','uploadgithub','Push perubahan VPS ke GitHub'),
        item('◈','cekupdate','Cek & update library npm/Baileys'),
        item('◈','backup','Buat backup bot'),
        '│',
        '├──〔 📣 *PROMOTION V2* 〕',
        item('◈','promosi','Kirim promosi ke subscriber'),
        item('◈','promosiadd','Tambah penerima promosi'),
        item('◈','promosidel','Hapus penerima promosi'),
        item('◈','promosilist','Daftar penerima promosi'),
        item('◈','nomergrup','Export nomor dari semua grup'),
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
