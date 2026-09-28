const {sendPoll}=require('../lib/votingScheduler');

module.exports={
  commands:['testvoting'],
  registered:true,
  ownerOnly:true,
  menu:'testvoting',
  async run({sock,reply}){
    const jid=process.env.VOTING_GROUP_ID;
    if(!jid)return reply('❌ VOTING_GROUP_ID belum diatur di .env');
    await sendPoll(sock,'🏸 Badminton TEST\nSiapa yang ikut?');
    return reply('✅ Voting test berhasil dikirim ke grup.\n\nTest ini tidak mengubah jadwal voting otomatis.');
  }
};
