module.exports = {
  commands: [
    'aion',
    'aioff',
    'aistatus'
  ],

  registered: true,
  ownerOnly: true,

  menuSection: 'OWNER',
  menu: '/aion • /aioff • /aistatus',

  async run({ reply, command, db }) {
    // ========================================================
    // AI ON
    // ========================================================

    if (command === 'aion') {
      db.setSetting('aiEnabled', true)

      return reply(
        '🤖 AI Gemini *ON*\n\n' +
        'Private chat user terdaftar sekarang bisa langsung ' +
        'ngobrol tanpa command.\n\n' +
        'Di grup, mention/reply bot untuk bertanya.'
      )
    }

    // ========================================================
    // AI OFF
    // ========================================================

    if (command === 'aioff') {
      db.setSetting('aiEnabled', false)

      return reply(
        '🤖 AI Gemini *OFF*'
      )
    }

    // ========================================================
    // AI STATUS
    // ========================================================

    const enabled = db.getSetting(
      'aiEnabled',
      false
    )

    return reply(
      `🤖 AI Gemini : *${enabled ? 'ON' : 'OFF'}*`
    )
  }
}
