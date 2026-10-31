const {state,allowed,operational,price,wallet,available}=require('../lib/imeiCenter/store');
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
   const w=wallet(jid);lines.push('│','├── 💳 *PEMBAYARAN GRUP*','│ Metode: '+w.mode.toUpperCase(),...(w.mode==='prepaid'?['│ Saldo tersedia: Rp'+available(jid).toLocaleString('id-ID'),'│ Saldo ditahan: Rp'+(w.balance-available(jid)).toLocaleString('id-ID')]:[]));
   const orders=(state.orders||[]).filter(o=>o.group===jid);
   const count=(...statuses)=>orders.filter(o=>statuses.includes(o.status)).length;
   const successful=count('success'),failed=count('failed','unavailable','rejected','cancelled');
   const processing=count('checking','pending','processing');
   const total=orders.length;
   const idr=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
   const completed=orders.filter(o=>o.status==='success');
   const revenue=completed.reduce((sum,o)=>sum+Number(o.price||0),0);
   lines.push('│','├── 📊 *STATISTIK UNLOCK*',
    '│ 📦 Total order     : '+total,
    '│ ✅ Berhasil       : '+successful,
    '│ ❌ Gagal / batal  : '+failed,
    '│ ⏳ Dalam proses  : '+processing,
    '│ 💰 Nilai berhasil: '+idr(revenue));
   const latest=orders.slice().sort((x,y)=>Date.parse(y.createdAt||0)-Date.parse(x.createdAt||0)).slice(0,5);
   lines.push('│','├── 🧾 *RIWAYAT TERAKHIR*');
   if(!latest.length)lines.push('│ _Belum ada riwayat unlock._');
   else for(const o of latest){
    const icon=o.status==='success'?'✅':['failed','unavailable','rejected','cancelled'].includes(o.status)?'❌':'⏳';
    const imei=String(o.imei||'');
    const masked=imei.length===15?imei.slice(0,4)+'•••••••'+imei.slice(-4):'IMEI tersembunyi';
    lines.push('│ '+icon+' '+String(o.service||'-').toUpperCase()+' • '+masked);
   }
   lines.push('│','├── 🕒 *JAM OPERASIONAL • WIB*');
   const available=services.filter(s=>allowed(s,jid)&&price(s,jid)>0);
   if(!available.length)lines.push('│ _Belum ada layanan yang aktif._');
   else for(const service of available){
    const hours=state.settings.operatingHours?.[service];
    const period=hours?.enabled?(hours.open+'–'+hours.close):'24 jam';
    const status=operational(service)?'🟢 BUKA':'🔴 TUTUP';
    lines.push('│ '+service.toUpperCase()+'  '+period+' • '+status);
   }
   if(available.length)section(lines,'📱 *ORDER & TAGIHAN*',[
    ...available.map(service=>['/'+service,'Order IMEI']),
    ['/'+available[0]+' invoice','Lihat tagihan grup']
   ]);
   section(lines,'💰 *KEUANGAN*',[['/saldo','Saldo & metode'],['/mutasi','Riwayat saldo'],['/invoice','Tagihan POSTPAID']]);
   section(lines,'ℹ️ *INFORMASI*',[['/menu','Refresh dashboard']]);
  } }else{
  section(lines,'👤 *AKUN*',[['/akun','Profil & saldo pribadi'],['/menu','Tampilkan menu']]);
  section(lines,'🎬 *MEDIA*',[['/download','Unduh video'],['/audio','Unduh audio'],['/stiker','Buat stiker'],['/lihat','Lihat sekali lihat']]);
  section(lines,'🌐 *UTILITAS*',[['/whois','Informasi domain'],['/statusweb','Status website']]);
  if(isOwner){
   section(lines,'👑 *OWNER • SALDO*',[['/metode prepaid','Gunakan saldo grup'],['/metode postpaid','Gunakan invoice'],['/saldo add 100000','Top up saldo'],['/saldo kurang 50000','Koreksi saldo']]);
   section(lines,'👑 *OWNER • SELLER*',[['/3b add','Daftarkan grup seller'],['/3b del','Hapus grup seller'],['/3b on / off','Aktif/nonaktif layanan'],['/3b harga 20000','Harga seller'],['/3b harga global 25000','Harga global'],['/3b bank BCA 123 NAMA','Rekening invoice'],['/payment all','Konfirmasi pembayaran'],['/jam','Jam operasional']]);
   section(lines,'⚙️ *OWNER • OPERATOR*',[['/3b operator set','Operator 3B'],['/1b operator set','Operator 1B'],['/3bs operator set','Operator 3BS'],['/3bd operator set','Operator 3BD']]);
   section(lines,'🔐 *OWNER • API*',[['/api on / off','API seller'],['/api global on / off','API seluruh seller'],['/api reset confirm','Rotasi API key (di grup seller)']]);
   section(lines,'🛠️ *OWNER • SISTEM*',[['/monitor','Monitor website'],['/saldoceir','Saldo provider'],['/provider','Pengaturan provider'],['/airbot 100000','Deposit AirBot'],['/depoapi','Konfirmasi topup'],['/aion / aioff','Gemini AI'],['/vps','Status VPS'],['/logs','Log PM2'],['/cekupdate','Cek dependency'],['/updatebot','Update bot'],['/backup','Backup data'],['/clear','Bersihkan file'],['/promosi','Promosi'],['/importwa','Export subscriber'],['/getid','ID grup'],['/nomergrup','Export nomor grup']]);
  }
 }
 lines.push('│','╰── *CUAN-BOT • '+(group?'SELLER':isOwner?'OWNER':'MEMBER')+'*');
 return reply(lines.join('\n'));
}};
