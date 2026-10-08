import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { buildPlanningCompliance, registerPlanningComplianceRoute } from '../planning-compliance.js';

function document(id, opdId, jenis, tahun, status = 'Disetujui', extra = {}) {
  return {
    id, opdId, jenis, tahun, status, updatedAt: new Date('2026-10-01'),
    regulation: null, ...extra
  };
}

test('compliance counts the two annual Renja plans and their approved generated annexes', () => {
  const opds = [
    { id: 'opd-1', kode: 'OPD-01', nama: 'Dinas A', kategori: 'Dinas' },
    { id: 'opd-2', kode: 'OPD-02', nama: 'Dinas B', kategori: 'Dinas' }
  ];
  const parents = [
    document('murni-1', 'opd-1', 'Renja Murni', '2027'),
    document('perubahan-1', 'opd-1', 'Renja Perubahan', '2026'),
    document('renstra-1', 'opd-1', 'Renstra', '2025', 'Disetujui', { regulation: { periodeMulai: '2025', periodeAkhir: '2029' } }),
    document('murni-2', 'opd-2', 'Renja Murni', '2027'),
    document('perubahan-2', 'opd-2', 'Renja Perubahan', '2026', 'Perlu Revisi'),
    document('renstra-2', 'opd-2', 'Renstra Murni', '2025', 'Menunggu Verifikasi', { regulation: { periodeMulai: '2025', periodeAkhir: '2029' } }),
    document('wrong-year', 'opd-1', 'Renja Murni', '2026'),
    document('rkpd', 'opd-1', 'RKPD Murni', '2026')
  ];
  const annexes = [
    { id: 'annex-murni-1', parentId: 'murni-1', jenis: 'Lampiran Perbup Renja', status: 'Disetujui', isLampiranOtomatis: true },
    { id: 'annex-change-1', parentId: 'perubahan-1', jenis: 'Lampiran Kepbup Perubahan Renja', status: 'Disetujui', isLampiranOtomatis: true },
    { id: 'annex-renstra-1', parentId: 'renstra-1', jenis: 'Lampiran Perbup Renstra', status: 'Disetujui', isLampiranOtomatis: true },
    { id: 'annex-murni-2', parentId: 'murni-2', jenis: 'Lampiran Perbup Renja', status: 'Disetujui', isLampiranOtomatis: true },
    { id: 'annex-change-2', parentId: 'perubahan-2', jenis: 'Lampiran Kepbup Perubahan Renja', status: 'Disetujui', isLampiranOtomatis: true },
    { id: 'annex-renstra-2', parentId: 'renstra-2', jenis: 'Lampiran Perbup Renstra', status: 'Disetujui', isLampiranOtomatis: true }
  ];

  const report = buildPlanningCompliance(opds, parents, annexes, '2026');
  assert.equal(report.totalOpd, 2);
  assert.equal(report.completedOpd, 1);
  assert.equal(report.approvedDocuments, 6);
  assert.equal(report.totalDocuments, 8);
  assert.equal(report.opds[0].ratio, '4/4');
  assert.equal(report.opds[0].isComplete, true);
  assert.equal(report.opds[1].ratio, '2/4');
  assert.equal(report.opds[1].items.find(item => item.key === 'renjaPerubahan').status, 'Perlu Revisi');
  assert.equal(report.opds[1].optionalItems.find(item => item.key === 'renstra').status, 'Menunggu Verifikasi');
});

test('created documents are distinct from approved documents and duplicate drafts do not increase four required slots', () => {
  const opds=[{id:'health',nama:'Dinas Kesehatan'}];
  const parents=[
    document('draft-new','health','Renja Murni','2027','Draft',{updatedAt:new Date('2026-10-03')}),
    document('draft-old','health','Renja Murni','2027','Draft'),
    document('wrong-year','health','Renja Perubahan','2025','Draft')
  ];
  const annexes=[{id:'annex',parentId:'draft-new',jenis:'Lampiran Perbup Renja',status:'Draft',isLampiranOtomatis:true}];
  const report=buildPlanningCompliance(opds,parents,annexes,'2026');
  assert.equal(report.opds[0].createdCount,2);
  assert.equal(report.opds[0].createdRatio,'2/4');
  assert.equal(report.opds[0].ratio,'0/4');
  assert.equal(report.completedOpd,0);
});

