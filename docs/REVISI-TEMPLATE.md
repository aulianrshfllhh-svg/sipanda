# Revisi template dokumen SIPANDA

## Menggunakan fitur

- Super Admin: buka **Template Dokumen**. Pilih template, duplikasikan untuk tahun tujuan, edit bab/sub-bab dan petunjuknya, simpan, lalu aktifkan. Template aktif atau yang telah dipakai tidak dapat ditimpa. Aktivasi versi baru hanya memengaruhi dokumen baru.
- Template awal: Renja 2027 (6 bab), Perubahan Renja 2027 (6 bab), RKPD 2027 dan Perubahan RKPD 2027 (7 bab), Renja 2026 (5 bab), RPJMD 2027 (struktur kosong).
- **Pengaturan Dokumen** menyimpan nama/alamat OPD, jabatan/nama/pangkat/NIP pimpinan, tempat dan bulan tanda tangan. Bupati dan Sekretaris Daerah dikelola Super Admin. OPD hanya dapat menyimpan pengaturannya sendiri. Data kosong ditampilkan sebagai tempat isian, bukan nama pejabat buatan.
- Pada pembuatan dokumen, pilih tahun yang memiliki template aktif. Dokumen lama tetap memakai struktur tersimpan; tidak dimigrasikan ke struktur 2027.
- Pilih tahun 2027 untuk menemukan **Renja Kecamatan Mundu 2027 (Data Dummy)**. Angka contoh: tiga program dengan total Rp600.000.000 dan prakiraan maju Rp660.000.000.
- Super Admin dapat menugaskan bab RKPD maupun Renja Bapperida kepada staf melalui panel editor. Pembatasan bab mengikuti mekanisme penugasan yang sudah ada.

## Tabel dan impor

Tabel baku tersedia pada sub-bab terkait, serta melalui tombol tambah tabel. Kolom terkunci, baris dapat ditambah/dihapus. Rancangan Renja memiliki 10 kolom: Kode dan uraian dipisahkan. Tabel memakai tingkat Urusan → Program → Kegiatan → Sub Kegiatan. Dana induk dihitung dari anak sehingga tidak dihitung dua kali.

Unduh format CSV pada tabel untuk melihat urutan kolom. Impor `.csv` (pemisah koma/titik koma) atau `.xlsx` (lembar pertama), dengan satu baris judul. Tabel Renja dapat menggunakan kolom awal **Tingkat**: `urusan`, `program`, `kegiatan`, `subkegiatan`. Tanpa kolom Tingkat, data menjadi baris subkegiatan. Impor menambahkan baris, tidak menghapus baris yang sudah ada. Maksimum berkas 10 MB dan 10.000 baris. Hasil ekspor SIPD perlu disesuaikan ke urutan kolom ini bila formatnya berbeda. Simpan hasil perhitungan rumus Excel sebelum mengimpor.

Caption tabel/gambar dinomori per bab; daftar tabel/gambar dibuat dari caption yang benar-benar terdapat dalam dokumen. Gambar baru dapat diunggah sebagai PNG/JPG/WebP atau dimasukkan dari URL yang dapat diakses browser. Gambar baru disimpan tertanam agar ekspor tidak bergantung pada jaringan.

## Lampiran dan keluaran

Lampiran dibuat otomatis dari Renja induk dan disinkronkan dari **seluruh bab yang tersimpan**, termasuk saat seorang penulis hanya mengedit bab tertentu. Lampiran bersifat baca saja. Super Admin dapat mengisi nomor/tanggal peraturan serta identitas pengundangan.

Sesuai konfirmasi pengguna, lampiran **langsung BAB I setelah blok Peraturan Bupati**, tanpa daftar isi tambahan atau bagian depan induk. Nama pejabat diambil dari Pengaturan. Penomoran halaman/caption dihitung untuk lampiran itu sendiri.

**Pratinjau Halaman** di editor merupakan tampilan cetak. Sampul, kata pengantar, daftar isi, daftar tabel, dan daftar gambar memakai angka romawi kecil; isi memakai angka mulai 1. Tabel Renja memakai halaman landscape. Nomor daftar isi mengikuti hasil pembagian halaman, bukan nomor bab.

PDF dan DOCX menggunakan renderer pratinjau yang sama. **DOCX tata letak tetap memuat gambar setiap halaman** agar tampilan, nomor halaman, dan tabel identik dengan pratinjau; teks di DOCX tersebut tidak dapat diedit sebagai paragraf Word. **DOCX Dapat Diedit** juga tersedia untuk menyunting teks/tabel di Word; tata letaknya dapat menyesuaikan aplikasi Word. Isi dokumen tetap dapat diedit di SIPANDA. PDF menyimpan teks hasil rendering browser. Chrome/Edge diperlukan pada server; lokasi lain dapat ditetapkan melalui `CHROME_PATH`.

## Pemasangan pada salinan proyek lain

Database yang digunakan adalah MySQL/Prisma. Dengan backend dihentikan sementara:

```powershell
cd backend
npm.cmd install
node node_modules/prisma/build/index.js db push
node node_modules/prisma/build/index.js generate
npm.cmd run db:seed-planning
```

`db:seed-planning` menambahkan template/dummy secara idempoten tanpa mereset akun atau dokumen lama. Jangan gunakan `db:reset` atau seed umum untuk pembaruan database yang sudah terisi. Jalankan kembali backend melalui `start.bat`.

## Verifikasi

Dari folder backend:

```powershell
npm.cmd test
node test-integration.mjs
node test-ui.mjs
node test-exports.mjs
```

Pengujian integrasi memerlukan backend lokal dengan akun demo. Ia membuat dokumen/template uji sementara lalu membersihkannya. Pengujian UI memerlukan frontend lokal dan Chrome. Berkas hasil ekspor contoh disimpan di `artifacts`. Build frontend: `cd ../frontend; npm.cmd run build`.
