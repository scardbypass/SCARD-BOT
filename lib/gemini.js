const {GoogleGenAI}=require('@google/genai');
let client=null;
function getClient(){const key=String(process.env.GEMINI_API_KEY||'').trim();if(!key)return null;if(!client)client=new GoogleGenAI({apiKey:key});return client}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function retryable(e){const s=String(e?.message||e);return /503|UNAVAILABLE|high demand|429|RESOURCE_EXHAUSTED/i.test(s)}
async function generate(ai,model,prompt){const response=await ai.models.generateContent({model,contents:String(prompt),config:{systemInstruction:process.env.GEMINI_SYSTEM_PROMPT||'Kamu adalah asisten WhatsApp SCARD-BOT. Jawab ramah, jelas, ringkas, dan gunakan Bahasa Indonesia kecuali pengguna meminta bahasa lain.'}});return String(response.text||'').trim()}
async function askGemini(prompt){
  const ai=getClient();if(!ai)throw new Error('GEMINI_API_KEY belum diisi');
  const primary=String(process.env.GEMINI_MODEL||'gemini-3.8-flash').trim();
  const fallback=String(process.env.GEMINI_FALLBACK_MODEL||'gemini-3.5-flash-lite').trim();
  let last;
  for(let i=0;i<2;i++){try{return await generate(ai,primary,prompt)}catch(e){last=e;if(!retryable(e))throw e;if(i===0)await sleep(1500)}}
  if(fallback&&fallback!==primary){try{console.log('[GEMINI] fallback ->',fallback);return await generate(ai,fallback,prompt)}catch(e){last=e}}
  throw last;
}
module.exports={askGemini};
