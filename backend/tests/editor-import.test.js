import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell} from 'docx';
import {convertEditorFile} from '../editor-import.js';
test('Word chapter conversion retains lists, italics, merged tables and superscript while removing source styles',async()=>{
 const doc=new Document({sections:[{children:[new Paragraph({heading:'Heading1',text:'BAB I PENDAHULUAN'}),new Paragraph({children:[new TextRun({text:'Uraian asli',italics:true,color:'FF0000',font:'Arial'}),new TextRun({text:'2',superScript:true})]}),new Paragraph({bullet:{level:0},text:'Dasar hukum'}),new Table({rows:[new TableRow({children:[new TableCell({columnSpan:2,children:[new Paragraph('Sel gabungan') ]})]})]})]}]});
 const result=await convertEditorFile(await Packer.toBuffer(doc),'bab.docx');assert.match(result.html,/<em>Uraian asli/);assert.match(result.html,/<sup>2/);assert.match(result.html,/<ul>/);assert.match(result.html,/colspan="2"/);assert.doesNotMatch(result.html,/Arial|FF0000/);
});
test('Excel preserves merged geometry and Indonesian numeric text, reports unsupported formulas and multiple sheets',async()=>{
 const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('SIPD');sheet.addRow(['Kode','Pagu','Catatan']);sheet.addRow(['001','2.579.714.380','Gabungan']);sheet.mergeCells('C2:C3');sheet.addRow(['002',1250.5]);sheet.getCell('B4').numFmt='#,##0.00';sheet.addRow(['003',{formula:'SUM(B2:B3)'}]);book.addWorksheet('Lain');
 const result=await convertEditorFile(Buffer.from(await book.xlsx.writeBuffer()),'sipd.xlsx');assert.match(result.html,/rowspan="2"/);assert.match(result.html,/2\.579\.714\.380/);assert.match(result.html,/1\.250,5/);assert.equal(result.rows[1][0],'001');assert.ok(result.warnings.some(w=>/rumus/.test(w)));assert.equal(result.sheets.length,2);
});
test('CSV keeps quoted delimiters, leading zero codes and numbers as text',async()=>{
 const result=await convertEditorFile(Buffer.from('Kode;Uraian;Dana\n001;"Pelayanan; masyarakat";2.579.714.380'),'sipd.csv');assert.deepEqual(result.rows[1],['001','Pelayanan; masyarakat','2.579.714.380']);
});

test('Word import preserves source column proportions and repeating header flags',async()=>{
 const doc=new Document({sections:[{children:[new Table({columnWidths:[2000,6000],rows:[new TableRow({tableHeader:true,children:[new TableCell({children:[new Paragraph('Kode')]}),new TableCell({children:[new Paragraph('Uraian')]})]}),new TableRow({children:[new TableCell({children:[new Paragraph('001')]}),new TableCell({children:[new Paragraph('Pelayanan masyarakat')]})]})]})]}]});
 const result=await convertEditorFile(await Packer.toBuffer(doc),'bab.docx');assert.match(result.html,/<thead>/);assert.match(result.html,/width:25\.000%/);assert.match(result.html,/width:75\.000%/);assert.match(result.html,/<tbody>.*001/s);
});
