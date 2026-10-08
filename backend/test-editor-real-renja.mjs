import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {PDFDocument} from 'pdf-lib';
import {convertEditorFile} from './editor-import.js';
import {editableDocx} from './document-word.js';
import {parseHTML} from 'linkedom';
import {renderDocument} from './document-render.js';
import {openRenderedDocument} from './document-export.js';
const source='uploads/1790963169069-438187134.docx',bytes=fs.readFileSync(source),hash=createHash('sha256').update(bytes).digest('hex');
const conversion=await convertEditorFile(bytes,'Renja-Depok-2027.docx');const html=conversion.html;
const root=parseHTML(`<html><body>${html}</body></html>`).document.body;
const sections=[];let current=null;
for(const node of root.children){if(/^BAB\s+[IVXLCDM]+$/i.test(node.textContent.trim())&&/^H[1-4]$/.test(node.nodeName)){current={id:`bab-${sections.length+1}`,title:node.textContent.trim(),subsections:[{id:`sub-${sections.length+1}`,code:`${sections.length+1}.1`,title:'Naskah Renja Kecamatan Depok',content:''}]};sections.push(current);}else if(current)current.subsections[0].content+=node.outerHTML;}
const doc={judul:'Renja Kecamatan Depok 2027 — uji naskah asli',jenis:'Renja Murni',tahun:'2027',opdName:'Kecamatan Depok',sections};
assert.equal(sections.length,6);assert.equal(root.querySelectorAll('table').length,11);
try{const {browser,page}=await openRenderedDocument(renderDocument(doc,{opd:{nama:'Kecamatan Depok'},global:{}}));try{
 const result=await page.evaluate(()=>({pages:[...document.querySelectorAll('.paper')].map(n=>({landscape:n.classList.contains('landscape')})),tables:document.querySelectorAll('table').length,landscape:document.querySelectorAll('.landscape').length,overflow:[...document.querySelectorAll('.page-body')].filter(n=>n.scrollHeight>n.clientHeight+1).length,text:document.querySelector('#pages').textContent}));
 assert.equal(result.overflow,0);assert.ok(result.landscape>0);assert.match(result.text,/Koordinasi dan Penyusunan Laporan Capaian Kinerja/);
 const directory='../artifacts/editor-upgrade';fs.mkdirSync(directory,{recursive:true});
 const pdfBytes=await page.pdf({preferCSSPageSize:true,printBackground:true});fs.writeFileSync(directory+'/renja-depok-2027.pdf',pdfBytes);const pdf=await PDFDocument.load(pdfBytes);assert.equal(pdf.getPageCount(),result.pages.length);pdf.getPages().forEach((p,i)=>{assert.ok(Math.abs(p.getWidth()-(result.pages[i].landscape?330:215)*72/25.4)<2);});
 const word=await editableDocx(page,doc.judul);fs.writeFileSync(directory+'/renja-depok-2027-editable.docx',word);const zip=await JSZip.loadAsync(word),xml=await zip.file('word/document.xml').async('string');assert.match(xml,/Bookman Old Style/);assert.match(xml,/w:orient="landscape"/);assert.match(xml,/Koordinasi dan Penyusunan Laporan Capaian Kinerja/);
 assert.equal(createHash('sha256').update(fs.readFileSync(source)).digest('hex'),hash);
 const report={source:'Renja asli Kecamatan Depok 2027 (berkas unggahan lokal)',sha256:hash,chapters:sections.length,originalTables:11,pages:result.pages.length,landscapePages:result.landscape,overflow:result.overflow,conversionWarnings:conversion.warnings,pdfAndEditableDocx:'PASS',originalUnmodified:true};fs.writeFileSync(directory+'/real-renja-report.json',JSON.stringify(report,null,2));console.log('PASS real Renja:',JSON.stringify(report));
}finally{await browser.close();}}catch(e){console.error(e.message);process.exitCode=1;}
