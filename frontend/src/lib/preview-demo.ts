import type { DocumentItem, User } from '../types';
import { OPDS } from '../constants/opds';

export const isPreviewDemo = import.meta.env.VITE_DEMO_MODE === 'true';

export const previewUsers: User[] = [
  {
    id: 'preview-admin', username: 'admin-demo', name: 'Admin SIPANDA (Demo)', nip: '-',
    role: 'admin', roleLabel: 'Super Admin', roleKodes: ['super_admin'], isSuperAdmin: true,
    jabatan: 'Administrator Bapperida', opdId: 'bapperida', opdName: 'Bapperida Kabupaten Cirebon', avatar: ''
  },
  {
    id: 'preview-opd-kesehatan', username: 'opd-demo', name: 'OPD Dinas Kesehatan (Demo)', nip: '-',
    role: 'opd', roleLabel: 'OPD', singkatan: 'Dinkes',
    jabatan: 'Perencana OPD', opdId: 'dinkes', opdName: 'Dinas Kesehatan', avatar: ''
  }
];

export const previewOpds = OPDS.map(opd => ({
  nomorUrut: opd.nomorUrut,
  nomorLampiran: opd.nomorLampiran,
  id: opd.id,
  kode: opd.id,
  nama: opd.nama,
  singkatan: opd.singkatan,
  kategori: opd.kategori
}));

const previewYear = String(new Date().getFullYear() + 1);
export const previewDocuments: DocumentItem[] = [
  {
    id: 'preview-renja-dinkes-submitted', kodeDoc: 'RENJA-DINKES-DEMO-01', nomorSurat: '-',
    nomerRegistrasiArsip: '-', jenis: 'Renja Murni', tahun: previewYear,
    judul: 'Rancangan Renja Dinas Kesehatan', subJudul: 'Data simulasi untuk preview',
    opdId: 'dinkes', opdName: 'Dinas Kesehatan', createdById: 'preview-opd-kesehatan',
    cara: 'template', status: 'Menunggu Verifikasi', updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'preview-renja-dinkes-draft', kodeDoc: 'RENJA-DINKES-DEMO-02', nomorSurat: '-',
    nomerRegistrasiArsip: '-', jenis: 'Renja Murni', tahun: previewYear,
    judul: 'Draf Renja Dinas Kesehatan', subJudul: 'Data simulasi untuk preview',
    opdId: 'dinkes', opdName: 'Dinas Kesehatan', createdById: 'preview-opd-kesehatan',
    cara: 'template', status: 'Draft', updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

export function readPreviewUser(): User | null {
  if (!isPreviewDemo || localStorage.getItem('sipanda_token') !== 'sipanda-preview-demo') return null;
  try {
    const user = JSON.parse(localStorage.getItem('sipanda_user') || 'null') as User | null;
    return user && previewUsers.some(candidate => candidate.id === user.id) ? user : null;
  } catch {
    return null;
  }
}
