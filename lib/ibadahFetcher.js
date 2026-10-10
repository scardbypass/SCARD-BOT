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
  const dates = []
  for (let i = 0; i < lines.length; i++) if (dateRE.test(lines[i])) dates.push(i)

  let start = -1
  for (const dateIndex of dates) {
    const nearby = lines.slice(dateIndex + 1, dateIndex + 7)
    const relative = nearby.findIndex(line => sessionRE.test(line))
    if (relative >= 0) { start = dateIndex + relative + 2; break }
  }
  // Some site templates render "Tanggal" and "Ibadah" within a single element.
  if (start < 0) {
    const combined = new RegExp('Tanggal\\s+' + today.day + '\\s+' + today.month + '\\s+Ibadah\\s+' + NAMES[session], 'i')
    const i = lines.findIndex(line => combined.test(line))
    if (i >= 0) start = i + 1
  }
  if (start < 0) {
    throw new Error('Sesi ' + NAMES[session] + ' tanggal ' + today.day + ' ' + today.month +
      ' tidak ditemukan; periksa HTML sumber (jumlah baris: ' + lines.length + ')')
  }

  // Find the first actual devotion heading; skip tab labels, time labels and audio controls.
  const headingIndex = lines.findIndex((line, i) => i >= start && HEADINGS.has(line))
  if (headingIndex < 0 || headingIndex - start > 30) throw new Error('Bagian Pengantar Ibadah tidak terbaca')

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
