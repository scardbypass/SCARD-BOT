'use strict'
const { downloadMediaMessage } = require('baileys')
const pino = require('pino')
const { unwrapMessage, getText, formatRupiah } = require('./utils')

const requests = new Map()
const forwarded = new Map()
const used = new Set()
const TTL = 30 * 60 * 1000
const groupId = () => String(process.env.AIRBOT_GROUP_ID || '').trim()
const context = msg => {
  const m = unwrapMessage(msg.message || {})
  return m.imageMessage?.contextInfo || m.extendedTextMessage?.contextInfo || {}
}
function amount(s) {
  if (!/^\d{4,12}$/.test(String(s || ''))) return null
  const n = Number(s)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}
function clean() {
  const now = Date.now()
  for (const [k,v] of requests) if (now-v.at > TTL) requests.delete(k)
  for (const [k,v] of forwarded) if (now-v.at > TTL) forwarded.delete(k)
}
async function notify(sock, chat, text, quoted) {
  return sock.sendMessage(chat, {text}, quoted ? {quoted} : undefined)
}
async function handleOwner({sock,msg,chat,body,isOwner}) {
  if (!isOwner || chat.endsWith('@g.us')) return false
  clean()
  const input = String(body || '').trim()
  const manual = /^[/!.]?(?:airbot|deposit)\s+(\d{4,12})\s+manual$/i.exec(input)
  if (manual) {
    const n = amount(manual[1])
    if (!n) { await notify(sock,chat,'❌ Nominal deposit tidak valid.',msg); return true }
    if (!groupId().endsWith('@g.us')) { await notify(sock,chat,'❌ AIRBOT_GROUP_ID belum benar di .env.',msg); return true }
    try {
      const sent = await sock.sendMessage(groupId(),{text:'/deposit '+n+' manual'})
      if (!sent?.key?.id) throw Error('ID pesan grup tidak diterima')
      requests.set(sent.key.id,{chat,nominal:n,at:Date.now(),groupMessageId:sent.key.id})
      await notify(sock,chat,'⏳ *DEPOSIT MANUAL AIRBOT*\nNominal: '+formatRupiah(n)+'\nPerintah dikirim: /deposit '+n+' manual\n\nMenunggu balasan rekening dari grup AirBot. Jika sudah diteruskan, reply pesan rekening dengan foto bukti transfer.\nBerlaku 30 menit.',msg)
    } catch(e) { console.error('[AIRBOT MANUAL REQUEST]',e); await notify(sock,chat,'❌ Gagal mengirim deposit: '+e.message,msg) }
    return true
  }
  const confirm = /^[/!.]?confirm\s+(\d{4,12})$/i.exec(input)
  const m = unwrapMessage(msg.message || {})
  const hasPhoto = !!m.imageMessage
  const quotedId = context(msg).stanzaId
  const reference = quotedId && forwarded.get(chat+':'+quotedId)
  if (!confirm && !(hasPhoto && reference)) return false
  if (!hasPhoto) {
    await notify(sock,chat,'📷 Kirim *foto* bukti transfer dengan caption /confirm NOMINAL, atau reply pesan rekening AirBot dengan foto.',msg)
    return true
  }
  const n = confirm ? amount(confirm[1]) : reference?.nominal
  if (!n) { await notify(sock,chat,'❌ Nominal tidak valid.',msg); return true }
  if (!groupId().endsWith('@g.us')) { await notify(sock,chat,'❌ AIRBOT_GROUP_ID belum diatur.',msg); return true }
  const key = chat+':'+msg.key.id
  if (used.has(key)) return true
  used.add(key)
  try {
    const bytes = await downloadMediaMessage(msg,'buffer',{}, {logger: pino({level:'silent'}), reuploadRequest: sock.updateMediaMessage?.bind(sock)})
    if (!bytes?.length) throw Error('Foto tidak dapat diunduh')
    const sent = await sock.sendMessage(groupId(),{
      image:bytes,
      caption:'/konfirmasi '+n
    })
    if (!sent?.key?.id) throw Error('ID pesan konfirmasi tidak diterima; periksa grup sebelum mencoba lagi')
    await notify(sock,chat,'✅ *BUKTI TERKIRIM KE GRUP AIRBOT*\nNominal: '+formatRupiah(n)+'\nCaption: /konfirmasi '+n+'\n\nMenunggu verifikasi admin AirBot; belum berarti saldo masuk.',msg)
    console.log('[AIRBOT MANUAL CONFIRM]',n,sent.key.id)
  } catch(e) {
    console.error('[AIRBOT MANUAL CONFIRM]',e)
    await notify(sock,chat,'⚠️ Pengiriman belum dapat dipastikan: '+e.message+'\nPeriksa grup AirBot sebelum mengulang agar tidak duplikat.',msg)
  }
  return true
}
async function handleGroup(sock,msg) {
  if (msg.key.fromMe || msg.key.remoteJid !== groupId()) return false
  clean()
  const ctx = context(msg)
  const req = ctx.stanzaId && requests.get(ctx.stanzaId)
  if (!req) return false
  const t = getText(msg)
  if (!/rekening|transfer|\bBCA\b|\bBRI\b|\bBNI\b|\bmandiri\b|\/konfirmasi/i.test(t)) return false
  requests.delete(ctx.stanzaId)
  try {
    const sent = await notify(sock,req.chat,
      '🏦 *REKENING DEPOSIT AIRBOT*\nNominal: '+formatRupiah(req.nominal)+'\n\n'+t.slice(0,3500)+'\n\n📷 Reply pesan ini dengan *foto bukti transfer* (tanpa caption juga bisa).\nAtau kirim foto dengan caption /confirm '+req.nominal)
    if (sent?.key?.id) forwarded.set(req.chat+':'+sent.key.id,{nominal:req.nominal,at:Date.now()})
    console.log('[AIRBOT MANUAL REKENING]',req.nominal)
    return true
  } catch(e) { console.error('[AIRBOT MANUAL FORWARD]',e); return false }
}
module.exports={handleOwner,handleGroup}
