'use strict'
const axios = require('axios')
const { getQuotedText, unwrapMessage } = require('./utils')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const STORE = path.join(__dirname, '..', 'data', 'ppob-orders.json')
const locks = new Set()
function load() { try { return JSON.parse(fs.readFileSync(STORE, 'utf8')) } catch (e) { if (e.code === 'ENOENT') return {}; throw e } }
function save(data) { fs.mkdirSync(path.dirname(STORE), {recursive:true,mode:0o700}); const temp=STORE+'.tmp'; fs.writeFileSync(temp,JSON.stringify(data,null,2),{mode:0o600}); fs.renameSync(temp,STORE) }
function change(id, patch) { const data=load(); if(!data[id]) throw Error('Order tidak ditemukan'); Object.assign(data[id],patch); save(data); return data[id] }
function creds() { const memberID=process.env.ORDERKUOTA_MEMBER_ID, pin=process.env.ORDERKUOTA_PIN, password=process.env.ORDERKUOTA_PASSWORD; if(!memberID||!pin||!password) throw Error('Kredensial ORDERKUOTA belum lengkap di .env'); return {memberID,pin,password} }
function status(raw) { const s=String(raw).toLowerCase(); return /sukses|success|berhasil/.test(s)?'SUCCESS':/gagal|failed|ditolak|nomor tujuan salah/.test(s)?'FAILED':'PENDING' }
function report(o) { return ['✦ *SCARD • STATUS ORDER*','━━━━━━━━━━━━━━━━','*Status:* '+o.status,'*Kode:* '+o.code,'*Tujuan:* '+o.target,'*RefID:* '+o.id,'',String(o.response||'').slice(0,700),'','Cek: /ppobstatus '+o.id].join('\n') }
async function check(id) { const o=load()[id]; if(!o) throw Error('RefID tidak ditemukan'); if(!['SUBMITTING','UNKNOWN','PENDING'].includes(o.status)) return o; const res=await axios.get('https://h2h.okeconnect.com/trx',{params:{...creds(),product:o.code,dest:o.target,refID:id,check:1},timeout:20000,responseType:'text'}); return change(id,{status:status(res.data),response:String(res.data).slice(0,1500)}) }
async function statusCommand(id) { const o=load()[String(id||'').toUpperCase()]; if(!o) return '❌ RefID tidak ditemukan. Gunakan /ppobstatus REFID'; try { return report(await check(o.id)) } catch(e) { return report(o)+'\n⚠️ Cek gagal: '+e.message } }
async function submit(id,sock,chat,msg) {
 if(locks.has(id)) return; locks.add(id)
 try {
  const o=load()[id]; if(!o||o.status!=='CONFIRMED') return
  change(id,{status:'SUBMITTING',response:'Menghubungi provider'})
  const sent=await sock.sendMessage(chat,{text:report(load()[id])},{quoted:msg})
  let result
  try { const res=await axios.get('https://h2h.okeconnect.com/trx',{params:{...creds(),product:o.code,dest:o.target,refID:id},timeout:20000,responseType:'text'}); result=change(id,{status:status(res.data),response:String(res.data).slice(0,1500)}) }
  catch(e) { result=change(id,{status:'UNKNOWN',response:'Status belum pasti, jangan ulangi order. Cek /ppobstatus '+id}); console.error('[PPOB H2H]',id,e.message) }
  if(sent?.key) await sock.sendMessage(chat,{text:report(result),edit:sent.key}).catch(()=>sock.sendMessage(chat,{text:report(result)}))
  else await sock.sendMessage(chat,{text:report(result)})
 } finally {locks.delete(id)}
}
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
  const previous = Object.values(load()).find(o => o.chat === chat && o.confirmId === ctx.stanzaId)
  if ((answer === 'YES' || answer === 'NO') && previous) {
    if(previous.status !== 'AWAITING' || Date.now() >= previous.expires) {
      if(previous.status === 'AWAITING') change(previous.id,{status:'EXPIRED'})
      await sock.sendMessage(chat,{text:'⌛ Konfirmasi kedaluwarsa atau sudah diproses.'},{quoted:msg}); return true
    }
    if(answer === 'NO') {change(previous.id,{status:'CANCELLED'}); await sock.sendMessage(chat,{text:'❌ Order dibatalkan.'},{quoted:msg}); return true}
    try {creds()} catch(e) {await sock.sendMessage(chat,{text:'❌ '+e.message},{quoted:msg}); return true}
    change(previous.id,{status:'CONFIRMED'})
    await submit(previous.id,sock,chat,msg)
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
  if (Object.values(load()).some(o => o.chat === chat && o.status === 'AWAITING' && Date.now() < o.expires)) {
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
  const id='SC'+Date.now().toString(36).toUpperCase()+crypto.randomBytes(4).toString('hex').toUpperCase()
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
    '*RefID:* '+id
  ].join('\n') }, { quoted: msg })
  if (!sent?.key?.id) return true
  const entry = {id,chat,confirmId:sent.key.id,code,target,name:product.name,price:product.price,status:'AWAITING',createdAt:Date.now(),expires:Date.now()+120000,response:''}
  const all=load(); all[id]=entry; save(all)
  const timer=setTimeout(async()=>{
    try {const current=load()[id]; if(!current||current.status!=='AWAITING') return; change(id,{status:'EXPIRED'}); await sock.sendMessage(chat,{delete:sent.key})}
    catch(e){console.error('[PPOB EXPIRE]',e.message)}
  },120000)
  timer.unref?.()
  return true
}
module.exports = { handle, statusCommand }
