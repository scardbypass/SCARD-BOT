'use strict';
const fs=require('fs');
const path=require('path');
const BASE='https://digipos.telkomsel.cloud';
const SESSION=process.env.DIGIPOS_SESSION_FILE||path.join(process.cwd(),'database','.digipos-session.json');
const TIMEOUT=Math.max(5000,Number(process.env.DIGIPOS_TIMEOUT_MS)||45000);
const isValidImei=v=>/^\d{15}$/.test(String(v||''));
const isLogin=page=>/login/i.test(new URL(page.url()).pathname);
async function navigate(page,url){
 try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:TIMEOUT})}
 catch(e){if(!/ERR_ABORTED/.test(String(e)))throw e;await page.waitForLoadState('domcontentloaded',{timeout:5000}).catch(()=>{})}
}
async function connect(){
 let chromium;
 try{({chromium}=require('playwright'))}catch{return {status:'dependency_missing',reason:'Install Playwright and Chromium on VPS'}}
 let browser,context;
 try{
  browser=await chromium.launch({headless:true});
  const opts=fs.existsSync(SESSION)?{storageState:SESSION}:{};
  try{context=await browser.newContext(opts)}
  catch(e){
   if(!fs.existsSync(SESSION))throw e;
   // Expired/corrupt saved state must not prevent a fresh login.
   context=await browser.newContext();
  }
  const page=await context.newPage();
  page.setDefaultTimeout(TIMEOUT);
  await navigate(page,BASE+'/roamer.php');
  const loginForm=async()=>isLogin(page)||await page.locator('input[type="password"]').count()>0;
  if(await loginForm()){
   const username=process.env.DIGIPOS_USERNAME,password=process.env.DIGIPOS_PASSWORD;
   if(!username||!password)return {status:'login_required',reason:'DIGIPOS_USERNAME or DIGIPOS_PASSWORD missing'};
   const user=page.locator('input[name="username"],input[name="email"],input[placeholder*="username" i],input[autocomplete="username"]').first();
   const pass=page.locator('input[type="password"]').first();
   if(!await user.count()||!await pass.count())return {status:'login_form_changed',reason:'Login input selectors not found'};
   await user.fill(username);
   await pass.fill(password);
   const button=page.getByRole('button',{name:/log\s*in|masuk|sign\s*in/i}).first();
   if(await button.count())await Promise.allSettled([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:10000}),button.click()]);
   else await pass.press('Enter');
   await page.waitForLoadState('domcontentloaded',{timeout:10000}).catch(()=>{});
   if(await loginForm())return {status:'login_required',reason:'Login unsuccessful or needs CAPTCHA/OTP'};
   if(!/\/roamer\.php/i.test(new URL(page.url()).pathname))await navigate(page,BASE+'/roamer.php');
  }
  if(await loginForm())return {status:'login_required',reason:'Session redirected to login'};
  const imei=page.locator('#imei,input[name="imei" i],input[placeholder*="IMEI" i]').first();
  if(!await imei.count())return {status:'form_changed',reason:'IMEI form not found on roamer.php'};
  fs.mkdirSync(path.dirname(SESSION),{recursive:true,mode:0o700});
  await context.storageState({path:SESSION});
  fs.chmodSync(SESSION,0o600);
  return {status:'connected',reason:'Authenticated and IMEI form detected'};
 }catch(e){
  const msg=String(e?.message||e);
  return {status:'connection_error',reason:/Executable doesn't exist|browserType.launch/.test(msg)?'Chromium missing: npx playwright install chromium':/Timeout/.test(msg)?'DigiPOS timed out':'DigiPOS browser connection failed'};
 }finally{await context?.close().catch(()=>{});await browser?.close().catch(()=>{})}
}
// All requests use the authenticated browser context; never log credentials or cookies.
async function register(imei,{submit=false,onBeforeSubmit}={}){
 if(!isValidImei(imei))throw Error('Invalid IMEI');
 if(process.env.DIGIPOS_1B_ENABLED!=='true')return {status:'disabled',reason:'DIGIPOS_1B_ENABLED is false'};
 const connection=await connect();
 if(connection.status!=='connected')return connection;
 if(!submit)return {status:'ready_for_review',reason:'DigiPOS connected; registration not submitted'};
 if(process.env.DIGIPOS_ALLOW_SUBMIT!=='true')return {status:'disabled',reason:'DIGIPOS_ALLOW_SUBMIT is false'};
 let browser,context;
 try{
  const {chromium}=require('playwright');
  browser=await chromium.launch({headless:true});
  context=await browser.newContext({storageState:SESSION});
  const page=await context.newPage();
  page.setDefaultTimeout(TIMEOUT);
  await navigate(page,BASE+'/history.php');
  if(isLogin(page))return {status:'login_required',reason:'DigiPOS session expired'};
  const hist=await page.evaluate(async()=>{
   const res=await fetch('api/history.php',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   if(res.status===401)return {unauthorized:true};
   if(!res.ok)return {error:'History HTTP '+res.status};
   return await res.json();
  });
  if(hist.unauthorized)return {status:'login_required',reason:'DigiPOS session expired'};
  if(hist.ok!==true||!Array.isArray(hist.records))return {status:'manual_review',reason:'Cannot verify DigiPOS history before submission'};
  const found=hist.records.find(x=>x&&x.kind==='roamer'&&String(x.imei)===imei);
  if(found)return {status:'manual_review',reason:'IMEI already found in DigiPOS history; verify manually',orderId:found.orderId||null};
  if(typeof onBeforeSubmit!=='function')return {status:'manual_review',reason:'Durable submission marker callback missing'};
  // Persist before any potentially irreversible network request.
  await onBeforeSubmit();
  const response=await page.evaluate(async(imei)=>{
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),40000);
   try{
    const res=await fetch('api/roamer.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imei1:imei}),signal:controller.signal});
    const data=await res.json().catch(()=>null);
    return {httpStatus:res.status,data};
   }finally{clearTimeout(timeout)}
  },imei);
  const d=response.data;
  if(response.httpStatus===401)return {status:'manual_review',reason:'Authentication failed after submit attempt; check history'};
  if(!d||typeof d!=='object')return {status:'manual_review',reason:'Unparseable DigiPOS response; check history'};
  if(d.ok===true&&d.orderId&&String(d.imei1?.number||'')===imei&&d.imei1?.eligible===true){
   return {status:'submitted',reason:String(d.message||'Order created; final APPROVED/FAILED status must be verified'),orderId:String(d.orderId),trxId:d.trxId?String(d.trxId):null};
  }
  if(d.cooldown)return {status:'manual_review',reason:'DigiPOS cooldown; verify history before retry',waitSeconds:Number(d.waitSeconds)||null};
  if(d.ok===false)return {status:'failed',reason:String(d.error||d.message||'DigiPOS rejected registration').slice(0,250)};
  return {status:'manual_review',reason:'Ambiguous DigiPOS response; verify history'};
 }catch(e){
  return {status:'manual_review',reason:'DigiPOS request or connection uncertain; verify history, do not retry'};
 }finally{await context?.close().catch(()=>{});await browser?.close().catch(()=>{})}
}

