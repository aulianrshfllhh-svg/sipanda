// server.js — SIPANDA Backend (Prisma + MySQL)
// Bapperida Kabupaten Cirebon
import 'dotenv/config';
import { ANNEX_DOCUMENT_TYPES, syncLampiran as synchronizeLampiran } from './lampiran.js';
import { importDocxSections } from './document-import.js';
import { sourceDocx, pdfBodyStart } from './annex-source.js';
import { registerExportRoutes } from './document-export.js';
import { registerMonitoringArchives } from './monitoring-archives.js';
import { cleanHtml } from './document-render.js';
import { normalizeTable } from '../shared/document-tables.js';
import { registerTableRoutes } from './document-tables.js';
import { documentSettings, registerSettingsRoutes } from './document-settings.js';
import { canonicalType, instantiate, ensureTemplates, registerTemplateRoutes } from './templates.js';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app    = express();
const prisma = new PrismaClient();
const syncLampiran = (parent, force = false) => synchronizeLampiran(prisma, parent, force);
const PORT   = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-ganti-di-env';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));
app.use('/api/document-assets', express.static(path.join(__dirname, '../shared')));

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage });

// ─── Auth middleware ─────────────────────────────────────────────────────────
// Decode JWT token jika ada, tapi tidak wajib (bisa jalan tanpa login untuk demo)
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Silakan login terlebih dahulu' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { roles: { include: { role: true } }, opd: true }
    });
    if (!user?.isActive) return res.status(401).json({ error: 'Sesi tidak valid atau akun nonaktif' });
    req.currentUser = buildUserProfile(user);
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesi tidak valid atau kedaluwarsa' });
    }
    console.error('Failed to authenticate request:', err);
    return res.status(503).json({ error: 'Layanan autentikasi tidak tersedia' });
  }
}

function buildUserProfile(user) {
  const roleKodes = user.roles?.map(r => r.role.kode) || [];
  const primaryRole = roleKodes.includes('super_admin') ? 'admin'
    : roleKodes.includes('staf_bapperida') ? 'staf'
    : 'opd';
  const roleLabel = roleKodes.includes('super_admin') ? 'BAPPERIDA (SUPER ADMIN)'
    : roleKodes.includes('staf_bapperida') ? 'STAF BAPPERIDA'
    : 'PERANGKAT DAERAH (OPD)';
  return {
    id:       user.id,
    username: user.username,
    name:     user.nama,
    nama:     user.nama,
    nip:      user.nip,
    jabatan:  user.jabatan,
    singkatan:user.singkatan,
    avatar:   user.avatar,
    opdId:    user.opdId,
    opdName:  user.opd?.nama || user.nama,
    role:     primaryRole,
    roleLabel,
    roleKodes,
    isSuperAdmin: roleKodes.includes('super_admin'),
  };
}

const OPD_DOCUMENT_TYPES = ['Renja Murni', 'Renja Perubahan', 'Renstra', 'Renstra Murni', 'Renstra Perubahan'];
const STAFF_DOCUMENT_TYPES = ['Renja Murni', 'Renja Perubahan'];
const RKPD_DOCUMENT_TYPES = ['RKPD', 'RKPD Murni', 'RKPD Perubahan'];

const isSuperAdmin = user => user?.roleKodes?.includes('super_admin') === true;
const isRkpdDocument = jenis => RKPD_DOCUMENT_TYPES.includes(jenis);

function denyUnlessSuperAdmin(req, res) {
  if (isSuperAdmin(req.currentUser)) return false;
  res.status(403).json({ error: 'Fitur ini hanya dapat dikelola oleh Super Admin PPEPD' });
  return true;
}

const isCollaborativeDocument = doc => isRkpdDocument(doc.jenis) || (doc.opdId === 'bapperida' && ['Renja Murni', 'Renja Perubahan'].includes(doc.jenis));

async function getDocumentPermissions(user, doc) {
  if (doc.isLampiranOtomatis && doc.parentId) {
    const parent = await prisma.document.findUnique({ where: { id: doc.parentId }, include: { sections: true } });
    if (!parent) return { canView: false, canEdit: false, canVerify: false, editableBabIds: [] };
    const permissions = await getDocumentPermissions(user, parent);
    return { ...permissions, canEdit: false, canVerify: false, editableBabIds: [] };
  }
  const allBabIds = doc.sections?.map(section => section.babId || section.id) || [];
  if (isSuperAdmin(user)) {
    const canEdit = doc.createdById === user.id && ['Draft', 'Perlu Revisi'].includes(doc.status);
    return {
      canView: true,
      canEdit,
      canVerify: doc.status === 'Menunggu Verifikasi',
      editableBabIds: canEdit ? allBabIds : []
    };
  }

  if (user.role === 'opd') {
    const canView = user.opdId === doc.opdId && OPD_DOCUMENT_TYPES.includes(doc.jenis);
    return {
      canView,
      canEdit: canView && ['Draft', 'Perlu Revisi'].includes(doc.status),
      canVerify: false,
      editableBabIds: canView && ['Draft', 'Perlu Revisi'].includes(doc.status) ? allBabIds : []
    };
  }

  if (user.role !== 'staf') {
    return { canView: false, canEdit: false, canVerify: false, editableBabIds: [] };
  }

  const verificationAssignment = await prisma.penugasanVerifikasi.findUnique({
    where: { userId_opdId_tahun: { userId: user.id, opdId: doc.opdId, tahun: doc.tahun } }
  });
  const chapterAssignments = await prisma.penugasanBabRkpd.findMany({
    where: { userId: user.id, documentId: doc.id },
    select: { babId: true }
  });
  const isAssignedRkpd = isCollaborativeDocument(doc) && chapterAssignments.length > 0;
  const canEditOwnDocument = doc.createdById === user.id && !isCollaborativeDocument(doc);
  const editableBabIds = isAssignedRkpd
    ? chapterAssignments.map(item => item.babId)
    : canEditOwnDocument ? allBabIds : [];
  const canVerify = !isRkpdDocument(doc.jenis) && Boolean(verificationAssignment) && doc.status === 'Menunggu Verifikasi';
  return {
    canView: isCollaborativeDocument(doc)
      ? isAssignedRkpd
      : Boolean(verificationAssignment) || doc.createdById === user.id,
    canEdit: editableBabIds.length > 0 && ['Draft', 'Perlu Revisi'].includes(doc.status),
    canVerify,
    editableBabIds
  };
}

registerTemplateRoutes(app, prisma, authMiddleware, denyUnlessSuperAdmin);
registerSettingsRoutes(app, prisma, authMiddleware, isSuperAdmin);
registerTableRoutes(app, authMiddleware);
registerExportRoutes(app, prisma, authMiddleware, getDocumentPermissions);
registerMonitoringArchives(app, prisma, authMiddleware, isSuperAdmin, getDocumentPermissions);

// Sections helper: baca dari DocumentSection rows
function sectionsFromDb(sectionRows) {
  return sectionRows
    .sort((a, b) => a.babOrder - b.babOrder)
    .map(s => ({
      id:          s.babId,
      title:       s.babTitle,
      locked:      s.isLocked,
      order:       s.babOrder,
      subsections: s.subsections,
    }));
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: 'mysql/prisma', time: new Date().toISOString() });
});

// ─── AUTH ────────────────────────────────────────────────────────────────────

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { roles: { include: { role: true } }, opd: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const profile = buildUserProfile(user);
    const token = jwt.sign(
      { userId: user.id, role: profile.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ success: true, token, user: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// GET current user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Tidak terautentikasi' });

  // Ambil daftar user yang bisa di-switch (untuk fitur "Ganti Peran")
  try {
    const allUsers = isSuperAdmin(req.currentUser) ? await prisma.user.findMany({
      where: { isActive: true },
      include: { roles: { include: { role: true } }, opd: true },
      orderBy: { nama: 'asc' }
    }) : [];
    const availableUsers = allUsers.map(buildUserProfile);

    res.json({ user: req.currentUser, availableUsers });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data pengguna' });
  }
});

// Switch user / peran (fitur demo tanpa re-login)
app.post('/api/auth/switch-user', authMiddleware, async (req, res) => {
  if (denyUnlessSuperAdmin(req, res)) return;
  const { userId, opdId, username } = req.body;

  try {
    let user = null;

    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } }, opd: true }
      });
    } else if (username) {
      user = await prisma.user.findUnique({
        where: { username },
        include: { roles: { include: { role: true } }, opd: true }
      });
    } else if (opdId === 'bapperida') {
      user = await prisma.user.findFirst({
        where: { roles: { some: { role: { kode: 'super_admin' } } } },
        include: { roles: { include: { role: true } }, opd: true }
      });
    } else if (opdId) {
      user = await prisma.user.findFirst({
        where: { opdId, isActive: true },
        include: { roles: { include: { role: true } }, opd: true }
      });
    }

    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    const profile = buildUserProfile(user);
    const token = jwt.sign({ userId: user.id, role: profile.role }, JWT_SECRET, { expiresIn: '8h' });

    res.json({ success: true, user: profile, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal beralih pengguna' });
  }
});

