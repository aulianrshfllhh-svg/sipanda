import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseHTML } from 'linkedom';
import { renderDocument, cleanHtml } from '../document-render.js';
import { openRenderedDocument } from '../document-export.js';
import { editableContentNodes } from '../../shared/editor-orientation.js';
import { F4_PAGE_LAYOUT } from '../../shared/f4-page-layout.js';

function fixture(annex=false){return {id:'orientation-test',opdName:'Kecamatan Mundu',tahun:'2027',jenis:annex?'Lampiran Perbup Renja':'Renja Murni',isLampiranOtomatis:annex,judul:'Renja Mundu',sections:[{id:'bab-1',title:'BAB I PENDAHULUAN',subsections:[{id:'sub-1',code:'1.1',title:'Uraian',content:'<p>Awal portrait</p><div class="doc-section doc-section-landscape"><p>Mulai landscape</p><table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Isi tabel</td></tr></tbody></table></div>'},{id:'sub-2',code:'1.2',title:'Lanjutan',content:'<p>Lanjutan landscape</p><div class="doc-section doc-section-portrait"><p>Kembali portrait</p></div>'}]}]};}
const settings={opd:{nama:'Kecamatan Mundu',alamat:'Mundu'},opdRecord:{nama:'Kecamatan Mundu'},global:{}};
for(const annex of [false,true])test(`explicit orientation is retained per section ${annex?'in generated annex':'in Renja'}`,()=>{
 const html=renderDocument(fixture(annex),settings),document=parseHTML(html).document;
 const articles=[...document.querySelectorAll('#source > article')];
 const body=articles.find(article=>article.dataset.part==='body');
 assert.equal(articles.filter(article=>article.dataset.part==='body').length,1);
 assert.deepEqual([...body.querySelectorAll('.doc-section-break')].map(node=>node.dataset.orientation),['landscape','portrait']);
 for(const text of ['Awal portrait','Mulai landscape','Isi tabel','Lanjutan landscape','Kembali portrait'])assert.equal(body.textContent.split(text).length-1,1);
 if(!annex)assert.equal(articles.find(article=>article.textContent.includes('PEMERINTAH KABUPATEN')).dataset.part,'front');
 assert.match(html,/width:215mm;height:330mm/);assert.match(html,/width:330mm;height:215mm/);
 assert.match(cleanHtml(fixture(annex).sections[0].subsections[0].content),/doc-section-landscape/);
});

test('persisted orientation markers retain one ordered body stream',()=>{
 const doc=fixture();
 doc.sections[0].subsections[0].content='<p>Before transition</p><div class="doc-section-break" data-orientation="landscape"></div><p>Landscape block</p><div class="doc-section-break" data-orientation="portrait"></div><p>After transition</p>';
 const html=renderDocument(doc,settings),document=parseHTML(html).document,body=[...document.querySelectorAll('#source > article')].find(article=>article.dataset.part==='body');
 assert.deepEqual([...body.querySelectorAll('.doc-section-break')].map(node=>node.dataset.orientation),['landscape','portrait']);
 for(const text of ['Before transition','Landscape block','After transition'])assert.equal(body.textContent.split(text).length-1,1);
 assert.match(cleanHtml(doc.sections[0].subsections[0].content),/data-orientation="landscape"/);
});

test('portrait-landscape-portrait content paginates once in order without overlapping section output',{timeout:60000},async()=>{
 const doc=fixture(),html=renderDocument(doc,settings,{editing:true}),{browser,page}=await openRenderedDocument(html);
 try{
  const result=await page.evaluate(async()=>{
   const snapshot=()=>[...document.querySelectorAll('.paper[data-part="body"]')].map(p=>({landscape:p.classList.contains('landscape'),number:p.dataset.number,text:p.querySelector('.page-body').textContent}));
   const first=snapshot();await window.repaginateDocument();const second=snapshot();await window.repaginateDocument();return {first,second,third:snapshot()};
  });
  assert.deepEqual(result.second,result.first);assert.deepEqual(result.third,result.first);
  const pages=result.first;
  const locate=text=>pages.findIndex(item=>item.text.includes(text));
  const first=locate('Awal portrait'),landscape=locate('Mulai landscape'),last=locate('Kembali portrait');
  assert.ok(first>=0&&landscape>first&&last>landscape);
  assert.equal(pages[first].landscape,false);
  assert.equal(pages[landscape].landscape,true);
  assert.equal(pages[last].landscape,false);
  for(const text of ['Awal portrait','Mulai landscape','Isi tabel','Lanjutan landscape','Kembali portrait']){
   assert.equal(pages.reduce((count,item)=>count+(item.text.split(text).length-1),0),1);
  }
 }finally{await browser.close();}
});

test('editor page containers use fixed F4 dimensions and stack without overlap at 100% zoom',{timeout:60000},async()=>{
 const {browser,page}=await openRenderedDocument(renderDocument(fixture(),settings,{editing:true}));
 try{
  const pages=await page.evaluate(()=>[...document.querySelectorAll('.paper.f4')].map(node=>{
   const rect=node.getBoundingClientRect();
   return {part:node.dataset.part,landscape:node.classList.contains('landscape'),x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height};
  }));
  assert.ok(pages.length>=7,'fixture should contain front matter and portrait/landscape body pages');
  for(const paper of pages){
   const expected=paper.landscape?F4_PAGE_LAYOUT.landscape:F4_PAGE_LAYOUT.portrait;
   assert.equal(paper.width,expected.widthPx,`width of ${paper.part} ${paper.landscape?'landscape':'portrait'} page`);
   assert.equal(paper.height,expected.heightPx,`height of ${paper.part} ${paper.landscape?'landscape':'portrait'} page`);
  }
  for(let i=0;i<pages.length;i++)for(let j=i+1;j<pages.length;j++){
   const a=pages[i],b=pages[j];
   const overlaps=a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
   assert.equal(overlaps,false,`page ${i+1} overlaps page ${j+1}`);
  }
  const body=pages.filter(paper=>paper.part==='body');
  assert.deepEqual(body.map(paper=>paper.landscape),[false,true,false]);
  const screenshotPath=path.resolve('artifacts/editor-upgrade/stage-1-no-overlap.png');
  fs.mkdirSync(path.dirname(screenshotPath),{recursive:true});
  await page.screenshot({path:screenshotPath,fullPage:true});
 }finally{await browser.close();}
});

test('persisted orientation breaks do not shift edited block indexes',()=>{
 const root=parseHTML('<html><body><p>Before</p><div class="doc-section doc-section-landscape"><p>Inside</p><table><tbody><tr><td>Table</td></tr></tbody></table></div><div class="doc-section-break" data-orientation="portrait"></div><p>After</p></body></html>').document.body;
 const nodes=editableContentNodes(root);
 assert.deepEqual(nodes.map(node=>node.textContent.trim()),['Before','Inside','Table','After']);
 nodes[3].outerHTML='<p>Edited after transition</p>';
 assert.equal(root.querySelector('.doc-section-break')?.dataset.orientation,'portrait');
 assert.match(root.textContent,/InsideTableEdited after transition/);
 assert.equal(root.textContent.split('After').length-1,0);
});
