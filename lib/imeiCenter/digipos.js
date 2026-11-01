'use strict';
// DigiPOS browser adapter. Never infer registration success from a click.
const fs=require('fs');
const path=require('path');
const BASE='https://digipos.telkomsel.cloud';
const SESSION=process.env.DIGIPOS_SESSION_FILE||path.join(process.cwd(),'database','.digipos-session.json');
const TIMEOUT=Number(process.env.DIGIPOS_TIMEOUT_MS||45000);
const isValidImei=v=>/^\d{15}$/.test(String(v||''));
const isLogin=page=>/\/login\.php/i.test(new URL(page.url()).pathname);
async function navigate(page,url){
 try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:TIMEOUT});}
 catch(e){if(!/ERR_ABORTED/.test(String(e)))throw e;await page.waitForTimeout(1200);}
}
async function connect(){
 const {chromium}=require('playwright');
 const browser=await chromium.launch({headless:true});
 let context;
 try{
  const opts=fs.existsSync(SESSION)?{storageState:SESSION}:{};
  context=await browser.newContext(opts);
  const page=await context.newPage();
  page.setDefaultTimeout(TIMEOUT);
  await navigate(page,BASE+'/roamer.php');
  if(isLogin(page)||await page.locator('input[type="password"]').count()){
   const username=process.env.DIGIPOS_USERNAME;
   const password=process.env.DIGIPOS_PASSWORD;
   if(!username||!password)return {status:'login_required',reason:'Set credentials in VPS .env'};
   const user=page.locator('input[name="username"],input[placeholder*="Username" i]').first();
   const pass=page.locator('input[type="password"]').first();
   const login=page.getByRole('button',{name:/login/i}).first();
   if(!await user.count()||!await pass.count()||!await login.count())return {status:'manual_review',reason:'Login form selector changed'};
   await user.fill(username);
   await pass.fill(password);
   try{await login.click({timeout:TIMEOUT});}
   catch(e){if(!/ERR_ABORTED|navigation|closed/i.test(String(e)))throw e;}
   await page.waitForTimeout(1500);
   if(isLogin(page))return {status:'login_required',reason:'Login did not leave login page'};
   // Login may itself redirect to /roamer.php; avoid racing that navigation.
   if(!/\/roamer\.php/i.test(new URL(page.url()).pathname))await navigate(page,BASE+'/roamer.php');
  }
  const imei=page.locator('input[name="imei" i],input[placeholder*="IMEI" i]').first();
  if(!await imei.count())return {status:'manual_review',reason:'IMEI form missing after login'};
  fs.mkdirSync(path.dirname(SESSION),{recursive:true,mode:0o700});
  await context.storageState({path:SESSION});
  fs.chmodSync(SESSION,0o600);
  return {status:'connected',url:page.url()};
 }finally{await context?.close().catch(()=>{});await browser.close().catch(()=>{});}
}
async function register(imei,{submit=false}={}){
 if(!isValidImei(imei))throw Error('Invalid IMEI');
 if(process.env.DIGIPOS_1B_ENABLED!=='true')return {status:'disabled'};
 // Registration is intentionally not submitted until result parser is validated.
 if(submit)return {status:'manual_review',reason:'Automated submission not enabled until verified result parsing'};
 const connection=await connect();
 if(connection.status!=='connected')return connection;
 return {status:'ready_for_review',reason:'DigiPOS connected; no registration submitted'};
}
module.exports={connect,register,isValidImei};
