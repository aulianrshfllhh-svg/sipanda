# Format Lampiran Perbup/Kepbup dari dokumen Renja yang diunggah

Lampiran untuk sumber PDF/DOCX memakai berkas induk, bukan rekonstruksi dari `DocumentSection`. Dokumen yang dibuat dengan template tetap memakai renderer template.

## Telaah dokumen induk oleh Bapperida

`/api/documents/:id/source-preview` menampilkan dokumen unggahan lengkap. PDF dikirim persis sesuai byte sumber; DOC/DOCX dikonversi langsung ke PDF melalui mesin Word/LibreOffice. Cover, kata pengantar, daftar isi, daftar tabel, isi BAB, serta penutup tidak dibuat ulang dengan template aplikasi. Dokumen induk juga tidak mengikuti penghapusan bold khusus lampiran. Jika sumber hilang, telaah menampilkan kesalahan, tanpa menggantinya dengan template.

Editor telaah menampilkan PDF melalui URL blob pada iframe, sehingga tabel asli tidak melewati pembagi halaman HTML SIPANDA. Hak akses dokumen diperiksa sebelum konversi. Respons memakai `private, no-store` agar revisi yang diunggah tidak tertukar dengan tampilan versi sebelumnya. Berkas sumber tidak ditimpa dan keputusan telaah tetap dicatat terpisah.

- Bagian sebelum BAB I PENDAHULUAN dibuang. Deteksi membedakan judul BAB dari daftar isi dan uraian Sistematika Penulisan.
- Blok pembuka menggunakan nomor Romawi OPD dan pengaturan peraturan lampiran. Tidak ditambahkan daftar isi atau penutup baru.
- PDF: halaman pertama mengambil isi asli mulai BAB I. Bila ruang blok pembuka tidak cukup, hanya isi halaman pertama diperkecil secara proporsional, tanpa pemotongan isi. Halaman selanjutnya disalin utuh, termasuk ukuran, orientasi, tabel dan gambar. Unduhan tersedia sebagai PDF.
- DOCX: bagian XML sebelum BAB I diganti dengan blok pembuka. Isi berikutnya, tabel, gambar, relasi, gaya dan pengaturan dokumen dipertahankan. Word dapat mengalirkan ulang halaman karena penambahan blok. Unduhan tersedia sebagai DOCX dan PDF.
- Ukuran kertas, header/footer dan penutup isi mengikuti sumber unggahan. Seluruh teks yang dapat diedit dinormalisasi tanpa bold, termasuk judul BAB, tabel, gaya bawaan, dan teks kompleks. Sistem tidak menggandakan tanda tangan. Teks yang sudah menyatu dalam gambar/pindaian bukan teks PDF/DOCX dan perlu diperbaiki pada sumber gambarnya.
- PDF memakai normalisasi teks saja dengan PyMuPDF: teks bold diganti huruf normal pada posisi dan lebar semula; garis tabel, latar, gambar, ukuran dan orientasi halaman tetap dipertahankan. PDF tanpa bold tidak ditulis ulang oleh tahap normalisasi. Referensi teknis: [redaksi khusus teks PyMuPDF](https://pymupdf.readthedocs.io/en/latest/page.html#Page.apply_redactions).
- PDF pindai tanpa teks, dokumen tanpa BAB I yang dapat dikenali, dan format `.doc` tidak diproses menjadi lampiran kosong. Pesan kesalahan meminta sumber PDF dengan teks atau DOCX yang sesuai.
- Berkas asli tidak ditimpa. Lampiran lama juga memakai alur ini ketika dibuka atau diunduh, tanpa perlu mengunggah ulang PDF/DOCX yang sudah tersimpan.

## Konversi DOCX ke PDF

Normalisasi PDF memerlukan Python dan `python -m pip install -r backend/requirements.txt` dari direktori proyek. Jika Python tidak ada pada PATH, set `PYTHON_PATH` ke executable Python. Kegagalan normalisasi menghentikan ekspor dengan pesan kesalahan, bukan mengeluarkan lampiran yang masih bold.

Windows memakai Microsoft Word melalui `convert-word.ps1`, dengan makro dan pembaruan tautan dimatikan. Konversi diserialkan dan memakai direktori sementara terpisah. Untuk LibreOffice, atur `SOFFICE_PATH` ke executable `soffice`; pada Linux defaultnya `soffice` di PATH. Tidak ada layanan konversi eksternal. DOCX tetap bisa diunduh tanpa mesin konversi PDF.

## Verifikasi

- `cd backend; npm test`: regresi deteksi BAB I, sumber DOCX, konten stream PDF dan orientasi halaman, serta penolakan sumber tanpa BAB I.
- `cd backend; node test-annex-source-api.mjs`: server lokal dan akun demo diperlukan; membuat lalu menghapus dokumen uji sendiri. Menguji unggah PDF/DOCX, kesiapan lampiran, validasi, pratinjau browser, ekspor, dan penolakan akses OPD lain.
- `cd frontend; npm run build`.
- Referensi Kecamatan Depok: hasil 74 halaman; seluruh 73 halaman setelah pembuka dibandingkan dengan raster sumber dan identik.
