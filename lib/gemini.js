const {GoogleGenAI}=require('@google/genai');
let client=null;
function getClient(){const key=String(process.env.GEMINI_API_KEY||'').trim();if(!key)return null;if(!client)client=new GoogleGenAI({apiKey:key});return client}
async function askGemini(prompt){const ai=getClient();if(!ai)throw new Error('GEMINI_API_KEY belum diisi');const response=await ai.models.generateContent({model:process.env.GEMINI_MODEL||'gemini-3.8-flash',contents:String(prompt),config:{systemInstruction:process.env.GEMINI_SYSTEM_PROMPT||'Kamu adalah asisten WhatsApp SCARD-BOT. Jawab ramah, jelas, ringkas, dan gunakan Bahasa Indonesia kecuali pengguna meminta bahasa lain.'}});return String(response.text||'').trim()}
module.exports={askGemini}
