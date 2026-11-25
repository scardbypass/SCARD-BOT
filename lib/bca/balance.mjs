import { load } from 'cheerio';

// Parse an authorized, already retrieved balance page. No network access.
export function parseBalance(html, account) {
  if (!/^\d{10}$/.test(account)) throw new Error('Nomor rekening tidak valid');
  const $ = load(html);
  const body = $('body').text().replace(/\s+/g, ' ');
  if (!/INFORMASI SALDO/i.test(body) || !/SALDO EFEKTIF/i.test(body)) throw new Error('Halaman saldo tidak dikenali');
  const matches = [];
  $('tr').each((_, row) => {
    const value = $(row).text().replace(/\s+/g, ' ').trim();
    const match = value.match(/(?:^|\D)(\d{10})\s*IDR\s*(-?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})(?![\d.])/);
    if (match && match[1] === account) matches.push(match[2]);
  });
  if (matches.length !== 1) throw new Error('Saldo rekening tidak dapat diverifikasi');
  const balance = Number(matches[0].replace(/,/g, ''));
  if (!Number.isFinite(balance) || !Number.isSafeInteger(Math.round(balance * 100))) throw new Error('Saldo tidak valid');
  return { account, balance };
}
