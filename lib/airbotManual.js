'use strict'
const { downloadMediaMessage } = require('baileys')
const pino = require('pino')
const { unwrapMessage, getText, formatRupiah } = require('./utils')

const requests = new Map()
const forwarded = new Map()
const used = new Set()
const active = new Map()
const cancelWaiting = new Map()
const pendingCancel = new Map()
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
  for (const [k,v] of active) if (now-v.at > TTL) active.delete(k)
  for (const [k,v] of cancelWaiting) if (now-v.at > TTL) cancelWaiting.delete(k)
  for (const [k,v] of pendingCancel) if (now-v.at > TTL) pendingCancel.delete(k)
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
      const ownerNotice = await notify(sock,chat,'⏳ *DEPOSIT MANUAL AIRBOT*\nNominal: '+formatRupiah(n)+'\nPerintah dikirim: /deposit '+n+' manual\n\nMenunggu balasan rekening dari grup AirBot. Jika sudah diteruskan, reply pesan rekening dengan foto bukti transfer.\nBerlaku 30 menit.\n\nReply pesan ini dengan *cancel* untuk membatalkan deposit.',msg)
      active.set(chat,{nominal:n,at:Date.now(),noticeId:ownerNotice?.key?.id})
    } catch(e) { console.error('[AIRBOT MANUAL REQUEST]',e); await notify(sock,chat,'❌ Gagal mengirim deposit: '+e.message,msg) }
    return true
  }
  const quoted = context(msg).stanzaId
  const current = active.get(chat)
  const replyMatches = !!quoted && (
    quoted === current?.noticeId ||
    quoted === current?.bankId ||
    quoted === current?.pendingId
  )
  const cancelRequested = /^[/!.]?(?:airbot\s+)?(?:deposit\s+)?cancel$/i.test(input)
  if (cancelRequested && (replyMatches || /^[/!.]?(?:airbot\s+)?deposit\s+cancel$/i.test(input))) {
    if (!current) {
      await notify(sock,chat,'⚠️ Tidak ada deposit aktif yang tercatat. Jika masih pending di AirBot, periksa grup terlebih dahulu.',msg)
      return true
    }
    if (!groupId().endsWith('@g.us')) {
      await notify(sock,chat,'❌ AIRBOT_GROUP_ID belum benar.',msg)
      return true
    }
    if (cancelWaiting.has(chat)) {
      await notify(sock,chat,'⏳ Pembatalan sudah dikirim, menunggu balasan AirBot.',msg)
      return true
    }
    cancelWaiting.set(chat,{at:Date.now(),nominal:current.nominal})
    try {
      const sent = await sock.sendMessage(groupId(),{text:'/deposit cancel'})
      if (!sent?.key?.id) throw Error('Tidak ada ID pesan pembatalan')
      await notify(sock,chat,'⏳ Perintah /deposit cancel sudah dikirim ke grup AirBot. Menunggu konfirmasi pembatalan.',msg)
      console.log('[AIRBOT MANUAL CANCEL REQUEST]',current.nominal,sent.key.id)
    } catch(e) {
      cancelWaiting.delete(chat)
      await notify(sock,chat,'⚠️ Status pengiriman cancel tidak pasti: '+e.message+'. Periksa grup sebelum mengulang.',msg)
    }
    return true
  }
  const confirm = /^[/!.]?confirm\s+(\d{4,12})$/i.exec(input)
  const m = unwrapMessage(msg.message || {})
  const hasPhoto = !!m.imageMessage
  const quotedId = context(msg).stanzaId
  const reference = quotedId && forwarded.get(chat+':'+quotedId)
  const quotedMessage = context(msg).quotedMessage
  const quotedText = quotedMessage ? getText({message:quotedMessage}) : ''
  const quotedConfirmation = quotedText.match(/\\/konfirmasi\\s+(\\d{4,12})/i)
  const activeDeposit = active.get(chat)
  const isActive = activeDeposit && Date.now()-activeDeposit.at < TTL
  const linkedReply = isActive && quotedId && (
    quotedId === activeDeposit.bankId ||
    quotedId === activeDeposit.noticeId ||
    quotedId === activeDeposit.pendingId
  )
  const detectedNominal = confirm ? amount(confirm[1])
    : reference?.nominal || (linkedReply ? activeDeposit.nominal : null)
  if (!confirm && !(hasPhoto && (reference || linkedReply))) return false
  if (!hasPhoto) {
    await notify(sock,chat,'📷 Kirim *foto* bukti transfer dengan caption /confirm NOMINAL, atau reply pesan rekening AirBot dengan foto.',msg)
    return true
  }
  const n = detectedNominal
  if (!n || (quotedConfirmation && Number(quotedConfirmation[1]) !== n) ||
      (isActive && activeDeposit.nominal !== n)) {
    await notify(sock,chat,'⚠️ Nominal konfirmasi tidak cocok dengan deposit aktif. Periksa pesan rekening AirBot sebelum mengirim bukti.',msg)
    return true
  }
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
  const t = getText(msg)
  const normalized = t.replace(/[*_~`]/g, '').replace(/\s+/g, ' ').trim()
  const recent = [...active.entries()].filter(([,v]) => Date.now()-v.at < TTL)
  if (/Bank Payment|transaksi pending|dibatalkan/i.test(normalized)) console.log('[AIRBOT MANUAL RX]', 'requests='+requests.size, 'active='+recent.length, 'cancel='+cancelWaiting.size, 'reply='+Boolean(ctx.stanzaId))
  if (/transaksi\s+pending|masih\s+memiliki\s+transaksi\s+pending/i.test(normalized)) {
    if (recent.length === 1) {
      const [chat,v] = recent[0]
      const sent = await notify(sock,chat,'⚠️ *DEPOSIT AIRBOT MASIH PENDING*\n\n'+t.slice(0,2500)+'\n\nReply pesan ini dengan *cancel* untuk mengirim /deposit cancel ke grup AirBot.')
      if (sent?.key?.id) active.set(chat,{...v,pendingId:sent.key.id})
      console.log('[AIRBOT MANUAL PENDING]',v.nominal)
      return true
    }
    console.log('[AIRBOT MANUAL PENDING UNMATCHED]',recent.length)
    return false
  }
  if (/semua\s+transaksi\s+manual\s+pending\s*\/\s*waiting.*dibatalkan|transaksi.*berhasil dibatalkan/i.test(normalized)) {
    const waiting = [...cancelWaiting.entries()].filter(([,v]) => Date.now()-v.at < 2*60*1000)
    if (waiting.length === 1) {
      const [chat] = waiting[0]
      await notify(sock,chat,'✅ *AIRBOT MEMBALAS PEMBATALAN*\n\n'+t.slice(0,2500))
      cancelWaiting.delete(chat)
      active.delete(chat)
      console.log('[AIRBOT MANUAL CANCEL SUCCESS]')
      return true
    }
    console.log('[AIRBOT MANUAL CANCEL UNMATCHED]',waiting.length)
    return false
  }
  if (!/rekening|transfer|BCA|BRI|BNI|mandiri|konfirmasi|Bank Payment/i.test(normalized)) return false
  const foundAmount = t.match(/(?:Jumlah|Nominal)\s*:\s*\*?(?:Rp\.?\s*)?([\d.,]+)/i)
  const responseAmount = foundAmount ? Number(foundAmount[1].replace(/\D/g,'')) : null
  if (!responseAmount) { console.log('[AIRBOT MANUAL BANK NO AMOUNT]',t.slice(0,150)); return false }
  let requestId = ctx.stanzaId && requests.has(ctx.stanzaId) ? ctx.stanzaId : null
  if (requestId && requests.get(requestId).nominal !== responseAmount) return false
  if (!requestId) {
    // AirBot often sends a new message rather than replying to /deposit.
    // Match only when exactly one recent request has this amount.
    const candidates = [...requests.entries()].filter(([,v]) =>
      v.nominal === responseAmount && Date.now()-v.at < TTL
    )
    if (candidates.length === 1) requestId = candidates[0][0]
    else console.log('[AIRBOT MANUAL BANK UNMATCHED]',responseAmount,'candidates='+candidates.length)
  }
  let req = requests.get(requestId)
  if (!req) {
    // Recovery if the request ID was already consumed; require one matching active owner.
    const candidates = recent.filter(([,v]) => v.nominal === responseAmount)
    if (candidates.length !== 1) return false
    req = {chat:candidates[0][0],nominal:responseAmount}
  }
  try {
    const sent = await notify(sock,req.chat,
      '🏦 *REKENING DEPOSIT AIRBOT*\nNominal: '+formatRupiah(req.nominal)+'\n\n'+t.slice(0,3500)+'\n\n📷 Reply pesan ini dengan *foto bukti transfer* (tanpa caption juga bisa).\nAtau kirim foto dengan caption /confirm '+req.nominal)
    if (sent?.key?.id) {
      forwarded.set(req.chat+':'+sent.key.id,{nominal:req.nominal,at:Date.now()})
      const old = active.get(req.chat)
      if (old?.nominal === req.nominal) active.set(req.chat,{...old,bankId:sent.key.id})
    }
    if (requestId) requests.delete(requestId)
    console.log('[AIRBOT MANUAL REKENING]',req.nominal)
    return true
  } catch(e) { console.error('[AIRBOT MANUAL FORWARD]',e); return false }
}
module.exports={handleOwner,handleGroup}
