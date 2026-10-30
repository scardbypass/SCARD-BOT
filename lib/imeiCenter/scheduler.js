const {state,save,outstanding}=require('./store');
const {invoice,today,ownerJid,rup}=require('./core');
let timer=null,running=false;
const hour=()=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
const yesterday=()=>{const d=new Date(Date.now()-86400000);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
async function tick(getSock){if(running)return;const sock=getSock();if(!sock)return;const now=hour(),date=today();if(now!=='21:00'&&now!=='00:00')return;running=true;
try{
 if(now==='21:00'){for(const g of Object.keys(state.settings.sellerGroups)){const key='invoice:'+date+':'+g;if(state.jobs[key]||!outstanding(g).length)continue;try{await sock.sendMessage(g,{text:invoice(g)});state.jobs[key]=new Date().toISOString();save()}catch(e){console.error('[IMEI INVOICE]',g,e.message)}}}
 if(now==='00:00'){
  const target=yesterday(),key='archive:'+target;
  if(!state.jobs[key]){
   const orders=state.orders.filter(o=>o.date===target||o.finishedDate===target),payments=state.payments.filter(p=>p.paidAt.slice(0,10)===target);
   const summary=orders.filter(o=>o.finishedDate===target&&o.status==='success');
   const byGroup={};for(const o of summary){const x=byGroup[o.group]||(byGroup[o.group]={count:0,total:0});x.count++;x.total+=o.price}
   const backup={date:target,exportedAt:new Date().toISOString(),orders,payments,summary:byGroup};
   const text=['╭──〔 SUPER-BOT • IMEI REPORT 〕','│ 📅 '+target,'│ ✅ Sukses : '+summary.length,...Object.entries(byGroup).map(([g,x])=>'│ '+g+' : '+x.count+' • '+rup(x.total)),'│ 💵 Total : '+rup(summary.reduce((a,o)=>a+o.price,0)),'│ 📁 Backup JSON dilampirkan','╰── SUPER-BOT'].join('\n');
   const dest=ownerJid();if(!/^\d+@s\.whatsapp\.net$/.test(dest))throw Error('OWNER_NUMBER belum diatur');
   await sock.sendMessage(dest,{text});
   await sock.sendMessage(dest,{document:Buffer.from(JSON.stringify(backup,null,2)),fileName:'imei-history-'+target+'.json',mimetype:'application/json',caption:'Backup riwayat IMEI '+target});
   state.jobs[key]=new Date().toISOString();
   // Riwayat paid/failed/rejected selesai diarsipkan. Pending dan outstanding tetap disimpan.
   state.orders=state.orders.filter(o=>!((o.date===target||o.finishedDate===target)&&(o.source!=='dhru'&&(['rejected','failed','unavailable','cancelled'].includes(o.status)||(o.status==='success'&&o.paidAt)))));
   state.payments=state.payments.filter(p=>p.paidAt.slice(0,10)!==target);
   save();
  }
 }
}catch(e){console.error('[IMEI SCHEDULER]',e.message)}finally{running=false}}
function start(getSock){if(timer)return;timer=setInterval(()=>tick(getSock).catch(e=>console.error('[IMEI TICK]',e.message)),15000);timer.unref?.();console.log('🧾 IMEI Center invoice 21:00 / archive 00:00 WIB')}
module.exports={start,tick};
