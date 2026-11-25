import { load } from 'cheerio';

const money = s => {
  if (!/^-?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}$/.test(s)) throw new Error('Nominal tidak valid');
  const n = Number(s.replace(/,/g, ''));
  if (!Number.isSafeInteger(Math.round(n * 100))) throw new Error('Nominal di luar batas');
  return n;
};
export function parseMutation(html, account) {
  if (!/^\d{10}$/.test(account)) throw new Error('Rekening tidak valid');
  const $ = load(html);
  const body = $('body').text().replace(/\s+/g, ' ');
  if (!/ACCOUNT STATEMENT/i.test(body)) throw new Error('Halaman mutasi tidak dikenali');
  const accounts = [];
  $('tr').each((_, row) => {
    const t = $(row).children('td,th').map((_, c) => $(c).text().trim()).get().join(' ');
    const m = t.match(/^Account Number\s*:?\s*(\d{10})$/i);
    if (m) accounts.push(m[1]);
  });
  if (accounts.length !== 1 || accounts[0] !== account) throw new Error('Rekening tidak cocok');
  const transactions = [];
  $('tr').each((_, row) => {
    const cells = $(row).children('td').map((_, c) => $(c).text().trim()).get();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(cells[0] || '')) return;
    const [day, month, year] = cells[0].split('/');
    const date = year + '-' + month + '-' + day;
    const parsed = new Date(date + 'T00:00:00Z');
    if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0,10) !== date) throw new Error('Tanggal tidak valid');
    const tail = cells.slice(3).join(' ').match(/^([\d,.]+)\s*(CR|DB)\s*(-?[\d,.]+)$/);
    if (!tail) throw new Error('Baris mutasi tidak dikenali');
    transactions.push({date, description: cells[1], type: tail[2], amount: money(tail[1]), balance: money(tail[3])});
  });
  if (!transactions.length) throw new Error('Tidak ada transaksi yang dapat diverifikasi');
  return {account, transactions, balance: transactions.at(-1).balance};
}
