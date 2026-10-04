import { seedPlanning } from '../seed-planning.js';
// prisma/seed.js
// Data awal (seed) untuk SIPANDA – Bapperida Kab. Cirebon
// Jalankan: npx prisma db seed

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
  ['bapperida',    'Badan Perencanaan Pembangunan, Penelitian dan Pengembangan Daerah',     'Bapperida'],
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
function generateSections(docType = 'Renja Murni', opdName = 'Dinas Kesehatan', tahun = '2025') {
  const isRkpd = docType.includes('RKPD');
  return [
    {
      babId: 'bab-1',
      babTitle: 'BAB I PENDAHULUAN',
      babOrder: 1,
      isLocked: true,
      subsections: [
        { id: 'sub-1-1', code: '1.1', title: 'Latar Belakang', locked: true,
          content: `<p>Rencana Kerja (Renja) ${opdName} Tahun Anggaran ${tahun} disusun sebagai dokumen perencanaan tahunan yang memuat program, kegiatan, sub kegiatan, indikator kinerja, target capaian, serta pagu indikatif pendanaan.</p>` },
        { id: 'sub-1-2', code: '1.2', title: 'Landasan Hukum', locked: true,
          content: `<p>Landasan hukum penyusunan Renja ${opdName} Tahun Anggaran ${tahun} di antaranya:<br/>1. UU No. 25 Tahun 2004 tentang Sistem Perencanaan Pembangunan Nasional;<br/>2. UU No. 23 Tahun 2014 tentang Pemerintahan Daerah;<br/>3. Permendagri No. 86 Tahun 2017.</p>` },
        { id: 'sub-1-3', code: '1.3', title: 'Maksud dan Tujuan', locked: true,
          content: `<p>Maksud penyusunan adalah menyediakan pedoman resmi perencanaan teknis dan penganggaran tahunan bagi ${opdName}.</p>` },
        { id: 'sub-1-4', code: '1.4', title: 'Sistematika Penulisan', locked: true,
          content: `<p>Dokumen ini disusun sesuai format baku Permendagri No. 86 Tahun 2017 dengan lima bab utama.</p>` },
      ]
    },
    {
      babId: 'bab-2',
      babTitle: 'BAB II EVALUASI PELAKSANAAN RENJA TAHUN LALU',
      babOrder: 2,
      isLocked: true,
      subsections: [
        { id: 'sub-2-1', code: '2.1', title: 'Evaluasi Pelaksanaan Renja Tahun Lalu', locked: true,
          content: '<p>Evaluasi terhadap capaian pelaksanaan program dan kegiatan tahun sebelumnya menunjukkan tingkat efektivitas yang memadai.</p>' },
        { id: 'sub-2-2', code: '2.2', title: 'Analisis Kinerja Pelayanan Perangkat Daerah', locked: true,
          content: '<p>Capaian indikator kinerja pelayanan perangkat daerah berdasarkan target dan realisasi berjalan optimal.</p>' },
        { id: 'sub-2-3', code: '2.3', title: 'Isu-Isu Penting Penyelenggaraan Tugas dan Fungsi', locked: true,
          content: '<p>Isu strategis mencakup percepatan transformasi digital dan peningkatan kompetensi aparatur.</p>' },
      ]
    },
    {
      babId: 'bab-3',
      babTitle: 'BAB III TUJUAN, SASARAN, PROGRAM DAN KEGIATAN',
      babOrder: 3,
      isLocked: true,
      subsections: [
        { id: 'sub-3-1', code: '3.1', title: 'Telaah Terhadap Kebijakan Nasional dan RPJMD', locked: true,
          content: '<p>Arah kebijakan pembangunan daerah berfokus pada pemerataan kesejahteraan dan pertumbuhan ekonomi inklusif.</p>' },
        { id: 'sub-3-2', code: '3.2', title: 'Tujuan dan Sasaran Renja', locked: true,
          content: `<p>Tujuan utama Renja Tahun ${tahun} adalah mewujudkan tata kelola yang efektif, transparan, dan berdampak bagi masyarakat.</p>` },
        { id: 'sub-3-3', code: '3.3', title: 'Program dan Kegiatan Prioritas', locked: true,
          content: '<p>Program prioritas difokuskan pada penguatan fungsi pelayanan publik dan pemeliharaan sarana prasarana penunjang.</p>' },
      ]
    },
    {
      babId: 'bab-4',
      babTitle: 'BAB IV RENCANA KERJA DAN PENDANAAN PERANGKAT DAERAH',
      babOrder: 4,
      isLocked: true,
      subsections: [
        { id: 'sub-4-1', code: '4.1', title: 'Program, Kegiatan, Sub Kegiatan, Indikator Kinerja dan Pagu Indikatif', locked: true,
          content: '<p>Rincian rencana program, kegiatan, sub kegiatan, indikator keluaran, target, dan pagu indikatif pendanaan disajikan pada matriks terlampir.</p>' },
      ]
    },
    {
      babId: 'bab-5',
      babTitle: 'BAB V PENUTUP',
      babOrder: 5,
      isLocked: true,
      subsections: [
        { id: 'sub-5-1', code: '5.1', title: 'Kaidah Pelaksanaan', locked: true,
          content: `<p>Renja ${opdName} Tahun Anggaran ${tahun} menjadi acuan mengikat bagi seluruh unit kerja.</p>` },
        { id: 'sub-5-2', code: '5.2', title: 'Rencana Tindak Lanjut', locked: true,
          content: '<p>Pengendalian dan evaluasi dilakukan secara berkala tiap triwulan oleh Tim Pengendalian Internal bersama Bapperida.</p>' },
      ]
    },
  ];
}

