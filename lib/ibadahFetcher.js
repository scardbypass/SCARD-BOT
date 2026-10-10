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
function extract(html,session,date=new Date()) {
  const $=cheerio.load(html)
  $('script,style,noscript,nav,footer,header').remove()
  const text=$('body').html() || ''
  const lines=cheerio.load(text.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(?:p|div|h[1-6]|li|section|article)>/gi,'\n'))('body').text()
    .split(/\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean)
  const today=jakartaDate(date)
  const dateLabel='Tanggal '+today.day+' '+today.month
  const heading='Ibadah '+NAMES[session]
  const starts=[]
  for(let i=0;i<lines.length-1;i++){
    if(lines[i].toLowerCase()===dateLabel.toLowerCase() && lines[i+1]===heading)starts.push(i)
  }
  if(!starts.length)throw new Error('Materi '+heading+' untuk '+dateLabel+' tidak ditemukan di website')
  const start=starts[0]+2
  let end=lines.length
  for(let i=start;i<lines.length-1;i++){
    if(/^Tanggal \d{1,2} \S+/i.test(lines[i])&&/^Ibadah (Pagi|Siang|Malam)$/.test(lines[i+1])){end=i;break}
  }
  const selected=[]
  for(const line of lines.slice(start,end)){
    if(/^Music:|^Composer:|^©|^Musik yang digunakan di audio IH|^www\.exultet-solutions\.com/i.test(line))continue
    if(/^Materi Ibadah Harian|^Apakah Ibadah Harian\?/i.test(line))break
    selected.push(HEADINGS.has(line)?'*'+line+'*':line)
  }
  const output=selected.join('\n\n').trim()
  if(output.length<250||!output.includes('*Pengantar Ibadah*')||!output.includes('*Waktu Teduh*'))throw new Error('Konten website tidak lengkap; pengiriman dibatalkan')
  return output
}
async function fetchDevotion(session,date=new Date()){
  if(!NAMES[session])throw new Error('Sesi tidak dikenal')
  const response=await axios.get(URL,{timeout:20000,headers:{'User-Agent':'Mozilla/5.0 SUPER-BOT-IbadahHarian','Accept':'text/html'}})
  return extract(response.data,session,date)
}
module.exports={fetchDevotion,extract}
