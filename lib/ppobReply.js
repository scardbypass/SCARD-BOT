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
function status(raw) {
 const s=String(raw).toLowerCase()
 if (/gagal|failed|ditolak|nomor tujuan salah|error/.test(s)) return 'FAILED'
 if (/sukses|success|berhasil/.test(s)) return 'SUCCESS'
 return 'PENDING'
}
function rupiah(value){return 'Rp'+Number(value||0).toLocaleString('id-ID')}
function parseProvider(raw) {
 const s=String(raw||'')
 const sn=s.match(/\bSN\s*[:=]\s*([^\s,;]+)/i)?.[1]||''
 const balance=s.match(/\bSaldo\s*[:=]?\s*(?:Rp\s*)?([\d.,]+)/i)?.[1]||''
 const price=s.match(/\bHrg\s*[:=]?\s*(?:Rp\s*)?([\d.,]+)/i)?.[1]||''
 const reason=(s.match(/(?:pesan|alasan|keterangan)\s*[:=]\s*([^\n]+)/i)?.[1] || s.match(/\b(?:GAGAL|FAILED|DITOLAK|ERROR)\b[.:\s-]*([\s\S]*?)(?=\s+Saldo\b|$)/i)?.[1] || '').trim()
 return {sn,balance,price,reason}
}
function report(o) {
 const info=parseProvider(o.response)
 const title=o.status==='SUCCESS'?'✅ *TRANSACTION SUCCESS*':o.status==='FAILED'?'❌ *TRANSACTION FAILED*':'⏳ *TRANSACTION PENDING*'
 const name=String(o.name||o.code||'Produk Digital').trim()
 const token=/\bPLN\b|TOKEN LISTRIK/i.test(name+' '+o.code)
 const lines=[
 '╭──────────────────────────╮',
 '│ ✦ *S C A R D  D I G I T A L*',
 '╰──────────────────────────╯',
 '',
 title,
 o.status==='SUCCESS'?'Transaksi berhasil diproses':o.status==='FAILED'?'Transaksi tidak berhasil':'Menunggu konfirmasi provider',
 '',
 '━━━━━━━━━━━━━━━━━━━━',
 '*'+name+'*',
 '',
 '📱 '+o.target,
 '🏷️ '+o.code,
 '💵 '+rupiah(o.price)
 ]
 if(o.status==='SUCCESS'&&info.sn) lines.push('','━━━━━━━━━━━━━━━━━━━━','      ✦ *'+(token?'TOKEN LISTRIK':'SERIAL NUMBER')+'*','','`'+info.sn+'`')
 if(o.status==='FAILED') lines.push('','*DETAIL KEGAGALAN*',info.reason||'Periksa status atau keterangan provider')
 if(info.balance) lines.push('','━━━━━━━━━━━━━━━━━━━━','💳 *REMAINING BALANCE*','*Rp'+info.balance+'*')
 lines.push('','Ref ID: `'+o.id+'`')
 if(o.status==='PENDING'||o.status==='UNKNOWN'||o.status==='SUBMITTING') lines.push('','Cek: /ppobstatus '+o.id)
 lines.push('','✦ _SCARD • Digital Transaction Center_')
 return lines.join('\n')
}
async function publishFinal(sock,chat,sent,o) {
 if(!['SUCCESS','FAILED'].includes(o.status)) return false
 const key=sent?.key||o.pendingKey
 if(key) await sock.sendMessage(chat,{delete:key}).catch(e=>console.warn('[PPOB] delete pending failed',e.message))
 await sock.sendMessage(chat,{text:report(o)})
 if(o.pendingKey) change(o.id,{pendingKey:null})
 return true
}
async function check(id) { const o=load()[id]; if(!o) throw Error('RefID tidak ditemukan'); if(!['SUBMITTING','UNKNOWN','PENDING'].includes(o.status)) return o; const res=await axios.get('https://h2h.okeconnect.com/trx',{params:{...creds(),product:o.code,dest:o.target,refID:id,check:1},timeout:20000,responseType:'text'}); return change(id,{status:status(res.data),response:String(res.data).slice(0,1500)}) }
async function statusCommand(id) { const o=load()[String(id||'').toUpperCase()]; if(!o) return '❌ RefID tidak ditemukan. Gunakan /ppobstatus REFID'; try { return report(await check(o.id)) } catch(e) { return report(o)+'\n⚠️ Cek gagal: '+e.message } }
async function submit(id,sock,chat,msg) {
 if(locks.has(id)) return; locks.add(id)
 try {
  const o=load()[id]; if(!o||o.status!=='CONFIRMED') return
  change(id,{status:'SUBMITTING',response:'Menghubungi provider'})
  const sent=await sock.sendMessage(chat,{text:report(load()[id])},{quoted:msg})
  if(sent?.key?.id) change(id,{pendingKey:sent.key})
  let result
  try { const res=await axios.get('https://h2h.okeconnect.com/trx',{params:{...creds(),product:o.code,dest:o.target,refID:id},timeout:20000,responseType:'text'}); result=change(id,{status:status(res.data),response:String(res.data).slice(0,1500)}) }
  catch(e) { result=change(id,{status:'UNKNOWN',response:'Status belum pasti, jangan ulangi order. Cek /ppobstatus '+id}); console.error('[PPOB H2H]',id,e.message) }
  if(!(await publishFinal(sock,chat,sent,result)) && !sent?.key) await sock.sendMessage(chat,{text:report(result)})
  if(['PENDING','UNKNOWN'].includes(result.status)) {
    let count=0
    const timer=setInterval(async()=>{
      if(locks.has('check:'+id)) return
      locks.add('check:'+id)
      try {
        const current=load()[id]
        if(!current||!['PENDING','UNKNOWN','SUBMITTING'].includes(current.status)||++count>12){clearInterval(timer);return}
        const checked=await check(id)
        if(await publishFinal(sock,chat,sent,checked)) clearInterval(timer)
      }catch(e){console.error('[PPOB CHECK]',id,e.message)}
      finally{locks.delete('check:'+id)}
    },15000)
    timer.unref?.()
  }
 } finally {locks.delete(id)}
}
const PRICE_URL = process.env.OKECONNECT_PRICE_URL || 'https://okeconnect.com/harga/json?id=905ccd028329b0a'
function contextOf(msg) {
  const m = unwrapMessage(msg.message || {})
  return m.extendedTextMessage?.contextInfo || m.imageMessage?.contextInfo || m.videoMessage?.contextInfo || m.contactMessage?.contextInfo || m.contactsArrayMessage?.contextInfo || m.documentMessage?.contextInfo || null
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
    description: String(row.deskripsi ?? row.description ?? row.keterangan ?? row.detail ?? row.desc ?? '').trim(),
    price: Number(String(row.harga ?? row.price ?? row.selling_price ?? row.harga_jual ?? '').replace(/[^\d]/g, ''))
  })).find(p => p.code === code && p.name && Number.isFinite(p.price) && p.price > 0)
}

