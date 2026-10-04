// Uploaded files are authoritative: never rebuild their body from editor sections.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { normalWeightDocx } from './annex-normal-weight.js';
const run = promisify(execFile);
const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const normalize = text => text.replace(/\s+/g, ' ').trim();
const babOne = text => /^BAB\s*\.?\s*I(?:\s+PENDAHULUAN)?\s*[:.\-]?$/i.test(normalize(text));
const missing = () => new Error('BAB I PENDAHULUAN belum dapat dikenali pada berkas asli. Gunakan PDF dengan teks yang dapat dipilih atau DOCX dengan judul BAB I yang jelas; PDF hasil pindai perlu OCR terlebih dahulu.');

export function openingLines(doc, settings) {
 const reg = doc.regulation || {}, number = settings.opdRecord?.nomorLampiran;
 if (!number) throw new Error('Nomor lampiran OPD belum diatur.');
 if (doc.jenis === 'Lampiran Kepbup Perubahan Renja') return [
  `LAMPIRAN ${number} KEPUTUSAN BUPATI CIREBON`, `NOMOR : ${reg.nomorKepbup || ''}`,
  `TANGGAL : ${reg.tanggalKepbup || ''}`, 'TENTANG : PERUBAHAN RENCANA KERJA',
  `PERANGKAT DAERAH ${settings.opdRecord.nama}`, `TAHUN ${doc.tahun}`
 ];
 const renstra = doc.jenis === 'Lampiran Perbup Renstra';
 const period = renstra ? `${reg.periodeMulai || doc.tahun}-${reg.periodeAkhir || doc.tahun}` : doc.tahun;
 return [`LAMPIRAN ${number}`, 'PERATURAN BUPATI CIREBON',
  `NOMOR ${reg.nomorPeraturan || ''} TAHUN ${reg.tahunPenetapan || Number(doc.tahun) - 1}`,
  'TENTANG', renstra ? 'RENCANA STRATEGIS PERANGKAT' : 'RENCANA KERJA PERANGKAT', `DAERAH TAHUN ${period}`];
}

// Reject TOC/outline candidates: actual BAB I has narrative before BAB II.
export function findBodyStart(blocks) {
 for (let index = 0; index < blocks.length; index++) {
  if (!babOne(blocks[index])) continue;
  const following = [];
  for (let next = index + 1; next < Math.min(blocks.length, index + 100); next++) {
   if (/^BAB\s*\.?\s*[IVXLCDM]+\b/i.test(normalize(blocks[next]))) break;
   following.push(normalize(blocks[next]));
  }
  const text = following.join(' ');
  if (/PENDAHULUAN/i.test(`${blocks[index]} ${following[0] || ''}`) &&
      /(?:1\s*\.\s*1|LATAR\s+BELAKANG)/i.test(text) && text.length > 180 &&
      !/\.{3,}\s*\d/.test(following.slice(0, 3).join(' '))) return index;
 }
 throw missing();
}

export async function sourceDocx(bytes, doc, settings) {
 const zip = await JSZip.loadAsync(bytes);
 const xml = await zip.file('word/document.xml')?.async('string');
 if (!xml) throw new Error('Berkas DOCX tidak memiliki isi dokumen.');
 const dom = new DOMParser().parseFromString(xml, 'text/xml');
 const body = dom.getElementsByTagNameNS(ns, 'body')[0];
 const nodes = [...body.childNodes].filter(node => node.nodeType === 1);
 const textOf = node => [...node.getElementsByTagNameNS(ns, 't')].map(t => t.textContent).join('');
 const first = findBodyStart(nodes.map(textOf));
 for (const node of nodes.slice(0, first)) body.removeChild(node);
 const start = nodes[first];
 // A manual break before BAB I must not leave a blank first page after inserting the block.
 for (const br of [...start.getElementsByTagNameNS(ns, 'br')]) {
  if (br.getAttributeNS(ns, 'type') === 'page') br.parentNode.removeChild(br);
 }
 for (const br of [...start.getElementsByTagNameNS(ns, 'pageBreakBefore')]) br.setAttributeNS(ns, 'w:val', '0');
 const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
 for (const line of openingLines(doc, settings)) {
  const paragraph = new DOMParser().parseFromString(`<w:p xmlns:w="${ns}"><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="0"/><w:ind w:left="4800"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Bookman Old Style" w:hAnsi="Bookman Old Style"/><w:b w:val="0"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${escape(line)}</w:t></w:r></w:p>`, 'text/xml').documentElement;
  body.insertBefore(dom.importNode(paragraph, true), start);
 }
 zip.file('word/document.xml', new XMLSerializer().serializeToString(dom));
 await normalWeightDocx(zip);
 return { bytes: await zip.generateAsync({ type: 'nodebuffer' }), removedBlocks: first };
}

