const {GoogleGenAI}=require('@google/genai');
let client=null;
function getClient(){const key=String(process.env.GEMINI_API_KEY||'').trim();if(!key)return null;if(!client)client=new GoogleGenAI({apiKey:key});return client}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function statusText(e){return String(e?.status||e?.code||'')+' '+String(e?.message||e)}
function retryable(e){return /429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|5\d\d|high demand|timeout/i.test(statusText(e))}
async function generate(ai,model,prompt){
  const response=await ai.models.generateContent({
    model,
    contents:String(prompt),
    config:{systemInstruction:process.env.GEMINI_SYSTEM_PROMPT||'Kamu adalah asisten WhatsApp SUPER-BOT. Jawab ramah, jelas, ringkas, dan gunakan Bahasa Indonesia kecuali pengguna meminta bahasa lain.'}
  });
  const text=String(response.text||'').trim();
  if(!text)throw new Error('Gemini mengembalikan respons kosong');
  return text
}
async function askGemini(prompt){
  const ai=getClient();if(!ai)throw new Error('GEMINI_API_KEY belum diisi');
  const models=[...new Set([
    String(process.env.GEMINI_MODEL||'gemini-3.8-flash').trim(),
    String(process.env.GEMINI_FALLBACK_MODEL||'gemini-3.5-flash-lite').trim(),
    'gemini-3.1-flash-lite'
  ].filter(Boolean))];
  let last;
  for(const model of models){
    for(let attempt=0;attempt<3;attempt++){
      try{
        if(attempt>0)console.log('[GEMINI] retry',model,'attempt',attempt+1);
        return await generate(ai,model,prompt)
      }catch(e){
        last=e;
        console.error('[GEMINI]',model,statusText(e));
        if(!retryable(e))break;
        if(attempt<2)await sleep(1000*Math.pow(2,attempt))
      }
    }
    console.log('[GEMINI] switching model...');
  }
  throw last||new Error('Semua model Gemini gagal');
}
module.exports={askGemini};
