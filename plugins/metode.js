'use strict';
const {state,save,wallet,available,outstanding}=require('../lib/imeiCenter/store');
const money=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
module.exports={
 commands:['metode','metodebayar'],
 registered:false,
 ownerOnly:true,
 async run({args,reply,isOwner}){
  if(!isOwner)return reply('❌ Hanya owner yang boleh mengubah metode pembayaran.');
  const group=String(args[0]||'').trim();
  const mode=String(args[1]||'').trim().toLowerCase();
  if(!/^\d{8,25}@g\.us$/.test(group))return reply('💳 *METODE PEMBAYARAN REMOTE*\nFormat: /metode ID_GRUP prepaid|postpaid\nContoh: /metode 120363123456789012@g.us prepaid');
  if(!state.settings.sellerGroups?.[group])return reply('❌ Grup seller belum terdaftar: '+group);
  const w=wallet(group),current=w.mode==='prepaid'?'prepaid':'postpaid';
  if(!mode)return reply('👥 Grup: '+group+'\n💳 Metode: *'+current.toUpperCase()+'*\n💰 Saldo: '+money(w.balance)+'\n💵 Tersedia: '+money(available(group)));
  if(!['prepaid','postpaid'].includes(mode))return reply('❌ Pilih prepaid atau postpaid.');
  if(mode===current)return reply('ℹ️ Metode grup sudah '+mode.toUpperCase());
  const active=state.orders.filter(o=>o.group===group&&['checking','pending','processing','manual_review'].includes(o.status));
  if(active.length||Object.keys(w.holds||{}).length)return reply('⚠️ Tidak bisa ubah metode. Masih ada '+active.length+' order aktif atau saldo tertahan.');
  if(mode==='prepaid'&&outstanding(group).some(o=>o.paymentMode!=='prepaid'))return reply('⚠️ Masih ada tagihan postpaid belum lunas. Lunasi dahulu.');
  w.mode=mode;
  save();
  return reply('✅ *METODE PEMBAYARAN DIPERBARUI*\n👥 Grup: '+group+'\n💳 Sebelumnya: '+current.toUpperCase()+'\n💳 Sekarang: *'+mode.toUpperCase()+'*\n💰 Saldo: '+money(w.balance));
 }
};
