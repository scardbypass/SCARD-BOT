const fs=require('fs');const path=require('path');
const warned=new Map();
function loadPlugins(){
 const dir=path.join(__dirname,'..','plugins'),out=[];
 for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js'))){
  const full=path.join(dir,f);
  try{
   const stat=fs.statSync(full);
   const cached=require.cache[require.resolve(full)];
   if(cached&&cached.__fileMtime!==stat.mtimeMs)delete require.cache[require.resolve(full)];
   const p=require(full);
   if(require.cache[require.resolve(full)])require.cache[require.resolve(full)].__fileMtime=stat.mtimeMs;
   if(p&&Array.isArray(p.commands)&&typeof p.run==='function')out.push({...p,file:f});
   warned.delete(f);
  }catch(e){
   const message=String(e?.message||e);
   if(warned.get(f)!==message){console.error('[PLUGIN LOAD ERROR]',f,message);warned.set(f,message)}
  }
 }
 return out;
}
module.exports={loadPlugins};
