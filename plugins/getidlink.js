// Resolusi ID grup dan Channel dari tautan undangan, khusus owner.
function extractLink(value, kind) {
  const raw = String(value || '').trim();
  const pattern = kind === 'group'
    ? /(?:https?:\/\/)?chat\.whatsapp\.com\/([A-Za-z0-9_-]{10,})/i
    : /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9_-]{10,})/i;
  return raw.match(pattern)?.[1] || null;
}
function clean(value) { return String(value || '-').replace(/[\r\n]+/g, ' ').trim(); }
module.exports = {
  commands: ['getidgrup', 'getidgroup', 'getidchannel', 'getidch'],
  registered: true,
  ownerOnly: true,
  menu: '/getidgrup <link> • /getidchannel <link>',
  async run({sock, msg, command, args, reply}) {
    if (msg.key.remoteJid?.endsWith('@g.us')) return reply('❌ Gunakan perintah ini melalui chat pribadi owner.');
    const channel = ['getidchannel', 'getidch'].includes(command);
    const kind = channel ? 'channel' : 'group';
    const code = extractLink(args.join(' '), kind);
    if (!code) return reply(channel
      ? '❌ Link Channel tidak valid.\nContoh: /getidchannel https://whatsapp.com/channel/0029VaXXXXXXXX'
      : '❌ Link grup tidak valid.\nContoh: /getidgrup https://chat.whatsapp.com/XXXXXXXX');
    try {
      if (channel) {
        if (typeof sock.newsletterMetadata !== 'function') return reply('❌ Versi Baileys ini belum menyediakan newsletterMetadata.');
        const info = await sock.newsletterMetadata('invite', code);
        const id = info?.id || info?.jid || info?.newsletterJid;
        if (!id || !/^[0-9]+@newsletter$/.test(id)) return reply('⚠️ Channel ditemukan, tetapi ID @newsletter tidak tersedia dari respons WhatsApp.');
        const name = typeof info?.name === 'string' ? info.name : info?.name?.text || info?.name?.value;
        return reply(['📢 *INFORMASI CHANNEL*', '', 'Nama: ' + clean(name), 'ID: ' + id, '', 'Gunakan ID tersebut untuk /ihchannel add'].join('\n'));
      }
      if (typeof sock.groupGetInviteInfo !== 'function') return reply('❌ Versi Baileys ini belum menyediakan groupGetInviteInfo.');
      const info = await sock.groupGetInviteInfo(code);
      const id = info?.id;
      if (!id || !/^[0-9]+(?:-[0-9]+)?@g\.us$/.test(id)) return reply('⚠️ Grup ditemukan, tetapi ID grup tidak tersedia dari respons WhatsApp.');
      return reply(['👥 *INFORMASI GRUP*', '', 'Nama: ' + clean(info?.subject), 'ID: ' + id, '', 'Gunakan ID tersebut untuk /ih add'].join('\n'));
    } catch (error) {
      console.error('[GET ID LINK]', kind, error.message);
      return reply('❌ Tidak bisa mengambil ID dari link. Pastikan link aktif dan bot memiliki akses ke informasi undangan.\nDetail: ' + clean(error.message).slice(0, 180));
    }
  }
};
