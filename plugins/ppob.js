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
  return { code, name, price, category: String(row.kategori ?? row.category ?? row.jenis ?? row.type ?? 'Lainnya').trim(), status: String(row.status ?? row.seller_product_status ?? 'active') }
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
  if (/token pln|pln prabayar|token listrik/.test(cat)) return 'pln'
  if (/kuota|paket data|internet/.test(cat)) return 'data'
  if (/pulsa/.test(cat) && !/transfer/.test(cat)) return 'pulsa'
  if (/dompet digital|e.wallet|e-wallet/.test(cat)) return 'ewallet'
  if (/game|voucher game/.test(cat + ' ' + name)) return 'game'
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
  for (const label of ['DANA', 'OVO', 'GoPay', 'ShopeePay', 'LinkAja', 'iSaku']) {
    if (s.includes(label.toLowerCase())) return label
  }
  return 'Lainnya'
}
function displayList(title, items, page, commandText) {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  if (page > pages) return 'Halaman tidak ditemukan.'
  const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  if (!slice.length) return 'Belum ada produk di katalog untuk pilihan ini.'
  const lines = slice.flatMap(x => [x.code + '  •  ' + money(x.price), x.name, ''])
  return [
    '✦ *SCARD • ' + title.toUpperCase() + '*',
    '━━━━━━━━━━━━━━━━',
    ...lines,
    'Halaman ' + page + '/' + pages,
    'Format order: KODE NOMOR_TUJUAN',
    'Contoh: ' + slice[0].code + ' 081234567890',
    ...(page < pages ? ['Lanjut: ' + commandText + ' ' + (page + 1)] : [])
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
    return displayList(selected, subset, Math.max(1, Number(args[1]) || 1), commandText + ' ' + args[0])
  }
  return displayList(group === 'pln' ? 'TOKEN PLN' : group === 'game' ? 'VOUCHER GAME' : 'LAINNYA', matched, Math.max(1, Number(args[0]) || 1), commandText)
}
module.exports = {
  commands: ['ppob', 'pulsa', 'pln', 'ewallet', 'data', 'game', 'saldoppob'],
  ownerOnly: true,
  registered: false,
  menu: 'ppob',
  async run({ command, args, reply }) {
    if (command === 'saldoppob') {
      const result = await getOrderKuotaBalance()
      return reply('✦ *SCARD • SALDO PPOB*\n━━━━━━━━━━━━━━━━\n' + (result == null ? 'Saldo belum tersedia' : money(result.balance ?? result)))
    }
    const items = await products()
    if (command !== 'ppob') return reply(chooseGroup(items, command, args, '/' + command))
    if (!args.length) return reply([
      '✦ *SCARD • DIGITAL CENTER*',
      '━━━━━━━━━━━━━━━━',
      ...GROUPS.map((g, i) => String(i + 1).padStart(2, '0') + '  ' + g.label),
      '',
      'Ketik /pulsa, /pln, /ewallet',
      'atau pilih /ppob 01'
    ].join('\n'))
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
      return reply(displayList(category, other.filter(x => x.category === category), Math.max(1, Number(args[2]) || 1), '/ppob lainnya ' + args[1]))
    }
    return reply(chooseGroup(items, group, args.slice(1), '/' + group))
  }
}