export async function pdfBodyStart(bytes) {
 const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, isEvalSupported: false });
 const pdf = await task.promise;
 try {
  const blocks = [], positions = [];
  // Read progressively, including subsequent pages for short first-page narratives.
  for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex++) {
   const page = await pdf.getPage(pageIndex + 1);
   const content = await page.getTextContent();
   const lines = [];
   for (const item of content.items) {
    if (!item.str?.trim()) continue;
    const y = item.transform[5], x = item.transform[4];
    let line = lines.find(line => Math.abs(line.y - y) < 3);
    if (!line) { line = { y, height: item.height, items: [] }; lines.push(line); }
    line.items.push({ x, text: item.str });
   }
   lines.sort((a, b) => b.y - a.y);
   for (const line of lines) {
    blocks.push(line.items.sort((a, b) => a.x - b.x).map(i => i.text).join(' '));
    positions.push({ pageIndex, top: line.y + line.height + 3 });
   }
   try { const index = findBodyStart(blocks); return positions[index]; } catch {}
  }
  throw missing();
 } finally { await task.destroy(); }
}

export async function sourcePdf(bytes, doc, settings) {
 const start = await pdfBodyStart(bytes);
 const original = await PDFDocument.load(bytes);
 const output = await PDFDocument.create();
 output.registerFontkit(fontkit);
 const font = await output.embedFont(await fs.readFile(new URL('./assets/fonts/URWBookman-Light.ttf', import.meta.url)), { subset: true });
 const first = original.getPage(start.pageIndex), box = first.getCropBox();
 if (first.getRotation().angle !== 0) throw new Error('Halaman BAB I memakai rotasi PDF. Simpan ulang PDF dengan halaman BAB I tegak terlebih dahulu.');
 const width = box.width, height = box.height, margin = 56.7;
 const lines = openingLines(doc, settings), headerBottom = height - margin - lines.length * 15 - 12;
 const top = Math.min(start.top, box.y + height);
 const bodyHeight = top - box.y;
 const scale = Math.min(1, headerBottom / bodyHeight);
 // Embed the original vector page, clipping only the front matter above BAB I.
 const embedded = await output.embedPage(first, { left: box.x, right: box.x + width, bottom: box.y, top });
 const page = output.addPage([width, height]);
 page.drawPage(embedded, { x: (width - width * scale) / 2, y: Math.min(top - box.y, headerBottom) - bodyHeight * scale, width: width * scale, height: bodyHeight * scale });
 lines.forEach((line, index) => page.drawText(line, { x: width / 2, y: height - margin - 12 - index * 15, size: Math.min(12, (width / 2 - margin) / font.widthOfTextAtSize(line, 1)), font, color: rgb(0, 0, 0) }));
 const rest = await output.copyPages(original, Array.from({ length: original.getPageCount() - start.pageIndex - 1 }, (_, i) => start.pageIndex + i + 1));
 rest.forEach(page => output.addPage(page));
 const normalized = await normalWeightPdf(Buffer.from(await output.save()));
 return { ...normalized, startPage: start.pageIndex + 1, pages: output.getPageCount(), scale };
}

export async function normalWeightPdf(bytes) {
 const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sipanda-weight-'));
 try {
  const input = path.join(directory, 'input.pdf'), output = path.join(directory, 'output.pdf');
  await fs.writeFile(input, bytes);
  const result = await run(process.env.PYTHON_PATH || 'python', [fileURLToPath(new URL('./normal-weight-pdf.py', import.meta.url)), input, output, fileURLToPath(new URL('./assets/fonts/URWBookman-Light.ttf', import.meta.url))], { timeout: 120000, windowsHide: true });
  return { bytes: await fs.readFile(output), ...JSON.parse(result.stdout) };
 } catch (error) { throw new Error(`Normalisasi teks lampiran tanpa bold gagal: ${error.message}`); }
 finally { await fs.rm(directory, { recursive: true, force: true }); }
}

let conversionQueue = Promise.resolve();
export function wordToPdf(bytes, originalName = 'document.docx') {
 const job = conversionQueue.then(async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sipanda-annex-'));
  try {
   const extension = path.extname(originalName).toLowerCase();
   const input = path.join(directory, `document${extension === '.doc' ? '.doc' : '.docx'}`), output = path.join(directory, 'document.pdf');
   await fs.writeFile(input, bytes);
   if (process.env.SOFFICE_PATH || process.platform !== 'win32') {
    await run(process.env.SOFFICE_PATH || 'soffice', [`-env:UserInstallation=file:///${directory.replace(/\\/g, '/')}/profile`, '--headless', '--convert-to', 'pdf', '--outdir', directory, input], { timeout: 120000, windowsHide: true });
   } else {
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('./convert-word.ps1', import.meta.url)), '-InputFile', input, '-OutputFile', output], { timeout: 120000, windowsHide: true });
   }
   return await fs.readFile(output);
  } catch (error) { throw new Error(`Konversi Word ke PDF gagal. Pastikan Microsoft Word tersedia pada Windows atau atur SOFFICE_PATH untuk LibreOffice. ${error.message}`); }
  finally { await fs.rm(directory, { recursive: true, force: true }); }
 });
 conversionQueue = job.catch(() => {});
 return job;
}

export function pdfPreview(bytes) {
 return `<!doctype html><html lang="id"><meta charset="utf-8"><title>Pratinjau lampiran dari dokumen asli</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0}</style><iframe title="Lampiran dari dokumen asli"></iframe><script>const bytes=Uint8Array.from(atob('${Buffer.from(bytes).toString('base64')}'),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));document.querySelector('iframe').src=url;window.addEventListener('unload',()=>URL.revokeObjectURL(url));</script></html>`;
}
