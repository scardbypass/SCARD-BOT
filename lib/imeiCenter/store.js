const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'../../database'),file=path.join(dir,'imei-center.json');
const initial=()=>({settings:{enabled:true,globalPrices:{'3b':0,'1b':0,'3bs':0,'3bd':0},operatorGroups:{},sellerGroups:{},bank:null},orders:[],payments:[],daily:[],jobs:{}});
let state;try{state={...initial(),...JSON.parse(fs.readFileSync(file,'utf8'))}}catch{state=initial()}
function save(){fs.mkdirSync(dir,{recursive:true});const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state,null,2));fs.renameSync(tmp,file)}
function price(service,group){const s=state.settings;return Number(s.sellerGroups[group]?.prices?.[service]??s.globalPrices[service]??0)}
function allowed(service,group){const s=state.settings;return s.enabled!==false&&s.sellerGroups[group]?.enabled!==false&&s.sellerGroups[group]?.services?.[service]!==false}
function outstanding(group,service){return state.orders.filter(o=>o.group===group&&o.status==='success'&&!o.paidAt&&(!service||o.service===service))}
function active(imei){return state.orders.find(o=>o.imei===imei&&['checking','pending','processing'].includes(o.status))}
module.exports={state,save,price,allowed,outstanding,active};
