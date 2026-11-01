'use strict';
// DigiPOS 1B browser adapter. Explicitly opt-in; no credential logging.
// Requires playwright installed separately and a permitted DigiPOS account.
const fs=require('fs');
const path=require('path');
const URL='https://digipos.telkomsel.cloud';
const SESSION=process.env.DIGIPOS_SESSION_FILE||path.join(process.cwd(),'database','.digipos-session.json');
const timeout=Number(process.env.DIGIPOS_TIMEOUT_MS||45000);
const isValidImei=v=>/^\d{15}$/.test(String(v||''));
async function register(imei,{submit=false}={}){
 if(!isValidImei(imei))throw Error('Invalid IMEI');
 if(process.env.DIGIPOS_1B_ENABLED!=='true')return {status:'disabled'};
 let chromium;
 try{({chromium}=require('playwright'))}catch{throw Error('Playwright missing: npm install playwright && npx playwright install chromium')}
 const browser=await chromium.launch({headless:true});
 let context;
 try{
  context=await browser.newContext(fs.existsSync(SESSION)?{storageState:SESSION}:{});
  const page=await context.newPage();
  page.setDefaultTimeout(timeout);
  await page.goto(URL+'/roamer.php',{waitUntil:'domcontentloaded',timeout});
  if(/login/i.test(page.url())||await page.locator('input[type="password"]').count()){
   const username=process.env.DIGIPOS_USERNAME,password=process.env.DIGIPOS_PASSWORD;
   if(!username||!password)return {status:'login_required',reason:'Credentials not configured'};
   const userInput=page.locator('input[name="username"],input[placeholder*="Username" i]').first();
   const passInput=page.locator('input[type="password"]').first();
   if(!await userInput.count()||!await passInput.count())return {status:'manual_review',reason:'Login form changed'};
   await userInput.fill(username);await passInput.fill(password);
   await page.getByRole('button',{name:/^login$/i}).click();
   await page.waitForLoadState('domcontentloaded').catch(()=>{});
   if(/login/i.test(page.url()))return {status:'login_required',reason:'Login needs manual review'};
   fs.mkdirSync(path.dirname(SESSION),{recursive:true});
   await context.storageState({path:SESSION});
   fs.chmodSync(SESSION,0o600);
   await page.goto(URL+'/roamer.php',{waitUntil:'domcontentloaded',timeout});
  }
  const input=page.locator('input[placeholder*="IMEI" i],input[name="imei" i]').first();
  if(!await input.count())return {status:'manual_review',reason:'IMEI field not found'};
  await input.fill(String(imei));
  const duration=page.locator('select').first();
  if(await duration.count()){
   const options=await duration.locator('option').allTextContents();
   const thirty=options.find(x=>/30\s*hari/i.test(x));
   if(thirty)await duration.selectOption({label:thirty});
   else return {status:'manual_review',reason:'30-day option not found'};
  }else return {status:'manual_review',reason:'Duration selector not found'};
  // Never submit by default: result/confirmation DOM is not yet verified.
  if(!submit)return {status:'ready_for_review',reason:'Form filled; submission disabled'};
  if(process.env.DIGIPOS_ALLOW_SUBMIT!=='true')return {status:'ready_for_review',reason:'DIGIPOS_ALLOW_SUBMIT is not enabled'};
  const button=page.getByRole('button',{name:/^daftar$/i}).first();
  if(!await button.count())return {status:'manual_review',reason:'Daftar button not found'};
  await button.click();
  await page.waitForTimeout(1500);
  // Do not infer success from navigation or HTTP 200; require a verified result parser.
  return {status:'manual_review',reason:'Submission attempted; verify DigiPOS result before settling order'};
 }finally{await context?.close().catch(()=>{});await browser.close().catch(()=>{})}
}
module.exports={register,isValidImei};
