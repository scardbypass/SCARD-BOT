const {state,save,price,allowed,outstanding,active,schedule,operational,wallet,available,reserve,settle,release,ceirConfig,chargeCeir}=require('./store');
const {check}=require('./ceirgo');
const SERVICES=['3b','1b','3bs','3bd'];
const rup=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
const jid=msg=>msg?.key?.remoteJid||'';
const group=msg=>jid(msg).endsWith('@g.us');
const title=s=>'╭──〔 '+(process.env.BOT_NAME||'CUAN-BOT')+' • '+s.toUpperCase()+' 〕';
const bank=()=>{const b=state.settings.bank;return b?'\n🏦 '+b.name+'\n💳 '+b.number+'\n👤 '+b.holder:''};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const wibExpiry=at=>{const d=new Date(at);if(isNaN(d.getTime()))return '—';const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));const base=new Date(Date.UTC(Number(p.year),Number(p.month),1));const max=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0)).getUTCDate();return String(Math.min(Number(p.day),max)).padStart(2,'0')+'/'+String(base.getUTCMonth()+1).padStart(2,'0')+'/'+base.getUTCFullYear()+' '+p.hour+':'+p.minute+' WIB'};
const ownerJid=()=>String(process.env.OWNER_NUMBER||'').replace(/\D/g,'')+'@s.whatsapp.net';
function settingsFor(g){return state.settings.sellerGroups[g]||null}
function menu(service,g){return [title(service),'│ 📱 '+service.toUpperCase()+' IMEI SERVICE','│ 🟢 Status : '+(allowed(service,g)&&operational(service)?'ONLINE':'OFFLINE'),'│ 💰 Harga : '+rup(price(service,g))+' / SUCCESS','│','├── CARA ORDER','│ /'+service+' 356424104776994','│','│ ✅ UNKNOWN : Diterima','│ ❌ ROAMER / REGISTERED : Ditolak','│ ⚠️ API ERROR : Ditolak','│ 💳 Registrasi bayar jika SUCCESS','╰── CUAN-BOT'].join('\n')}
async function command(ctx){
 const {sock,msg,reply,command,args,isOwner}=ctx,service=command.toLowerCase(),g=jid(msg),a=String(args[0]||'').toLowerCase(),s=state.settings;
 if(!group(msg))return;
 const seller=settingsFor(g);
 if(a==='operator'&&isOwner){const op=String(args[1]||'').toLowerCase();if(op==='set'){s.operatorGroups[service]=g;save();return reply('✅ Grup ini menjadi operator '+service.toUpperCase())}if(op==='off'){delete s.operatorGroups[service];save();return reply('✅ Operator '+service.toUpperCase()+' dinonaktifkan')}return reply('👥 Operator '+service.toUpperCase()+': '+(s.operatorGroups[service]||'Belum diatur'))}
 if(a==='add'&&isOwner){s.sellerGroups[g]=s.sellerGroups[g]||{enabled:true,services:{},prices:{}};save();return reply('✅ Grup seller terdaftar. /'+service+' untuk menu')}
 if(a==='del'&&isOwner){if(outstanding(g).length||wallet(g).balance!==0||Object.keys(wallet(g).holds).length||state.orders.some(o=>o.group===g&&['checking','pending','processing'].includes(o.status)))return reply('❌ Masih ada tagihan/order aktif. Lunasi dan selesaikan terlebih dahulu.');delete s.sellerGroups[g];save();return reply('✅ Grup seller dihapus')}
 if(a==='harga'&&isOwner){if(args[1]==='global'&&/^\d+$/.test(args[2]||'')){s.globalPrices[service]=Number(args[2]);save();return reply('✅ Harga global '+service.toUpperCase()+': '+rup(s.globalPrices[service]))}if(args[1]==='default'){if(!seller)return reply('❌ Grup belum terdaftar');delete seller.prices[service];save();return reply('✅ Harga mengikuti global: '+rup(price(service,g)))}if(/^\d+$/.test(args[1]||'')&&seller){seller.prices[service]=Number(args[1]);save();return reply('✅ Harga khusus grup: '+rup(price(service,g)))}return reply('Gunakan /'+service+' harga global 25000 | harga 20000 | harga default')}
 if(a==='global'&&isOwner&&['on','off'].includes(args[1])){s.enabled=args[1]==='on';save();return reply('✅ Semua layanan '+args[1].toUpperCase())}
 if(['on','off'].includes(a)&&isOwner){if(!seller)return reply('❌ Grup belum terdaftar');seller.services[service]=a==='on';save();return reply('✅ '+service.toUpperCase()+' '+a.toUpperCase())}
 if(a==='bank'&&isOwner){if(args[1]==='off'){s.bank=null;save();return reply('✅ Rekening dihapus')}if(args.length>=4){s.bank={name:args[1],number:args[2],holder:args.slice(3).join(' ')};save();return reply('✅ Rekening invoice disimpan')}return reply('🏦 '+(s.bank?JSON.stringify(s.bank):'Belum diatur')+'\n/'+service+' bank BCA 1234567890 NAMA')}
 if(a==='invoice'){if(!seller)return reply('❌ Grup belum terdaftar');return reply(invoice(g))}
 if(a==='status'&&isOwner)return reply('⚙️ '+service.toUpperCase()+'\nOperator: '+(s.operatorGroups[service]||'-')+'\nHarga global: '+rup(s.globalPrices[service])+'\nHarga grup: '+rup(price(service,g))+'\nGlobal: '+(s.enabled?'ON':'OFF'))
 if(!seller)return; // Silent in unregistered seller groups
 if(!a)return reply(menu(service,g));
 if(!/^\d{15}$/.test(a)||args.length!==1)return reply('❌ Format: /'+service+' 356424104776994');
 if(!allowed(service,g))return reply('🔴 Layanan '+service.toUpperCase()+' sedang OFFLINE.');
 if(!operational(service)){const h=schedule(service);return reply('🔴 LAYANAN '+service.toUpperCase()+' SEDANG TUTUP\\n⏰ Jam operasional: '+h.open+'–'+h.close+' WIB\\nSilakan order kembali saat layanan dibuka.');}
 if(service!=='1b'&&!s.operatorGroups[service])return reply('⚠️ Grup operator '+service.toUpperCase()+' belum diatur.');
 if(price(service,g)<=0)return reply('⚠️ Harga layanan belum diatur oleh owner.');
 if(active(a)&&!(msg.apiOrderId&&active(a).id===msg.apiOrderId))return reply([title(service),'│ ⚠️ ORDER DITOLAK','│ 📱 IMEI : '+a,'│ 🔒 IMEI sedang diproses','│ oleh seller lain.','╰── CUAN-BOT'].join('\n'));
 // Lock sebelum request API agar order bersamaan tidak lolos
 let order={id:msg.apiOrderId||Date.now().toString(36)+Math.random().toString(36).slice(2,8),service,imei:a,group:g,originKey:msg.key,source:msg.apiOrderId?'dhru':'whatsapp',price:price(service,g),status:'checking',createdAt:new Date().toISOString(),date:today()};
 const payMode=wallet(g).mode;
 if(!msg.apiOrderId && !reserve(g,order.id,order.price))return reply('❌ SALDO GRUP TIDAK CUKUP\\n💰 Saldo tersedia: '+rup(available(g))+'\\n💳 Harga order: '+rup(order.price)+'\\nHubungi owner untuk top up.');
 order.paymentMode=payMode;
 if(msg.apiOrderId){
  const reserved=state.orders.find(o=>o.id===msg.apiOrderId&&o.group===g&&o.imei===a&&o.service===service&&o.source==='dhru');
  if(!reserved)return reply('❌ Order API tidak ditemukan');
  if(reserved.status==='cancelled'){release(reserved);return;}
  // Keep original API reference, price, creation timestamp and reserved funds.
  reserved.originKey=msg.key;
  order=reserved;
 }else{
  state.orders.push(order);
 }
 save();
 void Promise.resolve().then(()=>reply(service==='1b'?['╭──〔 🔍 CUAN-BOT 〕','│ VERIFIKASI IMEI','╰──────────────────','','📱 IMEI','*'+a+'*','','🌐 Provider : Ceir','⏳ Status : CHECKING','','Sedang memeriksa status IMEI.','Mohon tunggu sebentar...'].join('\n'):'🔍 IMEI '+a+' sedang diverifikasi melalui Ceir...')).catch(e=>console.error('[IMEI NOTIFY]',e.message));
 let ceir;try{ceir=await check(a)}catch(e){order.status='rejected';order.reason='API ERROR';release(order);save();console.error('[IMEI CENTER API]',e.message);return reply('⚠️ VERIFIKASI GAGAL\n📱 '+a+'\n❌ Order tidak diteruskan. Coba lagi nanti.')}
 if(order.status==='cancelled'){release(order);return;}
 if(ceir!=='UNKNOWN'){
  order.status='rejected';order.reason=ceir;order.ceirStatus=ceir;release(order);
  let billing;try{billing=chargeCeir(order,ceir)}catch(e){console.error('[CEIR BILLING]',order.id,e.message);billing={reason:'billing_error'}}
  save();const fee=order.ceirBilling;
  return reply('❌ ORDER REJECTED\n📱 '+a+'\n📡 CEIR : '+ceir+'\n💰 Biaya registrasi : Rp0\n💳 Biaya CEIR : '+(fee?rup(fee.amount):'Belum ditagih')+'\n👤 Penanggung : '+(fee?.mode||ceirConfig(g).mode).toUpperCase()+(billing?.reason==='insufficient_balance'?'\n⚠️ Saldo tidak cukup; CEIR belum ditagih.':''));
 }
 if(order.status==='cancelled'){release(order);return;}
 order.ceirStatus=ceir;
 if(service==='1b'){
  await reply(['╭──〔 📡 CUAN-BOT 〕','│ HASIL CEIR','╰──────────────────','','📱 IMEI','*'+a+'*','','🌐 Provider : Ceir','🟢 Status : *UNKNOWN*','','━━━━━━━━━━━━━━━━━━','✅ IMEI LOLOS VERIFIKASI','','🚀 Melanjutkan registrasi 1 bulan.','Mohon tunggu proses selesai.'].join('\n')).catch(e=>console.error('[1B CEIR NOTIFY]',e.message));
 }
 order.status='pending';save();
 if(service==='1b'){
  // Operator and seller groups are notifications only; DigiPOS is the provider.
  const digipos=require('./digipos');
  order.provider='digipos';
  order.status='processing';
  save();
  const target=s.operatorGroups['1b'];
  const notify=async(dest,text)=>{
   if(!dest)return;
   try{await sock.sendMessage(dest,{text})}catch(e){console.error('[1B NOTIFY]',e.message)}
  };
  let result;
  try{
   if(order.submissionAttempted){
    result={status:'manual_review',reason:'Previous submission attempt recorded; manual reconciliation required'};
   }else{
    result=await digipos.register(a,{
     submit:true,
     onBeforeSubmit:async()=>{
      if(order.submissionAttempted)throw Error('Duplicate submission attempt');
      order.submissionAttempted=true;
      order.submissionAttemptedAt=new Date().toISOString();
      order.status='manual_review';
      save();
     }
    });
   }
  }catch(e){
   console.error('[1B DIGIPOS]',e.message);
   result={status:'manual_review',reason:'DigiPOS request uncertain; check history before retry'};
  }
  if(order.status==='cancelled')return;
  order.providerStatus=result.status;
  order.providerReason=result.reason||'';
  if(result.orderId)order.providerOrderId=result.orderId;
  if(result.trxId)order.providerTrxId=result.trxId;
  if(result.status==='success'){
   try{
    settle(order);
    order.status='success';
    order.finishedAt=new Date().toISOString();
    order.finishedDate=today();
    save();
   }catch(e){
    console.error('[1B WALLET]',order.id,e.message);
    order.status='manual_review';
    order.billingError=e.message;
    save();
   }
  }else if(result.status==='failed'&&!result.orderId){
   // Only a definite API rejection is safe to release.
   order.status='failed';
   order.finishedAt=new Date().toISOString();
   release(order);
   save();
  }else{
   order.status='manual_review';
   order.reason='DigiPOS registration not confirmed';
   order.reviewRequiredAt=new Date().toISOString();
   save();
  }
  const submitted=order.status==='manual_review'&&result.status==='submitted'&&!!order.providerOrderId;
  const header=order.status==='success'?'🎉 REGISTRATION SUCCESS':order.status==='failed'?'❌ REGISTRATION FAILED':submitted?'📦 ORDER 1B DITERIMA':'⚠️ REGISTRATION PENDING';
  const status=order.status==='success'?'ACCEPTED':order.status==='failed'?'FAILED':submitted?'SUBMITTED • MENUNGGU HASIL':'PENDING REVIEW';
  const update=['╭──〔 '+header+' 〕','│ CUAN-BOT • 1B','╰──────────────────','','📱 IMEI','*'+a+'*','',
   '🆔 DigiPOS Order : '+(order.providerOrderId||'-'),
   '🧾 Order CUAN-BOT : '+order.id,
   '🌐 Provider : 1 bulan',
   (order.status==='success'?'🟢':order.status==='failed'?'🔴':'🟡')+' Status : *'+status+'*',
   ...(order.status==='success'?['','⏰ Estimasi masa aktif : '+wibExpiry(order.finishedAt),'💰 Total : '+rup(order.price)]:[]),
   ...(order.status==='failed'?['','💰 Biaya : Rp0']:[]),
   ...(order.status==='manual_review'?['','📋 '+(submitted?'Order berhasil dikirim ke DigiPOS. Status akhir belum tersedia.':result.reason||'Hasil belum pasti'),'❗ Jangan order ulang sebelum diverifikasi.']:[]),
   '','━━━━━━━━━━━━━━━━━━',
   order.status==='success'?'✅ Registrasi dikonfirmasi selesai.':order.status==='failed'?'Pendaftaran ditolak DigiPOS.':submitted?'⏳ Bot akan memeriksa hasil otomatis jika DigiPOS menyediakan status final.':'Order perlu pemeriksaan manual.',
   '⚡ Powered by CUAN-BOT'
  ].join('\n');
  await notify(g,update);
  if(target&&target!==g)await notify(target,update);
  return;
 }
 const text='/'+service+' '+a;
 try{if(order.status==='cancelled'){release(order);return;}const target=s.operatorGroups[service];const sent=await sock.sendMessage(target,{text});order.operatorGroup=target;order.operatorKey=sent.key;if(order.status!=='cancelled')order.status='processing';save();return reply('📱 IMEI : '+a+'\n📡 CEIR : UNKNOWN\n🟡 MENUNGGU PROSES')}
 catch(e){if(order.status!=='cancelled')order.status='pending';save();console.error('[IMEI CENTER FORWARD]',e.message);return reply('⚠️ IMEI lolos cek tetapi gagal diteruskan. Owner perlu memeriksa order.')}

}
function ceirDue(g){return state.orders.filter(o=>o.group===g&&o.ceirBilling?.mode==='seller'&&o.ceirBilling.amount>0&&!o.ceirBilling.paid)}
function invoice(g){
 const orders=outstanding(g).filter(o=>o.paymentMode!=='prepaid');
 const ceir=ceirDue(g),registration=orders.reduce((n,o)=>n+o.price,0),ceirTotal=ceir.reduce((n,o)=>n+o.ceirBilling.amount,0);
 const grouped=SERVICES.map(s=>{const a=orders.filter(o=>o.service===s);return a.length?'│ '+s.toUpperCase()+' : '+a.length+' IMEI • '+rup(a.reduce((v,o)=>v+o.price,0)):null}).filter(Boolean);
 return [title('INVOICE'),'│ 🧾 TAGIHAN BELUM DIBAYAR','│ 📦 Registrasi : '+orders.length+' IMEI',...grouped,'│ 💳 Registrasi : '+rup(registration),'│ 🔍 CEIR REJECT : '+ceir.length+' IMEI','│ 💸 Biaya CEIR : '+rup(ceirTotal),'│ 💵 TOTAL : '+rup(registration+ceirTotal),bank(),'│ '+(registration+ceirTotal?'🔴 UNPAID':'🟢 PAID / NIHIL'),'╰── CUAN-BOT'].join('\n');
}
async function payment({msg,reply,args,isOwner}){
 if(!group(msg))return reply('❌ /payment hanya di grup seller');if(!isOwner)return reply('❌ Khusus owner');
 const g=jid(msg);if(!settingsFor(g))return reply('❌ Grup belum terdaftar');
 const type=String(args[0]||'all').toLowerCase();if(type!=='all'&&type!=='ceir'&&!SERVICES.includes(type))return reply('Gunakan /payment all|ceir|3b|1b|3bs|3bd');
 const orders=type==='ceir'?[]:outstanding(g,type==='all'?null:type).filter(o=>o.paymentMode!=='prepaid');
 const ceir=type==='all'||type==='ceir'?ceirDue(g):[];
 const total=orders.reduce((n,o)=>n+o.price,0)+ceir.reduce((n,o)=>n+o.ceirBilling.amount,0);
 if(!orders.length&&!ceir.length)return reply('✅ Tidak ada tagihan.');
 if(String(args[1]||'')!=='confirm')return reply('⚠️ Konfirmasi pembayaran '+orders.length+' registrasi dan '+ceir.length+' biaya CEIR: '+rup(total)+'\nKetik /payment '+type+' confirm');
 const paidAt=new Date().toISOString();for(const o of orders)o.paidAt=paidAt;
 for(const o of ceir){o.ceirBilling.paid=true;o.ceirBilling.paidAt=paidAt}
 state.payments.push({group:g,service:type,paidAt,total,orderIds:orders.map(o=>o.id),ceirOrderIds:ceir.map(o=>o.id)});save();
 return reply('✅ PAYMENT CONFIRMED\n💰 Dibayar : '+rup(total)+'\n📦 Registrasi : '+orders.length+'\n🔍 CEIR : '+ceir.length+'\n'+invoice(g));
}
function parseAirbotResult(body,imei){
 const text=String(body||'').trim();
 if(!text)return null;
 const upper=text.toUpperCase();
 const matches=upper.match(/\d{15}/g)||[];
 if(matches.length && (matches.length!==1||matches[0]!==imei))return null;
 if(/(?:TIDAK\s+TERSEDIA|GANGGUAN|\bCLOSE(?:D)?\b|UNAVAILABLE)/i.test(text))return 'unavailable';
 if(/(?:\bFAILED\b|\bFAIL\b|\bGAGAL\b|\bREJECT(?:ED)?\b)/i.test(text))return 'failed';
 if(/(?:\bSUCCESS\b|\bSUKSES\b|\bBERHASIL\b)/i.test(text))return 'success';
 return null;
}
async function cancelQuoted(sock,msg,body,isOwner){
 const raw=String(body||'').trim();
 const parsed=/^\/?(cancel|reject|riject|rijek|tolak)(?:\s+([a-z0-9]+))?$/i.exec(raw);
 if(!parsed)return false;
 const g=jid(msg);
 if(!group(msg))return false;
 const send=text=>sock.sendMessage(g,{text},{quoted:msg});
 if(!isOwner){await send('❌ Penolakan order hanya untuk owner.');return true}
 const {getQuotedText}=require('../utils');
 const m=msg.message?.ephemeralMessage?.message||msg.message||{};
 const context=m.extendedTextMessage?.contextInfo||m.imageMessage?.contextInfo||m.videoMessage?.contextInfo||{};
 const quotedId=context.stanzaId;
 const quotedText=String(getQuotedText(msg)||'');
 const explicit=parsed[2];
 const activeStatuses=['checking','pending','processing','manual_review'];
 const candidates=state.orders.filter(o=>o.group===g||o.operatorGroup===g);
 let matches=[];
 if(explicit){
  matches=candidates.filter(o=>o.id.toLowerCase()===explicit.toLowerCase());
  if(!matches.length && /^\d{15}$/.test(explicit)){
   matches=candidates.filter(o=>o.imei===explicit&&activeStatuses.includes(o.status));
  }
 }else{
  // Prefer the order ID embedded in bot notices; message keys are not always persisted.
  const orderIds=[...new Set([...quotedText.matchAll(/\b(?:order\s*(?:id)?\s*[:：]\s*)([a-z0-9]{8,})\b/gi)].map(m=>m[1].toLowerCase()))];
  if(orderIds.length===1)matches=candidates.filter(o=>o.id.toLowerCase()===orderIds[0]);
  if(!matches.length&&quotedId){
   matches=candidates.filter(o=>
    (o.group===g&&o.originKey?.id===quotedId)||
    (o.operatorGroup===g&&o.operatorKey?.id===quotedId)||
    (o.group===g&&o.noticeKeys?.includes(quotedId)));
  }
  if(!matches.length){
   const imeis=[...new Set(quotedText.match(/\b\d{15}\b/g)||[])];
   if(imeis.length===1)matches=candidates.filter(o=>o.imei===imeis[0]&&activeStatuses.includes(o.status));
  }
 }
 if(matches.length!==1){
  await send(matches.length?'⚠️ Ada beberapa order cocok. Gunakan Reject <ORDER_ID>.':'⚠️ Order tidak ditemukan. Gunakan Reject <ORDER_ID> (contoh: Reject mvxg064uff2saa).');
  return true;
 }
 const o=matches[0];
 if(o.service==='1b'){
  // This adapter never submits registration. Only cancel confirmed non-submitted orders.
  const safe=o.status==='manual_review'&&o.provider==='digipos'&&
   o.providerStatus==='ready_for_review'&&
   o.providerReason==='DigiPOS connected; registration not submitted'&&
   o.submissionAttempted!==true&&!o.paymentSettled;
  if(!safe){
   await send('⚠️ Order 1B tidak aman dibatalkan otomatis. Verifikasi DigiPOS dan pembayaran dahulu. Order ID: '+o.id+'; status: '+o.status+'.');
   return true;
  }
 }else if(!['checking','pending','processing'].includes(o.status)){
  await send('⚠️ Order sudah berstatus '+o.status+' dan tidak dapat dibatalkan otomatis.');
  return true;
 }
 o.status='cancelled';o.cancelledAt=new Date().toISOString();o.cancelledBy='owner';o.finishedAt=o.cancelledAt;
 release(o);save();
 const message=[title(o.service),'│ 📱 IMEI : '+o.imei,'│ 🚫 CANCELLED','│ 🆔 Order : '+o.id,'│ 💰 Biaya : Rp0','│ 👑 Dibatalkan owner','╰── CUAN-BOT'].join('\n');
 await send(message);
 for(const dest of [...new Set([o.group,o.operatorGroup])].filter(x=>x&&x!==g)){
  try{await sock.sendMessage(dest,{text:message})}catch(e){console.error('[CANCEL NOTIFY]',dest,e.message)}
 }
 return true;
}
async function operatorReply(sock,msg,body){
 const g=jid(msg);
 if(!group(msg)||!body)return false;
 const context=msg.message?.extendedTextMessage?.contextInfo||{};
 const quotedId=context.stanzaId;
 if(!quotedId)return false;
 const order=state.orders.find(o=>o.operatorGroup===g&&o.operatorKey?.id===quotedId&&o.status==='processing');
 if(!order)return false;
 // Balasan dari bot sendiri (pesan konfirmasi) tidak diproses.
 if(msg.key.fromMe)return false;
 const resultStatus=parseAirbotResult(body,order.imei);
 if(!resultStatus)return false;
 // Kunci order sebelum mengirim pesan untuk menghindari double invoice.
 if(resultStatus==='success'){try{settle(order)}catch(e){console.error('[WALLET SETTLEMENT]',order.id,e.message);order.billingError=e.message;save();return false}}else release(order);order.status=resultStatus;if(resultStatus==='success')order.result=String(body).trim().slice(0,4000);else order.reason=String(body).trim().slice(0,1000);order.finishedAt=new Date().toISOString();order.finishedDate=today();save();
 const label=resultStatus==='success'?'✅ SUCCESS':resultStatus==='failed'?'❌ FAILED':'⚠️ TIDAK TERSEDIA';
 const result=[title(order.service),'│ 📱 IMEI : '+order.imei,'│ '+label,...(resultStatus==='success'?['│ 💰 Harga : '+rup(order.price)]:[]),'╰── CUAN-BOT'].join('\n');
 try{
  await sock.sendMessage(order.group,{text:result},{quoted:{key:order.originKey,message:{conversation:'/'+order.service+' '+order.imei}}});
 }catch(e){
  console.error('[IMEI CENTER RESULT REPLY]',e.message);
  try{await sock.sendMessage(order.group,{text:result})}catch(err){console.error('[IMEI CENTER RESULT]',err.message);order.deliveryError=true;save()}
 }
 return true;
}


