const axios = require('axios')
const cheerio = require('cheerio')

const SOURCE = 'https://ibadahharian.net/'
const NAMES = { pagi: 'Pagi', siang: 'Siang', malam: 'Malam' }
const HEADINGS = new Set([
  'Pengantar Ibadah', 'Waktu Teduh', 'Pujian kepada Tuhan',
  'Bacaan Alkitab', 'Pengantar untuk Renungan',
  'Pertanyaan untuk Direnungkan', 'Doa Menanggapi Bacaan Alkitab',
  'Doa Syafaat', 'Leksionari untuk Hari Ini', 'Doa Bapa Kami',
  'Pengakuan Iman Rasuli'
])

function jakartaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric'
  }).formatToParts(date)
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]))
  return { day: Number(p.day), month: p.month, year: Number(p.year) }
}

function extract(html, session, date = new Date()) {
  if (!Object.hasOwn(NAMES, session)) throw new Error('Sesi tidak dikenal')
  const $ = cheerio.load(html)
  $('script,style,noscript,svg,nav,footer').remove()
  $('br').replaceWith('\n')
  $('p,h1,h2,h3,h4,h5,h6,li,section,article,div').each((_, element) => {
    $(element).append('\n')
  })
  const lines = ($('body').text() || '').split(/\n+/)
    .map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean)

  const today = jakartaDate(date)
  const flat = ($('body').text() || '').replace(/\s+/g, ' ').trim()
  const startRE = new RegExp('Tanggal\\s+' + today.day + '\\s+' + today.month +
    '\\s+Ibadah\\s+' + NAMES[session] + '\\s+Pukul\\s+', 'ig')
  const expectedTimes = {
    pagi: /^05[:.]00\s*[-–]\s*08[:.]00/,
    siang: /^12[:.]00\s*[-–]\s*14[:.]00/,
    malam: /^18[:.]00\s*[-–]\s*22[:.]00/
  }
  let start = -1
  for (const match of flat.matchAll(startRE)) {
    if (expectedTimes[session].test(flat.slice(match.index + match[0].length))) {
      start = match.index + match[0].length
      break
    }
  }
  if (start < 0) throw new Error('Blok ' + session + ' tanggal ' + today.day + ' ' + today.month + ' tidak ditemukan')
  const heading = flat.indexOf('Pengantar Ibadah', start)
  if (heading < 0 || heading - start > 100) throw new Error('Pengantar Ibadah tidak ditemukan pada sesi ' + session)
  const boundaryRE = /Tanggal\s+\d{1,2}\s+[A-Za-z]+\s+Ibadah\s+(?:Pagi|Siang|Malam)\s+Pukul\s+/gi
  boundaryRE.lastIndex = heading + 'Pengantar Ibadah'.length
  const boundary = boundaryRE.exec(flat)
  let content = flat.slice(heading, boundary ? boundary.index : undefined)
  content = content.replace(/Musik yang digunakan di audio IH[\s\S]*$/i, '')
  content = content.replace(/(?:Music|Composer)\s*:[^\n]*?(?=Pengantar Ibadah|Waktu Teduh|Pujian kepada Tuhan|Bacaan Alkitab|$)/gi, '')
  for (const label of HEADINGS) {
    const i = content.indexOf(label)
    if (i >= 0) content = content.slice(0, i) + content.slice(i).replace(label, '\n\n*' + label + '*\n')
  }
  content = content.replace(/\n{3,}/g, '\n\n').trim()
  if (content.length < 200 || !content.includes('*Pengantar Ibadah*') ||
      !content.includes('*Waktu Teduh*') || !content.includes('*Bacaan Alkitab*')) {
    throw new Error('Materi ' + session + ' tidak lengkap; pengiriman dibatalkan')
  }
  return content
}

async function fetchDevotion(session, date = new Date()) {
  const response = await axios.get(SOURCE, {
    timeout: 20000,
    responseType: 'text',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SUPER-BOT/1.0)', Accept: 'text/html' }
  })
  if (typeof response.data !== 'string' || !response.data.includes('Ibadah')) {
    throw new Error('Website tidak mengembalikan HTML materi ibadah')
  }
  return extract(response.data, session, date)
}

function audioCandidates(html, session, date = new Date()) {
  const $ = cheerio.load(html)
  const today = jakartaDate(date)
  const number = { pagi: 1, siang: 2, malam: 3 }[session]
  if (!number) throw new Error('Sesi tidak dikenal')
  // Gunakan formatParts agar bulan selalu mengikuti zona waktu Jakarta.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta', month: '2-digit', day: '2-digit', year: 'numeric'
  }).formatToParts(date)
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]))
  const stamp = p.year + p.month + p.day
  const found = []
  $('audio source, audio[src], source[src], a[href]').each((_, el) => {
    const raw = $(el).attr('src') || $(el).attr('href')
    if (!raw) return
    try {
      const url = new URL(raw, SOURCE)
      if (url.protocol !== 'https:' || url.hostname !== 'ibadahharian.net') return
      const match = url.pathname.match(/\/IH(\d{8})-([123])\.mp3$/i)
      if (match && match[1].slice(4) === stamp.slice(4) && Number(match[2]) === number) found.push(url.href)
    } catch {}
  })
  return [...new Set(found)]
}
async function fetchAudio(session, date = new Date()) {
  const response = await axios.get(SOURCE, { timeout: 20000, responseType: 'text' })
  const urls = audioCandidates(response.data, session, date)
  if (urls.length !== 1) return null // Tidak menebak jika tidak ada atau ada beberapa kandidat.
  const responseAudio = await axios.get(urls[0], {
    responseType: 'arraybuffer', timeout: 60000, maxContentLength: 25 * 1024 * 1024,
    headers: { Referer: SOURCE }
  })
  if (!/^audio\//i.test(String(responseAudio.headers['content-type'] || ''))) return null
  const buffer = Buffer.from(responseAudio.data)
  if (!buffer.length || buffer.length > 25 * 1024 * 1024) return null
  const audioYear = Number((urls[0].match(/IH(\d{4})\d{4}-/) || [])[1])
  return { buffer, url: urls[0], audioYear }
}

module.exports = { fetchDevotion, fetchAudio, audioCandidates, extract, jakartaDate }
