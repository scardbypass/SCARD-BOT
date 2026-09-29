const { execFile } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { getQuotedText } = require('../lib/utils')

function execFileAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout
        error.stderr = stderr
        return reject(error)
      }
      resolve({ stdout, stderr })
    })
  })
}

function getUrl(text = '') {
  const match = String(text).match(/https?:\/\/[^\s]+/i)
  if (!match) return null
  try {
    const url = new URL(match[0])
    const host = url.hostname.toLowerCase()
    const allowed = [
      'tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com',
      'instagram.com', 'www.instagram.com',
      'facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.watch',
      'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'
    ]
    if (!allowed.some(domain => host === domain || host.endsWith('.' + domain))) return null
    return url.toString()
  } catch {
    return null
  }
}

async function resolveYtDlp() {
  const configured=String(process.env.YTDLP_PATH||'').trim()
  const candidates=[configured,'/usr/local/bin/yt-dlp','/usr/bin/yt-dlp','/root/.local/bin/yt-dlp'].filter(Boolean)
  for(const command of candidates){
    try{await execFileAsync(command,['--version'],{timeout:5000});return {command,prefix:[]}}catch{}
  }
  for(const py of ['python3','python']){
    try{await execFileAsync(py,['-m','yt_dlp','--version'],{timeout:5000});return {command:py,prefix:['-m','yt_dlp']}}catch{}
  }
  throw new Error('YTDLP_NOT_INSTALLED')
}

async function hasFfmpeg() {
  try {
    await execFileAsync('ffmpeg', ['-version'], { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

async function normalizeForWhatsApp(input, output) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', input,
    '-map', '0:v:0',
    '-map', '0:a:0?',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'main',
    '-level', '4.1',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-ac', '2',
    '-movflags', '+faststart',
    output
  ], { timeout: Number(process.env.DOWNLOAD_TRANSCODE_TIMEOUT_MS || 300000) })
}

async function findDownloadedFile(dir, id) {
  const files = await fs.promises.readdir(dir)
  const file = files.find(name =>
    name.startsWith(id + '.') &&
    !name.endsWith('.part') &&
    !name.endsWith('.ytdl')
  )
  return file ? path.join(dir, file) : null
}

module.exports = {
  commands: ['download', 'dl'],
  registered: false,
  menuSection: 'PUBLIC',
  menu: '/download (reply link TikTok/IG/FB/YouTube)',

  async run({ sock, msg, reply }) {
    const quotedText = getQuotedText(msg)

    if (!quotedText) {
      return reply(
        '❌ Reply pesan yang berisi link TikTok, Instagram, Facebook, atau YouTube.\n\n' +
        '1. Kirim link video\n' +
        '2. Reply pesan link tersebut\n' +
        '3. Ketik /download'
      )
    }

    const url = getUrl(quotedText)
    if (!url) {
      return reply('❌ Link tidak ditemukan atau belum didukung.\n\nSupport: TikTok • Instagram • Facebook • YouTube')
    }

    const tempDir = path.join(os.tmpdir(), 'scard-bot-downloads')
    await fs.promises.mkdir(tempDir, { recursive: true })

    const id = crypto.randomBytes(8).toString('hex')
    const output = path.join(tempDir, id + '.%(ext)s')

    try {
      await sock.sendPresenceUpdate('composing', msg.key.remoteJid).catch(() => {})
      await reply('⏳ Sedang mendownload video...')

      const ytdlp=await resolveYtDlp()
      console.log('[DOWNLOAD] yt-dlp via',ytdlp.command,ytdlp.prefix.join(' '))
      await execFileAsync(
        ytdlp.command,
        [
          ...ytdlp.prefix,
          '--no-playlist',
          '--impersonate', process.env.YTDLP_IMPERSONATE || 'chrome',
          '--user-agent', process.env.YTDLP_USER_AGENT || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
          '--max-filesize', process.env.DOWNLOAD_MAX_SIZE || '150M',
          '-f', 'bv*[vcodec^=avc1][height<=1440]+ba[acodec^=mp4a]/b[vcodec^=avc1][height<=1440]/bv*[height<=1080]+ba/b[height<=1080]/bv*[height<=720]+ba/b[height<=720]/b',
          '--merge-output-format', 'mp4',
          '-o', output,
          url
        ],
        { timeout: Number(process.env.DOWNLOAD_TIMEOUT_MS || 180000) }
      )

      const downloadedFile = await findDownloadedFile(tempDir, id)
      if (!downloadedFile) throw new Error('File hasil download tidak ditemukan')

      const stat = await fs.promises.stat(downloadedFile)
      const maxBytes = Number(process.env.DOWNLOAD_MAX_BYTES || 150 * 1024 * 1024)

      if (stat.size > maxBytes) {
        return reply('❌ Video terlalu besar untuk dikirim melalui bot.')
      }

      let sendFile = downloadedFile
      if (await hasFfmpeg()) {
        const normalized = path.join(tempDir, id + '.whatsapp.mp4')
        try {
          console.log('[DOWNLOAD] normalizing video for WhatsApp compatibility')
          await normalizeForWhatsApp(downloadedFile, normalized)
          sendFile = normalized
        } catch (e) {
          console.error('[DOWNLOAD TRANSCODE]', e.stderr || e.message)
          throw new Error('VIDEO_TRANSCODE_FAILED')
        }
      } else {
        console.warn('[DOWNLOAD] ffmpeg tidak tersedia; mengirim file tanpa normalisasi codec')
      }

      const sendStat = await fs.promises.stat(sendFile)
      if (sendStat.size > maxBytes) {
        return reply('❌ Video hasil konversi terlalu besar untuk dikirim melalui bot.')
      }

      const buffer = await fs.promises.readFile(sendFile)

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          video: buffer,
          mimetype: 'video/mp4',
          fileName: 'SUPER-BOT.mp4',
          caption: '✅ *SUPER-BOT Downloader*'
        },
        { quoted: msg }
      )
    } catch (error) {
      console.error('[DOWNLOAD ERROR]', error.stderr || error.message)

      const err = String(error.stderr || error.message || '').toLowerCase()
      let message = '❌ Video gagal didownload.'

      if (err.includes('ytdlp_not_installed') || err.includes('enoent')) {
        message = '❌ Downloader belum tersedia di VPS. Install yt-dlp lalu coba lagi.'
      } else if (err.includes('no impersonate target') || err.includes('impersonation')) {
        message = '❌ TikTok membutuhkan dependency impersonation di VPS.'
      } else if (err.includes('video_transcode_failed')) {
        message = '❌ Video berhasil didownload, tetapi gagal dikonversi ke format WhatsApp. Pastikan ffmpeg terinstall di VPS.'
      } else if (err.includes('private') || err.includes('login')) {
        message += '\n\nVideo mungkin private atau membutuhkan login.'
      } else if (err.includes('copyright') || err.includes('unavailable')) {
        message += '\n\nVideo mungkin sudah tidak tersedia.'
      } else if (err.includes('filesize') || err.includes('larger than')) {
        message += '\n\nUkuran video terlalu besar.'
      }

      return reply(message)
    } finally {
      await sock.sendPresenceUpdate('paused', msg.key.remoteJid).catch(() => {})
      try {
        const files = await fs.promises.readdir(tempDir)
        for (const file of files) {
          if (file.startsWith(id + '.')) {
            await fs.promises.unlink(path.join(tempDir, file)).catch(() => {})
          }
        }
      } catch {}
    }
  }
}
