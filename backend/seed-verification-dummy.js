// backend/seed-verification-dummy.js
// SIPANDA — Seed Data Contoh Verifikasi Tahap 1 & Verifikasi Final
// Bapperida Kabupaten Cirebon

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding verification sample data...');

  const [superAdmin, agus, bambang] = await Promise.all([
    prisma.user.findFirst({ where: { roles: { some: { role: { kode: 'super_admin' } } } } }),
    prisma.user.findFirst({ where: { username: 'agus.bapperida' } }),
    prisma.user.findFirst({ where: { username: 'bambang.bapperida' } }),
  ]);

  if (!superAdmin) throw new Error('Super admin tidak ditemukan');
  if (!agus) throw new Error('User agus.bapperida tidak ditemukan');

  const tahun = '2026';
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // Pastikan penugasan Agus untuk 2026 mencakup dinkes dan dpupr
  await prisma.penugasanVerifikasi.upsert({
    where: { userId_opdId_tahun: { userId: agus.id, opdId: 'dinkes', tahun } },
    update: { keterangan: 'Desk Kesehatan 2026' },
    create: { userId: agus.id, opdId: 'dinkes', tahun, keterangan: 'Desk Kesehatan 2026', createdBy: superAdmin.id }
  });
  await prisma.penugasanVerifikasi.upsert({
    where: { userId_opdId_tahun: { userId: agus.id, opdId: 'dpupr', tahun } },
    update: { keterangan: 'Desk Infrastruktur 2026' },
    create: { userId: agus.id, opdId: 'dpupr', tahun, keterangan: 'Desk Infrastruktur 2026', createdBy: superAdmin.id }
  });

  // Pastikan Bambang ditugaskan ke disdik
  if (bambang) {
    await prisma.penugasanVerifikasi.upsert({
      where: { userId_opdId_tahun: { userId: bambang.id, opdId: 'disdik', tahun } },
      update: { keterangan: 'Desk Pendidikan 2026' },
      create: { userId: bambang.id, opdId: 'disdik', tahun, keterangan: 'Desk Pendidikan 2026', createdBy: superAdmin.id }
    });
  }

  const dinkesUser = await prisma.user.findFirst({ where: { opdId: 'dinkes' } });
  const dpuprUser = await prisma.user.findFirst({ where: { opdId: 'dpupr' } });

  // 1. Dokumen Menunggu Verifikasi 1 (Belum lewat batas: 1 hari lalu)
  const doc1Id = 'dummy-v1-normal-dinkes';
  const date1 = new Date(now.getTime() - 1 * dayMs);
  await prisma.document.upsert({
    where: { id: doc1Id },
    update: {
      status: 'Menunggu Verifikasi',
      updatedAt: date1,
      catatanRevisi: null,
      verifierName: null,
      verifierJabatan: null,
      createdById: dinkesUser?.id || superAdmin.id
    },
    create: {
      id: doc1Id,
      kodeDoc: 'RNJ-2026-DKS1',
      jenis: 'Renja Murni',
      tahun,
      judul: 'Renja Murni Dinas Kesehatan T.A. 2026',
      subJudul: 'Rencana Kerja Dinas Kesehatan Kabupaten Cirebon',
      status: 'Menunggu Verifikasi',
      cara: 'template',
      opdId: 'dinkes',
      opdName: 'Dinas Kesehatan',
      createdById: dinkesUser?.id || superAdmin.id,
      createdAt: date1,
      updatedAt: date1
    }
  });
  await prisma.documentStatusLog.deleteMany({ where: { documentId: doc1Id } });
  await prisma.$executeRaw`INSERT INTO document_status_logs (id, document_id, dari, ke, oleh, alasan, perubahan, waktu) VALUES (${randomUUID()}, ${doc1Id}, 'Draft', 'Menunggu Verifikasi', 'Operator Dinkes', 'Pengajuan naskah Renja Murni untuk Verifikasi 1', NULL, ${date1})`;

  // 2. Dokumen Menunggu Verifikasi 1 (LEWAT BATAS: 5 hari lalu)
  const doc2Id = 'dummy-v1-overdue-dpupr';
  const date2 = new Date(now.getTime() - 5 * dayMs);
  await prisma.document.upsert({
    where: { id: doc2Id },
    update: {
      status: 'Menunggu Verifikasi',
      updatedAt: date2,
      catatanRevisi: null,
      verifierName: null,
      verifierJabatan: null,
      createdById: dpuprUser?.id || superAdmin.id
    },
    create: {
      id: doc2Id,
      kodeDoc: 'RNJ-2026-PUPR1',
      jenis: 'Renja Perubahan',
      tahun,
      judul: 'Renja Perubahan Dinas Pekerjaan Umum dan Penataan Ruang T.A. 2026',
      subJudul: 'Rencana Kerja Perubahan DPUPR Kabupaten Cirebon',
      status: 'Menunggu Verifikasi',
      cara: 'template',
      opdId: 'dpupr',
      opdName: 'Dinas Pekerjaan Umum dan Penataan Ruang',
      createdById: dpuprUser?.id || superAdmin.id,
      createdAt: date2,
      updatedAt: date2
    }
  });
  await prisma.documentStatusLog.deleteMany({ where: { documentId: doc2Id } });
  await prisma.$executeRaw`INSERT INTO document_status_logs (id, document_id, dari, ke, oleh, alasan, perubahan, waktu) VALUES (${randomUUID()}, ${doc2Id}, 'Draft', 'Menunggu Verifikasi', 'Operator DPUPR', 'Pengajuan naskah Renja Perubahan untuk Verifikasi 1', NULL, ${date2})`;

  // 3. Dokumen Disetujui Bapperida (Menunggu Verifikasi Final, Tanpa Koreksi: 1 hari lalu)
  const doc3Id = 'dummy-vf-normal-dinkes';
  const date3 = new Date(now.getTime() - 1 * dayMs);
  await prisma.document.upsert({
    where: { id: doc3Id },
    update: {
      status: 'Disetujui Bapperida',
      updatedAt: date3,
      verifierName: agus.nama,
      verifierJabatan: agus.jabatan,
      tteNumber: `050/BA-DINKES/${tahun}`
    },
    create: {
      id: doc3Id,
      kodeDoc: 'RST-2026-DKS1',
      jenis: 'Renstra Murni',
      tahun,
      judul: 'Renstra Dinas Kesehatan Periode 2025-2029',
      subJudul: 'Rencana Strategis Dinas Kesehatan Kabupaten Cirebon',
      status: 'Disetujui Bapperida',
      cara: 'template',
      opdId: 'dinkes',
      opdName: 'Dinas Kesehatan',
      verifierName: agus.nama,
      verifierJabatan: agus.jabatan,
      tteNumber: `050/BA-DINKES/${tahun}`,
      createdById: superAdmin.id,
      createdAt: new Date(now.getTime() - 3 * dayMs),
      updatedAt: date3
    }
  });
  await prisma.verification.deleteMany({ where: { documentId: doc3Id } });
  await prisma.documentStatusLog.deleteMany({ where: { documentId: doc3Id } });
  await prisma.$executeRaw`INSERT INTO verifications (id, document_id, verifier_id, status, catatan_revisi, tte_number, verifikasi_tahap, created_at) VALUES (${randomUUID()}, ${doc3Id}, ${agus.id}, 'Disetujui Bapperida', NULL, ${'050/BA-DINKES/' + tahun}, 1, ${date3})`;
  await prisma.$executeRaw`INSERT INTO document_status_logs (id, document_id, dari, ke, oleh, alasan, perubahan, waktu) VALUES (${randomUUID()}, ${doc3Id}, 'Menunggu Verifikasi', 'Disetujui Bapperida', ${agus.nama}, 'Disetujui pada Verifikasi 1', NULL, ${date3})`;

  // 4. Dokumen Disetujui Bapperida (Menunggu Verifikasi Final, DENGAN KOREKSI & LEWAT 4 HARI)
  const doc4Id = 'dummy-vf-corrected-dpupr';
  const date4Approval = new Date(now.getTime() - 4 * dayMs);
  const date4Correction = new Date(now.getTime() - 2 * dayMs);
  await prisma.document.upsert({
    where: { id: doc4Id },
    update: {
      status: 'Disetujui Bapperida',
      updatedAt: date4Correction,
      verifierName: agus.nama,
      verifierJabatan: agus.jabatan,
      tteNumber: `050/BA-DPUPR/${tahun}`
    },
    create: {
      id: doc4Id,
      kodeDoc: 'RNJ-2026-PUPR2',
      jenis: 'Renja Murni',
      tahun,
      judul: 'Renja Murni Dinas Pekerjaan Umum dan Penataan Ruang T.A. 2026',
      subJudul: 'Dokumen Renja DPUPR dengan penyesuaian indikator keluaran',
      status: 'Disetujui Bapperida',
      cara: 'template',
      opdId: 'dpupr',
      opdName: 'Dinas Pekerjaan Umum dan Penataan Ruang',
      verifierName: agus.nama,
      verifierJabatan: agus.jabatan,
      tteNumber: `050/BA-DPUPR/${tahun}`,
      createdById: superAdmin.id,
      createdAt: new Date(now.getTime() - 6 * dayMs),
      updatedAt: date4Correction
    }
  });
  await prisma.verification.deleteMany({ where: { documentId: doc4Id } });
  await prisma.documentStatusLog.deleteMany({ where: { documentId: doc4Id } });
  await prisma.$executeRaw`INSERT INTO verifications (id, document_id, verifier_id, status, catatan_revisi, tte_number, verifikasi_tahap, created_at) VALUES (${randomUUID()}, ${doc4Id}, ${agus.id}, 'Disetujui Bapperida', NULL, ${'050/BA-DPUPR/' + tahun}, 1, ${date4Approval})`;
  await prisma.$executeRaw`INSERT INTO document_status_logs (id, document_id, dari, ke, oleh, alasan, perubahan, waktu) VALUES (${randomUUID()}, ${doc4Id}, 'Menunggu Verifikasi', 'Disetujui Bapperida', ${agus.nama}, 'Disetujui pada Verifikasi 1', NULL, ${date4Approval})`;
  await prisma.$executeRaw`INSERT INTO document_status_logs (id, document_id, dari, ke, oleh, alasan, perubahan, waktu) VALUES (${randomUUID()}, ${doc4Id}, 'Disetujui Bapperida', 'Disetujui Bapperida', ${agus.nama}, 'Koreksi teknis penyesuaian target pagu indikatif Bab 4', '[{"babId":"bab-4","keterangan":"Koreksi tabel belanja"}]', ${date4Correction})`;

  // 5. Dokumen Perlu Revisi
  const doc5Id = 'dummy-revisi-disdik';
  const date5 = new Date(now.getTime() - 2 * dayMs);
  await prisma.document.upsert({
    where: { id: doc5Id },
    update: {
      status: 'Perlu Revisi',
      catatanRevisi: 'Mohon lengkapi matriks program prioritas pada Bab 3.',
      updatedAt: date5
    },
    create: {
      id: doc5Id,
      kodeDoc: 'RNJ-2026-DDK1',
      jenis: 'Renja Murni',
      tahun,
      judul: 'Renja Murni Dinas Pendidikan T.A. 2026',
      subJudul: 'Rencana Kerja Dinas Pendidikan Kabupaten Cirebon',
      status: 'Perlu Revisi',
      catatanRevisi: 'Mohon lengkapi matriks program prioritas pada Bab 3.',
      cara: 'template',
      opdId: 'disdik',
      opdName: 'Dinas Pendidikan',
      createdById: superAdmin.id,
      createdAt: new Date(now.getTime() - 4 * dayMs),
      updatedAt: date5
    }
  });
  await prisma.verification.deleteMany({ where: { documentId: doc5Id } });
  await prisma.documentStatusLog.deleteMany({ where: { documentId: doc5Id } });
  await prisma.$executeRaw`INSERT INTO verifications (id, document_id, verifier_id, status, catatan_revisi, tte_number, verifikasi_tahap, created_at) VALUES (${randomUUID()}, ${doc5Id}, ${bambang?.id || superAdmin.id}, 'Perlu Revisi', 'Mohon lengkapi matriks program prioritas pada Bab 3.', NULL, 1, ${date5})`;
  await prisma.$executeRaw`INSERT INTO document_status_logs (id, document_id, dari, ke, oleh, alasan, perubahan, waktu) VALUES (${randomUUID()}, ${doc5Id}, 'Menunggu Verifikasi', 'Perlu Revisi', ${bambang?.nama || 'Verifikator Disdik'}, 'Mohon lengkapi matriks program prioritas pada Bab 3.', NULL, ${date5})`;

  // 6. Dokumen Final
  const doc6Id = 'dummy-final-disnakertrans';
  const date6 = new Date(now.getTime() - 3 * dayMs);
  await prisma.document.upsert({
    where: { id: doc6Id },
    update: {
      status: 'Final',
      finalizedAt: date6,
      finalizedBy: superAdmin.id,
      updatedAt: date6,
      tteNumber: `050/BA-FINAL-NAKER/${tahun}`
    },
    create: {
      id: doc6Id,
      kodeDoc: 'RNJ-2026-NKR1',
      jenis: 'Renja Murni',
      tahun,
      judul: 'Renja Murni Dinas Ketenagakerjaan T.A. 2026',
      subJudul: 'Rencana Kerja Dinas Ketenagakerjaan Kabupaten Cirebon',
      status: 'Final',
      finalizedAt: date6,
      finalizedBy: superAdmin.id,
      cara: 'template',
      opdId: 'disnakertrans',
      opdName: 'Dinas Ketenagakerjaan',
      tteNumber: `050/BA-FINAL-NAKER/${tahun}`,
      createdById: superAdmin.id,
      createdAt: new Date(now.getTime() - 10 * dayMs),
      updatedAt: date6
    }
  });
  await prisma.verification.deleteMany({ where: { documentId: doc6Id } });
  await prisma.documentStatusLog.deleteMany({ where: { documentId: doc6Id } });
  await prisma.$executeRaw`INSERT INTO verifications (id, document_id, verifier_id, status, catatan_revisi, tte_number, verifikasi_tahap, created_at) VALUES (${randomUUID()}, ${doc6Id}, ${superAdmin.id}, 'Disetujui Bapperida', NULL, ${'050/BA-FINAL-NAKER/' + tahun}, 1, ${new Date(date6.getTime() - 2 * dayMs)})`;
  await prisma.$executeRaw`INSERT INTO verifications (id, document_id, verifier_id, status, catatan_revisi, tte_number, verifikasi_tahap, created_at) VALUES (${randomUUID()}, ${doc6Id}, ${superAdmin.id}, 'Final', NULL, ${'050/BA-FINAL-NAKER/' + tahun}, 2, ${date6})`;
  await prisma.$executeRaw`INSERT INTO document_status_logs (id, document_id, dari, ke, oleh, alasan, perubahan, waktu) VALUES (${randomUUID()}, ${doc6Id}, 'Disetujui Bapperida', 'Final', ${superAdmin.nama}, 'Verifikasi Final disetujui', NULL, ${date6})`;

  console.log('✓ Data contoh 6 dokumen selesai disiapkan:');
  console.log('  1. Menunggu Verifikasi 1 (Dinkes) - Normal');
  console.log('  2. Menunggu Verifikasi 1 (DPUPR) - Lewat 5 hari');
  console.log('  3. Disetujui Bapperida / Menunggu Final (Dinkes) - Normal');
  console.log('  4. Disetujui Bapperida / Menunggu Final (DPUPR) - Lewat 4 hari & Ada Koreksi');
  console.log('  5. Perlu Revisi (Disdik)');
  console.log('  6. Final (Disnakertrans)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
