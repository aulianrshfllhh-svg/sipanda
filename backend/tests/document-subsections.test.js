import test from 'node:test';
import assert from 'node:assert/strict';
import { appendSubsection } from '../document-subsections.js';

test('appendSubsection adds a numbered editable subsection without mutating source', () => {
  const source = [{ id: 'bab-2', title: 'BAB II', order: 2, subsections: [{ id: 'sub-2-1', code: '2.1', title: 'Evaluasi', content: '<p></p>' }] }];
  const result = appendSubsection(source, 'bab-2', '  Analisis tambahan  ', 'sub-new');

  assert.equal(result.subsection.code, '2.2');
  assert.equal(result.subsection.title, 'Analisis tambahan');
  assert.equal(result.subsection.content, '<p></p>');
  assert.equal(result.sections[0].subsections.length, 2);
  assert.equal(source[0].subsections.length, 1);
});

test('appendSubsection rejects invalid titles and chapters', () => {
  const sections = [{ id: 'bab-1', subsections: [] }];
  assert.throws(() => appendSubsection(sections, 'bab-1', '  ', 'sub-new'), /Judul sub-bab wajib diisi/);
  assert.throws(() => appendSubsection(sections, 'bab-1', 'x'.repeat(161), 'sub-new'), /maksimal 160/);
  assert.throws(() => appendSubsection(sections, 'missing', 'Judul', 'sub-new'), /Bab dokumen tidak ditemukan/);
});
