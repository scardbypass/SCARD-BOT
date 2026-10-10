const axios = require('axios')
const cheerio = require('cheerio')
const URL = 'https://ibadahharian.net/'
const NAMES = { pagi: 'Pagi', siang: 'Siang', malam: 'Malam' }
const HEADINGS = new Set(['Pengantar Ibadah','Waktu Teduh','Pujian kepada Tuhan','Bacaan Alkitab','Pengantar untuk Renungan','Pertanyaan untuk Direnungkan','Doa Menanggapi Bacaan Alkitab','Doa Syafaat','Leksionari untuk Hari Ini','Doa Bapa Kami','Pengakuan Iman Rasuli'])
function jakartaDate(date) {
  const p = new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'long',year:'numeric'}).formatToParts(date)
  const parts = Object.fromEntries(p.map(x=>[x.type,x.value]))
  return { day: Number(parts.day), month: parts.month, year: Number(parts.year) }
}
function extract(html, session, date = new Date()) {
  const $ = cheerio.load(html)
  $('script,style,noscript,nav,footer,header,svg').remove()
  const today = jakartaDate(date)
  const wanted = 'Ibadah ' + NAMES[session]
  // HTML may wrap the date and session headings in separate nested elements.
  // Flatten block elements into lines without assuming adjacent DOM nodes.
  const body = $('body').html() || ''
  const flattened = body
    .replace(/<br\\s*\\/?\\s*>/gi, '\\n')
    .replace(/<\\/?(?:p|div|h[1-6]|li|section|article|strong|span|time|label)[^>]*>/gi, '\\n')
  const lines = cheerio.load(flattened)('body').text()
    .split(/\\n+/).map(x => x.replace(/\\s+/g, ' ').trim()).filter(Boolean)
  const datePattern = new RegExp('^Tanggal\\\\s+' + today.day + '\\\\s+' + today.month + '$', 'i')
  const headingPattern = /^Ibadah (Pagi|Siang|Malam)$/i
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (!datePattern.test(lines[i])) continue
    const next = lines.slice(i + 1, i + 9).find(x => headingPattern.test(x))
    if (next && next.toLowerCase() === wanted.toLowerCase()) {
      start = i + 1 + lines.slice(i + 1, i + 9).indexOf(next) + 1
      break
    }
  }
  if (start < 0) throw new Error('Materi ' + wanted + ' tanggal ' + today.day + ' ' + today.month + ' tidak ditemukan')
  let end = lines.length
  for (let i = start; i < lines.length; i++) {
    if (headingPattern.test(lines[i]) || /^Materi Ibadah Harian\\b/i.test(lines[i]) || /^Music:/i.test(lines[i])) {
      end = i
      break
    }
  }
  const content = lines.slice(start, end)
    .filter(x => !/^(Composer:|©|Musik yang digunakan di audio IH|www\\.exultet-solutions\\.com)/i.test(x))
    .map(x => HEADINGS.has(x) ? '*' + x + '*' : x)
    .join('\\n\\n').trim()
  if (content.length < 200 || !content.includes('*Pengantar Ibadah*') || !content.includes('*Waktu Teduh*') || !content.includes('*Bacaan Alkitab*')) {
    throw new Error('Materi website tidak lengkap atau struktur halaman berubah')
  }
  return content
}
async function fetchDevotion(session,date=new Date()){
  if(!NAMES[session])throw new Error('Sesi tidak dikenal')
  const response=await axios.get(URL,{timeout:20000,headers:{'User-Agent':'Mozilla/5.0 SUPER-BOT-IbadahHarian','Accept':'text/html'}})
  return extract(response.data,session,date)
}
module.exports={fetchDevotion,extract}
