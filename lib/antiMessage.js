const db = require('./database')
const { getText } = require('./utils')

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\\p{L}\\p{N}]+/gu, ' ')
    .replace(/\\s+/g, ' ')
    .trim()
}

function containsToxicWord(text, term) {
  const normalizedText = normalize(text)
  const normalizedTerm = normalize(term)

  if (!normalizedText || !normalizedTerm) return false

  // Kalimat blacklist harus muncul sebagai frasa utuh.
  if (normalizedTerm.includes(' ')) {
    return (` ${normalizedText} `).includes(` ${normalizedTerm} `)
  }

  // Kata tunggal harus cocok sebagai kata utuh agar tidak false-positive.
  return normalizedText.split(' ').includes(normalizedTerm)
}

async function handleAntiMessage(sock, msg, { isOwner = false } = {}) {
  const chat = msg?.key?.remoteJid || ''

  // Hanya moderasi pesan anggota di grup. Pesan bot/owner dilewati.
  if (!chat.endsWith('@g.us') || msg.key.fromMe || isOwner) return false

  const groups = db.getSetting('antiToxicGroups', {})
  if (!groups[chat]) return false

  const text = getText(msg)
  const blacklist = db.getSetting('antiToxicWords', [])
  const matchedWord = blacklist.find(word => containsToxicWord(text, word))

  if (!matchedWord) return false

  try {
    await sock.sendMessage(chat, { delete: msg.key })
    await sock.sendMessage(chat, {
      text: '⚠️ Pesan dihapus oleh *Anti Toxic*.\nJaga bahasa di grup ya.'
    })

    console.log('[ANTI TOXIC] deleted', chat, 'match=', matchedWord)
    return true
  } catch (error) {
    console.error('[ANTI TOXIC]', error.message)
    return false
  }
}

module.exports = { handleAntiMessage }
