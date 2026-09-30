const {downloadContentFromMessage}=require('baileys')
const {getQuotedMessage,unwrapMessage}=require('../lib/utils')

const sleep=ms=>new Promise(r=>setTimeout(r,ms))
async function toBuffer(stream){const chunks=[];for await(const c of stream)chunks.push(c);return Buffer.concat(chunks)}

async function promoPayload(msg,text){
  const own=unwrapMessage(msg.message||{})
  const quoted=getQuotedMessage(msg)
  const src=quoted?unwrapMessage(quoted):own
  const caption=String(text||src.imageMessage?.caption||src.videoMessage?.caption||'').trim()
  if(src.imageMessage){
    const stream=await downloadContentFromMessage(src.imageMessage,'image')
    return {image:await toBuffer(stream),caption}
  }
  if(src.videoMessage){
    const stream=await downloadContentFromMessage(src.videoMessage,'video')
    return {video:await toBuffer(stream),caption}
  }
  if(!caption)return null
  return {text:caption}
}

module.exports={
  commands:['promosi'],
  registered:false,
  ownerOnly:true,
  menuSection:'OWNER',
  menu:'/promosi <pesan> (atau reply foto/video)',
  async run({sock,msg,reply,text,db}){
    const subscribers=[...new Set((db.getSetting('promoSubscribers',[])||[]).map(x=>String(x).replace(/\D/g,'')).filter(Boolean))]
    if(!subscribers.length)return reply('❌ Belum ada penerima promosi yang sudah disetujui. Tambahkan dengan /promosiadd 628xxx.')
    const payload=await promoPayload(msg,text)
    if(!payload)return reply('❌ Tulis pesan atau reply foto/video lalu ketik /promosi <caption>.')
    const delay=Math.max(1000,Number(process.env.PROMO_DELAY_MS||10000))
    const startedAt=new Date()
    const estimatedAt=new Date(startedAt.getTime()+Math.max(0,subscribers.length-1)*delay)
    const fmt=d=>new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d).replace(' pukul ', ' • ')+' WIB'
    const duration=ms=>{const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=s%60;return [h&&h+' jam',m&&m+' menit',x+' detik'].filter(Boolean).join(' ')}
    await reply(`📣 *PROMOSI DIMULAI*\n\n👥 Penerima        : ${subscribers.length} nomor\n⏱️ Delay           : ${Math.round(delay/1000)} detik\n🕐 Mulai           : ${fmt(startedAt)}\n🏁 Estimasi selesai: ${fmt(estimatedAt)}\n📨 Mode            : Private Message\n\n⏳ Pesan sedang dikirim satu per satu...`)
    let ok=0,failed=0
    for(const phone of subscribers){
      try{
        await sock.sendMessage(phone+'@s.whatsapp.net',payload)
        ok++
      }catch(e){
        failed++
        console.error('[PROMOSI]',phone,e?.message||e)
      }
      if(ok+failed<subscribers.length)await sleep(delay)
    }
    const finishedAt=new Date()\n    return reply(`✅ *PROMOSI SELESAI*\n\n👥 Total     : ${subscribers.length}\n✅ Berhasil  : ${ok}\n❌ Gagal     : ${failed}\n\n🕐 Mulai     : ${fmt(startedAt)}\n🏁 Selesai   : ${fmt(finishedAt)}\n⏱️ Durasi    : ${duration(finishedAt-startedAt)}\n⏳ Delay     : ${Math.round(delay/1000)} detik/penerima`)
  }
}
