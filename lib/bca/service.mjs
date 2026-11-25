import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const exec=promisify(execFile); let busy=false;
const rupiah=n=>'Rp'+n.toLocaleString('id-ID',{maximumFractionDigits:2});
export async function checkBca(env=process.env, runner=run){
 if(busy)return 'Pengecekan sedang berjalan.';
 if(env.BCA_ENABLED!=='true')return 'BCA nonaktif.';
 busy=true;
 try{
 const ids=Object.keys(env).map(k=>/^BCA_(\d+)_ENABLED$/.exec(k)?.[1]).filter(Boolean).sort((a,b)=>Number(a)-Number(b));
 const lines=['🏦 SCARD BANKING CENTER','━━━━━━━━━━━━━━━━']; let total=0,ok=0,active=0;
 for(const id of ids){const p='BCA_'+id+'_'; const alias=String(env[p+'ALIAS']||'BCA '+id).replace(/[\r\n]/g,' '); const account=env[p+'ACCOUNT']||'';
 if(env[p+'ENABLED']!=='true'){lines.push(alias+': OFF');continue;} active++;
 if(!env[p+'USERNAME']||!env[p+'PASSWORD']||!/^\d{10}$/.test(account)){lines.push(alias+': konfigurasi belum lengkap');continue;}
 try{const r=await runner(env[p+'USERNAME'],env[p+'PASSWORD'],account); if(!r.ok||!Number.isFinite(r.balance))throw Error(); total+=r.balance;ok++;lines.push(alias+' • ******'+account.slice(-4)+'\nSaldo akhir mutasi: '+rupiah(r.balance));if(!r.logoutClicked)lines.push('Logout belum terkonfirmasi.');}catch{lines.push(alias+': gagal cek, saldo tidak tersedia');}
 }
 lines.push('━━━━━━━━━━━━━━━━','Total saldo terbaca ('+ok+'/'+active+'): '+(ok?rupiah(total):'—'));return lines.join('\n');
 }finally{busy=false;}
}
async function run(user,pass,account){const cwd=fileURLToPath(new URL('./client/',import.meta.url)); const {stdout}=await exec(process.execPath,['--import','tsx','run.ts'],{cwd,env:{PATH:process.env.PATH,HOME:process.env.HOME,TZ:'Asia/Jakarta',BCA_RUN_USER:user,BCA_RUN_PASS:pass,BCA_RUN_ACCOUNT:account},timeout:120000,maxBuffer:65536});return JSON.parse(stdout.trim().split('\n').at(-1));}
