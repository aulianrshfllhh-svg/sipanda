import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import JSZip from 'jszip';
import {DOMParser} from '@xmldom/xmldom';
import {normalWeightDocx} from '../annex-normal-weight.js';
test('DOCX removes direct, inherited, complex-script, table and drawing bold',async()=>{
 const w='http://schemas.openxmlformats.org/wordprocessingml/2006/main',a='http://schemas.openxmlformats.org/drawingml/2006/main';
 const zip=new JSZip();
 zip.file('word/document.xml',`<w:document xmlns:w="${w}" xmlns:a="${a}"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>BAB I</w:t></w:r><w:r><w:rPr><w:b/><w:bCs/><w:i/><w:rFonts w:ascii="Arial Black"/></w:rPr><w:t>Isi asli</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>123.456</w:t></w:r></w:p></w:tc></w:tr></w:tbl><a:p><a:r><a:rPr b="1"/><a:t>Bagan</a:t></a:r></a:p></w:body></w:document>`);
 zip.file('word/styles.xml',`<w:styles xmlns:w="${w}"><w:style w:styleId="Heading1"><w:rPr><w:b/><w:bCs w:val="true"/></w:rPr></w:style></w:styles>`);
 zip.file('word/header1.xml',`<w:hdr xmlns:w="${w}"><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>HEADER</w:t></w:r></w:p></w:hdr>`);
 await normalWeightDocx(zip);
 for(const name of Object.keys(zip.files)){
  if(zip.files[name].dir)continue;
  const xml=await zip.file(name).async('string');const dom=new DOMParser().parseFromString(xml,'text/xml');
  for(const kind of ['b','bCs'])for(const flag of [...dom.getElementsByTagNameNS(w,kind)])assert.equal(flag.getAttributeNS(w,'val'),'0');
  for(const run of [...dom.getElementsByTagNameNS(w,'r')])assert.equal(run.getElementsByTagNameNS(w,'b')[0].getAttributeNS(w,'val'),'0');
  assert.ok(!xml.includes('b="1"'));assert.ok(!xml.includes('Arial Black'));
 }
 const xml=await zip.file('word/document.xml').async('string');
 assert.match(xml,/<w:i\/>/);assert.match(xml,/123.456/);assert.match(xml,/Isi asli/);
});
test('PDF normalizes bold while preserving regular neighbours, graphics and orientation',async()=>{
 const result=await promisify(execFile)(process.env.PYTHON_PATH||'python',[fileURLToPath(new URL('./test_normal_weight_pdf.py',import.meta.url))],{timeout:60000,windowsHide:true});
 assert.match(result.stdout,/PASS/);
});
