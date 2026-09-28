const {GoogleGenAI}=require('@google/genai');

let client=null;
let modelCache={models:[],expires:0};

function getClient(){
  const key=String(process.env.GEMINI_API_KEY||'').trim();
  if(!key)return null;
  if(!client)client=new GoogleGenAI({apiKey:key});
  return client;
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function errorText(e){return String(e?.status||e?.code||'')+' '+String(e?.message||e)}
function retryable(e){return /429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|5\d\d|high demand|timeout/i.test(errorText(e))}
function cleanName(name=''){return String(name).replace(/^models\//,'').trim()}

async function availableGenerateModels(ai){
  if(modelCache.models.length&&Date.now()<modelCache.expires)return modelCache.models;
  const found=[];
  try{
    const pager=await ai.models.list();
    for await(const m of pager){
      const actions=m.supportedActions||m.supported_actions||[];
      if(!actions.includes('generateContent'))continue;
      const name=cleanName(m.name||m.baseModelId||m.base_model_id);
      if(name)found.push(name);
    }
  }catch(e){
    console.error('[GEMINI MODELS]',errorText(e));
  }
  modelCache={models:[...new Set(found)],expires:Date.now()+10*60*1000};
  if(modelCache.models.length)console.log('[GEMINI] available generate models:',modelCache.models.filter(x=>/gemini.*flash/i.test(x)).slice(0,12).join(', '));
  return modelCache.models;
}

function rankModels(available){
  const preferred=[
    String(process.env.GEMINI_MODEL||'gemini-3.8-flash').trim(),
    String(process.env.GEMINI_FALLBACK_MODEL||'gemini-3.7-flash').trim(),
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash'
  ].filter(Boolean);
  const pool=available.length?available:preferred;
  const usable=preferred.filter(x=>pool.includes(x));
  const discovered=pool.filter(x=>/^gemini-.*flash/i.test(x)&&!/live|tts|image|audio|preview|exp/i.test(x));
  return [...new Set([...usable,...discovered])].slice(0,5);
}

async function generate(ai,model,prompt){
  const response=await ai.models.generateContent({
    model,
    contents:String(prompt),
    config:{
      systemInstruction:process.env.GEMINI_SYSTEM_PROMPT||
        'Kamu adalah asisten WhatsApp SUPER-BOT. Jawab ramah, jelas, ringkas, dan gunakan Bahasa Indonesia kecuali pengguna meminta bahasa lain.'
    }
  });
  const text=String(response.text||'').trim();
  if(!text)throw new Error('Gemini mengembalikan respons kosong');
  return text;
}

async function askGemini(prompt){
  const ai=getClient();
  if(!ai)throw new Error('GEMINI_API_KEY belum diisi');

  const available=await availableGenerateModels(ai);
  const models=rankModels(available);
  if(!models.length)throw new Error('Tidak ada model Gemini generateContent yang tersedia untuk API key ini');

  let last;
  for(const model of models){
    for(let attempt=1;attempt<=2;attempt++){
      try{
        console.log('[GEMINI] try',model,'attempt',attempt);
        const answer=await generate(ai,model,prompt);
        console.log('[GEMINI] success',model);
        return answer;
      }catch(e){
        last=e;
        console.error('[GEMINI]',model,errorText(e));
        if(!retryable(e))break;
        if(attempt<2)await sleep(1200);
      }
    }
  }

  const err=new Error('AI sedang sibuk. Coba lagi beberapa saat.');
  err.publicMessage='⚠️ AI sedang sibuk. Coba lagi beberapa saat.';
  err.cause=last;
  throw err;
}

module.exports={askGemini};
