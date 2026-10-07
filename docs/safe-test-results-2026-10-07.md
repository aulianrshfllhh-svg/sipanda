# Hasil pengujian aman — 7 Oktober 2026

Hanya pengujian yang tidak mereset atau mengakses database yang dijalankan:

- `npm run test:frontend`: **3 lulus, 0 gagal** (1 file). Vitest mengeluarkan
  peringatan konfigurasi Tailwind tentang opsi `content` yang kosong; pengujian
  tetap lulus.
- `node backend/tests/run-node-tests.js`: **99 lulus, 2 gagal dari 101**.
  `specified year/type outlines and placeholders` gagal karena outline Renja
  yang diharapkan berisi tiga entri ternyata kosong. `ensureTemplates versions
  an active legacy 2027 Renja Murni template` gagal karena record template lama
  tetap aktif. Keduanya tetap terlihat; kode aplikasi tidak diubah.

Dua kesalahan indeks fixture yang menunjuk subsection yang tidak ada sudah
diperbaiki pada pengujian landscape; pemeriksaan database juga kini memakai URL
MySQL valid untuk kasus positif. Pemeriksaan Vitest tersebut tidak dijalankan:
global setup-nya melakukan reset database.

**Kriteria yang belum diverifikasi:** reset/seed database beserta uji guard;
API login, otorisasi peran, alur status/revisi, penugasan, dan edit bab
bersamaan; validasi versi template; kriteria isi/nomor/layout lampiran serta
format DOCX dan nomor halaman daftar isi PDF; E2E Chromium; serta pengiriman
manifest root yang berisi empat skrip test (manifest saat ini bukan bagian
perubahan ini). Frontend yang dijalankan hanya mencakup tiga pengujian login.
Cakupan browser yang ada saat
ini terbatas pada login dan penolakan akses; alur editor, review, penugasan,
dan workflow yang lebih luas belum tercakup. Backend Vitest dan E2E Playwright
tidak dijalankan karena setup database-nya dapat mereset `sipanda_test`.
Perintah agregat juga tidak dijalankan. Perubahan ini tidak memperbaiki
perilaku aplikasi.
