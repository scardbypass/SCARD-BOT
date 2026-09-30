function clean(v=''){return String(v||'').replace(/\D/g,'')}

module.exports={
  commands:['promosiadd','promosidel','promosilist','stop'],
  registered:false,
  async run({reply,command,args,phone,isOwner,db}){
    let list=[...new Set((db.getSetting('promoSubscribers',[])||[]).map(clean).filter(Boolean))]
    if(command==='stop'){
      const me=clean(phone)
      list=list.filter(x=>x!==me)
      db.setSetting('promoSubscribers',list)
      return reply('✅ Kamu sudah berhenti menerima pesan promosi.')
    }
    if(!isOwner)return reply('❌ Command khusus owner.')
    if(command==='promosilist'){
      return reply(list.length?`📣 *PENERIMA PROMOSI* • ${list.length}\n\n${list.map((x,i)=>`${i+1}. ${x}`).join('\n')}`:'📣 Belum ada penerima promosi.')
    }
    const target=clean(args[0])
    if(target.length<8)return reply(`❌ Format: /${command} 628xxxxxxxxxx`)
    if(command==='promosiadd'){
      if(!list.includes(target))list.push(target)
      db.setSetting('promoSubscribers',list)
      return reply(`✅ ${target} ditambahkan ke penerima promosi.\nTotal: ${list.length}`)
    }
    list=list.filter(x=>x!==target)
    db.setSetting('promoSubscribers',list)
    return reply(`✅ ${target} dihapus dari penerima promosi.\nTotal: ${list.length}`)
  }
}
