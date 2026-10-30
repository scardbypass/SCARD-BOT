const http=require('http'),crypto=require('crypto');
const core=require('./imeiCenter/core');
const {state,save,allowed,price,active,operational,schedule}=require('./imeiCenter/store');
const services=['3b','1b','3bs','3bd'];
let started=false;
const pendingOutbound=new Set();
const outboundKey=(g,s,i)=>g+'|'+s+'|'+i;
function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
function parse(req){return new Promise((resolve,reject)=>{let b='';req.on('data',x=>{b+=x;if(b.length>65536){reject(new Error('Payload too large'));req.destroy()}});req.on('end',()=>{try{const t=req.headers['content-type']||'';resolve(t.includes('application/json')?JSON.parse(b||'{}'):Object.fromEntries(new URLSearchParams(b)))}catch(e){reject(e)}});req.on('error',reject)})}
function account(data){const user=String(data.username||'');const key=String(data.apiaccesskey||data.api_key||data.apikey||'');const found=Object.entries(state.settings.apiAccounts||{}).find(([g,a])=>a.username===user&&a.key===key);return found?{group:found[0],...found[1]}:null}
const recentRequests=new Map();
const requestLimits=new Map();
function rateLimited(ip){const now=Date.now();let v=requestLimits.get(ip);if(!v||now-v.start>60000){v={start:now,count:0};requestLimits.set(ip,v)}v.count++;if(requestLimits.size>5000){for(const [k,x] of requestLimits)if(now-x.start>60000)requestLimits.delete(k)}return v.count>60}
function status(o){return o.status==='success'?'SUCCESS':o.status==='failed'||o.status==='unavailable'||o.status==='rejected'?'FAILED':o.status==='cancelled'?'CANCELLED':'PROCESSING'}
function start(getSock){
 if(started)return;started=true;
 const port=Number(process.env.DHRU_PORT||3107);
 const server=http.createServer(async(req,res)=>{
  if(req.url?.split('?')[0]!=='/api/dhru'||req.method!=='POST')return reply(res,404,{ERROR:'Not found'});
  if(rateLimited(req.socket.remoteAddress||'unknown'))return reply(res,429,{ERROR:'Too many requests'});
  try{
   const data=await parse(req);const a=account(data);
   if(!a)return reply(res,401,{ERROR:'Invalid API credentials'});
   if(!state.settings.apiGlobalEnabled||!a.enabled||!state.settings.sellerGroups[a.group])return reply(res,403,{ERROR:'DHRU API disabled'});
   const action=String(data.action||'').toLowerCase();
   if(action==='accountinfo')return reply(res,200,{SUCCESS:[{username:a.username,currency:'IDR',credit:'0.00',accounttype:'POSTPAID'}]});
   if(action==='imeiservicelist')return reply(res,200,{SUCCESS:services.filter(s=>allowed(s,a.group)&&operational(s)&&state.settings.operatorGroups[s]).map(s=>({SERVICE:s,SERVICENAME:s.toUpperCase()+' IMEI',CREDIT:price(s,a.group),TIME:'Processing'}))});
   if(action==='orderstatus'||action==='orderstatusbulk'){
    const ids=action==='orderstatusbulk'?String(data.orderids||data.orderid||'').split(','):[String(data.orderid||'')];
    const out=ids.map(id=>{const o=state.orders.find(x=>x.id===id&&x.group===a.group&&x.source==='dhru');return o?{ORDERID:o.id,STATUS:status(o),IMEI:o.imei,SERVICE:o.service,RESULT:o.reason||o.status}:{ORDERID:id,STATUS:'NOT_FOUND'}});
    return reply(res,200,{SUCCESS:action==='orderstatus'?out[0]:out});
   }
   if(action!=='placeimeiorder')return reply(res,400,{ERROR:'Unsupported action'});
   const service=String(data.service||data.serviceid||'').toLowerCase(),imei=String(data.imei||'').trim();
   if(!services.includes(service)||!/^\d{15}$/.test(imei))return reply(res,400,{ERROR:'Invalid service or IMEI'});
   if(!operational(service)){const h=schedule(service);return reply(res,403,{ERROR:'Service closed',SERVICE:service,OPEN:h.open,CLOSE:h.close,TIMEZONE:'Asia/Jakarta'})}
   if(!state.settings.sellerGroups[a.group]||!allowed(service,a.group)||!state.settings.operatorGroups[service]||price(service,a.group)<=0)return reply(res,403,{ERROR:'Service unavailable'});
   const clientRef=String(data.clientorderid||data.reference||'').trim();
   if(clientRef.length>128)return reply(res,400,{ERROR:'Invalid reference'});
   if(clientRef){const existing=state.orders.find(o=>o.group===a.group&&o.source==='dhru'&&o.clientRef===clientRef);if(existing)return reply(res,200,{SUCCESS:{ORDERID:existing.id,STATUS:status(existing)}})}
   if(active(imei))return reply(res,409,{ERROR:'IMEI already processing'});
   const fingerprint=a.group+'|'+service+'|'+imei;const last=recentRequests.get(fingerprint);if(last&&Date.now()-last<30000)return reply(res,409,{ERROR:'Duplicate request, retry orderstatus'});
   recentRequests.set(fingerprint,Date.now());setTimeout(()=>recentRequests.delete(fingerprint),30000).unref?.();
   const sock=getSock();if(!sock)return reply(res,503,{ERROR:'WhatsApp disconnected'});
   const id='DH'+Date.now().toString(36)+crypto.randomBytes(3).toString('hex');
   // One visible order in the registered seller group; core uses its message ID for final reply.
   const outbound=outboundKey(a.group,service,imei);pendingOutbound.add(outbound);
   const reserved={id,service,imei,group:a.group,clientRef:clientRef||undefined,source:'dhru',price:price(service,a.group),status:'checking',createdAt:new Date().toISOString(),date:core.today()};
   state.orders.push(reserved);save();
   let sent;try{sent=await sock.sendMessage(a.group,{text:'/'+service+' '+imei})}catch(e){reserved.status='rejected';reserved.reason='WHATSAPP_SEND_FAILED';save();pendingOutbound.delete(outbound);return reply(res,503,{ERROR:'Unable to deliver order'})}
   reserved.originKey=sent.key;save();
   const fake={key:sent.key,message:{conversation:'/'+service+' '+imei},apiOrderId:id};
   const ctx={sock,msg:fake,command:service,args:[imei],isOwner:false,reply:txt=>sock.sendMessage(a.group,{text:String(txt)},{quoted:fake})};
   // Processing is asynchronous; DHRU receives an order ID immediately.
   Promise.resolve().then(()=>core.command(ctx)).catch(e=>{reserved.status='rejected';reserved.reason='PROCESSING_ERROR';save();console.error('[DHRU ORDER]',id,e)}).finally(()=>setTimeout(()=>pendingOutbound.delete(outbound),10000));
   return reply(res,200,{SUCCESS:{ORDERID:id,STATUS:'PROCESSING'}});
  }catch(e){console.error('[DHRU API]',e);if(!res.headersSent)reply(res,500,{ERROR:'Internal error'})}
 });
 server.listen(port,process.env.DHRU_BIND_HOST||'127.0.0.1',()=>console.log('[DHRU] Listening on',port));
 server.on('error',e=>console.error('[DHRU SERVER]',e.message));
}
module.exports={start,pendingOutbound,outboundKey};
