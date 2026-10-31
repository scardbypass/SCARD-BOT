const {state,allowed,operational,price}=require('../lib/imeiCenter/store');
const services=['3b','1b','3bs','3bd'];
const item=(command,desc)=>'│  *'+command+'*  — '+desc;
const section=(lines,title,entries)=>{if(!entries.length)return;lines.push('│','├── '+title,...entries.map(([c,d])=>item(c,d)))};
module.exports={commands:['menu','help'],registered:false,async run({reply,isOwner,msg}){
 const jid=msg?.key?.remoteJid||'',group=jid.endsWith('@g.us');
 const seller=group?state.settings.sellerGroups[jid]:null;
 const lines=['╭──〔 *CUAN-BOT* 〕','│ _Provider Pusat • Command Center_'];
 if(group){
  if(!seller){lines.push('│','│ 🔒 Grup belum terdaftar sebagai seller.');}
  else{
   const active=services.filter(s=>allowed(s,jid)&&price(s,jid)>0);
   section(lines,'📱 *LAYANAN IMEI*',active.map(s=>['/'+s,'Harga & order'+(operational(s)?'':' • Tutup')]));
   if(active.length)section(lines,'🧾 *TAGIHAN*',[['/'+active[0]+' invoice','Lihat invoice grup']]);
   if(state.settings.apiGlobalEnabled)section(lines,'🌐 *DHRU API*',[['/apikey','Lihat akses API seller'],['/api docs','Dokumentasi API'],['/api status','Status API']]);
   section(lines,'ℹ️ *INFORMASI*',[['/menu','Tampilkan menu']]);
  }
 }else{
  section(lines,'👤 *AKUN*',[['/akun','Profil & saldo pribadi'],['/menu','Tampilkan menu']]);
  section(lines,'🎬 *MEDIA*',[['/download','Unduh video'],['/audio','Unduh audio'],['/stiker','Buat stiker'],['/lihat','Lihat sekali lihat']]);
  section(lines,'🌐 *UTILITAS*',[['/whois','Informasi domain'],['/statusweb','Status website']]);
  if(isOwner){
   section(lines,'👑 *OWNER • SELLER*',[['/3b add','Daftarkan grup seller'],['/3b del','Hapus grup seller'],['/3b on / off','Aktif/nonaktif layanan'],['/3b harga 20000','Harga seller'],['/3b harga global 25000','Harga global'],['/3b bank BCA 123 NAMA','Rekening invoice'],['/payment all','Konfirmasi pembayaran'],['/jam','Jam operasional']]);
   section(lines,'⚙️ *OWNER • OPERATOR*',[['/3b operator set','Operator 3B'],['/1b operator set','Operator 1B'],['/3bs operator set','Operator 3BS'],['/3bd operator set','Operator 3BD']]);
   section(lines,'🔐 *OWNER • API*',[['/api on / off','API seller'],['/api global on / off','API seluruh seller'],['/api reset confirm','Rotasi API key (di grup seller)']]);
   section(lines,'🛠️ *OWNER • SISTEM*',[['/monitor','Monitor website'],['/saldoceir','Saldo provider'],['/provider','Pengaturan provider'],['/airbot 100000','Deposit AirBot'],['/depoapi','Konfirmasi topup'],['/aion / aioff','Gemini AI'],['/vps','Status VPS'],['/logs','Log PM2'],['/cekupdate','Cek dependency'],['/updatebot','Update bot'],['/backup','Backup data'],['/clear','Bersihkan file'],['/promosi','Promosi'],['/importwa','Export subscriber'],['/getid','ID grup'],['/nomergrup','Export nomor grup']]);
  }
 }
 lines.push('│','╰── *CUAN-BOT • '+(group?'SELLER':isOwner?'OWNER':'MEMBER')+'*');
 return reply(lines.join('\n'));
}};
