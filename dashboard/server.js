'use strict';
const http=require('http'),fs=require('fs'),path=require('path');
const HOST=process.env.DASH_HOST||'127.0.0.1',PORT=Number(process.env.DASH_PORT||3188);
const page=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const DB=path.join(__dirname,'../database/imei-center.json');
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'};
const dateWib=x=>{if(!x)return '';const d=new Date(x);return isNaN(d.getTime())?'':new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
const send=(res,code,body,type)=>{res.writeHead(code,{...headers,'Content-Type':type});res.end(body)};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(req.method!=='GET')return send(res,405,'Method not allowed','text/plain');
 if(url.pathname==='/'){
  return send(res,200,page,'text/html; charset=utf-8');
 }
 if(url.pathname==='/api/data'){
  try{
   const state=JSON.parse(fs.readFileSync(DB,'utf8'));
   const orders=(state.orders||[]).map(o=>({id:o.id||'',imei:o.imei||'',service:o.service||'',group:o.group||'',status:o.status||'',price:Number(o.price||0),createdAt:o.createdAt||'',finishedAt:o.finishedAt||'',date:dateWib(o.createdAt),paymentMode:o.paymentMode||''}));
   const groups=Object.keys(state.settings?.sellerGroups||{}).map(id=>({id,mode:state.wallets?.[id]?.mode||'postpaid',balance:Number(state.wallets?.[id]?.balance||0)}));
   return send(res,200,JSON.stringify({orders,groups,updatedAt:new Date().toISOString()}),'application/json; charset=utf-8');
  }catch(e){console.error('[DASHBOARD]',e.message);return send(res,500,JSON.stringify({error:'Data belum tersedia'}),'application/json')}
 }
 send(res,404,'Not found','text/plain');
}).listen(PORT,HOST,()=>console.log('CUAN dashboard listening on '+HOST+':'+PORT));
