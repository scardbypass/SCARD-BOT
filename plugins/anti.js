const db=require('../lib/database')

const clean=s=>String(s||'').trim().toLowerCase()
const words=()=>db.getSetting('antiToxicWords',[])
function save(list){return db.setSetting('antiToxicWords',[...new Set(list.map(clean).filter(Boolean))])}

module.exports={
  commands:['anti','toxicadd','toxicdel','toxiclist'],
  registered:false,
  async run({msg,reply,command,args,isOwner}){
    const chat=msg.key.remoteJid||''
    if(command==='toxicadd'){
      if(!isOwner)return reply('❌ Command khusus owner.')
      const word=clean(args.join(' '))
      if(!word)return reply('Gunakan: /toxicadd <kata atau kalimat>')
      const list=words()
      if(list.includes(word))return reply('⚠️ Kata tersebut sudah ada di blacklist.')
      save([...list,word])
      return reply(`✅ Toxic blacklist ditambah: *${word}*`)
    }
    if(command==='toxicdel'){
      if(!isOwner)return reply('❌ Command khusus owner.')
      const word=clean(args.join(' '))
      if(!word)return reply('Gunakan: /toxicdel <kata atau kalimat>')
      const list=words()
      if(!list.includes(word))return reply('⚠️ Kata tersebut tidak ada di blacklist.')
      save(list.filter(x=>x!==word))
      return reply(`✅ Dihapus dari toxic blacklist: *${word}*`)
    }
    if(command==='toxiclist'){
      if(!isOwner)return reply('❌ Command khusus owner.')
      const list=words()
      return reply(list.length?`🚫 *TOXIC BLACKLIST*\n\n${list.map((x,i)=>`${i+1}. ${x}`).join('\n')}`:'Blacklist toxic masih kosong.')
    }
    if(!chat.endsWith('@g.us'))return reply('❌ Pengaturan anti-pesan hanya untuk grup.')
    if(!isOwner)return reply('❌ Command khusus owner.')
    const type=clean(args[0])
    const state=clean(args[1])
    if(type!=='toxic'||!['on','off'].includes(state)){
      const enabled=!!db.getSetting('antiToxicGroups',{})[chat]
      return reply(`🛡️ *ANTI PESAN*\n\nAnti toxic: *${enabled?'ON':'OFF'}*\nBlacklist: *${words().length} kata*\n\nGunakan: /anti toxic on|off`)
    }
    const groups={...db.getSetting('antiToxicGroups',{})}
    groups[chat]=state==='on'
    db.setSetting('antiToxicGroups',groups)
    return reply(`✅ Anti toxic grup sekarang *${state.toUpperCase()}*.`)
  }
}