// ─── Main seed ───────────────────────────────────────────────────────────────
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

  // 9. Dokumen contoh
  const docsData = [
    {
      kodeDoc: 'RNJ-2025-0104',
      nomorSurat: '050/1182/Renja/Dinkes',
      nomerRegistrasiArsip: 'ARS-2025-RNJ-0104',
      jenis: 'Renja Murni', tahun: '2025',
      judul: 'Renja Murni 2025 - Dinas Kesehatan Kab. Cirebon',
      subJudul: 'Dokumen Induk Sub Kegiatan Pelayanan Kesehatan Primer',
      opdId: 'dinkes', opdName: 'Dinas Kesehatan Kab. Cirebon',
      status: 'Perlu Revisi',
      catatanRevisi: 'Pagu Sub Kegiatan Pelayanan Rujukan perlu dirasionalisasi ke pagu indikatif TAPD.',
      verifierName: 'Agus Salim, S.STP', verifierJabatan: 'Analis Kebijakan Muda – Bidang PPEPD',
      createdById: opdUsers['dinkes']?.id,
    },
    {
      kodeDoc: 'RNJ-P-2024-0031',
      nomorSurat: '050/842/P-DPUPR/2024',
      nomerRegistrasiArsip: 'ARS-2024-RNJ-P-0031',
      jenis: 'Renja Perubahan', tahun: '2024',
      judul: 'Renja Perubahan TA 2024 - DPUPR',
      subJudul: 'Penyesuaian Pagu Rekonstruksi Jembatan & Jalan Sumber',
      opdId: 'dpupr', opdName: 'Dinas Pekerjaan Umum dan Tata Ruang',
      status: 'Perlu Revisi',
      catatanRevisi: 'Rincian volume penanganan saluran irigasi pada BAB IV belum sinkron dengan SIPD-RI.',
      verifierName: 'Siti Rohayati, S.AP', verifierJabatan: 'Analis Kebijakan Pertama – Bidang Infrastruktur',
      createdById: opdUsers['dpupr']?.id,
    },
    {
      kodeDoc: 'RNJ-2025-0082',
      nomorSurat: '050/BA-Disdik/2025',
      nomerRegistrasiArsip: 'ARS-2025-RNJ-0082',
      jenis: 'Renja Murni', tahun: '2025',
      judul: 'Renja Murni 2025 - Dinas Pendidikan',
      subJudul: 'Dokumen Renja Definitif Standar Sarpras & PPPK Guru',
      opdId: 'disdik', opdName: 'Dinas Pendidikan Kab. Cirebon',
      status: 'Disetujui',
      tteNumber: '050/BA-Disdik/2025',
      verifierName: 'Bambang Irawan, M.Si', verifierJabatan: 'Perencana Ahli Madya – Bidang Sosial Budaya',
      createdById: opdUsers['disdik']?.id,
    },
    {
      kodeDoc: 'RNJ-2025-0155',
      nomorSurat: '050/410/DLH/2025',
      nomerRegistrasiArsip: 'ARS-2025-RNJ-0155',
      jenis: 'Renja Murni', tahun: '2025',
      judul: 'Renja Murni 2025 - Dinas Lingkungan Hidup',
      subJudul: 'Pengelolaan TPA Kubangdeleg & Bank Sampah Terpadu',
      opdId: 'dlh', opdName: 'Dinas Lingkungan Hidup Kab. Cirebon',
      status: 'Menunggu Verifikasi',
      createdById: opdUsers['dlh']?.id,
    },
    {
      kodeDoc: 'RKPD-2025-0012',
      nomorSurat: '050/220/Disnakertrans/2025',
      nomerRegistrasiArsip: 'ARS-2025-RKPD-0012',
      jenis: 'RKPD Murni', tahun: '2025',
      judul: 'Usulan Program Prioritas RKPD 2025 - Disnakertrans',
      subJudul: 'Pelatihan Vokasi BLK Cirebon & Penempatan Tenaga Kerja Lokal',
      opdId: 'disnakertrans', opdName: 'Dinas Ketenagakerjaan',
      status: 'Menunggu Verifikasi',
      createdById: opdUsers['disnakertrans']?.id,
    },
    {
      kodeDoc: 'RNJ-2025-BAPP-001',
      nomorSurat: 'BA.050/144/BAPP/2025',
      nomerRegistrasiArsip: 'ARS-2025-050-BAPP',
      jenis: 'Renja Murni', tahun: '2025',
      judul: 'Renja Definitif Internal Bapperida T.A. 2025',
      subJudul: 'Dokumen Rencana Kerja Definitif Perangkat Daerah Bapperida',
      opdId: 'bapperida', opdName: 'Bapperida Kabupaten Cirebon',
      status: 'Disetujui',
      tteNumber: 'BA.050/144/BAPP/2025',
      verifierName: 'Bapperida Kabupaten Cirebon', verifierJabatan: 'Super Admin',
      createdById: superAdmin.id,
    },
  ];

  const createdDocs = [];
  for (const d of docsData) {
    const sectionData = generateSections(d.jenis, d.opdName, d.tahun);
    const doc = await prisma.document.create({
      data: {
        ...d,
        sections: {
          create: sectionData.map(s => ({
            babId:      s.babId,
            babTitle:   s.babTitle,
            babOrder:   s.babOrder,
            isLocked:   s.isLocked,
            subsections: s.subsections,
          }))
        }
      }
    });
    createdDocs.push(doc);
  }
  console.log(`  ✓ ${createdDocs.length} dokumen contoh dibuat`);

  // 10. Activity logs awal
  await prisma.activityLog.createMany({
    data: [
      { docTitle: 'Renja_Dinkes_2025_Final', detail: 'Diserahkan oleh Dr. Hj. Neneng (Kasubag Ren Dinkes)', tag: 'Dinkes', badge: 'Verifikasi Level 1', icon: 'file-text', color: 'red' },
      { docTitle: 'Renja_Perubahan_DPUPR', detail: 'Catatan revisi dikirim oleh Staf Bapperida', tag: 'DPUPR', badge: 'Catatan Revisi', icon: 'table', color: 'amber' },
      { docTitle: 'Renja_Disdik_Murni_2025', detail: 'Disetujui oleh Bapperida (TTE Terbit)', tag: 'Disdik', badge: 'Sah / TTE', icon: 'file-check', color: 'green' },
      { docTitle: 'Lampiran_Indikator_DLH', detail: 'Menunggu verifikasi bidang teknis', tag: 'DLH', badge: 'Antrean Masuk', icon: 'file-spreadsheet', color: 'blue' },
    ]
  });
  console.log('  ✓ Activity logs awal dibuat');

  await seedPlanning(prisma);
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
