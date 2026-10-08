import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { indexCaptions, captionTitle } from '../../shared/document-captions.js';
import { cleanHtml, renderDocument } from '../document-render.js';

const root = html=>parseHTML(`<html><body>${html}</body></html>`).document.body;
const table = (id,title)=>`<p class="doc-caption" data-caption-id="${id}" data-caption-for="${id}">Tabel 9.9 ${title}</p><table data-object-id="${id}"><tbody><tr><td>Isi ${title}</td></tr></tbody></table>`;
const reference = id=>`<span class="doc-reference" data-reference-id="${id}">lihat Tabel 9.9</span>`;
function model(html){return [{id:'bab-1',subsections:[{id:'sub-1',content:html}]}];}
function normalize(sections){const result=indexCaptions(sections,sub=>root(sub.content),{normalize:true,tableTitle:()=> 'Tabel baku'});for(const item of result.roots)item.sub.content=item.root.innerHTML;return result;}

test('deleting a middle table renumbers later captions and references by stable target ID',()=>{
 const sections=model(table('one','Satu')+table('two','Dua')+table('three','Tiga')+reference('three'));
 let result=normalize(sections);assert.equal(result.entries[2].number,'Tabel 1.3');
 const parsed=root(sections[0].subsections[0].content);parsed.querySelector('[data-object-id="two"]').remove();parsed.querySelector('[data-caption-id="two"]').remove();
 sections[0].subsections[0].content=parsed.innerHTML;result=normalize(sections);
 assert.equal(result.entries.find(entry=>entry.id==='three').number,'Tabel 1.2');
 assert.match(sections[0].subsections[0].content,/lihat Tabel 1\.2/);assert.deepEqual(result.broken,[]);
});

test('deleted targets become broken, never retarget to an object that inherits the old number',()=>{
 const sections=model(table('one','Satu')+table('two','Dua')+reference('one'));
 normalize(sections);const parsed=root(sections[0].subsections[0].content);parsed.querySelector('[data-object-id="one"]').remove();
 sections[0].subsections[0].content=parsed.innerHTML;const result=normalize(sections);
 assert.equal(result.entries.length,1);assert.equal(result.entries[0].number,'Tabel 1.1');
 assert.equal(result.broken.length,1);assert.match(sections[0].subsections[0].content,/doc-reference-broken/);assert.match(sections[0].subsections[0].content,/doc-caption-orphan/);
 // Restoring the native deletion restores its caption and target association.
 sections[0].subsections[0].content=table('one','Satu')+table('two','Dua')+reference('one');
 const restored=normalize(sections);assert.deepEqual(restored.broken,[]);assert.match(sections[0].subsections[0].content,/lihat Tabel 1\.1/);
});

test('native paragraph joining retains the owner of the surviving caption text',()=>{
 const sections=model(table('one','Satu')+table('two','Dua')+table('three','Tiga')+reference('three'));
 normalize(sections);
 const parsed=root(sections[0].subsections[0].content),second=parsed.querySelector('[data-caption-id="two"]'),third=parsed.querySelector('[data-caption-id="three"]');
 // Chromium can retain the earlier P attributes while moving the later caption spans into it.
 second.replaceChildren(...third.childNodes);third.remove();parsed.querySelector('[data-object-id="two"]').remove();
 sections[0].subsections[0].content=parsed.innerHTML;
 const result=normalize(sections);assert.equal(result.entries[1].id,'three');assert.equal(result.entries[1].title,'Tiga');assert.equal(result.entries[1].number,'Tabel 1.2');assert.deepEqual(result.broken,[]);
});

test('legacy caption IDs remain stable through insertion and title changes, preserving inline title formatting',()=>{
 const sections=model('<p class="doc-caption">Tabel 7.1 <em>Judul lama</em></p><table><tbody><tr><td>Isi</td></tr></tbody></table>');
 const first=normalize(sections).entries[0];assert.equal(first.title,'Judul lama');assert.match(sections[0].subsections[0].content,/<em>Judul lama<\/em>/);
 const parsed=root(sections[0].subsections[0].content);parsed.querySelector('em').textContent='Judul baru';
 sections[0].subsections[0].content=table('new','Sisipan')+parsed.innerHTML;
 const later=normalize(sections).entries[1];assert.equal(later.id,first.id);assert.equal(later.title,'Judul baru');assert.equal(later.number,'Tabel 1.2');
});

