import { prepareWAMessageMedia, generateWAMessageFromContent } from 'baileys';
import { enableSoundSticker } from './patch.mjs';
import { convertSoundSticker, convertPhotoSoundSticker } from './converter.mjs';
export async function sendSoundSticker(sock,jid,buffer,quoted,voice) {
  enableSoundSticker();
  const media = voice ? await convertPhotoSoundSticker(buffer,voice) : await convertSoundSticker(buffer);
  const animated = media.isAnimated !== false;
  const sticker = await prepareWAMessageMedia({sticker:media.sticker,isAnimated:animated},{upload:sock.waUploadToServer});
  const audio = await prepareWAMessageMedia({audio:media.audio,mimetype:'audio/ogg; codecs=opus',ptt:true},{upload:sock.waUploadToServer});
  if (!sticker.stickerMessage || !audio.audioMessage) throw new Error('Gagal menyiapkan media');
  sticker.stickerMessage.isAnimated = animated;
  sticker.stickerMessage.audioMessage = audio.audioMessage;
  const message = generateWAMessageFromContent(jid,sticker,{userJid:sock.user.id,quoted});
  if (!message.message?.stickerMessage?.audioMessage) throw new Error('Audio hilang saat generate pesan');
  await sock.relayMessage(jid,message.message,{messageId:message.key.id});
  return message;
}
