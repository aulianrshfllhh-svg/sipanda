import 'dotenv/config';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {PrismaClient} from '@prisma/client';
import {Document,Packer,Paragraph} from 'docx';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import puppeteer from 'puppeteer-core';
const prisma=new PrismaClient(),base='http://localhost:3001/api',parents=[],files=[];
let browser;
async function login(username,password){const response=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});assert.equal(response.status,200);return (await response.json()).token;}
const token=await login('admin','admin123');
const auth={Authorization:`Bearer ${token}`};
try{
 const text='Narasi asli untuk rencana kerja perangkat daerah harus dipertahankan. '.repeat(5);
 const word=await Packer.toBuffer(new Document({sections:[{children:['COVER','DAFTAR ISI','BAB I PENDAHULUAN','BAB II EVALUASI','BAB I','PENDAHULUAN','1.1 Latar Belakang',text,'BAB VI PENUTUP'].map(t=>new Paragraph(t))}]}));
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 pdf.addPage([610,936]).drawText('COVER',{x:57,y:850,font,size:12});
 const page=pdf.addPage([610,936]);page.drawText('BAB I\nPENDAHULUAN\n1.1 Latar Belakang',{x:57,y:850,font,size:12,lineHeight:20});
 for(let i=0;i<7;i++)page.drawText('Narasi asli rencana kerja perangkat daerah harus dipertahankan.',{x:57,y:770-i*20,font,size:12});
 pdf.addPage([936,610]).drawText('TABEL ASLI HALAMAN TERAKHIR',{x:57,y:550,font,size:12});
 browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const [extension,bytes] of [['pdf',await pdf.save()],['docx',word]]){
  const form=new FormData();for(const [key,value] of Object.entries({cara:'upload',jenis:'Renja Murni',tahun:'2027',opdId:'kec-depok',judul:'TEST SOURCE ANNEX - temporary'}))form.append(key,value);
  form.append('file',new Blob([bytes]),`test-source.${extension}`);
  let response=await fetch(base+'/documents',{method:'POST',headers:auth,body:form});
  const created=await response.json();assert.equal(response.status,201,JSON.stringify(created));parents.push(created.id);files.push(created.filePath);
  const annex=await prisma.document.findFirst({where:{parentId:created.id}});assert.ok(annex);
  response=await fetch(base+'/annexes',{headers:auth});const list=await response.json();assert.equal(list.find(d=>d.id===annex.id).parent.sourceReady,true);
  response=await fetch(`${base}/annexes/${annex.id}/validation`,{headers:auth});const report=await response.json();assert.equal(response.status,200,JSON.stringify(report));assert.equal(report.sourcePreserved,true);
  response=await fetch(`${base}/documents/${annex.id}/preview`,{headers:auth});assert.equal(response.status,200,await response.clone().text());
  const html=await response.text(),view=await browser.newPage();
  await view.setContent(`<iframe id="preview"></iframe>`);
  await view.$eval('#preview',(el,html)=>el.srcdoc=html,html);
  await view.waitForFunction(()=>document.querySelector('#preview').contentDocument?.querySelector('iframe')?.src.startsWith('blob:'),{timeout:15000});
  await view.close();
  response=await fetch(`${base}/export/pdf/${annex.id}`,{headers:auth});assert.equal(response.status,200,await response.clone().text());
  const output=await PDFDocument.load(await response.arrayBuffer());assert.ok(output.getPageCount()>0);
  if(extension==='pdf'){assert.equal(output.getPageCount(),2);assert.equal(output.getPage(1).getWidth(),936);}
  response=await fetch(`${base}/export/docx/${annex.id}`,{headers:auth});assert.equal(response.status,extension==='pdf'?422:200);
  const other=await login('opd.dinkes','opd123');response=await fetch(`${base}/export/pdf/${annex.id}`,{headers:{Authorization:`Bearer ${other}`}});assert.equal(response.status,403);
 }
 console.log('PASS: PDF/DOCX upload -> automatic annex -> readiness -> validation -> browser preview -> PDF/Word export; other OPD access denied');
}finally{
 if(browser)await browser.close();
 for(const id of parents){await prisma.activityLog.deleteMany({where:{documentId:id}});await prisma.document.deleteMany({where:{parentId:id}});await prisma.document.delete({where:{id}});}
 for(const file of files)await fs.unlink(path.join('uploads',path.basename(file))).catch(()=>{});
 await prisma.$disconnect();
}
