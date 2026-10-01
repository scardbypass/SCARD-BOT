const db=require('./database')
const {getText}=require('./utils')

function normalize(s){return String(s||'').toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu,' ').replace(/\\s+/g,' ').trim()}
function hit(text,term){
  const a=normalize(text),b=normalize(term)
  if(!a||!b)return false
  return b.includes(' ')?(` ${a} `).includes(` ${b} `):a.split(' ').includes(b)
}
async function handleAntiMessage(sock,msg,{isOwner=false}={}){
  const chat=msg?.key?.remoteJid||''
  if(!chat.endsWith('@g.us')||msg.key.fromMe||isOwner)return false
  const groups=db.getSetting('antiToxicGroups',{})
  if(!groups[chat])return false
  const text=getText(msg)
  const list=db.getSetting('antiToxicWords',[])
  const found=list.find(w=>hit(text,w))
  if(!found)return false
  try{
    await sock.sendMessage(chat,{delete:msg.key})
    await sock.sendMessage(chat,{text:'⚠️ Pesan dihapus oleh *Anti Toxic*.\nJaga bahasa di grup ya.'})
    console.log('[ANTI TOXIC] deleted',chat,'match=',found)
    return true
  }catch(e){
    console.error('[ANTI TOXIC]',e.message)
    return false
  }
}
module.exports={handleAntiMessage}
