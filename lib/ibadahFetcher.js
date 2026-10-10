const axios = require('axios')
const cheerio = require('cheerio')
const URL = 'https://ibadahharian.net/'
const NAMES = { pagi: 'Pagi', siang: 'Siang', malam: 'Malam' }
const HEADINGS = new Set(['Pengantar Ibadah','Waktu Teduh','Pujian kepada Tuhan','Bacaan Alkitab','Pengantar untuk Renungan','Pertanyaan untuk Direnungkan','Doa Menanggapi Bacaan Alkitab','Doa Syafaat','Leksionari untuk Hari Ini','Doa Bapa Kami','Pengakuan Iman Rasuli'])

function jakartaDate(date) {
  const parts = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(date)
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]))
  return { day: Number(p.day), month: p.month, year: Number(p.year) }
}
function extract(html, session, date = new Date()) {
  if (!NAMES[session]) throw new Error('Sesi tidak dikenal')
  const $ = cheerio.load(html)
  $('script,style,noscript,nav,footer,header,svg').remove()
  // Preserve paragraph boundaries even when headings are wrapped in nested tags.
  $('br').replaceWith('\n')
  $('p,div,section,article,h1,h2,h3,h4,h5,h6,li').each((_, el) => { $(el).append('\n') })
  const lines = ($('body').text() || '').split(/\n+/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const today = jakartaDate(date)
  const expectedDate = new RegExp('Tanggal\\s*' + today.day + '\\s+' + today.month, 'i')
  const expectedSession = new RegExp('\\bIbadah\\s+' + NAMES[session] + '\\b', 'i')
  const firstHeading = lines.findIndex(x => /^Pengantar Ibadah$/i.test(x))
  const candidates = []
  for (let i = 0; i < lines.length; i++) {
    if (!expectedSession.test(lines[i])) continue
    // Verify the date in nearby preceding text; tolerate DOM nesting and extra labels.
    const context = lines.slice(Math.max(0, i - 12), i + 1).join(' ')
    if (expectedDate.test(context)) candidates.push(i)
  }
  if (!candidates.length) throw new Error('Materi Ibadah ' + NAMES[session] + ' untuk ' + today.day + ' ' + today.month + ' tidak ditemukan (format tanggal/sesi berbeda)')
  let start = candidates.find(i => lines.slice(i + 1, i + 18).some(x => /^Pengantar Ibadah$/i.test(x)))
  if (start === undefined) start = candidates[candidates.length - 1]
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^Music\s*:/i.test(lines[i]) || /^Materi Ibadah Harian\b/i.test(lines[i])) { end = i; break }
    if (/^Ibadah (Pagi|Siang|Malam)$/i.test(lines[i]) && lines.slice(Math.max(start + 1, i - 10), i).some(x => /^Tanggal\s+\d+/i.test(x))) { end = i - 1; break }
  }
  const content = lines.slice(start + 1, end)
    .filter(x => !/^(Music:|Composer:|©|Musik yang digunakan di audio IH|www\.exultet-solutions\.com)/i.test(x))
    .map(x => HEADINGS.has(x) ? '*' + x + '*' : x)
    .join('\n\n').trim()
  if (content.length < 200 || !content.includes('*Pengantar Ibadah*') || !content.includes('*Bacaan Alkitab*')) {
    throw new Error('Materi tidak lengkap; periksa struktur halaman sebelum mengirim')
  }
  return content
}
async function fetchDevotion(session, date = new Date()) {
  const response = await axios.get(URL, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' } })
  return extract(response.data, session, date)
}
module.exports = { fetchDevotion, extract }
