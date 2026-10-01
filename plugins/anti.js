const db = require('../lib/database')

const OWNER_ONLY = '❌ Command khusus owner.'

function clean(value) {
  return String(value || '').trim().toLowerCase()
}

function getWords() {
  return db.getSetting('antiToxicWords', [])
}

function saveWords(words) {
  const uniqueWords = [...new Set(words.map(clean).filter(Boolean))]
  return db.setSetting('antiToxicWords', uniqueWords)
}

function getGroupSettings() {
  return db.getSetting('antiToxicGroups', {})
}

module.exports = {
  commands: ['anti', 'toxicadd', 'toxicdel', 'toxiclist'],
  registered: false,

  async run({ msg, reply, command, args, isOwner }) {
    const chat = msg.key.remoteJid || ''

    // Tambah kata/kalimat ke blacklist global.
    if (command === 'toxicadd') {
      if (!isOwner) return reply(OWNER_ONLY)

      const word = clean(args.join(' '))
      if (!word) return reply('Gunakan: /toxicadd <kata atau kalimat>')

      const list = getWords()
      if (list.includes(word)) {
        return reply('⚠️ Kata tersebut sudah ada di blacklist.')
      }

      saveWords([...list, word])
      return reply(`✅ Toxic blacklist ditambah: *${word}*`)
    }

    // Hapus kata/kalimat dari blacklist global.
    if (command === 'toxicdel') {
      if (!isOwner) return reply(OWNER_ONLY)

      const word = clean(args.join(' '))
      if (!word) return reply('Gunakan: /toxicdel <kata atau kalimat>')

      const list = getWords()
      if (!list.includes(word)) {
        return reply('⚠️ Kata tersebut tidak ada di blacklist.')
      }

      saveWords(list.filter(item => item !== word))
      return reply(`✅ Dihapus dari toxic blacklist: *${word}*`)
    }

    // Tampilkan blacklist.
    if (command === 'toxiclist') {
      if (!isOwner) return reply(OWNER_ONLY)

      const list = getWords()
      if (!list.length) return reply('Blacklist toxic masih kosong.')

      const items = list.map((word, index) => `${index + 1}. ${word}`).join('\n')
      return reply(`🚫 *TOXIC BLACKLIST*\n\n${items}`)
    }

    // /anti hanya dapat diatur dari dalam grup.
    if (!chat.endsWith('@g.us')) {
      return reply('❌ Pengaturan anti-pesan hanya untuk grup.')
    }

    if (!isOwner) return reply(OWNER_ONLY)

    const type = clean(args[0])
    const state = clean(args[1])
    const groups = getGroupSettings()

    if (type !== 'toxic' || !['on', 'off'].includes(state)) {
      const enabled = Boolean(groups[chat])

      return reply(
        '🛡️ *ANTI PESAN*\n\n' +
        `Anti toxic: *${enabled ? 'ON' : 'OFF'}*\n` +
        `Blacklist: *${getWords().length} kata*\n\n` +
        'Gunakan: /anti toxic on|off'
      )
    }

    groups[chat] = state === 'on'
    db.setSetting('antiToxicGroups', groups)

    return reply(`✅ Anti toxic grup sekarang *${state.toUpperCase()}*.`)
  }
}
