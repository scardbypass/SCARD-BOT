import { proto } from 'baileys';
const Sticker = proto.Message.StickerMessage;
const Audio = proto.Message.AudioMessage;
export function enableSoundSticker() {
  const key = Symbol.for('scard.soundSticker');
  if (Sticker[key]) return true;
  const probe = Sticker.encode({audioMessage:{seconds:1}}).finish();
  if (probe.length > 0) return true;
  const originalEncode = Sticker.encode;
  Sticker.encode = function(message, writer) {
    const output = originalEncode.call(this,message,writer);
    if (message.audioMessage) Audio.encode(message.audioMessage,output.uint32(210).fork()).ldelim();
    return output;
  };
  const originalFromObject = Sticker.fromObject;
  Sticker.fromObject = function(object) {
    const message = originalFromObject.call(this,object);
    if (object.audioMessage) message.audioMessage = Audio.fromObject(object.audioMessage);
    return message;
  };
  Sticker[key] = true;
  return true;
}
