const {downloadContentFromMessage}=require('baileys')
const sharp=require('sharp')
const {getQuotedMessage,unwrapMessage}=require('../lib/utils')

async function toBuffer(stream){const chunks=[];for await(const c of stream)chunks.push(c);return Buffer.concat(chunks)}

module.exports={
  commands:['stiker','sticker','s'],
  registered:false,
  menuSection:'PUBLIC',
  menu:'stiker (foto → sticker)',
  async run({sock,msg,reply}){
    const own=unwrapMessage(msg.message||{})
    const quoted=getQuotedMessage(msg)
    const src=quoted?unwrapMessage(quoted):own
    let media,type
    if(src.imageMessage){media=src.imageMessage;type='image'}
    else if(src.videoMessage){return reply('❌ Sticker video sementara belum didukung. Kirim/reply foto lalu ketik Stiker.')}
    else return reply('❌ Kirim/reply foto lalu ketik Stiker.')

    try{
      const stream=await downloadContentFromMessage(media,type)
      const input=await toBuffer(stream)
      if(!input.length)throw new Error('Media kosong')

      const webp=await sharp(input,{failOn:'none'})
        .rotate()
        .resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}})
        .webp({quality:88,alphaQuality:100,effort:4})
        .toBuffer()

      console.log('[STIKER] input=',input.length,'webp=',webp.length)
      await sock.sendMessage(msg.key.remoteJid,{sticker:webp},{quoted:msg})
    }catch(e){
      console.error('[STIKER ERROR]',e)
      return reply('❌ Gagal membuat sticker. Coba kirim foto biasa (JPG/PNG).')
    }
  }
}
