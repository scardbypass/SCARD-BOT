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
    const quoted = normalizeMessageContent((content.imageMessage || content.videoMessage || content.extendedTextMessage || content.audioMessage)?.contextInfo?.quotedMessage) || {};
    const video = content.videoMessage || quoted.videoMessage;
    const image = content.imageMessage || quoted.imageMessage;
    const voice = content.audioMessage || quoted.audioMessage;
    const pair = !video && image && voice;
    if (!video && !pair) return reply('🎵 *SOUND STICKER*\n\nKirim video bersuara dengan caption /sa\natau reply video dengan /sa.\n\nFoto + VN: reply voice note dengan foto dan caption sa.');
    if (busy) return reply('⏳ Sound Sticker sedang diproses.');
    const limit = 25 * 1024 * 1024;
    if ([video,image,voice].some(m => Number(m?.fileLength || 0) > limit)) return reply('⚠️ Maksimal video 25 MB.');
    busy = true;
    try {
      await reply('⏳ Membuat stiker bersuara...');
      const download = async (media,type) => {
      const stream = await downloadContentFromMessage(media,type);
      const chunks = [];
      let size = 0;
      for await (const chunk of stream) {
        size += chunk.length;
        if (size > limit) {stream.destroy?.(); throw new Error('Video melebihi 25 MB');}
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
      };
      const buffer = await download(pair ? image : video,pair ? 'image' : 'video');
      const audio = pair ? await download(voice,'audio') : undefined;
      const {sendSoundSticker} = await import('../lib/sound-sticker/sender.mjs');
      await sendSoundSticker(sock,jid,buffer,msg,audio);
      console.log('[SA] Sound Sticker sent');
    } catch (error) {
      console.error('[SA ERROR]',error.message);
      await reply('❌ Sound Sticker gagal: '+error.message);
    } finally {busy=false;}
  }
};
