const db=require('./database')

const PROVIDERS={
  roamercheck:'RoamerCheck',
  airbot:'AirBot',
  sickw:'SickW',
  esimaccess:'eSIMAccess',
  orderkuota:'Order Kuota'
}
const ALIASES={
  roamer:'roamercheck',roamercek:'roamercheck',roamercheck:'roamercheck',
  airbot:'airbot',sickw:'sickw',
  esim:'esimaccess',esimaccess:'esimaccess',
  orderkuota:'orderkuota',orderkouta:'orderkuota',olderkouta:'orderkuota',okeconnect:'orderkuota'
}
function normalizeProvider(v=''){return ALIASES[String(v).toLowerCase().replace(/[^a-z0-9]/g,'')]||null}
function states(){return {...Object.fromEntries(Object.keys(PROVIDERS).map(k=>[k,true])),...(db.getSetting('providerEnabled',{})||{})}}
function isProviderEnabled(name){const k=normalizeProvider(name)||name;return states()[k]!==false}
function setProviderEnabled(name,value){
  const k=normalizeProvider(name)
  if(!k)return null
  const s=states();s[k]=!!value;db.setSetting('providerEnabled',s)
  return {key:k,label:PROVIDERS[k],enabled:s[k]}
}
function listProviders(){const s=states();return Object.entries(PROVIDERS).map(([key,label])=>({key,label,enabled:s[key]!==false}))}
module.exports={PROVIDERS,normalizeProvider,isProviderEnabled,setProviderEnabled,listProviders}
