'use strict'
const axios = require('axios')
const { getQuotedText, unwrapMessage } = require('./utils')
const pending = new Map()
const PRICE_URL = process.env.OKECONNECT_PRICE_URL || 'https://okeconnect.com/harga/json?id=905ccd028329b0a'
function contextOf(msg) {
  const m = unwrapMessage(msg.message || {})
  return m.extendedTextMessage?.contextInfo || m.imageMessage?.contextInfo || null
}
function rows(value) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  for (const key of ['data', 'products', 'produk', 'result', 'list', 'items']) {
    if (value[key]) {
      const found = rows(value[key])
      if (found.length) return found
    }
  }
  return Object.values(value).flatMap(rows)
}
async function productByCode(code) {
  const response = await axios.get(PRICE_URL, { timeout: 12000, maxContentLength: 5 * 1024 * 1024 })
  return rows(response.data).map(row => ({
    code: String(row.kode ?? row.code ?? row.buyer_sku_code ?? row.sku ?? row.product_code ?? '').trim().toUpperCase(),
    name: String(row.produk ?? row.nama ?? row.name ?? row.product_name ?? row.product ?? '').trim(),
    price: Number(String(row.harga ?? row.price ?? row.selling_price ?? row.harga_jual ?? '').replace(/[^\d]/g, ''))
  })).find(p => p.code === code && p.name && Number.isFinite(p.price) && p.price > 0)
}
async function handle({ sock, msg, chat, body }) {
  const ctx = contextOf(msg)
  if (!ctx?.stanzaId || !ctx.quotedMessage) return false
  const quoted = getQuotedText(msg)
  const answer = body.trim().toUpperCase()
  const previous = pending.get(chat)
  if ((answer === 'YES' || answer === 'NO') && previous && ctx.stanzaId === previous.messageId) {
    pending.delete(chat)
    if (Date.now() >= previous.expires) {
      await sock.sendMessage(chat, { text: '⌛ Konfirmasi PPOB kedaluwarsa.' }, { quoted: msg })
    } else if (answer === 'NO') {
      await sock.sendMessage(chat, { text: '❌ Order dibatalkan. Tidak ada transaksi dikirim.' }, { quoted: msg })
    } else {
      await sock.sendMessage(chat, { text: '⚠️ Mode pratinjau: transaksi H2H belum aktif. Tidak ada saldo dipotong.\n' + previous.code + ' • ' + previous.target }, { quoted: msg })
    }
    return true
  }
  const match = /^([A-Z0-9_-]{2,30})\s+(\d{8,16})$/i.exec(body.trim())
  if (!match || !/SCARD\s*•/i.test(quoted) || !/ORDER VIA REPLY/i.test(quoted)) return false
  const code = match[1].toUpperCase()
  const target = match[2]
  const exists = quoted.split('\n').some(line => line.trim().toUpperCase().startsWith(code + '  •  RP'))
  if (!exists) {
    await sock.sendMessage(chat, { text: '❌ Kode tidak ada di daftar produk yang dibalas.' }, { quoted: msg })
    return true
  }
  if (previous && Date.now() < previous.expires) {
    await sock.sendMessage(chat, { text: '⚠️ Masih ada konfirmasi aktif. Balas YES/NO pada konfirmasi sebelumnya atau tunggu 2 menit.' }, { quoted: msg })
    return true
  }
  let product
  try { product = await productByCode(code) } catch (err) {
    console.error('[PPOB] catalog:', err.message)
    await sock.sendMessage(chat, { text: '❌ Katalog gagal diperiksa. Coba lagi.' }, { quoted: msg })
    return true
  }
  if (!product) {
    await sock.sendMessage(chat, { text: '❌ Kode tidak ditemukan pada katalog terbaru.' }, { quoted: msg })
    return true
  }
  const sent = await sock.sendMessage(chat, { text: [
    '✦ *SCARD • KONFIRMASI ORDER*',
    '━━━━━━━━━━━━━━━━',
    '*Produk:* ' + product.name,
    '*Kode:* ' + code,
    '*Tujuan:* ' + target,
    '*Harga:* Rp' + product.price.toLocaleString('id-ID'),
    '',
    'Balas *YES* atau *NO* pada pesan ini.',
    '⌛ Berlaku 2 menit',
    '⚠️ Pratinjau: transaksi H2H belum aktif.'
  ].join('\n') }, { quoted: msg })
  if (!sent?.key?.id) return true
  const entry = { messageId: sent.key.id, code, target, expires: Date.now() + 120000 }
  pending.set(chat, entry)
  const timer = setTimeout(async () => {
    if (pending.get(chat) !== entry) return
    pending.delete(chat)
    try { await sock.sendMessage(chat, { delete: sent.key }) } catch (err) {
      console.error('[PPOB] delete confirmation:', err.message)
    }
  }, 120000)
  timer.unref?.()
  return true
}
module.exports = { handle }
