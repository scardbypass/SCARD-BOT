'use strict';
const API_URL='https://telkomsel.cloud/digipos/api/roamer.php';
async function submit(imei,{onBeforeSubmit}={}){
 if(!/^\d{15}$/.test(String(imei)))return {status:'failed',reason:'Invalid IMEI'};
 const key=process.env.DIGIPOS_1BD_API_KEY;
 if(!key)return {status:'disabled',reason:'DIGIPOS_1BD_API_KEY is not configured'};
 if(process.env.DIGIPOS_1BD_ENABLED!=='true')return {status:'disabled',reason:'DIGIPOS_1BD_ENABLED is not true'};
 if(onBeforeSubmit)await onBeforeSubmit();
 let response;
 try{
  response=await fetch(API_URL,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({imei1:String(imei),imeiExpiryDays:'30'}),signal:AbortSignal.timeout(25000)});
 }catch(e){return {status:'manual_review',reason:'API transport uncertain after submit; do not retry automatically'};}
 let data;
 try{data=await response.json()}catch{return {status:'manual_review',reason:'API returned non-JSON response; check provider before retry'};}
 if(data?.ok===true){
  if(!data.orderId||String(data.imei1?.number)!==String(imei)||data.imei1?.eligible!==true)
   return {status:'manual_review',reason:'API success payload inconsistent; verify provider'};
  return {status:'submitted',orderId:String(data.orderId),validUntil:data.imei1?.validUntil||null,expiryDays:String(data.imeiExpiryDays||'30'),reason:'Order accepted by API; final activation not independently verified'};
 }
 if(data?.cooldown)return {status:'manual_review',waitSeconds:Number(data.waitSeconds)||120,reason:'API cooldown; check provider before retry'};
 if(response.status===401||response.status===502||data?.needLogin||/sesi ceir terputus|gagal memproses registrasi/i.test(String(data?.error||'')))
  return {status:'manual_review',reason:String(data?.error||'Provider error; submission outcome uncertain').slice(0,200)};
 if(response.ok&&data?.ok===false&&/tidak eligible|registered/i.test(String(data.error||'')))
  return {status:'failed',reason:String(data.error).slice(0,200)};
 return {status:'manual_review',reason:String(data?.error||'Unknown API response; verify manually').slice(0,200)};
}
module.exports={submit};
