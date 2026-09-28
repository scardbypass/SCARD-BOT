const fs=require('fs');const path=require('path');
const file=path.join(__dirname,'..','database','database.json');
function base(){return {users:{},transactions:[],settings:{aiEnabled:false},scheduler:{sent:{}}}}
function load(){try{const x=JSON.parse(fs.readFileSync(file,'utf8'));return {...base(),...x,users:x.users||{},settings:{...base().settings,...(x.settings||{})},scheduler:{sent:x.scheduler?.sent||{}}}}catch{return base()}}
let data=load();
function save(){const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2));fs.renameSync(tmp,file)}
function getUser(phone){return data.users[String(phone)]||null}
function setUser(phone,user){data.users[String(phone)]={...(data.users[String(phone)]||{}),...user,phone:String(phone)};save();return data.users[String(phone)]}
function getSetting(key,fallback=null){return data.settings?.[key]??fallback}
function setSetting(key,value){data.settings=data.settings||{};data.settings[key]=value;save();return value}
function totalBalance(){return Object.values(data.users).reduce((a,u)=>a+(Number(u.balance)||0),0)}
function totalUsers(){return Object.keys(data.users).length}
function countTransactions(phone){return data.transactions.filter(x=>String(x.phone)===String(phone)).length}
function wasSent(key){return !!data.scheduler.sent[key]}
function markSent(key){data.scheduler.sent[key]=new Date().toISOString();save()}
module.exports={data,save,getUser,setUser,getSetting,setSetting,totalBalance,totalUsers,countTransactions,wasSent,markSent}
