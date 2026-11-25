import PDFDocument from 'pdfkit';
export const FOOTER='Ingat, kamu miskin!! Tetap bekerja jadi budak 🤪';
const money=n=> 'Rp'+n.toLocaleString('id-ID',{maximumFractionDigits:2});
export async function mutationPdf(reports){
 if(!Array.isArray(reports)||!reports.length)throw new Error('Data mutasi kosong');
 for(const r of reports){
 if(!/^\d{10}$/.test(r.account)||!Array.isArray(r.transactions)||!Number.isFinite(r.balance)||r.transactions.some(t=>!['CR','DB'].includes(t.type)||!Number.isFinite(t.amount)||t.amount<0))throw new Error('Data mutasi tidak valid');
 }
 const doc=new PDFDocument({size:'A4',margin:42,bufferPages:true});
 const chunks=[]; const result=new Promise((resolve,reject)=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 function header(r){doc.fillColor('#123c75').font('Helvetica-Bold').fontSize(18).text('SCARD BANKING');doc.fontSize(12).text('LAPORAN MUTASI REKENING BCA');doc.moveDown().fillColor('#222222').font('Helvetica').fontSize(10).text('Rekening: '+r.alias+' | '+r.account).text('Periode: '+r.start+' - '+r.end).moveDown();}
 function table(){const y=doc.y;doc.rect(42,y,511,22).fill('#123c75');doc.fillColor('white').fontSize(9).text('Tanggal / Keterangan',48,y+6,{width:280}).text('Masuk',335,y+6,{width:100,align:'right'}).text('Keluar',440,y+6,{width:105,align:'right'});doc.y=y+27;}
 for(const [i,r] of reports.entries()){
 if(i)doc.addPage();header(r);table();let cr=0,db=0;
 for(const t of r.transactions){const desc=String(t.date||'')+' | '+String(t.description||'').slice(0,500);doc.font('Helvetica').fontSize(9);const h=Math.max(24,doc.heightOfString(desc,{width:280})+10);if(doc.y+h>740){doc.addPage();header(r);table();}const y=doc.y;doc.fillColor('#222222').text(desc,48,y,{width:280});doc.fillColor('#15803d').text(t.type==='CR'?money(t.amount):'-',335,y,{width:100,align:'right'});doc.fillColor('#b91c1c').text(t.type==='DB'?money(t.amount):'-',440,y,{width:105,align:'right'});doc.moveTo(42,y+h-4).lineTo(553,y+h-4).strokeColor('#dddddd').stroke();doc.y=y+h;if(t.type==='CR')cr+=t.amount;else db+=t.amount;}
 if(doc.y>640){doc.addPage();header(r);}doc.moveDown().fillColor('#222222').fontSize(11).text('Total transaksi: '+r.transactions.length).text('Total masuk: '+money(cr)).text('Total keluar: '+money(db)).text('Selisih: '+money(cr-db)).font('Helvetica-Bold').text('Saldo akhir: '+money(r.balance));
 }
 const pages=doc.bufferedPageRange();for(let i=0;i<pages.count;i++){doc.switchToPage(pages.start+i);const bottom=doc.page.margins.bottom;doc.page.margins.bottom=0;doc.font('Helvetica').fontSize(8).fillColor('#555555').text(FOOTER.replace(' 🤪',''),42,766,{width:511,align:'center',lineBreak:false}).text('Laporan internal - bukan rekening koran resmi BCA | '+(i+1)+'/'+pages.count,42,780,{width:511,align:'center',lineBreak:false});doc.page.margins.bottom=bottom;}
 doc.end();return result;
}
