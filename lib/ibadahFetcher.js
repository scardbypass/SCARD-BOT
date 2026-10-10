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
  const dateRE = new RegExp('^Tanggal\\s+' + today.day + '\\s+' + today.month + '$', 'i')
  const sessionRE = new RegExp('^Ibadah\\s+' + NAMES[session] + '$', 'i')
  const headingRE = /^Ibadah\s+(Pagi|Siang|Malam)$/i
  // Verify the page's calendar date independently of the tab/session markup.
  const dateFound = lines.some(line => dateRE.test(line)) ||
    lines.some(line => new RegExp('Tanggal\\s+' + today.day + '\\s+' + today.month, 'i').test(line))
  if (!dateFound) throw new Error('Tanggal ' + today.day + ' ' + today.month + ' tidak tersedia pada halaman')

  // Tabs can separate the date and session into unrelated DOM nodes.
  // Anchor on the actual session heading followed by its first devotion section.
  const candidates = []
  for (let i = 0; i < lines.length; i++) {
    if (!sessionRE.test(lines[i])) continue
    const nextHeading = lines.findIndex((line, j) => j > i && j <= i + 25 && line === 'Pengantar Ibadah')
    if (nextHeading >= 0) candidates.push({ sessionIndex: i, headingIndex: nextHeading })
  }
  if (!candidates.length) {
    throw new Error('Bagian Ibadah ' + NAMES[session] + ' tidak terbaca (jumlah baris: ' + lines.length + ')')
  }
  const headingIndex = candidates[0].headingIndex
  let end = lines.length
  for (let i = headingIndex + 1; i < lines.length; i++) {
    if (/^Music\s*:|^Composer\s*:|^Materi Ibadah Harian\b/i.test(lines[i])) { end = i; break }
    if (/^Tanggal\s+\d{1,2}\s+\S+/i.test(lines[i]) && lines.slice(i + 1, i + 7).some(x => headingRE.test(x))) {
      end = i
      break
    }
  }
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
