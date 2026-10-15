import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { Document, Paragraph, Packer } from 'docx';
import ExcelJS from 'exceljs';

const prisma=new PrismaClient();
const outputDir=path.resolve('private-uploads/evaluasi-triwulan');
const columns='id,jenis,opd_id AS opdId,tahun,triwulan,judul,catatan,file_path AS filePath,nama_file_asli AS namaFileAsli,mime,ukuran,versi,aktif,diunggah_oleh AS diunggahOleh,diunggah_pada AS diunggahPada';
async function main(){
 await fs.mkdir(outputDir,{recursive:true});
 const admins=await prisma.$queryRaw`SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.kode='super_admin' LIMIT 1`;
 const uploader=admins[0]?.id;if(!uploader)throw new Error('Akun Super Admin untuk pengunggah contoh tidak ditemukan.');
 for(const [opdId,status] of [['dinkes','Final'],['bkad','Disetujui Bapperida']]){
  const doc=await prisma.document.findFirst({where:{opdId,jenis:{in:['Renja Murni','Renja Perubahan','Renstra','Renstra Murni','Renstra Perubahan']},parentId:null,isLampiranOtomatis:false},orderBy:{updatedAt:'desc'},include:{sections:{orderBy:{babOrder:'asc'}},attachments:true}});
  if(!doc){console.log(`Tidak ada dokumen ${opdId} untuk data contoh.`);continue;}
  const now=new Date(),snapshot=JSON.stringify({capturedAt:now.toISOString(),document:JSON.parse(JSON.stringify({...doc,status,finalizedAt:status==='Final'?now:null,finalizedBy:status==='Final'?uploader:null}))});
  await prisma.$transaction(async tx=>{
   await tx.$executeRaw`UPDATE documents SET status=${status},finalized_at=${status==='Final'?now:null},finalized_by=${status==='Final'?uploader:null},final_snapshot=${status==='Final'?snapshot:null},updated_at=${now} WHERE id=${doc.id}`;
   await tx.$executeRaw`INSERT INTO document_status_logs (id,document_id,dari,ke,oleh,alasan,perubahan,waktu) VALUES (${randomUUID()},${doc.id},${doc.status},${status},${uploader},'Data contoh revisi SIPANDA',NULL,${now})`;
   if(status==='Final'){const annexes=await tx.document.findMany({where:{parentId:doc.id,isLampiranOtomatis:true},include:{sections:true,attachments:true}});for(const annex of annexes){const annexSnapshot=JSON.stringify({capturedAt:now.toISOString(),document:JSON.parse(JSON.stringify({...annex,status:'Final',finalizedAt:now,finalizedBy:uploader}))});await tx.$executeRaw`UPDATE documents SET status='Final',finalized_at=${now},finalized_by=${uploader},final_snapshot=${annexSnapshot},updated_at=${now} WHERE id=${annex.id}`;await tx.$executeRaw`INSERT INTO document_status_logs (id,document_id,dari,ke,oleh,alasan,perubahan,waktu) VALUES (${randomUUID()},${annex.id},${annex.status},'Final',${uploader},'Finalisasi data contoh',NULL,${now})`;}}
  });
  console.log(`${doc.opdName}: ${doc.judul} -> ${status}`);
 }
 const pdf=await PDFDocument.create(),page=pdf.addPage([595,842]),font=await pdf.embedFont(StandardFonts.Helvetica);page.drawText('Contoh Evaluasi Renja Perangkat Daerah',{x:50,y:780,size:16,font});page.drawText('Data contoh SIPANDA • unggahan triwulan',{x:50,y:750,size:11,font});
 const docx=await Packer.toBuffer(new Document({sections:[{children:[new Paragraph('Contoh Evaluasi Renja Perangkat Daerah'),new Paragraph('Data contoh SIPANDA • unggahan triwulan')]}]}));
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Evaluasi');sheet.addRow(['Indikator','Target','Realisasi']);sheet.addRow(['Contoh kegiatan','100','75']);const xlsx=Buffer.from(await workbook.xlsx.writeBuffer());
 const examples=[['renja_pd','dinkes',1,'pdf','application/pdf',Buffer.from(await pdf.save())],['renja_pd','bkad',2,'docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',docx],['renja_pd','disdik',3,'xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',xlsx],['rkpd',null,1,'pdf','application/pdf',Buffer.from(await pdf.save())]];
 for(const [jenis,opdId,triwulan,ext,mime,bytes] of examples){const tahun='2026',active=await prisma.$queryRaw`SELECT id,versi FROM evaluasi_triwulan WHERE jenis=${jenis} AND ((opd_id=${opdId}) OR (opd_id IS NULL AND ${opdId} IS NULL)) AND tahun=${tahun} AND triwulan=${triwulan} AND aktif=1 ORDER BY versi DESC LIMIT 1`;if(active.length)continue;const filePath=path.join(outputDir,`${randomUUID()}.${ext}`);await fs.writeFile(filePath,bytes);await prisma.$executeRaw`INSERT INTO evaluasi_triwulan (id,jenis,opd_id,tahun,triwulan,judul,catatan,file_path,nama_file_asli,mime,ukuran,versi,aktif,diunggah_oleh,diunggah_pada) VALUES (${randomUUID()},${jenis},${opdId},${tahun},${triwulan},${`Contoh evaluasi ${jenis} TW ${triwulan}`},'Berkas data contoh untuk pengujian alur.',${filePath},${`contoh-evaluasi-${jenis}-tw${triwulan}.${ext}`},${mime},${bytes.length},1,true,${uploader},NOW(3))`;console.log(`Contoh ${jenis} ${opdId||'Bapperida'} TW${triwulan} ditambahkan.`);}
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
