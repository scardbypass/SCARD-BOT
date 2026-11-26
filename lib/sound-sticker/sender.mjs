import { prepareWAMessageMedia, generateWAMessageFromContent } from 'baileys';
import { enableSoundSticker } from './patch.mjs';
import { convertSoundSticker } from './converter.mjs';
export async function sendSoundSticker(sock,jid,buffer,quoted) {
  enableSoundSticker();
  const media = await convertSoundSticker(buffer);
  const sticker = await prepareWAMessageMedia({sticker:media.sticker,isAnimated:true},{upload:sock.waUploadToServer});
  const audio = await prepareWAMessageMedia({audio:media.audio,mimetype:'audio/ogg; codecs=opus',ptt:true},{upload:sock.waUploadToServer});
  if (!sticker.stickerMessage || !audio.audioMessage) throw new Error('Gagal menyiapkan media');
  sticker.stickerMessage.isAnimated = true;
  sticker.stickerMessage.audioMessage = audio.audioMessage;
  const message = generateWAMessageFromContent(jid,sticker,{userJid:sock.user.id,quoted});
  if (!message.message?.stickerMessage?.audioMessage) throw new Error('Audio hilang saat generate pesan');
  await sock.relayMessage(jid,message.message,{messageId:message.key.id});
  return message;
}
