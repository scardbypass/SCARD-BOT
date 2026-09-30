const {normalizeProvider,setProviderEnabled,listProviders}=require('../lib/providerSettings')

module.exports={
  commands:['provider'],
  registered:true,
  ownerOnly:true,
  menuSection:'OWNER',
  menu:'/provider [nama] [on/off]',
  async run({reply,args}){
    const name=args[0],mode=String(args[1]||'').toLowerCase()
    if(!name){
      const rows=listProviders().map(x=>`${x.enabled?'🟢':'⚫'} ${x.label.padEnd(12,' ')} • *${x.enabled?'ON':'OFF'}*`)
      return reply(['⚙️ *PROVIDER SETTINGS*','',...rows,'','Ubah: */provider airbot off*'].join('\n'))
    }
    const key=normalizeProvider(name)
    if(!key)return reply('❌ Provider tidak dikenal.\nGunakan: roamercheck, airbot, sickw, esimaccess, orderkuota.')
    if(!['on','off'].includes(mode))return reply(`❌ Format: /provider ${name} on|off`)
    const r=setProviderEnabled(key,mode==='on')
    return reply(`${r.enabled?'🟢':'⚫'} *${r.label} ${r.enabled?'ON':'OFF'}*\n\nStatus tersimpan di database dan langsung berlaku untuk pengecekan saldo berikutnya.`)
  }
}
