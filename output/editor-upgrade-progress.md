# Penyempurnaan editor SIPANDA

Urutan mengikuti bagian 13 spesifikasi pengguna. Autentikasi, keputusan hak akses,
alur/status verifikasi, template berversi, serta kompilasi lampiran otomatis tidak diubah.
Perubahan rendering hanya membawa format dan orientasi isi ke pratinjau/ekspor.
Workspace sudah berisi perubahan lain sebelum pekerjaan ini dimulai; jangan reset berkas.

## Tahap yang telah dikerjakan

1. Tampilan dan toolbar dasar: teks versi UTF-8, toolbar membungkus pada laptop/tablet,
   judul BAB terbaca, undo/redo, inden, daftar tiga tingkat a./1)/i., superskrip/subskrip,
   karakter khusus, pencarian dengan CSS Highlight (tidak tersimpan ke HTML), ganti hasil
   tanpa merusak huruf miring, Ctrl+F/S/K, bantuan pintasan, pemisah halaman.
   Tampilan satu/dua halaman, zoom, loncat halaman, jumlah halaman ada pada pratinjau
   yang memakai mesin pembagian halaman ekspor. Tahap 10 menambahkan kanvas cetak
   yang dapat disunting langsung; editor BAB tetap tersedia untuk perintah struktur.
2. Paste: allowlist HTML, buang script/iframe/event handlers, font/warna sumber dibuang,
   daftar Office dinormalisasi, italic/sup/sub dipertahankan, bold opt-in melalui kebijakan
   template, sel gabungan dan angka Indonesia tetap teks, TSV menjadi tabel,
   Ctrl+Shift+V teks biasa, sanitasi besar dibagi per 400 elemen dengan progres.
   Gambar clipboard masuk dialog gambar yang ada dan meminta caption; unggah gambar
   tetap memakai data gambar di isi/autosave yang sudah tersedia, tanpa endpoint media baru.
   Opsi format asli mempertahankan perataan sumber dengan font/warna baku tetap dikunci.
   Notifikasi paste menyediakan Rapikan Tabel dan tombol landscape.
3. Tabel HTML bebas: toolbar saat kursor di tabel, tambah/hapus baris/kolom,
   gabung persegi panjang/pisah sel, perataan horizontal/vertikal, lebar angka persen,
   autofit/fit halaman, transpose, jumlah numerik. Rapikan memakai satu transaksi native
   yang dapat di-undo; menghapus style/spasi tak terlihat dan sumbu kosong yang aman,
   menandai kerusakan merge, header, format angka Indonesia, lebar proporsional,
   default header berulang dan baris tidak terpotong. CSS content-visibility untuk baris.
   Tabel baku terstruktur tetap memakai StandardTable dan logika perhitungannya.
   Tahap 10 menyelesaikan opsi pemotongan baris: default tetap utuh, opsi aktif
   memecah teks sel panjang dengan header berulang; sel gabungan/gambar tetap dilindungi.
4. Bagian orientasi: wrapper .doc-section-landscape/.doc-section-portrait tersimpan
   di content tanpa mengubah struktur template. Landscape di cursor meneruskan isi
   bagian dan sub-bab berikutnya sampai transisi portrait. Tabel dapat diisolasi dengan
   transisi portrait setelahnya. F4 215 x 330 / 330 x 215 mm, margin 20mm pada kanvas,
   pratinjau, PDF dan DOCX. Sampul portrait. Tabel Renja baku tampil landscape sendiri.
   Tahap 10 menambahkan thumbnail isi halaman aktual dengan penanda L dan navigasi.
   Rendering lampiran menghormati wrapper baru tanpa mengubah identitas/kompilasi otomatis.
5. Caption wajib saat membuat tabel/gambar, ubah judul tanpa mengubah ID objek,
   rujukan silang stabil, daftar tabel/gambar mengikuti urutan BAB. Hapus tabel tengah
   memperbarui nomor dan rujukan; target terhapus menjadi rujukan putus. Hapus/undo
   mempertahankan pasangan objek-caption, termasuk penggabungan paragraf native.
   Gambar clipboard/berkas/URL melalui dialog caption, lebar persen, perataan,
   sejajar teks/blok, pangkas empat sisi, proporsi, batas 10MB/32MP dan kompresi
   maksimal 2400px/1.5MB. Metadata aman bertahan pada autosave, pratinjau dan ekspor.
   Penyempurnaan detail kesamaan tata letak native DOCX tetap tahap 10.
