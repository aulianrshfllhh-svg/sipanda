import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {coverDetails,coverHtml,renderDocument} from '../document-render.js';
import {openRenderedDocument} from '../document-export.js';
import {editableDocx} from '../document-word.js';
import {validateCoverLogo} from '../document-settings.js';

const settings={opd:{nama:'Kecamatan Depok',alamat:'Jl. Merdeka No. 1'},opdRecord:{nama:'Kecamatan Depok'},global:{logoData:'data:image/png;base64,logo'}};
const document=(jenis,tahun='2027',regulation={})=>({judul:'Uji cover',jenis,tahun,opdName:'Nama lama',regulation,sections:[]});

function pngHeader(width,height,colorType=6){
 const png=Buffer.alloc(33);
 Buffer.from([137,80,78,71,13,10,26,10]).copy(png);
 png.writeUInt32BE(13,8);png.write('IHDR',12,'ascii');png.writeUInt32BE(width,16);png.writeUInt32BE(height,20);
 png[24]=8;png[25]=colorType;png[26]=0;png[27]=0;png[28]=0;png.write('IEND',29,'ascii');
 return `data:image/png;base64,${png.toString('base64')}`;
}

test('cover variants use official OPD identity, year range, and empty address without placeholders',()=>{
 const renja=coverDetails(document('Renja Murni'),settings);
 assert.equal(renja.name,'Kecamatan Depok');
 assert.equal(renja.title,'RENCANA KERJA (RENJA)');
 assert.equal(renja.middle,'KECAMATAN DEPOK');
 assert.equal(renja.identity,'KECAMATAN DEPOK KABUPATEN CIREBON');
 assert.equal(renja.address,'Jl. Merdeka No. 1');
 assert.equal(coverDetails(document('Renja Perubahan'),settings).title,'PERUBAHAN RENCANA KERJA (RENJA)');
 assert.equal(coverDetails(document('Renstra Murni','2025'),settings).yearLine,'TAHUN 2025-2029');
 assert.equal(coverDetails(document('RKPD Murni'),settings).middle,'KABUPATEN CIREBON');
 assert.equal(coverDetails(document('Evaluasi RKPD Triwulan'),settings).title,'EVALUASI RKPD TRIWULAN');
 assert.equal(coverDetails(document('RPJMD','2025',{periodeMulai:'2025',periodeAkhir:'2029'}),settings).yearLine,'TAHUN 2025-2029');
 const noAddress=coverHtml(document('Renja Murni'),{...settings,opd:{...settings.opd,alamat:''}});
 assert.doesNotMatch(noAddress,/Alamat OPD belum diisi|\[/);
 assert.match(noAddress,/data:image\/png;base64,logo/);
});

test('logo settings require transparent PNG dimensions sized for 300 dpi at 4 cm',()=>{
 assert.match(validateCoverLogo(''),/PNG transparan/);
 assert.match(validateCoverLogo(pngHeader(200,471)),/minimal 472 piksel/);
 assert.match(validateCoverLogo(pngHeader(480,600,2)),/mendukung latar transparan/);
 assert.equal(validateCoverLogo(pngHeader(480,600)), '');
});

test('shared document renderer builds cover from settings and omits the placeholder address',()=>{
 const html=renderDocument({...document('Renja Murni'),sections:[{id:'bab-1',title:'BAB I PENDAHULUAN',subsections:[]}]},settings);
 assert.match(html,/class="cover-layout"/);
 assert.match(html,/class="cover-logo"/);
 assert.match(html,/KECAMATAN DEPOK KABUPATEN CIREBON/);
 assert.doesNotMatch(html,/Alamat OPD belum diisi/);
 assert.match(html,/data-numbering="none"/);
});

test('saved cover edits override current OPD defaults and placeholders never render',()=>{
 const edited='<div class="cover-layout" data-cover-layout="true"><div class="cover-top"><p>PEMERINTAH YANG DIEDIT</p></div><div class="cover-middle"><p class="cover-title" style="font-size:20pt;font-weight:700">SAMPUL OPERATOR</p><p>OPD PILIHAN</p><p>TAHUN 2027</p></div><div class="cover-bottom"><p>IDENTITAS TETAP</p><p>[Alamat OPD belum diisi]</p><p>Petunjuk: hapus petunjuk ini</p></div></div>';
 const doc={...document('Renja Murni'),frontMatter:{cover:edited}};
 const html=renderDocument({...doc,sections:[{id:'bab-1',title:'BAB I PENDAHULUAN',subsections:[]}]},settings);
 assert.match(html,/SAMPUL OPERATOR/);
 assert.match(html,/font-size:20pt/);
 assert.doesNotMatch(html,/PEMERINTAH KABUPATEN CIREBON/);
 assert.doesNotMatch(html,/\[Alamat OPD belum diisi\]|Petunjuk:/);
});

test('editable DOCX embeds the configured logo and preserves a saved cover edit without a cover footer',{timeout:60000},async()=>{
 const logoData='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDj8AAAAASUVORK5CYII=';
 const editedCover=`<div class="cover-layout" data-cover-layout="true"><div class="cover-top"><img class="cover-logo" src="${logoData}" alt="Logo Kabupaten Cirebon"/><p>PEMERINTAH KABUPATEN CIREBON</p></div><div class="cover-middle"><p class="cover-title" style="font-size:20pt;font-weight:700">SAMPUL OPERATOR</p><p>KECAMATAN DEPOK</p><p>TAHUN 2027</p></div><div class="cover-bottom"><p>KECAMATAN DEPOK KABUPATEN CIREBON</p></div></div>`;
 const html=renderDocument({...document('Renja Murni'),frontMatter:{cover:editedCover},sections:[{id:'bab-1',title:'BAB I PENDAHULUAN',subsections:[{id:'sub-1',code:'1.1',title:'Latar Belakang',content:'<p>Uraian untuk menguji cover dokumen.</p>'}]}]},{...settings,global:{logoData}});
 const {browser,page}=await openRenderedDocument(html);
 try{
  const cover=await page.$eval('.paper[data-part="front"]',node=>({number:node.dataset.number,footerHidden:node.querySelector('footer').hidden,logo:node.querySelector('.cover-logo')?.naturalWidth>0}));
  assert.deepEqual(cover,{number:'',footerHidden:true,logo:true});
  const zip=await JSZip.loadAsync(await editableDocx(page,'Uji cover'));
  const xml=await zip.file('word/document.xml').async('string');
  assert.match(xml,/<w:tbl>/);
  assert.match(xml,/SAMPUL OPERATOR/);
  assert.match(xml,/w:sz w:val="40"/);
  assert.match(xml,/w:tblBorders[\s\S]*?w:val="nil"/);
  const mediaPaths=Object.keys(zip.files).filter(path=>/^word\/media\/.+\.png$/i.test(path));
  const relationships=await zip.file('word/_rels/document.xml.rels').async('string');
  assert.ok(mediaPaths.some(path=>relationships.includes(`Target="${path.slice('word/'.length)}"`)));
  assert.match(xml,/<w:drawing>/);
  assert.ok((await zip.file(mediaPaths[0]).async('nodebuffer')).subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
  const firstSection=xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0]||'';
  assert.doesNotMatch(firstSection,/footerReference/);
 }finally{await browser.close();}
});
