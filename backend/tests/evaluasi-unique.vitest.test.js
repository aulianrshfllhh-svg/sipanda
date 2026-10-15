import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadTestEnvironment, validateTestDatabaseUrl } from './test-database.js';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testEnvironment = loadTestEnvironment();
if (!validateTestDatabaseUrl(testEnvironment.DATABASE_URL)) throw new Error('Test dibatalkan: database harus sipanda_test.');
process.env.DATABASE_URL = testEnvironment.DATABASE_URL;
const prisma = new PrismaClient();
let serverProcess;
let api;

async function availablePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => listener.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

async function login(username = 'test-admin') {
  const response = await request(api).post('/api/auth/login').send({ username, password: 'sipanda-test-password' });
  if (response.status !== 200) throw new Error(`Login ${username} test gagal (${response.status}).`);
  return response.body.token;
}

async function findEvaluationAudit(terms) {
  const activityLogTable = await prisma.$queryRaw`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_name='activity_logs' LIMIT 1
  `;
  const matches = terms.map(term => ({ contains: term }));
  if (activityLogTable.length) {
    return prisma.activityLog.findMany({
      where: { tag: 'Evaluasi Triwulan', OR: matches.map(detail => ({ detail })) }
    });
  }
  return prisma.penugasanLog.findMany({
    where: { aksi: { startsWith: 'EVALUASI_' }, OR: matches.map(keterangan => ({ keterangan })) }
  });
}

async function deleteEvaluationAudit(ids, terms) {
  const activityLogTable = await prisma.$queryRaw`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_name='activity_logs' LIMIT 1
  `;
  if (ids.length) {
    if (activityLogTable.length) await prisma.activityLog.deleteMany({ where: { id: { in: ids } } });
    else await prisma.penugasanLog.deleteMany({ where: { id: { in: ids } } });
    return;
  }
  const matches = terms.map(term => ({ contains: term }));
  if (activityLogTable.length) {
    await prisma.activityLog.deleteMany({ where: { tag: 'Evaluasi Triwulan', OR: matches.map(detail => ({ detail })) } });
  } else {
    await prisma.penugasanLog.deleteMany({ where: { aksi: { startsWith: 'EVALUASI_' }, OR: matches.map(keterangan => ({ keterangan })) } });
  }
}

