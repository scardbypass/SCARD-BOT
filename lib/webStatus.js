const axios=require('axios');const tls=require('tls');

function normalizeDomain(input=''){
 let s=String(input).trim().toLowerCase().replace(/^https?:\/\//,'').split('/')[0].split(':')[0].replace(/^www\./,'');
 return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)?s:null;
}
function sslInfo(host,timeout=10000){
 return new Promise(resolve=>{
  let done=false;const finish=x=>{if(done)return;done=true;resolve(x)};
  const socket=tls.connect({host,port:443,servername:host,rejectUnauthorized:false},()=>{
   const c=socket.getPeerCertificate();const validTo=c?.valid_to?new Date(c.valid_to):null;
   const valid=socket.authorized&&validTo&&validTo>Date.now();
   finish({valid:!!valid,authorized:socket.authorized,expires:validTo?validTo.toISOString():null,issuer:c?.issuer?.O||c?.issuer?.CN||'-',error:socket.authorizationError||null});socket.end();
  });
  socket.setTimeout(timeout,()=>{socket.destroy();finish({valid:false,error:'SSL timeout'})});
  socket.on('error',e=>finish({valid:false,error:e.message}));
 });
}
async function checkWebsite(input){
 const domain=normalizeDomain(input);if(!domain)throw new Error('DOMAIN_INVALID');
 const url='https://'+domain;const start=Date.now();
 try{
  const res=await axios.get(url,{timeout:Number(process.env.MONITOR_TIMEOUT_MS||12000),maxRedirects:5,validateStatus:()=>true,headers:{'User-Agent':'SCARD-BOT Website Monitor/1.0'}});
  const ms=Date.now()-start;const ssl=await sslInfo(domain);
  return {domain,url,up:res.status>=200&&res.status<500,status:res.status,responseMs:ms,finalUrl:res.request?.res?.responseUrl||url,ssl};
 }catch(e){
  const ms=Date.now()-start;const ssl=await sslInfo(domain);
  return {domain,url,up:false,status:e.response?.status||0,responseMs:ms,error:e.code||e.message,ssl};
 }
}
module.exports={normalizeDomain,checkWebsite};
