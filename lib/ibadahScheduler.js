const { fetchDevotion, fetchAudio } = require('./ibadahFetcher')
const db = require('./database')
const GROUP = '120363430536068297@g.us'
const ZONE = 'Asia/Jakarta'
const DEFAULTS = { pagi: '05:00', siang: '12:00', malam: '18:00' }
let getSocket = () => null
let timer = null
let busy = false

function settings() {
  const saved = db.getSetting('ibadahharian', {}) || {}
  return {
    enabled: saved.enabled === true,
    audioEnabled: saved.audioEnabled !== false,
    group: GROUP,
    sessions: Object.fromEntries(Object.entries(DEFAULTS).map(([name, time]) => [
      name, { enabled: saved.sessions?.[name]?.enabled !== false, time: saved.sessions?.[name]?.time || time }
    ]))
  }
}
function save(config) { db.setSetting('ibadahharian', config) }
function localNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date())
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]))
  return { date: p.year + '-' + p.month + '-' + p.day, time: p.hour + ':' + p.minute }
}
function contentKey(date, session) { return 'ibadahharian:content:' + date + ':' + session }
function saveContent(date, session, text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !DEFAULTS[session]) throw new Error('Tanggal atau sesi tidak valid')
  const cleaned = String(text || '').replace(/\*{4,}/g, '').replace(/\n{3,}/g, '\n\n').trim()
  if (cleaned.length < 50) throw new Error('Materi terlalu pendek')
  db.setSetting(contentKey(date, session), cleaned)
  return cleaned.length
}
function getContent(date, session) { return db.getSetting(contentKey(date, session), '') }
const MAX_MESSAGE = 55000
const TIMES = { pagi: '05.00–08.00', siang: '12.00–14.00', malam: '18.00–22.00' }

function formatMaterial(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s*\*([^*\n]+)\*\s*\n/g, '\n\n*✦ $1*\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
function chunks(text, limit = MAX_MESSAGE) {
  if (text.length <= limit) return [text]
  const parts = text.split(/\n\n+/)
  const output = []
  let current = ''
  for (const part of parts) {
    if (part.length > limit) {
      if (current) { output.push(current); current = '' }
      for (let i = 0; i < part.length; i += limit) output.push(part.slice(i, i + limit))
      continue
    }
    const combined = current ? current + '\n\n' + part : part
    if (combined.length > limit) { output.push(current); current = part }
    else current = combined
  }
  if (current) output.push(current)
  return output
}
async function send(session, manual = false) {
  const cfg = settings()
  if (!DEFAULTS[session]) throw new Error('Sesi tidak dikenal')
  if (!manual && (!cfg.enabled || !cfg.sessions[session].enabled)) return false
  const now = localNow()
  const key = 'ibadahharian:sent:' + now.date + ':' + session
  if (!manual && db.wasSent(key)) return false
  // Materi website diambil saat pengiriman; tidak memakai cache hari sebelumnya.
  let content
  try {
    content = await fetchDevotion(session)
    saveContent(now.date, session, content)
  } catch (error) {
    console.error('[IBADAH FETCH]', error.message)
    throw new Error('Gagal mengambil materi terbaru dari website: ' + error.message)
  }
  const sock = getSocket()
  if (!sock?.user) throw new Error('WhatsApp belum terhubung')
  const title = '🙏 *IBADAH HARIAN — ' + session.toUpperCase() + '*\n' +
    '📅 ' + now.date + '  |  🕒 ' + TIMES[session] + ' WIB\n' +
    '━━━━━━━━━━━━━━━━━━\n\n'
  // WhatsApp tidak mendukung tag semua hanya dengan menulis @semua.
  // Gunakan daftar peserta grup sebagai mentions agar seluruh anggota mendapat notifikasi.
  let mentions = []
  try {
    const metadata = await sock.groupMetadata(cfg.group)
    mentions = [...new Set((metadata.participants || [])
      .map(p => p.id || p.jid)
      .filter(id => typeof id === 'string' && id.includes('@')))]
  } catch (error) {
    console.warn('[IBADAH MENTIONS] Tidak bisa membaca anggota grup:', error.message)
  }
  const pages = chunks(title + formatMaterial(content) +
    '\n\n━━━━━━━━━━━━━━━━━━\n_Dibagikan oleh: mdcjombang.id_\n@semua')
  for (let i = 0; i < pages.length; i++) {
    await sock.sendMessage(cfg.group, { text: pages[i], ...(i === pages.length - 1 && mentions.length ? { mentions } : {}) })
  }
  // Audio tambahan bersifat opsional: teks selalu dikirim walaupun audio tidak tersedia.
  if (cfg.audioEnabled) try {
    const audio = await fetchAudio(session)
    if (audio) {
      if (audio.audioYear && audio.audioYear !== Number(now.date.slice(0, 4))) {
        console.warn('[IBADAH AUDIO] Rekaman arsip tahun ' + audio.audioYear + ' untuk materi ' + now.date)
      }
      await sock.sendMessage(cfg.group, {
        audio: audio.buffer,
        mimetype: /\.ogg(?:[?#]|$)/i.test(audio.url) ? 'audio/ogg' : /\.m4a(?:[?#]|$)/i.test(audio.url) ? 'audio/mp4' : 'audio/mpeg',
        ptt: false,
        fileName: 'Ibadah-Harian-' + session + '-' + now.date + '.mp3'
      })
    } else {
      console.log('[IBADAH AUDIO] Tidak ada satu sumber audio yang dapat dipastikan untuk sesi ' + session)
    }
  } catch (error) {
    console.warn('[IBADAH AUDIO] Audio gagal, teks tetap terkirim:', error.message)
  }
  if (!manual) db.markSent(key)
  return true
}
function startIbadahScheduler(sockGetter) {
  getSocket = typeof sockGetter === 'function' ? sockGetter : () => sockGetter
  if (timer) return
  timer = setInterval(async () => {
    if (busy) return
    const cfg = settings(), now = localNow()
    if (!cfg.enabled) return
    const due = Object.entries(cfg.sessions).filter(([, v]) => v.enabled && v.time === now.time)
    if (!due.length) return
    busy = true
    try { for (const [session] of due) await send(session).catch(e => console.error('[IBADAH HARIAN]', e.message)) }
    finally { busy = false }
  }, 15000)
  timer.unref?.()
}
module.exports = { settings, save, send, saveContent, getContent, localNow, startIbadahScheduler, DEFAULTS, GROUP }