6. Cek Format dengan lokasi yang dapat diklik, skor kelengkapan isi dan ringkasan BAB.
   Aturan bersama server/browser untuk isi wajib, caption tabel/gambar, font baku,
   rujukan putus, lebar sumber dan data Rancangan Renja. Pemeriksaan mesin cetak
   memeriksa overflow tabel aktual dan halaman hampir kosong; resolusi gambar dan
   paragraf kosong menjadi saran. Ajukan otomatis memeriksa dan tidak mengirim POST
   bila ada masalah wajib. Server mengulang pemeriksaan sebelum transisi status yang
   sudah ada; izin/keputusan/status verifikasi dan sinkronisasi lampiran tetap sama.
   Endpoint baca memakai canView yang sudah ada. Perubahan selama pemeriksaan
   meminta periksa ulang; kegagalan pemeriksaan cetak tidak melewati pengajuan.
7. Draf IndexedDB dipisahkan per akun/dokumen/sesi dan ditulis setiap perubahan;
   antrean menyatukan penulisan yang menunggu agar salinan besar tidak menumpuk.
   Status offline, simpan perangkat dan gagal sinkronisasi terlihat; koneksi kembali
   memperbarui sesi lalu menyinkronkan otomatis. Draf tab yang ditutup saat offline
   dipulihkan pada sesi berikutnya. Kegagalan perangkat memberi pilihan cadangan JSON.
   beforeunload memperingatkan perubahan belum tersimpan; navigasi saat offline
   memastikan draf perangkat tersimpan dan meminta konfirmasi meninggalkan editor.
   Kunci BAB disimpan pada tabel terpisah editor_chapter_leases (90 detik,
   pembaruan 20 detik), termasuk sesi berbeda pada akun yang sama. Mode baca
   menampilkan pemegang kunci. Hash revisi per BAB dan transaksi dengan kunci
   baris dokumen menolak konflik/lease kedaluwarsa sebelum menulis. Autosave hanya
   mengirim BAB berubah. Menambah sub-bab memakai pemeriksaan sesi yang sama.
   Konflik menampilkan draf dan server; pengguna dapat memilih server atau memulihkan
   isi draf pada struktur server terbaru, dengan cadangan tetap di perangkat.
   Aturan autentikasi/hak akses/status/template/kompilasi lampiran tidak diubah.
   Tabel lease dibuat secara terarah bila belum ada; tidak menjalankan db push
   terhadap perubahan skema lain yang sudah ada di workspace.

8. Impor Word per BAB memakai konverter terautentikasi tanpa menulis dokumen langsung.
   Isi dibersihkan, dipecah menurut BAB/sub-bab yang cocok, dan dimasukkan melalui
   penyimpanan normal; identitas/judul template tetap terkunci. Cadangan dibuat sebelum
   penerapan. Gambar dikompresi melalui pemroses editor. Peringatan konversi terlihat.
   Proporsi kolom serta flag header berulang Word dipertahankan. Excel/CSV umum
   mendukung pilihan lembar, merge, teks kode dengan nol awal dan angka Indonesia;
   impor mengganti tabel terpilih atau membuat tabel baru dengan caption.
   Impor tabel Rancangan Renja menerima kolom SIPD dalam urutan berbeda; rumus tanpa
   hasil dan sel gabungan pada format baku memberi peringatan.
9. Komentar lokasi paragraf/tabel, balasan berantai, Terbuka/Selesai dan buka kembali.
   Endpoint komentar/riwayat memanggil canView yang sudah ada; pengguna tanpa penugasan
   ditolak sebelum membaca atau menulis. Komentar lampiran otomatis diarahkan ke induk.
   Banner revisi menunjukkan komentar Terbuka sebagai daftar pemeriksaan pengajuan ulang.
   Status revisi dan notifikasi OPD disimpan atomik; keputusan verifikasi tetap sama.
   Tiap pengajuan menyimpan snapshot isi, profil cetak dan identitas template dalam
   transaksi bersama transisi status, dengan pemeriksaan perubahan konkuren.
   Berkas unggahan disalin berdasarkan hash ke arsip versi agar penggantian unggahan
   tidak mengubah versi lama. Riwayat membuka versi dan menyorot perubahan antara dua
   versi; dokumen aktif dan template tidak ditimpa.
10. Kanvas cetak / sunting memakai HTML, font tertanam dan pagination yang sama dengan
    PDF serta DOCX Tata Letak Tetap. Teks dan sel dapat disunting langsung; fragmen
    paragraf/daftar/tabel digabung kembali ke isi sub-bab dengan orientasi tetap utuh.
    Sampul, judul template, caption, tabel baku dan gambar terlindungi. Kunci BAB,
    autosave dan draf perangkat yang sama digunakan; undo/redo juga bekerja setelah
    tata ulang halaman. Pembagian halaman diperbarui saat meninggalkan blok atau
    menekan Tata ulang halaman. Perintah struktur tabel, gambar, impor dan komentar
    tetap melalui editor BAB. Thumbnail memuat isi halaman aktual dan penanda landscape.
    Native DOCX mempertahankan Bookman, tabel 10pt, daftar dan kelanjutan nomornya,
    sup/sub, tautan, perataan horizontal/vertikal, caption, header berulang, orientasi
    dan opsi cantSplit. Tooltip membedakan arsip gambar dan dokumen yang dapat diedit.
    Font harus selesai dimuat sebelum menghitung halaman. Daftar panjang dapat pindah
    ke halaman baru, tanpa overflow atau penomoran ulang yang salah. Tabel padat dari
    Word menyeimbangkan lebar kolom hanya jika satu baris tidak muat pada font baku;
    ukuran font dan isi tidak dikurangi. Opsi split hanya memecah teks pada baris
    tanpa merge/gambar; default tetap memindahkan baris utuh.

