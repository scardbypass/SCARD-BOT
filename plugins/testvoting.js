const {sendPoll}=require('../lib/votingScheduler');

module.exports={
  commands:['testvoting','tvote'],
  registered:false,
  ownerOnly:false,
  menu:'testvoting',
  async run({sock,msg,reply,isOwner}){
    // Self-chat selalu dianggap owner oleh core. Untuk pesan masuk biasa,
    // test hanya boleh dari owner yang sudah dikenali.
    if(!msg.key.fromMe&&!isOwner)return reply('❌ Test voting hanya untuk OWNER.');
    const jid=String(process.env.VOTING_GROUP_ID||'').trim();
    console.log('[TESTVOTING] requested','fromMe=',!!msg.key.fromMe,'owner=',!!isOwner,'target=',jid||'-');
    if(!jid)return reply('❌ VOTING_GROUP_ID belum diatur di .env');
    try{
      const sent=await sendPoll(sock,'Senin');
      console.log('[TESTVOTING] success',sent?.key?.id||'OK');
      return reply('✅ Voting test terkirim ke grup.\n\nPilihan: Gas / Izin');
    }catch(e){
      console.error('[TESTVOTING ERROR]',e);
      return reply('❌ Voting gagal: '+String(e?.message||e));
    }
  }
};
