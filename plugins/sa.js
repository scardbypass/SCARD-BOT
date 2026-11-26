let busy = false;
module.exports = {
  commands: ['sa','soundsticker'],
  registered: true,
  ownerOnly: true,
  menu: 'sa',
  async run({sock,msg,reply}) {
    if (msg.key?.fromMe) return;
    const jid = msg.key.remoteJid;
    const {downloadContentFromMessage,normalizeMessageContent} = await import('baileys');
    const content = normalizeMessageContent(msg.message) || {};
    const quoted = normalizeMessageContent(content.extendedTextMessage?.contextInfo?.quotedMessage) || {};
    const video = content.videoMessage || quoted.videoMessage;
    if (!video) return reply('🎵 *SOUND STICKER*\n\nKirim video bersuara dengan caption /sa\natau reply video dengan /sa.');
    if (busy) return reply('⏳ Sound Sticker sedang diproses.');
    const limit = 25 * 1024 * 1024;
    if (Number(video.fileLength || 0) > limit) return reply('⚠️ Maksimal video 25 MB.');
    busy = true;
    try {
      await reply('⏳ Membuat stiker bersuara...');
      const stream = await downloadContentFromMessage(video,'video');
      const chunks = [];
      let size = 0;
      for await (const chunk of stream) {
        size += chunk.length;
        if (size > limit) {stream.destroy?.(); throw new Error('Video melebihi 25 MB');}
        chunks.push(chunk);
      }
      const {sendSoundSticker} = await import('../lib/sound-sticker/sender.mjs');
      await sendSoundSticker(sock,jid,Buffer.concat(chunks),msg);
      console.log('[SA] Sound Sticker sent');
    } catch (error) {
      console.error('[SA ERROR]',error.message);
      await reply('❌ Sound Sticker gagal: '+error.message);
    } finally {busy=false;}
  }
};
