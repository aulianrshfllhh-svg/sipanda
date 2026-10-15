import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import {
  canAccessEvaluasiRkpd,
  canUploadEvaluasiRkpd,
  isAllowedEvaluationFile,
  isValidEvaluationFileContent
} from '../evaluasi-triwulan.js';
import { buildUserProfile } from '../user-profile.js';

const isSuperAdmin = user => user.roleKodes?.includes('super_admin') === true;

test('akses RKPD dibatasi ke Bapperida dan Penyusun RKPD', () => {
  assert.equal(canAccessEvaluasiRkpd({ role: 'admin', roleKodes: ['super_admin'] }, isSuperAdmin), true);
  assert.equal(canAccessEvaluasiRkpd({ role: 'staf', roleKodes: ['staf_bapperida'] }, isSuperAdmin), true);
  assert.equal(canAccessEvaluasiRkpd({ role: 'staf', roleKodes: ['penyusun_rkpd'] }, isSuperAdmin), true);
  assert.equal(canAccessEvaluasiRkpd({ role: 'staf', roleKodes: [] }, isSuperAdmin), false);
  assert.equal(canAccessEvaluasiRkpd({ role: 'opd', roleKodes: ['penyusun_rkpd'] }, isSuperAdmin), false);
});

test('hak unggah RKPD hanya diberikan kepada Super Admin dan Penyusun RKPD', () => {
  assert.equal(canUploadEvaluasiRkpd({ role: 'admin', roleKodes: ['super_admin'] }, isSuperAdmin), true);
  assert.equal(canUploadEvaluasiRkpd({ role: 'staf', roleKodes: ['penyusun_rkpd'] }, isSuperAdmin), true);
  assert.equal(canUploadEvaluasiRkpd({ role: 'staf', roleKodes: ['staf_bapperida'] }, isSuperAdmin), false);
  assert.equal(canUploadEvaluasiRkpd({ role: 'opd', roleKodes: ['penyusun_rkpd'] }, isSuperAdmin), false);
});

test('profil Penyusun RKPD dikenali sebagai staf Bapperida tanpa hak Super Admin', () => {
  const profile = buildUserProfile({
    id: 'uploader',
    username: 'penyusun',
    nama: 'Penyusun',
    opdId: null,
    roles: [{ role: { kode: 'penyusun_rkpd' } }]
  });
  assert.equal(profile.role, 'staf');
  assert.equal(profile.isSuperAdmin, false);
  assert.equal(canUploadEvaluasiRkpd(profile, isSuperAdmin), true);
});

test('validasi upload mewajibkan ekstensi dan MIME yang cocok', () => {
  assert.equal(isAllowedEvaluationFile({ originalname: 'evaluasi.PDF', mimetype: 'application/pdf' }), true);
  assert.equal(isAllowedEvaluationFile({
    originalname: 'evaluasi.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }), true);
  assert.equal(isAllowedEvaluationFile({
    originalname: 'evaluasi.xlsx',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }), true);
  assert.equal(isAllowedEvaluationFile({ originalname: 'evaluasi.exe', mimetype: 'application/pdf' }), false);
  assert.equal(isAllowedEvaluationFile({ originalname: 'evaluasi.pdf', mimetype: 'application/octet-stream' }), false);
});

test('validasi isi file memeriksa tanda tangan PDF dan struktur Office', async () => {
  const docx = await new JSZip()
    .file('[Content_Types].xml', '<Types/>')
    .file('word/document.xml', '<document/>')
    .generateAsync({ type: 'nodebuffer' });
  const xlsx = await new JSZip()
    .file('[Content_Types].xml', '<Types/>')
    .file('xl/workbook.xml', '<workbook/>')
    .generateAsync({ type: 'nodebuffer' });
  const wrongOffice = await new JSZip()
    .file('[Content_Types].xml', '<Types/>')
    .file('word/document.xml', '<document/>')
    .generateAsync({ type: 'nodebuffer' });
  assert.equal(await isValidEvaluationFileContent('evaluasi.pdf', Buffer.from('%PDF-1.7\n')), true);
  assert.equal(await isValidEvaluationFileContent('evaluasi.pdf', Buffer.from('MZ executable')), false);
  assert.equal(await isValidEvaluationFileContent('evaluasi.docx', docx), true);
  assert.equal(await isValidEvaluationFileContent('evaluasi.xlsx', xlsx), true);
  assert.equal(await isValidEvaluationFileContent('evaluasi.xlsx', wrongOffice), false);
  assert.equal(await isValidEvaluationFileContent('evaluasi.docx', Buffer.from('not a ZIP')), false);
});
