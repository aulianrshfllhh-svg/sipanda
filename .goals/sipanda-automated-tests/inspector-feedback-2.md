# Iteration 2 inspection

**Verdict: FAIL**

## Ringkasan

Iterasi 2 masih gagal karena dua pengujian frontend login tetap gagal dan belum ada bukti yang cukup untuk menyatakan 23 skenario terpenuhi. Tidak ada perbaikan aplikasi yang dibuat karena aturan proyek melarang memperbaiki defect produk tanpa persetujuan user. Juga belum ada validasi ulang terhadap database MySQL `sipanda_test` untuk suite backend/E2E yang destruktif, sehingga bagian yang memerlukan reset/seed database tetap diblokir dengan aman.

## Bukti yang dijalankan

1. `npx vitest run --config frontend/vitest.config.ts --reporter=default`
   - Hasil: 1 file gagal, 3 tes dijalankan, 2 gagal, 1 lolos.
   - Gagal pada `src/views/LoginView.test.ts`.

2. `npx vitest run --config backend/vitest.config.js --reporter=default`
   - Hasil: 3 file lolos, 8 tes lolos.
   - Ini adalah pengujian aman yang tidak mengubah data atau memerlukan database destructif yang belum diverifikasi.

## Nama gagal yang benar-benar terjadi

1. `LoginView > menampilkan pesan API saat kredensial ditolak`
   - `Expected: "Username atau password salah"`
   - `Received: form login tanpa error yang tampil`
   - Alasan: UI tidak menampilkan pesan `Username atau password salah` meskipun mock `fetch` mengembalikan `error` yang sama.

2. `LoginView > mengubah visibilitas kata sandi tanpa mengirim form`
   - `Expected: "text"`
   - `Received: "password"`
   - Alasan: tombol toggle tidak memindahkan field password ke mode terlihat.

## Defect aplikasi yang ditemukan

- Login tidak menampilkan pesan kesalahan yang diharapkan saat credential invalid.
- Toggle tampilan password tidak berfungsi; input tetap `type="password"` setelah klik.
- Karena ini adalah defect produk yang terlihat dalam test, saya tidak memperbaiki aplikasi atau melemahkan assertion. Ini harus ditangani dengan persetujuan user sebelum perubahan fitur.

## Yang masih diblokir

- Backend dan E2E yang membutuhkan reset/seed database belum dijalankan ulang dengan verifikasi langsung bahwa URL MySQL berisi database tepat `sipanda_test` dan sever dapat dijangkau.
- Pekerjaan yang mensyaratkan 23 skenario login, autorisasi, workflow, template, export, dan review belum dapat dinyatakan lengkap dari bukti yang aman.
- Tidak ada klaim bahwa semua 23 scenario terpenuhi; cakupan yang bisa dibuktikan saat ini masih terbatas pada frontend yang aman dan backend guard test.

## Rekap laporan yang akurat

- Total pengujian aman yang dijalankan: 11 tes (frontend 3 + backend guard 8).
- Gagal: 2 tes.
- Lolos: 9 tes.
- Belum dijalankan/terblokir: semua suite database-backed yang destruktif dan seluruh E2E browser karena kebutuhan verifikasi endpoint MySQL dan exact-db guard sebelum reset/seed.

## Keputusan

Status iterasi 2 tetap `FAIL`. Pengujian tidak dilemahkan, tidak di-skip, dan tidak dibuat lulus dengan cara menurunkan ekspektasi. Defect produk serta skenario yang masih terblokir dicatat dengan jelas dalam bahasa Indonesia agar tidak menutup celah yang ada.