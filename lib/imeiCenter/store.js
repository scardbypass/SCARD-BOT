const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'../../database'),file=path.join(dir,'imei-center.json');
const initial=()=>({settings:{enabled:true,globalPrices:{'3b':0,'1b':0,'3bs':0,'3bd':0},operatorGroups:{},sellerGroups:{},bank:null,apiGlobalEnabled:true,apiAccounts:{},operatingHours:{'3b':{enabled:true,open:'07:00',close:'22:00'}}},orders:[],payments:[],daily:[],jobs:{}});
let state;try{state={...initial(),...JSON.parse(fs.readFileSync(file,'utf8'))}}catch{state=initial()}
state.settings ||= initial().settings;state.settings.sellerGroups ||= {};state.settings.operatorGroups ||= {};state.settings.globalPrices ||= initial().settings.globalPrices;state.settings.operatingHours ||= {'3b':{enabled:true,open:'07:00',close:'22:00'}};state.orders ||= [];state.payments ||= [];state.jobs ||= {};state.settings.apiAccounts ||= {};if(state.settings.apiGlobalEnabled===undefined)state.settings.apiGlobalEnabled=true;
function save(){fs.mkdirSync(dir,{recursive:true});const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state,null,2));fs.renameSync(tmp,file)}
function price(service,group){const s=state.settings;return Number(s.sellerGroups[group]?.prices?.[service]??s.globalPrices[service]??0)}
function allowed(service,group){const s=state.settings;return !!s.sellerGroups[group]&&s.enabled!==false&&s.sellerGroups[group]?.enabled!==false&&s.sellerGroups[group]?.services?.[service]!==false}
function outstanding(group,service){return state.orders.filter(o=>o.group===group&&o.status==='success'&&!o.paidAt&&(!service||o.service===service))}
function active(imei){return state.orders.find(o=>o.imei===imei&&['checking','pending','processing'].includes(o.status))}
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
module.exports={state,save,price,allowed,outstanding,active,schedule,operational};