## Validasi terakhir

- `frontend: npm run build` (RAYON_NUM_THREADS=2): lulus. Pembatasan worker
  dipakai saat memori mesin terbatas; build dan browser dijalankan terpisah.
- `backend: node --test --test-concurrency=1 tests/*.test.js`: 90 tes lulus, termasuk regresi template, lampiran, izin baca
  berkas sumber, notifikasi dan validasi pengajuan yang sudah ada.
- `backend: node test-editor-tools.mjs`: lulus UI laptop 1366px/tablet 768px,
  pencarian, autosave dicegat, paste tabel 30 baris, Rapikan + Ctrl+Z,
  isolasi tabel landscape, pratinjau dokumen Mundu yang tersedia (DEMO-RENJA-MUNDU-2027) dan dua halaman.
  Semua tulisan API dicegat untuk melindungi dokumen sumber.
- Tes browser `tests/editor-pagination.test.js`: 60 baris dengan rowspan, header
  berulang, nomor halaman dan rujukan daftar isi/tabel terisi, tanpa overflow,
  ukuran halaman PDF F4 dan XML DOCX editable portrait/landscape/header/cantSplit lulus.
- `backend: node test-editor-captions.mjs`: tahap 5 lulus, termasuk caption,
  hapus/undo/renumber, rujukan putus, gambar clipboard, crop, kompresi, proporsi,
  perataan, inline dan metadata autosave. Semua tulisan API dicegat.
- `backend: node test-editor-format.mjs`: Ajukan menahan tabel tanpa caption,
  tombol lokasi meloncat ke tabel, caption memperbaiki hasil. POST submit tidak
  dikirim; seluruh tulisan API dicegat. Screenshot tahap 5 dan 6 ada di artifacts.
- Endpoint Cek Format aktual pada Renja Mundu berhasil HTTP 200 dengan 6 BAB,
  tanpa mengubah dokumen sumber. Backend development dimuat ulang dengan kode terbaru.
- `backend: npx prisma validate`: lulus; model lease baru tidak mengubah model akun.
- Uji lease MySQL/API aktual: sesi ganda OPD Dinkes dibatasi, PUT sesi bukan pemilik
  ditolak 423 sebelum menulis, pelepasan dan perolehan ulang lulus; isi dokumen utuh.
- `backend: node test-editor-offline.mjs`: offline 61 detik, draf IndexedDB,
  sinkronisasi otomatis, tab kedua baca saja, pemulihan setelah tab ditutup,
  perubahan server tidak tertimpa, pemulihan eksplisit dan cadangan konflik diuji.
  Seluruh penulisan dokumen dicegat; screenshot tahap 7 ada di artifacts.
  Uji koneksi kembali juga memicu dua event online untuk memeriksa antrean simpan;
  pemulihan konflik mempertahankan sub-bab tambahan terbaru di server.

- Tahap 8: tes unit dan browser Word/Excel/CSV lulus, memakai konverter aktual.
- Tahap 9: komentar, balasan, tutup/buka, banding versi dan penolakan akses lulus.
  Endpoint komentar/riwayat pada MySQL/API aktual berhasil HTTP 200; hanya dibaca.
- Tahap 10: kanvas cetak langsung, undo/redo, fragmen paragraf dan 60 baris tabel,
  perbaikan sel di halaman lanjutan, Enter/new paragraph, orientasi, sumber autosave
  tanpa metadata tampilan, thumbnail dan perlindungan judul/sampul lulus.
- Seluruh delapan skrip regresi browser/naskah asli dijalankan berurutan dan lulus,
  termasuk offline 61 detik. Build frontend dan validasi Prisma lulus.

## Kriteria akhir bagian 12

