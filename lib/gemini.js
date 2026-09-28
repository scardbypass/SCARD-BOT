const {GoogleGenAI}=require('@google/genai');

let client=null;
let modelCache={models:[],expires:0};
let lastGoodModel='';
let lastGoodModel='';
const cooldowns=new Map();

function getClient(){
  const key=String(process.env.GEMINI_API_KEY||'').trim();
  if(!key)return null;
  if(!client)client=new GoogleGenAI({apiKey:key});
  return client;
}
function errorText(e){return String(e?.status||e?.code||'')+' '+String(e?.message||e)}
function overloaded(e){return /429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|high demand|timeout/i.test(errorText(e))}
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
  }catch(e){console.error('[GEMINI MODELS]',errorText(e))}
  modelCache={models:[...new Set(found)],expires:Date.now()+30*60*1000};
  return modelCache.models;
}

function rankModels(available){
  const configured=[
    String(process.env.GEMINI_MODEL||'gemini-3.8-flash').trim(),
    String(process.env.GEMINI_FALLBACK_MODEL||'').trim()
  ].filter(Boolean);
  const discovered=available.filter(x=>/^gemini-.*flash/i.test(x)&&!/live|tts|image|audio|preview|exp/i.test(x));
  let list=[...new Set([...configured.filter(x=>!available.length||available.includes(x)),...discovered])];
  if(lastGoodModel)list=[lastGoodModel,...list.filter(x=>x!==lastGoodModel)];
  const now=Date.now();
  const ready=list.filter(x=>(cooldowns.get(x)||0)<=now);
  const cooling=list.filter(x=>(cooldowns.get(x)||0)>now);
  return [...ready,...cooling].slice(0,3);
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
  if(!models.length)throw new Error('Tidak ada model Gemini generateContent yang tersedia');

  let last;
  for(const model of models){
    if((cooldowns.get(model)||0)>Date.now())continue;
    try{
      console.log('[AI] try',model);
      const answer=await generate(ai,model,prompt);
      lastGoodModel=model;
      cooldowns.delete(model);
      console.log('[AI] success',model);
      return answer;
    }catch(e){
      last=e;
      console.error('[AI]',model,errorText(e));
      if(overloaded(e))cooldowns.set(model,Date.now()+60*1000);
    }
  }
  const err=new Error('AI sedang sibuk. Coba lagi beberapa saat.');
  err.publicMessage='⚠️ AI sedang sibuk. Coba lagi beberapa saat.';
  err.cause=last;
  throw err;
}
module.exports={askGemini};
