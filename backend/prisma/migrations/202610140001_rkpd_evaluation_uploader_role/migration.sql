INSERT INTO roles (id, kode, label, deskripsi, created_at)
SELECT UUID(), 'penyusun_rkpd', 'Penyusun RKPD', 'Penyusun berkas Evaluasi RKPD Triwulan', NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE kode = 'penyusun_rkpd');
