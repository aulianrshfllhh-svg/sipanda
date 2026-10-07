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