test('annual submitted ratio includes Renja annexes while Renstra remains on its five-year cycle',()=>{
 const opds=[{id:'health',nama:'Dinas Kesehatan'}];
 const parents=[
  document('murni','health','Renja Murni','2027','Menunggu Verifikasi'),
  document('optional','health','Renstra Perubahan','2026','Disetujui')
 ];
 const annexes=[{id:'annex',parentId:'murni',jenis:'Lampiran Perbup Renja',status:'Menunggu Verifikasi',isLampiranOtomatis:true}];
 const report=buildPlanningCompliance(opds,parents,annexes,'2026');
 assert.equal(report.totalDocuments,4);
 assert.equal(report.submittedDocuments,2);
 assert.equal(report.optionalSubmittedDocuments,1);
 assert.equal(report.opds[0].items.some(item=>item.key==='renstra'),false);
 assert.equal(report.opds[0].isComplete,false);
 parents[0].status='Draft';
 assert.equal(buildPlanningCompliance(opds,parents,annexes,'2026').submittedDocuments,0);
 const empty=buildPlanningCompliance(Array.from({length:71},(_,i)=>({id:String(i)})),[],[],'2026');
 assert.equal(empty.totalDocuments,284);
});

async function withServer(prisma, run) {
  const app = express();
  app.use((req, _res, next) => {
    const role = req.headers['x-role'] || 'opd';
    req.currentUser = { id: 'user-1', role, roleKodes: role === 'admin' ? ['super_admin'] : [] };
    next();
  });
  registerPlanningComplianceRoute(app, prisma, (_req, _res, next) => next(), user => user.roleKodes.includes('super_admin'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('monitoring API uses selected target year, excludes RKPD/RPJMD, and exposes completion totals', async () => {
  const opd = { id: 'opd-1', kode: 'OPD-01', nama: 'Dinas A', kategori: 'Dinas' };
  const parents = [
    document('murni', 'opd-1', 'Renja Murni', '2027'),
    document('change', 'opd-1', 'Renja Perubahan', '2026'),
    document('renstra', 'opd-1', 'Renstra', '2025', 'Disetujui', { regulation: { periodeMulai: '2025', periodeAkhir: '2029' } })
  ];
  const annexes = [
    { id: 'annex-murni', parentId: 'murni', jenis: 'Lampiran Perbup Renja', status: 'Disetujui', isLampiranOtomatis: true },
    { id: 'annex-change', parentId: 'change', jenis: 'Lampiran Kepbup Perubahan Renja', status: 'Disetujui', isLampiranOtomatis: true },
    { id: 'annex-renstra', parentId: 'renstra', jenis: 'Lampiran Perbup Renstra', status: 'Disetujui', isLampiranOtomatis: true }
  ];
  let parentQuery;
  const prisma = {
    opd: { findMany: async () => [opd] },
    document: { findMany: async ({ where }) => {
      if (where.parentId === null) {
        parentQuery = where;
        return parents;
      }
      return annexes;
    } }
  };

  await withServer(prisma, async url => {
    const response = await fetch(`${url}/api/stats/monitoring?tahun=2026`, { headers: { 'x-role': 'admin' } });
    assert.equal(response.status, 200);
    const report = await response.json();
    assert.equal(report.tahun, '2026');
    assert.equal(report.completedOpd, 1);
    assert.equal(report.opds[0].ratio, '4/4');
    assert.deepEqual(parentQuery.OR, [
      { jenis: 'Renja Murni', tahun: '2027' },
      { jenis: 'Renja Perubahan', tahun: '2026' },
      { jenis: { in: ['Renstra', 'Renstra Murni', 'Renstra Perubahan'] }, tahun: { lte: '2026' } }
    ]);

    const invalidYear = await fetch(`${url}/api/stats/monitoring?tahun=26`, { headers: { 'x-role': 'admin' } });
    assert.equal(invalidYear.status, 400);

    const forbidden = await fetch(`${url}/api/stats/monitoring?tahun=2026`, { headers: { 'x-role': 'opd' } });
    assert.equal(forbidden.status, 403);
  });
});
