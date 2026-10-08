import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { pasteDocument, sanitizePaste, sanitizePasteAsync, plainTextHtml } from '../../shared/editor-paste.js';
import { cleanHtml } from '../document-render.js';
const dom = () => parseHTML('<html><body></body></html>').document;

test('30 Excel rows preserve Indonesian numbers and merged cells; strip active content and source formats', () => {
  const document = dom();
  const input = `<script>alert(1)</script><iframe src="https://evil.test"></iframe><table style="font:8pt Arial;color:red"><tbody>${Array.from({ length: 30 }, (_, i) => `<tr><td ${i === 0 ? 'colspan="2"' : ''} onclick="alert(1)" style="background:red;color:red;font-size:8pt">${i === 0 ? 'Judul gabungan' : '2.579.714.380'}</td><td>1.250,50</td></tr>`).join('')}</tbody></table>`;
  const root = pasteDocument(document, input); sanitizePaste(root);
  assert.equal(root.querySelectorAll('tr').length, 30);
  assert.equal(root.querySelector('[colspan]').getAttribute('colspan'), '2');
  assert.match(root.innerHTML, /2\.579\.714\.380/); assert.match(root.innerHTML, /1\.250,50/);
  assert.doesNotMatch(root.innerHTML, /script|iframe|onclick|style=|color:|font:/i);
  assert.equal(root.querySelectorAll('td').length, 60);
});

test('Word semantic lists, italics, superscript and subscript survive sanitization and server saving', () => {
  const root = pasteDocument(dom(), '<p style="color:blue;font-size:16pt"><span style="font-style:italic">Uraian</span><b> tebal</b><sup>2</sup><sub>3</sub></p><ol type="a"><li>Landasan satu<ol type="i"><li>Turunan</li></ol></li><li>Landasan dua</li></ol>');
  const html = sanitizePaste(root);
  assert.match(html, /<em>Uraian<\/em>/); assert.match(html, /<sup>2<\/sup><sub>3<\/sub>/);
  assert.doesNotMatch(html, /<b>|color|font-size/);
  assert.match(cleanHtml(html, false), /<ol type="a">/);
  assert.match(cleanHtml(html, false), /<sup>2<\/sup>/);
});

test('Office paragraphs become three-level semantic lists without dropping inline text', () => {
  const root = pasteDocument(dom(), '<p style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">a. </span>Satu</p><p style="mso-list:l0 level2 lfo1"><span style="mso-list:Ignore">1) </span><i>Turunan</i></p><p style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">b. </span>Dua</p>');
  sanitizePaste(root);
  assert.equal(root.querySelectorAll('ol[type="a"] > li').length, 2);
  assert.equal(root.querySelectorAll('ol[type="a"] > li > ol > li').length, 1);
  assert.match(root.innerHTML, /<i>Turunan<\/i>/);
});

test('large paste yields event loop and reports progress without truncating cells', async () => {
  const root = pasteDocument(dom(), `<table><tbody>${'<tr><td>123.456</td><td>teks</td></tr>'.repeat(600)}</tbody></table>`);
  const progress = []; let yielded = false;
  const timer = setTimeout(() => { yielded = true; }, 0);
  await sanitizePasteAsync(root, {}, value => progress.push(value)); clearTimeout(timer);
  assert.ok(yielded); assert.ok(progress.length > 2); assert.equal(progress.at(-1), 100);
  assert.equal(root.querySelectorAll('tr').length, 600);
});

test('TSV fallback remains text and unsafe links are removed even in source mode', () => {
  const document = dom();
  const root = pasteDocument(document, plainTextHtml(document, 'Program\t2.579.714.380\nKegiatan\t1.250,50'));
  sanitizePaste(root); assert.equal(root.querySelectorAll('tr').length, 2);
  const source = pasteDocument(document, '<a href="javascript:alert(1)" onmouseover="alert(1)">Tautan</a><p style="text-align:right;color:red">Isi</p>');
  sanitizePaste(source, { preserveStructure: true });
  assert.doesNotMatch(source.innerHTML, /javascript|onmouseover|color/);
  assert.match(source.innerHTML, /text-align:right/);
});