// ─── OPD ─────────────────────────────────────────────────────────────────────

app.get('/api/opds', async (req, res) => {
  try {
    const opds = await prisma.opd.findMany({ where: { isActive: true }, orderBy: { nomorUrut: 'asc' } });
    res.json(opds);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data OPD' });
  }
});

// ─── STAF & PENUGASAN (admin only) ───────────────────────────────────────────

// GET semua staf Bapperida beserta penugasan OPD-nya
app.get('/api/staf', authMiddleware, async (req, res) => {
  if (denyUnlessSuperAdmin(req, res)) return;
  const { tahun = '2025' } = req.query;
  try {
    const stafList = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: { some: { role: { kode: 'staf_bapperida' } } }
      },
      include: {
        roles: { include: { role: true } },
        opd: true,
        penugasanVerifikasi: {
          where: { tahun: String(tahun) },
          include: { opd: true }
        }
      },
      orderBy: { nama: 'asc' }
    });

    res.json(stafList.map(u => ({
      ...buildUserProfile(u),
      penugasanOpd: u.penugasanVerifikasi.map(p => ({
        id: p.id, opdId: p.opdId, opdNama: p.opd.nama,
        opdSingkatan: p.opd.singkatan, keterangan: p.keterangan, tahun: p.tahun
      }))
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data staf' });
  }
});

app.get('/api/staf/penugasan/saya', authMiddleware, async (req, res) => {
  if (req.currentUser.role !== 'staf') return res.status(403).json({ error: 'Khusus pegawai Bapperida' });
  const tahun = String(req.query.tahun || '2025');
  try {
    const assignments = await prisma.penugasanVerifikasi.findMany({
      where: { userId: req.currentUser.id, tahun },
      include: { opd: true },
      orderBy: { opd: { nomorUrut: 'asc' } }
    });
    res.json(assignments.map(assignment => ({
      id: assignment.opd.id,
      nama: assignment.opd.nama,
      singkatan: assignment.opd.singkatan,
      tahun: assignment.tahun
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil daftar OPD tugas' });
  }
});

// POST buat staf baru
app.post('/api/staf', authMiddleware, async (req, res) => {
  if (denyUnlessSuperAdmin(req, res)) return;
  const { username, password, nama, nip, jabatan } = req.body;
  if (!username || !password || !nama) {
    return res.status(400).json({ error: 'username, password, dan nama wajib diisi' });
  }
  try {
    const roleStaf = await prisma.role.findUnique({ where: { kode: 'staf_bapperida' } });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username, password: hashed, nama, nip, jabatan,
        opdId: 'bapperida',
        singkatan: 'Bapperida',
        roles: { create: { roleId: roleStaf.id } }
      },
      include: { roles: { include: { role: true } }, opd: true }
    });
    res.status(201).json(buildUserProfile(user));
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Username sudah digunakan' });
    res.status(500).json({ error: 'Gagal membuat akun staf' });
  }
});

// PUT update staf
app.put('/api/staf/:id', authMiddleware, async (req, res) => {
  if (denyUnlessSuperAdmin(req, res)) return;
  const { nama, nip, jabatan, isActive, password } = req.body;
  try {
    const data = { nama, nip, jabatan, isActive };
    if (password) data.password = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: { id: req.params.id }, data,
      include: { roles: { include: { role: true } }, opd: true }
    });
    res.json(buildUserProfile(user));
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengupdate staf' });
  }
});

// POST penugasan OPD ke staf
app.post('/api/staf/:id/penugasan', authMiddleware, async (req, res) => {
  if (denyUnlessSuperAdmin(req, res)) return;
  const { opdId, tahun = '2025', keterangan } = req.body;
  if (!opdId) return res.status(400).json({ error: 'opdId wajib diisi' });
  if (opdId === 'bapperida') return res.status(400).json({ error: 'Penugasan asistensi hanya untuk OPD eksternal' });
  try {
    const staff = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { roles: { include: { role: true } } }
    });
    if (!staff?.isActive || !staff.roles.some(item => item.role.kode === 'staf_bapperida')) {
      return res.status(404).json({ error: 'Pegawai aktif Bapperida tidak ditemukan' });
    }
    const p = await prisma.penugasanVerifikasi.upsert({
      where: { userId_opdId_tahun: { userId: req.params.id, opdId, tahun } },
      create: { userId: req.params.id, opdId, tahun, keterangan, createdBy: req.currentUser?.id },
      update: { keterangan }
    });

    // Log
    await prisma.penugasanLog.create({
      data: {
        userId: req.params.id,
        aksi: 'ASSIGN',
        target: `${opdId} (T.A. ${tahun})`,
        keterangan
      }
    });

    res.status(201).json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan penugasan' });
  }
});

