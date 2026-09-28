const { loadPlugins } = require('../lib/pluginLoader')
const db = require('../lib/database')

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: process.env.TIMEZONE || 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(new Date()))
  if (hour < 11) return 'Good morning'
  if (hour < 15) return 'Good afternoon'
  if (hour < 19) return 'Good evening'
  return 'Good night'
}

module.exports = {
  commands: ['menu', 'help'],
  registered: true,
  async run({ reply, user, isOwner }) {
    const plugins = loadPlugins()
    const name = String(user?.username || (isOwner ? 'SCARD' : 'Member')).trim()
    const lines = [
      '*S C A R D*', '_AUTOMATION SYSTEM_', '━━━━━━━━━━━━━━━━━━━━━━━━', '',
      greeting() + ', *' + name + '*.',
      isOwner ? 'Everything is running normally.' : 'Welcome to SCARD-BOT.', '',
      '*ACCOUNT*', '  /akun                    Profile', '  /groupinfo               Group information', '',
      '*MEDIA*', '  /download                Video downloader', '  /stiker                  Create sticker', '  /lihat                   View media', '',
      '*WEB & DOMAIN*', '  /whois                   Domain information', '  /statusweb               Website health'
    ]
    if (isOwner) {
      const ai = db.getSetting('aiEnabled', false)
      const monitors = db.getSetting('websiteMonitors', [])
      const voting = String(process.env.VOTING_ENABLED || 'true').toLowerCase() === 'true'
      const interval = Number(process.env.MONITOR_INTERVAL_MINUTES || 30)
      lines.push(
        '  /monitor                 Uptime monitor', '',
        '*CEIR*', '  /saldoceir               Provider balance', '  /airbot                  Deposit request', '  /ceir deposit            Confirm deposit', '',
        '*INTELLIGENCE*', '  /aion                    Enable Gemini', '  /aioff                   Disable Gemini', '  /aistatus                AI status', '',
        '*SYSTEM*', '  /backup                   Create backup', '',
        '━━━━━━━━━━━━━━━━━━━━━━━━', '*SYSTEM STATUS*', '',
        'Bot          ONLINE',
        'Gemini       ' + (ai ? 'ACTIVE' : 'OFF'),
        'Monitor      ' + (monitors.length ? 'ACTIVE · ' + interval + ' MIN' : 'NO TARGET'),
        'Voting       ' + (voting ? 'ACTIVE' : 'OFF'),
        'Plugins      ' + plugins.length
      )
    }
    lines.push('', '━━━━━━━━━━━━━━━━━━━━━━━━', '*SCARD-BOT*  /  ' + (isOwner ? 'OWNER' : 'MEMBER'), '_Simple tools. Serious automation._')
    return reply(lines.join('\n'))
  }
}