const historyDiagnosticsSeen=new Set();
function diagnoseHistoryRecord(record,orderId){
 const keys=Object.keys(record||{}).filter(k=>!/(imei|phone|name|email|token|key|secret|password|session|cookie|auth)/i.test(k));
 const statusKeys=keys.filter(k=>/(status|state|result|approved|success|complete|reject|fail)/i.test(k));
 const signature=keys.slice().sort().join('|')+'|'+statusKeys.join('|');
 if(historyDiagnosticsSeen.has(signature))return;
 historyDiagnosticsSeen.add(signature);
 console.warn('[DIGIPOS HISTORY STRUCTURE]',JSON.stringify({
  orderId:String(orderId||'').replace(/[^0-9A-Za-z_-]/g,'').slice(0,40),
  fields:keys.slice(0,35),
  statusFields:statusKeys,
  statusTypes:Object.fromEntries(statusKeys.map(k=>[k,typeof record[k]]))
 }));
}
function finalHistoryStatus(record){
 const fields=['registrationStatus','orderStatus','status','finalStatus','resultStatus'];
 for(const key of fields){
  if(typeof record[key]!=='string')continue;
  const value=record[key].trim().toUpperCase();
  if(['APPROVED','SUCCESS','COMPLETED','DONE'].includes(value))return 'success';
  if(['FAILED','REJECTED','DECLINED'].includes(value))return 'failed';
 }
 return null;
}
async function checkHistory(imei,expectedOrderId){
 if(!isValidImei(imei))return {status:'manual_review',reason:'Invalid IMEI'};
 let browser,context;
 try{
  const {chromium}=require('playwright');
  browser=await chromium.launch({headless:true});
  context=await browser.newContext(fs.existsSync(SESSION)?{storageState:SESSION}:{});
  const page=await context.newPage();
  await navigate(page,BASE+'/history.php');
  if(isLogin(page))return {status:'manual_review',reason:'DigiPOS session expired'};
  const history=await page.evaluate(async()=>{
   const response=await fetch('api/history.php',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   if(!response.ok)return null;
   return response.json();
  });
  if(history?.ok!==true||!Array.isArray(history.records))return {status:'manual_review',reason:'DigiPOS history unavailable'};
  const matching=history.records.filter(row=>row&&String(row.imei||row.imei1?.number||'')===imei&&(!expectedOrderId||String(row.orderId||row.order_id||'')===String(expectedOrderId)));
  if(matching.length!==1)return {status:'manual_review',reason:matching.length?'Multiple matching history records':'No matching DigiPOS history record'};
  const record=matching[0];
  const orderId=String(record.orderId||record.order_id||'');
  const final=finalHistoryStatus(record);
  if(final)return {status:final,orderId,reason:'DigiPOS history explicitly confirmed '+final};
  diagnoseHistoryRecord(record,orderId);
  return {status:'manual_review',orderId,reason:'DigiPOS history exists; no explicit final status in recognized fields'};
 }catch(e){
  console.warn('[DIGIPOS HISTORY] Unable to verify final status:',e.message);
  return {status:'manual_review',reason:'DigiPOS history verification failed'};
 }finally{
  await context?.close().catch(()=>{});
  await browser?.close().catch(()=>{});
 }
}
module.exports={connect,register,checkHistory,isValidImei};
