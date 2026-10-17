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
      const globalMinutes = Number(db.getSetting('websiteMonitorIntervalMinutes', Number(process.env.MONITOR_INTERVAL_MINUTES || 30)))
      const minutes = Math.max(1, Math.min(1440, Number(item.intervalMinutes || globalMinutes) || 30))
      const last = Date.parse(item.lastCheckedAt || '')
      if (Number.isFinite(last) && Date.now() - last < minutes * 60000) continue
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

  console.log('🌐 Website monitor scheduler aktif (evaluasi tiap 30 detik; interval tiap domain tersimpan di database).')
  setTimeout(tick, 10_000)
  timer = setInterval(tick, 30 * 1000)
}

module.exports = { startWebsiteMonitor }
