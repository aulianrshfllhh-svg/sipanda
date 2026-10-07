# Hasil pengujian — 7 Oktober 2026

## Hasil akhir setelah persetujuan perbaikan

`npm test` lulus setelah API E2E diarahkan ke port bebas 3002 dan frontend ke
5174. Rangkaian final mengulang backend, frontend, dan E2E:

| Lapisan | Hasil |
| --- | ---: |
| Node backend | 101 lulus, 0 gagal |
| Backend Vitest | 15 lulus, 0 gagal (3 berkas) |
| Frontend Vitest | 3 lulus, 0 gagal (1 berkas) |
| Playwright Chromium | 4 lulus, 0 gagal |
| **Jumlah** | **123 lulus, 0 gagal** |

Database sebelum setup destruktif diverifikasi dengan koneksi MySQL aktif:
nama database yang dikonfigurasi dan `SELECT DATABASE()` sama-sama tepat
`sipanda_test`. Reset dan seed hanya dijalankan melalui penjaga yang menolak
URL database selain `sipanda_test`. Tidak ada setup yang diarahkan ke `sipanda`.

Tiga kegagalan produk yang dilaporkan dan disetujui untuk diperbaiki kini lulus:
`specified year/type outlines and placeholders` (outline dan placeholder
berdasarkan jenis/tahun) serta `ensureTemplates versions an active legacy 2027
Renja Murni template` (template warisan dinonaktifkan dan versi aktif baru
dibuat), dan verifikator yang membuat dokumen tidak lagi dapat menyetujui
dokumennya sendiri. Tes regresi self-approval tetap aktif. Tidak ada assertion
yang dihapus, dilemahkan, atau dilewati.

Tes API tambahan memeriksa pembatasan akses OPD, akses Super Admin lintas OPD,
antrean verifikator sesuai penugasan, akses langsung melalui URL dokumen,
persetujuan langsung dari Draft, dan kewajiban catatan revisi. Tes Chromium
tambahan memastikan pengguna tanpa tugas yang mengetik URL editor langsung
ditolak dan diarahkan kembali ke daftar dokumen.

DOCX dan PDF contoh ekspor berhasil dibuat dan diperiksa oleh
`backend/tests/export-artifacts.vitest.test.js` di `tests/output`.

## Catatan insiden dan peringatan

Dalam satu percobaan E2E terdahulu, sebelum isolasi proxy, permintaan login
dikirim melalui port 3001 ke proses `node server.js` yang sudah berjalan.
Database tujuan proses tersebut tidak diverifikasi; karena itu tidak dapat
dipastikan database mana yang digunakan. Konfigurasi proxy E2E kini memakai
target API terisolasi melalui `SIPANDA_API_PROXY_TARGET`; pengujian akhir
menggunakan port API 3002 dan frontend 5174.

Vitest frontend dan server E2E masih menampilkan peringatan bahwa konfigurasi
Tailwind memiliki opsi `content` kosong. Vite juga memperingatkan penggunaan
`__dirname` pada konfigurasi. Peringatan tersebut tidak menyebabkan kegagalan.

## Cakupan yang masih kurang dari 23 skenario

Pengujian saat ini **belum mencakup seluruh 23 skenario secara menyeluruh**.
Playwright mencakup empat tes autentikasi/akses, bukan seluruh alur kerja.
Sejumlah aturan dan perilaku diuji pada unit test/backend, tetapi alur browser
berikut masih belum tercakup:

- alur review lengkap tiga pengguna, perubahan status/revisi, pergantian
  penugasan, dan pencatatan log;
- edit bab bersamaan serta persistensi editor di browser;
- pengulangan mode landscape/undo, paste dan pembersihan tabel/teks, caption,
  serta validasi format dalam editor;
- reset cover dan ekspor melalui browser;
- alur browser untuk annex, template, arsip, dan semua pembatasan peran yang
  diminta.

Tes unit yang ada mencakup sebagian perilaku format/caption/annex/ekspor dan
migrasi template, tetapi belum menggantikan alur E2E tersebut. Hasil akhir
123/123 berarti semua tes yang saat ini ada lulus, bukan bahwa 23 skenario
seluruhnya telah terotomasi.
