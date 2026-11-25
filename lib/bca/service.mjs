let busy=false;
const rupiah=n=>'Rp'+n.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2});
export async function checkBca(env=process.env, runner){
 if(busy)return '⚠️ Pengecekan sedang berjalan.';
 if(env.BCA_ENABLED!=='true')return '⚠️ Layanan BCA nonaktif.';
 if(typeof runner!=='function')return '⚠️ Client bank belum dikonfigurasi.';
 busy=true;
 try{
 const ids=Object.keys(env).map(k=>/^BCA_(\d+)_ENABLED$/.exec(k)?.[1]).filter(Boolean).sort((a,b)=>Number(a)-Number(b));
 const lines=['🏦 SCARD BANKING CENTER','━━━━━━━━━━━━━━━━']; let total=0,ok=0,active=0;
 for(const id of ids){const p='BCA_'+id+'_'; const alias=String(env[p+'ALIAS']||'BCA '+id).replace(/[\r\n]/g,' '); const account=env[p+'ACCOUNT']||'';
 if(env[p+'ENABLED']!=='true')continue; active++;
 if(!env[p+'USERNAME']||!env[p+'PASSWORD']||!/^\d{10}$/.test(account)){lines.push(alias+': konfigurasi belum lengkap');continue;}
 try{const r=await runner(env[p+'USERNAME'],env[p+'PASSWORD'],account); if(!r.ok||!Number.isFinite(r.balance))throw Error(); total+=r.balance;ok++;lines.push(alias+'\nNo. Rek: '+account+'\nSaldo Efektif: '+rupiah(r.balance));if(!r.logoutClicked)lines.push('Logout belum terkonfirmasi.');}catch{lines.push(alias+': gagal cek, saldo tidak tersedia');}
 }
 if(!active)lines.push('Tidak ada rekening aktif.');
 lines.push('━━━━━━━━━━━━━━━━','Total saldo terbaca ('+ok+'/'+active+'): '+(ok?rupiah(total):'—'));lines.push('━━━━━━━━━━━━━━━━','Ingat, kamu miskin!! Tetap bekerja jadi budak 🤪');return lines.join('\n');
 }finally{busy=false;}
}