describe('keunikan unggahan evaluasi aktif (MySQL)', () => {
  beforeAll(async () => {
    const port = await availablePort();
    api = `http://127.0.0.1:${port}`;
    serverProcess = spawn(process.execPath, [path.join(backendDirectory, 'tests', 'start-test-server.js')], {
      cwd: backendDirectory,
      env: { ...process.env, TEST_SERVER_PORT: String(port), PORT: String(port) },
      stdio: 'ignore',
      windowsHide: true
    });
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (serverProcess.exitCode !== null) throw new Error('Server API test berhenti sebelum siap.');
      try { if ((await fetch(`${api}/api/health`)).ok) return; } catch { /* tunggu server siap */ }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error('Server API test tidak siap.');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (serverProcess && serverProcess.exitCode === null) {
      serverProcess.kill();
      await new Promise(resolve => { const timer = setTimeout(resolve, 3000); serverProcess.once('exit', () => { clearTimeout(timer); resolve(); }); });
    }
  });

  it('menyisakan tepat satu berkas aktif dari dua unggahan bersamaan pada slot yang sama', async () => {
    const token = await login('test-opd');
    const year = '2098';
    const owner = 'opd-test';
    const quarter = 4;
    const titles = [`unggah-serentak-a-${randomUUID()}`, `unggah-serentak-b-${randomUUID()}`];
    const sendUpload = title => request(api)
      .post('/api/evaluasi-triwulan')
      .set('Authorization', `Bearer ${token}`)
      .field('jenis', 'renja_pd').field('tahun', year).field('triwulan', String(quarter))
      .field('judul', title).field('opdId', 'opd-test-other')
      .attach('file', Buffer.from('%PDF-1.4\nslot uniqueness test'), { filename: `${title}.pdf`, contentType: 'application/pdf' });
    try {
      const responses = await Promise.all(titles.map(sendUpload));
      expect(responses.map(response => response.status)).toEqual([200, 200]);
      const rows = await prisma.$queryRaw`SELECT id, aktif, versi FROM evaluasi_triwulan WHERE jenis='renja_pd' AND opd_id=${owner} AND tahun=${year} AND triwulan=${quarter}`;
      expect(rows.filter(row => row.aktif).length).toBe(1);
      expect(rows.length).toBe(2);
    } finally {
      const uploaded = await prisma.$queryRaw`SELECT file_path FROM evaluasi_triwulan WHERE jenis='renja_pd' AND opd_id=${owner} AND tahun=${year} AND triwulan=${quarter}`;
      await prisma.$executeRaw`DELETE FROM evaluasi_triwulan WHERE jenis='renja_pd' AND opd_id=${owner} AND tahun=${year} AND triwulan=${quarter}`;
      for (const row of uploaded) if (fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
      await deleteEvaluationAudit([], titles);
    }
  });

  it('hanya menampilkan arsip Renja milik OPD yang sedang login', async () => {
    const token = await login('test-opd');
    const year = '2096';
    const id = randomUUID();
    await prisma.$executeRaw`INSERT INTO evaluasi_triwulan (id,jenis,opd_id,tahun,triwulan,judul,file_path,nama_file_asli,mime,ukuran,versi,aktif,diunggah_oleh,diunggah_pada) VALUES (${id},'renja_pd','opd-test-other',${year},1,'arsip OPD lain','/tmp/arsip-opd-lain.pdf','arsip-opd-lain.pdf','application/pdf',1,1,1,'user-test-admin',NOW())`;
    try {
      const response = await request(api)
        .get('/api/evaluasi-triwulan?jenis=renja_pd&riwayat=true')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    } finally {
      await prisma.$executeRaw`DELETE FROM evaluasi_triwulan WHERE id=${id}`;
    }
  });

  it('menolak dua baris aktif langsung dengan slot evaluasi yang sama di MySQL', async () => {
    const owner = 'opd-test';
    const year = '2097';
    const quarter = 3;
    const insert = id => prisma.$executeRaw`INSERT INTO evaluasi_triwulan (id,jenis,opd_id,tahun,triwulan,judul,file_path,nama_file_asli,mime,ukuran,versi,aktif,diunggah_oleh,diunggah_pada) VALUES (${id},'renja_pd',${owner},${year},${quarter},'uji','/tmp/uji.pdf','uji.pdf','application/pdf',1,1,1,'user-test-admin',NOW())`;
    const firstId = randomUUID();
    const secondId = randomUUID();
    try {
      await insert(firstId);
      await expect(insert(secondId)).rejects.toThrow();
    } finally {
      await prisma.$executeRaw`DELETE FROM evaluasi_triwulan WHERE id IN (${firstId},${secondId})`;
    }
  });

  it('menolak duplikasi aktif RKPD dengan opd_id NULL dan mengizinkan versi nonaktif', async () => {
    const year = '2095';
    const quarter = 2;
    const firstId = randomUUID();
    const secondId = randomUUID();
    const inactiveId = randomUUID();
    const insert = (id, active, version) => prisma.$executeRaw`
      INSERT INTO evaluasi_triwulan
        (id,jenis,opd_id,tahun,triwulan,judul,file_path,nama_file_asli,mime,ukuran,versi,aktif,diunggah_oleh,diunggah_pada)
      VALUES (${id},'rkpd',NULL,${year},${quarter},'uji RKPD',${`private/${id}.pdf`},'uji.pdf','application/pdf',1,${version},${active},'user-test-admin',NOW())
    `;
    try {
      await insert(firstId, true, 1);
      await expect(insert(secondId, true, 1)).rejects.toThrow();
      await insert(inactiveId, false, 1);
      await prisma.$executeRaw`UPDATE evaluasi_triwulan SET aktif=0 WHERE id=${firstId}`;
      await insert(secondId, true, 2);
      const rows = await prisma.$queryRaw`
        SELECT id, aktif, versi FROM evaluasi_triwulan
        WHERE jenis='rkpd' AND opd_id IS NULL AND tahun=${year} AND triwulan=${quarter}
      `;
      expect(rows.filter(row => row.aktif).map(row => row.id)).toEqual([secondId]);
      expect(rows).toHaveLength(3);
    } finally {
      await prisma.$executeRaw`DELETE FROM evaluasi_triwulan WHERE id IN (${firstId},${secondId},${inactiveId})`;
    }
  });

  it('menyerialisasi dua unggahan RKPD bersamaan untuk owner NULL dan mencatat riwayat', async () => {
    const token = await login('test-admin');
    const year = '2094';
    const quarter = 4;
    const titles = [`rkpd-serentak-${randomUUID()}`, `rkpd-serentak-${randomUUID()}`];
    let auditIds = [];
    const sendUpload = title => request(api)
      .post('/api/evaluasi-triwulan')
      .set('Authorization', `Bearer ${token}`)
      .field('jenis', 'rkpd')
      .field('tahun', year)
      .field('triwulan', String(quarter))
      .field('judul', title)
      .attach('file', Buffer.from('%PDF-1.4\nRKPD slot concurrency test'), { filename: `${title}.pdf`, contentType: 'application/pdf' });
    try {
      const responses = await Promise.all(titles.map(sendUpload));
      expect(responses.map(response => response.status)).toEqual([200, 200]);
      const rows = await prisma.$queryRaw`
        SELECT id, aktif, versi, file_path AS filePath FROM evaluasi_triwulan
        WHERE jenis='rkpd' AND opd_id IS NULL AND tahun=${year} AND triwulan=${quarter}
        ORDER BY versi
      `;
      expect(rows).toHaveLength(2);
      expect(rows.filter(row => row.aktif)).toHaveLength(1);
      expect(rows.map(row => row.versi)).toEqual([1, 2]);
      const logs = await findEvaluationAudit(titles);
      expect(logs.length).toBeGreaterThanOrEqual(2);
      auditIds = logs.map(log => log.id);
    } finally {
      const uploaded = await prisma.$queryRaw`
        SELECT file_path FROM evaluasi_triwulan
        WHERE jenis='rkpd' AND opd_id IS NULL AND tahun=${year} AND triwulan=${quarter}
      `;
      await prisma.$executeRaw`
        DELETE FROM evaluasi_triwulan WHERE jenis='rkpd' AND opd_id IS NULL AND tahun=${year} AND triwulan=${quarter}
      `;
      for (const row of uploaded) if (fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
      await deleteEvaluationAudit(auditIds, titles);
    }
  });

  it('membatasi akses RKPD untuk OPD dan membolehkan baca staf Bapperida', async () => {
    const opdToken = await login('test-opd');
    const staffToken = await login('test-staff');
    const adminToken = await login('test-admin');
    const id = randomUUID();
    const year = '2093';
    await prisma.$executeRaw`
      INSERT INTO evaluasi_triwulan
        (id,jenis,opd_id,tahun,triwulan,judul,file_path,nama_file_asli,mime,ukuran,versi,aktif,diunggah_oleh,diunggah_pada)
      VALUES (${id},'rkpd',NULL,${year},1,'RKPD access test',${`private/${id}.pdf`},${`private-${id}.pdf`},'application/pdf',1,1,1,'user-test-admin',NOW())
    `;
    try {
      const opdList = await request(api).get('/api/evaluasi-triwulan?jenis=rkpd')
        .set('Authorization', `Bearer ${opdToken}`);
      const opdUpload = await request(api).post('/api/evaluasi-triwulan')
        .set('Authorization', `Bearer ${opdToken}`)
        .field('jenis', 'rkpd').field('tahun', year).field('triwulan', '2')
        .attach('file', Buffer.from('%PDF-1.4\naccess denied'), { filename: 'denied.pdf', contentType: 'application/pdf' });
      const opdDownload = await request(api).get(`/api/evaluasi-triwulan/${id}/download`)
        .set('Authorization', `Bearer ${opdToken}`);
      const staffList = await request(api).get('/api/evaluasi-triwulan?jenis=rkpd')
        .set('Authorization', `Bearer ${staffToken}`);
      const staffUpload = await request(api).post('/api/evaluasi-triwulan')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('jenis', 'rkpd').field('tahun', year).field('triwulan', '3')
        .attach('file', Buffer.from('%PDF-1.4\nstaff read only'), { filename: 'staff.pdf', contentType: 'application/pdf' });
      const staffDelete = await request(api).delete(`/api/evaluasi-triwulan/${id}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(opdList.status).toBe(403);
      expect(opdUpload.status).toBe(403);
      expect(opdDownload.status).toBe(403);
      expect(staffList.status).toBe(200);
      expect(staffList.body.some(row => row.id === id)).toBe(true);
      expect(staffList.body.every(row => !('filePath' in row))).toBe(true);
      expect(staffUpload.status).toBe(403);
      expect(staffDelete.status).toBe(403);
      const adminDelete = await request(api).delete(`/api/evaluasi-triwulan/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminDelete.status).toBe(200);
    } finally {
      await prisma.$executeRaw`DELETE FROM evaluasi_triwulan WHERE id=${id}`;
      await deleteEvaluationAudit([], [id]);
    }
  });

  it('menolak MIME yang tidak cocok dengan ekstensi file', async () => {
    const token = await login('test-admin');
    const response = await request(api)
      .post('/api/evaluasi-triwulan')
      .set('Authorization', `Bearer ${token}`)
      .field('jenis', 'rkpd').field('tahun', '2092').field('triwulan', '1')
      .attach('file', Buffer.from('not a PDF'), { filename: 'salah.pdf', contentType: 'application/octet-stream' });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/MIME/i);
  });

  it('Penyusun RKPD dapat mengganti berkas tetapi bukan menonaktifkannya', async () => {
    const token = await login('test-rkpd-author');
    const staffToken = await login('test-staff');
    const year = '2091';
    const quarter = 3;
    const id = randomUUID();
    const title = `author-upload-${id}`;
    const sendUpload = version => request(api)
      .post('/api/evaluasi-triwulan')
      .set('Authorization', `Bearer ${token}`)
      .field('jenis', 'rkpd').field('tahun', year).field('triwulan', String(quarter))
      .field('judul', title)
      .attach('file', Buffer.from(`%PDF-1.4\nversion ${version}`), { filename: `${title}-v${version}.pdf`, contentType: 'application/pdf' });
    let uploaded = [];
    let auditIds = [];
    try {
      const first = await sendUpload(1);
      const second = await sendUpload(2);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body.versi).toBe(2);
      expect(second.body.aktif).toBe(true);
      const rows = await prisma.$queryRaw`
        SELECT id, aktif, versi, file_path FROM evaluasi_triwulan
        WHERE jenis='rkpd' AND opd_id IS NULL AND tahun=${year} AND triwulan=${quarter}
      `;
      uploaded = rows;
      expect(rows).toHaveLength(2);
      expect(rows.filter(row => row.aktif)).toHaveLength(1);
      const authorDownload = await request(api).get(`/api/evaluasi-triwulan/${second.body.id}/download`)
        .set('Authorization', `Bearer ${token}`);
      const staffDownload = await request(api).get(`/api/evaluasi-triwulan/${second.body.id}/download`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(authorDownload.status).toBe(200);
      expect(staffDownload.status).toBe(200);
      expect(authorDownload.headers['content-disposition']).toContain('attachment');
      const deletion = await request(api).delete(`/api/evaluasi-triwulan/${second.body.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(deletion.status).toBe(403);
      const logs = await findEvaluationAudit([title]);
      const auditIdsFromRows = logs.map(log => log.id);
      auditIds = auditIdsFromRows;
      expect(logs).toHaveLength(2);
      const author = await prisma.user.findUnique({ where: { username: 'test-rkpd-author' }, select: { id: true } });
      expect(logs.every(log => {
        const detail = log.detail || log.keterangan;
        return detail.includes(author.id) && log.createdAt instanceof Date;
      })).toBe(true);
    } finally {
      if (!uploaded.length) {
        uploaded = await prisma.$queryRaw`
          SELECT file_path FROM evaluasi_triwulan
          WHERE jenis='rkpd' AND opd_id IS NULL AND tahun=${year} AND triwulan=${quarter}
        `;
      }
      await prisma.$executeRaw`
        DELETE FROM evaluasi_triwulan WHERE jenis='rkpd' AND opd_id IS NULL AND tahun=${year} AND triwulan=${quarter}
      `;
      for (const row of uploaded) if (fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
      await deleteEvaluationAudit(auditIds, [title]);
    }
  });

  it('membatasi daftar Renja verifikator berdasarkan penugasan pada tahun yang sama', async () => {
    const token = await login('test-staff');
    const year = '2090';
    const unassignedYear = '2089';
    const assignedId = randomUUID();
    const unassignedId = randomUUID();
    const assignment = await prisma.penugasanVerifikasi.create({
      data: { userId: 'user-test-staff', opdId: 'opd-test', tahun: year, createdBy: 'user-test-admin' }
    });
    const insert = (id, rowYear) => prisma.$executeRaw`
      INSERT INTO evaluasi_triwulan
        (id,jenis,opd_id,tahun,triwulan,judul,file_path,nama_file_asli,mime,ukuran,versi,aktif,diunggah_oleh,diunggah_pada)
      VALUES (${id},'renja_pd','opd-test',${rowYear},1,'penugasan uji',${`private/${id}.pdf`},${`${id}.pdf`},'application/pdf',1,1,1,'user-test-admin',NOW())
    `;
    try {
      await insert(assignedId, year);
      await insert(unassignedId, unassignedYear);
      const response = await request(api).get('/api/evaluasi-triwulan?jenis=renja_pd&riwayat=true')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.map(row => row.id)).toContain(assignedId);
      expect(response.body.map(row => row.id)).not.toContain(unassignedId);
      expect(response.body.every(row => !('filePath' in row))).toBe(true);
    } finally {
      await prisma.$executeRaw`DELETE FROM evaluasi_triwulan WHERE id IN (${assignedId},${unassignedId})`;
      await prisma.penugasanVerifikasi.delete({ where: { id: assignment.id } });
    }
  });

  it('menerapkan filter tahun dan OPD untuk daftar Super Admin', async () => {
    const token = await login('test-admin');
    const year = '2088';
    const firstId = randomUUID();
    const secondId = randomUUID();
    const insert = (id, owner) => prisma.$executeRaw`
      INSERT INTO evaluasi_triwulan
        (id,jenis,opd_id,tahun,triwulan,judul,file_path,nama_file_asli,mime,ukuran,versi,aktif,diunggah_oleh,diunggah_pada)
      VALUES (${id},'renja_pd',${owner},${year},1,'filter uji',${`private/${id}.pdf`},${`${id}.pdf`},'application/pdf',1,1,1,'user-test-admin',NOW())
    `;
    try {
      await insert(firstId, 'opd-test');
      await insert(secondId, 'opd-test-other');
      const all = await request(api).get(`/api/evaluasi-triwulan?jenis=renja_pd&tahun=${year}`)
        .set('Authorization', `Bearer ${token}`);
      const oneOpd = await request(api).get(`/api/evaluasi-triwulan?jenis=renja_pd&tahun=${year}&opdId=opd-test`)
        .set('Authorization', `Bearer ${token}`);
      expect(all.status).toBe(200);
      expect(all.body.map(row => row.id)).toEqual(expect.arrayContaining([firstId, secondId]));
      expect(oneOpd.body.map(row => row.id)).toEqual([firstId]);
    } finally {
      await prisma.$executeRaw`DELETE FROM evaluasi_triwulan WHERE id IN (${firstId},${secondId})`;
    }
  });

  it('menolak unggahan lebih besar dari 20 MB', async () => {
    const token = await login('test-admin');
    const response = await request(api)
      .post('/api/evaluasi-triwulan')
      .set('Authorization', `Bearer ${token}`)
      .field('jenis', 'rkpd').field('tahun', '2087').field('triwulan', '1')
      .attach('file', Buffer.alloc(20 * 1024 * 1024 + 1), { filename: 'terlalu-besar.pdf', contentType: 'application/pdf' });
    expect(response.status).toBe(413);
    expect(response.body.error).toMatch(/20 MB/);
  });
});
