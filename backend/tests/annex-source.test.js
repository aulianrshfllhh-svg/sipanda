import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {Document,Packer,Paragraph,Table,TableRow,TableCell} from 'docx';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {findBodyStart,sourceDocx,sourcePdf,pdfBodyStart} from '../annex-source.js';
const doc={jenis:'Lampiran Perbup Renja',tahun:'2027'};
const settings={opdRecord:{nomorLampiran:'XXXVIII',nama:'Kecamatan Depok'}};
const prose='Narasi asli rencana kerja harus dipertahankan bersama tabel dan gambar. '.repeat(6);
const withoutWeight = xml => xml.replace(/<w:b(?:Cs)?\b[^>]*\/>/g,'').replace(/<w:rPr\/>|<w:rPr><\/w:rPr>/g,'');

test('detect actual BAB I before Sistematika, skip table of contents and outline',()=>{
 const blocks=['DAFTAR ISI','BAB I PENDAHULUAN','1.1 Latar Belakang .... 1','BAB II EVALUASI','BAB I','PENDAHULUAN','1.1 Latar Belakang',prose,'1.4 Sistematika Penulisan','BAB I PENDAHULUAN','BAB II EVALUASI'];
 assert.equal(findBodyStart(blocks),4);
 assert.throws(()=>findBodyStart(['DAFTAR ISI','BAB I PENDAHULUAN','BAB II EVALUASI']),/BAB I/);
});

test('native DOCX keeps all body XML, tables and ancillary ZIP parts',async()=>{
 const bytes=await Packer.toBuffer(new Document({sections:[{children:[
  new Paragraph('COVER DOKUMEN MURNI'),new Paragraph('DAFTAR ISI'),
  new Paragraph('BAB I PENDAHULUAN'),new Paragraph('BAB II EVALUASI'),
  new Paragraph('BAB I'),new Paragraph('PENDAHULUAN'),new Paragraph('1.1 Latar Belakang'),new Paragraph(prose),
  new Table({rows:[new TableRow({children:[new TableCell({children:[new Paragraph('ANGKA ASLI 123.456')]})]})]}),
  new Paragraph('1.4 Sistematika Penulisan'),new Paragraph('BAB I PENDAHULUAN'),new Paragraph('BAB II EVALUASI'),
  new Paragraph('BAB II EVALUASI'),new Paragraph('BAB VI PENUTUP'),new Paragraph('BUPATI CIREBON,')
 ]}]}));
 const before=await JSZip.loadAsync(bytes);
 const result=await sourceDocx(bytes,doc,settings);
 const after=await JSZip.loadAsync(result.bytes);
 const xml=await after.file('word/document.xml').async('string');
 assert.ok(!xml.includes('COVER DOKUMEN MURNI'));
 assert.ok(!xml.includes('DAFTAR ISI'));
 assert.equal((xml.match(/LAMPIRAN XXXVIII/g)||[]).length,1);
 const old=await before.file('word/document.xml').async('string');
 const bodyStart=old.indexOf('<w:t xml:space="preserve">BAB I</w:t>');
 const oldBody=old.slice(old.lastIndexOf('<w:p>',bodyStart));
 // All original body nodes including closing remain byte-equivalent after serialization.
 assert.ok(withoutWeight(xml).endsWith(withoutWeight(oldBody)));
 for(const [name,entry] of Object.entries(before.files)){
  if(entry.dir||name==='word/document.xml')continue;
  if(name.startsWith('word/')&&name.endsWith('.xml'))assert.equal(withoutWeight(await after.file(name).async('string')),withoutWeight(await entry.async('string')),name);
  else assert.deepEqual(await after.file(name).async('nodebuffer'),await entry.async('nodebuffer'),name);
 }
});

test('PDF strips front matter, preserves following page content and orientation',async()=>{
 const input=await PDFDocument.create();const font=await input.embedFont(StandardFonts.Helvetica);
 let page=input.addPage([610,936]);
 page.drawText('DAFTAR ISI\nBAB I PENDAHULUAN\n1.1 Latar Belakang .... 1\nBAB II EVALUASI',{x:57,y:850,font,size:12,lineHeight:20});
 page=input.addPage([610,936]);
 page.drawText('BAB I\nPENDAHULUAN\n1.1 Latar Belakang',{x:57,y:865,font,size:12,lineHeight:20});
 for(let i=0;i<8;i++)page.drawText('Narasi asli rencana kerja untuk perangkat daerah yang tetap utuh.',{x:57,y:780-i*20,font,size:12});
 page=input.addPage([936,610]);page.drawText('TABEL ASLI 123.456',{x:57,y:550,font,size:12});
 const bytes=await input.save();const result=await sourcePdf(bytes,doc,settings);
 assert.equal(result.startPage,2);assert.equal(result.pages,2);assert.ok(result.scale<1);
 const out=await PDFDocument.load(result.bytes);
 assert.deepEqual(out.getPage(1).getSize(),{width:936,height:610});
 const a=input.getPage(2).node.Contents(),b=out.getPage(1).node.Contents();
 assert.deepEqual(Buffer.from(input.context.lookup(a.get(0)).getContents()),Buffer.from(out.context.lookup(b.get(0)).getContents()));
 assert.equal((await pdfBodyStart(result.bytes)).pageIndex,0);
});

test('PDF without readable BAB I fails instead of exporting a blank template',async()=>{
 const input=await PDFDocument.create();input.addPage();
 await assert.rejects(sourcePdf(await input.save(),doc,settings),/BAB I/);
});
