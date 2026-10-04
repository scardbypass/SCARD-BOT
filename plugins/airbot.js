const {formatRupiah,getQuotedText}=require('../lib/utils');
const {setPending,getPending,clearPending}=require('../lib/airbotBridge');

function nominal(v){const n=parseInt(String(v||'').replace(/[^\d]/g,''),10);return Number.isFinite(n)&&n>0?n:null}
function quotedNominal(t){const m=String(t||'').match(/Nominal\s*:\s*Rp?\s*([\d.,]+)/i);return m?nominal(m[1]):null}

module.exports={
  commands:['airbot','depoapi'],
  registered:true,
  ownerOnly:true,
  menu:'airbot <nominal|cancel> • depoapi',
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
      let n=quotedNominal(qt);
      if(!n&&p)n=p.nominal;
      if(!n)return reply('❌ Deposit aktif tidak ditemukan.\n\nMulai lagi dengan:\nairbot 100000');
      if(qt&&!qt.includes('Request Deposit AirBot'))return reply('❌ Reply pesan *Request Deposit AirBot* yang benar, lalu kirim:\ndepoapi');
      await sock.sendMessage(group,{text:`/Api topup ${n}`});
      clearPending(phone);
      return reply(`✅ *CEIR Topup Dikirim*\n\nNominal : ${formatRupiah(n)}\n\nPerintah ke grup:\n/Api topup ${n}`);
    }
  }
};
