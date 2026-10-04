const db = require('./database')
const { checkWebsite } = require('./webStatus')

let timer = null
let running = false
let socketGetter = null

async function sendAlert(item, status, result) {
  const sock = socketGetter?.()

  if (!sock?.user) {
    throw new Error('Socket WhatsApp belum siap')
  }

  const icon = status === 'up' ? '🟢' : '🔴'
  const title = status === 'up'
    ? 'WEBSITE KEMBALI ONLINE'
    : 'WEBSITE DOWN'

  await sock.sendMessage(item.chatId, {
    text:
      `${icon} *${title}*\n\n` +
      `🌐 ${item.domain}\n` +
      `📡 Status: ${status.toUpperCase()}\n` +
      `🌍 HTTP: ${result.status || '-'}\n` +
      `⚡ Response: ${result.responseMs} ms\n` +
      `🕒 ${new Date().toLocaleString('id-ID', {
        timeZone: process.env.TIMEZONE || 'Asia/Jakarta'
      })}`
  })
}

async function tick() {
  if (running) return
  running = true

  try {
    const list = db.getSetting('websiteMonitors', [])
    let changed = false

    for (const item of list) {
      try {
        const result = await checkWebsite(item.domain)
        const currentStatus = result.up ? 'up' : 'down'
        const previousStatus = item.lastStatus

        item.lastHttp = result.status || 0
        item.lastCheckedAt = new Date().toISOString()

        if (previousStatus && previousStatus !== currentStatus) {
          try {
            await sendAlert(item, currentStatus, result)
            item.changedAt = new Date().toISOString()
          } catch (error) {
            // Jangan kehilangan alert hanya karena WhatsApp sedang reconnect.
            console.error(
              '[MONITOR ALERT]',
              item.domain,
              error.message
            )

            // Status lama dipertahankan agar perubahan dicoba lagi
            // pada tick berikutnya setelah socket kembali online.
            changed = true
            continue
          }
        }

        item.lastStatus = currentStatus
        changed = true
      } catch (error) {
        console.error('[MONITOR]', item.domain, error.message)
      }
    }

    if (changed) {
      db.setSetting('websiteMonitors', list)
    }
  } finally {
    running = false
  }
}

function startWebsiteMonitor(sockOrGetter) {
  socketGetter = typeof sockOrGetter === 'function'
    ? sockOrGetter
    : () => sockOrGetter

  if (timer) {
    console.log('[MONITOR] socket diperbarui setelah reconnect')
    return
  }

  const minutes = Math.max(
    1,
    Number(process.env.MONITOR_INTERVAL_MINUTES || 30)
  )

  console.log(
    `🌐 Website monitor aktif setiap ${minutes} menit.`
  )

  setTimeout(tick, 10_000)
  timer = setInterval(tick, minutes * 60 * 1000)
}

module.exports = { startWebsiteMonitor }
