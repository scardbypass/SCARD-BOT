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
function chunks(text, limit = 3500) {
  const paragraphs = text.split(/\n\n+/)
  const output = []
  let current = ''
  for (const paragraph of paragraphs) {
    const pieces = paragraph.match(/[\s\S]{1,3000}/g) || ['']
    for (const piece of pieces) {
      if (current && (current.length + piece.length + 2 > limit)) { output.push(current); current = '' }
      current += (current ? '\n\n' : '') + piece
    }
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
  const content = getContent(now.date, session)
  if (!content) throw new Error('Materi ' + session + ' tanggal ' + now.date + ' belum tersedia. Gunakan /ibadahharian isi.')
  const sock = getSocket()
  if (!sock?.user) throw new Error('WhatsApp belum terhubung')
  const pages = chunks('🙏 *IBADAH HARIAN — ' + session.toUpperCase() + '*\n📅 ' + now.date + '\n\n' + content + '\n\n_Sumber: ibadahharian.net (materi disediakan pengelola bot)_')
  for (const page of pages) await sock.sendMessage(cfg.group, { text: page })
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
