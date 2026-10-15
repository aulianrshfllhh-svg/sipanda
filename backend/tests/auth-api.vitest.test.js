import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadTestEnvironment, validateTestDatabaseUrl } from './test-database.js';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testEnvironment = loadTestEnvironment();
if (!validateTestDatabaseUrl(testEnvironment.DATABASE_URL)) {
  throw new Error('Tes API dibatalkan karena target bukan database test yang diizinkan.');
}
process.env.DATABASE_URL = testEnvironment.DATABASE_URL;
let serverProcess;
let api;

async function availablePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => listener.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

async function waitForApi(baseUrl) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error('Server test berhenti sebelum siap.');
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  throw new Error('Server test tidak siap dalam batas waktu.');
}

async function login(username, password = 'sipanda-test-password') {
  return request(api).post('/api/auth/login').send({ username, password });
}

const prisma = new PrismaClient();

describe('API autentikasi dan akses', () => {
  beforeAll(async () => {
    const port = await availablePort();
    api = `http://127.0.0.1:${port}`;
    serverProcess = spawn(process.execPath, [
      path.join(backendDirectory, 'tests', 'start-test-server.js')
    ], {
      cwd: backendDirectory,
      env: { ...process.env, TEST_SERVER_PORT: String(port), PORT: String(port) },
      stdio: 'ignore',
      windowsHide: true
    });
    await waitForApi(api);
  });

  afterAll(async () => {
    if (!serverProcess || serverProcess.exitCode !== null) return;
    serverProcess.kill();
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 3000);
      serverProcess.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  });

  it('menerima kredensial akun OPD aktif', async () => {
    const response = await login('test-opd');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user).toMatchObject({ id: 'user-test-opd', role: 'opd' });
    expect(response.body.token).toEqual(expect.any(String));
  });

  it('menolak kata sandi yang salah dan akun nonaktif', async () => {
    const badPassword = await login('test-opd', 'salah');
    const inactive = await login('test-inactive');
    expect(badPassword.status).toBe(401);
    expect(inactive.status).toBe(401);
  });

  it('menolak login tanpa kredensial lengkap', async () => {
    const response = await request(api).post('/api/auth/login').send({ username: 'test-opd' });
    expect(response.status).toBe(400);
  });

  it('memuat profil untuk token yang valid dan menolak akses anonim', async () => {
    const anonymous = await request(api).get('/api/auth/me');
    const signedIn = await login('test-opd');
    const profile = await request(api)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signedIn.body.token}`);
    expect(anonymous.status).toBe(401);
    expect(profile.status).toBe(200);
    expect(profile.body.user.id).toBe('user-test-opd');
  });

  it('mempertahankan semua role pada akun ganda', async () => {
    const response = await login('test-dual');
    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('staf');
    expect(response.body.user.roleKodes).toEqual(expect.arrayContaining(['opd', 'staf_bapperida']));
  });

  it('membatasi pergantian pengguna hanya untuk super-admin', async () => {
    const opd = await login('test-opd');
    const admin = await login('test-admin');
    const denied = await request(api)
      .post('/api/auth/switch-user')
      .set('Authorization', `Bearer ${opd.body.token}`)
      .send({ username: 'test-staff' });
    const allowed = await request(api)
      .post('/api/auth/switch-user')
      .set('Authorization', `Bearer ${admin.body.token}`)
      .send({ username: 'test-staff' });
    expect(denied.status).toBe(403);
    expect(allowed.status).toBe(200);
  });

  it('menolak akses endpoint staf untuk akun OPD yang login valid', async () => {
    const opdLogin = await login('test-opd');
    const response = await request(api)
      .get('/api/staf')
      .set('Authorization', `Bearer ${opdLogin.body.token}`);
    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/staf|hanya/i);
  });

  it('memungkinkan staf yang ditugaskan verifikasi untuk menyetujui dokumen OPD lain', async () => {
    const original = await prisma.document.findUnique({ where: { id: 'document-test' } });
    const staffUser = await prisma.user.findUnique({ where: { username: 'test-staff' } });
    const opdUser = await prisma.user.findUnique({ where: { username: 'test-opd' } });
    if (!staffUser || !opdUser) throw new Error('seeded verification user not found');

    await prisma.penugasanVerifikasi.upsert({
      where: { userId_opdId_tahun: { userId: staffUser.id, opdId: 'opd-test', tahun: '2027' } },
      update: { keterangan: 'Uji persetujuan terjadwal' },
      create: { userId: staffUser.id, opdId: 'opd-test', tahun: '2027', keterangan: 'Uji persetujuan terjadwal' }
    });
    await prisma.document.update({
      where: { id: 'document-test' },
      data: { status: 'Menunggu Verifikasi', createdById: opdUser.id, updatedAt: new Date() }
    });

    try {
      const staffLogin = await login('test-staff');
      const response = await request(api)
        .post('/api/documents/document-test/verify')
        .set('Authorization', `Bearer ${staffLogin.body.token}`)
        .send({ status: 'Disetujui' });

      expect(response.status).toBe(200);
      expect(response.body.document.status).toBe('Disetujui Bapperida');
      expect(response.body.document.verifierName).toBe(staffUser.nama);
    } finally {
      await prisma.penugasanVerifikasi.deleteMany({ where: { userId: staffUser.id, opdId: 'opd-test', tahun: '2027' } });
      if (original) {
        await prisma.document.update({
          where: { id: 'document-test' },
          data: { status: original.status, createdById: original.createdById, updatedAt: original.updatedAt || new Date() }
        });
      }
    }
  });

  it('menolak persetujuan dokumen yang dibuat sendiri meski staf sudah ditugaskan', async () => {
    const original = await prisma.document.findUnique({ where: { id: 'document-test' } });
    const staffUser = await prisma.user.findUnique({ where: { username: 'test-staff' } });
    if (!staffUser) throw new Error('test-staff not found');
    await prisma.penugasanVerifikasi.upsert({
      where: { userId_opdId_tahun: { userId: staffUser.id, opdId: 'opd-test', tahun: '2027' } },
      update: { keterangan: 'Uji persetujuan mandiri' },
      create: { userId: staffUser.id, opdId: 'opd-test', tahun: '2027', keterangan: 'Uji persetujuan mandiri' }
    });
    await prisma.document.update({
      where: { id: 'document-test' },
      data: { status: 'Menunggu Verifikasi', createdById: staffUser.id, updatedAt: new Date() }
    });

    try {
      const staffLogin = await login('test-staff');
      const response = await request(api)
        .post('/api/documents/document-test/verify')
        .set('Authorization', `Bearer ${staffLogin.body.token}`)
        .send({ status: 'Disetujui' });

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/sendiri|mandiri|ditugaskan|persetujuan/i);
    } finally {
      await prisma.penugasanVerifikasi.deleteMany({ where: { userId: staffUser.id, opdId: 'opd-test', tahun: '2027' } });
      if (original) {
        await prisma.document.update({
          where: { id: 'document-test' },
          data: { status: original.status, createdById: original.createdById, updatedAt: original.updatedAt || new Date() }
        });
      }
    }
  });

  it('membatasi OPD pada dokumen miliknya dan memberi super-admin akses lintas OPD', async () => {
    const otherOpdId = 'opd-test-other';
    const otherDocumentId = 'document-test-other';
    await prisma.opd.create({
      data: {
        id: otherOpdId,
        kode: 'TEST2',
        nama: 'Perangkat Daerah Uji Kedua',
        singkatan: 'OPD UJI 2',
        nomorUrut: 2,
        nomorLampiran: '2'
      }
    });
    await prisma.document.create({
      data: {
        id: otherDocumentId,
        kodeDoc: 'TEST-2027-002',
        jenis: 'Renja Murni',
        tahun: '2027',
        judul: 'Dokumen Uji OPD Kedua',
        opdId: otherOpdId,
        opdName: 'Perangkat Daerah Uji Kedua'
      }
    });

    try {
      const opd = await login('test-opd');
      const admin = await login('test-admin');
      const ownDocument = await request(api)
        .get('/api/documents/document-test')
        .set('Authorization', `Bearer ${opd.body.token}`);
      const otherOpdDocument = await request(api)
        .get(`/api/documents/${otherDocumentId}`)
        .set('Authorization', `Bearer ${opd.body.token}`);
      const adminDocument = await request(api)
        .get(`/api/documents/${otherDocumentId}`)
        .set('Authorization', `Bearer ${admin.body.token}`);

      expect(ownDocument.status).toBe(200);
      expect(otherOpdDocument.status).toBe(403);
      expect(adminDocument.status).toBe(200);
    } finally {
      await prisma.document.delete({ where: { id: otherDocumentId } });
      await prisma.opd.delete({ where: { id: otherOpdId } });
    }
  });

  it('menyajikan antrean verifikator sesuai penugasan dan menolak URL dokumen tanpa tugas', async () => {
    const staff = await prisma.user.findUnique({ where: { username: 'test-staff' } });
    const dualRole = await prisma.user.findUnique({ where: { username: 'test-dual' } });
    if (!staff || !dualRole) throw new Error('seeded verifier users not found');

    const staffLogin = await login('test-staff');
    const dualLogin = await login('test-dual');
    const directBeforeAssignment = await request(api)
      .get('/api/documents/document-test')
      .set('Authorization', `Bearer ${staffLogin.body.token}`);
    await prisma.penugasanVerifikasi.create({
      data: { userId: staff.id, opdId: 'opd-test', tahun: '2027', keterangan: 'Uji antrean terverifikasi' }
    });

    try {
      const staffQueue = await request(api)
        .get('/api/documents')
        .set('Authorization', `Bearer ${staffLogin.body.token}`);
      const dualQueue = await request(api)
        .get('/api/documents')
        .set('Authorization', `Bearer ${dualLogin.body.token}`);
      const directAfterAssignment = await request(api)
        .get('/api/documents/document-test')
        .set('Authorization', `Bearer ${staffLogin.body.token}`);

      expect(directBeforeAssignment.status).toBe(403);
      expect(staffQueue.body.map(document => document.id)).toContain('document-test');
      expect(dualQueue.body.map(document => document.id)).not.toContain('document-test');
      expect(directAfterAssignment.status).toBe(200);
    } finally {
      await prisma.penugasanVerifikasi.deleteMany({
        where: { userId: staff.id, opdId: 'opd-test', tahun: '2027' }
      });
    }
  });

  it('membatasi antrean verifikasi pada penugasan staf di tahun yang dipilih', async () => {
    const staff = await prisma.user.findUnique({ where: { username: 'test-staff' } });
    if (!staff) throw new Error('test-staff not found');

    const assignedOpdId = 'opd-verification-assigned';
    const otherYearOpdId = 'opd-verification-other-year';
    const assignedDocumentId = 'document-verification-assigned';
    const otherYearDocumentId = 'document-verification-other-year';

    await prisma.opd.createMany({
      data: [
        { id: assignedOpdId, kode: 'VERIFY1', nama: 'OPD Verifikasi Uji', singkatan: 'VERIFY1', nomorUrut: 20, nomorLampiran: '20' },
        { id: otherYearOpdId, kode: 'VERIFY2', nama: 'OPD Tahun Lain Uji', singkatan: 'VERIFY2', nomorUrut: 21, nomorLampiran: '21' }
      ]
    });
    await prisma.document.createMany({
      data: [
        {
          id: assignedDocumentId,
          kodeDoc: 'VERIFY-2026-001',
          jenis: 'Renja Murni',
          tahun: '2026',
          judul: 'Dokumen OPD yang Ditugaskan',
          status: 'Disetujui Bapperida',
          opdId: assignedOpdId,
          opdName: 'OPD Verifikasi Uji'
        },
        {
          id: otherYearDocumentId,
          kodeDoc: 'VERIFY-2026-002',
          jenis: 'Renja Murni',
          tahun: '2026',
          judul: 'Dokumen OPD yang Ditugaskan pada Tahun Lain',
          status: 'Disetujui Bapperida',
          opdId: otherYearOpdId,
          opdName: 'OPD Tahun Lain Uji'
        }
      ]
    });
    await prisma.penugasanVerifikasi.createMany({
      data: [
        { userId: staff.id, opdId: assignedOpdId, tahun: '2026', keterangan: 'Uji penugasan tahun aktif' },
        { userId: staff.id, opdId: otherYearOpdId, tahun: '2027', keterangan: 'Uji penugasan tahun lain' }
      ]
    });

    try {
      const staffLogin = await login('test-staff');
      const response = await request(api)
        .get('/api/admin/verification-summary?tahun=2026')
        .set('Authorization', `Bearer ${staffLogin.body.token}`);
      const timeline = await request(api)
        .get(`/api/admin/verification-timeline/${otherYearDocumentId}`)
        .set('Authorization', `Bearer ${staffLogin.body.token}`);
      const invalidYear = await request(api)
        .get('/api/admin/verification-summary?tahun=202')
        .set('Authorization', `Bearer ${staffLogin.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body.antreanVerifikasiFinal.map(document => document.id)).toContain(assignedDocumentId);
      expect(response.body.antreanVerifikasiFinal.map(document => document.id)).not.toContain(otherYearDocumentId);
      expect(timeline.status).toBe(403);
      expect(invalidYear.status).toBe(400);
    } finally {
      await prisma.penugasanVerifikasi.deleteMany({ where: { userId: staff.id, opdId: { in: [assignedOpdId, otherYearOpdId] } } });
      await prisma.document.deleteMany({ where: { id: { in: [assignedDocumentId, otherYearDocumentId] } } });
      await prisma.opd.deleteMany({ where: { id: { in: [assignedOpdId, otherYearOpdId] } } });
    }
  });

  it('menolak persetujuan langsung dari Draft dan mewajibkan catatan revisi', async () => {
    const staff = await login('test-staff');
    const directApproval = await request(api)
      .post('/api/documents/document-test/verify')
      .set('Authorization', `Bearer ${staff.body.token}`)
      .send({ status: 'Disetujui' });
    const revisionWithoutNote = await request(api)
      .post('/api/documents/document-test/verify')
      .set('Authorization', `Bearer ${staff.body.token}`)
      .send({ status: 'Perlu Revisi', catatanRevisi: '   ' });

    expect(directApproval.status).toBe(400);
    expect(revisionWithoutNote.status).toBe(400);
    expect(revisionWithoutNote.body.error).toMatch(/catatan revisi wajib/i);
  });

  it('mengubah status ke Perlu Revisi dan menyimpan catatan wajib', async () => {
    const original = await prisma.document.findUnique({ where: { id: 'document-test' } });
    const staffUser = await prisma.user.findUnique({ where: { username: 'test-staff' } });
    if (!staffUser || !original) throw new Error('seeded document or verifier not found');

    await prisma.penugasanVerifikasi.create({
      data: { userId: staffUser.id, opdId: 'opd-test', tahun: '2027', keterangan: 'Uji revisi' }
    });
    await prisma.document.update({
      where: { id: 'document-test' },
      data: { status: 'Menunggu Verifikasi' }
    });

    try {
      const staff = await login('test-staff');
      const response = await request(api)
        .post('/api/documents/document-test/verify')
        .set('Authorization', `Bearer ${staff.body.token}`)
        .send({ status: 'Perlu Revisi', catatanRevisi: 'Mohon lengkapi indikator kinerja.' });
      const documentList = await request(api)
        .get('/api/documents')
        .set('Authorization', `Bearer ${staff.body.token}`);
      const processedDocument = documentList.body.find(document => document.id === 'document-test');

      expect(response.status).toBe(200);
      expect(response.body.document.status).toBe('Perlu Revisi');
      expect(response.body.document.catatanRevisi).toBe('Mohon lengkapi indikator kinerja.');
      expect(response.body.document.verifierName).toBe(staffUser.nama);
      expect(processedDocument.verifierName).toBe(staffUser.nama);
    } finally {
      await prisma.penugasanVerifikasi.deleteMany({
        where: { userId: staffUser.id, opdId: 'opd-test', tahun: '2027' }
      });
      await prisma.document.update({
        where: { id: 'document-test' },
        data: {
          status: original.status,
          createdById: original.createdById,
          catatanRevisi: original.catatanRevisi,
          updatedAt: original.updatedAt
        }
      });
    }
  });

  it('penyusun RKPD dapat menyimpan bab yang ditugaskan tetapi tidak dapat menyimpan bab lain', async () => {
    const documentId = 'document-rkpd-assignment-test';
    const bapperidaId = 'opd-bapperida-test';
    const staffUser = await prisma.user.findUnique({ where: { username: 'test-staff' } });
    if (!staffUser) throw new Error('seeded RKPD planner not found');

    await prisma.opd.create({
      data: {
        id: bapperidaId,
        kode: 'BAPTEST',
        nama: 'Bapperida Uji',
        singkatan: 'BAP UJI',
        nomorUrut: 99,
        nomorLampiran: '99'
      }
    });
    await prisma.document.create({
      data: {
        id: documentId,
        kodeDoc: 'RKPD-TEST-001',
        jenis: 'RKPD',
        tahun: '2027',
        judul: 'RKPD Uji Penugasan Bab',
        opdId: bapperidaId,
        opdName: 'Bapperida Uji',
        sections: {
          create: [
            {
              babId: 'bab-1',
              babTitle: 'BAB I PENDAHULUAN',
              babOrder: 1,
              isLocked: false,
              subsections: [{ id: 'sub-1', code: '1.1', title: 'Latar Belakang', content: '<p>Isi awal bab satu.</p>' }]
            },
            {
              babId: 'bab-2',
              babTitle: 'BAB II GAMBARAN UMUM',
              babOrder: 2,
              isLocked: false,
              subsections: [{ id: 'sub-2', code: '2.1', title: 'Kondisi Umum', content: '<p>Isi awal bab dua.</p>' }]
            }
          ]
        }
      }
    });

    try {
      const admin = await login('test-admin');
      const adminDocument = await request(api)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${admin.body.token}`);
      const assignmentResponse = await request(api)
        .post(`/api/documents/${documentId}/assignments/chapters`)
        .set('Authorization', `Bearer ${admin.body.token}`)
        .send({ userId: staffUser.id, babId: 'bab-1', keterangan: 'Penyusun BAB I' });
      expect(adminDocument.status).toBe(200);
      expect(adminDocument.body.sections.map(section => section.id)).toEqual(['bab-1', 'bab-2']);
      expect(assignmentResponse.status).toBe(201);

      const staff = await login('test-staff');
      const documentResponse = await request(api)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${staff.body.token}`);
      expect(documentResponse.status).toBe(200);

      const sessionId = 'planner-session-000001';
      const session = await request(api)
        .post(`/api/documents/${documentId}/editor-session`)
        .set('Authorization', `Bearer ${staff.body.token}`)
        .send({ sessionId, babIds: ['bab-1'] });
      expect(session.status).toBe(200);

      const babOne = documentResponse.body.sections.find(section => section.id === 'bab-1');
      const babTwo = documentResponse.body.sections.find(section => section.id === 'bab-2');
      const saveAssignedChapter = await request(api)
        .put(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${staff.body.token}`)
        .send({
          editorSessionId: sessionId,
          editorRevisions: session.body.revisions,
          sections: [{
            ...babOne,
            subsections: [{ ...babOne.subsections[0], content: '<p>Perubahan penyusun bab satu.</p>' }]
          }]
        });
      const saveOtherChapter = await request(api)
        .put(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${staff.body.token}`)
        .send({
          editorSessionId: sessionId,
          editorRevisions: session.body.revisions,
          sections: [babTwo]
        });

      expect(saveAssignedChapter.status).toBe(200);
      expect(saveOtherChapter.status).toBe(403);

      const removeAssignment = await request(api)
        .delete(`/api/documents/${documentId}/assignments/chapters/${assignmentResponse.body.id}`)
        .set('Authorization', `Bearer ${admin.body.token}`);
      const staffAfterRemoval = await request(api)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${staff.body.token}`);
      const assignmentLogs = await prisma.penugasanLog.findMany({
        where: { target: `${documentId}:bab-1` },
        orderBy: { createdAt: 'asc' }
      });

      expect(removeAssignment.status).toBe(200);
      expect(staffAfterRemoval.status).toBe(403);
      expect(assignmentLogs.map(entry => entry.aksi)).toEqual(['ASSIGN_BAB_RKPD', 'UNASSIGN_BAB_RKPD']);
    } finally {
      await prisma.$executeRaw`DELETE FROM editor_chapter_leases WHERE document_id=${documentId}`;
      await prisma.penugasanLog.deleteMany({ where: { target: `${documentId}:bab-1` } });
      await prisma.penugasanBabRkpd.deleteMany({ where: { documentId } });
      await prisma.document.delete({ where: { id: documentId } });
      await prisma.opd.delete({ where: { id: bapperidaId } });
    }
  });
});
