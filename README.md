# SIPANDA — Sistem Informasi Perencanaan Daerah
## Bapperida Kabupaten Cirebon

> **Portal resmi penyusunan berbasis template baku, verifikasi, dan pengarsipan dokumen Renja & RKPD seluruh 58 OPD Kabupaten Cirebon.**

---

## 🚀 Cara Menjalankan

### Cara Cepat (Rekomendasi)
Double-click file `start.bat` di root folder proyek.

### Manual
```bash
# 1. Jalankan Backend API (terminal 1)
cd backend
node server.js
# → Berjalan di http://localhost:3001

# 2. Jalankan Frontend (terminal 2)
cd frontend
npm run dev
# → Buka http://localhost:5173
```

---

## 👥 Akun Demo (Ganti Peran dari Sidebar)

| Peran | Nama | Instansi |
|-------|------|----------|
| **Master Admin** | Budi Santoso, S.STP | Bapperida Kabupaten Cirebon |
| **OPD Dinas Kesehatan** | Dr. Hj. Neneng, M.Kes | Dinas Kesehatan |
| **OPD DPUPR** | Ir. H. Sugeng Riyadi, MT | Dinas PUPR |
| **OPD Dinas Pendidikan** | H. Rokhmat, S.Pd, M.Pd | Dinas Pendidikan |

---

## 📋 Fitur Utama

### Role OPD
- Dashboard ringkasan status dokumen, catatan revisi, dan tahapan alur Renja 5-step
- Buat dokumen via **Cara A (Template Baku Permendagri 86/2017)** atau **Cara B (Upload PDF/DOCX)**
- Editor dokumen tampilan Word (kanvas A4, cover otomatis, daftar isi otomatis, bab terkunci)
- Submit ke Admin → jika diminta revisi, perbaiki lalu ajukan ulang untuk verifikasi
- Untuk dokumen upload, layar telaah Admin menampilkan PDF sumber langsung atau hasil konversi tampilan dari DOC/DOCX sumber agar catatan revisi dapat diisi di SIPANDA pada layar yang sama. File sumber tidak diubah dan tetap dapat diunduh; tata letak hasil konversi Word dapat sedikit berbeda dari aplikasi Word.
- Catatan revisi dokumen upload dicatat melalui panel telaah SIPANDA, bukan sebagai komentar/track changes yang ditanam ke file Word sumber.
- Tombol Setujui dan Minta Revisi aktif setelah OPD mengajukan dokumen hingga status **Menunggu Verifikasi**; draf menampilkan petunjuk untuk meminta OPD mengajukan terlebih dahulu.
- Dashboard OPD dan daftar Dokumen Perencanaan menyediakan tombol **Ajukan ke Admin** untuk draf. Draf upload harus memiliki berkas tersimpan, dan validasi kelengkapan template tetap dilakukan server sebelum masuk antrean verifikasi.
- Dashboard Admin hanya menghitung dokumen yang sudah diajukan pada statistik verifikasi; draf OPD lain tidak muncul di daftar Admin, sedangkan draf yang dibuat oleh Admin tetap dapat dibuka di dashboardnya.
- Lambang Kabupaten Cirebon pada halaman login dan sampul editor memakai berkas lambang resmi yang disediakan.
- Arsip dokumen sendiri hanya menampilkan dokumen berstatus Disetujui; draf, menunggu verifikasi, dan perlu revisi tidak masuk arsip

### Role Admin (Bapperida)
- Dashboard 4 kartu statistik: Total Usulan, Menunggu Telaah, Perlu Revisi, Disetujui
- Antrean verifikasi: telaah naskah → Setujui (TTE terbit) atau Minta Revisi (wajib catatan)
- Monitoring 58 OPD Kabupaten Cirebon: progres kelengkapan Renja Murni, Perubahan, Lampiran, RKPD
- Arsip Internal Bapperida: Perbup, Renja Definitif, KUA-PPAS, dengan sertifikasi BSrE BSSN
- Buat dan verifikasi dokumen untuk OPD mana pun

### Editor Template Dokumen
- Kanvas A4 nyata dengan margin 2 cm di semua sisi
- Halaman sampul otomatis: Lambang Kab. Cirebon, nama OPD, jenis dokumen, tahun
- Daftar Isi, Daftar Tabel, Daftar Gambar — semuanya otomatis
- BAB I s.d. BAB V terkunci sesuai Permendagri 86/2017
- Toolbar minim: Bold/Italic/Underline, rata teks, list, sisipkan tabel, sisipkan gambar, caption
- Autosave setiap 2 detik dengan indikator status cloud
- Ekspor DOCX via tombol (endpoint `/api/export/docx/:id`)
- Cetak/PDF via `window.print()` dengan CSS print-ready
- Mode read-only Admin saat verifikasi
- Panel navigasi bab + indikator % kelengkapan

