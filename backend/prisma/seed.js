import { seedPlanning } from '../seed-planning.js';
// prisma/seed.js
// Data awal (seed) untuk SIPANDA – Bapperida Kab. Cirebon
// Jalankan: npx prisma db seed

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedFinalArchiveExamples(prisma, superAdmin) {
  const opdById = new Map(ALL_OPDS.map(opd => [opd[0], opd]));
  const examples = [
    { id: 'archive-example-renja-bapperida-2025', kodeDoc: 'RENJA-BAPPER-2025-001', nomerRegistrasiArsip: 'ARS-2025-050-BAPP', jenis: 'Renja Murni', tahun: '2025', judul: 'Renja Definitif Bapperida Tahun 2025', opdId: 'bapperida', ba: 'BA.050/144/BAPP/2025' },
    { id: 'archive-example-rkpd-2025', kodeDoc: 'RKPD-BAPPER-2025-001', nomerRegistrasiArsip: 'ARS-2025-051-BAPP', jenis: 'RKPD Murni', tahun: '2025', judul: 'RKPD Murni Kabupaten Cirebon Tahun 2025', opdId: 'bapperida' },
    { id: 'archive-example-rpjmd-2025', kodeDoc: 'RPJMD-BAPPER-2025-001', nomerRegistrasiArsip: 'ARS-2025-052-BAPP', jenis: 'RPJMD', tahun: '2025', judul: 'RPJMD Kabupaten Cirebon Tahun 2025–2029', opdId: 'bapperida', ba: 'BA.050/146/BAPP/2025' },
    { id: 'archive-example-renja-dinkes-2027', kodeDoc: 'RENJA-DINKES-2027-001', nomerRegistrasiArsip: 'ARS-2027-001-DINKES', jenis: 'Renja Murni', tahun: '2027', judul: 'Renja Dinas Kesehatan Tahun 2027', opdId: 'dinkes' },
    { id: 'archive-example-renja-bkad-2027', kodeDoc: 'RENJA-BKAD-2027-001', nomerRegistrasiArsip: 'ARS-2027-001-BKAD', jenis: 'Renja Murni', tahun: '2027', judul: 'Renja Badan Keuangan dan Aset Daerah Tahun 2027', opdId: 'bkad', ba: 'BA.050/017/BKAD/2027' },
    { id: 'archive-example-renstra-dinkes-2025', kodeDoc: 'RENSTRA-DINKES-2025-001', nomerRegistrasiArsip: 'ARS-2025-001-DINKES', jenis: 'Renstra Murni', tahun: '2025', judul: 'Renstra Dinas Kesehatan Tahun 2025–2029', opdId: 'dinkes' }
  ];

  for (const [index, sample] of examples.entries()) {
    const opd = opdById.get(sample.opdId);
    const finalizedAt = new Date(Date.UTC(Number(sample.tahun), 11, 15 + index));
    const document = await prisma.document.create({
      data: {
        id: sample.id,
        kodeDoc: sample.kodeDoc,
        nomerRegistrasiArsip: sample.nomerRegistrasiArsip,
        jenis: sample.jenis,
        tahun: sample.tahun,
        judul: sample.judul,
        cara: 'template',
        status: 'Final',
        finalizedAt,
        finalizedBy: superAdmin.id,
        tteNumber: sample.ba || null,
        regulation: sample.ba ? { nomorBerita: sample.ba } : undefined,
        templateSnapshot: { nama: 'Template Permendagri 86/2017', versi: '1' },
        opdId: sample.opdId,
        opdName: opd[1],
        createdById: superAdmin.id,
        verifierName: superAdmin.nama,
        verifierJabatan: superAdmin.jabatan,
        sections: {
          create: [{
            babId: 'bab-1',
            babTitle: 'BAB I PENDAHULUAN',
            babOrder: 1,
            isLocked: true,
            subsections: [{
              id: 'sub-1-1',
              code: '1.1',
              title: 'Latar Belakang',
              content: `<p>Contoh arsip final ${sample.judul} untuk demonstrasi halaman Arsip Dokumen.</p>`
            }]
          }]
        },
        statusLogs: {
          create: {
            dari: 'Disetujui Bapperida',
            ke: 'Final',
            oleh: superAdmin.id,
            alasan: 'Contoh data Arsip Final untuk pengujian tampilan.'
          }
        }
      },
      include: { sections: true, attachments: true }
    });
    const snapshot = JSON.parse(JSON.stringify({
      capturedAt: finalizedAt.toISOString(),
      document: { ...document, status: 'Final', finalizedAt, finalizedBy: superAdmin.id }
    }));
    await prisma.document.update({
      where: { id: document.id },
      data: { finalSnapshot: snapshot }
    });
  }
  console.log(`  ✓ ${examples.length} contoh dokumen Arsip Final dibuat`);
}

