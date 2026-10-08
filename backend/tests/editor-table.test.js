import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { tableGrid, editTable, tidyTable, parseIndonesianNumber } from '../../shared/editor-table.js';
const table = html => parseHTML(`<html><body>${html}</body></html>`).document.querySelector('table');
const regular = () => table('<table><thead><tr><th>Nama</th><th>Pagu</th></tr></thead><tbody><tr><td>Program</td><td>2579714380</td></tr><tr><td>Kegiatan</td><td>1.250,50</td></tr></tbody></table>');

test('add/delete axes and transpose preserve a valid merged-cell grid', () => {
  const node = table('<table><tbody><tr><td rowspan="2">Gabungan vertikal</td><td colspan="2">Gabungan horizontal</td></tr><tr><td>A</td><td>B</td></tr></tbody></table>');
  assert.deepEqual(tableGrid(node).errors, []);
  editTable(node,'row-add',{row:0}); assert.equal(tableGrid(node).height,3); assert.deepEqual(tableGrid(node).errors,[]);
  editTable(node,'row-delete',{row:1}); assert.equal(tableGrid(node).height,2);
  editTable(node,'column-add',{column:1}); assert.equal(tableGrid(node).width,4); assert.deepEqual(tableGrid(node).errors,[]);
  editTable(node,'column-delete',{column:2}); assert.equal(tableGrid(node).width,3);
  editTable(node,'transpose'); assert.equal(tableGrid(node).height,3); assert.equal(tableGrid(node).width,2); assert.deepEqual(tableGrid(node).errors,[]);
  assert.match(node.textContent,/Gabungan vertikal/); assert.match(node.textContent,/Gabungan horizontal/);
});

test('merge preserves text; split restores cells; reject nonrectangular selections', () => {
  const node=regular();
  assert.throws(()=>editTable(node,'merge',{selected:[2,5]}),/persegi panjang/);
  editTable(node,'merge',{selected:[2,3]}); assert.equal(tableGrid(node).cells.length,5);
  assert.match(node.textContent,/Program2579714380/);
  editTable(node,'split',{row:1,column:0});assert.equal(tableGrid(node).cells.length,6);assert.deepEqual(tableGrid(node).errors,[]);
});

test('tidy removes empty axes, cleans styles and invisibles, formats Indonesian values and retains text', () => {
  const node=table('<table style="color:red"><tbody><tr><td> Nama </td><td>Pagu</td><td></td></tr><tr><td style="background:blue">Program\u200b   daerah</td><td>2579714380</td><td></td></tr><tr><td></td><td></td><td></td></tr></tbody></table>');
  const result=tidyTable(node);assert.ok(result.changes>=5);assert.deepEqual(result.warnings,[]);
  const model=tableGrid(node);assert.equal(model.height,2);assert.equal(model.width,2);assert.equal(model.headerRows,1);
  assert.match(node.textContent,/Program daerah/);assert.match(node.textContent,/2\.579\.714\.380/);assert.doesNotMatch(node.innerHTML,/background|color:red|\u200b/);
  assert.equal(node.querySelectorAll('col').length,2);
});

test('damaged merges are reported; cleanup retains their content', () => {
  const node=table('<table><tbody><tr><td rowspan="9">Isi harus utuh</td><td>A</td></tr><tr><td>B</td></tr></tbody></table>');
  const result=tidyTable(node);assert.ok(result.warnings.length);assert.match(node.textContent,/Isi harus utuh/);assert.ok(node.querySelector('.table-cell-warning'));
});

test('total row parses Indonesian decimals and keeps nonnumeric columns empty', () => {
  const node=regular();editTable(node,'total');assert.match(node.textContent,/2\.579\.715\.630,5/);
  assert.equal(parseIndonesianNumber('2.579.714.380'),2579714380);assert.equal(parseIndonesianNumber('1.250,50'),1250.5);assert.equal(parseIndonesianNumber('Kode 1.2'),null);
});
