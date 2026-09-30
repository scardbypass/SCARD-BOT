const fs=require('fs')
const path=require('path')

const DATA_DIR=path.join(process.cwd(),'data')
const DATA_FILE=path.join(DATA_DIR,'group-numbers.json')

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))

function phoneFromJid(jid=''){
  const raw=String(jid||'')
  if(!raw||raw.endsWith('@lid'))return null
  const phone=raw.split('@')[0].split(':')[0].replace(/\D/g,'')
  return phone||null
}

function formatWib(){
  return new Intl.DateTimeFormat('id-ID',{
    timeZone:'Asia/Jakarta',
    day:'2-digit',
    month:'long',
    year:'numeric',
    hour:'2-digit',
    minute:'2-digit',
    hour12:false
  }).format(new Date()).replace('.',':')
}

module.exports={
  commands:['nomergrup'],
  registered:true,
  menu:'/nomergrup',

  async run({sock,reply,isOwner}){
    if(!isOwner)return reply('Perintah ini khusus owner.')

    await reply('🔍 *SCAN NOMOR GRUP*\n\nSedang membaca semua grup yang diikuti bot...')

    try{
      const groups=await sock.groupFetchAllParticipating()
      const entries=Object.entries(groups||{})

      if(!entries.length)return reply('Tidak ada grup yang ditemukan.')

      const contacts=new Map()
      const groupResults=[]
      let totalMembers=0
      let scannedGroups=0
      let failedGroups=0

      for(const [groupJid,cached] of entries){
        try{
          let meta=cached
          try{meta=await sock.groupMetadata(groupJid)}catch{}

          const participants=meta?.participants||[]
          totalMembers+=participants.length
          scannedGroups++

          let numbersFound=0

          for(const participant of participants){
            const jid=participant?.id||participant?.jid||''
            const number=phoneFromJid(jid)
            if(!number)continue

            if(!contacts.has(number)){
              contacts.set(number,{number,jid,groups:[]})
            }

            const contact=contacts.get(number)
            if(!contact.groups.some(g=>g.id===groupJid)){
              contact.groups.push({
                id:groupJid,
                name:meta?.subject||'Tanpa Nama'
              })
              numbersFound++
            }
          }

          groupResults.push({
            id:groupJid,
            name:meta?.subject||'Tanpa Nama',
            members:participants.length,
            numbers_found:numbersFound
          })
        }catch(err){
          failedGroups++
          console.error('[NOMERGRUP]',groupJid,err)
        }

        await sleep(250)
      }

      const numbers=[...contacts.values()].sort((a,b)=>a.number.localeCompare(b.number))
      const duplicateCount=Math.max(0,totalMembers-numbers.length)

      const output={
        updated_at:new Date().toISOString(),
        updated_at_wib:formatWib(),
        statistics:{
          groups_found:entries.length,
          groups_scanned:scannedGroups,
          groups_failed:failedGroups,
          total_members:totalMembers,
          unique_numbers:numbers.length,
          duplicates:duplicateCount
        },
        groups:groupResults,
        contacts:numbers
      }

      fs.mkdirSync(DATA_DIR,{recursive:true})
      fs.writeFileSync(DATA_FILE,JSON.stringify(output,null,2),'utf8')

      return reply(
        '📱 *SCAN NOMOR GRUP*\n\n'+
        '✅ Scan selesai!\n\n'+
        `👥 Grup ditemukan : ${entries.length}\n`+
        `🔍 Grup berhasil discan : ${scannedGroups}\n`+
        (failedGroups?`⚠️ Grup gagal discan : ${failedGroups}\n`:'')+
        `📞 Total anggota : ${totalMembers.toLocaleString('id-ID')}\n`+
        `💾 Nomor unik tersimpan : ${numbers.length.toLocaleString('id-ID')}\n`+
        `♻️ Duplikat terdeteksi : ${duplicateCount.toLocaleString('id-ID')}\n\n`+
        '📁 Tersimpan di:\n'+
        'data/group-numbers.json\n\n'+
        `🕐 Terakhir diperbarui:\n${formatWib()} WIB`
      )
    }catch(err){
      console.error('[NOMERGRUP ERROR]',err)
      return reply(`❌ Scan gagal.\n\nError: ${err.message}`)
    }
  }
}
