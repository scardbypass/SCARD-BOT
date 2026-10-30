const {state,save,price,allowed,outstanding,active}=require('./store');
const {check}=require('./ceirgo');
const SERVICES=['3b','1b','3bs','3bd'];
const rup=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
const jid=msg=>msg?.key?.remoteJid||'';
const group=msg=>jid(msg).endsWith('@g.us');
const title=s=>'╭──〔 '+(process.env.BOT_NAME||'SUPER-BOT')+' • '+s.toUpperCase()+' 〕';
const bank=()=>{const b=state.settings.bank;return b?'\n🏦 '+b.name+'\n💳 '+b.number+'\n👤 '+b.holder:''};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const ownerJid=()=>String(process.env.OWNER_NUMBER||'').replace(/\D/g,'')+'@s.whatsapp.net';
function settingsFor(g){return state.settings.sellerGroups[g]||null}
function menu(service,g){return [title(service),'│ 📱 '+service.toUpperCase()+' IMEI SERVICE','│ 🟢 Status : '+(allowed(service,g)?'ONLINE':'OFFLINE'),'│ 💰 Harga : '+rup(price(service,g))+' / SUCCESS','│','├── CARA ORDER','│ /'+service+' 356424104776994','│','│ ✅ UNKNOWN : Diterima','│ ❌ ROAMER / REGISTERED : Ditolak','│ ⚠️ API ERROR : Ditolak','│ 💳 Bayar hanya jika SUCCESS','╰── SUPER-BOT'].join('\n')}
async function command(ctx){
 const {sock,msg,reply,command,args,isOwner}=ctx,service=command.toLowerCase(),g=jid(msg),a=String(args[0]||'').toLowerCase(),s=state.settings;
 if(!group(msg))return;
 const seller=settingsFor(g);
 if(a==='operator'&&isOwner){const op=String(args[1]||'').toLowerCase();if(op==='set'){s.operatorGroups[service]=g;save();return reply('✅ Grup ini menjadi operator '+service.toUpperCase())}if(op==='off'){delete s.operatorGroups[service];save();return reply('✅ Operator '+service.toUpperCase()+' dinonaktifkan')}return reply('👥 Operator '+service.toUpperCase()+': '+(s.operatorGroups[service]||'Belum diatur'))}
 if(a==='add'&&isOwner){s.sellerGroups[g]=s.sellerGroups[g]||{enabled:true,services:{},prices:{}};save();return reply('✅ Grup seller terdaftar. /'+service+' untuk menu')}
 if(a==='del'&&isOwner){if(outstanding(g).length||state.orders.some(o=>o.group===g&&['checking','pending','processing'].includes(o.status)))return reply('❌ Masih ada tagihan/order aktif. Lunasi dan selesaikan terlebih dahulu.');delete s.sellerGroups[g];save();return reply('✅ Grup seller dihapus')}
 if(a==='harga'&&isOwner){if(args[1]==='global'&&/^\d+$/.test(args[2]||'')){s.globalPrices[service]=Number(args[2]);save();return reply('✅ Harga global '+service.toUpperCase()+': '+rup(s.globalPrices[service]))}if(args[1]==='default'){if(!seller)return reply('❌ Grup belum terdaftar');delete seller.prices[service];save();return reply('✅ Harga mengikuti global: '+rup(price(service,g)))}if(/^\d+$/.test(args[1]||'')&&seller){seller.prices[service]=Number(args[1]);save();return reply('✅ Harga khusus grup: '+rup(price(service,g)))}return reply('Gunakan /'+service+' harga global 25000 | harga 20000 | harga default')}
 if(a==='global'&&isOwner&&['on','off'].includes(args[1])){s.enabled=args[1]==='on';save();return reply('✅ Semua layanan '+args[1].toUpperCase())}
 if(['on','off'].includes(a)&&isOwner){if(!seller)return reply('❌ Grup belum terdaftar');seller.services[service]=a==='on';save();return reply('✅ '+service.toUpperCase()+' '+a.toUpperCase())}
 if(a==='bank'&&isOwner){if(args[1]==='off'){s.bank=null;save();return reply('✅ Rekening dihapus')}if(args.length>=4){s.bank={name:args[1],number:args[2],holder:args.slice(3).join(' ')};save();return reply('✅ Rekening invoice disimpan')}return reply('🏦 '+(s.bank?JSON.stringify(s.bank):'Belum diatur')+'\n/'+service+' bank BCA 1234567890 NAMA')}
 if(a==='invoice'){if(!seller)return reply('❌ Grup belum terdaftar');return reply(invoice(g))}
 if(a==='status'&&isOwner)return reply('⚙️ '+service.toUpperCase()+'\nOperator: '+(s.operatorGroups[service]||'-')+'\nHarga global: '+rup(s.globalPrices[service])+'\nHarga grup: '+rup(price(service,g))+'\nGlobal: '+(s.enabled?'ON':'OFF'))}
 if(!seller)return reply('🔒 Grup ini belum terdaftar untuk layanan IMEI.');
 if(!a)return reply(menu(service,g));
 if(!/^\d{15}$/.test(a)||args.length!==1)return reply('❌ Format: /'+service+' 356424104776994');
 if(!allowed(service,g))return reply('🔴 Layanan '+service.toUpperCase()+' sedang OFFLINE.');
 if(!s.operatorGroups[service])return reply('⚠️ Grup operator '+service.toUpperCase()+' belum diatur.');
 if(price(service,g)<=0)return reply('⚠️ Harga layanan belum diatur oleh owner.');
 if(active(a)&&!(msg.apiOrderId&&active(a).id===msg.apiOrderId))return reply([title(service),'│ ⚠️ ORDER DITOLAK','│ 📱 IMEI : '+a,'│ 🔒 IMEI sedang diproses','│ oleh seller lain.','╰── SUPER-BOT'].join('\n'));
 // Lock sebelum request API agar order bersamaan tidak lolos
 let order={id:msg.apiOrderId||Date.now().toString(36)+Math.random().toString(36).slice(2,8),service,imei:a,group:g,originKey:msg.key,source:msg.apiOrderId?'dhru':'whatsapp',price:price(service,g),status:'checking',createdAt:new Date().toISOString(),date:today()};
 if(msg.apiOrderId){const reserved=state.orders.find(o=>o.id===msg.apiOrderId);if(reserved){Object.assign(reserved,order);order=reserved}else state.orders.push(order)}else state.orders.push(order);save();
 await reply('🔍 IMEI '+a+' sedang diverifikasi melalui CeirGo...');
 let ceir;try{ceir=await check(a)}catch(e){order.status='rejected';order.reason='API ERROR';save();console.error('[IMEI CENTER API]',e.message);return reply('⚠️ VERIFIKASI GAGAL\n📱 '+a+'\n❌ Order tidak diteruskan. Coba lagi nanti.')}
 if(order.status==='cancelled')return;
 if(ceir!=='UNKNOWN'){order.status='rejected';order.reason=ceir;save();return reply('❌ ORDER REJECTED\n📱 '+a+'\n📡 CEIR : '+ceir+'\n💰 Biaya '+service.toUpperCase()+' : Rp0')}
 order.status='pending';save();
 const text='/'+service+' '+a;
 try{if(order.status==='cancelled')return;const target=s.operatorGroups[service];const sent=await sock.sendMessage(target,{text});order.operatorGroup=target;order.operatorKey=sent.key;order.status='processing';save();return reply('📱 IMEI : '+a+'\n📡 CEIR : UNKNOWN\n🟡 MENUNGGU PROSES')}
 catch(e){order.status='pending';save();console.error('[IMEI CENTER FORWARD]',e.message);return reply('⚠️ IMEI lolos cek tetapi gagal diteruskan. Owner perlu memeriksa order.')}

}
function invoice(g){const orders=outstanding(g),sum=orders.reduce((a,o)=>a+o.price,0);const grouped=SERVICES.map(s=>{const a=orders.filter(o=>o.service===s);return a.length?'│ '+s.toUpperCase()+' : '+a.length+' IMEI • '+rup(a.reduce((v,o)=>v+o.price,0)):null}).filter(Boolean);return [title('INVOICE'),'│ 🧾 TAGIHAN BELUM DIBAYAR','│ 📦 Total : '+orders.length+' IMEI',...grouped,'│ 💵 TOTAL : '+rup(sum),bank(),'│ 🔴 '+(sum?'UNPAID':'PAID / NIHIL'),'╰── SUPER-BOT'].join('\n')}
async function payment({msg,reply,args,isOwner}){if(!group(msg))return reply('❌ /payment hanya di grup seller');if(!isOwner)return reply('❌ Khusus owner');const g=jid(msg);if(!settingsFor(g))return reply('❌ Grup belum terdaftar');const type=String(args[0]||'all').toLowerCase();if(type!=='all'&&!SERVICES.includes(type))return reply('Gunakan /payment all atau /payment 3b|1b|3bs|3bd');const orders=outstanding(g,type==='all'?null:type);if(!orders.length)return reply('✅ Tidak ada tagihan.');if(String(args[1]||'')!=='confirm')return reply('⚠️ Konfirmasi pelunasan '+orders.length+' IMEI sejumlah '+rup(orders.reduce((a,o)=>a+o.price,0))+'\nKetik /payment '+type+' confirm');const paidAt=new Date().toISOString(),total=orders.reduce((a,o)=>a+o.price,0);for(const o of orders)o.paidAt=paidAt;state.payments.push({group:g,service:type,paidAt,total,orderIds:orders.map(o=>o.id)});save();return reply('✅ PAYMENT CONFIRMED\n💰 Dibayar : '+rup(total)+'\n📦 Order : '+orders.length+'\n💵 Sisa tagihan : '+rup(outstanding(g).reduce((a,o)=>a+o.price,0)))}
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
 if(!/^\/cancel(?:\s+)?$/i.test(String(body||'').trim()))return false;
 const g=jid(msg);
 const context=msg.message?.extendedTextMessage?.contextInfo||{};
 const quotedId=context.stanzaId;
 if(!isOwner){await sock.sendMessage(g,{text:'❌ /cancel hanya untuk owner.'},{quoted:msg});return true}
 if(!quotedId){await sock.sendMessage(g,{text:'⚠️ Reply pesan order IMEI lalu ketik /cancel.'},{quoted:msg});return true}
 const o=state.orders.find(x=>x.status==='processing'||x.status==='checking'||x.status==='pending'?((x.operatorGroup===g&&x.operatorKey?.id===quotedId)||(x.group===g&&x.originKey?.id===quotedId)):false);
 if(!o){await sock.sendMessage(g,{text:'⚠️ Order aktif tidak ditemukan atau sudah selesai.'},{quoted:msg});return true}
 o.status='cancelled';o.cancelledAt=new Date().toISOString();o.cancelledBy='owner';o.finishedAt=o.cancelledAt;save();
 const message=[title(o.service),'│ 📱 IMEI : '+o.imei,'│ 🚫 CANCELLED','│ 🆔 Order : '+o.id,'│ 💰 Biaya : Rp0','│ 👑 Dibatalkan owner','╰── SUPER-BOT'].join('\n');
 await sock.sendMessage(g,{text:message},{quoted:msg});
 const destinations=[o.group,o.operatorGroup].filter((dest,i,all)=>dest&&dest!==g&&all.indexOf(dest)===i);
 for(const dest of destinations){try{await sock.sendMessage(dest,{text:message})}catch(e){console.error('[CANCEL NOTIFY]',dest,e.message)}}
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
 order.status=resultStatus;order.finishedAt=new Date().toISOString();order.finishedDate=today();save();
 const label=resultStatus==='success'?'✅ SUCCESS':resultStatus==='failed'?'❌ FAILED':'⚠️ TIDAK TERSEDIA';
 const result=[title(order.service),'│ 📱 IMEI : '+order.imei,'│ '+label,...(resultStatus==='success'?['│ 💰 Harga : '+rup(order.price)]:[]),'╰── SUPER-BOT'].join('\n');
 try{
  await sock.sendMessage(order.group,{text:result},{quoted:{key:order.originKey,message:{conversation:'/'+order.service+' '+order.imei}}});
 }catch(e){
  console.error('[IMEI CENTER RESULT REPLY]',e.message);
  try{await sock.sendMessage(order.group,{text:result})}catch(err){console.error('[IMEI CENTER RESULT]',err.message);order.deliveryError=true;save()}
 }
 return true;
}

module.exports={command,payment,cancelQuoted,operatorReply,parseAirbotResult,invoice,state,today,ownerJid,rup};
