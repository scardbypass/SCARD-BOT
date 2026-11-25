module.exports={
  commands:['bca'], registered:true, ownerOnly:true, menu:'bca',
  async run({msg,reply}) {
    if (!msg?.key?.remoteJid || !/@(?:s\.whatsapp\.net|lid)$/.test(msg.key.remoteJid)) return reply('❌ Khusus chat pribadi owner.');
    if(process.env.BCA_ENABLED!=='true') return reply('BCA nonaktif.');
    try {
      const {checkBca}=await import('../lib/bca/service.mjs');
      return reply(await checkBca());
    } catch { return reply('❌ Gagal memuat layanan BCA.'); }
  }
};
