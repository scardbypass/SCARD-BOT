const {state,save,allowed,price,operational}=require('../lib/imeiCenter/store');
const SERVICES=['3b','1b','3bs','3bd'];
const valid=id=>/^\d{10,30}@g\.us$/.test(String(id||''));
const money=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
function info(id){
 const seller=state.settings.sellerGroups[id];
 if(!seller)return '🔒 Grup belum terdaftar sebagai seller.';
 const lines=['╭──〔 CUAN-BOT • INFORMASI GRUP 〕','│ Status: '+(seller.enabled!==false&&state.settings.enabled!==false?'🟢 AKTIF':'🔴 NONAKTIF'),'├── LAYANAN'];
 for(const s of SERVICES){
  const active=allowed(s,id)&&price(s,id)>0&&operational(s);
  lines.push('│ '+(active?'🟢':'🔴')+' '+s.toUpperCase()+' • '+money(price(s,id))+' • '+(active?'BUKA':'TUTUP'));
 }
 lines.push('│ Ketik /3b atau /1b untuk cara order.','╰── CUAN-BOT');
 return lines.join('\n');
}
module.exports={commands:['grupinfo','grupset','grupoff'],registered:false,async run({sock,msg,reply,command,args,isOwner}){
 const current=String(msg?.key?.remoteJid||'');
 if(command==='grupinfo'){
  if(!args.length)return current.endsWith('@g.us')?reply(info(current)):reply('Gunakan /grupinfo di grup seller.');
  if(!isOwner)return reply('❌ Khusus owner untuk melihat grup lain.');
  return args.length===1&&valid(args[0])?reply(info(args[0])):reply('Format: /grupinfo ID_GRUP');
 }
 if(!isOwner)return reply('❌ Khusus owner.');
 const [id,service,raw]=args;
 if(!valid(id)||!SERVICES.includes(String(service||'').toLowerCase()))return reply('Format: /grupset ID_GRUP 3b 90000 atau /grupoff ID_GRUP 3b');
 const s=service.toLowerCase();
 if(command==='grupset'&&(args.length!==3||!/^\d+$/.test(raw||'')||!Number.isSafeInteger(Number(raw))||Number(raw)<=0))return reply('Format: /grupset ID_GRUP 3b 90000 (harga positif)');
 if(command==='grupoff'&&args.length!==2)return reply('Format: /grupoff ID_GRUP 3b');
 let meta;
 try{meta=await sock.groupMetadata(id)}catch(e){return reply('❌ Grup tidak dapat diakses. Pastikan bot sudah join dan ID benar.')}
 const seller=state.settings.sellerGroups[id]||{enabled:true,services:{},prices:{}};
 seller.services||={};seller.prices||={};
 if(command==='grupset'){seller.enabled=true;seller.services[s]=true;seller.prices[s]=Number(raw)}
 else seller.services[s]=false;
 state.settings.sellerGroups[id]=seller;
 save();
 const message=command==='grupset'
 ?'✅ CUAN-BOT • LAYANAN AKTIF\n📦 '+s.toUpperCase()+'\n💰 '+money(price(s,id))+' / SUCCESS\n📱 Order: /'+s+' 356424104776994'
 :'🔴 CUAN-BOT • LAYANAN NONAKTIF\n📦 '+s.toUpperCase();
 try{await sock.sendMessage(id,{text:message})}
 catch(e){return reply('⚠️ Pengaturan tersimpan, tetapi pengumuman ke grup gagal terkirim.')}
 return reply('✅ Pengaturan tersimpan dan diumumkan ke '+(meta.subject||id));
}};