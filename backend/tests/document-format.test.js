import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {documentFormatReport,submissionIssues} from '../submission-validation.js';
import {completeFormatReport,registerDocumentFormatRoutes} from '../document-format.js';
const document=(content,extra={})=>({cara:'template',jenis:'Renstra Murni',judul:'Uji format',tahun:'2027',opdName:'Kecamatan Mundu',sections:[{id:'bab-1',title:'BAB I',subsections:[{id:'sub-1',code:'1.1',title:'Uraian',content}]}],...extra});
const caption='<p class="doc-caption" data-caption-id="t1" data-caption-for="t1">Tabel 1.1 Sasaran perangkat daerah</p>';
const table='<table data-object-id="t1"><tbody><tr><td>Program pelayanan masyarakat</td></tr></tbody></table>';
test('uncaptioned table blocks submission and retains a precise table location; check does not mutate source',()=>{
 const doc=document('<p>Narasi perangkat daerah lengkap.</p>'+table),before=JSON.stringify(doc),report=documentFormatReport(doc);
 assert.equal(report.canSubmit,false);const issue=report.issues.find(i=>i.code==='caption');assert.equal(issue.subId,'sub-1');assert.deepEqual(issue.target,{type:'table',index:0});assert.equal(JSON.stringify(doc),before);assert.ok(submissionIssues(doc).some(i=>/caption/.test(i)));
 assert.equal(documentFormatReport(document(caption+table)).canSubmit,true);
});
test('empty required content, missing image caption, broken references and source fonts are required',()=>{
 for(const [content,code] of [['<p>&nbsp;</p>','empty'],['<p>Narasi perangkat daerah.</p><img src="data:image/png;base64,AAAA">','caption'],['<p>Narasi perangkat daerah. <span class="doc-reference" data-reference-id="deleted">lihat Tabel 1.1</span></p>','reference'],['<p style="font-family:Arial;font-size:20pt">Narasi perangkat daerah.</p>','font']])assert.ok(documentFormatReport(document(content)).issues.some(i=>i.code===code&&i.level==='required'));
});
test('explicit widths respect F4 portrait/landscape sections and persist orientation across subchapters',()=>{
 const wide=table.replace('<table','<table style="width:240mm"');
 assert.ok(documentFormatReport(document(caption+wide)).issues.some(i=>i.code==='wide'));
 assert.equal(documentFormatReport(document(`<div class="doc-section-landscape">${caption+wide}</div>`)).canSubmit,true);
 const doc=document('<div class="doc-section-landscape"><p>Narasi lengkap sebelum tabel.</p></div>');doc.sections[0].subsections.push({id:'sub-2',title:'Lanjutan',content:caption+wide});assert.equal(documentFormatReport(doc).canSubmit,true);
});
test('Renja requires actual rows while advisory spacing and low resolution do not block',()=>{
 const doc=document('<p>Narasi perangkat daerah lengkap.</p>',{jenis:'Renja Murni'});assert.ok(documentFormatReport(doc).issues.some(i=>i.code==='renja'));
 doc.sections[0].subsections[0].tables=[{id:'renja-1',type:'renja',rows:[{cells:['Program pelayanan masyarakat']}]}];assert.equal(documentFormatReport(doc).canSubmit,true);
 const image='<div class="doc-figure" style="width:50%"><img data-object-id="im1" data-image-width="100" src="data:image/png;base64,AAAA"><span class="doc-caption" data-caption-id="im1" data-caption-for="im1" data-caption-kind="Gambar">Gambar 1.1 Bagan pelayanan</span></div>';
 const report=documentFormatReport(document('<p>Narasi perangkat daerah lengkap.</p>'+image+'<p><br></p>'.repeat(5)));
 assert.equal(report.canSubmit,true);assert.ok(report.issues.some(i=>i.code==='resolution'));assert.ok(report.issues.some(i=>i.code==='spacing'));assert.equal(report.score,100);
});
test('format endpoint reuses document viewing permission and does not render denied documents',async()=>{
 let allowed=false,checked=0;
 const app=express(),doc=document('<p>Narasi perangkat daerah lengkap.</p>');
 const prisma={document:{findUnique:async()=>doc},documentSettings:{findUnique:async()=>null},opd:{findUnique:async()=>null}};
 registerDocumentFormatRoutes(app,prisma,(_q,_r,next)=>next(),async()=>({canView:allowed}),async source=>{checked++;return documentFormatReport(source);});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{const url=`http://127.0.0.1:${server.address().port}/api/documents/test/format-check`;assert.equal((await fetch(url)).status,403);assert.equal(checked,0);allowed=true;const response=await fetch(url);assert.equal(response.status,200);assert.equal((await response.json()).canSubmit,true);assert.equal(checked,1);}finally{await new Promise(r=>server.close(r));}
});
test('printed format check detects almost empty body pages, retains location, and closes browser', {timeout:60000},async()=>{
 const report=await completeFormatReport(document('<p>Uraian singkat perangkat daerah.</p><div class="doc-page-break"></div><p>Lanjutan singkat perangkat daerah.</p>'),{opd:{nama:'Kecamatan Mundu',alamat:'Jalan Kecamatan'},global:{logoData:'data:image/png;base64,logo'}});
 assert.equal(report.canSubmit,true);const sparse=report.issues.filter(i=>i.code==='sparse-page');assert.ok(sparse.length>=2);assert.ok(sparse.every(i=>i.subId==='sub-1'&&i.target.type==='page'));
});
test('printed geometry blocks overflowing tables even without an explicit source width', {timeout:60000},async()=>{
 const wide=`<table data-object-id="t1"><tbody><tr>${'<td>Isi</td>'.repeat(200)}</tr></tbody></table>`;
 const doc=document(caption+wide);
 assert.equal(documentFormatReport(doc).canSubmit,true);
 const report=await completeFormatReport(doc,{opd:{nama:'Kecamatan Mundu',alamat:'Jalan Kecamatan'},global:{logoData:'data:image/png;base64,logo'}});
 assert.equal(report.canSubmit,false);const issue=report.issues.find(i=>i.code==='wide');assert.equal(issue.subId,'sub-1');assert.equal(issue.target.objectId,'t1');
});
test('cover logo and OPD address are required for format check and submission',async()=>{
 const doc=document('<p>Narasi perangkat daerah lengkap.</p>');
 const open=async()=>({browser:{close:async()=>{}},page:{evaluate:async()=>[]}});
 const missing=await completeFormatReport(doc,{opd:{nama:'Kecamatan Mundu',alamat:''},global:{logoData:''}},open);
 assert.equal(missing.canSubmit,false);
 assert.ok(missing.issues.some(issue=>issue.code==='cover-logo'&&issue.level==='required'));
 assert.ok(missing.issues.some(issue=>issue.code==='cover-address'&&issue.level==='required'));
 const complete=await completeFormatReport(doc,{opd:{nama:'Kecamatan Mundu',alamat:'Jalan Kecamatan'},global:{logoData:'data:image/png;base64,logo'}},open);
 assert.equal(complete.canSubmit,true);
});
test('cover placeholders are required findings even though rendered exports remove them',async()=>{
 const doc=document('<p>Narasi perangkat daerah lengkap.</p>',{frontMatter:{cover:'<div class="cover-layout"><p>[Alamat OPD belum diisi]</p><p>Petunjuk: isi judul</p></div>'}});
 const open=async html=>{
  assert.doesNotMatch(html,/\[Alamat OPD belum diisi\]|Petunjuk:/);
  return {browser:{close:async()=>{}},page:{evaluate:async()=>[]}};
 };
 const report=await completeFormatReport(doc,{opd:{nama:'Kecamatan Mundu',alamat:'Jalan Kecamatan'},global:{logoData:'data:image/png;base64,logo'}},open);
 assert.equal(report.canSubmit,false);
 assert.ok(report.issues.some(issue=>issue.code==='cover-placeholder'&&issue.level==='required'));
});