// DELETE penugasan
app.delete('/api/staf/:id/penugasan/:penugasanId', authMiddleware, async (req, res) => {
  if (denyUnlessSuperAdmin(req, res)) return;
  try {
    const p = await prisma.penugasanVerifikasi.findUnique({ where: { id: req.params.penugasanId } });
    await prisma.penugasanVerifikasi.delete({ where: { id: req.params.penugasanId } });
    await prisma.penugasanLog.create({
      data: {
        userId: req.params.id,
        aksi: 'UNASSIGN',
        target: p?.opdId || req.params.penugasanId
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus penugasan' });
  }
});

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────

// GET list dokumen
app.get('/api/documents', authMiddleware, async (req, res) => {
  const { jenis, tahun, status, search, includeLampiran } = req.query;
  const user = req.currentUser;

  const where = {};
  let assignedOpdIds = [];

  // Filter berdasarkan role
  if (user?.role === 'opd') {
    where.opdId = user.opdId;
    where.jenis = { in: OPD_DOCUMENT_TYPES.concat(ANNEX_DOCUMENT_TYPES, 'Lampiran Renja') };
  } else if (user?.role === 'staf') {
    try {
      const assignments = await prisma.penugasanVerifikasi.findMany({
        where: { userId: user.id, tahun: tahun && tahun !== 'all' ? String(tahun) : undefined },
        select: { opdId: true }
      });
      assignedOpdIds = assignments.map(assignment => assignment.opdId);
      const chapterDocuments = await prisma.penugasanBabRkpd.findMany({ where: { userId: user.id }, select: { documentId: true } });
      where.OR = [
        { parentId: { in: chapterDocuments.map(item => item.documentId) }, isLampiranOtomatis: true },
        { opdId: { in: assignedOpdIds }, jenis: { notIn: RKPD_DOCUMENT_TYPES } },
        { penugasanBab: { some: { userId: user.id } } },
        { createdById: user.id, jenis: { notIn: RKPD_DOCUMENT_TYPES } }
      ];
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Gagal memeriksa penugasan dokumen' });
    }
  } else if (!isSuperAdmin(user)) {
    return res.status(403).json({ error: 'Akses dokumen ditolak' });
  }
  // Super Admin PPEPD dapat melihat semua dokumen.

  if (jenis && jenis !== 'all') {
    if (user?.role === 'opd' && !OPD_DOCUMENT_TYPES.includes(jenis) && !ANNEX_DOCUMENT_TYPES.includes(jenis) && jenis !== 'Lampiran Renja') {
      return res.json([]);
    }
    where.jenis = jenis;
  }
  if (tahun && tahun !== 'all') where.tahun = String(tahun);
  if (status && status !== 'all') where.status = status;

  if (includeLampiran !== 'true') {
    where.isLampiranOtomatis = false;
  }

  if (search) {
    const s = search.toLowerCase();
    where.AND = [{ OR: [
      { judul:    { contains: s } },
      { opdName:  { contains: s } },
      { kodeDoc:  { contains: s } },
      { nomorSurat: { contains: s } },
    ] }];
  }

  try {
    const docs = await prisma.document.findMany({
      where,
      include: {
        sections: { orderBy: { babOrder: 'asc' } },
        penugasanBab: user?.role === 'staf' ? { where: { userId: user.id }, select: { babId: true } } : false
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Map ke format frontend yang sudah ada
    const result = await Promise.all(docs.map(async doc => ({
      ...doc, sections: sectionsFromDb(doc.sections), permissions: await getDocumentPermissions(user, doc)
    })));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil dokumen' });
  }
});

// GET single document
app.get('/api/documents/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { sections: { orderBy: { babOrder: 'asc' } }, attachments: true }
    });
    if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
    const permissions = await getDocumentPermissions(req.currentUser, doc);
    if (!permissions.canView) return res.status(403).json({ error: 'Dokumen tidak termasuk penugasan Anda' });

    res.json({ ...doc, sections: sectionsFromDb(doc.sections), permissions, documentSettings: await documentSettings(prisma, doc.opdId) });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil dokumen' });
  }
});

app.get('/api/documents/:id/assignments/chapters', authMiddleware, async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { sections: true }
    });
    if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
    if (!isCollaborativeDocument(doc)) return res.status(400).json({ error: 'Penugasan bab tersedia untuk RKPD dan Renja Bapperida' });

    const permissions = await getDocumentPermissions(req.currentUser, doc);
    if (!permissions.canView && !isSuperAdmin(req.currentUser)) {
      return res.status(403).json({ error: 'Dokumen tidak termasuk penugasan Anda' });
    }

    const assignments = await prisma.penugasanBabRkpd.findMany({
      where: isSuperAdmin(req.currentUser) ? { documentId: doc.id } : { documentId: doc.id, userId: req.currentUser.id },
      include: { user: { select: { id: true, nama: true, jabatan: true } } },
      orderBy: { babId: 'asc' }
    });
    res.json(assignments.map(assignment => ({
      id: assignment.id,
      userId: assignment.userId,
      userName: assignment.user.nama,
      jabatan: assignment.user.jabatan,
      babId: assignment.babId,
      babTitle: assignment.babTitle,
      keterangan: assignment.keterangan
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil penugasan bab' });
  }
});

app.post('/api/documents/:id/assignments/chapters', authMiddleware, async (req, res) => {
  if (denyUnlessSuperAdmin(req, res)) return;
  const { userId, babId, keterangan } = req.body;
  if (!userId || !babId) return res.status(400).json({ error: 'Pegawai dan bab wajib dipilih' });

  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { sections: true }
    });
    if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
    if (!isCollaborativeDocument(doc)) return res.status(400).json({ error: 'Penugasan bab tersedia untuk RKPD dan Renja Bapperida' });

    const staff = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } }
    });
    if (!staff?.isActive || !staff.roles.some(item => item.role.kode === 'staf_bapperida')) {
      return res.status(400).json({ error: 'Pilih pegawai aktif Bapperida non-PPEPD' });
    }

    const section = doc.sections.find(item => item.babId === babId);
    if (!section) return res.status(400).json({ error: 'Bab tidak ditemukan pada dokumen ini' });

    const assignment = await prisma.penugasanBabRkpd.upsert({
      where: { userId_documentId_babId: { userId, documentId: doc.id, babId } },
      create: { userId, documentId: doc.id, babId, babTitle: section.babTitle, keterangan },
      update: { babTitle: section.babTitle, keterangan }
    });
    await prisma.penugasanLog.create({
      data: { userId: req.currentUser.id, aksi: 'ASSIGN_BAB_RKPD', target: `${doc.id}:${babId}`, keterangan: staff.nama }
    });
    res.status(201).json({ ...assignment, userName: staff.nama });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan penugasan bab' });
  }
});

