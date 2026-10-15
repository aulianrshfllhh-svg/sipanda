-- MySQL-only guard: these generated columns and this unique index cannot be expressed in schema.prisma.
-- Prisma migrate dev and prisma db push can propose dropping them. Apply existing migrations with
-- prisma migrate deploy. For new migrations use prisma migrate dev --create-only, inspect the SQL,
-- and remove any DROP statements targeting active_marker, active_owner, or this index before applying.
ALTER TABLE evaluasi_triwulan ADD COLUMN active_owner VARCHAR(100) GENERATED ALWAYS AS (COALESCE(opd_id,'__rkpd__')) STORED, ADD COLUMN active_marker TINYINT GENERATED ALWAYS AS (IF(aktif,1,NULL)) STORED, ADD UNIQUE KEY evaluasi_triwulan_active_slot(jenis,active_owner,tahun,triwulan,active_marker);
