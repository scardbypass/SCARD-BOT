const {loadPlugins}=require('../lib/pluginLoader');
const {state,allowed,operational,price}=require('../lib/imeiCenter/store');
const services=['3b','1b','3bs','3bd'];
const row=(command,description)=>'│  • *'+command+'* — '+description;
module.exports={commands:['menu','help'],registered:false,async run({reply,isOwner,msg}){
 const chat=msg?.key?.remoteJid||'';
 const inGroup=chat.endsWith('@g.us');
 const seller=inGroup?state.settings.sellerGroups[chat]:null;
 const lines=['╭──〔 *PROVIDER PUSAT* 〕','│ _Seller Service Center_','│','├─ 📌 *MENU UTAMA*',row('/akun','Profil & saldo'),row('/help','Tampilkan menu')];
 if(inGroup){
  if(seller){
   const available=services.filter(s=>allowed(s,chat)&&price(s,chat)>0);
   if(available.length){
    lines.push('│','├─ 📱 *LAYANAN IMEI*');
    for(const s of available)lines.push(row('/'+s,'Cek harga & order'+(operational(s)?'':' (tutup)')));
    lines.push(row('/'+available[0]+' invoice','Lihat tagihan'));
   }
   if(state.settings.apiGlobalEnabled){
    lines.push('│','├─ 🌐 *DHRU API*',row('/apikey','Lihat akses API grup'),row('/api docs','Panduan integrasi'),row('/api status','Status layanan'));
   }
  }else lines.push('│','│ 🔒 Grup belum terdaftar sebagai seller.');

 }else{
  lines.push('│','├─ 🎬 *MEDIA*',row('/download','Unduh video'),row('/audio','Unduh audio'),row('/stiker','Buat stiker'),row('/lihat','Lihat media sekali lihat'),'│','├─ 🌐 *UTILITAS*',row('/whois','Informasi domain'),row('/statusweb','Status website'));
  if(isOwner){
   lines.push('│','├─ 👑 *OWNER CONTROL*',row('/3b add','Daftarkan grup seller'),row('/3b operator set','Atur operator'),row('/3b harga global 25000','Harga global'),row('/api global on','Aktifkan DHRU'),row('/provider','Pengaturan provider'),row('/monitor','Monitor website'),row('/saldoceir','Saldo provider'),row('/vps','Status server'),row('/backup','Backup bot'),row('/logs','Log bot'));
  }
 }
 lines.push('│','╰── *PROVIDER PUSAT*');
 return reply(lines.join('\n'));
}};
