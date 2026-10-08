import test from 'node:test';
import assert from 'node:assert/strict';
import { submissionIssues } from '../submission-validation.js';

test('submission rejects missing chapters, empty subchapters and HTML-only content', () => {
  assert.ok(submissionIssues({cara:'template',sections:[]}).length);
  assert.ok(submissionIssues({cara:'template',sections:[{subsections:[]}]}).length);
  for (const content of ['<p><br></p>', '<p>&nbsp;&nbsp;&nbsp;&nbsp;</p>', '<p>Petunjuk: isi latar belakang.</p>']) {
    assert.ok(submissionIssues({cara:'template',sections:[{subsections:[{content}]}]}).length);
  }
});
test('submission requires saved source for uploads and accepts completed template content', () => {
  assert.ok(submissionIssues({cara:'upload',fileName:'renja.docx'}).length);
  assert.deepEqual(submissionIssues({cara:'upload',fileName:'renja.docx',filePath:'/uploads/renja.docx'}),[]);
  assert.deepEqual(submissionIssues({cara:'template',sections:[{subsections:[{content:'<p>Rencana kerja perangkat daerah tahun anggaran 2027.</p>'}]}]}),[]);
});
