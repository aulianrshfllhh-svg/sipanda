import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {renderDocument} from '../document-render.js';
import {openRenderedDocument} from '../document-export.js';
import {editableDocx} from '../document-word.js';
const settings={opd:{nama:'Kecamatan Depok'},global:{}};
test('long Word-style lists paginate after a filled page and editable DOCX retains font, numbering, scripts, links and cell alignment',{timeout:60000},async()=>{
 const items=Array.from({length:90},(_,i)=>`<li>Ketentuan ${i} ${'uraian peraturan '.repeat(12)}</li>`).join('');
 const content=`<p>${'Pengantar peraturan '.repeat(300)}</p><ol type="a">${items}</ol><p>x<sup>2</sup> H<sub>2</sub>O <a href="https://example.org/peraturan">Rujukan peraturan</a></p><table><thead><tr><th>Judul</th></tr></thead><tbody><tr><td style="text-align:right;vertical-align:bottom">2579</td></tr></tbody></table>`;
 const doc={judul:'Renja',jenis:'Renja Murni',tahun:'2027',sections:[{id:'b',title:'BAB I HASIL EVALUASI RENJA Kecamatan Depok TAHUN 2025',subsections:[{id:'s',code:'1.1',title:'Landasan Hukum',content}]}]};
 const {browser,page}=await openRenderedDocument(renderDocument(doc,settings));
 try{assert.equal(await page.$$eval('.page-body',nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+1).length),0);assert.equal(await page.$$eval('li',nodes=>nodes.filter(n=>n.textContent.includes('Ketentuan 89')).length),1);
 const entries=await page.$$eval('[data-index-kind="toc"]',nodes=>nodes.map(node=>node.children[0].textContent.trim()));assert.deepEqual(entries.slice(0,4),['KATA PENGANTAR','DAFTAR ISI','DAFTAR TABEL','DAFTAR GAMBAR']);assert.ok(entries.includes('BAB I HASIL EVALUASI RENJA KECAMATAN DEPOK TAHUN 2025'));assert.ok(entries.includes('1.1 Landasan Hukum'));assert.deepEqual(await page.$$eval('.index-empty',nodes=>nodes.map(node=>node.textContent.trim())),['Tidak ada tabel dalam dokumen ini','Tidak ada gambar dalam dokumen ini']);
 const zip=await JSZip.loadAsync(await editableDocx(page,'Renja'));const xml=await zip.file('word/document.xml').async('string');const numbering=await zip.file('word/numbering.xml').async('string');const rels=await zip.file('word/_rels/document.xml.rels').async('string');assert.match(xml,/Bookman Old Style/);assert.doesNotMatch(xml,/Times New Roman/);assert.match(xml,/w:val="superscript"/);assert.match(xml,/w:val="subscript"/);assert.match(xml,/w:jc w:val="right"/);assert.match(xml,/w:vAlign w:val="bottom"/);assert.match(xml,/w:sz w:val="20"/);assert.match(xml,/TOC \\o/);assert.match(xml,/PAGEREF sipanda_/);assert.match(xml,/w:leader="dot"/);assert.match(xml,/w:tab w:val="right"/);assert.match(xml,/w:bookmarkStart/);assert.match(xml,/w:pgNumType[^>]*w:fmt="lowerRoman"/);assert.match(xml,/w:pgNumType[^>]*w:start="1"/);assert.doesNotMatch(xml,/SIPANDA_TOC_FIELD/);assert.doesNotMatch(xml,/<w:updateFields[^>]*w:val="true"/);assert.doesNotMatch(xml,/HALAMAN SAMPUL/);assert.match(numbering,/lowerLetter/);assert.match(rels,/https:\/\/example.org\/peraturan/);
 }finally{await browser.close();}
});
test('optional row splitting retains all text and repeated headers while default refuses oversized rows',{timeout:60000},async()=>{
 const text=Array.from({length:1100},(_,i)=>`kata${i}`).join(' ');const table=`<table class="table-allow-split"><thead><tr><th>Uraian</th><th>Dana</th></tr></thead><tbody><tr><td>${text}</td><td>2.579.714.380</td></tr></tbody></table>`;const doc={judul:'Renja',jenis:'Renja Murni',tahun:'2027',sections:[{id:'b',title:'BAB I',subsections:[{id:'s',code:'1.1',title:'Uraian',content:table}]}]};
 const {browser,page}=await openRenderedDocument(renderDocument(doc,settings));try{const result=await page.evaluate(()=>({text:[...document.querySelectorAll('tbody tr td:first-child')].map(n=>n.textContent).join(''),headers:document.querySelectorAll('thead').length,overflow:[...document.querySelectorAll('.page-body')].some(n=>n.scrollHeight>n.clientHeight+1)}));assert.equal(result.text,text);assert.ok(result.headers>=2);assert.equal(result.overflow,false);}finally{await browser.close();}
 doc.sections[0].subsections[0].content=table.replace('table-allow-split','');await assert.rejects(openRenderedDocument(renderDocument(doc,settings)),/melebihi tinggi halaman/);
});