app.delete('/api/documents/:id/assignments/chapters/:assignmentId', authMiddleware, async (req, res) => {
  if (denyUnlessSuperAdmin(req, res)) return;
  try {
    const assignment = await prisma.penugasanBabRkpd.findFirst({
      where: { id: req.params.assignmentId, documentId: req.params.id }
    });
    if (!assignment) return res.status(404).json({ error: 'Penugasan bab tidak ditemukan' });
    await prisma.penugasanBabRkpd.delete({ where: { id: assignment.id } });
    await prisma.penugasanLog.create({
      data: { userId: req.currentUser.id, aksi: 'UNASSIGN_BAB_RKPD', target: `${req.params.id}:${assignment.babId}` }
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus penugasan bab' });
  }
});

// POST buat dokumen baru
app.post('/api/documents', authMiddleware, upload.single('file'), async (req, res) => {
  const { jenis, tahun, judul, subJudul, cara, opdId } = req.body;
  const user = req.currentUser;

  if (cara === 'upload' && !req.file) {
    return res.status(400).json({ error: 'Berkas dokumen wajib dipilih sebelum dokumen upload dibuat' });
  }

  if (user.role === 'opd' && !OPD_DOCUMENT_TYPES.includes(jenis)) {
    return res.status(403).json({ error: 'OPD hanya dapat membuat dokumen Renja dan Renstra' });
  }
  if (user.role === 'staf' && !STAFF_DOCUMENT_TYPES.includes(jenis)) {
    return res.status(403).json({ error: 'Staf hanya dapat membuat Renja untuk OPD yang ditugaskan; RKPD/RPJMD dikelola Super Admin PPEPD' });
  }
  if (!['opd', 'staf'].includes(user.role) && !isSuperAdmin(user)) {
    return res.status(403).json({ error: 'Akses pembuatan dokumen ditolak' });
  }

  if (ANNEX_DOCUMENT_TYPES.includes(jenis) || jenis === 'Lampiran Renja') {
    return res.status(400).json({ error: 'Lampiran dibuat otomatis dari dokumen induk' });
  }
  const periodeAkhir = String(req.body.periodeAkhir || tahun || '');
  if (String(jenis).includes('Renstra') && (!/^\d{4}$/.test(periodeAkhir) || Number(periodeAkhir) < Number(tahun))) {
    return res.status(400).json({ error: 'Tahun akhir Renstra harus sama dengan atau setelah tahun awal' });
  }

  const reference = randomUUID();
  let createStage = 'validasi dokumen';
  let createdDocument = null;
  try {
    createStage = 'mencari perangkat daerah';
    let effectiveOpdId = user.opdId;
    if (isSuperAdmin(user)) {
      effectiveOpdId = isRkpdDocument(jenis) || jenis === 'RPJMD' ? 'bapperida' : (opdId || user.opdId);
    } else if (user.role === 'staf') {
      const assignment = await prisma.penugasanVerifikasi.findUnique({
        where: { userId_opdId_tahun: { userId: user.id, opdId, tahun: String(tahun) } }
      });
      if (!assignment) return res.status(403).json({ error: 'Anda hanya dapat membuat Renja untuk OPD yang ditugaskan' });
      effectiveOpdId = opdId;
    }

    const opd = await prisma.opd.findUnique({ where: { id: effectiveOpdId } });
    if (!opd) return res.status(404).json({ error: 'OPD tidak ditemukan' });

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const prefix = jenis?.includes('Perubahan') ? 'RNJ-P' : (jenis?.includes('RKPD') ? 'RKPD' : 'RNJ');
    const kodeDoc = `${prefix}-${tahun}-${randomNum}`;

    let filePath = null, fileName = null;
    if (req.file) {
      filePath = `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
    }

    // Generate sections template
    let selectedTemplate = null;
    if ((cara || 'template') === 'template' && !jenis.startsWith('Renstra')) {
      selectedTemplate = await prisma.template.findFirst({ where: { jenis: canonicalType(jenis), tahun: String(tahun), isActive: true }, orderBy: { versi: 'desc' } });
      if (!selectedTemplate) return res.status(400).json({ error: `Belum ada template aktif untuk ${jenis} tahun ${tahun}. Hubungi Super Admin untuk menyiapkan template tahun tersebut.` });
    }
    let sectionData = (cara || 'template') === 'template'
      ? selectedTemplate ? instantiate(selectedTemplate, opd.nama, tahun) : generateDefaultSections(jenis, opd.nama, tahun)
      : [];
    if ((cara || 'template') === 'upload' && req.file && OPD_DOCUMENT_TYPES.includes(jenis)) {
      try {
        createStage = 'membaca dokumen asli';
        const extension = path.extname(req.file.originalname).toLowerCase();
        const bytes = await fs.promises.readFile(req.file.path);
        if (extension === '.pdf') await pdfBodyStart(bytes);
        else if (extension === '.docx') {
          await sourceDocx(bytes, { jenis: 'Lampiran Perbup Renja', tahun }, { opdRecord: { nomorLampiran: opd.nomorLampiran || 'I' } });
          // Structured sections serve the editor only, never the uploaded annex body.
          sectionData = await importDocxSections(req.file.path).catch(() => []);
        } else throw new Error('Gunakan PDF dengan teks atau DOCX untuk lampiran dari dokumen asli.');
      } catch (error) {
        await fs.promises.unlink(req.file.path).catch(cleanupError => {
          console.error('Failed to remove invalid uploaded DOCX:', cleanupError);
        });
        return res.status(400).json({ error: `Dokumen belum dapat dijadikan lampiran otomatis: ${error.message}` });
      }
    }

    createStage = 'menyimpan dokumen';
    createdDocument = await prisma.document.create({
      data: {
        kodeDoc,
        templateId: selectedTemplate?.id,
        templateSnapshot: selectedTemplate ? { id: selectedTemplate.id, nama: selectedTemplate.nama, versi: selectedTemplate.versi, tahun: selectedTemplate.tahun, sections: sectionData } : undefined,
        nomorSurat: `050/${Math.floor(100 + Math.random() * 900)}/${opd.singkatan}/${tahun}`,
        nomerRegistrasiArsip: `ARS-${tahun}-${kodeDoc}`,
        jenis, tahun: String(tahun),
        judul: judul || `${jenis} ${tahun} - ${opd.nama}`,
        subJudul: subJudul || `Rencana Kerja Tahunan Perangkat Daerah ${opd.nama}`,
        cara: cara || 'template',
        opdId: effectiveOpdId,
        opdName: opd.nama,
        ...(String(jenis).includes('Renstra') ? { regulation: { periodeMulai: String(tahun), periodeAkhir } } : {}),
        createdById: user.id,
        filePath, fileName,
        sections: {
          create: sectionData.map(s => ({
            babId: s.id, babTitle: s.title, babOrder: s.order,
            isLocked: s.locked, subsections: s.subsections
          }))
        }
      },
      include: { sections: { orderBy: { babOrder: 'asc' } } }
    });

    const warnings = [];
    try {
      createStage = 'mencatat aktivitas';
      await prisma.activityLog.create({
        data: {
          documentId: createdDocument.id,
          docTitle: createdDocument.judul,
          detail: `Baru dibuat oleh ${req.currentUser?.name} (${opd.singkatan})`,
          tag: opd.singkatan, badge: 'Draft Sistem', icon: 'file-plus', color: 'blue'
        }
      });
    } catch (error) {
      console.error(`Failed to log new document [${reference}]:`, error);
      warnings.push('Dokumen tersimpan, tetapi log aktivitas gagal dicatat.');
    }

    try {
      createStage = 'membuat lampiran otomatis';
      await syncLampiran(createdDocument);
    } catch (error) {
      console.error(`Failed to sync annex for new document [${reference}]:`, error);
      warnings.push(`Dokumen tersimpan, tetapi lampiran otomatis belum berhasil dibuat. Sampaikan kode ${reference} kepada administrator.`);
    }

    res.status(201).json({
      ...createdDocument,
      sections: sectionsFromDb(createdDocument.sections),
      ...(warnings.length ? { warnings } : {})
    });
  } catch (err) {
    console.error(`Failed to create document [${reference}] at ${createStage}:`, err);
    if (!createdDocument && req.file) {
      await fs.promises.unlink(req.file.path).catch(cleanupError => {
        if (cleanupError.code !== 'ENOENT') console.error(`Failed to remove rejected document upload [${reference}]:`, cleanupError);
      });
    }
    const detail = process.env.NODE_ENV === 'production' ? '' : `: ${err.message}`;
    res.status(500).json({
      error: `Gagal ${createStage}. Kode: ${reference}${detail}`
    });
  }
});

// PUT update sections dokumen (autosave)
app.put('/api/documents/:id', authMiddleware, async (req, res) => {
  const { sections, judul, subJudul, nomorSurat, frontMatter } = req.body;

  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { sections: true }
    });
    if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });

    const permissions = await getDocumentPermissions(req.currentUser, doc);
    if (!permissions.canView) return res.status(403).json({ error: 'Dokumen tidak termasuk penugasan Anda' });
    if (!permissions.canEdit) return res.status(403).json({ error: 'Anda hanya dapat melihat dokumen ini' });

    const sectionsToUpdate = Array.isArray(sections) ? sections : [];
    const knownBabIds = new Set(doc.sections.map(section => section.babId));
    if (sectionsToUpdate.some(section => !knownBabIds.has(section.id))) {
      return res.status(400).json({ error: 'Bab dokumen tidak valid' });
    }
    if (sectionsToUpdate.some(section => !permissions.editableBabIds.includes(section.id))) {
      return res.status(403).json({ error: 'Ada bab di luar penugasan edit Anda' });
    }

    for (const bab of sectionsToUpdate) {
      const existing = doc.sections.find(item => item.babId === bab.id);
      const expected = existing.subsections;
      if (bab.title !== existing.babTitle || !Array.isArray(bab.subsections) || bab.subsections.length !== expected.length || bab.subsections.some((sub, i) => sub.id !== expected[i].id || sub.title !== expected[i].title || sub.code !== expected[i].code || typeof sub.content !== 'string')) {
        return res.status(400).json({ error: 'Struktur bab/sub-bab terkunci mengikuti versi template dokumen.' });
      }
    }

    try {
      for (const bab of sectionsToUpdate) for (const sub of bab.subsections) {
        sub.content = cleanHtml(sub.content, false);
        if (sub.tables) sub.tables = sub.tables.map(normalizeTable);
      }
    } catch (e) { return res.status(400).json({ error: e.message }); }

    // Update metadata
    const updateData = { updatedAt: new Date() };
    if (frontMatter != null) {
      if (!permissions.editableBabIds.includes([...doc.sections].sort((a,b)=>a.babOrder-b.babOrder)[0]?.babId)) return res.status(403).json({ error: 'Kata pengantar hanya dapat diedit oleh penyusun BAB I' });
      updateData.frontMatter = {
        preface: cleanHtml(String(frontMatter.preface || '').slice(0,50000), false),
        cover: typeof frontMatter.cover === 'string' ? cleanHtml(frontMatter.cover.slice(0,50000), false) : doc.frontMatter?.cover || ''
      };
    }
    if (isSuperAdmin(req.currentUser)) {
      if (judul) updateData.judul = judul;
      if (subJudul) updateData.subJudul = subJudul;
      if (nomorSurat) updateData.nomorSurat = nomorSurat;
    }

    // Update sections jika ada
    if (sectionsToUpdate.length > 0) {
      for (const bab of sectionsToUpdate) {
        await prisma.documentSection.upsert({
          where: { documentId_babId: { documentId: doc.id, babId: bab.id } },
          create: {
            documentId: doc.id,
            babId: bab.id, babTitle: bab.title,
            babOrder: bab.order || 0,
            isLocked: bab.locked ?? true,
            subsections: bab.subsections || []
          },
          update: { subsections: bab.subsections || [], babTitle: bab.title }
        });
      }
    }

    const updated = await prisma.document.update({
      where: { id: doc.id }, data: updateData,
      include: { sections: { orderBy: { babOrder: 'asc' } } }
    });

    // Sync lampiran jika ada
    await syncLampiran(updated);

    const updatedPermissions = await getDocumentPermissions(req.currentUser, updated);
    res.json({ ...updated, sections: sectionsFromDb(updated.sections), permissions: updatedPermissions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan dokumen' });
  }
});

// POST submit dokumen untuk verifikasi
app.post('/api/documents/:id/submit', authMiddleware, async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { sections: true }
    });
    if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
    if (req.currentUser.role !== 'opd' || req.currentUser.opdId !== doc.opdId || !OPD_DOCUMENT_TYPES.includes(doc.jenis)) {
      return res.status(403).json({ error: 'Hanya OPD pemilik Renja/Renstra yang dapat mengajukan dokumen' });
    }
    if (!['Draft', 'Perlu Revisi'].includes(doc.status)) {
      return res.status(400).json({ error: 'Status dokumen tidak dapat diajukan' });
    }

    // Validasi sections tidak kosong
    if (doc.cara === 'template') {
      const emptySections = [];
      for (const bab of doc.sections) {
        const subs = Array.isArray(bab.subsections) ? bab.subsections : [];
        for (const sub of subs) {
          const text = (sub.content || '').replace(/<[^>]*>?/gm, '').trim();
          if (text.length < 10 || /^Petunjuk:/i.test(text)) emptySections.push(`${sub.code} ${sub.title}`);
        }
      }
      if (emptySections.length > 0) {
        return res.status(400).json({
          error: 'Dokumen belum lengkap! Bagian wajib masih kosong:',
          emptySections
        });
      }
    }

    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: { status: 'Menunggu Verifikasi', updatedAt: new Date() },
      include: { sections: { orderBy: { babOrder: 'asc' } } }
    });

    await prisma.activityLog.create({
      data: {
        documentId: doc.id,
        docTitle: doc.judul,
        detail: `Diajukan untuk verifikasi oleh ${req.currentUser?.name} (${doc.opdName})`,
        tag: doc.opdName.split(' ')[1] || 'OPD',
        badge: 'Verifikasi Level 1', icon: 'send', color: 'amber'
      }
    });

    await syncLampiran(updated);
    res.json({ success: true, document: { ...updated, sections: sectionsFromDb(updated.sections) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengajukan dokumen' });
  }
});

app.get('/api/annexes', authMiddleware, async (req, res) => {
  const { opdId, jenis, tahun } = req.query;
  const user = req.currentUser;
  try {
    const legacyAnnexType = 'Lampiran Renja';
    const parentWhere = {
      isLampiranOtomatis: false,
      jenis: { in: OPD_DOCUMENT_TYPES },
      ...(tahun ? { tahun: String(tahun) } : {})
    };
    if (opdId) parentWhere.opdId = String(opdId);
    if (user.role === 'opd') {
      parentWhere.opdId = user.opdId;
    } else if (user.role === 'staf') {
      const assignments = await prisma.penugasanVerifikasi.findMany({
        where: { userId: user.id, ...(tahun ? { tahun: String(tahun) } : {}) },
        select: { opdId: true }
      });
      parentWhere.opdId = { in: assignments.map(item => item.opdId) };
    } else if (user.role !== 'admin' && !isSuperAdmin(user)) {
      return res.status(403).json({ error: 'Akses lampiran ditolak' });
    }

    // Backfill annexes from eligible parents so records created by earlier server versions appear too.
    const parentsToCheck = await prisma.document.findMany({
      where: parentWhere,
      select: {
        id: true, kodeDoc: true, status: true, jenis: true, cara: true,
        fileName: true, sections: { select: { id: true } }
      }
    });
    const existingAnnexes = parentsToCheck.length ? await prisma.document.findMany({
      where: { parentId: { in: parentsToCheck.map(parent => parent.id) }, isLampiranOtomatis: true },
      select: { parentId: true, jenis: true }
    }) : [];
    const annexByParent = new Map(existingAnnexes.map(annex => [annex.parentId, annex]));
    for (const parent of parentsToCheck) {
      const existing = annexByParent.get(parent.id);
      if (!existing || existing.jenis === legacyAnnexType) await synchronizeLampiran(prisma, parent);
    }

    const where = {
      isLampiranOtomatis: true,
      jenis: { in: [...ANNEX_DOCUMENT_TYPES, legacyAnnexType] },
      ...(opdId ? { opdId: String(opdId) } : {}),
      ...(tahun ? { tahun: String(tahun) } : {})
    };
    if (jenis) {
      if (![...ANNEX_DOCUMENT_TYPES, legacyAnnexType].includes(String(jenis))) return res.json([]);
      where.jenis = String(jenis);
    }
    if (user.role === 'opd') {
      where.opdId = user.opdId;
    } else if (user.role === 'staf') {
      where.opdId = parentWhere.opdId;
    }

    const annexes = await prisma.document.findMany({
      where,
      include: { sections: { orderBy: { babOrder: 'asc' } }, opd: true },
      orderBy: [{ opd: { nomorUrut: 'asc' } }, { tahun: 'desc' }]
    });
    const parentIds = annexes.map(doc => doc.parentId).filter(Boolean);
    const parents = parentIds.length ? await prisma.document.findMany({
      where: { id: { in: parentIds } },
      select: {
        id: true, status: true, jenis: true, cara: true, fileName: true, filePath: true,
        sections: { select: { id: true } }
      }
    }) : [];
    const parentRecords = new Map(parents.map(parent => [parent.id, parent]));
    const result = await Promise.all(annexes.map(async doc => ({
      ...doc,
      jenis: doc.jenis === legacyAnnexType
        ? parentRecords.get(doc.parentId)?.jenis === 'Renja Perubahan'
          ? 'Lampiran Kepbup Perubahan Renja'
          : parentRecords.get(doc.parentId)?.jenis?.startsWith('Renstra')
            ? 'Lampiran Perbup Renstra'
            : 'Lampiran Perbup Renja'
        : doc.jenis,
      opdName: doc.opd?.nama || doc.opdName,
      parent: {
        status: parentRecords.get(doc.parentId)?.status,
        sourceReady: parentRecords.get(doc.parentId)?.cara === 'upload'
          ? /\.(pdf|docx)$/i.test(parentRecords.get(doc.parentId)?.filePath || '')
          : (parentRecords.get(doc.parentId)?.sections.length || 0) > 0,
        cara: parentRecords.get(doc.parentId)?.cara,
        fileName: parentRecords.get(doc.parentId)?.fileName
      },
      sections: sectionsFromDb(doc.sections),
      permissions: await getDocumentPermissions(user, doc)
    })));
    res.json(result.filter(doc => doc.permissions.canView));
  } catch (err) {
    console.error('Failed to list generated annexes:', err);
    res.status(500).json({ error: 'Gagal mengambil daftar lampiran' });
  }
});

app.put('/api/annexes/:id/config', authMiddleware, async (req, res) => {
  if (denyUnlessSuperAdmin(req, res)) return;
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc?.isLampiranOtomatis || !ANNEX_DOCUMENT_TYPES.includes(doc.jenis)) {
      return res.status(404).json({ error: 'Lampiran tidak ditemukan' });
    }
    const values = {
      nomorPeraturan: String(req.body.nomorPeraturan ?? '').trim().slice(0, 100),
      tahunPenetapan: String(req.body.tahunPenetapan ?? '').trim(),
      nomorKepbup: String(req.body.nomorKepbup ?? '').trim().slice(0, 100),
      tanggalKepbup: String(req.body.tanggalKepbup ?? '').trim().slice(0, 100)
    };
    if (values.tahunPenetapan && !/^\d{4}$/.test(values.tahunPenetapan)) {
      return res.status(400).json({ error: 'Tahun penetapan harus berupa empat digit' });
    }
    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: { regulation: { ...(doc.regulation || {}), ...values }, updatedAt: new Date() },
      include: { sections: { orderBy: { babOrder: 'asc' } }, opd: true }
    });
    res.json({ ...updated, sections: sectionsFromDb(updated.sections) });
  } catch (err) {
    console.error('Failed to update annex configuration:', err);
    res.status(500).json({ error: 'Gagal menyimpan pengaturan lampiran' });
  }
});

app.post('/api/annexes/:id/rebuild', authMiddleware, async (req, res) => {
  if (denyUnlessSuperAdmin(req, res)) return;
  try {
    const annex = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!annex?.isLampiranOtomatis || !ANNEX_DOCUMENT_TYPES.includes(annex.jenis)) {
      return res.status(404).json({ error: 'Lampiran tidak ditemukan' });
    }
    const parent = await prisma.document.findUnique({ where: { id: annex.parentId || '' } });
    if (!parent) return res.status(404).json({ error: 'Dokumen induk lampiran tidak ditemukan' });
    const rebuilt = await syncLampiran(parent, true);
    const result = await prisma.document.findUnique({
      where: { id: rebuilt.id },
      include: { sections: { orderBy: { babOrder: 'asc' } }, opd: true }
    });
    res.json({ ...result, sections: sectionsFromDb(result.sections) });
  } catch (err) {
    console.error('Failed to rebuild annex:', err);
    res.status(500).json({ error: 'Gagal membuat ulang lampiran' });
  }
});

// PUT mengganti berkas dokumen upload yang dikembalikan untuk revisi
app.put('/api/documents/:id/file', authMiddleware, upload.single('file'), async (req, res) => {
  const uploadedFile = req.file;
  let persisted = false;
  const discardUpload = async () => {
    if (!uploadedFile) return;
    try {
      await fs.promises.unlink(uploadedFile.path);
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('Failed to remove rejected revision upload:', err);
    }
  };

  if (!uploadedFile) {
    return res.status(400).json({ error: 'Pilih berkas PDF atau DOCX untuk perbaikan' });
  }
  if (!['.pdf', '.doc', '.docx'].includes(path.extname(uploadedFile.originalname).toLowerCase())) {
    await discardUpload();
    return res.status(400).json({ error: 'Format berkas tidak didukung. Gunakan PDF atau DOCX.' });
  }

  try {
    let importedSections = null;
    let annexWarning = null;
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { sections: { orderBy: { babOrder: 'asc' } } }
    });
    if (!doc) {
      await discardUpload();
      return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
    }
    if (req.currentUser.role !== 'opd' || req.currentUser.opdId !== doc.opdId || doc.cara !== 'upload') {
      await discardUpload();
      return res.status(403).json({ error: 'Hanya OPD pemilik dokumen upload yang dapat mengunggah perbaikan' });
    }
    const repairingMissingDraft = doc.status === 'Draft' && !doc.filePath && doc.sections.length === 0;
    if (doc.status !== 'Perlu Revisi' && !repairingMissingDraft) {
      await discardUpload();
      return res.status(400).json({ error: 'Berkas hanya dapat diganti setelah dokumen dikembalikan untuk revisi, atau melengkapi draf upload yang belum memiliki berkas' });
    }
    const permissions = await getDocumentPermissions(req.currentUser, doc);
    if (!permissions.canEdit) {
      await discardUpload();
      return res.status(403).json({ error: 'Dokumen ini tidak dapat diperbaiki oleh akun Anda' });
    }
    if (OPD_DOCUMENT_TYPES.includes(doc.jenis)) {
      try {
        const extension = path.extname(uploadedFile.originalname).toLowerCase();
        const bytes = await fs.promises.readFile(uploadedFile.path);
        if (extension === '.pdf') { await pdfBodyStart(bytes); importedSections = []; }
        else if (extension === '.docx') {
          await sourceDocx(bytes, { jenis: 'Lampiran Perbup Renja', tahun: doc.tahun }, { opdRecord: { nomorLampiran: 'I' } });
          importedSections = await importDocxSections(uploadedFile.path).catch(() => []);
        } else throw new Error('Gunakan PDF dengan teks atau DOCX.');
      } catch (error) {
        await discardUpload();
        return res.status(400).json({ error: `Dokumen belum dapat dijadikan lampiran otomatis: ${error.message}` });
      }
    }

    const updated = await prisma.$transaction(async tx => {
      if (importedSections) {
        await tx.documentSection.deleteMany({ where: { documentId: doc.id } });
        await tx.documentSection.createMany({
          data: importedSections.map(section => ({
            documentId: doc.id,
            babId: section.id,
            babTitle: section.title,
            babOrder: section.order,
            isLocked: true,
            subsections: section.subsections
          }))
        });
      }
      const updatedDoc = await tx.document.update({
        where: { id: doc.id },
        data: {
          filePath: `/uploads/${uploadedFile.filename}`,
          fileName: uploadedFile.originalname,
          updatedAt: new Date()
        },
        include: { sections: { orderBy: { babOrder: 'asc' } } }
      });
      await tx.activityLog.create({
        data: {
          documentId: doc.id,
          docTitle: doc.judul,
          detail: `${repairingMissingDraft ? 'Berkas DOCX Renja dilengkapi' : 'Berkas perbaikan diunggah'} oleh ${req.currentUser.name} (${doc.opdName})`,
          tag: doc.opdName.split(' ')[1] || 'OPD',
          badge: repairingMissingDraft ? 'Berkas DOCX' : 'Berkas Revisi',
          icon: 'upload',
          color: 'blue'
        }
      });
      return updatedDoc;
    });
    persisted = true;
    try {
      await syncLampiran(updated);
    } catch (err) {
      console.error('DOCX and extracted chapters were saved, but automatic annex synchronization failed:', err);
      annexWarning = 'Renja dan BAB hasil DOCX sudah tersimpan, tetapi sinkronisasi lampiran tertunda. Buka menu Lampiran dan muat ulang untuk mencoba kembali.';
    }

    if (doc.filePath?.startsWith('/uploads/')) {
      const oldFilePath = path.join(uploadsDir, path.basename(doc.filePath));
      try {
        await fs.promises.unlink(oldFilePath);
      } catch (err) {
        if (err.code !== 'ENOENT') console.error('Failed to remove replaced document upload:', err);
      }
    }

    res.json({
      success: true,
      annexWarning,
      document: {
        ...updated,
        sections: sectionsFromDb(updated.sections),
        permissions
      }
    });
  } catch (err) {
    if (!persisted) await discardUpload();
    const reference = randomUUID();
    console.error(`Failed to process DOCX upload [${reference}]:`, err);
    res.status(500).json({
      error: persisted
        ? 'Dokumen sudah tersimpan, tetapi respons server gagal diselesaikan. Muat ulang daftar dokumen.'
        : `DOCX belum tersimpan karena terjadi kesalahan server. Coba sekali lagi; bila masih gagal, sampaikan kode ${reference} kepada administrator.`
    });
  }
});

// POST verifikasi dokumen (admin / staf bapperida)
app.post('/api/documents/:id/verify', authMiddleware, async (req, res) => {
  const user = req.currentUser;
  if (!isSuperAdmin(user) && user?.role !== 'staf') {
    return res.status(403).json({ error: 'Hanya Admin/Staf Bapperida yang berhak memverifikasi' });
  }

  const { status, catatanRevisi } = req.body;
  if (!['Disetujui', 'Perlu Revisi'].includes(status)) {
    return res.status(400).json({ error: 'Status harus "Disetujui" atau "Perlu Revisi"' });
  }
  if (status === 'Perlu Revisi' && !catatanRevisi?.trim()) {
    return res.status(400).json({ error: 'Catatan revisi wajib diisi' });
  }

  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
    if (doc.createdById === user.id) {
      return res.status(403).json({ error: 'Penyusun dokumen tidak dapat menyetujui dokumennya sendiri' });
    }
    if (doc.status !== 'Menunggu Verifikasi') {
      return res.status(400).json({ error: 'Hanya dokumen yang menunggu verifikasi dapat diputuskan' });
    }
    if (!isSuperAdmin(user)) {
      const assignment = await prisma.penugasanVerifikasi.findUnique({
        where: { userId_opdId_tahun: { userId: user.id, opdId: doc.opdId, tahun: doc.tahun } }
      });
      if (!assignment || doc.opdId === 'bapperida' || doc.status !== 'Menunggu Verifikasi') {
        return res.status(403).json({ error: 'Dokumen ini tidak termasuk penugasan verifikasi Anda' });
      }
    }

    const tteNumber = status === 'Disetujui'
      ? (doc.tteNumber || `050/BA-${doc.opdId.toUpperCase()}/${doc.tahun}`)
      : null;

    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: {
        status,
        catatanRevisi: status === 'Perlu Revisi' ? catatanRevisi : null,
        verifierName: user.name,
        verifierJabatan: user.jabatan,
        tteNumber,
        updatedAt: new Date()
      },
      include: { sections: { orderBy: { babOrder: 'asc' } } }
    });

    // Rekam ke tabel verifications
    await prisma.verification.create({
      data: {
        documentId: doc.id,
        verifierId: user.id,
        status, catatanRevisi: catatanRevisi || null,
        tteNumber
      }
    });

    await prisma.activityLog.create({
      data: {
        documentId: doc.id,
        docTitle: doc.judul,
        detail: status === 'Disetujui'
          ? `Disetujui oleh ${user.name} (BA Sah & TTE Terbit)`
          : `Catatan revisi dikirim oleh ${user.name}: "${catatanRevisi?.substring(0, 60)}..."`,
        tag: doc.opdName.split(' ')[1] || 'OPD',
        badge: status === 'Disetujui' ? 'Sah / TTE' : 'Perlu Revisi',
        icon: status === 'Disetujui' ? 'check-circle' : 'alert-circle',
        color: status === 'Disetujui' ? 'green' : 'red'
      }
    });

    await syncLampiran(updated);
    res.json({ success: true, document: { ...updated, sections: sectionsFromDb(updated.sections) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memverifikasi dokumen' });
  }
});

// ─── STATISTICS ──────────────────────────────────────────────────────────────

app.get('/api/stats/dashboard', authMiddleware, async (req, res) => {
  const user = req.currentUser;

  try {
    if (user.role === 'admin' || user.role === 'staf') {
      let documentFilter = {};
      if (user.role === 'staf') {
        const [opdAssignments, chapterAssignments] = await Promise.all([
          prisma.penugasanVerifikasi.findMany({ where: { userId: user.id }, select: { opdId: true } }),
          prisma.penugasanBabRkpd.findMany({ where: { userId: user.id }, select: { documentId: true } })
        ]);
        documentFilter = { OR: [
          { opdId: { in: opdAssignments.map(item => item.opdId) }, jenis: { notIn: RKPD_DOCUMENT_TYPES } },
          { id: { in: chapterAssignments.map(item => item.documentId) } },
          { createdById: user.id, jenis: { notIn: RKPD_DOCUMENT_TYPES } }
        ] };
      } else if (!isSuperAdmin(user)) {
        return res.status(403).json({ error: 'Akses statistik ditolak' });
      }

      const scopedDocuments = await prisma.document.findMany({ where: documentFilter, select: { id: true } });
      const activities = await prisma.activityLog.findMany({
        where: isSuperAdmin(user) ? {} : { documentId: { in: scopedDocuments.map(doc => doc.id) } },
        orderBy: { createdAt: 'desc' }, take: 6
      });

      const incomingFilter = {
        ...documentFilter,
        parentId: null,
        isLampiranOtomatis: false,
        status: { in: ['Menunggu Verifikasi', 'Perlu Revisi', 'Disetujui'] }
      };
      const [total, menunggu, revisi, disetujui] = await Promise.all([
        prisma.document.count({ where: incomingFilter }),
        prisma.document.count({ where: { ...incomingFilter, status: 'Menunggu Verifikasi' } }),
        prisma.document.count({ where: { ...incomingFilter, status: 'Perlu Revisi' } }),
        prisma.document.count({ where: { ...incomingFilter, status: 'Disetujui' } }),
      ]);

      res.json({
        role: user.role, totalUsulan: total,
        menungguTelaah: menunggu, perluRevisi: revisi, disetujui,
        persenSah: total > 0 ? ((disetujui / total) * 100).toFixed(1) : '0',
        activities: activities.map(a => ({ ...a, timestamp: formatRelativeTime(a.createdAt) }))
      });
    } else {
      // OPD
      const opdDocs = await prisma.document.findMany({
        where: { opdId: user.opdId, jenis: { in: OPD_DOCUMENT_TYPES.concat('Lampiran Renja') } }
      });
      const activities = await prisma.activityLog.findMany({
        where: { documentId: { in: opdDocs.map(doc => doc.id) } },
        orderBy: { createdAt: 'desc' }, take: 6
      });
      const revisions = opdDocs.filter(d => d.status === 'Perlu Revisi');
      res.json({
        role: 'opd',
        totalDokumen: opdDocs.length,
        draf: opdDocs.filter(d => d.status === 'Draft').length,
        menunggu: opdDocs.filter(d => d.status === 'Menunggu Verifikasi').length,
        sah: opdDocs.filter(d => d.status === 'Disetujui').length,
        activeRevisions: revisions,
        latestRevision: revisions[0] || null
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil statistik' });
  }
});

// Monitoring semua OPD
app.get('/api/stats/monitoring', authMiddleware, async (req, res) => {
  const tahun = req.query.tahun || '2025';
  const user = req.currentUser;
  if (!isSuperAdmin(user) && user.role !== 'staf') {
    return res.status(403).json({ error: 'Monitoring OPD hanya tersedia untuk pegawai Bapperida' });
  }
  try {
    let assignedOpdIds;
    if (!isSuperAdmin(user)) {
      const assignments = await prisma.penugasanVerifikasi.findMany({
        where: { userId: user.id, tahun: String(tahun) }, select: { opdId: true }
      });
      assignedOpdIds = assignments.map(assignment => assignment.opdId);
    }
    const opds = await prisma.opd.findMany({
      where: { isActive: true, ...(assignedOpdIds ? { id: { in: assignedOpdIds } } : {}) },
      orderBy: { nomorUrut: 'asc' }
    });
    const docs = await prisma.document.findMany({
      where: {
        tahun: String(tahun),
        ...(assignedOpdIds ? { opdId: { in: assignedOpdIds }, jenis: { notIn: RKPD_DOCUMENT_TYPES } } : {})
      }
    });

    const result = opds.map(opd => {
      const opdDocs = docs.filter(d => d.opdId === opd.id);
      const renjaMurni     = opdDocs.find(d => d.jenis === 'Renja Murni');
      const renjaPerubahan = opdDocs.find(d => d.jenis === 'Renja Perubahan');
      const lampiran       = opdDocs.find(d => d.jenis === 'Lampiran Renja');
      const rkpd           = opdDocs.find(d => d.jenis === 'RKPD Murni');
      let done = 0;
      if (renjaMurni?.status     === 'Disetujui') done++;
      if (renjaPerubahan?.status === 'Disetujui') done++;
      if (lampiran?.status       === 'Disetujui') done++;
      if (rkpd?.status           === 'Disetujui') done++;
      return {
        ...opd,
        docsCount: opdDocs.length,
        renjaMurniStatus:     renjaMurni     ? renjaMurni.status     : 'Belum Ada',
        renjaPerubahanStatus: renjaPerubahan ? renjaPerubahan.status : 'Belum Ada',
        lampiranStatus:       lampiran       ? lampiran.status       : 'Belum Ada',
        rkpdStatus:           rkpd           ? rkpd.status           : 'Belum Ada',
        progress: Math.round((done / 4) * 100),
      };
    });

    res.json({ tahun, totalOpd: opds.length, opds: result });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil monitoring' });
  }
});

// ─── EXPORT DOCX ─────────────────────────────────────────────────────────────

function formatRelativeTime(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

app.put('/api/documents/:id/regulation', authMiddleware, async (req, res) => {
  if (denyUnlessSuperAdmin(req, res)) return;
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc?.isLampiranOtomatis) return res.status(400).json({ error: 'Dokumen bukan lampiran' });
    const regulation = {
      ...(doc.regulation || {}),
      ...Object.fromEntries(['nomor', 'tanggal', 'tanggalDiundangkan', 'nomorBerita'].map(key => [key, String(req.body[key] || '').slice(0,200)]))
    };
    res.json(await prisma.document.update({ where: { id: doc.id }, data: { regulation } }));
  } catch (e) { res.status(500).json({ error: 'Gagal menyimpan data peraturan' }); }
});

// Template sections generator (untuk buat dokumen baru via template)
function generateDefaultSections(docType, opdName, tahun) {
  const collaborativeOutline = isRkpdDocument(docType) ? [
    { title: 'BAB I PENDAHULUAN', items: [['1.1', 'Latar Belakang'], ['1.2', 'Dasar Hukum'], ['1.3', 'Hubungan Antar Dokumen'], ['1.4', 'Maksud dan Tujuan'], ['1.5', 'Sistematika Penulisan']] },
    { title: 'BAB II GAMBARAN UMUM KONDISI DAERAH', items: [['2.1', 'Kondisi Geografis dan Demografi'], ['2.2', 'Kesejahteraan Masyarakat'], ['2.3', 'Pelayanan Umum'], ['2.4', 'Daya Saing Daerah']] },
    { title: 'BAB III KERANGKA EKONOMI DAN KEUANGAN DAERAH', items: [['3.1', 'Arah Kebijakan Ekonomi Daerah'], ['3.2', 'Arah Kebijakan Keuangan Daerah']] },
    { title: 'BAB IV SASARAN DAN PRIORITAS PEMBANGUNAN DAERAH', items: [['4.1', 'Tujuan dan Sasaran Pembangunan'], ['4.2', 'Prioritas Pembangunan Daerah'], ['4.3', 'Prioritas Wilayah dan Program']] },
    { title: 'BAB V RENCANA KERJA DAN PENDANAAN DAERAH', items: [['5.1', 'Rencana Program dan Kegiatan'], ['5.2', 'Pagu Indikatif dan Sumber Pendanaan']] },
    { title: 'BAB VI KINERJA PENYELENGGARAAN PEMERINTAHAN DAERAH', items: [['6.1', 'Indikator Kinerja Utama'], ['6.2', 'Indikator Kinerja Daerah']] },
    { title: 'BAB VII PENUTUP', items: [['7.1', 'Kaidah Pelaksanaan'], ['7.2', 'Pemantauan dan Evaluasi']] }
  ] : docType === 'RPJMD' ? [
    { title: 'BAB I PENDAHULUAN', items: [['1.1', 'Latar Belakang'], ['1.2', 'Dasar Hukum'], ['1.3', 'Hubungan Antar Dokumen'], ['1.4', 'Maksud dan Tujuan'], ['1.5', 'Sistematika Penulisan']] },
    { title: 'BAB II GAMBARAN UMUM KONDISI DAERAH', items: [['2.1', 'Aspek Geografi dan Demografi'], ['2.2', 'Aspek Kesejahteraan Masyarakat'], ['2.3', 'Aspek Pelayanan Umum'], ['2.4', 'Aspek Daya Saing Daerah']] },
    { title: 'BAB III PERMASALAHAN DAN ISU STRATEGIS DAERAH', items: [['3.1', 'Permasalahan Pembangunan'], ['3.2', 'Isu Strategis Daerah']] },
    { title: 'BAB IV VISI, MISI, TUJUAN DAN SASARAN', items: [['4.1', 'Visi dan Misi'], ['4.2', 'Tujuan dan Sasaran'], ['4.3', 'Strategi Pencapaian']] },
    { title: 'BAB V STRATEGI, ARAH KEBIJAKAN DAN PROGRAM', items: [['5.1', 'Strategi dan Arah Kebijakan'], ['5.2', 'Program Pembangunan Daerah'], ['5.3', 'Program Perangkat Daerah']] },
    { title: 'BAB VI KINERJA PENYELENGGARAAN PEMERINTAHAN DAERAH', items: [['6.1', 'Indikator Kinerja Utama'], ['6.2', 'Indikator Kinerja Daerah']] },
    { title: 'BAB VII PENUTUP', items: [['7.1', 'Pedoman Transisi'], ['7.2', 'Kaidah Pelaksanaan']] }
  ] : null;

  if (collaborativeOutline) {
    return collaborativeOutline.map((chapter, chapterIndex) => ({
      id: `bab-${chapterIndex + 1}`,
      title: chapter.title,
      order: chapterIndex + 1,
      locked: true,
      subsections: chapter.items.map(([code, title]) => ({
        id: `sub-${code.replace('.', '-')}`,
        code,
        title,
        locked: true,
        content: '<p></p>'
      }))
    }));
  }

  return [
    { id: 'bab-1', title: 'BAB I PENDAHULUAN', order: 1, locked: true,
      subsections: [
        { id:'sub-1-1', code:'1.1', title:'Latar Belakang', locked:true, content:`<p>Rencana Kerja (Renja) ${opdName} Tahun Anggaran ${tahun} disusun sebagai dokumen perencanaan tahunan yang memuat program, kegiatan, sub kegiatan, indikator kinerja, target capaian, serta pagu indikatif pendanaan.</p>` },
        { id:'sub-1-2', code:'1.2', title:'Landasan Hukum', locked:true, content:`<p>Landasan hukum penyusunan Renja ${opdName} Tahun Anggaran ${tahun}:<br/>1. UU No. 25 Tahun 2004 tentang SPPN;<br/>2. UU No. 23 Tahun 2014 tentang Pemda;<br/>3. Permendagri No. 86 Tahun 2017.</p>` },
        { id:'sub-1-3', code:'1.3', title:'Maksud dan Tujuan', locked:true, content:`<p>Maksud penyusunan adalah menyediakan pedoman resmi perencanaan teknis dan penganggaran tahunan bagi ${opdName}.</p>` },
        { id:'sub-1-4', code:'1.4', title:'Sistematika Penulisan', locked:true, content:`<p>Dokumen ini disusun sesuai format baku Permendagri No. 86 Tahun 2017.</p>` },
      ]
    },
    { id: 'bab-2', title: 'BAB II EVALUASI PELAKSANAAN RENJA TAHUN LALU', order: 2, locked: true,
      subsections: [
        { id:'sub-2-1', code:'2.1', title:'Evaluasi Pelaksanaan Renja Tahun Lalu', locked:true, content:'<p>Evaluasi terhadap capaian pelaksanaan program dan kegiatan tahun sebelumnya menunjukkan tingkat efektivitas yang memadai.</p>' },
        { id:'sub-2-2', code:'2.2', title:'Analisis Kinerja Pelayanan Perangkat Daerah', locked:true, content:'<p>Capaian indikator kinerja pelayanan perangkat daerah berjalan optimal.</p>' },
        { id:'sub-2-3', code:'2.3', title:'Isu-Isu Penting', locked:true, content:'<p>Isu strategis mencakup percepatan transformasi digital dan peningkatan kompetensi aparatur.</p>' },
      ]
    },
    { id: 'bab-3', title: 'BAB III TUJUAN, SASARAN, PROGRAM DAN KEGIATAN', order: 3, locked: true,
      subsections: [
        { id:'sub-3-1', code:'3.1', title:'Telaah Kebijakan Nasional dan RPJMD', locked:true, content:'<p>Arah kebijakan berfokus pada pemerataan kesejahteraan dan pertumbuhan ekonomi inklusif.</p>' },
        { id:'sub-3-2', code:'3.2', title:'Tujuan dan Sasaran Renja', locked:true, content:`<p>Tujuan utama Renja Tahun ${tahun} adalah mewujudkan tata kelola yang efektif, transparan, dan berdampak bagi masyarakat.</p>` },
        { id:'sub-3-3', code:'3.3', title:'Program dan Kegiatan Prioritas', locked:true, content:'<p>Program prioritas difokuskan pada penguatan fungsi pelayanan publik dan pemeliharaan sarana prasarana.</p>' },
      ]
    },
    { id: 'bab-4', title: 'BAB IV RENCANA KERJA DAN PENDANAAN PERANGKAT DAERAH', order: 4, locked: true,
      subsections: [
        { id:'sub-4-1', code:'4.1', title:'Program, Kegiatan, Sub Kegiatan, Indikator Kinerja dan Pagu Indikatif', locked:true, content:'<p>Rincian rencana program, kegiatan, sub kegiatan, indikator keluaran, target, dan pagu indikatif pendanaan disajikan pada matriks terlampir.</p>' },
      ]
    },
    { id: 'bab-5', title: 'BAB V PENUTUP', order: 5, locked: true,
      subsections: [
        { id:'sub-5-1', code:'5.1', title:'Kaidah Pelaksanaan', locked:true, content:`<p>Renja ${opdName} Tahun Anggaran ${tahun} menjadi acuan mengikat bagi seluruh unit kerja.</p>` },
        { id:'sub-5-2', code:'5.2', title:'Rencana Tindak Lanjut', locked:true, content:'<p>Pengendalian dan evaluasi dilakukan secara berkala tiap triwulan oleh Tim Pengendalian Internal bersama Bapperida.</p>' },
      ]
    },
  ];
}

// ─── Start server ─────────────────────────────────────────────────────────────
await ensureTemplates(prisma);

app.listen(PORT, () => {
  console.log(`\n🚀 SIPANDA API berjalan di http://localhost:${PORT}`);
  console.log(`   Database : MySQL via Prisma`);
  console.log(`   Env      : ${process.env.NODE_ENV || 'development'}\n`);
});
