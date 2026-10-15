import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import multer from 'multer';
import JSZip from 'jszip';

const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};
const FILE_SIZE_LIMIT = 20 * 1024 * 1024;
const COLUMNS = 'id,jenis,opd_id AS opdId,tahun,triwulan,judul,catatan,file_path AS filePath,nama_file_asli AS namaFileAsli,mime,ukuran,versi,aktif,diunggah_oleh AS diunggahOleh,diunggah_pada AS diunggahPada';
const publicRecord = ({ filePath, ...record }) => ({ ...record, aktif: Boolean(record.aktif) });
const isBapperidaStaff = user => user?.role === 'staf' &&
  (user.roleKodes?.includes('staf_bapperida') || user.roleKodes?.includes('penyusun_rkpd'));

export function canAccessEvaluasiRkpd(user, isSuperAdmin) {
  return user?.role !== 'opd' && (isSuperAdmin(user) || isBapperidaStaff(user) || user?.roleKodes?.includes('penyusun_rkpd'));
}

export function canUploadEvaluasiRkpd(user, isSuperAdmin) {
  return user?.role !== 'opd' && (isSuperAdmin(user) || user?.roleKodes?.includes('penyusun_rkpd'));
}

export function isAllowedEvaluationFile(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  return Boolean(MIME_TYPES[extension] && MIME_TYPES[extension] === file.mimetype);
}

export async function isValidEvaluationFileContent(filename, bytes) {
  const extension = path.extname(filename || '').toLowerCase();
  if (extension === '.pdf') return bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'));
  if (extension !== '.docx' && extension !== '.xlsx') return false;
  try {
    const archive = await JSZip.loadAsync(bytes, { checkCRC32: false });
    const contentTypes = Boolean(archive.files['[Content_Types].xml']);
    const documentPart = extension === '.docx' ? 'word/document.xml' : 'xl/workbook.xml';
    return contentTypes && Boolean(archive.files[documentPart]);
  } catch {
    return false;
  }
}

