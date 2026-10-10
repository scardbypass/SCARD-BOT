const { fetchDevotion, fetchAudio } = require('./ibadahFetcher')
const db = require('./database')
const GROUP = '120363430536068297@g.us'
const ZONE = 'Asia/Jakarta'
const DEFAULTS = { pagi: '05:00', siang: '12:00', malam: '18:00' }
let getSocket = () => null
let timer = null
let busy = false

function defaultGroup() {
  const old = db.getSetting('ibadahharian', {}) || {}
  return {
    enabled: old.enabled === true,
    audioEnabled: old.audioEnabled !== false,
    tagEnabled: true,
    sessions: Object.fromEntries(Object.entries(DEFAULTS).map(([name, time]) => [
      name, { enabled: old.sessions?.[name]?.enabled !== false, time: old.sessions?.[name]?.time || time }
    ]))
  }
}
function allGroups() {
  const saved = db.getSetting('ibadahharian:groups', null)
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved
  return { [GROUP]: defaultGroup() }
}
function groupSettings(group = GROUP) {
  return allGroups()[group] || null
}
function settings(group = GROUP) {
  const item = groupSettings(group)
  return item ? { ...item, group } : null
}
function saveGroup(group, config) {
  if (!/^[0-9]+(?:-[0-9]+)?@g\\.us$/.test(group)) throw new Error('ID grup tidak valid')
  const groups = allGroups()
  groups[group] = config
  db.setSetting('ibadahharian:groups', groups)
}
function removeGroup(group) {
  const groups = allGroups()
  if (!groups[group]) return false
  delete groups[group]
  db.setSetting('ibadahharian:groups', groups)
  return true
}
function addGroup(group) {
  if (!/^[0-9]+(?:-[0-9]+)?@g\\.us$/.test(group)) throw new Error('ID grup tidak valid')
  const groups = allGroups()
  if (groups[group]) return false
  groups[group] = {
    enabled: false, audioEnabled: true, tagEnabled: true,
    sessions: Object.fromEntries(Object.entries(DEFAULTS).map(([name, time]) => [
      name, { enabled: true, time }
    ]))
  }
  db.setSetting('ibadahharian:groups', groups)
  return true
}
function save(config) { saveGroup(config.group || GROUP, config) }
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
async function send(session, manual = false, group = GROUP) {
  const cfg = settings(group)
  if (!cfg) throw new Error('Grup belum terdaftar')
  if (!DEFAULTS[session]) throw new Error('Sesi tidak dikenal')
  if (!manual && (!cfg.enabled || !cfg.sessions[session].enabled)) return false
  const now = localNow()
  const key = 'ibadahharian:sent:' + group + ':' + now.date + ':' + session
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
  // Native Baileys mentionAll tags the group without listing each member.
  const pages = chunks(title + formatMaterial(content) +
    '\n\n━━━━━━━━━━━━━━━━━━\n_Dibagikan oleh: mdcjombang.id_' + (cfg.tagEnabled !== false ? '\n@semua' : ''))
  for (let i = 0; i < pages.length; i++) {
    await sock.sendMessage(cfg.group, {
      text: pages[i],
      ...(i === pages.length - 1 && cfg.tagEnabled !== false ? { mentionAll: true } : {})
    })
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
    const now = localNow()
    const due = []
    for (const [group, cfg] of Object.entries(allGroups())) {
      if (!cfg.enabled) continue
      for (const [session, value] of Object.entries(cfg.sessions || {})) {
        if (DEFAULTS[session] && value.enabled && value.time === now.time) due.push([group, session])
      }
    }
    if (!due.length) return
    busy = true
    try {
      for (const [group, session] of due) {
        await send(session, false, group).catch(e => console.error('[IBADAH HARIAN]', group, session, e.message))
      }
    }
    finally { busy = false }
  }, 15000)
  timer.unref?.()
}
module.exports = { settings, save, send, saveContent, getContent, localNow, startIbadahScheduler, DEFAULTS, GROUP, allGroups, addGroup, removeGroup }
