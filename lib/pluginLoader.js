const fs=require('fs');const path=require('path');
function loadPlugins(){const dir=path.join(__dirname,'..','plugins');const out=[];for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js'))){delete require.cache[require.resolve(path.join(dir,f))];const p=require(path.join(dir,f));if(p&&Array.isArray(p.commands)&&typeof p.run==='function')out.push({...p,file:f})}return out}
module.exports={loadPlugins}