### Lampiran Renja / Renstra Otomatis
- Lampiran Perbup Renja, Lampiran Kepbup Perubahan Renja, dan Lampiran Perbup Renstra dibuat otomatis dari dokumen induk; tidak ada aksi "Buat Baru".
- Tahun anggaran yang dipilih untuk filter tetap tersimpan setelah halaman dimuat ulang. Untuk tahun kalender berjalan, Renja Murni memakai tahun berikutnya (contoh 2026 → 2027), sedangkan Renja Perubahan memakai tahun berjalan; lampiran selalu mengikuti tahun dokumen induknya.
- Lampiran mengikuti perubahan dokumen induk sampai induk disetujui. Setelah disetujui, Super Admin dapat memakai aksi **Buat Ulang** secara eksplisit.
- Menu **Lampiran** menyediakan filter OPD/jenis/tahun, pratinjau, konfigurasi identitas peraturan, serta ekspor PDF dan DOCX.
- Hasil ekspor menggunakan kertas F4 (215 × 330 mm), margin 2 cm, Bookman Old Style 12 pt, tanpa bold maupun halaman depan; tabel Rancangan Renja memakai orientasi landscape.
- Nomor lampiran Romawi dan nama resmi OPD dikelola melalui **Pengaturan Dokumen** oleh Super Admin.
- Sebelum ekspor, sistem menampilkan pemeriksaan ukuran kertas, margin, font, teks tebal, elemen halaman terlarang, dan posisi blok penutup.
- Renja/Renstra yang diunggah sebagai DOCX dapat menjadi sumber lampiran: SIPANDA mengambil BAB I sampai BAB Penutup beserta sub-bab, tabel, dan gambar. Berkas PDF/DOC lama tidak diekstrak menjadi isi lampiran terformat.
- Draf upload tanpa berkas yang tersimpan dapat dilengkapi langsung melalui aksi **Unggah DOCX** pada daftar dokumen OPD.
- Menu **Pengaturan Dokumen** memuat standar format dokumen dan pengelolaan identitas OPD; menu administrasi sistem dipisahkan dari pengaturan dokumen.
- Jalankan `npm run db:seed-planning` dari `backend/` untuk menambahkan contoh idempoten Losari, Mundu, dan Renstra tanpa menghapus data yang sudah ada.

---

## 🗂️ Struktur Proyek

```
d:\SIPANDA\
├── start.bat                    ← Jalankan kedua server sekaligus
├── frontend/                    ← Vue 3 + Vite + TypeScript + Tailwind CSS
│   └── src/
│       ├── components/
│       │   ├── common/          ← SipandaLogo, KabCirebonLogo
│       │   ├── layout/          ← Sidebar, Navbar
│       │   ├── documents/       ← CreateDocumentModal
│       │   └── editor/          ← DocumentEditor (Word-like A4 Editor)
│       ├── stores/              ← Pinia: appStore.ts
│       ├── views/               ← AdminDashboard, OpdDashboard, Dokumen, Arsip, Monitoring, Verifikasi
│       ├── router/              ← Vue Router
│       └── types/               ← TypeScript types
└── backend/                     ← Node.js + Express REST API
    ├── server.js                ← API endpoints + DOCX generation (docx library)
    ├── db.json                  ← File-based persistent storage (otomatis dibuat)
    └── uploads/                 ← File upload storage (PDF/DOCX)
```

---

## 🔧 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend Framework** | Vue 3 + Composition API + Vite + TypeScript |
| **State Management** | Pinia |
| **Routing** | Vue Router 4 |
| **Styling** | Tailwind CSS 3 + Custom CSS |
| **Ikon** | @lucide/vue |
| **Backend** | Node.js + Express |
| **Storage** | JSON file (db.json) + Multer file uploads |
| **Export DOCX** | `docx` library (Node.js) |
| **Export PDF** | `window.print()` + CSS print media query |
| **Font Dokumen** | Bookman Old Style / Times New Roman (12pt) |
| **Font UI** | Inter (Google Fonts) |

---

## 📌 Dasar Hukum Implementasi

- Permendagri No. 86 Tahun 2017 (Sistematika Bab, Format Baku)
- UU No. 23 Tahun 2014 tentang Pemerintahan Daerah
- Margin dokumen A4: 2 cm pada sisi atas, kanan, bawah, dan kiri
- Font: Bookman Old Style 12pt, Spasi 1.5

---

## 🔐 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/health` | Status server |
| GET | `/api/auth/me` | Pengguna aktif |
| POST | `/api/auth/switch-user` | Ganti peran |
| GET | `/api/opds` | Daftar 58 OPD |
| GET | `/api/documents` | Semua dokumen (filter: jenis, tahun, status) |
| GET | `/api/documents/:id` | Detail dokumen |
| POST | `/api/documents` | Buat dokumen baru |
| PUT | `/api/documents/:id` | Update konten (autosave) |
| POST | `/api/documents/:id/submit` | Submit ke Admin |
| POST | `/api/documents/:id/verify` | Verifikasi (Admin only) |
| GET | `/api/stats/dashboard` | Statistik dashboard |
| GET | `/api/stats/monitoring` | Progress 58 OPD |
| GET | `/api/export/docx/:id` | Unduh DOCX |
