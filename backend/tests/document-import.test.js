import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from 'docx';
import { importDocxSections, restoreSourceTableWidths } from '../document-import.js';
import { renderDocument } from '../document-render.js';

async function writeDocx(children) {
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'sipanda-import-'));
 const filePath=path.join(directory,'renja.docx');
 const buffer=await Packer.toBuffer(new Document({sections:[{children}]}));
 await fs.writeFile(filePath,buffer);
 return {filePath,directory};
}

test('DOCX import extracts BAB I through BAB Penutup and preserves content and wide tables',async()=>{
 const table=new Table({
  width:{size:100,type:WidthType.PERCENTAGE},
  rows:[new TableRow({children:Array.from({length:8},(_,index)=>new TableCell({children:[new Paragraph(`Kolom ${index+1}`)]}))})]
 });
 const fixture=await writeDocx([
  new Paragraph('KATA PENGANTAR'),
  new Paragraph('BAB I PENDAHULUAN'),
  new Paragraph('1.1. LATAR BELAKANG'),
  new Paragraph('Isi latar belakang.'),
  table,
  new Paragraph('BAB II HASIL EVALUASI'),
  new Paragraph('2.1 HASIL EVALUASI'),
  new Paragraph('Isi evaluasi.'),
  new Paragraph('BAB III PENUTUP'),
  new Paragraph('3.1 RENCANA TINDAK LANJUT'),
  new Paragraph('Isi penutup.')
 ]);
 try {
  const sections=await importDocxSections(fixture.filePath);
  assert.deepEqual(sections.map(section=>section.title),['BAB I PENDAHULUAN','BAB II HASIL EVALUASI','BAB III PENUTUP']);
  assert.equal(sections[0].subsections[0].code,'1.1');
  assert.equal(sections[0].subsections[0].title,'LATAR BELAKANG');
  assert.match(sections[0].subsections[0].content,/Isi latar belakang/);
  assert.match(sections[0].subsections[0].content,/<table>/);
  assert.match(sections[0].subsections[0].content,/<colgroup>/);
  assert.equal((sections[0].subsections[0].content.match(/<col style="width:/g)||[]).length,8);
  const legacySections=structuredClone(sections);
  legacySections[0].subsections[0].content=legacySections[0].subsections[0].content.replace(/<colgroup>[\s\S]*?<\/colgroup>/,'');
  const restored=await restoreSourceTableWidths(fixture.filePath,legacySections);
  assert.match(restored[0].subsections[0].content,/<colgroup>/);
  assert.match(sections[2].subsections[0].content,/Isi penutup/);
  const html=renderDocument({
   jenis:'Lampiran Perbup Renja',tahun:'2027',judul:'Lampiran hasil DOCX',
   opdName:'Kecamatan Depok',isLampiranOtomatis:true,sections
  },{opdRecord:{nama:'Kecamatan Depok',nomorLampiran:'XXXVIII'},opd:{},global:{bupati:'IMRON'}});
  assert.match(html,/class="doc-section-break" data-orientation="landscape"/);
  assert.match(html,/table-layout:fixed/);
  assert.match(html,/Isi penutup/);
 } finally {
  await fs.rm(fixture.directory,{recursive:true,force:true});
 }
});

test('DOCX import rejects files without BAB I or BAB Penutup',async()=>{
 const fixture=await writeDocx([new Paragraph('BAB I PENDAHULUAN'),new Paragraph('Isi Renja.')]);
 try {
  await assert.rejects(importDocxSections(fixture.filePath),/BAB Penutup tidak ditemukan/);
 } finally {
  await fs.rm(fixture.directory,{recursive:true,force:true});
 }
});

test('DOCX import treats repeated chapter headings as body text instead of new sections',async()=>{
 const fixture=await writeDocx([
  new Paragraph('BAB I PENDAHULUAN'),
  new Paragraph('Isi pendahuluan.'),
  new Paragraph('BAB II EVALUASI'),
  new Paragraph('Isi evaluasi.'),
  new Paragraph('BAB II EVALUASI LANJUTAN'),
  new Paragraph('Isi lanjutan.'),
  new Paragraph('BAB III PENUTUP'),
  new Paragraph('Isi penutup.')
 ]);
 try {
  const sections=await importDocxSections(fixture.filePath);
  assert.equal(new Set(sections.map(section=>section.id)).size,sections.length);
  assert.deepEqual(sections.map(section=>section.id),['import-bab-1-i','import-bab-2-ii','import-bab-3-iii']);
  assert.match(sections[1].subsections.map(subsection=>subsection.content).join(''),/BAB II EVALUASI LANJUTAN/);
 } finally {
  await fs.rm(fixture.directory,{recursive:true,force:true});
 }
});

test('DOCX import skips chapter references in Sistematika Penulisan and uses the actual BAB I',async()=>{
 const fixture=await writeDocx([
  new Paragraph('BAB I PENDAHULUAN'),
  new Paragraph('1.3 SISTEMATIKA PENULISAN'),
  new Paragraph('1. BAB I PENDAHULUAN'),
  new Paragraph('2. BAB II HASIL EVALUASI'),
  new Paragraph('Isi sistematika.'),
  new Paragraph('BAB I'),
  new Paragraph('PENDAHULUAN'),
  new Paragraph('Isi BAB I yang sebenarnya.'),
  new Paragraph('BAB I PENDAHULUAN'),
  new Paragraph('Rujukan BAB I ini merupakan teks, bukan bab baru.'),
  new Paragraph('BAB II HASIL EVALUASI'),
  new Paragraph('Isi BAB II.'),
  new Paragraph('BAB III PENUTUP'),
  new Paragraph('Isi penutup.')
 ]);
 try {
  const sections=await importDocxSections(fixture.filePath);
  assert.deepEqual(sections.map(section=>section.title),[
   'BAB I PENDAHULUAN','BAB II HASIL EVALUASI','BAB III PENUTUP'
  ]);
  assert.match(sections[0].subsections.map(subsection=>subsection.content).join(''),/Rujukan BAB I ini merupakan teks/);
  assert.match(sections[0].subsections.map(subsection=>subsection.content).join(''),/Isi BAB I yang sebenarnya/);
 } finally {
  await fs.rm(fixture.directory,{recursive:true,force:true});
 }
});

test('DOCX import prefers styled BAB headings over the table of contents and preserves chapter bodies',async()=>{
 const fixture=await writeDocx([
  new Paragraph({text:'Sistematika Penulisan',heading:HeadingLevel.HEADING_2}),
  new Paragraph('Bab I Pendahuluan'),
  new Paragraph('Bab II Hasil Evaluasi'),
  new Paragraph({text:'BAB I',heading:HeadingLevel.HEADING_1}),
  new Paragraph({text:'PENDAHULUAN',heading:HeadingLevel.HEADING_1}),
  new Paragraph({text:'Latar Belakang',heading:HeadingLevel.HEADING_2}),
  new Paragraph('Narasi latar belakang yang harus tetap masuk ke hasil impor.'),
  new Paragraph({text:'Sistematika Penulisan',heading:HeadingLevel.HEADING_2}),
  new Paragraph('1. BAB I Pendahuluan'),
  new Paragraph('2. BAB II Hasil Evaluasi'),
  new Paragraph({text:'BAB II',heading:HeadingLevel.HEADING_1}),
  new Paragraph({text:'HASIL EVALUASI',heading:HeadingLevel.HEADING_1}),
  new Paragraph({text:'Hasil Evaluasi Program',heading:HeadingLevel.HEADING_2}),
  new Paragraph('Narasi evaluasi yang harus tetap masuk ke hasil impor.'),
  new Paragraph({text:'BAB III',heading:HeadingLevel.HEADING_1}),
  new Paragraph({text:'PENUTUP',heading:HeadingLevel.HEADING_1}),
  new Paragraph({text:'Rencana Tindak Lanjut',heading:HeadingLevel.HEADING_2}),
  new Paragraph('Narasi penutup yang harus tetap masuk ke hasil impor.')
 ]);
 try {
  const sections=await importDocxSections(fixture.filePath);
  assert.deepEqual(sections.map(section=>section.title),[
   'BAB I PENDAHULUAN','BAB II HASIL EVALUASI','BAB III PENUTUP'
  ]);
  assert.equal(sections[0].subsections.length,2);
  assert.match(sections[0].subsections.map(subsection=>subsection.content).join(''),/Narasi latar belakang yang harus tetap masuk/);
  assert.match(sections[0].subsections.map(subsection=>subsection.content).join(''),/BAB II Hasil Evaluasi/);
  assert.match(sections[1].subsections.map(subsection=>subsection.content).join(''),/Narasi evaluasi yang harus tetap masuk/);
  assert.match(sections[2].subsections.map(subsection=>subsection.content).join(''),/Narasi penutup yang harus tetap masuk/);
 } finally {
  await fs.rm(fixture.directory,{recursive:true,force:true});
 }
});

test('DOCX import accepts styled chapter headings, split chapter titles, and headings inside tables',async()=>{
 const headingTable=new Table({
  width:{size:100,type:WidthType.PERCENTAGE},
  rows:[new TableRow({children:[new TableCell({children:[new Paragraph('BAB I')]}),new TableCell({children:[new Paragraph('Tabel pembuka')]} )]})]
 });
 const fixture=await writeDocx([
  headingTable,
  new Paragraph({text:'PENDAHULUAN',heading:HeadingLevel.HEADING_1}),
  new Paragraph('1.1 Latar Belakang'),
  new Paragraph('Isi bab pertama.'),
  new Paragraph({text:'BAB II: EVALUASI RENJA',heading:HeadingLevel.HEADING_1}),
  new Paragraph('Isi evaluasi.'),
  new Paragraph({text:'BAB III PENUTUP',heading:HeadingLevel.HEADING_1}),
  new Paragraph('Isi penutup.')
 ]);
 try {
  const sections=await importDocxSections(fixture.filePath);
  assert.deepEqual(sections.map(section=>section.title),['BAB I PENDAHULUAN','BAB II EVALUASI RENJA','BAB III PENUTUP']);
  assert.match(sections[0].subsections.map(subsection=>subsection.content).join(''),/BAB I/);
  assert.match(sections[0].subsections.map(subsection=>subsection.content).join(''),/Isi bab pertama/);
 } finally {
  await fs.rm(fixture.directory,{recursive:true,force:true});
 }
});
