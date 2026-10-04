export type UserRole = 'admin' | 'staf' | 'opd';

export interface User {
  id: string;
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
}

export interface Section {
  id: string;
  title: string;
  locked: boolean;
  subsections: Subsection[];
}

export interface DocumentItem {
  templateId?: string;
  templateSnapshot?: { id: string; nama: string; versi: number; tahun: string };
  frontMatter?: { preface: string };
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
  documentSettings?: { global: { bupati: string; sekretarisDaerah: string }; opd: Record<string,string> };
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
  docCode?: string;
  docTitle: string;
  detail: string;
  timestamp: string;
  tag: string;
  badge: string;
  icon: string;
  color: string;
}

export interface MonitoringItem extends OPD {
  docsCount: number;
  renjaMurniStatus: string;
  renjaPerubahanStatus: string;
  lampiranStatus: string;
  rkpdStatus: string;
  progress: number;
}
