export type UserRole = 'admin' | 'staf' | 'opd';

export interface User {
  id: string;
  username?: string;
  name: string;
  singkatan?: string;
  nip: string;
  role: UserRole;
  roleLabel: string;
  roleKodes?: string[];
  isSuperAdmin?: boolean;
  jabatan: string;
  opdId: string;
  opdName: string;
  avatar: string;
}

export interface UserPreferences {
  language: 'id';
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  showUnreadBadge: boolean;
  timeZone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura' | 'UTC';
  dateFormat: 'd MMM yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';
}

export interface OPD {
  nomorUrut: number;
  nomorLampiran: string;
  id: string;
  kode: string;
  nama: string;
  singkatan: string;
  kategori: string;
}

export type DocumentType = 'Renja Murni' | 'Renja Perubahan' | 'Lampiran Renja' | 'Lampiran Perbup Renja' | 'Lampiran Kepbup Perubahan Renja' | 'Lampiran Perbup Renstra' | 'Renstra' | 'Renstra Murni' | 'Renstra Perubahan' | 'RKPD' | 'RKPD Murni' | 'RKPD Perubahan' | 'RPJMD';
export type DocumentStatus = 'Draft' | 'Menunggu Verifikasi' | 'Perlu Revisi' | 'Disetujui';
export type DocumentMethod = 'template' | 'upload';

export interface Subsection {
  tables?: Array<{ id: string; type: string; rows: Array<{level: string; cells: string[]}> }>;
  id: string;
  code: string;
  title: string;
  locked: boolean;
  content: string;
  orientation?: 'portrait' | 'landscape';
  pageBreakBefore?: boolean;
  legacyOrientationWarning?: boolean;
}

export interface Section {
  id: string;
  title: string;
  locked: boolean;
  subsections: Subsection[];
}

  export interface DocumentItem {
    editorRevisions?: Record<string,string>;
  templateId?: string;
  templateSnapshot?: { id: string; nama: string; versi: number; tahun: string };
  frontMatter?: { preface?: string; cover?: string };
  regulation?: {
    nomor?: string;
    tanggal?: string;
    tanggalDiundangkan?: string;
    nomorBerita?: string;
    nomorPeraturan?: string;
    tahunPenetapan?: string;
    nomorKepbup?: string;
    tanggalKepbup?: string;
    periodeMulai?: string;
    periodeAkhir?: string;
  };
  documentSettings?: { global: { bupati: string; sekretarisDaerah: string; logoData?: string }; opd: Record<string,string>; opdRecord?: { id?: string; nama?: string; nomorLampiran?: string } };
  id: string;
  kodeDoc: string;
  nomorSurat: string;
  nomerRegistrasiArsip: string;
  jenis: DocumentType;
  tahun: string;
  judul: string;
  subJudul: string;
  opdId: string;
  opdName: string;
  createdById?: string | null;
  cara: DocumentMethod;
  status: DocumentStatus;
  catatanRevisi?: string | null;
  verifierName?: string | null;
  verifierJabatan?: string | null;
  sections?: Section[];
  filePath?: string | null;
  fileName?: string | null;
  updatedAt: string;
  createdAt: string;
  tteNumber?: string | null;
  parentId?: string | null;
  isLampiranOtomatis?: boolean;
  permissions?: {
    canEdit: boolean;
    canVerify: boolean;
    editableBabIds: string[];
  };
}

export interface ActivityLog {
  id: string;
  documentId?: string | null;
  docCode?: string;
  docTitle: string;
  detail: string;
  timestamp: string;
  tag: string;
  badge: string;
  icon: string;
  color: string;
}

export interface PlanningComplianceItem {
  key: string;
  label: string;
  year: string;
  documentId: string | null;
  documentType: string | null;
  status: string;
  tteNumber: string | null;
  approved: boolean;
  parentStatus?: string;
}

export interface MonitoringItem {
  id: string;
  kode: string;
  nama: string;
  kategori: string | null;
  completedCount: number;
  createdCount: number;
  submittedCount: number;
  optionalItems: PlanningComplianceItem[];
  createdRatio: string;
  requiredCount: number;
  ratio: string;
  isComplete: boolean;
  items: PlanningComplianceItem[];
}

export interface PlanningComplianceReport {
  tahun: string;
  totalOpd: number;
  completedOpd: number;
  approvedDocuments: number;
  submittedDocuments: number;
  optionalSubmittedDocuments: number;
  totalDocuments: number;
  completionRate: number;
  opds: MonitoringItem[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  senderName: string | null;
  opdName: string | null;
}
