const axios=require('axios');
const base=()=>String(process.env.CEIRGO_API_BASE_URL||'https://ceirgo.id').replace(/\/$/,'');
const timeout=()=>Math.max(3000,Number(process.env.CEIRGO_TIMEOUT_MS||20000));
const headers=()=>{if(!process.env.CEIRGO_API_KEY)throw Error('API CeirGo belum dikonfigurasi');return {Authorization:'Bearer '+process.env.CEIRGO_API_KEY,Accept:'application/json','Content-Type':'application/json'}};
async function api(method,url,data){const r=await axios({method,url:base()+url,data,headers:headers(),timeout:timeout(),validateStatus:x=>x>=200&&x<300});return r.data}
const VALID=['UNKNOWN','ROAMER','REGISTERED'];
function extractStatus(payload,imei){
 const fields=['status_imei','imei_status','ceir_status','ceir','registration_status','registrationStatus','status','result','response','message'];
 const found=[];
 function walk(v,depth=0){if(depth>7||v==null)return;if(typeof v==='string'){const t=v.trim().toUpperCase();if(VALID.includes(t))found.push(t);return}if(Array.isArray(v)){v.forEach(x=>walk(x,depth+1));return}if(typeof v!=='object')return;
  for(const [k,x] of Object.entries(v)){if(k==='order_status'||k==='orderStatus')continue;if(fields.includes(k)||k===imei||/^\d{15}$/.test(k)||k==='items'||k==='results'||k==='data'||k==='result_payload')walk(x,depth+1)}
 }
 walk(payload);
 return [...new Set(found)].length===1?found[0]:null
}
async function check(imei){
 const code=process.env.CEIRGO_IMEI_SERVICE_CODE||'cek_imei';
 const created=await api('post','/api/order',{code,data:{imeis:[imei]}});
 let result=created,orderId=created?.order_id,orderStatus=String(created?.status||'').toLowerCase();
 const tries=Math.max(1,Math.min(30,Number(process.env.CEIRGO_POLL_ATTEMPTS||8)));
 for(let i=0;i<tries;i++){
  if(['failed','error','cancelled'].includes(orderStatus))throw Error('Verifikasi CeirGo gagal');
  if(['success','partial'].includes(orderStatus)){
   const found=extractStatus(result?.result??result?.data?.result_payload??result?.data?.result,imei);
   if(found)return found;
  }
  if(!orderId)break;
  await new Promise(r=>setTimeout(r,Math.max(1000,Number(process.env.CEIRGO_POLL_INTERVAL_MS||3000))));
  result=await api('get','/api/order/'+encodeURIComponent(orderId));
  const d=result?.data||result;orderStatus=String(d?.status||'').toLowerCase();
  if(['success','partial'].includes(orderStatus)){const found=extractStatus(d?.result_payload??d?.result,imei);if(found)return found}
 }
 throw Error('Status IMEI tidak tersedia / belum dikenali');
}
module.exports={check,extractStatus};
