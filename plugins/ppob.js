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
module.exports = {
  commands: ['ppob', 'saldoppob'],
  ownerOnly: true,
  registered: false,
  menu: 'ppob',
  async run({ command, args, reply }) {
    if (command === 'saldoppob') {
      const result = await getOrderKuotaBalance()
      return reply('✦ *SCARD • SALDO PPOB*\n━━━━━━━━━━━━━━━━\n' + (result == null ? 'Saldo belum tersedia' : money(result.balance ?? result)))
    }
    const items = await products()
    const cats = categories(items)
    if (!args.length) {
      const lines = cats.map((x, i) => String(i + 1).padStart(2, '0') + '  ' + x)
      return reply(['✦ *SCARD • PPOB CENTER*', '━━━━━━━━━━━━━━━━', ...lines, '', 'Pilih: /ppob 01', 'Saldo: /saldoppob'].join('\n'))
    }
    const index = Number(args[0])
    const selected = Number.isInteger(index) && index > 0 ? cats[index - 1] : cats.find(x => x.toLowerCase() === args.join(' ').toLowerCase())
    if (!selected) return reply('Kategori tidak ditemukan. Ketik /ppob')
    const page = Math.max(1, Number(args[1]) || 1)
    const filtered = items.filter(x => x.category === selected)
    const pages = Math.ceil(filtered.length / PAGE_SIZE)
    if (page > pages) return reply('Halaman tidak ditemukan.')
    const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const lines = slice.flatMap(x => [x.code + ' • ' + money(x.price), x.name, ''])
    return reply(['✦ *SCARD • ' + selected.toUpperCase() + '*', '━━━━━━━━━━━━━━━━', ...lines, 'Halaman ' + page + '/' + pages, 'Reply list: KODE NOMOR_TUJUAN', 'Contoh: ' + (slice[0]?.code || 'KODE') + ' 081234567890', 'Halaman lain: /ppob ' + args[0] + ' ' + (page + 1)].join('\n'))
  }
}