const targetPrompts = new Map()
function incomingTarget(msg,body) {
 const m=unwrapMessage(msg.message||{})
 const contact=m.contactMessage||m.contactsArrayMessage?.contacts?.[0]
 const vcard=contact?.vcard||''
 const number=String(body||'').trim().match(/^(?:\+?62|0)\d{8,13}$/)?.[0]||
   vcard.match(/TEL[^:\n]*:([+\d ()-]+)/i)?.[1]?.replace(/[^\d+]/g,'')
 if(!number)return null
 const cleaned=number.replace(/[^\d]/g,'')
 return cleaned.startsWith('62')?'0'+cleaned.slice(2):cleaned
}
async function promptTarget({sock,msg,chat,code}) {
 const normalized=String(code||'').toUpperCase()
 if(!/^[A-Z0-9_-]{2,30}$/.test(normalized))return false
 let product
 try{product=await productByCode(normalized)}catch(e){
  await sock.sendMessage(chat,{text:'❌ Gagal mengambil katalog: '+e.message},{quoted:msg});return true
 }
 if(!product){
  await sock.sendMessage(chat,{text:'❌ Kode '+normalized+' tidak ditemukan di katalog OkeConnect.'},{quoted:msg});return true
 }
 const text=['✦ *SCARD DIGITAL*','━━━━━━━━━━━━━━━━━━','🛒 *ORDER PRODUK*','', '*'+productTitle(product)+'*',
 'Kode: '+normalized,'Harga: Rp'+product.price.toLocaleString('id-ID'),'','📱 *KIRIM NOMOR TUJUAN*',
 'Reply pesan ini dengan nomor HP atau kirim kontak WhatsApp.','', '⌛ Berlaku 2 menit'].join('\n')
 const sent=await sock.sendMessage(chat,{text},{quoted:msg})
 if(!sent?.key?.id)return true
 targetPrompts.set(chat,{id:sent.key.id,code:normalized,expires:Date.now()+120000})
 return true
}
function productTitle(p) {
 const d=String(p.description||'').replace(/\s+/g,' ').trim()
 return d && d.toLowerCase()!==p.name.toLowerCase() ? p.name+' — '+d : p.name
}
async function confirmTarget({sock,msg,chat,code,target}) {
 if(Object.values(load()).some(o=>o.chat===chat&&o.status==='AWAITING'&&Date.now()<o.expires)){
  await sock.sendMessage(chat,{text:'⚠️ Selesaikan konfirmasi YES/NO sebelumnya terlebih dahulu.'},{quoted:msg});return true
 }
 let product
 try{product=await productByCode(code)}catch(e){
  await sock.sendMessage(chat,{text:'❌ Katalog gagal diperiksa.'},{quoted:msg});return true
 }
 if(!product){await sock.sendMessage(chat,{text:'❌ Produk tidak tersedia.'},{quoted:msg});return true}
 const id='SC'+Date.now().toString(36).toUpperCase()+crypto.randomBytes(4).toString('hex').toUpperCase()
 const sent=await sock.sendMessage(chat,{text:[
 '✦ *SCARD • KONFIRMASI ORDER*','━━━━━━━━━━━━━━━━','*Produk:* '+productTitle(product),
 '*Kode:* '+code,'*Tujuan:* '+target,'*Harga:* Rp'+product.price.toLocaleString('id-ID'),
 '','Balas *YES* atau *NO* pada pesan ini.','⌛ Berlaku 2 menit','*RefID:* '+id
 ].join('\n')},{quoted:msg})
 if(!sent?.key?.id)return true
 const all=load()
 all[id]={id,chat,confirmId:sent.key.id,code,target,name:productTitle(product),price:product.price,status:'AWAITING',createdAt:Date.now(),expires:Date.now()+120000,response:''}
 save(all)
 return true
}

