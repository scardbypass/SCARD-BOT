'use strict'
const axios = require('axios')
const { getOrderKuotaBalance } = require('../lib/providers')

const PRICE_URL = process.env.OKECONNECT_PRICE_URL || 'https://okeconnect.com/harga/json?id=905ccd028329b0a'
const PAGE_SIZE = 8
let cache = { at: 0, products: [] }

function money(value) {
  const n = Number(String(value ?? '').replace(/[^\d]/g, ''))
  return Number.isFinite(n) ? 'Rp' + n.toLocaleString('id-ID') : '-'
}
function rowsFrom(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  for (const key of ['data', 'products', 'produk', 'result', 'list', 'items']) {
    if (data[key]) {
      const nested = rowsFrom(data[key])
      if (nested.length) return nested
    }
  }
  return Object.values(data).flatMap(value => rowsFrom(value))
}
function normalize(row) {
  if (!row || typeof row !== 'object') return null
  const code = String(row.kode ?? row.code ?? row.buyer_sku_code ?? row.sku ?? row.product_code ?? '').trim()
  const name = String(row.produk ?? row.nama ?? row.name ?? row.product_name ?? row.product ?? '').trim()
  const rawPrice = row.harga ?? row.price ?? row.selling_price ?? row.harga_jual
  const price = Number(String(rawPrice ?? '').replace(/[^\d]/g, ''))
  if (!code || !name || !Number.isFinite(price) || price <= 0) return null
  return { code, name, price, description: String(row.deskripsi ?? row.description ?? row.keterangan ?? row.detail ?? row.desc ?? '').trim(), category: String(row.kategori ?? row.category ?? row.jenis ?? row.type ?? 'Lainnya').trim(), status: String(row.status ?? row.seller_product_status ?? 'active') }
}
async function products(force = false) {
  if (!force && Date.now() - cache.at < 60000 && cache.products.length) return cache.products
  const response = await axios.get(PRICE_URL, { timeout: 12000, maxContentLength: 5 * 1024 * 1024 })
  const parsed = rowsFrom(response.data).map(normalize).filter(Boolean)
  if (!parsed.length) throw new Error('Format katalog belum dikenali. Periksa respons JSON OkeConnect.')
  cache = { at: Date.now(), products: parsed }
  return parsed
}
function categories(items) {
  return [...new Set(items.map(x => x.category))].sort((a, b) => a.localeCompare(b, 'id'))
}
const GROUPS = [
  { label: 'Pulsa', command: 'pulsa' },
  { label: 'Paket Internet', command: 'data' },
  { label: 'Token PLN', command: 'pln' },
  { label: 'E-Wallet', command: 'ewallet' },
  { label: 'Voucher Game', command: 'game' },
  { label: 'Layanan Lainnya', command: 'lainnya' }
]
function groupOf(item) {
  const cat = item.category.toLowerCase()
  const name = item.name.toLowerCase()
  const code = item.code.toLowerCase()
  // Prefer product identity. Provider categories can contain unrelated items.
  if (/flazz|brizzi|brizzi|tapcash|e.?toll|saldo tol|mandiri toll|mandiri tol/.test(name + ' ' + code)) return 'lainnya'
  if (/token pln|pln prabayar|token listrik|h2h pln|h2h token pln/.test(name) || /^(?:cpln|pln(?:z|p|b|f)?\d)/.test(code)) return 'pln'
  if (/dana|gopay|ovo|shopee\s?pay|shopee\s?pay|spay|link\s?aja|isaku/.test(name + ' ' + code)) return 'ewallet'
  if (/game|voucher game|mobile legends|free fire|pubg|valorant|steam|roblox/.test(name)) return 'game'
  if (/kuota|paket data|internet/.test(cat) || /kuota|paket data|internet/.test(name)) return 'data'
  if (/pulsa/.test(cat) && !/transfer/.test(cat)) return 'pulsa'
  if (/dompet digital|e.wallet|e-wallet/.test(cat)) return 'ewallet'
  if (/game|voucher game/.test(cat)) return 'game'
  return 'lainnya'
}
function operatorOf(item) {
  const s = (item.name + ' ' + item.category + ' ' + item.code).toLowerCase()
  if (/telkomsel|simpati|as \b|tsel|t.sel/.test(s)) return 'Telkomsel'
  if (/indosat|im3|mentari/.test(s)) return 'Indosat'
  if (/smartfren/.test(s)) return 'Smartfren'
  if (/axis/.test(s)) return 'AXIS'
  if (/tri\b|three|3 indonesia/.test(s)) return 'Tri'
  if (/xl\b|xl axiata/.test(s)) return 'XL'
  if (/byu|by.u/.test(s)) return 'by.U'
  return 'Operator Lain'
}
function walletOf(item) {
  const s = (item.name + ' ' + item.code).toLowerCase()
  const patterns = [
    ['DANA', /\bdana\b/],
    ['OVO', /\bovo\b/],
    ['GoPay', /gopay|go.pay/],
    ['ShopeePay', /shopee\s?pay|shopee.pay|\bspay\b/],
    ['LinkAja', /link\s?aja/],
    ['iSaku', /isaku/]
  ]
  for (const [label, re] of patterns) if (re.test(s)) return label
  return 'Lainnya'
}
const PULSA_SHORTCUTS = {
  tri: 'Tri', three: 'Tri',
  xl: 'XL', telkomsel: 'Telkomsel', tsel: 'Telkomsel',
  indosat: 'Indosat', im3: 'Indosat',
  axis: 'AXIS', smartfren: 'Smartfren',
  byu: 'by.U'
}
function pulsaProducts(items, label) {
  return items.filter(x => groupOf(x) === 'pulsa' && operatorOf(x) === label)
}
const WALLET_SHORTCUTS = {
  dana: 'DANA',
  ovo: 'OVO',
  gopay: 'GoPay',
  shopee: 'ShopeePay',
  shopeepay: 'ShopeePay',
  spay: 'ShopeePay',
  linkaja: 'LinkAja',
  isaku: 'iSaku'
}
function walletProducts(items, label) {
  return items.filter(x => groupOf(x) === 'ewallet' && walletOf(x) === label)
}
function displayList(title, items, page = 1, command = '') {
 if(!items.length) return 'Belum ada produk di katalog untuk pilihan ini.'
 const visible=items.filter(x=>!(/^(?:CEK|LIST|BYR|REV|PKTCEK|PKTLIST|PKTBYR)/i.test(x.code)&&x.price<=1000))
 const sorted=[...visible].sort((a,b)=>a.price-b.price||a.code.localeCompare(b.code))
 if(!sorted.length) return 'Belum ada produk transaksi pada kategori ini.'
 const pageSize=8, totalPages=Math.ceil(sorted.length/pageSize)
 if(!Number.isInteger(page)||page<1||page>totalPages) return '❌ Halaman tidak tersedia. Pilih 1 sampai '+totalPages
 const selected=sorted.slice((page-1)*pageSize,page*pageSize)
 const detail=(x,i)=>{
   const name=x.name.replace(/\s+/g,' ').trim()
   const description=x.description.replace(/\s+/g,' ').trim()
   const source=name+' '+description
   const quota=source.match(/\b\d+(?:[.,]\d+)?\s*(?:GB|MB|TB)\b/i)?.[0]||''
   const validity=source.match(/\b\d+\s*(?:hari|hr|day|days)\b/i)?.[0]||''
   const dataProduct=/data|kuota|internet|paket|happy|aon/i.test(source)
   const lines=[
     '*'+String((page-1)*pageSize+i+1).padStart(2,'0')+'  '+name+'*',
     '🏷️ '+x.code+'  •  *'+money(x.price)+'*'
   ]
   if(dataProduct && quota) lines.push('📦 Kuota: *'+quota.toUpperCase()+'*')
   if(dataProduct && !quota) lines.push('📦 Kuota: _tidak tercantum di katalog_')
   if(validity) lines.push('◷ Aktif: '+validity)
   if(description && description.toLowerCase()!==name.toLowerCase()) lines.push('ℹ️ '+description.slice(0,180))
   return lines.join('\n')
 }
 const next=command&&page<totalPages?'➡️ '+command+' '+(page+1):''
 const prev=command&&page>1?'⬅️ '+command+' '+(page-1):''
 return [
   '✦ *SCARD DIGITAL*',
   '📡 *'+title.toUpperCase()+'*',
   '━━━━━━━━━━━━━━━━━━━━',
   '',
   ...selected.flatMap((x,i)=>[detail(x,i),...(i<selected.length-1?['','──────────────','']:[])]),
   '',
   '━━━━━━━━━━━━━━━━━━━━',
   '📄 *'+String(page).padStart(2,'0')+' / '+String(totalPages).padStart(2,'0')+'*  •  '+sorted.length+' produk',
   ...(prev?[prev]:[]),
   ...(next?[next]:[]),
   '',
   '↩ *ORDER VIA REPLY*',
   selected[0].code+' 081234567890',
   '',
   '_SCARD • OKECONNECT_'
 ].join('\n')
}
function chooseGroup(items, group, args, commandText) {
  const matched = items.filter(x => groupOf(x) === group)
  if (!matched.length) return 'Produk belum tersedia pada katalog.'
  if (group === 'pulsa' || group === 'data' || group === 'ewallet') {
    const getLabel = group === 'ewallet' ? walletOf : operatorOf
    const labels = [...new Set(matched.map(getLabel))].sort((a, b) => a.localeCompare(b, 'id'))
    if (!args.length) return [
      '✦ *SCARD • ' + (group === 'data' ? 'PAKET INTERNET' : group === 'ewallet' ? 'E-WALLET' : 'PULSA') + '*',
      '━━━━━━━━━━━━━━━━',
      ...labels.map((label, i) => String(i + 1).padStart(2, '0') + '  ' + label),
      '',
      'Pilih: ' + commandText + ' 01'
    ].join('\n')
    const index = Number(args[0])
    const selected = Number.isInteger(index) && index > 0 ? labels[index - 1] : labels.find(x => x.toLowerCase() === String(args[0]).toLowerCase())
    if (!selected) return 'Pilihan tidak ditemukan. Ketik ' + commandText
    const subset = matched.filter(x => getLabel(x) === selected)
    const page = args[1] === undefined ? 1 : Number(args[1])
    return displayList(selected, subset, page, commandText+' '+String(index>0?index:labels.indexOf(selected)+1).padStart(2,'0'))
  }
  return displayList(group === 'pln' ? 'TOKEN PLN' : group === 'game' ? 'VOUCHER GAME' : 'LAINNYA', matched, args[0]===undefined?1:Number(args[0]), commandText)
}
module.exports = {
  commands: ['ppob', 'pulsa', 'pln', 'ewallet', 'data', 'game', 'saldoppob', 'ppobstatus', ...Object.keys(WALLET_SHORTCUTS), ...Object.keys(PULSA_SHORTCUTS), ...Array.from({length: 99}, (_, i) => 'pulsa' + (i + 1)), ...Array.from({length: 99}, (_, i) => 'pulsa' + String(i + 1).padStart(2, '0'))],
  ownerOnly: true,
  registered: false,
  menu: 'ppob',
  async run({ command, args, reply }) {
    if (command === 'ppobstatus') return reply(await require('../lib/ppobReply').statusCommand(args[0]))
    if (command === 'saldoppob') {
      const result = await getOrderKuotaBalance()
      return reply('✦ *SCARD • SALDO PPOB*\n━━━━━━━━━━━━━━━━\n' + (result == null ? 'Saldo belum tersedia' : money(result.balance ?? result)))
    }
    const items = await products()
    if (Object.hasOwn(PULSA_SHORTCUTS, command)) {
      const label = PULSA_SHORTCUTS[command]
      return reply(displayList(label, pulsaProducts(items, label), args[0]===undefined?1:Number(args[0]), '/'+command))
    }
    if (Object.hasOwn(WALLET_SHORTCUTS, command)) {
      const label = WALLET_SHORTCUTS[command]
      return reply(displayList(label, walletProducts(items, label), args[0]===undefined?1:Number(args[0]), '/'+command))
    }
    if (/^pulsa\d+$/.test(command)) return reply(chooseGroup(items, 'pulsa', [String(Number(command.slice(5)))], '/pulsa'))
    if (command !== 'ppob') return reply(chooseGroup(items, command, args, '/' + command))
    if (!args.length) {
      let balanceText = 'Tidak tersedia'
      try {
        const account = await getOrderKuotaBalance()
        const balance = account?.balance
        if (balance !== undefined && balance !== null && Number.isFinite(Number(balance))) {
          balanceText = money(balance)
        }
      } catch (err) {
        console.error('[PPOB] Gagal mengambil saldo:', err.message)
      }
      return reply([
        '✦ *SCARD • DIGITAL CENTER*',
        '━━━━━━━━━━━━━━━━',
        '💰 *Saldo OkeConnect:* ' + balanceText,
        '━━━━━━━━━━━━━━━━',
        ...GROUPS.map((g, i) => String(i + 1).padStart(2, '0') + '  ' + g.label),
        '',
        'Ketik /pulsa, /pln, /ewallet',
        'atau pilih /ppob 01'
      ].join('\n'))
    }
    const index = Number(args[0])
    const group = Number.isInteger(index) && index > 0 ? GROUPS[index - 1]?.command : GROUPS.find(g => g.command === String(args[0]).toLowerCase())?.command
    if (!group) return reply('Pilihan tidak ditemukan. Ketik /ppob')
    if (group === 'lainnya' && args.length === 1) {
      const cats = categories(items.filter(x => groupOf(x) === 'lainnya'))
      return reply(['✦ *SCARD • LAINNYA*', '━━━━━━━━━━━━━━━━', ...cats.map((x, i) => String(i + 1).padStart(2, '0') + '  ' + x), '', 'Pilih: /ppob lainnya 01'].join('\n'))
    }
    if (group === 'lainnya') {
      const other = items.filter(x => groupOf(x) === 'lainnya')
      const cats = categories(other)
      const n = Number(args[1])
      const category = Number.isInteger(n) && n > 0 ? cats[n - 1] : cats.find(x => x.toLowerCase() === String(args[1] || '').toLowerCase())
      if (!category) return reply('Kategori tidak ditemukan. Ketik /ppob lainnya')
      return reply(displayList(category, other.filter(x => x.category === category), args[2]===undefined?1:Number(args[2]), '/ppob lainnya '+String(n)))
    }
    return reply(chooseGroup(items, group, args.slice(1), '/' + group))
  }
}
