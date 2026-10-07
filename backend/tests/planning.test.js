import test from 'node:test';
import assert from 'node:assert/strict';
import {seedSections,instantiate,SEED_TEMPLATES,validateStructure} from '../templates.js';
import {normalizeTable,calculatedRows,money,tableColumns,tableNeedsLandscape} from '../../shared/document-tables.js';
import {cleanHtml,renderDocument} from '../document-render.js';

test('specified year/type outlines and placeholders',()=>{
 assert.equal(seedSections('Renja Murni','2027').length,6);
 assert.equal(seedSections('Renja Murni','2026').length,5);
 assert.ok(SEED_TEMPLATES.some(template=>template.jenis==='Renja Perubahan'&&template.tahun==='2026'&&template.isActive));
 assert.equal(seedSections('Renja Perubahan','2026')[1].title,'BAB II EVALUASI PERUBAHAN RENJA SAMPAI DENGAN TRIWULAN II TAHUN BERKENAAN');
 assert.equal(seedSections('RKPD Murni','2027').length,7);
 assert.equal(seedSections('RKPD Perubahan','2027')[1].title,'BAB II EVALUASI HASIL TRIWULAN II TAHUN BERKENAAN');
 assert.equal(seedSections('Renja Perubahan','2027')[1].title,'BAB II EVALUASI RENJA SAMPAI DENGAN TRIWULAN II TAHUN BERKENAAN');
 assert.deepEqual(seedSections('RPJMD','2027'),[]);
 const source=SEED_TEMPLATES[0],before=structuredClone(source);
 const result=instantiate(source,'Kecamatan Mundu',2027);
 assert.match(result[1].title,/TAHUN 2025/);assert.match(result[1].title,/Kecamatan Mundu/);
 result[0].title='edit';result[1].subsections[2].tables[0].rows.push({level:'baris',cells:[]});assert.deepEqual(source,before);
 const change=JSON.stringify(instantiate(SEED_TEMPLATES[1],'Kecamatan Mundu',2027));
 assert.match(change,/TRIWULAN II/);assert.doesNotMatch(change,/SPM/);assert.doesNotMatch(change,/Perubahan Perubahan/);
 assert.equal(seedSections('Renja Murni','2026')[4].subsections.length,3);
 for(const template of SEED_TEMPLATES)validateStructure(template.sections);
});
test('budget sums leaf amounts, never double-counting parent entries',()=>{
 const row=(level,amount)=>({level,cells:['','','','','',amount,'','','',amount]});
 const table=normalizeTable({type:'renja',rows:[row('program','999'),row('kegiatan','888'),row('subkegiatan','100.000.000'),row('subkegiatan','200000000'),row('program','50.000.000')]});
 const result=calculatedRows(table);assert.equal(result.total,350000000);assert.equal(result.rows[0].cells[5],'300000000');assert.equal(result.totalMaju,350000000);
 assert.equal(tableColumns('renja','2027').length,10);assert.match(tableColumns('renja','2027')[9],/2028/);
 assert.equal(money('Rp 1.250.000,50'),1250000.5);assert.throws(()=>money('abc'));assert.throws(()=>money(-1));
 assert.throws(()=>normalizeTable({type:'renja',rows:[{cells:['a']}]}));
});
test('rancangan Renja table is emitted on a landscape page',()=>{
 const sections=instantiate(SEED_TEMPLATES[0],'Kecamatan Mundu','2027');
 sections[3].subsections[0].tables=[{id:'renja-landscape',type:'renja',rows:[]}];
 const doc={opdName:'Kecamatan Mundu',tahun:'2027',jenis:'Renja Murni',judul:'Renja Mundu',sections};
 const html=renderDocument(doc,{opd:{nama:'Kecamatan Mundu'},global:{}});
 assert.match(html,/data-landscape="true"/);
 assert.match(html,/JUMLAH/);
 assert.match(html,/\.paper\{[^}]*height:297mm;padding:20mm/);
 assert.match(html,/\.page-body\{height:257mm/);
 assert.match(html,/footer\{[^}]*left:20mm;right:20mm/);
});
test('wide imported tables use an isolated landscape page and autofit layout',()=>{
 const cells=Array.from({length:8},(_,index)=>`<th>Kolom ${index+1}</th>`).join('');
 const table=`<table><thead><tr>${cells}</tr></thead><tbody><tr>${Array.from({length:8},(_,index)=>`<td>Isi ${index+1}</td>`).join('')}</tr></tbody></table>`;
 const sections=[{id:'bab-i',title:'BAB I',subsections:[{id:'sub-1',code:'1.1',title:'Subbab',content:`<p>Sebelum tabel.</p><p class="doc-caption">Tabel 1.1 - Contoh lebar</p>${table}<p>Sesudah tabel.</p>`,tables:[]}]}];
 const doc={opdName:'Kecamatan Mundu',tahun:'2027',jenis:'Renja Murni',judul:'Renja Mundu',sections};
 const html=renderDocument(doc,{opd:{nama:'Kecamatan Mundu',alamat:''},global:{}});
 assert.match(html,/data-landscape="true">[\s\S]*?Tabel 1\.1 Contoh lebar[\s\S]*?<table(?:\s|>)/);
 assert.match(html,/data-landscape="false">[\s\S]*?Sesudah tabel/);
 assert.match(html,/table-layout:auto/);
 assert.equal(tableNeedsLandscape({rows:[{cells:['a','b','c','d','e','f']}]}),false);
 assert.equal(tableNeedsLandscape({rows:[{cells:Array(6).fill('extraordinarilylongunbreakableword')}]}),true);
});
test('wide tables in automatic annexes are placed on landscape pages',()=>{
 const columns=Array.from({length:8},(_,index)=>`<th>Kolom ${index+1}</th>`).join('');
 const cells=Array.from({length:8},(_,index)=>`<td>Isi ${index+1}</td>`).join('');
 const sections=[{id:'bab-i',title:'BAB I',subsections:[{id:'sub-1',code:'1.1',title:'Subbab',content:`<p>Sebelum tabel.</p><p class="doc-caption">Tabel 1.1 - Contoh lebar</p><table><thead><tr>${columns}</tr></thead><tbody><tr>${cells}</tr></tbody></table><p>Sesudah tabel.</p>`,tables:[]}]}];
 const html=renderDocument({opdName:'Kecamatan Mundu',tahun:'2027',jenis:'Lampiran Perbup Renja',isLampiranOtomatis:true,judul:'Lampiran',sections},{opdRecord:{nama:'Kecamatan Mundu'},opd:{},global:{bupati:'IMRON'}});
 assert.match(html,/data-landscape="true">[\s\S]*?Tabel 1\.1 Contoh lebar[\s\S]*?<table(?:\s|>)/);
 assert.match(html,/data-landscape="false">[\s\S]*?Sesudah tabel/);
});
test('preview strips active HTML and outbound images',()=>{
 const result=cleanHtml('<script>alert(1)</script><p onclick="x()">Safe <b>bold</b></p><img src="http://127.0.0.1/private" onerror="x()">');
 assert.doesNotMatch(result,/<script|onclick|onerror|http:/);assert.match(result,/<b>bold<\/b>/);
});
test('all generated annex types use the locked format and automatic identity',()=>{
 const sections=instantiate(SEED_TEMPLATES[0],'Kecamatan Mundu','2027');
 const settings={opd:{nama:'Nama lama'},opdRecord:{nama:'Kecamatan Mundu Resmi',nomorLampiran:'LIV'},global:{bupati:'IMRON'}};
 const base={opdName:'Kecamatan Mundu',tahun:'2027',isLampiranOtomatis:true,judul:'Lampiran',sections};
 const renja=renderDocument({...base,jenis:'Lampiran Perbup Renja',regulation:{nomorPeraturan:'12',tahunPenetapan:'2026'}},settings);
 assert.match(renja,/LAMPIRAN LIV/);assert.match(renja,/NOMOR 12 TAHUN 2026/);assert.match(renja,/RENCANA KERJA PERANGKAT DAERAH Kecamatan Mundu Resmi TAHUN 2027/);
 assert.match(renja,/Kecamatan Mundu Resmi/);
 const perubahan=renderDocument({...base,jenis:'Lampiran Kepbup Perubahan Renja',regulation:{nomorKepbup:'7',tanggalKepbup:'12 Juli 2026'}},settings);
 assert.match(perubahan,/KEPUTUSAN BUPATI CIREBON/);assert.match(perubahan,/NOMOR : 7/);assert.match(perubahan,/TANGGAL : 12 Juli 2026/);
 const renstra=renderDocument({...base,jenis:'Lampiran Perbup Renstra',tahun:'2025',regulation:{periodeMulai:'2025',periodeAkhir:'2029',tahunPenetapan:'2024'}},settings);
 assert.match(renstra,/RENCANA STRATEGIS PERANGKAT DAERAH Kecamatan Mundu Resmi TAHUN 2025-2029/);
 for(const html of [renja,perubahan,renstra]){
  assert.doesNotMatch(html,/KATA PENGANTAR|HALAMAN SAMPUL|DAFTAR ISI|DAFTAR TABEL|DAFTAR GAMBAR/);
  assert.doesNotMatch(html,/<strong|<b(?:\s|>)/i);
  assert.match(html,/data-f4="true" data-annex="true"/);
  assert.match(html,/font-family:'Bookman Old Style'/);
  assert.match(html,/class="closing-block"/);
 }
});

test('generated annex tables use 12pt text on a landscape F4 page',()=>{
 const sections=instantiate(SEED_TEMPLATES[0],'Kecamatan Mundu','2027');
 sections[3].subsections[0].tables=[{id:'annex-wide',type:'renja',rows:[]}];
 const doc={opdName:'Kecamatan Mundu',tahun:'2027',jenis:'Lampiran Perbup Renja',isLampiranOtomatis:true,judul:'Lampiran',sections};
 const html=renderDocument(doc,{opdRecord:{nama:'Kecamatan Mundu',nomorLampiran:'LIV'},opd:{},global:{bupati:'IMRON'}});
 assert.match(html,/data-landscape="true"/);
 assert.match(html,/<table style="font-size:12pt">/);
 assert.match(html,/@page f4-landscape\{size:330mm 215mm;margin:0\}/);
});

test('front matter uses configured identity and required order',()=>{
 const doc={
	opdName:'Nama OPD Lama',tahun:'2027',jenis:'Renja Murni',isLampiranOtomatis:false,judul:'Renja Contoh',
	sections:instantiate(SEED_TEMPLATES[0],'Kecamatan Mundu','2027')
 };
 doc.sections[1].subsections[2].content='<p>Uraian masalah.</p><p class="doc-caption">Tabel 2.1 - Identifikasi Permasalahan</p>';
 const html=renderDocument(doc,{global:{bupati:'Bupati Uji',sekretarisDaerah:'Sekda Uji'},opd:{nama:'Kecamatan Mundu',alamat:'Jalan Kecamatan 1',tempat:'Mundu',bulan:'Februari 2027',jabatan:'Camat',pimpinan:'Nama Camat',pangkat:'Pembina',nip:'123'}});
 const ordered=['class="cover"','KATA PENGANTAR','DAFTAR ISI','DAFTAR TABEL','DAFTAR GAMBAR','BAB I PENDAHULUAN'].map(text=>html.indexOf(text));
 assert.ok(ordered.every(index=>index>=0));
 assert.deepEqual(ordered,[...ordered].sort((a,b)=>a-b));
 assert.match(html,/Jalan Kecamatan 1/i);
 assert.match(html,/Nama Camat/);
 assert.match(html,/Tabel 2\.1 Identifikasi Permasalahan/);
 const attachmentHtml=renderDocument({...doc,jenis:'Lampiran Perbup Renja',isLampiranOtomatis:true}, {global:{bupati:'Bupati Uji',sekretarisDaerah:'Sekda Uji'},opd:{nama:'Kecamatan Mundu'},opdRecord:{nama:'Kecamatan Mundu',nomorLampiran:'LIV'}});
 assert.match(attachmentHtml,/Bupati Uji/);
});