async function handle({ sock, msg, chat, body }) {
  body=String(body||'')
  const ctx = contextOf(msg)
  const pending=targetPrompts.get(chat)
  if(pending&&Date.now()>pending.expires)targetPrompts.delete(chat)
  if(pending&&ctx?.stanzaId===pending.id&&Date.now()<=pending.expires) {
    const target=incomingTarget(msg,body)
    if(target) {
      targetPrompts.delete(chat)
      return confirmTarget({sock,msg,chat,code:pending.code,target})
    }
    await sock.sendMessage(chat,{text:'📱 Reply dengan nomor HP yang valid atau kirim kontak WhatsApp.'},{quoted:msg})
    return true
  }
  const direct=/^[/!.]([a-z0-9_-]{2,30})$/i.exec(body.trim())
  if(direct&&direct[1].toLowerCase()!=='status'&&direct[1].toLowerCase()!=='statuspulsa') {
    const known=await productByCode(direct[1].toUpperCase()).catch(()=>null)
    if(known)return promptTarget({sock,msg,chat,code:direct[1]})
  }
  const codeOnly=/^([a-z0-9_-]{2,30})$/i.exec(body.trim())
  if(codeOnly&&ctx?.quotedMessage) {
    const quotedText=getQuotedText(msg)
    if(/SCARD/i.test(quotedText)&&/ORDER VIA REPLY/i.test(quotedText)&&quotedText.split('\n').some(line=>line.trim().toUpperCase().startsWith(codeOnly[1].toUpperCase()+'  •'))) {
      return promptTarget({sock,msg,chat,code:codeOnly[1]})
    }
  }
  const isOrder = /^\/?([A-Z0-9_-]{2,30})\s+(\d{8,16})$/i.test(body.trim())
  const isDecision = /^(YES|NO)$/i.test(body.trim())
  // Direct slash-prefixed SKU + destination, without a catalog reply.
  const directOrder = /^\/([A-Z0-9_-]{2,30})\s+(\d{8,16})$/i.exec(body.trim())
  if (directOrder && !ctx?.quotedMessage) {
    const code = directOrder[1].toUpperCase()
    const product = await productByCode(code).catch(() => null)
    if (product) return confirmTarget({sock,msg,chat,code,target:directOrder[2]})
  }
  if (!ctx?.stanzaId || !ctx.quotedMessage) {
    if (isOrder || isDecision) console.log('[PPOB REPLY] missing quoted context', { stanzaId: !!ctx?.stanzaId, quoted: !!ctx?.quotedMessage, fromMe: !!msg.key.fromMe })
    return false
  }
  const quoted = getQuotedText(msg)
  const answerStatus = /^(?:status|statuspulsa|cekstatus|cek)$/i.test(body.trim())
  if(answerStatus) {
    const all=load()
    const quotedRef=(quoted.match(/\bSC[A-Z0-9]{10,30}\b/i)||[])[0]?.toUpperCase()
    const order=Object.values(all).find(o=>o.chat===chat && (
      (o.pendingKey?.id && o.pendingKey.id===ctx.stanzaId) ||
      (quotedRef && o.id===quotedRef)
    ))
    if(!order) {
      await sock.sendMessage(chat,{text:'❌ Order dari pesan yang dibalas tidak ditemukan. Reply pesan PENDING SCARD lalu ketik *status*.'},{quoted:msg})
      return true
    }
    if(locks.has('manual:'+order.id)) {
      await sock.sendMessage(chat,{text:'⏳ Status order ini sedang diperiksa.'},{quoted:msg})
      return true
    }
    locks.add('manual:'+order.id)
    try {
      const latest=await check(order.id)
      if(['SUCCESS','FAILED'].includes(latest.status) && ['PENDING','UNKNOWN','SUBMITTING'].includes(order.status)) {
        await publishFinal(sock,chat,null,latest)
      } else {
        await sock.sendMessage(chat,{text:report(latest)},{quoted:msg})
      }
    } catch(e) {
      console.error('[PPOB STATUS REPLY]',order.id,e.message)
      await sock.sendMessage(chat,{text:'⚠️ Belum bisa memeriksa provider. Transaksi tidak diulang.\nRef: '+order.id},{quoted:msg})
    } finally {locks.delete('manual:'+order.id)}
    return true
  }
  if (isOrder || isDecision) console.log('[PPOB REPLY] context', { stanzaId: ctx.stanzaId, quotedLength: quoted.length, fromMe: !!msg.key.fromMe })
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
  const match = /^\/?([A-Z0-9_-]{2,30})\s+(\d{8,16})$/i.exec(body.trim())
  if (!match) return false
  if (!/SCARD\s*•/i.test(quoted) || !/ORDER VIA REPLY/i.test(quoted)) {
    console.log('[PPOB REPLY] not a catalog message', {quotedLength: quoted.length, preview: quoted.slice(0, 100)})
    return false
  }
  const code = match[1].toUpperCase()
  const target = match[2]
  const exists = quoted.split('\n').some(line => line.trim().toUpperCase().startsWith(code + '  •  RP'))
  if (!exists) {
    console.log('[PPOB REPLY] product code not found in quote', code)
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
    '*Produk:* ' + productTitle(product),
    '*Kode:* ' + code,
    '*Tujuan:* ' + target,
    '*Harga:* Rp' + product.price.toLocaleString('id-ID'),
    '',
    'Balas *YES* atau *NO* pada pesan ini.',
    '⌛ Berlaku 2 menit',
    '*RefID:* '+id
  ].join('\n') }, { quoted: msg })
  if (!sent?.key?.id) return true
  const entry = {id,chat,confirmId:sent.key.id,code,target,name:productTitle(product),price:product.price,status:'AWAITING',createdAt:Date.now(),expires:Date.now()+120000,response:''}
  const all=load(); all[id]=entry; save(all)
  const timer=setTimeout(async()=>{
    try {const current=load()[id]; if(!current||current.status!=='AWAITING') return; change(id,{status:'EXPIRED'}); await sock.sendMessage(chat,{delete:sent.key})}
    catch(e){console.error('[PPOB EXPIRE]',e.message)}
  },120000)
  timer.unref?.()
  return true
}
module.exports = { handle, statusCommand }
