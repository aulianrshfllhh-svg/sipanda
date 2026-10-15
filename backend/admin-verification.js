// backend/admin-verification.js
// SIPANDA — Modul Verifikasi Tahap 1 & Verifikasi Final
// Bapperida Kabupaten Cirebon

import { completeFormatReport } from './document-format.js';

export async function getBatasHariVerifikasi(prisma) {
  try {
    const globalSettings = await prisma.documentSettings.findUnique({ where: { id: 'global' } });
    const batas = Number(globalSettings?.data?.batasHariVerifikasi);
    return !isNaN(batas) && batas > 0 ? batas : 3;
  } catch (err) {
    return 3;
  }
}

function calculateWaitingDays(date) {
  if (!date) return 0;
  const now = new Date();
  const past = new Date(date);
  const diffTime = Math.max(0, now.getTime() - past.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function formatWaitingText(days) {
  if (days <= 0) return 'Hari ini';
  if (days === 1) return '1 hari lalu';
  return `${days} hari lalu`;
}

export function registerAdminVerificationRoutes(app, prisma, authMiddleware, isSuperAdmin, writeDocumentStatusLog) {
  // GET /api/admin/verification-summary
  app.get('/api/admin/verification-summary', authMiddleware, async (req, res) => {
    const user = req.currentUser;
    if (!isSuperAdmin(user) && user?.role !== 'staf') {
      return res.status(403).json({ error: 'Hanya Admin/Staf Bapperida yang memiliki akses ke dashboard verifikasi' });
    }

    try {
      const batasHari = await getBatasHariVerifikasi(prisma);
      const tahunParam = String(req.query.tahun || 'all');
      const opdParam = String(req.query.opdId || 'all');
      const jenisParam = String(req.query.jenis || 'all');
      if (tahunParam !== 'all' && !/^\d{4}$/.test(tahunParam)) {
        return res.status(400).json({ error: 'Tahun verifikasi harus berupa tahun empat digit yang valid' });
      }

      // 1. Dapatkan daftar penugasan staf
      const allAssignments = await prisma.penugasanVerifikasi.findMany({
        where: isSuperAdmin(user) ? undefined : {
          userId: user.id,
          ...(tahunParam !== 'all' ? { tahun: tahunParam } : {})
        },
        include: { user: { select: { id: true, nama: true, jabatan: true } } }
      });

      // Filter hak akses untuk staf biasa
      let allowedOpdIds = null;
      if (!isSuperAdmin(user)) {
        allowedOpdIds = [...new Set(allAssignments.map(a => a.opdId))];
      }

      // 2. Query dokumen utama
      const whereCondition = {
        parentId: null,
        isLampiranOtomatis: false,
        opdId: { not: 'bapperida' }
      };

      if (tahunParam !== 'all' && /^\d{4}$/.test(tahunParam)) {
        whereCondition.tahun = tahunParam;
      }
      if (opdParam !== 'all') {
        whereCondition.opdId = opdParam;
      }
      if (jenisParam !== 'all') {
        whereCondition.jenis = jenisParam;
      }

      // Batasi untuk verifikator biasa
      if (allowedOpdIds !== null) {
        whereCondition.opdId = { in: allowedOpdIds };
      }

      const documents = await prisma.document.findMany({
        where: whereCondition,
        include: {
          verifications: { orderBy: { createdAt: 'desc' }, take: 5 },
          statusLogs: { orderBy: { waktu: 'desc' }, take: 10 }
        },
        orderBy: [{ updatedAt: 'desc' }]
      });

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Helper untuk mencari verifikator bertugas
      const getAssignedVerifier = (opdId, tahun) => {
        const found = allAssignments.find(a => a.opdId === opdId && (a.tahun === tahun || a.tahun === String(currentYear)));
        return found ? found.user?.nama : 'Belum Ditugaskan';
      };

      // Helper untuk mencari tanggal pengajuan (ke Menunggu Verifikasi)
      const getSubmissionDate = (doc) => {
        const log = doc.statusLogs?.find(l => l.ke === 'Menunggu Verifikasi');
        return log ? new Date(log.waktu) : new Date(doc.updatedAt || doc.createdAt);
      };

      // Helper untuk mencari tanggal persetujuan Verifikasi 1 (ke Disetujui Bapperida)
      const getApproval1Date = (doc) => {
        const v = doc.verifications?.find(v => v.status === 'Disetujui Bapperida');
        if (v) return new Date(v.createdAt);
        const log = doc.statusLogs?.find(l => l.ke === 'Disetujui Bapperida');
        return log ? new Date(log.waktu) : new Date(doc.updatedAt);
      };

      // Helper verifikator 1
      const getVerifier1Name = (doc) => {
        return doc.verifierName || getAssignedVerifier(doc.opdId, doc.tahun);
      };

      // Helper cek koreksi setelah disetujui Bapperida
      const checkHasCorrection = (doc) => {
        return doc.statusLogs?.some(l => l.dari === 'Disetujui Bapperida' && (l.perubahan || l.alasan?.toLowerCase().includes('koreksi')));
      };

      // 3. Klasifikasi Antrean & Pipeline
      const antreanVerifikasi1 = [];
      const antreanVerifikasiFinal = [];

      let countDraft = 0;
      let countMenunggu1 = 0;
      let countMenunggu1Overdue = 0;
      let countMenungguFinal = 0;
      let countMenungguFinalOverdue = 0;
      let countRevisi = 0;
      let countFinal = 0;
      let countFinalBulanIni = 0;
      let countFinalTahunIni = 0;

      for (const doc of documents) {
        if (doc.status === 'Draft') {
          countDraft++;
        } else if (doc.status === 'Menunggu Verifikasi') {
          countMenunggu1++;
          const submissionDate = getSubmissionDate(doc);
          const daysWaiting = calculateWaitingDays(submissionDate);
          const isOverdue = daysWaiting >= batasHari;
          if (isOverdue) countMenunggu1Overdue++;

          antreanVerifikasi1.push({
            id: doc.id,
            kodeDoc: doc.kodeDoc,
            judul: doc.judul,
            subJudul: doc.subJudul,
            jenis: doc.jenis,
            tahun: doc.tahun,
            opdId: doc.opdId,
            opdName: doc.opdName,
            status: doc.status,
            tanggalDiajukan: submissionDate.toISOString(),
            lamaMenungguHari: daysWaiting,
            lamaMenungguText: formatWaitingText(daysWaiting),
            isOverdue,
            verifikatorBertugas: getAssignedVerifier(doc.opdId, doc.tahun),
            cara: doc.cara,
            canVerify: isSuperAdmin(user) || (allowedOpdIds && allowedOpdIds.includes(doc.opdId))
          });
        } else if (doc.status === 'Disetujui Bapperida') {
          countMenungguFinal++;
          const approvalDate = getApproval1Date(doc);
          const daysWaiting = calculateWaitingDays(approvalDate);
          const isOverdue = daysWaiting >= batasHari;
          if (isOverdue) countMenungguFinalOverdue++;
          const hasCorrection = checkHasCorrection(doc);

          antreanVerifikasiFinal.push({
            id: doc.id,
            kodeDoc: doc.kodeDoc,
            judul: doc.judul,
            subJudul: doc.subJudul,
            jenis: doc.jenis,
            tahun: doc.tahun,
            opdId: doc.opdId,
            opdName: doc.opdName,
            status: doc.status,
            disetujuiOleh: getVerifier1Name(doc),
            tanggalDisetujui: approvalDate.toISOString(),
            lamaMenungguHari: daysWaiting,
            lamaMenungguText: formatWaitingText(daysWaiting),
            isOverdue,
            hasCorrection,
            cara: doc.cara,
            tteNumber: doc.tteNumber,
            canFinalize: isSuperAdmin(user)
          });
        } else if (doc.status === 'Perlu Revisi') {
          countRevisi++;
        } else if (doc.status === 'Final') {
          countFinal++;
          const finalDate = doc.finalizedAt ? new Date(doc.finalizedAt) : new Date(doc.updatedAt);
          if (finalDate.getFullYear() === currentYear) {
            countFinalTahunIni++;
            if (finalDate.getMonth() === currentMonth) {
              countFinalBulanIni++;
            }
          }
        }
      }

      // Urutkan antrean: Antrean Verifikasi Final diurutkan dari yang paling lama menunggu (daysWaiting descending)
      antreanVerifikasiFinal.sort((a, b) => b.lamaMenungguHari - a.lamaMenungguHari);
      antreanVerifikasi1.sort((a, b) => b.lamaMenungguHari - a.lamaMenungguHari);

      // 4. Ringkasan per OPD (Khusus Super Admin)
      let opdSummary = [];
      if (isSuperAdmin(user)) {
        const opds = await prisma.opd.findMany({
          where: { id: { not: 'bapperida' }, isActive: true },
          orderBy: { nama: 'asc' }
        });

        const opdMap = new Map();
        for (const opd of opds) {
          opdMap.set(opd.id, {
            opdId: opd.id,
            opdName: opd.nama,
            singkatan: opd.singkatan,
            draft: 0,
            menunggu1: 0,
            revisi: 0,
            menungguFinal: 0,
            final: 0,
            total: 0
          });
        }

        for (const doc of documents) {
          if (opdMap.has(doc.opdId)) {
            const entry = opdMap.get(doc.opdId);
            entry.total++;
            if (doc.status === 'Draft') entry.draft++;
            else if (doc.status === 'Menunggu Verifikasi') entry.menunggu1++;
            else if (doc.status === 'Perlu Revisi') entry.revisi++;
            else if (doc.status === 'Disetujui Bapperida') entry.menungguFinal++;
            else if (doc.status === 'Final') entry.final++;
          }
        }

        opdSummary = Array.from(opdMap.values());
      }

      res.json({
        success: true,
        batasHariVerifikasi: batasHari,
        counts: {
          menungguVerifikasi1: countMenunggu1,
          menungguVerifikasi1Overdue: countMenunggu1Overdue,
          menungguVerifikasiFinal: countMenungguFinal,
          menungguVerifikasiFinalOverdue: countMenungguFinalOverdue,
          perluRevisi: countRevisi,
          final: countFinal,
          finalBulanIni: countFinalBulanIni,
          finalTahunIni: countFinalTahunIni
        },
        pipeline: {
          draft: countDraft,
          menungguVerifikasi1: countMenunggu1,
          perluRevisi: countRevisi,
          menungguVerifikasiFinal: countMenungguFinal,
          final: countFinal
        },
        antreanVerifikasi1,
        antreanVerifikasiFinal,
        opdSummary,
        isSuperAdmin: isSuperAdmin(user)
      });
    } catch (err) {
      console.error('Failed to get verification summary:', err);
      res.status(500).json({ error: 'Gagal mengambil data ringkasan verifikasi' });
    }
  });

  // GET /api/admin/verification-timeline/:id
  app.get('/api/admin/verification-timeline/:id', authMiddleware, async (req, res) => {
    const user = req.currentUser;
    if (!isSuperAdmin(user) && user?.role !== 'staf') {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    try {
      const doc = await prisma.document.findUnique({
        where: { id: req.params.id },
        include: {
          sections: { orderBy: { babOrder: 'asc' } },
          statusLogs: { orderBy: { waktu: 'asc' } },
          verifications: {
            include: { verifier: { select: { id: true, nama: true, jabatan: true } } },
            orderBy: { createdAt: 'asc' }
          },
          createdBy: { select: { id: true, nama: true, jabatan: true } },
          opd: true
        }
      });

      if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });

      // Cek hak akses staf biasa
      if (!isSuperAdmin(user)) {
        const assignment = await prisma.penugasanVerifikasi.findUnique({
          where: { userId_opdId_tahun: { userId: user.id, opdId: doc.opdId, tahun: doc.tahun } }
        });
        if (!assignment) {
          return res.status(403).json({ error: 'Dokumen ini bukan termasuk penugasan Anda' });
        }
      }

      // Format timeline events
      const events = [];

      // 1. Pembuatan Dokumen
      events.push({
        type: 'created',
        title: 'Dokumen Dibuat',
        actor: doc.createdBy?.nama || 'Operator OPD',
        role: 'Penyusun Dokumen',
        timestamp: doc.createdAt,
        detail: `Dibuat menggunakan metode ${doc.cara === 'template' ? 'Template Baku Permendagri 86/2017' : 'Upload Berkas Mandiri'}`
      });

      // 2. Status Logs & Pengajuan / Koreksi
      for (const log of doc.statusLogs || []) {
        if (log.ke === 'Menunggu Verifikasi') {
          events.push({
            type: 'submission',
            title: 'Pengajuan Verifikasi (Tahap 1)',
            actor: log.oleh || 'Operator OPD',
            role: 'Perangkat Daerah',
            timestamp: log.waktu,
            detail: log.alasan || 'Dokumen diajukan untuk proses Verifikasi 1 Bapperida.'
          });
        } else if (log.dari === 'Disetujui Bapperida' && log.ke === 'Disetujui Bapperida') {
          events.push({
            type: 'correction',
            title: 'Koreksi Naskah Pasca-Persetujuan Verifikasi 1',
            actor: log.oleh || 'Bapperida',
            role: 'Bapperida',
            timestamp: log.waktu,
            detail: log.alasan || 'Pembaruan narasi / data oleh verifikator.',
            changes: log.perubahan
          });
        }
      }

      // 3. Verifikasi tercatat
      for (const v of doc.verifications || []) {
        if (v.status === 'Disetujui Bapperida') {
          events.push({
            type: 'verification1',
            title: 'Persetujuan Verifikasi 1 (Disetujui Bapperida)',
            actor: v.verifier?.nama || doc.verifierName || 'Verifikator Bapperida',
            role: v.verifier?.jabatan || 'Verifikator Desk Bapperida',
            timestamp: v.createdAt,
            detail: 'Dokumen memenuhi syarat Verifikasi Tahap 1 dan siap untuk Verifikasi Final.',
            tteNumber: v.tteNumber
          });
        } else if (v.status === 'Perlu Revisi') {
          events.push({
            type: 'revision_requested',
            title: 'Catatan Revisi Verifikasi',
            actor: v.verifier?.nama || 'Verifikator Bapperida',
            role: v.verifier?.jabatan || 'Verifikator Bapperida',
            timestamp: v.createdAt,
            detail: v.catatanRevisi || 'Perlu perbaikan sesuai catatan telaah.'
          });
        } else if (v.status === 'Final') {
          events.push({
            type: 'finalized',
            title: 'Persetujuan Verifikasi Final',
            actor: v.verifier?.nama || 'Super Admin PPEPD',
            role: 'Kepala Bidang PPEPD',
            timestamp: v.createdAt,
            detail: 'Dokumen disetujui final, dikunci permanen, dan diterbitkan ke Arsip OPD.'
          });
        }
      }

      // Urutkan event berdasarkan timestamp
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Laporan Cek Format
      let formatReport = null;
      try {
        formatReport = await completeFormatReport(doc);
      } catch (fErr) {
        console.error('Format report calculation error:', fErr);
      }

      const hasCorrection = doc.statusLogs?.some(l => l.dari === 'Disetujui Bapperida' && (l.perubahan || l.alasan?.toLowerCase().includes('koreksi')));

      res.json({
        document: {
          id: doc.id,
          kodeDoc: doc.kodeDoc,
          judul: doc.judul,
          subJudul: doc.subJudul,
          jenis: doc.jenis,
          tahun: doc.tahun,
          status: doc.status,
          cara: doc.cara,
          opdId: doc.opdId,
          opdName: doc.opdName,
          verifierName: doc.verifierName,
          verifierJabatan: doc.verifierJabatan,
          tteNumber: doc.tteNumber,
          catatanRevisi: doc.catatanRevisi,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          sections: doc.sections
        },
        timeline: events,
        formatReport,
        hasCorrection,
        isSuperAdmin: isSuperAdmin(user)
      });
    } catch (err) {
      console.error('Failed to get verification timeline:', err);
      res.status(500).json({ error: 'Gagal mengambil riwayat verifikasi dokumen' });
    }
  });

  // POST /api/documents/:id/return-to-verifier
  app.post('/api/documents/:id/return-to-verifier', authMiddleware, async (req, res) => {
    const user = req.currentUser;
    if (!isSuperAdmin(user)) {
      return res.status(403).json({ error: 'Hanya Super Admin PPEPD yang dapat mengembalikan dokumen ke verifikator' });
    }

    const catatan = String(req.body.catatan || req.body.catatanRevisi || '').trim();
    if (!catatan) {
      return res.status(400).json({ error: 'Catatan pengembalian ke verifikator wajib diisi' });
    }

    try {
      const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
      if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
      if (doc.status !== 'Disetujui Bapperida') {
        return res.status(409).json({ error: 'Hanya dokumen berstatus Disetujui Bapperida yang dapat dikembalikan ke verifikator' });
      }

      await prisma.$transaction(async tx => {
        // Kembalikan status ke Menunggu Verifikasi
        await tx.document.update({
          where: { id: doc.id },
          data: {
            status: 'Menunggu Verifikasi',
            catatanRevisi: catatan,
            updatedAt: new Date()
          }
        });

        // Catat status log
        await writeDocumentStatusLog(tx, {
          documentId: doc.id,
          dari: 'Disetujui Bapperida',
          ke: 'Menunggu Verifikasi',
          oleh: user.id,
          alasan: `Dikembalikan oleh Super Admin untuk verifikasi ulang: ${catatan}`
        });

        // Buat verifikasi record
        await tx.verification.create({
          data: {
            documentId: doc.id,
            verifierId: user.id,
            status: 'Menunggu Verifikasi',
            catatanRevisi: catatan,
            verifikasiTahap: 2
          }
        });

        // Kirim notifikasi ke penugasan verifikator terkait dan OPD
        const assignment = await tx.penugasanVerifikasi.findFirst({
          where: { opdId: doc.opdId, tahun: doc.tahun }
        });

        if (assignment) {
          await tx.notification.create({
            data: {
              opdId: 'bapperida',
              senderId: user.id,
              title: 'Dokumen Dikembalikan ke Verifikator',
              message: `${doc.judul} dikembalikan oleh Super Admin untuk dikoreksi/diverifikasi ulang: "${catatan}"`
            }
          });
        }

        await tx.notification.create({
          data: {
            opdId: doc.opdId,
            senderId: user.id,
            title: 'Verifikasi Ulang Dokumen',
            message: `${doc.judul} dikembalikan oleh Bapperida ke tahap verifikasi: "${catatan}"`
          }
        });

        await tx.activityLog.create({
          data: {
            documentId: doc.id,
            docTitle: doc.judul,
            detail: `Dokumen dikembalikan ke Verifikator oleh Super Admin (${user.name}): "${catatan.substring(0, 60)}..."`,
            tag: doc.opdName,
            badge: 'Dikembalikan ke Verifikator',
            icon: 'alert-circle',
            color: 'amber'
          }
        });
      });

      res.json({ success: true, message: 'Dokumen berhasil dikembalikan ke verifikator untuk verifikasi ulang' });
    } catch (err) {
      console.error('Failed to return document to verifier:', err);
      res.status(500).json({ error: 'Gagal mengembalikan dokumen ke verifikator' });
    }
  });
}