// ─── Helper: nomor romawi ────────────────────────────────────────────────────
function roman(n) {
  let r = '';
  for (const [v, s] of [[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]) {
    while (n >= v) { r += s; n -= v; }
  }
  return r;
}

// ─── Daftar resmi OPD ───────────────────────────────────────────────────────
const perangkatDaerah = [
  ['setda',        'Sekretariat Daerah',                                                    'Setda'],
  ['setwan',       'Sekretariat Dewan Perwakilan Rakyat Daerah',                            'Setwan'],
  ['inspektorat',  'Inspektorat',                                                           'Inspektorat'],
  ['disdik',       'Dinas Pendidikan',                                                      'Disdik'],
  ['dinkes',       'Dinas Kesehatan',                                                       'Dinkes'],
  ['dpupr',        'Dinas Pekerjaan Umum dan Tata Ruang',                                   'DPUPR'],
  ['dpkpp',        'Dinas Perumahan, Kawasan Permukiman dan Pertanahan',                    'DPKPP'],
  ['damkar',       'Dinas Pemadam Kebakaran dan Penyelamatan',                              'Damkar'],
  ['satpolpp',     'Satuan Polisi Pamong Praja',                                            'Satpol PP'],
  ['dinsos',       'Dinas Sosial',                                                          'Dinsos'],
  ['disnakertrans','Dinas Ketenagakerjaan',                                                 'Disnaker'],
  ['dppkbp3a',     'Dinas Pengendalian Penduduk, Keluarga Berencana, Pemberdayaan Perempuan dan Perlindungan Anak', 'DPPKBP3A'],
  ['dlh',          'Dinas Lingkungan Hidup',                                                'DLH'],
  ['disdukcapil',  'Dinas Kependudukan dan Pencatatan Sipil',                               'Disdukcapil'],
  ['dishub',       'Dinas Perhubungan',                                                     'Dishub'],
  ['diskominfo',   'Dinas Komunikasi dan Informatika',                                      'Diskominfo'],
  ['disbudpar',    'Dinas Kebudayaan dan Pariwisata',                                       'Disbudpar'],
  ['dispora',      'Dinas Pemuda dan Olahraga',                                             'Dispora'],
  ['distan',       'Dinas Pertanian',                                                       'Distan'],
  ['dkpp',         'Dinas Ketahanan Pangan dan Perikanan',                                  'DKPP'],
  ['disdagin',     'Dinas Perdagangan dan Perindustrian',                                   'Disdagin'],
  ['diskopukm',    'Dinas Koperasi dan Usaha Kecil dan Menengah',                           'Diskop UKM'],
  ['disarpus',     'Dinas Kearsipan dan Perpustakaan',                                      'Disarpus'],
  ['dpmptsp',      'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu',                'DPMPTSP'],
  ['dpmd',         'Dinas Pemberdayaan Masyarakat dan Desa',                                'DPMD'],
  ['bkpsdm',       'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia',                'BKPSDM'],
  ['bapperida',    'Badan Perencanaan Pembangunan, Riset, dan Inovasi Daerah',     'Bapperida'],
  ['bkad',         'Badan Keuangan dan Aset Daerah',                                        'BKAD'],
  ['bapenda',      'Badan Pendapatan Daerah',                                               'Bapenda'],
  ['kesbangpol',   'Badan Kesatuan Bangsa dan Politik',                                     'Kesbangpol'],
  ['bpbd',         'Badan Penanggulangan Bencana Daerah',                                   'BPBD'],
];

const kecamatan = [
  'Arjawinangun','Astanajapura','Babakan','Beber','Ciledug',
  'Ciwaringin','Depok','Dukupuntang','Gebang','Gegesik',
  'Gempol','Greged','Gunungjati','Jamblang','Kaliwedi',
  'Kapetakan','Karangsembung','Karangwareng','Kedawung','Klangenan',
  'Lemahabang','Losari','Mundu','Pabedilan','Pabuaran',
  'Palimanan','Pangenan','Panguragan','Pasaleman','Plered',
  'Plumbon','Sedong','Sumber','Suranenggala','Susukan',
  'Susukanlebak','Talun','Tengahtani','Waled','Weru',
];

const ALL_OPDS = [
  ...perangkatDaerah,
  ...kecamatan.map(nama => [`kec-${nama.toLowerCase()}`, `Kecamatan ${nama}`, `Kec. ${nama}`]),
].map(([id, nama, singkatan], i) => ({
  id,
  kode: `OPD-${String(i + 1).padStart(2, '0')}`,
  nama,
  singkatan,
  kategori: nama.split(' ')[0],
  nomorUrut: i + 1,
  nomorLampiran: roman(i + 1),
}));

// ─── Template sections generator ────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding database SIPANDA...');

  // 1. Hapus semua data lama (urutan: child → parent)
  await prisma.activityLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.documentSection.deleteMany();
  await prisma.penugasanBabRkpd.deleteMany();
  await prisma.penugasanLog.deleteMany();
  await prisma.penugasanVerifikasi.deleteMany();
  await prisma.document.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.opd.deleteMany();
  await prisma.template.deleteMany();
  console.log('  ✓ Tabel lama dibersihkan');

  // 2. Roles
  const roles = await Promise.all([
    prisma.role.create({ data: { kode: 'super_admin',     label: 'Super Admin (PPEPD)',     deskripsi: 'Akses penuh — Bidang PPEPD Bapperida' } }),
    prisma.role.create({ data: { kode: 'staf_bapperida',  label: 'Staf Bapperida',          deskripsi: 'Staf internal Bapperida dengan penugasan OPD tertentu' } }),
    prisma.role.create({ data: { kode: 'penyusun_rkpd',   label: 'Penyusun RKPD',           deskripsi: 'Penyusun berkas Evaluasi RKPD Triwulan' } }),
    prisma.role.create({ data: { kode: 'opd',             label: 'Perangkat Daerah (OPD)',  deskripsi: 'Operator OPD — hanya akses dokumen milik OPD-nya' } }),
  ]);
  const roleMap = Object.fromEntries(roles.map(r => [r.kode, r]));
  console.log('  ✓ Roles dibuat');

  // 3. OPD
  for (const opd of ALL_OPDS) {
    await prisma.opd.upsert({ where: { id: opd.id }, update: opd, create: opd });
  }
  console.log(`  ✓ ${ALL_OPDS.length} OPD dibuat`);

  // 4. Hash password standar
  const hashAdmin  = await bcrypt.hash('admin123',  10);
  const hashStaf   = await bcrypt.hash('staf123',   10);
  const hashOpd    = await bcrypt.hash('opd123',    10);

  // 5. Super Admin (Bidang PPEPD)
  const superAdmin = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashAdmin,
      nama:     'Bapperida Kabupaten Cirebon',
      nip:      '196801011990031001',
      jabatan:  'Kepala Bidang PPEPD Bapperida Kab. Cirebon',
      singkatan:'Bapperida',
      opdId:    'bapperida',
      avatar:   'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120&auto=format&fit=crop&q=80',
      roles: { create: { roleId: roleMap['super_admin'].id } },
    }
  });

  // 6. Staf Bapperida (contoh beberapa pegawai)
  const stafData = [
    { username: 'agus.bapperida',   nama: 'Agus Salim, S.STP',         nip: '199001012015031002', jabatan: 'Analis Kebijakan Muda – Bidang PPEPD' },
    { username: 'bambang.bapperida',nama: 'Bambang Irawan, M.Si',      nip: '198503152010011005', jabatan: 'Perencana Ahli Madya – Bidang Sosial Budaya' },
    { username: 'siti.bapperida',   nama: 'Siti Rohayati, S.AP',       nip: '199205102016042003', jabatan: 'Analis Kebijakan Pertama – Bidang Infrastruktur' },
    { username: 'dedi.bapperida',   nama: 'Dedi Sukmana, S.T., M.T.', nip: '198711212012011004', jabatan: 'Perencana Ahli Muda – Bidang Ekonomi' },
  ];

  const stafUsers = [];
  for (const s of stafData) {
    const u = await prisma.user.create({
      data: {
        ...s,
        password: hashStaf,
        singkatan: 'Bapperida',
        opdId: 'bapperida',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        roles: { create: { roleId: roleMap['staf_bapperida'].id } },
      }
    });
    stafUsers.push(u);
  }
  console.log('  ✓ Super admin + 4 staf Bapperida dibuat');

  // 7. Penugasan verifikasi staf ke OPD (per T.A. 2025)
  const penugasan = [
    // Agus → Dinkes, Dinsos
    { userId: stafUsers[0].id, opdId: 'dinkes',  keterangan: 'Desk Wilayah I – Kesehatan' },
    { userId: stafUsers[0].id, opdId: 'dinsos',  keterangan: 'Desk Wilayah I – Sosial' },
    // Bambang → Disdik, Dispora, Disbudpar
    { userId: stafUsers[1].id, opdId: 'disdik',  keterangan: 'Desk Sosial Budaya – Pendidikan' },
    { userId: stafUsers[1].id, opdId: 'dispora', keterangan: 'Desk Sosial Budaya – Pemuda' },
    { userId: stafUsers[1].id, opdId: 'disbudpar',keterangan: 'Desk Sosial Budaya – Budpar' },
    // Siti → DPUPR, DPKPP, Damkar
    { userId: stafUsers[2].id, opdId: 'dpupr',   keterangan: 'Desk Infrastruktur – PUPR' },
    { userId: stafUsers[2].id, opdId: 'dpkpp',   keterangan: 'Desk Infrastruktur – Perkim' },
    { userId: stafUsers[2].id, opdId: 'damkar',  keterangan: 'Desk Infrastruktur – Damkar' },
    // Dedi → Disnakertrans, Disdagin, Diskopukm
    { userId: stafUsers[3].id, opdId: 'disnakertrans', keterangan: 'Desk Ekonomi – Ketenagakerjaan' },
    { userId: stafUsers[3].id, opdId: 'disdagin',       keterangan: 'Desk Ekonomi – Perdagangan' },
    { userId: stafUsers[3].id, opdId: 'diskopukm',      keterangan: 'Desk Ekonomi – Koperasi UKM' },
  ];

  for (const p of penugasan) {
    await prisma.penugasanVerifikasi.create({
      data: { ...p, tahun: '2025', createdBy: superAdmin.id }
    });
  }
  console.log('  ✓ Penugasan verifikasi staf dibuat');

  // 8. Akun OPD (beberapa OPD yang memiliki dokumen)
  const opdAkunData = [
    { username: 'opd.dinkes',       opdId: 'dinkes',       nama: 'Dinas Kesehatan Kab. Cirebon' },
    { username: 'opd.dpupr',        opdId: 'dpupr',        nama: 'Dinas Pekerjaan Umum dan Tata Ruang' },
    { username: 'opd.disdik',       opdId: 'disdik',       nama: 'Dinas Pendidikan Kab. Cirebon' },
    { username: 'opd.dlh',          opdId: 'dlh',          nama: 'Dinas Lingkungan Hidup Kab. Cirebon' },
    { username: 'opd.disnakertrans',opdId: 'disnakertrans',nama: 'Dinas Ketenagakerjaan Kab. Cirebon' },
  ];

  const opdUsers = {};
  for (const o of opdAkunData) {
    const u = await prisma.user.create({
      data: {
        username: o.username,
        password: hashOpd,
        nama:     o.nama,
        jabatan:  'Operator Perangkat Daerah',
        opdId:    o.opdId,
        avatar:   'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=120&auto=format&fit=crop&q=80',
        roles: { create: { roleId: roleMap['opd'].id } },
      }
    });
    opdUsers[o.opdId] = u;
  }
  console.log('  ✓ Akun OPD dibuat');

  await seedPlanning(prisma);
  await seedFinalArchiveExamples(prisma, superAdmin);
  console.log('\n✅ Seeding selesai!');
  console.log('\n📋 Akun demo:');
  console.log('  Super Admin : username=admin            | password=admin123');
  console.log('  Staf Agus   : username=agus.bapperida   | password=staf123 (pegang: Dinkes, Dinsos)');
  console.log('  Staf Bambang: username=bambang.bapperida| password=staf123 (pegang: Disdik, Dispora, Disbudpar)');
  console.log('  Staf Siti   : username=siti.bapperida   | password=staf123 (pegang: DPUPR, DPKPP, Damkar)');
  console.log('  Staf Dedi   : username=dedi.bapperida   | password=staf123 (pegang: Disnaker, Disdagin, Diskop)');
  console.log('  OPD Dinkes  : username=opd.dinkes        | password=opd123');
  console.log('  OPD DPUPR   : username=opd.dpupr         | password=opd123');
  console.log('  OPD Disdik  : username=opd.disdik        | password=opd123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
