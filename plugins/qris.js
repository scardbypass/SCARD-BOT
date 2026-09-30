const QRCode=require('qrcode')
const sharp=require('sharp')

function crc16(s){let c=0xffff;for(const ch of s){c^=ch.charCodeAt(0)<<8;for(let i=0;i<8;i++)c=((c&0x8000)?(c<<1)^0x1021:c<<1)&0xffff}return c.toString(16).toUpperCase().padStart(4,'0')}
function makeDynamic(src,amount){
 let q=String(src||'').trim().replace(/010211/,'010212')
 const p=q.lastIndexOf('6304');if(p<0)throw Error('QRIS tidak valid')
 q=q.slice(0,p)
 const pos=q.indexOf('5802');if(pos<0)throw Error('Tag QRIS tidak lengkap')
 const v=String(amount),tag='54'+String(v.length).padStart(2,'0')+v
 q=q.slice(0,pos)+tag+q.slice(pos)
 const base=q+'6304';return base+crc16(base)
}
const rp=n=>'Rp'+Number(n).toLocaleString('id-ID')

module.exports={commands:['qris'],registered:true,ownerOnly:true,menu:'/qris <nominal>',async run({sock,msg,reply,args}){
 const amount=Number(String(args[0]||'').replace(/\D/g,''))
 const src=String(process.env.QRIS_STATIC||'').trim()
 if(!Number.isSafeInteger(amount)||amount<1)return reply('❌ Format: /qris 15000')
 if(!src)return reply('❌ QRIS_STATIC belum diisi di .env')
 try{
  const payload=makeDynamic(src,amount)
  const qr=await QRCode.toBuffer(payload,{width:720,margin:2,errorCorrectionLevel:'M'})
  const minutes=Math.max(1,Number(process.env.QRIS_DELETE_MINUTES||5))
  const exp=new Date(Date.now()+minutes*60000)
  const time=new Intl.DateTimeFormat('id-ID',{timeZone:process.env.TIMEZONE||'Asia/Jakarta',hour:'2-digit',minute:'2-digit',hour12:false}).format(exp).replace(' pukul ','')
  const svg=Buffer.from(`<svg width="1024" height="1450"><rect width="1024" height="1450" rx="38" fill="white"/><text x="512" y="130" text-anchor="middle" font-family="sans-serif" font-size="48" font-weight="700">QRIS PAYMENT</text><text x="512" y="205" text-anchor="middle" font-family="sans-serif" font-size="54" font-weight="700">SCARD-PROJECT</text><text x="512" y="275" text-anchor="middle" font-family="sans-serif" font-size="38">A01</text><rect x="122" y="345" width="780" height="780" rx="24" fill="#fff"/><text x="512" y="1210" text-anchor="middle" font-family="sans-serif" font-size="64" font-weight="700">${rp(amount)}</text><text x="512" y="1280" text-anchor="middle" font-family="sans-serif" font-size="32">Berlaku ${minutes} menit • sampai ${time} WIB</text><text x="512" y="1350" text-anchor="middle" font-family="sans-serif" font-size="28">Scan dengan aplikasi pembayaran QRIS</text></svg>`)
  const image=await sharp(svg).composite([{input:qr,left:152,top:375}]).png().toBuffer()
  const sent=await sock.sendMessage(msg.key.remoteJid,{image,caption:`💳 *QRIS PAYMENT*\n\n💰 Nominal : *${rp(amount)}*\n🏪 Merchant: SCARD-PROJECT\n⏳ Berlaku : ${minutes} menit\n🕐 Sampai  : ${time} WIB\n\n_Pesan QRIS akan ditarik otomatis setelah ${minutes} menit._`},{quoted:msg})
  setTimeout(()=>sock.sendMessage(msg.key.remoteJid,{delete:sent.key}).catch(e=>console.error('[QRIS DELETE]',e?.message||e)),minutes*60000)
 }catch(e){console.error('[QRIS]',e);return reply('❌ Gagal membuat QRIS: '+String(e?.message||e))}
}}
