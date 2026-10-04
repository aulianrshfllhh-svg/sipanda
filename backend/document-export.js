import puppeteer from 'puppeteer-core';
import { editableDocx } from './document-word.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {Document,Packer,Paragraph,ImageRun,PageOrientation} from 'docx';
import {renderDocument} from './document-render.js';
import {documentSettings} from './document-settings.js';
import {restoreSourceTableWidths} from './document-import.js';
import {sourcePdf,sourceDocx,wordToPdf,pdfPreview} from './annex-source.js';
const pagination=fs.readFileSync(new URL('../shared/paginate.js',import.meta.url),'utf8');
const executable=()=>[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium','/usr/bin/google-chrome'].find(p=>p&&fs.existsSync(p));
export async function openRenderedDocument(html){
 const path=executable();if(!path)throw new Error('Chrome/Edge belum tersedia. Atur CHROME_PATH pada backend.');
 const browser=await puppeteer.launch({executablePath:path,headless:true});
 try{
  const page=await browser.newPage();await page.setViewport({width:1280,height:1200,deviceScaleFactor:1.5});
  await page.setRequestInterception(true);page.on('request',req=>{if(req.url().startsWith('data:')||req.url()==='about:blank')req.continue();else req.abort();});
  await page.setContent(html.replace(/<script[\s\S]*?<\/script>/g,''),{waitUntil:'load'});
  await page.addScriptTag({type:'module',content:pagination});
  await page.waitForFunction(()=>window.documentReady||window.documentError,{timeout:60000});
  const error=await page.evaluate(()=>window.documentError);if(error)throw new Error(error);
  return {browser,page};
 }catch(e){await browser.close();throw e;}
}
export function registerExportRoutes(app,prisma,auth,permissions){
 async function load(req,res){
  let doc=await prisma.document.findUnique({where:{id:req.params.id},include:{sections:{orderBy:{babOrder:'asc'}}}});
  if(!doc){res.status(404).json({error:'Dokumen tidak ditemukan'});return;}
  if(!(await permissions(req.currentUser,doc)).canView){res.status(403).json({error:'Dokumen tidak termasuk penugasan Anda'});return;}
  let sourceFile=doc.filePath;
  if(doc.cara==='upload'&&!doc.isLampiranOtomatis&&!sourceFile?.startsWith('/uploads/'))throw new Error('Berkas unggahan belum tersedia. Lengkapi berkas sumber untuk ditelaah; tampilan template tidak digunakan sebagai pengganti.');
  if(!sourceFile&&doc.isLampiranOtomatis&&doc.parentId){
   const parent=await prisma.document.findUnique({where:{id:doc.parentId},select:{filePath:true,cara:true}});
   sourceFile=parent?.filePath||null;
   if(parent?.cara==='upload'&&!sourceFile)throw new Error('Berkas Renja induk belum tersedia. Unggah dokumen asli terlebih dahulu.');
  }
  const settings=await documentSettings(prisma,doc.opdId);
  if(sourceFile?.startsWith('/uploads/')){
   const absolutePath=path.join(fileURLToPath(new URL('./uploads/',import.meta.url)),path.basename(sourceFile));
   const extension=path.extname(absolutePath).toLowerCase();
   if(doc.cara==='upload'&&!doc.isLampiranOtomatis){
    const sourceFormat=extension==='.pdf'?'pdf':extension==='.doc'?'doc':extension==='.docx'?'docx':null;
    if(!sourceFormat)throw new Error('Format berkas sumber tidak didukung untuk pratinjau.');
    return {doc,settings,source:{bytes:await fs.promises.readFile(absolutePath),fileName:doc.fileName},sourceFormat};
   }
   if(doc.isLampiranOtomatis){
    const bytes=await fs.promises.readFile(absolutePath);
    if(extension==='.pdf'){
     const source=await sourcePdf(bytes,doc,settings);
     return {doc,settings,source,sourceFormat:'pdf'};
    }
    if(extension==='.docx'){
     const source=await sourceDocx(bytes,doc,settings);
     return {doc,settings,source,sourceFormat:'docx'};
    }
    throw new Error('Simpan dokumen Word lama (.doc) sebagai DOCX atau PDF, lalu unggah ulang agar isi asli dapat dipertahankan.');
   }
   if(path.extname(absolutePath).toLowerCase()==='.docx'&&fs.existsSync(absolutePath)){
    doc={...doc,sections:await restoreSourceTableWidths(absolutePath,doc.sections)};
   }
  }
  return {doc,settings,html:renderDocument(doc,settings)};
 }
 app.get('/api/documents/:id/source',auth,async(req,res)=>{
  try{
   const doc=await prisma.document.findUnique({where:{id:req.params.id}});
   if(!doc){return res.status(404).json({error:'Dokumen tidak ditemukan'});}
   if(!(await permissions(req.currentUser,doc)).canView){return res.status(403).json({error:'Dokumen tidak termasuk penugasan Anda'});}
   if(doc.cara!=='upload'||!doc.filePath?.startsWith('/uploads/')){return res.status(404).json({error:'Berkas sumber asli tidak tersedia'});}
   const absolutePath=path.join(fileURLToPath(new URL('./uploads/',import.meta.url)),path.basename(doc.filePath));
   const extension=path.extname(absolutePath).toLowerCase();
   const contentTypes={
    '.pdf':'application/pdf',
    '.doc':'application/msword',
    '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
   };
   const contentType=contentTypes[extension];
   if(!contentType){return res.status(415).json({error:'Format berkas sumber tidak didukung'});}
   const bytes=await fs.promises.readFile(absolutePath);
   const fileName=doc.fileName||`dokumen${extension}`;
   const encodedFileName=encodeURIComponent(fileName).replace(/[!'()*]/g,character=>`%${character.charCodeAt(0).toString(16).toUpperCase()}`);
   res.set({
    'Content-Type':contentType,
    'Content-Disposition':`attachment; filename*=UTF-8''${encodedFileName}`,
    'Cache-Control':'private, no-store',
    'X-Content-Type-Options':'nosniff'
   }).send(bytes);
  }catch(error){
   if(error.code==='ENOENT')return res.status(404).json({error:'File sumber asli tidak ditemukan di penyimpanan'});
   console.error('Failed to serve original uploaded document:',error);
   res.status(500).json({error:'Gagal mengambil file sumber asli'});
  }
 });
 // Review the complete original, never reconstructed chapters or annex formatting.
 app.get('/api/documents/:id/source-preview',auth,async(req,res)=>{
  try{
   const doc=await prisma.document.findUnique({where:{id:req.params.id}});
   if(!doc)return res.status(404).json({error:'Dokumen tidak ditemukan'});
   if(!(await permissions(req.currentUser,doc)).canView)return res.status(403).json({error:'Dokumen tidak termasuk penugasan Anda'});
   if(doc.cara!=='upload'||doc.isLampiranOtomatis||!doc.filePath?.startsWith('/uploads/'))return res.status(404).json({error:'Berkas unggahan belum tersedia untuk ditelaah. Lengkapi berkas sumber terlebih dahulu.'});
   const extension=path.extname(doc.filePath).toLowerCase();
   if(!['.pdf','.doc','.docx'].includes(extension))return res.status(415).json({error:'Format sumber harus PDF, DOC, atau DOCX.'});
   const bytes=await fs.promises.readFile(path.join(fileURLToPath(new URL('./uploads/',import.meta.url)),path.basename(doc.filePath)));
   const pdf=extension==='.pdf'?bytes:await wordToPdf(bytes,`source${extension}`);
   res.set({'Content-Type':'application/pdf','Content-Disposition':'inline; filename="telaah-dokumen-asli.pdf"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).send(pdf);
  }catch(error){
   console.error('Failed to preview original document:',error);
   res.status(error.code==='ENOENT'?404:422).json({error:error.code==='ENOENT'?'File sumber tidak ditemukan di penyimpanan.':`Gagal menampilkan berkas asli: ${error.message}`});
  }
 });
 app.get('/api/documents/:id/preview',auth,async(req,res)=>{
  try{const item=await load(req,res);if(item)res.type('html').send(item.source?pdfPreview(item.sourceFormat==='pdf'?item.source.bytes:await wordToPdf(item.source.bytes,item.source.fileName)):item.html);}catch(e){console.error(e);res.status(422).json({error:`Gagal menyiapkan pratinjau: ${e.message}`});}
 });
 app.get('/api/annexes/:id/validation',auth,async(req,res)=>{
  let browser;
  try{
   const item=await load(req,res);if(!item)return;
   if(!item.doc.isLampiranOtomatis){return res.status(400).json({error:'Pemeriksaan format hanya tersedia untuk lampiran otomatis'});}
   if(item.source){
    const checks=[
     {label:'Sumber dokumen asli',ok:true,detail:'Isi, tabel, gambar, urutan BAB, dan penutup berasal dari berkas unggahan; teks bold dinormalisasi.'},
     {label:'Teks tanpa bold',ok:true,detail:item.sourceFormat==='pdf'?`${item.source.normalizedBoldSpans || 0} bagian teks bold diubah menjadi normal. Teks yang menyatu dalam gambar perlu diperiksa manual.`:'Bold langsung, gaya BAB, gaya tabel, dan huruf kompleks dinonaktifkan.'},
     {label:'Dimulai dari BAB I',ok:true,detail:item.sourceFormat==='pdf'?`BAB I ditemukan pada halaman ${item.source.startPage} sumber. Tata letak halaman berikutnya dipertahankan; bold dihapus.`:'Bagian sebelum BAB I dihapus; format isi dipertahankan selain bold.'},
     {label:'Nomor lampiran OPD',ok:true,detail:`LAMPIRAN ${item.settings.opdRecord.nomorLampiran}`}
    ];
    if(item.source.scale<1)checks.push({label:'Penyesuaian halaman pembuka',ok:true,detail:`Isi halaman BAB I diperkecil menjadi ${(item.source.scale*100).toFixed(1)}% agar blok peraturan muat tanpa memotong isi. Halaman berikutnya tetap seperti sumber.`});
    return res.json({checks,warnings:[],formats:item.sourceFormat==='pdf'?['pdf']:['pdf','docx'],sourcePreserved:true});
   }
   const rendered=await openRenderedDocument(item.html);browser=rendered.browser;
   const report=await rendered.page.evaluate(()=>{
    const pages=[...document.querySelectorAll('.paper')],annex=pages.length>0&&pages.every(page=>{
     const rect=page.getBoundingClientRect(),width=rect.width*25.4/96,height=rect.height*25.4/96;
     return page.classList.contains('f4')&&page.classList.contains('annex')&&(page.classList.contains('landscape')?Math.abs(width-330)<1&&Math.abs(height-215)<1:Math.abs(width-215)<1&&Math.abs(height-330)<1);
    });
    const bold=[...document.querySelectorAll('.paper *')].filter(element=>Number.parseInt(getComputedStyle(element).fontWeight,10)>=600);
    const forbidden=!!document.querySelector('.cover,[data-part="front"],header');
    const fontLoaded=document.fonts.check('12pt "Bookman Old Style"');
    const closing=document.querySelector('.closing-block');
    const closingTogether=!!closing&&!!closing.parentElement?.classList.contains('page-body')&&!!closing.previousElementSibling&&closing.closest('.paper')===closing.previousElementSibling.closest('.paper');
    const margins=pages.every(page=>['paddingTop','paddingRight','paddingBottom','paddingLeft'].every(property=>Math.abs(Number.parseFloat(getComputedStyle(page)[property])-75.5906)<1));
    return [
     {label:'Kertas F4 215 × 330 mm',ok:annex,detail:`${pages.length} halaman lampiran`},
     {label:'Margin 2 cm di semua sisi',ok:margins,detail:margins?'Sesuai':'Margin halaman tidak sesuai'},
     {label:'Font Bookman Old Style tertanam dan tersedia',ok:fontLoaded,detail:fontLoaded?'Font Bookman berhasil dimuat':'Font Bookman tidak berhasil dimuat'},
     {label:'Tidak ada teks tebal',ok:bold.length===0,detail:bold.length?`${bold.length} elemen tampil tebal`:'Seluruh teks normal'},
     {label:'Tanpa cover, daftar, header, dan footer',ok:!forbidden&&pages.every(page=>getComputedStyle(page.querySelector('footer')).display==='none'),detail:forbidden?'Elemen halaman depan ditemukan':'Elemen depan dan footer tidak ditampilkan'},
     {label:'Blok penutup utuh bersama paragraf sebelumnya',ok:closingTogether,detail:closingTogether?'Blok penutup tidak terpisah':'Blok penutup tidak ditemukan atau tidak bersama paragraf sebelumnya'}
    ];
   });
   res.json({checks:report,warnings:report.filter(check=>!check.ok)});
  }catch(e){console.error(e);res.status(500).json({error:`Gagal memeriksa format lampiran: ${e.message}`});}
  finally{if(browser)await browser.close();}
 });
 app.get('/api/export/:format/:id',auth,async(req,res)=>{
  if(!['docx','docx-editable','pdf'].includes(req.params.format))return res.status(400).json({error:'Format ekspor tidak valid'});
  let browser;
  try{
   const item=await load(req,res);if(!item)return;
   let data;
   if(item.source){
    if(req.params.format!=='pdf'&&item.sourceFormat!=='docx')return res.status(422).json({error:`Sumber berupa ${item.sourceFormat.toUpperCase()}. Unduh PDF untuk mempertahankan tata letak asli, atau unggah DOCX jika membutuhkan keluaran Word.`});
    data=req.params.format==='pdf'&&item.sourceFormat!=='pdf'?await wordToPdf(item.source.bytes,item.source.fileName):item.source.bytes;
    res.type(req.params.format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
   }else{
   const result=await openRenderedDocument(item.html);browser=result.browser;const page=result.page;
   if(req.params.format==='pdf'){
    data=await page.pdf({printBackground:true,preferCSSPageSize:true});
    res.type('application/pdf');
   }else if(req.params.format==='docx-editable'||item.doc.isLampiranOtomatis){
    data=await editableDocx(page,item.doc.judul,{annex:item.doc.isLampiranOtomatis===true});
    res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
   }else{
    // Fixed-layout Word export: use the exact rendered pages, including fonts and pagination.
    const pages=await page.$$('.paper'),sections=[];
    for(const paper of pages){
     const {landscape,f4}=await paper.evaluate(el=>({landscape:el.classList.contains('landscape'),f4:el.classList.contains('f4')}));
     const width=f4?(landscape?1247.24:812.6):(landscape?1122.52:793.7),height=f4?(landscape?812.6:1247.24):(landscape?793.7:1122.52);
     const png=Buffer.from(await paper.screenshot({type:'png'}));
     const size=f4?{width:12189,height:18709}:{width:11906,height:16838};
     sections.push({properties:{page:{size:{...size,orientation:landscape?PageOrientation.LANDSCAPE:PageOrientation.PORTRAIT},margin:{top:0,bottom:0,left:0,right:0,header:0,footer:0}}},children:[new Paragraph({spacing:{before:0,after:0,line:1},children:[new ImageRun({type:'png',data:png,transformation:{width,height},floating:{horizontalPosition:{relative:'page',offset:0},verticalPosition:{relative:'page',offset:0},allowOverlap:true,behindDocument:false}})]})]});
    }
    data=await Packer.toBuffer(new Document({creator:'SIPANDA',title:item.doc.judul,description:'Ekspor dengan tata letak tetap. Edit isi melalui SIPANDA.',styles:{default:{document:{run:{font:item.doc.isLampiranOtomatis?'Bookman Old Style':'Times New Roman',size:24}}}},sections}));
    res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
   }
   }
   const annexPeriod=item.doc.regulation?.periodeMulai&&item.doc.regulation?.periodeAkhir&&item.doc.regulation.periodeMulai!==item.doc.regulation.periodeAkhir?`${item.doc.regulation.periodeMulai}-${item.doc.regulation.periodeAkhir}`:item.doc.tahun;
   const fileBase=item.doc.isLampiranOtomatis
    ? `Lampiran ${item.settings.opdRecord.nomorLampiran} ${item.doc.jenis.replace(/^Lampiran\s+/,'')} ${item.settings.opdRecord.nama} ${item.doc.jenis==='Lampiran Perbup Renstra'?annexPeriod:item.doc.tahun}`
    : item.doc.kodeDoc;
   res.setHeader('Content-Disposition',`attachment; filename="${fileBase.replace(/[^a-zA-Z0-9 _-]/g,'_')}.${req.params.format==='pdf'?'pdf':'docx'}"`);
   res.send(Buffer.from(data));
  }catch(e){console.error(e);res.status(500).json({error:`Gagal mengekspor dokumen: ${e.message}`});}
  finally{if(browser)await browser.close();}
 });
}
