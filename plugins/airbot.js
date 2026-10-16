const {formatRupiah,getQuotedText}=require('../lib/utils');
const {setPending,getPending,clearPending,beginTopup,setTopupMessageId,clearTopup,armTopupTimeout}=require('../lib/airbotBridge');

function nominal(v){const n=parseInt(String(v||'').replace(/[^\d]/g,''),10);return Number.isFinite(n)&&n>0?n:null}
function quotedNominal(t){const m=String(t||'').match(/Nominal\s*:\s*Rp?\s*([\d.,]+)/i);return m?nominal(m[1]):null}

module.exports={
  commands:['airbot','depoapi'],
  registered:true,
  ownerOnly:true,
  menu:'airbot <nominal|cancel> • depoapi [nominal]',
  async run({sock,msg,reply,command,args,phone}){
    const group=process.env.AIRBOT_GROUP_ID;
    if(!group)return reply('❌ AIRBOT_GROUP_ID belum diatur di .env');
    if(msg.key.remoteJid?.endsWith('@g.us'))return reply('❌ Gunakan command ini di private chat.');

    if(command==='airbot'){
      const input=String(args.join(' ')||'').trim();

      if(input.toLowerCase()==='cancel'){
        await sock.sendMessage(group,{text:'/Deposit cancel'});
        clearPending(phone);
        return reply('✅ *Deposit AirBot Dibatalkan*\n\nPerintah dikirim ke grup:\n/Deposit cancel');
      }

      const n=nominal(input);
      if(!n)return reply('❌ Nominal tidak valid.\n\nContoh:\nairbot 100000\n\nBatalkan deposit:\nairbot cancel');
      await sock.sendMessage(group,{text:`/deposit ${n}`});
      setPending(phone,{nominal:n,chat:msg.key.remoteJid,qrForwarded:false});
      return reply(`✅ *Request Deposit AirBot*\n\nNominal : ${formatRupiah(n)}\n\nPerintah dikirim ke grup:\n/deposit ${n}\n\nQRIS dari AirBot akan diteruskan ke chat ini dan otomatis dihapus setelah 10 menit.\n\nJika deposit sudah masuk, reply pesan ini dengan:\n*depoapi*`);
    }

    if(command==='depoapi'){
      const qt=getQuotedText(msg);
      const p=getPending(phone);
      const direct=String(args.join(' ')||'').trim();
      if(direct&&!/^\d+$/.test(direct))return reply('❌ Nominal harus angka positif. Contoh: /depoapi 10000');
      let n=direct?nominal(direct):quotedNominal(qt);
      if(!n&&!direct&&p)n=p.nominal;
      if(!n)return reply('❌ Nominal tidak valid atau deposit aktif tidak ditemukan.\n\nContoh langsung:\n/depoapi 10000\n\nAtau reply pesan Request Deposit AirBot dengan /depoapi');
      if(!direct&&qt&&!qt.includes('Request Deposit AirBot'))return reply('❌ Reply pesan *Request Deposit AirBot* yang benar, atau gunakan /depoapi 10000');
      if(n<10000)return reply('❌ Minimal topup CEIR API adalah Rp10.000.\n\nContoh: /depoapi 10000');
      if(!beginTopup({chat:msg.key.remoteJid,nominal:n}))return reply('⏳ Masih ada topup CEIR yang menunggu respons grup. Tunggu konfirmasi atau timeout sebelum mengirim transaksi lain.');
      try{
        const sent=await sock.sendMessage(group,{text:`/Api topup ${n}`});
        setTopupMessageId(sent?.key?.id);
        clearPending(phone);
        armTopupTimeout(sock);
        return reply(`⏳ *Menunggu Konfirmasi CEIR*\n\nNominal: ${formatRupiah(n)}\nPerintah topup telah dikirim ke grup.\nHasil berhasil/gagal akan diteruskan dari respons grup (maksimal 2 menit).`);
      }catch(error){clearTopup();return reply('❌ Gagal mengirim perintah topup ke grup: '+error.message)}
    }
  }
};
