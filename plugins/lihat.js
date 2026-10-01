const {
  downloadContentFromMessage
} = require('baileys')

const {
  getQuotedMessage,
  unwrapMessage
} = require('../lib/utils')

// ============================================================
// STREAM -> BUFFER
// ============================================================

async function toBuffer(stream) {
  const chunks = []

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

// ============================================================
// PLUGIN
// ============================================================

module.exports = {
  commands: [
    'lihat'
  ],

  registered: true,

  menuSection: 'TOOLS',
  menu: '/lihat (reply View Once)',

  async run({
    sock,
    msg,
    reply
  }) {
    // ========================================================
    // GET QUOTED MESSAGE
    // ========================================================

    const quoted = getQuotedMessage(msg)

    if (!quoted) {
      return reply(
        '👁️ *LIHAT VIEW ONCE*\n\n' +
        'Reply foto/video 1x lihat, lalu ketik:\n' +
        '*/lihat*'
      )
    }

    // ========================================================
    // UNWRAP MESSAGE
    // ========================================================

    const quotedMessage = unwrapMessage(quoted)

    let media = null
    let type = null

    // Image
    if (quotedMessage?.imageMessage) {
      media = quotedMessage.imageMessage
      type = 'image'
    }

    // Video
    else if (quotedMessage?.videoMessage) {
      media = quotedMessage.videoMessage
      type = 'video'
    }

    // Unsupported
    else {
      return reply(
        '❌ Pesan yang direply bukan foto/video 1x lihat.'
      )
    }

    // ========================================================
    // DOWNLOAD MEDIA
    // ========================================================

    try {
      const stream =
        await downloadContentFromMessage(
          media,
          type
        )

      const buffer =
        await toBuffer(stream)

      // ======================================================
      // BUILD PAYLOAD
      // ======================================================

      let payload

      if (type === 'image') {
        payload = {
          image: buffer,
          caption: media.caption || ''
        }
      } else {
        payload = {
          video: buffer,
          caption: media.caption || '',
          mimetype:
            media.mimetype ||
            'video/mp4'
        }
      }

      // ======================================================
      // SEND MEDIA
      // ======================================================

      await sock.sendMessage(
        msg.key.remoteJid,
        payload,
        {
          quoted: msg
        }
      )
    } catch (error) {
      console.error(
        '[LIHAT]',
        error
      )

      return reply(
        '❌ Media tidak dapat diambil.\n\n' +
        'Media mungkin sudah kedaluwarsa atau tidak tersedia lagi.'
      )
    }
  }
}
