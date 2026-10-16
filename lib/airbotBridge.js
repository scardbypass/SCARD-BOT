const {getText}=require('./utils');
const pending=new Map();
let pendingTopup=null;
const TOPUP_TTL=2*60*1000;
function beginTopup({chat,nominal}){
  if(pendingTopup && Date.now()-pendingTopup.createdAt<TOPUP_TTL)return false;
  pendingTopup={chat,nominal,createdAt:Date.now(),timer:null};
  return true;
}
function clearTopup(){if(pendingTopup?.timer)clearTimeout(pendingTopup.timer);pendingTopup=null;}
function armTopupTimeout(sock){
  if(!pendingTopup)return;
  const req=pendingTopup;
  req.timer=setTimeout(async()=>{
    if(pendingTopup!==req)return;
    clearTopup();
    try{await sock.sendMessage(req.chat,{text:'⚠️ *Konfirmasi Topup CEIR Belum Diterima*\n\nBelum ada respons transaksi dari grup CEIR dalam 2 menit.\nPeriksa saldo atau riwayat transaksi sebelum mencoba lagi agar tidak terjadi topup ganda.'})}catch(e){console.error('[AIRBOT TOPUP TIMEOUT]',e.message)}
  },TOPUP_TTL);
}
function topupResult(text,nominal){
  const t=String(text||'').trim();
  if(!/topup\s+ceir\s+api/i.test(t))return false;
  if(!/(berhasil|gagal|ditolak|error|failed)/i.test(t))return false;
  const amount=t.match(/Nominal\s*:\s*(?:Rp\s*)?([\d.,]+)/i);
  if(!amount)return false;
  const parsed=Number(amount[1].replace(/[^\d]/g,''));
  return parsed===nominal;
}

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
  if(pendingTopup && Date.now()-pendingTopup.createdAt<TOPUP_TTL){
    const text=getText(msg);
    if(topupResult(text,pendingTopup.nominal)){
      const target=pendingTopup.chat;
      clearTopup();
      try{await sock.sendMessage(target,{text});console.log('[AIRBOT] Konfirmasi topup diteruskan');return true}
      catch(e){console.error('[AIRBOT TOPUP RESULT]',e.message);return false}
    }
  }
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

module.exports={setPending,getPending,clearPending,handleAirbotGroupMessage,beginTopup,clearTopup,armTopupTimeout,REQUEST_TTL,QR_TTL,TOPUP_TTL};
