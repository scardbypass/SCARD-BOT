const {jidPhone}=require('../lib/utils')

function phoneFromParticipant(p={}){
  const candidates=[p.phoneNumber,p.pn,p.id].filter(Boolean)
  for(const jid of candidates){
    if(String(jid).includes('@s.whatsapp.net')){
      const n=jidPhone(jid)
      if(n)return n
    }
  }
  return ''
}

module.exports={
  commands:['nomergrup','nomorgrup'],
  registered:false,
  ownerOnly:true,
  menuSection:'OWNER',
  menu:'/nomergrup (private chat)',
  async run({sock,msg,reply}){
    const chat=String(msg.key.remoteJid||'')
    if(chat.endsWith('@g.us'))return reply('❌ Jalankan /nomergrup dari chat pribadi bot.')

    await reply('⏳ Mengambil daftar anggota dari grup yang akun bot ikuti...')
    try{
      const groups=await sock.groupFetchAllParticipating()
      const rows=[]
      const unique=new Set()
      let unresolved=0
      for(const [jid,g] of Object.entries(groups||{})){
        const nums=[]
        for(const p of g.participants||[]){
          const n=phoneFromParticipant(p)
          if(n){nums.push(n);unique.add(n)}else unresolved++
        }
        rows.push({jid,name:g.subject||jid,total:(g.participants||[]).length,numbers:[...new Set(nums)]})
      }
      rows.sort((a,b)=>a.name.localeCompare(b.name))
      const lines=['📱 *DAFTAR NOMOR SEMUA GRUP*','','Grup ditemukan: '+rows.length,'Nomor unik terbaca: '+unique.size]
      if(unresolved)lines.push('ID tanpa nomor terbaca: '+unresolved)
      lines.push('')
      for(const g of rows){
        lines.push('• *'+g.name+'*')
        lines.push('  Anggota: '+g.total+' • Nomor terbaca: '+g.numbers.length)
      }
      lines.push('','_Command ini hanya membaca/menampilkan data dan tidak menambahkan nomor ke daftar /promosi._')
      await reply(lines.join('\n'))

      if(unique.size){
        const body=[...unique].sort().join('\n')
        await sock.sendMessage(chat,{
          document:Buffer.from(body,'utf8'),
          mimetype:'text/plain',
          fileName:'nomor-semua-grup.txt',
          caption:'📄 '+unique.size+' nomor unik dari '+rows.length+' grup.'
        },{quoted:msg})
      }
    }catch(e){
      console.error('[NOMERGRUP]',e)
      return reply('❌ Gagal membaca daftar grup: '+String(e?.message||e))
    }
  }
}
