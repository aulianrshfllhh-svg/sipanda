import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { renderDocument } from '../document-render.js';
import { openRenderedDocument } from '../document-export.js';
import { editableDocx } from '../document-word.js';

test('60-row landscape section repeats headers, preserves merged rows, numbering and F4 PDF/DOCX orientations', { timeout:60000 }, async () => {
 const rows=Array.from({length:60},(_,i)=>`<tr>${i===12?'<td rowspan="2">Gabungan 12–13</td>':i===13?'':`<td>Program ${i}</td>`}<td>${i}</td><td>2.579.714.380</td></tr>`).join('');
 const doc={judul:'Uji Renja Mundu F4',jenis:'Renja Murni',tahun:'2027',opdName:'Kecamatan Mundu',sections:[{id:'bab-1',title:'BAB I PENDAHULUAN',subsections:[{id:'sub-1',code:'1.1',title:'Uraian',content:`<p>Sebelum tabel portrait.</p><div class="doc-section doc-section-landscape"><p class="doc-caption">Tabel 1.1 Program kecamatan</p><table><thead><tr><th>Program</th><th>No</th><th>Pagu</th></tr></thead><tbody>${rows}</tbody></table></div><div class="doc-section doc-section-portrait"><p>Sesudah tabel portrait.</p></div>`}]}]};
 const html=renderDocument(doc,{opd:{nama:'Kecamatan Mundu',alamat:'Mundu'},global:{}});
 const {browser,page}=await openRenderedDocument(html);
 try {
  const result=await page.evaluate(()=>({
   pages:[...document.querySelectorAll('.paper')].map(p=>({landscape:p.classList.contains('landscape'),part:p.dataset.part,number:p.dataset.number,width:p.getBoundingClientRect().width,height:p.getBoundingClientRect().height})),
   rowCount:document.querySelectorAll('tbody > tr').length,
   landscapeHeaders:[...document.querySelectorAll('.paper.landscape')].map(p=>p.querySelectorAll('thead > tr').length),
   overflow:[...document.querySelectorAll('.page-body')].filter(el=>el.scrollHeight>el.clientHeight+1).length,
   merged:document.querySelector('td[rowspan="2"]')?.parentElement.nextElementSibling?.textContent,
   references:[...document.querySelectorAll('[data-page-ref]')].map(el=>el.textContent)
  }));
  assert.equal(result.rowCount,60);assert.equal(result.overflow,0);assert.ok(result.landscapeHeaders.length>=2);assert.ok(result.landscapeHeaders.every(n=>n===1));assert.match(result.merged,/13/);
  const front=result.pages.filter(p=>p.part==='front');assert.deepEqual(front.map(p=>p.number).slice(0,5),['','i','ii','iii','iv']);
  const body=result.pages.filter(p=>p.part==='body');assert.deepEqual(body.map(p=>p.number),body.map((_,i)=>String(i+1)));
  assert.equal(result.pages[0].landscape,false);assert.equal(body.at(-1).landscape,false);
  assert.ok(result.references.every(number=>number.length));
  const pdf=await PDFDocument.load(await page.pdf({preferCSSPageSize:true,printBackground:true}));
  assert.equal(pdf.getPageCount(),result.pages.length);
  for(const [i,p] of pdf.getPages().entries()){
   const landscape=result.pages[i].landscape;
   assert.ok(Math.abs(p.getWidth()-(landscape?330:215)*72/25.4)<2);
   assert.ok(Math.abs(p.getHeight()-(landscape?215:330)*72/25.4)<2);
  }
  const zip=await JSZip.loadAsync(await editableDocx(page,doc.judul));
  const xml=await zip.file('word/document.xml').async('string');
  assert.match(xml,/w:orient="landscape"/);assert.match(xml,/w:orient="portrait"/);assert.match(xml,/w:tblHeader/);assert.match(xml,/w:cantSplit/);assert.match(xml,/12189/);assert.match(xml,/18709/);
 } finally {await browser.close();}
});
