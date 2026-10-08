import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { loadTestEnvironment, validateTestDatabaseUrl } from './test-database.js';

const testEnvironment = loadTestEnvironment();
if (!validateTestDatabaseUrl(testEnvironment.DATABASE_URL)) {
  throw new Error('Seed dibatalkan karena target bukan database test yang diizinkan.');
}
process.env.DATABASE_URL = testEnvironment.DATABASE_URL;

const prisma = new PrismaClient();
const testPassword = 'sipanda-test-password';

try {
  const roles = [
    { id: 'role-test-opd', kode: 'opd', label: 'Perangkat Daerah (test)' },
    { id: 'role-test-staff', kode: 'staf_bapperida', label: 'Staf Bapperida (test)' },
    { id: 'role-test-admin', kode: 'super_admin', label: 'Super Admin (test)' }
  ];
  await prisma.role.createMany({ data: roles });
  await prisma.opd.create({
    data: {
      id: 'opd-test',
      kode: 'TEST',
      nama: 'Perangkat Daerah Uji',
      singkatan: 'OPD UJI',
      nomorUrut: 1,
      nomorLampiran: '1'
    }
  });

  const password = await bcrypt.hash(testPassword, 4);
  const users = [
    { id: 'user-test-opd', username: 'test-opd', nama: 'Pengguna OPD Uji', opdId: 'opd-test', roleIds: ['role-test-opd'] },
    { id: 'user-test-staff', username: 'test-staff', nama: 'Verifikator Uji', opdId: null, roleIds: ['role-test-staff'] },
    { id: 'user-test-admin', username: 'test-admin', nama: 'Admin Uji', opdId: null, roleIds: ['role-test-admin'] },
    { id: 'user-test-dual', username: 'test-dual', nama: 'Pengguna Peran Ganda Uji', opdId: 'opd-test', roleIds: ['role-test-opd', 'role-test-staff'] },
    { id: 'user-test-inactive', username: 'test-inactive', nama: 'Akun Nonaktif Uji', opdId: 'opd-test', roleIds: ['role-test-opd'], isActive: false }
  ];

  for (const user of users) {
    const { roleIds, ...data } = user;
    await prisma.user.create({ data: { ...data, password, nip: null } });
    await prisma.userRole.createMany({
      data: roleIds.map(roleId => ({ userId: user.id, roleId }))
    });
  }

  await prisma.document.create({
    data: {
      id: 'document-test',
      kodeDoc: 'TEST-2027-001',
      jenis: 'Renja Murni',
      tahun: '2027',
      judul: 'Dokumen Uji SIPANDA',
      opdId: 'opd-test',
      opdName: 'Perangkat Daerah Uji',
      createdById: 'user-test-opd',
      sections: {
        create: [{
          id: 'section-test',
          babId: 'bab-1',
          babTitle: 'BAB I PENDAHULUAN',
          babOrder: 1,
          isLocked: false,
          subsections: [{ id: 'sub-1', code: '1.1', title: 'Latar Belakang', content: '<p>Isi uji.</p>' }]
        }, {
          id: 'section-test-2', babId: 'bab-2', babTitle: 'BAB II GAMBARAN UMUM', babOrder: 2, isLocked: false,
          subsections: [{ id: 'sub-2-1', code: '2.1', title: 'Kondisi Umum', content: '<p>Isi uji bab dua.</p>' }]
        }, {
          id: 'section-test-3', babId: 'bab-3', babTitle: 'BAB III TUJUAN DAN SASARAN', babOrder: 3, isLocked: false,
          subsections: [{ id: 'sub-3-4', code: '3.4', title: 'Kinerja Penyelenggaraan Bidang Urusan', content: '<p>Isi uji bab tiga.</p>' }]
        }]
      }
    }
  });
} catch {
  console.error('Seed data uji gagal; detail konfigurasi database disembunyikan.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
