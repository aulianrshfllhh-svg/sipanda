import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {ensureTemplates,instantiate} from './templates.js';
import {syncLampiran} from './lampiran.js';
export async function seedPlanning(prisma){
 await ensureTemplates(prisma);
 const opd=await prisma.opd.findUnique({where:{id:'kec-mundu'}});
 if(!opd)throw new Error('Data OPD Kecamatan Mundu belum tersedia. Jalankan seed OPD terlebih dahulu.');
 const template=await prisma.template.findUnique({where:{id:'tpl-renja-murni-2027-v1'}});
 const sections=instantiate(template,opd.nama,'2027');
 for(const bab of sections.slice(0,2))for(const sub of bab.subsections){
  sub.content=`<p>Data contoh untuk pengujian: ${sub.title}. Kecamatan Mundu menyusun rencana pelayanan administrasi, pemberdayaan masyarakat, dan koordinasi ketenteraman wilayah pada tahun 2027. Angka dalam dokumen ini merupakan data dummy, bukan capaian resmi.</p>`;
 }
 sections[0].subsections[0].content='<p>Renja Kecamatan Mundu Tahun 2027 menjadi pedoman pelayanan publik dan pelaksanaan program kecamatan. Dokumen contoh ini dipakai untuk menguji struktur enam bab, tabel, daftar tabel, dan lampiran otomatis SIPANDA.</p>';
 sections[1].subsections[0].content='<p>Data dummy evaluasi tahun 2025: pelayanan administrasi mencapai 90% dari target contoh. Evaluasi ini mencakup IKU, IKK, dan keterkaitan capaian Renstra. Data SPM hanya dimuat apabila relevan dengan kewenangan kecamatan.</p>';
 sections[1].subsections[2].tables=[{id:'mundu-permasalahan',type:'permasalahan',rows:[{level:'baris',cells:['Pelayanan administrasi','90% (dummy)','Target contoh 100%','Kapasitas operator','Akses warga','Waktu pelayanan belum merata']}]}];
 const rows=[{level:'urusan',cells:['7.01','Unsur Kewilayahan','','','','0','','','','0']}];
 for(const [i,nama] of ['Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota','Penyelenggaraan Pemerintahan dan Pelayanan Publik','Pemberdayaan Masyarakat Desa dan Kelurahan'].entries()){
  rows.push({level:'program',cells:[`7.01.0${i+1}`,`Program ${nama}`,'Capaian program (%)','Kecamatan Mundu','100','0','Data dummy','SIPD (contoh)','100','0']});
  rows.push({level:'kegiatan',cells:[`7.01.0${i+1}.2.01`,`Kegiatan contoh program ${i+1}`,'Keluaran kegiatan','Kecamatan Mundu','1 kegiatan','0','','','1 kegiatan','0']});
  rows.push({level:'subkegiatan',cells:[`7.01.0${i+1}.2.01.0001`,`Sub Kegiatan contoh ${i+1}`,'Dokumen layanan','Kecamatan Mundu','1 dokumen',String((i+1)*100000000),'Data dummy','Musrenbang','1 dokumen',String((i+1)*110000000)]});
 }
 sections[3].subsections[2].tables=[{id:'mundu-rancangan',type:'renja',rows}];
 const creator=await prisma.user.findFirst({where:{opdId:opd.id,isActive:true}});
 const doc=await prisma.document.upsert({where:{kodeDoc:'DEMO-RENJA-MUNDU-2027'},update:{},create:{
  kodeDoc:'DEMO-RENJA-MUNDU-2027',jenis:'Renja Murni',tahun:'2027',judul:'Renja Kecamatan Mundu 2027 (Data Dummy)',subJudul:'Contoh pengujian template dan lampiran',cara:'template',status:'Draft',opdId:opd.id,opdName:opd.nama,createdById:creator?.id,
  templateId:template.id,templateSnapshot:{id:template.id,nama:template.nama,versi:template.versi,tahun:template.tahun,sections:instantiate(template,opd.nama,'2027')},
  sections:{create:sections.map(s=>({babId:s.id,babTitle:s.title,babOrder:s.order,isLocked:true,subsections:s.subsections}))}
 }});
 await syncLampiran(prisma,doc);
 const losari=await prisma.opd.findUnique({where:{id:'kec-losari'}});
 if(!losari)throw new Error('Data OPD Kecamatan Losari belum tersedia. Jalankan seed OPD terlebih dahulu.');
 const murniTemplate=await prisma.template.findUnique({where:{id:'tpl-renja-murni-2027-v1'}});
 const changeTemplate=await prisma.template.findUnique({where:{id:'tpl-renja-perubahan-2027-v1'}});
 if(!murniTemplate||!changeTemplate)throw new Error('Template contoh Renja 2027 tidak ditemukan.');
 const createExample=async({kodeDoc,jenis,tahun,opdRecord,template,status,regulation,tailText})=>{
  const content=instantiate(template,opdRecord.nama,tahun);
  if(tailText){
   const lastBab=content.at(-1),lastSub=lastBab.subsections.at(-1);
   lastSub.content=`<p>${tailText}</p>`;
  }
  const creatorRecord=await prisma.user.findFirst({where:{opdId:opdRecord.id,isActive:true}});
  const result=await prisma.document.upsert({where:{kodeDoc},update:{},create:{
   kodeDoc,jenis,tahun,judul:`${jenis} Kecamatan ${opdRecord.nama.replace(/^Kecamatan\s+/i,'')} ${tahun} (Data Dummy)`,
   subJudul:'Data dummy untuk pengujian lampiran otomatis',cara:'template',status,opdId:opdRecord.id,opdName:opdRecord.nama,
   createdById:creatorRecord?.id,templateId:template.id,regulation,
   templateSnapshot:{id:template.id,nama:template.nama,versi:template.versi,tahun:template.tahun,sections:instantiate(template,opdRecord.nama,tahun)},
   sections:{create:content.map(section=>({babId:section.id,babTitle:section.title,babOrder:section.order,isLocked:true,subsections:section.subsections}))}
  }});
  await syncLampiran(prisma,result);
 };
 await createExample({
  kodeDoc:'DEMO-RENJA-LOSARI-2027',jenis:'Renja Murni',tahun:'2027',opdRecord:losari,template:murniTemplate,status:'Draft',
  tailText:'Paragraf penutup contoh ini sengaja dibuat panjang untuk menguji agar paragraf terakhir BAB Penutup tetap berada bersama blok tanda tangan Bupati dan dapat berpindah utuh ke halaman baru bila ruang halaman sebelumnya tidak mencukupi. Seluruh isi pada dokumen ini adalah data dummy dan bukan data perencanaan resmi.'
 });
 await createExample({
  kodeDoc:'DEMO-RENJA-PERUBAHAN-MUNDU-2026',jenis:'Renja Perubahan',tahun:'2026',opdRecord:opd,template:changeTemplate,status:'Menunggu Verifikasi',
  regulation:{periodeMulai:'2026',periodeAkhir:'2026'}
 });
 await createExample({
  kodeDoc:'DEMO-RENSTRA-LOSARI-2025-2029',jenis:'Renstra Murni',tahun:'2025',opdRecord:losari,template:murniTemplate,status:'Disetujui',
  regulation:{periodeMulai:'2025',periodeAkhir:'2029'}
 });
 console.log('Template dan contoh lampiran Losari/Mundu/Renstra siap. Dokumen yang sudah ada dipertahankan.');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/seed-planning.js')){
 const prisma=new PrismaClient();try{await seedPlanning(prisma);}catch(e){console.error(e);process.exitCode=1;}finally{await prisma.$disconnect();}
}
