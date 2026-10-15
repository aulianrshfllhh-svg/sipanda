import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewFinalArchive, finalArchiveListWhere } from '../archive-access.js';

const superAdmin = { id: 'root', role: 'admin', roleKodes: ['super_admin'] };
const doc = (fields = {}) => ({
  id: 'doc-1',
  status: 'Final',
  isLampiranOtomatis: false,
  jenis: 'Renja Murni',
  opdId: 'opd-a',
  tahun: '2027',
  ...fields
});

test('only Final documents can enter archive exports, including for Super Admin', async () => {
  assert.equal(await canViewFinalArchive(superAdmin, doc({ status: 'Disetujui Bapperida' }), {}), false);
  assert.equal(await canViewFinalArchive(superAdmin, doc(), {}), true);
});

test('OPD archive access is restricted to its own supported document types', async () => {
  const user = { id: 'opd-user', role: 'opd', opdId: 'opd-a' };
  assert.equal(await canViewFinalArchive(user, doc(), {}), true);
  assert.equal(await canViewFinalArchive(user, doc({ opdId: 'opd-b' }), {}), false);
  assert.equal(await canViewFinalArchive(user, doc({ jenis: 'RKPD Murni' }), {}), false);
});

test('verifiers can read internal Bapperida finals and documents from exact assigned years', async () => {
  const user = { id: 'verifier', role: 'staf' };
  const prisma = {
    document: { findUnique: async () => null },
    penugasanVerifikasi: {
      findUnique: async ({ where }) => where.userId_opdId_tahun.tahun === '2027' ? { id: 'assignment' } : null
    },
    penugasanBabRkpd: { findFirst: async () => null }
  };
  assert.equal(await canViewFinalArchive(user, doc({ opdId: 'bapperida' }), prisma), true);
  assert.equal(await canViewFinalArchive(user, doc(), prisma), true);
  assert.equal(await canViewFinalArchive(user, doc({ tahun: '2026' }), prisma), false);
});

test('verifier annex access inherits the Final parent and assigned scope', async () => {
  const user = { id: 'verifier', role: 'staf' };
  const parent = doc({ id: 'parent', opdId: 'opd-a', tahun: '2027' });
  const prisma = {
    document: { findUnique: async () => parent },
    penugasanVerifikasi: { findUnique: async () => ({ id: 'assignment' }) },
    penugasanBabRkpd: { findFirst: async () => null }
  };
  const annex = doc({ id: 'annex', isLampiranOtomatis: true, parentId: 'parent' });
  assert.equal(await canViewFinalArchive(user, annex, prisma), true);
  assert.equal(await canViewFinalArchive(user, annex, { ...prisma, document: { findUnique: async () => ({ ...parent, status: 'Draft' }) } }), false);
});

test('archive listing query is Final-only and scoped to the active role', async () => {
  const isSuperAdmin = user => user.roleKodes?.includes('super_admin') === true;
  const prisma = {
    penugasanVerifikasi: {
      findMany: async () => [{ opdId: 'dinkes', tahun: '2025' }]
    },
    penugasanBabRkpd: {
      findMany: async () => [{ documentId: 'assigned-rkpd' }]
    }
  };

  assert.deepEqual(await finalArchiveListWhere(
    { role: 'opd', opdId: 'dinkes' }, prisma, isSuperAdmin
  ), {
    status: 'Final',
    parentId: null,
    isLampiranOtomatis: false,
    opdId: 'dinkes',
    jenis: { in: ['Renja Murni', 'Renja Perubahan', 'Renstra', 'Renstra Murni', 'Renstra Perubahan'] }
  });

  assert.deepEqual(await finalArchiveListWhere(
    { role: 'staf', id: 'verifier' }, prisma, isSuperAdmin
  ), {
    status: 'Final',
    parentId: null,
    isLampiranOtomatis: false,
    OR: [
      { opdId: 'bapperida' },
      {
        opdId: 'dinkes',
        tahun: '2025',
        jenis: { notIn: ['RKPD', 'RKPD Murni', 'RKPD Perubahan', 'Evaluasi RKPD Triwulan'] }
      },
      { id: { in: ['assigned-rkpd'] } }
    ]
  });

  assert.deepEqual(await finalArchiveListWhere(superAdmin, prisma, isSuperAdmin), {
    status: 'Final',
    parentId: null,
    isLampiranOtomatis: false
  });
});
