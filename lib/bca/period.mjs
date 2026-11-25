const day=86400000;
const format=d=>d.toISOString().slice(0,10);
export function parsePeriod(args=[],now=new Date()){
 const today=new Date(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)+'T00:00:00Z');
 const parse=s=>{const m=/^(\d{2})-(\d{2})-(\d{4})$/.exec(s);if(!m)throw Error('Gunakan DD-MM-YYYY.');const iso=m[3]+'-'+m[2]+'-'+m[1];const d=new Date(iso+'T00:00:00Z');if(!Number.isFinite(+d)||format(d)!==iso)throw Error('Tanggal tidak valid.');return d;};
 let start=today,end=today;
 if(args.length===1&&/^\d+$/.test(args[0])){const n=Number(args[0]);if(!Number.isSafeInteger(n)||n<1||n>31)throw Error('Jumlah hari harus 1–31.');start=new Date(+today-(n-1)*day);}
 else if(args.length===1)start=end=parse(args[0]);
 else if(args.length===2){start=parse(args[0]);end=parse(args[1]);}
 else if(args.length)throw Error('Format periode tidak valid.');
 if(start>end||end>today)throw Error('Rentang tanggal tidak valid.');
 if((end-start)/day>=31)throw Error('Maksimal 31 hari per permintaan; batas bank dapat lebih pendek.');
 return {start:format(start),end:format(end)};
}
