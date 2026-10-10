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
  const sessionName = NAMES[session]
  const sessionHeading = new RegExp('^Ibadah\\s+' + sessionName + '$', 'i')
  const dateHeading = new RegExp('^Tanggal\\s+' + today.day + '\\s+' + today.month + '(?:\\s|$)', 'i')
  const allSessionHeading = /^Ibadah\s+(Pagi|Siang|Malam)$/i

  // The site has a tab navigation at the top, followed by complete dated
  // sessions. Never mistake a tab label for the start of actual content.
  const starts = []
  for (let i = 0; i < lines.length; i++) {
    if (!sessionHeading.test(lines[i])) continue
    const previous = lines.slice(Math.max(0, i - 4), i).join(' ')
    const following = lines.slice(i + 1, i + 8).join(' ')
    const hasDate = dateHeading.test(previous) ||
      new RegExp('Tanggal\\s+' + today.day + '\\s+' + today.month, 'i').test(previous)
    const hasTime = /Pukul\s*\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}/i.test(following)
    if (hasDate && hasTime) starts.push(i)
  }
  if (!starts.length) {
    throw new Error('Sesi ' + sessionName + ' tanggal ' + today.day + ' ' + today.month +
      ' tidak ditemukan pada blok konten (jumlah baris: ' + lines.length + ')')
  }
  const sessionStart = starts[starts.length - 1]
  let end = lines.length
  for (let i = sessionStart + 1; i < lines.length; i++) {
    if (/^Tanggal\s+\d{1,2}\s+\S+/i.test(lines[i]) &&
        lines.slice(i + 1, i + 5).some(x => allSessionHeading.test(x))) {
      end = i
      break
    }
  }
  const headingIndex = lines.findIndex((line, i) =>
    i > sessionStart && i < end && /^Pengantar Ibadah$/i.test(line))
  if (headingIndex < 0) throw new Error('Pengantar Ibadah tidak ditemukan pada sesi ' + sessionName)
  const selected = lines.slice(headingIndex, end)
    .filter(line => !/^(Music:|Composer:|©|Musik yang digunakan di audio IH|www\.exultet-solutions\.com)/i.test(line))
  const content = selected.map(line => HEADINGS.has(line) ? '*' + line + '*' : line).join('\n\n').trim()
  if (content.length < 200 || !content.includes('*Pengantar Ibadah*') ||
      !content.includes('*Bacaan Alkitab*') || !content.includes('*Waktu Teduh*')) {
    throw new Error('Materi tidak lengkap; pengiriman dibatalkan')
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
module.exports = { fetchDevotion, extract, jakartaDate }