let digiposSyncStarted=false;
function startDigiposSync(getSock){
 if(digiposSyncStarted)return;
 digiposSyncStarted=true;
 let busy=false;
 const tick=async()=>{
  if(busy)return;
  busy=true;
  try{
   const sock=getSock();
   if(!sock)return;
   // Retry final WhatsApp notices after transient delivery failures.
   for(const order of state.orders.filter(o=>o.service==='1b'&&o.provider==='digipos'&&['success','failed'].includes(o.status)&&o.finalNotificationText&&!o.finalNotificationSentAt).slice(0,10)){
    if(!order.group)continue;
    try{await sock.sendMessage(order.group,{text:order.finalNotificationText});order.finalNotificationSentAt=new Date().toISOString();delete order.finalNotificationText;save()}
    catch(e){console.error('[DIGIPOS SYNC RETRY]',order.id,e.message)}
   }
   const digipos=require('./digipos');
   // Avoid launching Chromium for the same pending order every 2 minutes.
   const now=Date.now();
   // Check every 2 minutes; only explicit final history evidence can settle an order.
   const pending=state.orders.filter(o=>o.service==='1b'&&o.provider==='digipos'&&['manual_review','processing'].includes(o.status)&&o.submissionAttempted&&(!Number.isFinite(Date.parse(o.lastDigiposHistoryCheckAt))||now-Date.parse(o.lastDigiposHistoryCheckAt)>=2*60*1000)).slice(0,15);
   for(const order of pending){
    order.lastDigiposHistoryCheckAt=new Date().toISOString();save();
    const checked=await digipos.checkHistory(order.imei,order.providerOrderId);
    if(!['success','failed'].includes(checked.status))continue;
    if(!['manual_review','processing'].includes(order.status))continue;
    // A final result must be confirmed in history; submission alone is never DONE.
    if(checked.status==='success'){
     try{settle(order)}catch(e){order.billingError=e.message;save();continue}
    }else{
     release(order);
    }
    order.status=checked.status;
    order.providerStatus=checked.status;
    order.providerReason=checked.reason;
    if(checked.orderId)order.providerOrderId=checked.orderId;
    order.finishedAt=new Date().toISOString();
    order.finishedDate=today();
    save();
    const message='CUAN-BOT • DIGIPOS 1B\nOrder: '+order.id+'\nDigiPOS: '+(order.providerOrderId||'-')+'\nIMEI: '+order.imei+'\nStatus: '+(checked.status==='success'?'DONE':'FAILED')+'\n'+checked.reason;
    order.finalNotificationText=message;save();
    try{await sock.sendMessage(order.group,{text:message});order.finalNotificationSentAt=new Date().toISOString();delete order.finalNotificationText;save()}
    catch(e){console.error('[DIGIPOS SYNC NOTIFY]',order.id,e.message)}
   }
  }catch(e){console.error('[DIGIPOS SYNC]',e.message)}
  finally{busy=false}
 };
 const timer=setInterval(tick,120000);
 timer.unref?.();
 setTimeout(tick,15000).unref?.();
}
module.exports={startDigiposSync,command,payment,cancelQuoted,operatorReply,parseAirbotResult,invoice,state,today,ownerJid,rup};
