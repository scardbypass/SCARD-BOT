function normalizePhone(v=''){return String(v).replace('@s.whatsapp.net','').replace('@lid','').replace(/\D/g,'')}
function jidPhone(jid=''){return normalizePhone(String(jid).split(':')[0])}
function formatRupiah(v){return 'Rp'+Math.floor(Number(v)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
function unwrapMessage(message={}){let m=message||{};while(m?.ephemeralMessage?.message||m?.viewOnceMessage?.message||m?.viewOnceMessageV2?.message||m?.viewOnceMessageV2Extension?.message||m?.documentWithCaptionMessage?.message){m=m.ephemeralMessage?.message||m.viewOnceMessage?.message||m.viewOnceMessageV2?.message||m.viewOnceMessageV2Extension?.message||m.documentWithCaptionMessage?.message}return m||{}}
function getText(msg={}){const m=unwrapMessage(msg.message||msg);return m.conversation||m.extendedTextMessage?.text||m.imageMessage?.caption||m.videoMessage?.caption||m.buttonsResponseMessage?.selectedButtonId||m.listResponseMessage?.singleSelectReply?.selectedRowId||''}
function getQuotedMessage(msg={}){return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage||msg.message?.imageMessage?.contextInfo?.quotedMessage||msg.message?.videoMessage?.contextInfo?.quotedMessage||null}
function getQuotedText(msg={}){const q=getQuotedMessage(msg);return q?getText(q):''}
module.exports={normalizePhone,jidPhone,formatRupiah,unwrapMessage,getText,getQuotedMessage,getQuotedText}
