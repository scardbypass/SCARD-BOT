const {state,save,wallet,available,adjust}=require('../lib/imeiCenter/store');
const rup=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
module.exports={commands:['saldo','metode','mutasi','invoice'],registered:false,async run({msg,reply,command,args,isOwner,phone}){
 const g=msg?.key?.remoteJid||'';if(!g.endsWith('@g.us'))return reply('❌ Perintah hanya untuk grup seller.');
 if(!state.settings.sellerGroups[g])return reply('🔒 Grup seller belum terdaftar.');
 const w=wallet(g),cmd=command.toLowerCase(),action=String(args[0]||'').toLowerCase();
 if(cmd==='metode'){
  if(!isOwner)return reply('❌ Khusus owner.');
  if(!['prepaid','postpaid'].includes(action))return reply(['╭──〔 *CUAN-BOT • METODE* 〕','│ 💳 Aktif: '+w.mode.toUpperCase(),'│','│ /metode prepaid','│ ↳ Potong saldo grup saat SUCCESS','│','│ /metode postpaid','│ ↳ Tagihan invoice saat SUCCESS','│','│ 👑 Switch hanya untuk owner','╰── CUAN-BOT'].join('\n'));
  if(Object.keys(w.holds).length||state.orders.some(o=>o.group===g&&['checking','pending','processing'].includes(o.status)))return reply('❌ Masih ada order aktif. Tunggu selesai.');
  if(action==='prepaid'&&state.orders.some(o=>o.group===g&&o.status==='success'&&!o.paidAt&&o.paymentMode!=='prepaid'))return reply('❌ Lunasi invoice POSTPAID lama terlebih dahulu.');
  if(w.mode===action)return reply('ℹ️ Metode '+action.toUpperCase()+' sudah aktif.');
  w.mode=action;save();return reply('✅ Metode pembayaran grup berhasil diubah ke '+action.toUpperCase()+'\n'+(action==='prepaid'?'💰 Saldo tersedia: '+rup(available(g)):'🧾 Order sukses berikutnya masuk invoice.'));
 }
 if(cmd==='saldo'){
  if(['add','kurang'].includes(action)){
   if(!isOwner)return reply('❌ Khusus owner.');
   if(!/^[1-9]\d*$/.test(String(args[1]||''))||args.length!==2)return reply('Format: /saldo add 100000 atau /saldo kurang 50000');
   const amount=Number(args[1])*(action==='kurang'?-1:1);
   if(!adjust(g,amount,phone||'owner'))return reply('❌ Perubahan saldo ditolak.');
   return reply('✅ '+(amount>0?'Top up':'Koreksi')+' '+rup(Math.abs(amount))+'\n💰 Saldo tersedia: '+rup(available(g)));
  }
  return reply(['╭──〔 *CUAN-BOT • SALDO* 〕','│ 💳 Metode: '+w.mode.toUpperCase(),'│ 💰 Total: '+rup(w.balance),'│ 🔒 Ditahan: '+rup(w.balance-available(g)),'│ ✅ Tersedia: '+rup(available(g)),'╰────────────────'].join('\n'));
 }
 if(cmd==='mutasi'){
  const list=(state.walletLedger||[]).filter(x=>x.group===g).slice(-10).reverse();
  return reply('🧾 *MUTASI SALDO*\n'+(list.length?list.map(x=>(x.amount>=0?'➕ ':'➖ ')+rup(Math.abs(x.amount))+' • '+x.type+' • '+new Date(x.at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})).join('\n'):'Belum ada mutasi.'));
 }
 if(cmd==='invoice')return reply(require('../lib/imeiCenter/core').invoice(g));
}};