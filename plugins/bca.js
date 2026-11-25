module.exports = {
  commands: ['bca'],
  registered: true,
  ownerOnly: true,
  menu: 'bca',
  async run({msg, reply, args = [], isOwner}) {
    if (isOwner !== true || !/@(?:s\.whatsapp\.net|lid)$/.test(msg?.key?.remoteJid || '')) return;
    const tokens = args.map(x => String(x).toLowerCase());
    const [action, account, ...period] = tokens;
    const balance = !tokens.length || (tokens.length === 1 && /^(all|[1-9]\d*)$/.test(action));
    const help = tokens.length === 1 && action === 'help';
    const status = tokens.length === 1 && action === 'status';
    const mutation = action === 'mutasi' && /^(all|[1-9]\d*)$/.test(account || '');
    if (!balance && !help && !status && !mutation) return;
    if (help) return reply('🏦 *Menu rekening*\n• bca\n• bca 1\n• bca status\n• bca mutasi 1 7\n• bca mutasi all pdf\nMutasi dan PDF belum terhubung ke bank.');
    if (status) return reply('🏦 *Status rekening*\nKonfigurasi: ' + (process.env.BCA_ENABLED === 'true' ? 'aktif' : 'nonaktif') + '\nClient bank belum diverifikasi.');
    if (process.env.BCA_ENABLED !== 'true') return reply('⚠️ Layanan BCA belum diaktifkan.');
    if (mutation) {
      try {
        const {parsePeriod} = await import('../lib/bca/period.mjs');
        if (period.at(-1) === 'pdf') period.pop();
        parsePeriod(period);
      } catch (e) { return reply('⚠️ ' + e.message); }
    }
    return reply('⚠️ Client bank belum tersedia. Pengecekan saldo dan mutasi belum dapat dijalankan.');
  }
};
