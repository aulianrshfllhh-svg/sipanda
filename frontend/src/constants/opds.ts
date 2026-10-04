/**
 * Daftar resmi Perangkat Daerah Kabupaten Cirebon
 * beserta Nomor Lampiran Renja sesuai urutan resmi.
 *
 * Digunakan sebagai sumber kebenaran tunggal (single source of truth)
 * untuk seluruh logika lampiran di aplikasi SIPANDA.
 *
 * Total: 71 OPD (31 dinas/badan + 40 kecamatan)
 */

export interface OpdDefinition {
  /** ID unik snake_case */
  id: string;
  /** Nama lengkap resmi */
  nama: string;
  /** Singkatan / nama pendek */
  singkatan: string;
  /** Nomor urut (1–71) */
  nomorUrut: number;
  /** Nomor lampiran dalam angka romawi, mis. "I", "XXXII", "LXXI" */
  nomorLampiran: string;
  /** Kategori: 'dinas' | 'badan' | 'sekretariat' | 'kecamatan' | 'satuan' | 'inspektorat' */
  kategori: string;
}

/** Konversi angka ke romawi */
function toRoman(n: number): string {
  const map: [number, string][] = [
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'],
    [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  for (const [value, symbol] of map) {
    while (n >= value) { result += symbol; n -= value; }
  }
  return result;
}

/**
 * Raw data: [id, nama, singkatan, kategori]
 * Urutan = urutan lampiran resmi Renja Kabupaten Cirebon
 */
const RAW_DATA: [string, string, string, string][] = [
  // ── Sekretariat ──────────────────────────────────────────────
  ['setda',         'Sekretariat Daerah',                                                               'Setda',        'sekretariat'],
  ['setwan',        'Sekretariat Dewan Perwakilan Rakyat Daerah',                                       'Setwan',       'sekretariat'],
  // ── Inspektorat ──────────────────────────────────────────────
  ['inspektorat',   'Inspektorat',                                                                      'Inspektorat',  'inspektorat'],
  // ── Dinas ────────────────────────────────────────────────────
  ['disdik',        'Dinas Pendidikan',                                                                 'Disdik',       'dinas'],
  ['dinkes',        'Dinas Kesehatan',                                                                  'Dinkes',       'dinas'],
  ['dpupr',         'Dinas Pekerjaan Umum dan Tata Ruang',                                              'DPUPR',        'dinas'],
  ['dpkpp',         'Dinas Perumahan, Kawasan Permukiman dan Pertanahan',                               'DPKPP',        'dinas'],
  ['damkar',        'Dinas Pemadam Kebakaran dan Penyelamatan',                                         'Damkar',       'dinas'],
  ['satpolpp',      'Satuan Polisi Pamong Praja',                                                       'Satpol PP',    'satuan'],
  ['dinsos',        'Dinas Sosial',                                                                     'Dinsos',       'dinas'],
  ['disnakertrans', 'Dinas Ketenagakerjaan',                                                            'Disnaker',     'dinas'],
  ['dppkbp3a',      'Dinas Pengendalian Penduduk, Keluarga Berencana, Pemberdayaan Perempuan dan Perlindungan Anak', 'DPPKBP3A', 'dinas'],
  ['dlh',           'Dinas Lingkungan Hidup',                                                           'DLH',          'dinas'],
  ['disdukcapil',   'Dinas Kependudukan dan Pencatatan Sipil',                                          'Disdukcapil',  'dinas'],
  ['dishub',        'Dinas Perhubungan',                                                                'Dishub',       'dinas'],
  ['diskominfo',    'Dinas Komunikasi dan Informatika',                                                 'Diskominfo',   'dinas'],
  ['disbudpar',     'Dinas Kebudayaan dan Pariwisata',                                                  'Disbudpar',    'dinas'],
  ['dispora',       'Dinas Pemuda dan Olahraga',                                                        'Dispora',      'dinas'],
  ['distan',        'Dinas Pertanian',                                                                  'Distan',       'dinas'],
  ['dkpp',          'Dinas Ketahanan Pangan dan Perikanan',                                             'DKPP',         'dinas'],
  ['disdagin',      'Dinas Perdagangan dan Perindustrian',                                              'Disdagin',     'dinas'],
  ['diskopukm',     'Dinas Koperasi dan Usaha Kecil dan Menengah',                                      'Diskop UKM',   'dinas'],
  ['disarpus',      'Dinas Kearsipan dan Perpustakaan',                                                 'Disarpus',     'dinas'],
  ['dpmptsp',       'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu',                           'DPMPTSP',      'dinas'],
  ['dpmd',          'Dinas Pemberdayaan Masyarakat dan Desa',                                           'DPMD',         'dinas'],
  // ── Badan ────────────────────────────────────────────────────
  ['bkpsdm',        'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia',                           'BKPSDM',       'badan'],
  ['bapperida',     'Badan Perencanaan Pembangunan, Penelitian dan Pengembangan Daerah',                'Bapperida',    'badan'],
  ['bkad',          'Badan Keuangan dan Aset Daerah',                                                  'BKAD',         'badan'],
  ['bapenda',       'Badan Pendapatan Daerah',                                                         'Bapenda',      'badan'],
  ['kesbangpol',    'Badan Kesatuan Bangsa dan Politik',                                               'Kesbangpol',   'badan'],
  ['bpbd',          'Badan Penanggulangan Bencana Daerah',                                             'BPBD',         'badan'],
  // ── Kecamatan (40) ───────────────────────────────────────────
  ['kec-arjawinangun',   'Kecamatan Arjawinangun',   'Kec. Arjawinangun',   'kecamatan'],
  ['kec-astanajapura',   'Kecamatan Astanajapura',   'Kec. Astanajapura',   'kecamatan'],
  ['kec-babakan',        'Kecamatan Babakan',        'Kec. Babakan',        'kecamatan'],
  ['kec-beber',          'Kecamatan Beber',          'Kec. Beber',          'kecamatan'],
  ['kec-ciledug',        'Kecamatan Ciledug',        'Kec. Ciledug',        'kecamatan'],
  ['kec-ciwaringin',     'Kecamatan Ciwaringin',     'Kec. Ciwaringin',     'kecamatan'],
  ['kec-depok',          'Kecamatan Depok',          'Kec. Depok',          'kecamatan'],
  ['kec-dukupuntang',    'Kecamatan Dukupuntang',    'Kec. Dukupuntang',    'kecamatan'],
  ['kec-gebang',         'Kecamatan Gebang',         'Kec. Gebang',         'kecamatan'],
  ['kec-gegesik',        'Kecamatan Gegesik',        'Kec. Gegesik',        'kecamatan'],
  ['kec-gempol',         'Kecamatan Gempol',         'Kec. Gempol',         'kecamatan'],
  ['kec-greged',         'Kecamatan Greged',         'Kec. Greged',         'kecamatan'],
  ['kec-gunungjati',     'Kecamatan Gunungjati',     'Kec. Gunungjati',     'kecamatan'],
  ['kec-jamblang',       'Kecamatan Jamblang',       'Kec. Jamblang',       'kecamatan'],
  ['kec-kaliwedi',       'Kecamatan Kaliwedi',       'Kec. Kaliwedi',       'kecamatan'],
  ['kec-kapetakan',      'Kecamatan Kapetakan',      'Kec. Kapetakan',      'kecamatan'],
  ['kec-karangsembung',  'Kecamatan Karangsembung',  'Kec. Karangsembung',  'kecamatan'],
  ['kec-karangwareng',   'Kecamatan Karangwareng',   'Kec. Karangwareng',   'kecamatan'],
  ['kec-kedawung',       'Kecamatan Kedawung',       'Kec. Kedawung',       'kecamatan'],
  ['kec-klangenan',      'Kecamatan Klangenan',      'Kec. Klangenan',      'kecamatan'],
  ['kec-lemahabang',     'Kecamatan Lemahabang',     'Kec. Lemahabang',     'kecamatan'],
  ['kec-losari',         'Kecamatan Losari',         'Kec. Losari',         'kecamatan'],
  ['kec-mundu',          'Kecamatan Mundu',          'Kec. Mundu',          'kecamatan'],
  ['kec-pabedilan',      'Kecamatan Pabedilan',      'Kec. Pabedilan',      'kecamatan'],
  ['kec-pabuaran',       'Kecamatan Pabuaran',       'Kec. Pabuaran',       'kecamatan'],
  ['kec-palimanan',      'Kecamatan Palimanan',      'Kec. Palimanan',      'kecamatan'],
  ['kec-pangenan',       'Kecamatan Pangenan',       'Kec. Pangenan',       'kecamatan'],
  ['kec-panguragan',     'Kecamatan Panguragan',     'Kec. Panguragan',     'kecamatan'],
  ['kec-pasaleman',      'Kecamatan Pasaleman',      'Kec. Pasaleman',      'kecamatan'],
  ['kec-plered',         'Kecamatan Plered',         'Kec. Plered',         'kecamatan'],
  ['kec-plumbon',        'Kecamatan Plumbon',        'Kec. Plumbon',        'kecamatan'],
  ['kec-sedong',         'Kecamatan Sedong',         'Kec. Sedong',         'kecamatan'],
  ['kec-sumber',         'Kecamatan Sumber',         'Kec. Sumber',         'kecamatan'],
  ['kec-suranenggala',   'Kecamatan Suranenggala',   'Kec. Suranenggala',   'kecamatan'],
  ['kec-susukan',        'Kecamatan Susukan',        'Kec. Susukan',        'kecamatan'],
  ['kec-susukanlebak',   'Kecamatan Susukanlebak',   'Kec. Susukanlebak',   'kecamatan'],
  ['kec-talun',          'Kecamatan Talun',          'Kec. Talun',          'kecamatan'],
  ['kec-tengahtani',     'Kecamatan Tengahtani',     'Kec. Tengahtani',     'kecamatan'],
  ['kec-waled',          'Kecamatan Waled',          'Kec. Waled',          'kecamatan'],
  ['kec-weru',           'Kecamatan Weru',           'Kec. Weru',           'kecamatan'],
];

/** Daftar lengkap 71 OPD dengan nomor lampiran */
export const OPDS: OpdDefinition[] = RAW_DATA.map(([id, nama, singkatan, kategori], index) => ({
  id,
  nama,
  singkatan,
  kategori,
  nomorUrut: index + 1,
  nomorLampiran: toRoman(index + 1),
}));

// ── Lookup helpers ──────────────────────────────────────────────────────────

/** Map id → OPD */
export const OPD_BY_ID = new Map<string, OpdDefinition>(OPDS.map(o => [o.id, o]));

/** Map nomorUrut → OPD */
export const OPD_BY_URUT = new Map<number, OpdDefinition>(OPDS.map(o => [o.nomorUrut, o]));

/** Cari OPD berdasarkan id */
export function getOpdById(id: string): OpdDefinition | undefined {
  return OPD_BY_ID.get(id);
}

/** Dapatkan label lampiran lengkap, mis. "Lampiran XXXII : Renja Kecamatan Arjawinangun" */
export function getLabelLampiran(opd: OpdDefinition): string {
  return `Lampiran ${opd.nomorLampiran} : Renja ${opd.nama}`;
}

/** Dapatkan label lampiran singkat, mis. "Lampiran XXXII" */
export function getNomorLampiranLabel(opd: OpdDefinition): string {
  return `Lampiran ${opd.nomorLampiran}`;
}

/** Filter OPD berdasarkan kategori */
export function getOpdsByKategori(kategori: OpdDefinition['kategori']): OpdDefinition[] {
  return OPDS.filter(o => o.kategori === kategori);
}

/** Seluruh OPD non-kecamatan (dinas + badan + sekretariat + satuan + inspektorat) */
export const OPD_DINAS_BADAN = OPDS.filter(o => o.kategori !== 'kecamatan');

/** Seluruh kecamatan */
export const OPD_KECAMATAN = OPDS.filter(o => o.kategori === 'kecamatan');
