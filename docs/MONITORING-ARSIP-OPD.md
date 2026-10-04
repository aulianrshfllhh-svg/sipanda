# Monitoring arsip OPD

Implementasi memakai Vue 3 dan Tailwind sesuai aplikasi. `MonitoringOpd.vue` menyajikan daftar profil OPD yang dapat diklik, ringkasan empat jenis dokumen, panel detail arsip, filter, tabel metadata, dan dialog pratinjau PDF. Tombol profil bisa diakses dengan keyboard. Dialog memakai elemen native `dialog` untuk fokus dan tombol Escape.

State halaman:

| State | Nilai awal / fungsi |
| --- | --- |
| `year` | Tahun berjalan; dapat dibagikan melalui query `tahun` |
| `route.query.opd` | ID OPD yang sedang dibuka; kosong untuk daftar |
| Status | Tidak ada state/filter; backend selalu `Disetujui` |
| `matrixKind` | Murni; opsi Perubahan untuk subkategori matriks |
| `nextYear` | Computed `Number(year) + 1` |
| `activeCategory` | Renja Murni; opsi Renja Perubahan, Renstra, Lampiran Matriks |
| `search`, `opdCategory` | Filter daftar OPD |
| `opds` | Respons API bertipe `MonitoringOpd[]` |
| `loading`, `error`, `busy` | Status permintaan data dan aksi dokumen |
| `previewUrl` | URL blob PDF sementara; dilepas ketika dialog ditutup |

Kontrak tipe berada di `frontend/src/types/monitoring.ts`. Endpoint `GET /api/monitoring/archives?tahun=2026` mengembalikan `{tahun,status,opds}`. Setiap OPD berisi `categories` (jumlah approved), `approvedCount`, dan `documents` yang telah disetujui dan cocok konteks T.A.. Kategori tidak memasukkan RKPD. Jumlah OPD mengikuti database dan cakupan akses, bukan konstanta.

Setiap dokumen memuat judul, jenis, tahun, status, `verifiedAt`, `verifier`, `version`, `revisionCount`, dan ketersediaan sumber. Metadata verifikasi diambil dari catatan persetujuan. Versi memakai `DocumentVersion.versi` terakhir; jika tidak ada ditampilkan “Versi belum tercatat”. Jumlah revisi adalah jumlah permintaan revisi yang tercatat, bukan versi berkas yang dikarang. Lampiran otomatis hanya dianggap disetujui bila induknya juga disetujui; riwayat induk digunakan jika lampiran tidak memiliki catatan tersendiri.

Super Admin melihat semua OPD aktif. Staf dibatasi OPD penugasannya dan hak akses tahun dokumen asli (T+1, T, atau tahun Renstra); perubahan konteks monitoring tidak memperluas hak akses dokumen. Akun OPD tidak mengakses monitoring Bapperida. Pratinjau dan unduhan tetap memeriksa hak akses pada endpoint dokumen. Konteks T.A. T memuat Renja Murni dan Matriks Murni tahun T+1, Renja Perubahan dan Matriks Perubahan tahun T, serta Renstra dengan periodeMulai <= T <= periodeAkhir. Jika periode Renstra belum diisi, record hanya dianggap berlaku pada tahun record; sistem tidak menebak periode lima tahun. Lampiran Renstra tidak dicampur ke dua subkategori Matriks Renja. Lampiran lama tanpa jenis induk yang jelas tidak ditebak sebagai Murni/Perubahan.

Pratinjau unggahan memakai sumber lengkap; dokumen template/lampiran memakai ekspor PDF. Unduhan unggahan adalah berkas sumber PDF/Word asli, sedangkan dokumen template/lampiran diunduh sebagai PDF. Perubahan tahun membatalkan permintaan data lama agar respons lambat tidak menimpa filter terbaru. Tidak ada pesan pengingat fiktif atau pengiriman notifikasi otomatis.

Parameter `status` dari klien diabaikan. Query dokumen dan induk dikunci ke Disetujui; respons disaring ulang untuk persetujuan induk, periode, dan hak akses. Tidak ada hitungan dokumen draft/proses pada kartu OPD. Tahun target/periodenya ditampilkan pada tabel dan tab. Monitoring tidak membuat atau mengubah tahun dokumen sumber.
