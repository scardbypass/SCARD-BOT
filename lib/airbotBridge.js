const pending=new Map();
const REQUEST_TTL=30*60*1000;
const QR_TTL=Math.max(1,Number(process.env.AIRBOT_QR_DELETE_MINUTES||10))*60*1000;

function setPending(phone,data){pending.set(String(phone),{...data,createdAt:Date.now()})}
function getPending(phone){const p=pending.get(String(phone));if(!p)return null;if(Date.now()-p.createdAt>REQUEST_TTL){pending.delete(String(phone));return null}return p}
function clearPending(phone){pending.delete(String(phone))}
function latestPending(){let best=null;for(const [phone,p] of pending){if(Date.now()-p.createdAt>REQUEST_TTL){pending.delete(phone);continue}if(!best||p.createdAt>best.data.createdAt)best={phone,data:p}}return best}

function isQrisResponse(msg){
  const m=msg?.message||{};
  const text=String(m.conversation||m.extendedTextMessage?.text||m.imageMessage?.caption||m.documentMessage?.caption||'');
  return !!m.imageMessage || /\bqris\b|qr\s*code|scan\s*qr/i.test(text);
}

async function handleAirbotGroupMessage(sock,msg){
  const group=process.env.AIRBOT_GROUP_ID;
  if(!group||msg?.key?.remoteJid!==group||msg?.key?.fromMe)return false;
  const req=latestPending();
  if(!req||req.data.qrForwarded||!isQrisResponse(msg))return false;
  const target=req.data.chat;
  if(!target)return false;
  try{
    const sent=await sock.sendMessage(target,{forward:msg});
    req.data.qrForwarded=true;
    req.data.qrForwardedAt=Date.now();
    console.log('[AIRBOT] QRIS diteruskan ke private untuk',req.data.nominal);
    setTimeout(async()=>{try{if(sent?.key)await sock.sendMessage(target,{delete:sent.key});console.log('[AIRBOT] QRIS private dihapus setelah 10 menit')}catch(e){console.error('[AIRBOT DELETE]',e.message)}},QR_TTL);
    return true;
  }catch(e){console.error('[AIRBOT FORWARD]',e.message);return false}
}

module.exports={setPending,getPending,clearPending,handleAirbotGroupMessage,REQUEST_TTL,QR_TTL};