test('table and image sequences are independent, reset per chapter, and include structured tables',()=>{
 const sections=[{id:'bab-1',subsections:[{id:'sub-1',content:table('a','A')+'<div><img data-object-id="g" src="data:image/png;base64,AA=="><span class="doc-caption" data-caption-id="g" data-caption-for="g">Gambar 9.9 Bagan</span></div>',tables:[{id:'standard',type:'renja'}]},{id:'sub-2',content:reference('standard')}]},{id:'bab-2',subsections:[{id:'sub-3',content:table('b','B')+reference('a')}]}];
 const result=normalize(sections);assert.deepEqual(result.entries.map(entry=>entry.number),['Tabel 1.1','Gambar 1.1','Tabel 1.2','Tabel 2.1']);
 assert.match(sections[0].subsections[1].content,/lihat Tabel 1\.2/);assert.match(sections[1].subsections[0].content,/lihat Tabel 1\.1/);
});

test('duplicate pasted IDs do not alias targets and unassigned chapters gain no persistent IDs',()=>{
 const sections=model(table('same','A')+table('same','B'));
 const result=normalize(sections);assert.equal(new Set(result.entries.map(entry=>entry.id)).size,2);
 const protectedSections=model('<p class="doc-caption">Tabel 1.1 Caption</p><table><tbody><tr><td>Isi</td></tr></tbody></table>');
 const protectedResult=indexCaptions(protectedSections,sub=>root(sub.content),{normalize:true,editable:()=>false});
 assert.equal(protectedResult.roots[0].root.querySelector('p').hasAttribute('data-caption-id'),false);
});

test('server sanitizer retains caption IDs, reference IDs and figure width, removes forged metadata',()=>{
 const input='<div class="doc-figure doc-image-right" style="width:50%;color:red" onclick="evil()"><img data-object-id="picture" data-image-width="400" src="data:image/png;base64,AA=="><span class="doc-caption" data-caption-id="picture" data-caption-for="picture" data-caption-kind="Gambar">Gambar 1.1 Bagan</span></div>'+reference('picture')+'<p data-object-id="forged" contenteditable="true">Text</p>';
 const html=cleanHtml(input);assert.match(html,/width:50%/);assert.match(html,/data-caption-id="picture"/);assert.match(html,/data-reference-id="picture"/);assert.doesNotMatch(html,/onclick|color:red|forged|contenteditable="true"/);
});

test('rendering resolves cross references and excludes orphan captions in Renja and automatic annex, without mutating source',()=>{
 const sections=model(table('one','Satu')+reference('one')+'<p class="doc-caption" data-caption-id="gone" data-caption-for="gone">Tabel 1.2 Hilang</p>');
 sections[0].title='BAB I PENDAHULUAN';Object.assign(sections[0].subsections[0],{code:'1.1',title:'Uraian'});
 const original=JSON.stringify(sections),base={judul:'Renja Mundu',opdName:'Kecamatan Mundu',tahun:'2027',jenis:'Renja Murni',sections};
 for(const annex of [false,true]){
  const html=renderDocument({...base,isLampiranOtomatis:annex,jenis:annex?'Lampiran Perbup Renja':base.jenis},{opd:{nama:'Kecamatan Mundu'},opdRecord:{nama:'Kecamatan Mundu'},global:{}});
  assert.match(html,/lihat Tabel 1\.1/);assert.doesNotMatch(html,/Tabel 1\.2 Hilang/);
 }
 assert.equal(JSON.stringify(sections),original);
 assert.equal(captionTitle(root('<p class="doc-caption">Gambar 2.3 - Bagan</p>').querySelector('p')),'Bagan');
});