| Kriteria | Bukti | Hasil |
| --- | --- | --- |
| 1. Paste Excel 30 baris, merge, angka, Rapikan dan landscape | test-editor-tools.mjs; editor-paste.test.js | Lulus |
| 2. Word dua halaman, daftar a./b./c., font/warna/bold sumber dibuang | test-editor-tools.mjs; editor-export.test.js | Lulus |
| 3. Tabel 60 baris landscape, header, baris utuh, penomoran/daftar | editor-pagination.test.js | Lulus |
| 4. Hapus tabel tengah, renumber dan rujukan | document-captions.test.js; test-editor-captions.mjs | Lulus |
| 5. Offline satu menit, teks tidak hilang | test-editor-offline.mjs (61 detik) | Lulus |
| 6. Cek Format menolak tabel tanpa caption dan membuka lokasi | test-editor-format.mjs | Lulus |
| 7. Kanvas/PDF dan struktur DOCX landscape | test-editor-canvas.mjs; editor-pagination.test.js; editor-export.test.js | Lulus |
| 8. Renja asli, bukan hanya dummy | test-editor-real-renja.mjs; real-renja-report.json | Lulus |

Uji asli memakai berkas unggahan lokal Renja Kecamatan Depok 2027, enam BAB dan
sebelas tabel sumber. Hasil format baku: 100 halaman, 64 landscape, tanpa overflow.
PDF dan DOCX editable tersimpan di artifacts/editor-upgrade. Hash sumber diperiksa
sebelum/sesudah pengujian dan tidak berubah. Peringatan konversi bentuk Word yang
belum didukung tetap ditampilkan; naskah sumber menjadi acuan pemeriksaan gambar.
Pengujian browser memakai salinan fixture dan mencegat tulisan API, sehingga isi
Renja yang sudah tersimpan tidak berubah. Tidak menjalankan db push, deploy, commit,
atau penggantian autentikasi/keputusan izin/template/alur kompilasi lampiran.

Bagian 13 memuat sepuluh tahap pengerjaan. Bagian 11 dan 12 adalah persyaratan
antarmuka serta pengujian, bukan tahap pengerjaan tambahan 11 sampai 13.

## Audit lanjutan setelah tahap 10

- Paste di awal blok kini mengenali pilihan pada elemen, bukan hanya node teks.
  Saat sanitasi besar berlangsung, kanvas menampilkan progres, menahan input lain,
  dan menunda tata ulang hingga hasil ditempel pada lokasi semula. Penutupan kanvas
  dan navigasi ditahan selama proses; menutup tab memunculkan peringatan.
- Penyimpanan hanya menggabungkan blok yang benar-benar menerima input. Tata ulang
  tidak lagi membuat perubahan semu pada riwayat, sehingga undo setelah paste
  menghapus paste tersebut dan tidak berhenti pada snapshot tampilan yang sama.
  Batas transaksi undo dipisahkan setelah paste/undo/redo dan perintah toolbar.
- Riwayat mempertahankan maksimal 30 snapshot dengan target memori 8 MiB;
  minimal dua snapshot tetap dipertahankan agar dokumen yang melebihi target
  tetap mempunyai satu langkah undo. Ini membatasi salinan dokumen besar.
- Kegagalan sementara inisialisasi komentar tidak disimpan sebagai kegagalan
  permanen. Permintaan berikutnya mencoba lagi tanpa me-restart server.
  Pemeriksaan penugasan dan izin dokumen tetap sama.
- Validasi: empat tes document-review lulus, termasuk kegagalan koneksi lalu
  pemulihan. test-editor-canvas-paste.mjs lulus: 1.200 elemen paste, sanitasi,
  penataan bersamaan, perlindungan input/penutupan, undo setelah paste dan perubahan
  setelah undo, serta batas riwayat dengan sumber besar. Skrip juga mengulangi
  suntingan paragraf dan 60 baris tabel; semua tulisan dokumen API dicegat.
  Build produksi frontend lulus. Backend development dimuat ulang dengan kode terbaru.

### Audit posisi kursor pada kanvas cetak

- Tata ulang halaman dan undo/redo memulihkan kursor berdasarkan blok sumber
  serta offset teks lintas potongan halaman. Sel tabel memakai identitas baris
  dan kolom agar kursor kembali ke sel yang sama pada halaman lanjutan.
- Pemulihan hanya berlaku ketika kanvas masih memiliki fokus dan bagian masih
  dapat disunting. Posisi yang melewati akhir teks setelah undo dibatasi ke akhir
  teks yang tersedia; kanvas yang sudah ditutup tidak dipasang ulang.
- Validasi browser: test-editor-canvas.mjs lulus dengan pengetikan langsung
  sesudah undo/redo dan setelah tata ulang pada sel baris 57, tanpa memilih lokasi
  lagi. Struktur tabel tetap 60 baris, satu header, dan orientasi tetap terjaga.
  test-editor-canvas-paste.mjs juga lulus, termasuk paste 1.200 elemen dan undo.
  Seluruh perubahan dokumen API dalam pengujian dicegat.
- Build produksi frontend (`vue-tsc -b` dan Vite) lulus.
