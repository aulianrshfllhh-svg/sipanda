# Evaluasi Renja dan RKPD Triwulan

Kedua modul menggunakan tabel `evaluasi_triwulan` dan API `/api/evaluasi-triwulan`.
Berkas disimpan di luar direktori publik (default: `backend/private-uploads/evaluasi-triwulan`);
lokasi dapat diubah dengan `EVALUASI_UPLOAD_DIR`. Daftar hanya mengembalikan metadata,
sedangkan isi berkas disajikan melalui endpoint unduh yang memeriksa hak akses.

Unggahan menerima PDF, DOCX, dan XLSX hingga 20 MB. Penggantian membuat versi baru,
menonaktifkan versi sebelumnya, dan mempertahankan arsipnya. Aksi unggah, penggantian,
dan penonaktifan dicatat bersama identitas pelaku dan waktu pada log yang tersedia.

Untuk RKPD, Super Admin dan akun Bapperida dengan role `penyusun_rkpd` dapat mengunggah
atau mengganti berkas. Staf Bapperida lainnya hanya dapat melihat dan mengunduh;
penonaktifan hanya dapat dilakukan Super Admin. OPD tidak memiliki akses RKPD.
Super Admin dapat menetapkan role `Penyusun RKPD` saat membuat akun staf dari halaman
Pegawai & Penugasan.

Migration `202610110002_evaluation_active_unique` memasang unique index MySQL untuk
slot aktif per jenis, pemilik, tahun, dan triwulan. Kolom pemilik hasil-generate
mengubah `opd_id = NULL` menjadi satu sentinel RKPD, sehingga MySQL juga menolak
dua slot RKPD aktif yang sama. Baris historis nonaktif tetap dapat disimpan. Jangan
menghapus kolom generated atau index ini dengan `prisma db push`; terapkan migration
yang diperiksa melalui prosedur migration backend.
