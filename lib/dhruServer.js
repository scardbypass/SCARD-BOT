const http=require('http'),crypto=require('crypto'),fs=require('fs'),path=require('path');
const core=require('./imeiCenter/core');
const {state,save,allowed,price,active,operational,schedule,wallet,available,reserve,release}=require('./imeiCenter/store');
const services=['3b','1b','3bs','3bd'];
const serviceIds={'3b':'101','1b':'102','3bs':'103','3bd':'104'};
const serviceById=Object.fromEntries(Object.entries(serviceIds).map(([name,id])=>[id,name]));
let started=false;
const pendingOutbound=new Set();
const outboundKey=(g,s,i)=>g+'|'+s+'|'+i;
function reply(res,status,data){if(res.dhruAction)console.log('[DHRU RESPONSE]',res.dhruAction,'http='+status,'successType='+(Array.isArray(data?.SUCCESS)?'array':data?.SUCCESS===undefined?'missing':typeof data.SUCCESS),'successCount='+(Array.isArray(data?.SUCCESS)?data.SUCCESS.length:'n/a'),'error='+(data?.ERROR?'yes':'no'));res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
function parse(req){return new Promise((resolve,reject)=>{let b='';req.on('data',x=>{b+=x;if(b.length>65536){reject(new Error('Payload too large'));req.destroy()}});req.on('end',()=>{try{const t=req.headers['content-type']||'';resolve(t.includes('application/json')?JSON.parse(b||'{}'):Object.fromEntries(new URLSearchParams(b)))}catch(e){reject(e)}});req.on('error',reject)})}
function dhruParameters(raw){
 if(!raw)return {};
 if(typeof raw==='object')return raw;
 const input=String(raw).trim();
 const json=value=>{try{const result=JSON.parse(value);return result&&typeof result==='object'?result:null}catch{return null}};
 const decodeXml=value=>{
  if(!/^<PARAMETERS(?:\s[^>]*)?>/i.test(value))return null;
  const result={};
  const body=value.replace(/^<PARAMETERS(?:\s[^>]*)?>/i,'').replace(/<\/PARAMETERS>\s*$/i,'');
  for(const m of body.matchAll(/<([A-Za-z][A-Za-z0-9_.-]*)>([^<]*)<\/\1>/g)){
   result[m[1]]=m[2].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
  }
  return result;
 };
 const candidates=[input];
 try{candidates.push(decodeURIComponent(input.replace(/\+/g,'%20')))}catch{}
 for(const candidate of [...candidates]){
  try{
   if(/^[A-Za-z0-9+/_=-]+$/.test(candidate)&&candidate.length%4!==1){
    const decoded=Buffer.from(candidate.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8').trim();
    if(decoded)candidates.push(decoded);
   }
  }catch{}
 }
 for(const candidate of candidates){
  const parsed=json(candidate)||decodeXml(candidate);
  if(parsed)return parsed;
  if(/(?:^|&)(?:ID|IMEI|SERVICEID|IMEI1)=/i.test(candidate)){
   const fields=Object.fromEntries(new URLSearchParams(candidate));
   if(Object.keys(fields).length)return fields;
  }
 }
 return {};
}
function getField(fields,...names){
 for(const name of names){
  const value=fields[String(name).toLowerCase()];
  if(value!==undefined&&value!==null&&String(value).trim()!=='')return String(value).trim();
 }
 return '';
}
function extractImei(fields,data){
 const aliases=['imei','imei1','imei_1','serial','serialnumber','serial_number'];
 const seen=new Set();
 const visit=(value,depth=0)=>{
  if(depth>5||value===null||value===undefined)return '';
  if(typeof value==='string'){
   const v=value.trim();
   if(/^\d{15}$/.test(v))return v;
   if(depth<4&&(/^[\[{<]/.test(v)||v.includes('=')||/^[A-Za-z0-9+/=_-]{24,}$/.test(v))){
    const parsed=dhruParameters(v);
    if(parsed&&Object.keys(parsed).length)return visit(parsed,depth+1);
   }
   return '';
  }
  if(typeof value!=='object'||seen.has(value))return '';
  seen.add(value);
  if(Array.isArray(value)){
   for(const item of value){const found=visit(item,depth+1);if(found)return found}
   return '';
  }
  const normalized=normalizedFields(value);
  for(const key of aliases){
   if(Object.prototype.hasOwnProperty.call(normalized,key)){
    const found=visit(normalized[key],depth+1);
    if(found)return found;
   }
  }
  for(const [key,item] of Object.entries(normalized)){
   if(/^(parameters|params|data|fields|order|details|imei_data|imeidata)$/.test(key)){
    const found=visit(item,depth+1);
    if(found)return found;
   }
  }
  return '';
 };
 for(const value of [fields,data]){const found=visit(value);if(found)return found}
 return '';
}
function dhruOrderStatus(o){
 if(!o)return {STATUS:3,CODE:'Order not found'};
 if(o.status==='success')return {STATUS:4,CODE:String(o.result||o.providerResult||'Completed')};
 if(['failed','unavailable','rejected','cancelled'].includes(o.status))return {STATUS:3,CODE:String(o.reason||'Rejected')};
 if(o.status==='checking')return {STATUS:0,CODE:''};
 return {STATUS:1,CODE:''};
}
function normalizedFields(data){const out={};for(const [k,v] of Object.entries(data||{}))out[String(k).toLowerCase().trim()]=v;return out}
function account(data){
 const d=normalizedFields(data);
 const user=String(d.username||d.user||'').trim();
 const key=String(d.apiaccesskey||d.api_key||d.apikey||d.api_access_key||'').trim();
 const found=Object.entries(state.settings.apiAccounts||{}).find(([g,a])=>a.username===user&&a.key===key);
 return found?{group:found[0],...found[1]}:null;
}
const recentRequests=new Map();
const requestLimits=new Map();
function rateLimited(ip){const now=Date.now();let v=requestLimits.get(ip);if(!v||now-v.start>60000){v={start:now,count:0};requestLimits.set(ip,v)}v.count++;if(requestLimits.size>5000){for(const [k,x] of requestLimits)if(now-x.start>60000)requestLimits.delete(k)}return v.count>60}
function status(o){return o.status==='success'?'SUCCESS':o.status==='failed'||o.status==='unavailable'||o.status==='rejected'?'FAILED':o.status==='cancelled'?'CANCELLED':'PROCESSING'}
function start(getSock){
 if(started)return;started=true;
 core.startDigiposSync(getSock);
 const port=Number(process.env.DHRU_PORT||3107);
 const server=http.createServer(async(req,res)=>{
  const pathname=req.url?.split('?')[0];
  // Log only method/path/status; never log query strings, credentials or request bodies.
  const originalWriteHead=res.writeHead;
  res.writeHead=function(statusCode,...rest){
   console.log('[DHRU HTTP]',req.method,pathname,'->',statusCode);
   return originalWriteHead.call(this,statusCode,...rest);
  };
  if(req.method==='GET'&&(pathname==='/'||pathname==='/index.html')){try{const page=fs.readFileSync(path.join(__dirname,'..','public','index.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});return res.end(page)}catch(e){console.error('[LANDING PAGE]',e.message);return reply(res,500,{ERROR:'Landing page unavailable'})}}
  if(req.method==='GET'&&pathname==='/health')return reply(res,200,{status:'ok',service:'CUAN-BOT DHRU',time:new Date().toISOString()});
  if(pathname==='/api/dhru'&&req.method==='GET')return reply(res,200,{SUCCESS:true,STATUS:'ONLINE',SERVICE:'CUAN-BOT DHRU',MESSAGE:'API endpoint online. Authenticated DHRU actions require POST.',METHOD:'POST',ACTIONS:['accountinfo','imeiservicelist','placeimeiorder','orderstatus','orderstatusbulk'],TIME:new Date().toISOString()});
  if(pathname==='/api/dhru'&&req.method==='OPTIONS'){res.writeHead(204,{'Allow':'GET, POST, OPTIONS','Cache-Control':'no-store'});return res.end()}
  const dhruPath=pathname==='/api/dhru'||pathname==='/api/dhru/api/index.php';
  if(!dhruPath)return reply(res,404,{ERROR:'Not found',PATH:pathname});
  if(req.method!=='POST')return reply(res,405,{ERROR:'Method not allowed',METHOD:'POST'});
  if(rateLimited(req.socket.remoteAddress||'unknown'))return reply(res,429,{ERROR:'Too many requests'});
  try{
   const data=normalizedFields(await parse(req));const a=account(data);
   if(!a){console.warn('[DHRU AUTH] Rejected request; provided fields:',Object.keys(data).filter(k=>!/(key|pass|token|secret|username|user)/i.test(k)).join(',')||'(none)');return reply(res,401,{ERROR:'Invalid API credentials'})}
   if(!state.settings.apiGlobalEnabled||!a.enabled||!state.settings.sellerGroups[a.group])return reply(res,403,{ERROR:'DHRU API disabled'});
   const action=String(data.action||'').toLowerCase();res.dhruAction=action||'(missing)';
   if(action==='accountinfo'){
    const w=wallet(a.group);
    const credit=w.mode==='prepaid'?available(a.group).toFixed(2):'0.00';
    return reply(res,200,{SUCCESS:[{message:'Your Accout Info',AccoutInfo:{
     credit,creditraw:credit,currency:'IDR'
    }}],apiversion:'6.1'});
   }
   if(action==='imeiservicelist'){
    // DHRU Fusion v6.1 expects SUCCESS[0].LIST[group].SERVICES[serviceId].
    // Listing ignores opening hours; ordering still enforces operational().
    const catalog={};
    const groupName='IMEI Services';
    const grouped={GROUPNAME:groupName,GROUPTYPE:'IMEI',SERVICES:{}};
    for(const s of services){
     const amount=price(s,a.group);
     const operator=state.settings.operatorGroups[s];
     if(!allowed(s,a.group)||(s!=='1b'&&(typeof operator!=='string'||!operator.endsWith('@g.us')))||
        !Number.isFinite(amount)||amount<=0)continue;
     const id=serviceIds[s];
     grouped.SERVICES[id]={
      SERVICEID:Number(id),SERVICETYPE:'IMEI',
      SERVICENAME:s.toUpperCase()+' IMEI',CREDIT:amount,
      INFO:'IMEI checking service',TIME:'Processing',
      QNT:1,QNTOPTIONS:'',MINQNT:1,MAXQNT:1
     };
    }
    if(Object.keys(grouped.SERVICES).length)catalog[groupName]=grouped;
    console.log('[DHRU CATALOG] seller='+a.username+' ready='+Object.keys(grouped.SERVICES).length);
    return reply(res,200,{SUCCESS:[{MESSAGE:'IMEI Service List',LIST:catalog}],apiversion:'6.1'});
   }
   const params=dhruParameters(data.parameters);
   const fields=normalizedFields(params);
   const orderIdFrom=(obj)=>{
    if(obj===null||obj===undefined)return '';
    if(typeof obj==='string'||typeof obj==='number')return String(obj).trim();
    if(Array.isArray(obj))return obj.length===1?orderIdFrom(obj[0]):'';
    if(typeof obj==='object'){
     const n=normalizedFields(obj);
     for(const key of ['id','orderid','order_id','referenceid','reference_id','order','ref']){
      if(n[key]!==undefined&&n[key]!==null)return orderIdFrom(n[key]);
     }
    }
    return '';
   };
   if(['getimeiorder','getimeiorderbulk','orderstatus','orderstatusbulk'].includes(action)){
    if(action==='getimeiorderbulk'||action==='orderstatusbulk'){
     const raw=Array.isArray(params)?params:(fields.ids??fields.orderids??fields.id??fields.orderid??data.orderids??data.ids??data.id??[]);
     const items=Array.isArray(raw)?raw:(typeof raw==='string'?raw.split(','):[raw]);
     const ids=items.map(orderIdFrom).filter(Boolean).slice(0,100);
     if(!ids.length)return reply(res,200,{ERROR:[{MESSAGE:'Missing order IDs'}],apiversion:'6.1'});
     const out={};
     ids.forEach((id,i)=>{
      const o=state.orders.find(x=>x.id===id&&x.group===a.group&&x.source==='dhru');
      out[i]={SUCCESS:[dhruOrderStatus(o)]};
     });
     console.log('[DHRU STATUS]',action,'count='+ids.length,'found='+ids.filter(id=>state.orders.some(o=>o.id===id&&o.group===a.group&&o.source==='dhru')).length);
     return reply(res,200,{...out,apiversion:'6.1'});
    }
    const id=orderIdFrom(fields)||orderIdFrom(data.orderid??data.id??data.referenceid);
    const o=state.orders.find(x=>x.id===id&&x.group===a.group&&x.source==='dhru');
    console.log('[DHRU STATUS]',action,'id='+id.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48),'found='+!!o,'status='+(o?.status||'not_found'),'dhruStatus='+dhruOrderStatus(o).STATUS);
    return reply(res,200,{SUCCESS:[dhruOrderStatus(o)],apiversion:'6.1'});
   }
   if(action!=='placeimeiorder')return reply(res,200,{ERROR:[{MESSAGE:'Invalid Action'}],apiversion:'6.1'});
   const requestedService=(getField(fields,'id','serviceid','service_id','service')||getField(data,'serviceid','service_id','service','id')).toLowerCase();
   const service=serviceById[requestedService]||requestedService;
   const imei=extractImei(fields,data);
   if(!services.includes(service)){
    console.warn('[DHRU ORDER VALIDATION] Unknown service ID; parameter keys:',Object.keys(fields).join(','));
    return reply(res,200,{ERROR:[{MESSAGE:'Invalid service ID'}],apiversion:'6.1'});
   }
   if(!/^\d{15}$/.test(imei)){
    console.warn('[DHRU ORDER VALIDATION] IMEI missing/invalid; parameters keys:',Object.keys(fields).join(','),'body keys:',Object.keys(data).filter(k=>!/(key|pass|secret|token|username|user)/i.test(k)).join(','),'parameter type:',typeof data.parameters,'parameter length:',String(data.parameters??'').length);
    return reply(res,200,{ERROR:[{MESSAGE:'Invalid IMEI: expected 15 digits'}],apiversion:'6.1'});
   }
   if(!operational(service)){return reply(res,200,{ERROR:[{MESSAGE:'Service closed'}],apiversion:'6.1'})}
   if(!state.settings.sellerGroups[a.group]||!allowed(service,a.group)||(service!=='1b'&&!state.settings.operatorGroups[service])||price(service,a.group)<=0)return reply(res,200,{ERROR:[{MESSAGE:'Service unavailable'}],apiversion:'6.1'});
   const clientRef=String(fields.client_request_id||fields.clientorderid||data.clientorderid||data.reference||'').trim();
   if(clientRef.length>128)return reply(res,400,{ERROR:'Invalid reference'});
   if(clientRef){const existing=state.orders.find(o=>o.group===a.group&&o.source==='dhru'&&o.clientRef===clientRef);if(existing){if(existing.imei!==imei||existing.service!==service)return reply(res,409,{ERROR:'Reference already used for different order'});return reply(res,200,{SUCCESS:[{MESSAGE:'Order received',REFERENCEID:existing.id}],apiversion:'6.1'})}}
   if(wallet(a.group).mode==='prepaid'&&available(a.group)<price(service,a.group))return reply(res,200,{ERROR:[{MESSAGE:'Not enough credits'}],apiversion:'6.1'});
   if(active(imei))return reply(res,200,{ERROR:[{MESSAGE:'IMEI already processing'}],apiversion:'6.1'});
   const fingerprint=a.group+'|'+service+'|'+imei;const last=recentRequests.get(fingerprint);if(last&&Date.now()-last<30000)return reply(res,200,{ERROR:[{MESSAGE:'Duplicate request; check existing order'}],apiversion:'6.1'});
   const sock=getSock();if(!sock)return reply(res,200,{ERROR:[{MESSAGE:'Order service temporarily unavailable'}],apiversion:'6.1'});
   const id='DH'+Date.now().toString(36)+crypto.randomBytes(3).toString('hex');
   // One visible order in the registered seller group; core uses its message ID for final reply.
   const outbound=outboundKey(a.group,service,imei);pendingOutbound.add(outbound);
   const cost=price(service,a.group),paymentMode=wallet(a.group).mode;
   if(!reserve(a.group,id,cost)){pendingOutbound.delete(outbound);return reply(res,200,{ERROR:[{MESSAGE:'Not enough credits'}],apiversion:'6.1'})}
   const reserved={id,service,imei,group:a.group,clientRef:clientRef||undefined,source:'dhru',price:cost,paymentMode,status:'checking',createdAt:new Date().toISOString(),date:core.today()};
   state.orders.push(reserved);save();
   recentRequests.set(fingerprint,Date.now());setTimeout(()=>recentRequests.delete(fingerprint),30000).unref?.();
   // Reply before WhatsApp network I/O; DHRU can poll getimeiorder for the result.
   // Order and prepaid reservation are persisted before acknowledging.
   setImmediate(()=>{
    Promise.resolve().then(async()=>{
     const sent=await sock.sendMessage(a.group,{text:'/'+service+' '+imei});
     reserved.originKey=sent.key;save();
     const fake={key:sent.key,message:{conversation:'/'+service+' '+imei},apiOrderId:id};
     const ctx={sock,msg:fake,command:service,args:[imei],isOwner:false,reply:txt=>sock.sendMessage(a.group,{text:String(txt)},{quoted:fake})};
     await core.command(ctx);
    }).catch(e=>{
     console.error('[DHRU ORDER ASYNC]',id,e.message);
     // Never release funds for a submitted DigiPOS order or other in-flight work.
     if(reserved.status==='checking'&&!reserved.submissionAttempted){
      reserved.status='manual_review';
      reserved.reason='WHATSAPP_OR_PROCESSING_ERROR';
      reserved.reviewRequiredAt=new Date().toISOString();
      save();
     }
    }).finally(()=>setTimeout(()=>pendingOutbound.delete(outbound),10000).unref?.());
   });
   return reply(res,200,{SUCCESS:[{MESSAGE:'Order received',REFERENCEID:id}],apiversion:'6.1'});
  }catch(e){console.error('[DHRU API]',e);if(!res.headersSent)reply(res,500,{ERROR:'Internal error'})}
 });
 server.listen(port,process.env.DHRU_BIND_HOST||'127.0.0.1',()=>console.log('[DHRU] Listening on',port));
 server.on('error',e=>console.error('[DHRU SERVER]',e.message));
}
module.exports={start,pendingOutbound,outboundKey};
