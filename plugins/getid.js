module.exports={
  commands:['getid'],
  registered:false,
  ownerOnly:true,
  menuSection:'OWNER',
  menu:'/getid (private chat)',
  async run({sock,msg,reply}){
    const chat=String(msg.key.remoteJid||'')
    if(chat.endsWith('@g.us'))return reply('❌ Jalankan /getid dari chat pribadi bot.')

    await reply('⏳ Mengambil ID/JID semua grup yang akun bot ikuti...')
    try{
      const groups=await sock.groupFetchAllParticipating()
      const rows=Object.entries(groups||{}).map(([jid,g])=>({
        name:String(g?.subject||'Tanpa Nama'),
        jid:String(jid)
      })).sort((a,b)=>a.name.localeCompare(b.name,'id'))

      if(!rows.length)return reply('📭 Tidak ada grup yang ditemukan pada akun bot.')

      const lines=[
        '🆔 *DAFTAR GROUP JID*',
        '',
        `📊 Total grup: ${rows.length}`,
        ''
      ]
      rows.forEach((g,i)=>{
        lines.push(`${i+1}. *${g.name}*`)
        lines.push(`   ${g.jid}`)
        lines.push('')
      })

      const text=lines.join('\n').trim()
      if(text.length<=60000)return reply(text)

      const body=rows.map((g,i)=>`${i+1}. ${g.name}\n${g.jid}`).join('\n\n')
      await sock.sendMessage(chat,{
        document:Buffer.from(body,'utf8'),
        mimetype:'text/plain',
        fileName:'group-jid.txt',
        caption:`🆔 Daftar JID ${rows.length} grup.`
      },{quoted:msg})
    }catch(e){
      console.error('[GETID]',e)
      return reply('❌ Gagal mengambil daftar grup: '+String(e?.message||e))
    }
  }
}
