const db = require('./database')

const TZ = process.env.TIMEZONE || 'Asia/Jakarta'

/**
 * Ambil waktu saat ini berdasarkan timezone.
 */
function getCurrentTimeParts() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  })

  const parts = formatter.formatToParts(new Date())

  return Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  )
}

/**
 * Kirim voting badminton ke grup WhatsApp.
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function errorCode(error) {
  return Number(
    error?.output?.statusCode ||
    error?.data?.statusCode ||
    error?.statusCode ||
    0
  )
}

function isConnectionError(error) {
  const code = errorCode(error)
  const message = String(
    error?.message ||
    error?.output?.payload?.message ||
    ''
  ).toLowerCase()

  return (
    [408, 428, 440, 503].includes(code) ||
    message.includes('connection closed') ||
    message.includes('socket') ||
    message.includes('timed out')
  )
}

async function sendPoll(sock, title) {
  const jid = String(process.env.VOTING_GROUP_ID || '').trim()

  if (!jid) {
    throw new Error('VOTING_GROUP_ID kosong')
  }

  if (!jid.endsWith('@g.us')) {
    throw new Error('VOTING_GROUP_ID harus berakhiran @g.us')
  }

  const sent = await sock.sendMessage(jid, {
    poll: {
      name: title,
      values: [
        '🏸 Gas',
        '😁 Izin'
      ],
      selectableCount: 1
    }
  })

  if (!sent?.key?.id) {
    throw new Error(
      'WhatsApp tidak mengembalikan message ID untuk poll'
    )
  }

  console.log(
    '[VOTING] terkirim:',
    title,
    '| id:',
    sent.key.id
  )

  return sent
}

/**
 * Tentukan jadwal badminton berdasarkan hari pengiriman.
 *
 * Minggu -> Badminton Senin
 * Kamis  -> Badminton Jumat
 */
function getVotingEvent(weekday) {
  const schedule = {
    Sun: 'Senin',
    Thu: "Jum'at"
  }

  return schedule[weekday] || null
}

/**
 * Scheduler voting badminton.
 */
function startVotingScheduler(sockOrGetter) {
  const getSock = typeof sockOrGetter === 'function'
    ? sockOrGetter
    : () => sockOrGetter
  console.log(`[VOTING] Scheduler aktif | Timezone: ${TZ}`)

  setInterval(async () => {
    try {
      // Cek apakah fitur voting aktif
      const enabled =
        String(process.env.VOTING_ENABLED || 'true').toLowerCase() === 'true'

      if (!enabled) return

      // Ambil waktu sekarang
      const now = getCurrentTimeParts()

      // Jadwal dari ENV
      const votingHour = Number(process.env.VOTING_HOUR || 10)
      const votingMinute = Number(process.env.VOTING_MINUTE || 0)

      // Belum waktunya kirim
      if (
        Number(now.hour) !== votingHour ||
        Number(now.minute) !== votingMinute
      ) {
        return
      }

      // Tentukan event berdasarkan hari
      const event = getVotingEvent(now.weekday)

      if (!event) return

      // Unique key agar voting tidak terkirim dua kali
      const date = `${now.year}-${now.month}-${now.day}`
      const key = `voting:${date}:${event}`

      if (db.wasSent(key)) {
        return
      }

      // Kirim voting menggunakan socket terbaru.
      // Jika koneksi sedang reconnect, tunggu lalu coba lagi.
      let lastError = null

      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          const currentSock = getSock()

          if (!currentSock?.user) {
            throw new Error('Socket WhatsApp belum siap')
          }

          await sendPoll(
            currentSock,
            `🏸 Badminton ${event}\nYuk Tampil`
          )

          lastError = null
          break
        } catch (error) {
          lastError = error

          const code = errorCode(error)
          const retryable = isConnectionError(error)

          console.warn(
            '[VOTING] kirim gagal',
            `attempt ${attempt}/5`,
            code ? `HTTP ${code}` : '',
            error?.message || error
          )

          if (!retryable || attempt === 5) {
            break
          }

          await sleep(
            Math.min(10_000 * attempt, 30_000)
          )
        }
      }

      if (lastError) {
        throw lastError
      }

      // Tandai sudah terkirim
      db.markSent(key)

      console.log(
        `[VOTING] ${event} berhasil dikirim dan ditandai sebagai sent`
      )
    } catch (error) {
      console.error(
        '[VOTING ERROR]',
        error?.stack || error?.message || error
      )
    }
  }, 30_000)
}

module.exports = {
  startVotingScheduler,
  sendPoll
}
