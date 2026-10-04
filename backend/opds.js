// Urutan resmi lampiran Renja Perangkat Daerah Kabupaten Cirebon.
const perangkatDaerah = [
  ['setda', 'Sekretariat Daerah', 'Setda'],
  ['setwan', 'Sekretariat Dewan Perwakilan Rakyat Daerah', 'Setwan'],
  ['inspektorat', 'Inspektorat', 'Inspektorat'],
  ['disdik', 'Dinas Pendidikan', 'Disdik'],
  ['dinkes', 'Dinas Kesehatan', 'Dinkes'],
  ['dpupr', 'Dinas Pekerjaan Umum dan Tata Ruang', 'DPUPR'],
  ['dpkpp', 'Dinas Perumahan, Kawasan Permukiman dan Pertanahan', 'DPKPP'],
  ['damkar', 'Dinas Pemadam Kebakaran dan Penyelamatan', 'Damkar'],
  ['satpolpp', 'Satuan Polisi Pamong Praja', 'Satpol PP'],
  ['dinsos', 'Dinas Sosial', 'Dinsos'],
  ['disnakertrans', 'Dinas Ketenagakerjaan', 'Disnaker'],
  ['dppkbp3a', 'Dinas Pengendalian Penduduk, Keluarga Berencana, Pemberdayaan Perempuan dan Perlindungan Anak', 'DPPKBP3A'],
  ['dlh', 'Dinas Lingkungan Hidup', 'DLH'],
  ['disdukcapil', 'Dinas Kependudukan dan Pencatatan Sipil', 'Disdukcapil'],
  ['dishub', 'Dinas Perhubungan', 'Dishub'],
  ['diskominfo', 'Dinas Komunikasi dan Informatika', 'Diskominfo'],
  ['disbudpar', 'Dinas Kebudayaan dan Pariwisata', 'Disbudpar'],
  ['dispora', 'Dinas Pemuda dan Olahraga', 'Dispora'],
  ['distan', 'Dinas Pertanian', 'Distan'],
  ['dkpp', 'Dinas Ketahanan Pangan dan Perikanan', 'DKPP'],
  ['disdagin', 'Dinas Perdagangan dan Perindustrian', 'Disdagin'],
  ['diskopukm', 'Dinas Koperasi dan Usaha Kecil dan Menengah', 'Diskop UKM'],
  ['disarpus', 'Dinas Kearsipan dan Perpustakaan', 'Disarpus'],
  ['dpmptsp', 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu', 'DPMPTSP'],
  ['dpmd', 'Dinas Pemberdayaan Masyarakat dan Desa', 'DPMD'],
  ['bkpsdm', 'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia', 'BKPSDM'],
  ['bapperida', 'Badan Perencanaan Pembangunan, Penelitian dan Pengembangan Daerah', 'Bapperida'],
  ['bkad', 'Badan Keuangan dan Aset Daerah', 'BKAD'],
  ['bapenda', 'Badan Pendapatan Daerah', 'Bapenda'],
  ['kesbangpol', 'Badan Kesatuan Bangsa dan Politik', 'Kesbangpol'],
  ['bpbd', 'Badan Penanggulangan Bencana Daerah', 'BPBD'],
];

const kecamatan = [
  'Arjawinangun', 'Astanajapura', 'Babakan', 'Beber', 'Ciledug',
  'Ciwaringin', 'Depok', 'Dukupuntang', 'Gebang', 'Gegesik',
  'Gempol', 'Greged', 'Gunungjati', 'Jamblang', 'Kaliwedi',
  'Kapetakan', 'Karangsembung', 'Karangwareng', 'Kedawung', 'Klangenan',
  'Lemahabang', 'Losari', 'Mundu', 'Pabedilan', 'Pabuaran',
  'Palimanan', 'Pangenan', 'Panguragan', 'Pasaleman', 'Plered',
  'Plumbon', 'Sedong', 'Sumber', 'Suranenggala', 'Susukan',
  'Susukanlebak', 'Talun', 'Tengahtani', 'Waled', 'Weru',
];

function roman(number) {
  let result = '';
  for (const [value, symbol] of [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) {
    while (number >= value) {
      result += symbol;
      number -= value;
    }
  }
  return result;
}

export const OPDS = [
  ...perangkatDaerah,
  ...kecamatan.map(nama => [`kec-${nama.toLowerCase()}`, `Kecamatan ${nama}`, `Kec. ${nama}`]),
].map(([id, nama, singkatan], index) => ({
  id,
  kode: `OPD-${String(index + 1).padStart(2, '0')}`,
  nama,
  singkatan,
  kategori: nama.split(' ')[0],
  nomorUrut: index + 1,
  nomorLampiran: roman(index + 1),
}));

export function synchronizeOpds(db) {
  // Preserve existing codes and metadata; only the official catalog is selectable.
  db.opds = OPDS.map(opd => {
    const existing = db.opds?.find(item => item.id === opd.id);
    return { ...existing, ...opd, kode: existing?.kode || opd.kode };
  });
  for (const user of [...(db.users || []), db.currentUser].filter(Boolean)) {
    const opd = db.opds.find(item => item.id === user.opdId);
    if (opd) {
      user.opdName = opd.nama;
      if (user.role === 'opd') {
        user.name = opd.nama;
        user.singkatan = opd.singkatan;
      }
    }
  }
}
