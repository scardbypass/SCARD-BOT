const { loadPlugins } = require('../lib/pluginLoader')
const db = require('../lib/database')

function row(cmd,desc){return '  '+String(cmd).padEnd(20,' ')+' '+desc}

module.exports={
  commands:['menu','help'],
  registered:true,
  async run({reply,isOwner}){
    const plugins=loadPlugins()
    const lines=[
      '*SUPER-BOT*','_AUTOMATION SYSTEM_','━━━━━━━━━━━━━━━━━━━━━━━━','',
      '*ACCOUNT*',
      row('akun','Account profile'),
      row('groupinfo','Group information'),'',
      '*MEDIA*',
      row('download','Video downloader'),
      row('stiker','Create sticker'),
      row('lihat','View media'),'',
      '*WEB & DOMAIN*',
      row('whois','Domain information'),
      row('statusweb','Website health')
    ]

    if(isOwner){
      const ai=db.getSetting('aiEnabled',false)
      const monitors=db.getSetting('websiteMonitors',[])
      const voting=String(process.env.VOTING_ENABLED||'true').toLowerCase()==='true'
      const interval=Number(process.env.MONITOR_INTERVAL_MINUTES||60)
      lines.push(
        row('monitor','Uptime monitor'),'',
        '*CEIR*',
        row('saldoceir','Provider balance'),
        row('airbot <nominal>','Deposit + QRIS'),
        row('depoapi','Confirm API topup'),'',
        '*INTELLIGENCE*',
        row('aion','Enable Gemini'),
        row('aioff','Disable Gemini'),
        row('aistatus','AI status'),'',
        '*SYSTEM*',
        row('backup','Create backup'),'',
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        '*SYSTEM STATUS*',
        row('Bot','ONLINE'),
        row('Gemini',ai?'ACTIVE':'OFF'),
        row('Monitor',monitors.length?'ACTIVE · '+interval+' MIN':'NO TARGET'),
        row('Voting',voting?'ACTIVE':'OFF'),
        row('Plugins',plugins.length)
      )
    }

    lines.push('','━━━━━━━━━━━━━━━━━━━━━━━━','*SUPER-BOT*  /  '+(isOwner?'OWNER':'MEMBER'),'_Simple tools. Serious automation._')
    return reply(lines.join('\n'))
  }
}
