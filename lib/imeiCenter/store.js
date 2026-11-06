const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'../../database'),file=path.join(dir,'imei-center.json');
const initial=()=>({settings:{enabled:true,serviceGlobalEnabled:{},globalPrices:{'3b':0,'1b':0,'1bd':0,'3bs':0,'3bd':0},operatorGroups:{},sellerGroups:{},bank:null,apiGlobalEnabled:true,apiAccounts:{},operatingHours:{'3b':{enabled:true,open:'07:00',close:'22:00'}}},orders:[],payments:[],daily:[],jobs:{}});
let state;try{state={...initial(),...JSON.parse(fs.readFileSync(file,'utf8'))}}catch{state=initial()}
state.settings ||= initial().settings;state.settings.serviceGlobalEnabled ||= {};state.settings.sellerGroups ||= {};state.settings.operatorGroups ||= {};state.settings.globalPrices ||= initial().settings.globalPrices;state.settings.operatingHours ||= {'3b':{enabled:true,open:'07:00',close:'22:00'}};state.orders ||= [];state.payments ||= [];state.jobs ||= {};state.settings.apiAccounts ||= {};state.wallets ||= {};state.walletLedger ||= [];if(state.settings.apiGlobalEnabled===undefined)state.settings.apiGlobalEnabled=true;
function save(){fs.mkdirSync(dir,{recursive:true});const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state,null,2));fs.renameSync(tmp,file)}
function price(service,group){const s=state.settings;return Number(s.sellerGroups[group]?.prices?.[service]??s.globalPrices[service]??0)}
function allowed(service,group){const s=state.settings;return !!s.sellerGroups[group]&&s.enabled!==false&&s.serviceGlobalEnabled?.[service]!==false&&s.sellerGroups[group]?.enabled!==false&&s.sellerGroups[group]?.services?.[service]!==false}
function outstanding(group,service){return state.orders.filter(o=>o.group===group&&o.status==='success'&&!o.paidAt&&(!service||o.service===service))}
function active(imei){return state.orders.find(o=>o.imei===imei&&['checking','pending','processing','manual_review'].includes(o.status))}
function schedule(service){return state.settings.operatingHours?.[service]||{enabled:false,open:'00:00',close:'00:00'}}
function operational(service,now=new Date()){
 const s=schedule(service);if(!s.enabled)return true;
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 const toMin=v=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v||''))return null;const [h,m]=v.split(':').map(Number);return h*60+m};
 const cur=toMin(time),start=toMin(s.open),end=toMin(s.close);
 if(cur===null||start===null||end===null)return false;
 if(start===end)return true;
 return start<end?cur>=start&&cur<end:cur>=start||cur<end;
}

function wallet(g){const w=state.wallets[g]||={mode:'postpaid',balance:0,holds:{}};w.holds ||= {};return w}
function available(g){const w=wallet(g);return Math.max(0,Number(w.balance||0)-Object.values(w.holds).reduce((a,v)=>a+Number(v||0),0))}
function reserve(g,id,amount){const w=wallet(g);if(w.mode!=='prepaid')return true;if(w.holds[id]!==undefined)return Number(w.holds[id])===Number(amount);const n=Number(amount);if(!Number.isSafeInteger(n)||n<=0||available(g)<n)return false;w.holds[id]=n;save();return true}
function settle(order){const w=wallet(order.group);if(order.paymentSettled)return;if(order.paymentMode==='prepaid'){const amount=Number(w.holds[order.id]||0);if(amount<=0)throw new Error('Missing prepaid hold');w.balance-=amount;delete w.holds[order.id];order.paidAt=new Date().toISOString();state.walletLedger.push({group:order.group,orderId:order.id,type:'debit',amount:-amount,at:order.paidAt});}order.paymentSettled=true;save()}
function release(order){const w=wallet(order.group);if(w.holds[order.id]!==undefined){delete w.holds[order.id];save()}}
function ceirConfig(group){const c=state.settings.sellerGroups[group]?.ceirBilling||{};return {mode:['free','seller','owner'].includes(c.mode)?c.mode:'free',fee:Number.isSafeInteger(c.fee)&&c.fee>=0?c.fee:2500}}
function chargeCeir(order,result){
 if(!['REGISTERED','ROAMER'].includes(String(result||'').toUpperCase()))return {charged:false,reason:'not_billable'};
 if(order.ceirBilling)return {charged:false,reason:'already_recorded'};
 const cfg=ceirConfig(order.group),amount=cfg.mode==='free'?0:cfg.fee;
 if(cfg.mode==='seller'&&amount>0){
  const w=wallet(order.group);
  if(w.mode==='prepaid'&&available(order.group)<amount)return {charged:false,reason:'insufficient_balance'};
  if(w.mode==='prepaid')w.balance-=amount;
  state.walletLedger.push({group:order.group,orderId:order.id,type:'ceir_fee',amount,mode:w.mode,at:new Date().toISOString()});
 }
 if(cfg.mode==='owner'&&amount>0)state.walletLedger.push({group:order.group,orderId:order.id,type:'ceir_owner_expense',amount,at:new Date().toISOString()});
 order.ceirBilling={mode:cfg.mode,amount,ceirStatus:String(result).toUpperCase(),at:new Date().toISOString(),paid:cfg.mode!=='seller'||wallet(order.group).mode==='prepaid'};
 save();return {charged:true,...order.ceirBilling};
}
function adjust(g,amount,actor){const w=wallet(g),n=Number(amount);if(!Number.isSafeInteger(n)||n===0||!Number.isSafeInteger(w.balance+n)||w.balance+n<0||available(g)+n<0)return false;w.balance+=n;state.walletLedger.push({group:g,type:n>0?'topup':'adjustment',amount:n,actor,at:new Date().toISOString()});save();return true}
module.exports={state,save,price,allowed,outstanding,active,schedule,operational,wallet,available,reserve,settle,release,adjust,ceirConfig,chargeCeir};
