const axios = require('axios')

function numberValue(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

async function getRoamerAccount() {
  const username = String(process.env.ROAMERCHECK_USERNAME || '').trim()
  const apikey = String(process.env.ROAMERCHECK_API_KEY || '').trim()
  if (!username || !apikey) {
    console.error('[ROAMERCHECK] ROAMERCHECK_USERNAME / ROAMERCHECK_API_KEY belum diisi')
    return null
  }
  try {
    const res = await axios.post(
      'https://api.roamercheck.id/ApiGetBalance.php',
      { username },
      { headers: { apikey, 'Content-Type': 'application/json' }, timeout: 60000 }
    )
    if (!res.data || res.data.success !== true || !res.data.data) {
      console.error('[ROAMERCHECK] Response tidak valid:', res.data)
      return null
    }
    return res.data.data
  } catch (err) {
    console.error('[ROAMERCHECK]', err.response?.status || '', err.response?.data || err.message)
    return null
  }
}

function roamerBalance(account) {
  if (!account || account.balance === undefined) return null
  const raw = typeof account.balance === 'object' && account.balance !== null
    ? account.balance.amount
    : account.balance
  return numberValue(raw)
}

async function getSickwBalance() {
  const key = String(process.env.SICKW_API_KEY || '').trim()
  if (!key) {
    console.error('[SICKW] SICKW_API_KEY belum diisi')
    return null
  }
  try {
    const res = await axios.get('https://sickw.com/api.php', {
      params: { format: 'json', key, action: 'balance' },
      timeout: 15000
    })
    let data = res.data
    if (typeof data === 'string') {
      const raw = data.trim()
      try { data = JSON.parse(raw) } catch { data = raw }
    }
    const usd = parseFloat(data && typeof data === 'object' ? data.balance : data)
    if (!Number.isFinite(usd)) {
      console.error('[SICKW] Format balance tidak valid:', res.data)
      return null
    }
    const rate = Number(process.env.SICKW_USD_TO_IDR || 19500)
    return { usd, idr: Math.floor(usd * (Number.isFinite(rate) ? rate : 19500)) }
  } catch (err) {
    console.error('[SICKW]', err.response?.status || '', err.response?.data || err.message)
    return null
  }
}

async function getAirbotBalance() {
  const apiKey=String(process.env.AIRBOT_API_KEY||'').trim()
  const apiSecret=String(process.env.AIRBOT_API_SECRET||'').trim()
  const endpoint=String(process.env.AIRBOT_API_URL||'https://api.warungkode.my.id').trim()
  if(!apiKey||!apiSecret){
    console.error('[AIRBOT API] AIRBOT_API_KEY / AIRBOT_API_SECRET belum diisi')
    return null
  }
  try{
    const body=new URLSearchParams({service:'saldo',API_KEY:apiKey,API_SECRET:apiSecret})
    const res=await axios.post(endpoint,body.toString(),{
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      timeout:15000
    })
    const data=res.data
    const balance=numberValue(data?.balance)
    if(!data||data.status!=='success'||balance===null){
      console.error('[AIRBOT API] Response tidak valid:',data)
      return null
    }
    return {balance,currency:data.currency||'IDR',serviceCode:data.service_code||'SALDO'}
  }catch(err){
    console.error('[AIRBOT API]',err.response?.status||'',err.response?.data||err.message)
    return null
  }
}

async function getEsimAccessBalance(){
  const accessCode=String(process.env.ESIMACCESS_ACCESS_CODE||'').trim()
  if(!accessCode){
    console.error('[ESIMACCESS] ESIMACCESS_ACCESS_CODE belum diisi')
    return null
  }
  try{
    const res=await axios.post(
      'https://api.esimaccess.com/api/v1/open/balance/query',
      '',
      {headers:{'RT-AccessCode':accessCode},timeout:15000}
    )
    const data=res.data
    const raw=numberValue(data?.obj?.balance)
    if(!data||data.success!==true||raw===null){
      console.error('[ESIMACCESS] Response tidak valid:',data)
      return null
    }
    const usd=raw/10000
    const rate=Number(process.env.ESIMACCESS_USD_TO_IDR||process.env.SICKW_USD_TO_IDR||19500)
    return {usd,idr:Math.floor(usd*(Number.isFinite(rate)?rate:19500))}
  }catch(err){
    console.error('[ESIMACCESS]',err.response?.status||'',err.response?.data||err.message)
    return null
  }
}

function findOrderKuotaBalance(data){
  const candidates=[
    data?.balance,
    data?.saldo,
    data?.data?.balance,
    data?.data?.saldo,
    data?.result?.balance,
    data?.result?.saldo,
    data?.results?.balance,
    data?.results?.saldo,
    data?.response?.balance,
    data?.response?.saldo,
    data?.account_details?.results?.balance,
    data?.result?.response?.account_details?.results?.balance
  ]
  for(const value of candidates){
    const n=numberValue(value)
    if(n!==null)return n
  }
  return null
}

async function getOrderKuotaBalance(){
  const username=String(process.env.ORDERKUOTA_USERNAME||'').trim()
  const token=String(process.env.ORDERKUOTA_TOKEN||'').trim()
  const endpoint=String(process.env.ORDERKUOTA_BALANCE_URL||'').trim()
  if(!username||!token||!endpoint){
    console.error('[ORDERKUOTA] ORDERKUOTA_USERNAME / ORDERKUOTA_TOKEN / ORDERKUOTA_BALANCE_URL belum diisi')
    return null
  }
  try{
    const headers={'Content-Type':'application/json'}
    const apiKey=String(process.env.ORDERKUOTA_API_KEY||'').trim()
    const apiKeyHeader=String(process.env.ORDERKUOTA_API_KEY_HEADER||'').trim()
    if(apiKey&&apiKeyHeader)headers[apiKeyHeader]=apiKey
    const res=await axios.post(endpoint,{username,token},{headers,timeout:15000})
    const balance=findOrderKuotaBalance(res.data)
    if(balance===null){
      console.error('[ORDERKUOTA] Format balance tidak dikenali:',res.data)
      return null
    }
    return {balance}
  }catch(err){
    console.error('[ORDERKUOTA]',err.response?.status||'',err.response?.data||err.message)
    return null
  }
}

module.exports = { getRoamerAccount, roamerBalance, getSickwBalance, getAirbotBalance, getEsimAccessBalance, getOrderKuotaBalance }
