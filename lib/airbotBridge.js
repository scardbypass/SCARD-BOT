const {getText}=require('./utils');
const pending=new Map();
let balancePending=null;
const balanceCache={value:null,at:0};
function parseMainBalance(text){
  const match=String(text||'').match(/Saldo\\s+utama\\s*:\\s*(?:Rp\\s*)?([\\d.,]+)/i);
  if(!match)return null;
  const n=Number(match[1].replace(/\\D/g,''));
  return Number.isSafeInteger(n)?n:null;
}
async function getAirbotWaBalance(sock){
  const group=String(process.env.AIRBOT_GROUP_ID||'').trim();
  if(!group.endsWith('@g.us')||!sock?.user)return null;
  if(balancePending)return balancePending.promise;
  let resolve;
  const promise=new Promise(r=>{resolve=r});
  const req={promise,resolve,id:null,timer:null,started:Date.now()};
  balancePending=req;
  req.timer=setTimeout(()=>{if(balancePending===req){balancePending=null;resolve(null)}},15000);
  try{
    const sent=await sock.sendMessage(group,{text:'/api saldo'});
    req.id=sent?.key?.id||null;
  }catch(e){
    console.error('[AIRBOT WA SALDO]',e.message);
    clearTimeout(req.timer);
    if(balancePending===req)balancePending=null;
    resolve(null);
  }
  return promise;
}
function handleAirbotBalanceResponse(msg){
  const req=balancePending;
  if(!req||msg?.key?.fromMe||msg?.key?.remoteJid!==process.env.AIRBOT_GROUP_ID)return false;
  const sender=String(msg.key.participant||msg.key.participantPn||'');
  const allowed=String(process.env.AIRBOT_WA_SENDER||'').trim();
  if(!allowed||!sender||!([sender,msg.key.participantPn,msg.key.participantAlt].filter(Boolean).includes(allowed)))return false;
  const context=msg.message?.extendedTextMessage?.contextInfo||{};
  if(context.stanzaId && req.id && context.stanzaId!==req.id)return false;
  const balance=parseMainBalance(getText(msg));
  if(balance===null)return false;
  balanceCache.value=balance;balanceCache.at=Date.now();
  clearTimeout(req.timer);balancePending=null;req.resolve(balance);
  return true;
}
let pendingTopup=null;
const TOPUP_TTL=2*60*1000;
function beginTopup({chat,nominal}){
  if(pendingTopup && Date.now()-pendingTopup.createdAt<TOPUP_TTL)return false;
  pendingTopup={chat,nominal,createdAt:Date.now(),timer:null,messageId:null};
  return true;
}
function setTopupMessageId(id){if(pendingTopup)pendingTopup.messageId=id||null;}
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
function topupResult(text,nominal,matchingReply){
  const t=String(text||'').trim();
  const success=/topup\s+ceir\s+api\s+berhasil/i.test(t);
  const failure=/saldo\s+utama\s+tidak\s+cukup|topup\s+ceir\s+api\s+(?:gagal|ditolak|error|failed)/i.test(t);
  const minimum=/minimal\s+topup\s+api\s+adalah/i.test(t);
  if(!success&&!failure&&!minimum)return false;
  if(minimum)return matchingReply;
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
  if(handleAirbotBalanceResponse(msg))return true;
  if(pendingTopup && Date.now()-pendingTopup.createdAt<TOPUP_TTL){
    const text=getText(msg);
    const context=msg.message?.extendedTextMessage?.contextInfo||{};
    const matchingReply=!!pendingTopup.messageId&&context.stanzaId===pendingTopup.messageId;
    if(matchingReply&&topupResult(text,pendingTopup.nominal,matchingReply)){
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

module.exports={getAirbotWaBalance,parseMainBalance,setPending,getPending,clearPending,handleAirbotGroupMessage,beginTopup,setTopupMessageId,clearTopup,armTopupTimeout,REQUEST_TTL,QR_TTL,TOPUP_TTL};