export function registerEvaluasiTriwulan(app, prisma, auth, isSuperAdmin) {
  const directory = path.resolve(process.env.EVALUASI_UPLOAD_DIR || path.join(process.cwd(), 'private-uploads', 'evaluasi-triwulan'));
  fs.mkdirSync(directory, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: directory,
      filename: (req, file, callback) => callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
    }),
    limits: { fileSize: FILE_SIZE_LIMIT },
    fileFilter: (req, file, callback) => {
      if (!isAllowedEvaluationFile(file)) {
        return callback(new Error('Berkas harus PDF, DOCX, atau XLSX dengan tipe MIME yang sesuai'));
      }
      callback(null, true);
    }
  });

  const findRecords = async ({ jenis, tahun, opdId, opdIds, assignments, activeOnly = false }) => {
    const clauses = ['jenis = ?'];
    const values = [jenis];
    if (tahun) {
      clauses.push('tahun = ?');
      values.push(String(tahun));
    }
    if (opdIds) {
      if (!opdIds.length) return [];
      clauses.push(`opd_id IN (${opdIds.map(() => '?').join(',')})`);
      values.push(...opdIds);
    } else if (opdId !== undefined) {
      if (opdId === null) clauses.push('opd_id IS NULL');
      else {
        clauses.push('opd_id = ?');
        values.push(opdId);
      }
    }
    if (assignments) {
      const assignedSlots = assignments.map(() => '(opd_id = ? AND tahun = ?)');
      clauses.push(`(opd_id = 'bapperida'${assignedSlots.length ? ` OR ${assignedSlots.join(' OR ')}` : ''})`);
      for (const assignment of assignments) values.push(assignment.opdId, assignment.tahun);
    }
    if (activeOnly) clauses.push('aktif = 1');
    return prisma.$queryRawUnsafe(
      `SELECT ${COLUMNS} FROM evaluasi_triwulan WHERE ${clauses.join(' AND ')} ORDER BY tahun DESC,triwulan ASC,versi DESC`,
      ...values
    );
  };

  const findRecord = async (id, tx = prisma) =>
    (await tx.$queryRawUnsafe(`SELECT ${COLUMNS} FROM evaluasi_triwulan WHERE id = ? LIMIT 1`, id))[0] || null;

  const createRecord = async (tx, data) => {
    const id = randomUUID();
    await tx.$executeRawUnsafe(
      'INSERT INTO evaluasi_triwulan (id,jenis,opd_id,tahun,triwulan,judul,catatan,file_path,nama_file_asli,mime,ukuran,versi,aktif,diunggah_oleh,diunggah_pada) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      id, data.jenis, data.opdId, data.tahun, data.triwulan, data.judul, data.catatan, data.filePath,
      data.namaFileAsli, data.mime, data.ukuran, data.versi, true, data.diunggahOleh, new Date()
    );
    return findRecord(id, tx);
  };

  const logAction = async (tx, user, action, record) => {
    const target = `Evaluasi ${record.jenis === 'rkpd' ? 'RKPD' : 'Renja'} Triwulan ${record.triwulan} ${record.tahun}`;
    const detail = `${action} oleh ${user.nama || user.name || user.id} (${user.id}); berkas ${record.namaFileAsli}; versi ${record.versi}.`;
    const activityLogTable = await tx.$queryRawUnsafe(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'activity_logs' LIMIT 1"
    );
    if (activityLogTable.length) {
      return tx.activityLog.create({
        data: { docTitle: target, detail, tag: 'Evaluasi Triwulan', icon: 'file-check', color: 'blue' }
      });
    }
    return tx.penugasanLog.create({
      data: {
        userId: user.id,
        aksi: `EVALUASI_${action.toUpperCase().replaceAll(' ', '_')}`,
        target,
        keterangan: detail
      }
    });
  };

  const assignedSlots = async (user, year) => {
    const assignments = await prisma.penugasanVerifikasi.findMany({
      where: { userId: user.id },
      select: { opdId: true, tahun: true }
    });
    return assignments
      .filter(assignment => !year || assignment.tahun === String(year))
      .map(assignment => ({ opdId: assignment.opdId, tahun: assignment.tahun }));
  };

  const listRenja = async (user, requestedOpdId, year) => {
    if (isSuperAdmin(user)) return requestedOpdId ? { opdId: requestedOpdId } : {};
    if (user.role === 'opd') {
      if (!user.opdId) return null;
      if (requestedOpdId && requestedOpdId !== user.opdId) return null;
      return { opdId: user.opdId };
    }
    if (!isBapperidaStaff(user)) return null;
    const assignments = await assignedSlots(user, year);
    if (requestedOpdId) {
      if (requestedOpdId === 'bapperida') return { opdId: requestedOpdId };
      const matching = assignments.filter(assignment => assignment.opdId === requestedOpdId);
      if (!matching.length) return null;
      return { opdId: requestedOpdId, assignments: matching };
    }
    return { assignments };
  };

  const canSeeRecord = async (user, record) => {
    if (record.jenis === 'rkpd') return canAccessEvaluasiRkpd(user, isSuperAdmin);
    if (isSuperAdmin(user)) return true;
    if (user.role === 'opd') return Boolean(user.opdId && record.opdId === user.opdId);
    if (!isBapperidaStaff(user)) return false;
    if (record.opdId === 'bapperida') return true;
    return Boolean(await prisma.penugasanVerifikasi.findUnique({
      where: { userId_opdId_tahun: { userId: user.id, opdId: record.opdId, tahun: record.tahun } }
    }));
  };

  app.get('/api/evaluasi-triwulan', auth, async (req, res) => {
    try {
      const jenis = String(req.query.jenis || 'renja_pd');
      if (!['renja_pd', 'rkpd'].includes(jenis)) return res.status(400).json({ error: 'Jenis evaluasi tidak valid' });
      if (req.query.tahun && !/^\d{4}$/.test(String(req.query.tahun))) {
        return res.status(400).json({ error: 'Tahun tidak valid' });
      }

      let scope;
      if (jenis === 'rkpd') {
        if (!canAccessEvaluasiRkpd(req.currentUser, isSuperAdmin)) {
          return res.status(403).json({ error: 'Evaluasi RKPD hanya tersedia untuk Bapperida' });
        }
        scope = { opdId: null };
      } else {
        scope = await listRenja(req.currentUser, req.query.opdId ? String(req.query.opdId) : null, req.query.tahun);
        if (!scope) return res.status(403).json({ error: 'Anda tidak berwenang melihat evaluasi OPD ini' });
      }

      const rows = await findRecords({
        jenis,
        tahun: req.query.tahun,
        ...scope,
        activeOnly: req.query.riwayat !== 'true'
      });
      return res.json(rows.map(publicRecord));
    } catch (error) {
      console.error('Gagal memuat evaluasi triwulan:', error);
      return res.status(500).json({ error: 'Gagal memuat data evaluasi triwulan' });
    }
  });

  app.post('/api/evaluasi-triwulan', auth, (req, res, next) => upload.single('file')(req, res, error => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({
        error: status === 413 ? 'Ukuran berkas maksimal 20 MB' : error.message
      });
    }
    next();
  }), async (req, res) => {
    const user = req.currentUser;
    const { jenis = 'renja_pd', tahun, triwulan, judul, catatan } = req.body;
    const quarter = Number(triwulan);
    if (!['renja_pd', 'rkpd'].includes(jenis) || !/^\d{4}$/.test(String(tahun)) || ![1, 2, 3, 4].includes(quarter)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Jenis, tahun, atau triwulan tidak valid' });
    }
    if (!req.file) return res.status(400).json({ error: 'Berkas wajib dipilih' });

    let owner;
    if (jenis === 'rkpd') {
      if (!canUploadEvaluasiRkpd(user, isSuperAdmin)) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'Hanya Super Admin atau Penyusun RKPD yang dapat mengunggah' });
      }
      owner = null;
    } else {
      const bapperidaUser = isSuperAdmin(user) || isBapperidaStaff(user);
      owner = user.opdId || (bapperidaUser ? 'bapperida' : null);
      if (!owner || !['opd', 'staf'].includes(user.role) && !isSuperAdmin(user)) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'Akun tidak memiliki akses unggah evaluasi Renja' });
      }
      if (user.role === 'staf' && !isSuperAdmin(user) && owner !== 'bapperida') {
        const assigned = await prisma.penugasanVerifikasi.findUnique({
          where: { userId_opdId_tahun: { userId: user.id, opdId: owner, tahun: String(tahun) } }
        });
        if (!assigned) {
          fs.unlinkSync(req.file.path);
          return res.status(403).json({ error: 'Instansi tidak termasuk penugasan Anda' });
        }
      }
    }

    if (!await isValidEvaluationFileContent(req.file.originalname, await fs.promises.readFile(req.file.path))) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Isi berkas tidak sesuai dengan format PDF, DOCX, atau XLSX yang dipilih' });
    }

    const lockHash = createHash('sha256').update(JSON.stringify([jenis, owner, String(tahun), quarter])).digest('hex').slice(0, 56);
    const lockName = `eval:${lockHash}`;
    try {
      const result = await prisma.$transaction(async tx => {
        const lock = await tx.$queryRawUnsafe('SELECT GET_LOCK(?, 15) AS acquired', lockName);
        if (Number(lock?.[0]?.acquired) !== 1) throw new Error('Slot evaluasi sedang diproses; silakan unggah kembali.');
        try {
          const current = (await tx.$queryRawUnsafe(
            `SELECT ${COLUMNS} FROM evaluasi_triwulan WHERE jenis = ? AND ((opd_id = ?) OR (opd_id IS NULL AND ? IS NULL)) AND tahun = ? AND triwulan = ? AND aktif = 1 ORDER BY versi DESC LIMIT 1`,
            jenis, owner, owner, String(tahun), quarter
          ))[0] || null;
          await tx.$executeRawUnsafe(
            'UPDATE evaluasi_triwulan SET aktif = 0 WHERE jenis = ? AND ((opd_id = ?) OR (opd_id IS NULL AND ? IS NULL)) AND tahun = ? AND triwulan = ? AND aktif = 1',
            jenis, owner, owner, String(tahun), quarter
          );
          const record = await createRecord(tx, {
            jenis, opdId: owner, tahun: String(tahun), triwulan: quarter, judul: judul || null, catatan: catatan || null,
            filePath: req.file.path, namaFileAsli: path.basename(req.file.originalname), mime: req.file.mimetype,
            ukuran: req.file.size, versi: (current?.versi || 0) + 1, diunggahOleh: user.id
          });
          await logAction(tx, user, current ? 'Mengganti evaluasi' : 'Mengunggah evaluasi', record);
          return record;
        } finally {
          await tx.$queryRawUnsafe('SELECT RELEASE_LOCK(?)', lockName);
        }
      });
      return res.json(publicRecord(result));
    } catch (error) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error('Gagal menyimpan evaluasi triwulan:', error);
      return res.status(409).json({ error: error.message || 'Gagal menyimpan evaluasi triwulan' });
    }
  });

  app.get('/api/evaluasi-triwulan/:id/download', auth, async (req, res) => {
    try {
      const row = await findRecord(req.params.id);
      if (!row) return res.status(404).json({ error: 'Berkas tidak ditemukan' });
      if (!await canSeeRecord(req.currentUser, row)) return res.status(403).json({ error: 'Akses berkas ditolak' });
      if (!fs.existsSync(row.filePath)) return res.status(404).json({ error: 'Berkas tidak ditemukan di penyimpanan' });
      return res.download(row.filePath, row.namaFileAsli);
    } catch (error) {
      console.error('Gagal mengunduh evaluasi triwulan:', error);
      return res.status(500).json({ error: 'Gagal mengunduh berkas evaluasi' });
    }
  });

  app.delete('/api/evaluasi-triwulan/:id', auth, async (req, res) => {
    if (!isSuperAdmin(req.currentUser)) return res.status(403).json({ error: 'Hanya Super Admin yang dapat menonaktifkan evaluasi' });
    try {
      const row = await findRecord(req.params.id);
      if (!row) return res.status(404).json({ error: 'Berkas tidak ditemukan' });
      if (!row.aktif) return res.json({ success: true });
      await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe('UPDATE evaluasi_triwulan SET aktif = 0 WHERE id = ?', row.id);
        await logAction(tx, req.currentUser, 'Menonaktifkan evaluasi', row);
      });
      return res.json({ success: true });
    } catch (error) {
      console.error('Gagal menonaktifkan evaluasi triwulan:', error);
      return res.status(500).json({ error: 'Gagal menonaktifkan evaluasi triwulan' });
    }
  });
}
