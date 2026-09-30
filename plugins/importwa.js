function clean(v=''){return String(v||'').replace(/\D/g,'')}

module.exports={
  commands:['importwa'],
  registered:false,
  ownerOnly:true,
  menuSection:'OWNER',
  menu:'/importwa',
  async run({sock,msg,reply,db}){
    const chat=String(msg.key.remoteJid||'')
    if(chat.endsWith('@g.us'))return reply('❌ Jalankan /importwa dari chat pribadi bot.')

    const numbers=[...new Set((db.getSetting('promoSubscribers',[])||[]).map(clean).filter(Boolean))].sort()
    const now=new Date()
    const fmt=new Intl.DateTimeFormat('id-ID',{
      timeZone:'Asia/Jakarta',day:'2-digit',month:'short',year:'numeric',
      hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false
    }).format(now).replace(' pukul ',' • ')+' WIB'

    const payload={
      exportedAt:now.toISOString(),
      total:numbers.length,
      numbers
    }
    const fileName='promo-subscribers.json'

    await sock.sendMessage(chat,{
      document:Buffer.from(JSON.stringify(payload,null,2),'utf8'),
      mimetype:'application/json',
      fileName,
      caption:`📦 *EXPORT DATABASE WA*\n\n👥 Total nomor : ${numbers.length}\n🕐 Export      : ${fmt}\n📄 File        : ${fileName}\n\n✅ Database berhasil diexport.`
    },{quoted:msg})
  }
}
