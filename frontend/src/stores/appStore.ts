import { defineStore } from 'pinia';
import type { User, UserPreferences, DocumentItem, OPD, ActivityLog, MonitoringItem, PlanningComplianceReport, AppNotification, VerificationSummary } from '../types';
import { apiFetch } from '../lib/api';
import { isPreviewDemo, previewDocuments, previewOpds, previewUsers, readPreviewUser } from '../lib/preview-demo';

const currentCalendarYear = () => new Date().getFullYear();
const defaultPreferences: UserPreferences = {
  language: 'id',
  theme: 'system',
  notificationsEnabled: true,
  showUnreadBadge: true,
  timeZone: 'Asia/Jakarta',
  dateFormat: 'd MMM yyyy'
};

function preferenceStorageKey(userId: string) {
  return `sipanda_preferences:${userId}`;
}

function parsePreferences(value: string | null): UserPreferences {
  if (!value) return { ...defaultPreferences };
  try {
    const saved = JSON.parse(value) as Partial<UserPreferences>;
    return {
      language: saved.language === 'id' ? 'id' : defaultPreferences.language,
      theme: ['light', 'dark', 'system'].includes(saved.theme || '') ? saved.theme as UserPreferences['theme'] : defaultPreferences.theme,
      notificationsEnabled: typeof saved.notificationsEnabled === 'boolean' ? saved.notificationsEnabled : defaultPreferences.notificationsEnabled,
      showUnreadBadge: typeof saved.showUnreadBadge === 'boolean' ? saved.showUnreadBadge : defaultPreferences.showUnreadBadge,
      timeZone: ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC'].includes(saved.timeZone || '') ? saved.timeZone as UserPreferences['timeZone'] : defaultPreferences.timeZone,
      dateFormat: ['d MMM yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd'].includes(saved.dateFormat || '') ? saved.dateFormat as UserPreferences['dateFormat'] : defaultPreferences.dateFormat
    };
  } catch {
    return { ...defaultPreferences };
  }
}

function initialSelectedYear() {
  const currentYear = String(currentCalendarYear());
  const savedYear = localStorage.getItem('sipanda_selected_tahun');
  return savedYear && /^\d{4}$/.test(savedYear) ? savedYear : currentYear;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const useAppStore = defineStore('app', {
  state: () => ({
    currentUser: null as User | null,
    preferenceUserId: null as string | null,
    preferences: { ...defaultPreferences } as UserPreferences,
    availableUsers: [] as User[],
    isAuthenticated: !!localStorage.getItem('sipanda_token'),
    selectedTahun: initialSelectedYear(),
    opds: [] as OPD[],
    documents: [] as DocumentItem[],
    activities: [] as ActivityLog[],
    monitoringList: [] as MonitoringItem[],
    monitoringReport: null as PlanningComplianceReport | null,
    monitoringRequestId: 0,
    notifications: [] as AppNotification[],
    verificationSummary: null as VerificationSummary | null,
    loading: false,
    toasts: [] as Toast[],
    showCreateModal: false,
    searchQuery: '',
    selectedFilterJenis: 'all',
    selectedFilterStatus: 'all',
  }),

  getters: {
    isAdmin: (state) => state.currentUser?.role === 'admin',
    isSuperAdmin: (state) => state.currentUser?.isSuperAdmin === true || state.currentUser?.roleKodes?.includes('super_admin') === true,
    isStaff: (state) => state.currentUser?.role === 'staf',
    isBapperida: (state) => state.currentUser?.role === 'admin' || state.currentUser?.role === 'staf',
    isOpd: (state) => state.currentUser?.role === 'opd',
    currentOpdName: (state) => state.currentUser?.opdName || 'Pemerintah Kabupaten Cirebon',
    availableYears: (): string[] => {
      const currentYear = currentCalendarYear();
      const startYear = Math.min(2025, currentYear - 10);
      const years: string[] = [];
      for (let year = startYear; year <= currentYear + 10; year += 1) {
        years.push(String(year));
      }
      return years;
    },
    filteredDocuments: (state) => {
      let list = state.documents;

      if (state.selectedTahun !== 'all') {
        list = list.filter(d => d.tahun === state.selectedTahun);
      }
      if (state.selectedFilterJenis !== 'all') {
        list = list.filter(d => d.jenis === state.selectedFilterJenis);
      }
      if (state.selectedFilterStatus !== 'all') {
        list = list.filter(d => d.status === state.selectedFilterStatus);
      }
      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        list = list.filter(d =>
          d.judul.toLowerCase().includes(q) ||
          d.opdName.toLowerCase().includes(q) ||
          d.kodeDoc.toLowerCase().includes(q)
        );
      }
      return list;
    }
  },

  actions: {
    loadPreferences(userId: string | null | undefined) {
      this.preferenceUserId = userId || null;
      this.preferences = userId
        ? parsePreferences(localStorage.getItem(preferenceStorageKey(userId)))
        : { ...defaultPreferences };
    },

    updatePreferences(changes: Partial<UserPreferences>) {
      this.preferences = { ...this.preferences, ...changes };
      if (this.preferenceUserId) {
        localStorage.setItem(preferenceStorageKey(this.preferenceUserId), JSON.stringify(this.preferences));
      }
    },

    resetPreferences() {
      this.preferences = { ...defaultPreferences };
      if (this.preferenceUserId) {
        localStorage.removeItem(preferenceStorageKey(this.preferenceUserId));
      }
    },

    setSelectedTahun(year: string) {
      if (!/^\d{4}$/.test(year)) {
        throw new Error(`Tahun anggaran tidak valid: ${year}`);
      }
      this.selectedTahun = year;
      localStorage.setItem('sipanda_selected_tahun', year);
      if (this.isBapperida) {
        this.fetchVerificationSummary(year);
      }
    },

    defaultDocumentYear(jenis: string) {
      const currentYear = currentCalendarYear();
      if (jenis === 'Renja Murni') return String(currentYear + 1);
      if (jenis === 'Renja Perubahan') return String(currentYear);
      return this.selectedTahun;
    },

    addToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
      const id = `${Date.now()}-${Math.random()}`;
      this.toasts.push({ id, message, type });
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
      }, 4000);
    },

    async fetchVerificationSummary(tahun?: string) {
      if (!this.isBapperida) return null;
      try {
        const t = tahun || this.selectedTahun;
        const res = await apiFetch(`/api/admin/verification-summary?tahun=${t}`);
        if (res.ok) {
          const data: VerificationSummary = await res.json();
          this.verificationSummary = data;
          return data;
        }
      } catch (err) {
        console.error('Failed to fetch verification summary:', err);
      }
      return null;
    },

    async fetchCurrentUser() {
      if (isPreviewDemo) {
        const demoUser = readPreviewUser();
        if (demoUser) {
          this.currentUser = demoUser;
          this.availableUsers = previewUsers;
          this.loadPreferences(demoUser.id);
          this.isAuthenticated = true;
          return;
        }
      }
      try {
        const token = localStorage.getItem('sipanda_token');
        const res = await apiFetch('/api/auth/me', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          this.currentUser = data.user;
          this.loadPreferences(data.user?.id);
          this.availableUsers = data.availableUsers || [];
          this.isAuthenticated = true;
          if (!localStorage.getItem('sipanda_token') && data.user) {
            localStorage.setItem('sipanda_token', 'session-token');
          }
          if (this.isBapperida) {
            this.fetchVerificationSummary();
          }
        } else if (res.status === 401) {
          this.logout();
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    },

    async switchUser(userId?: string, opdId?: string, role?: string) {
      try {
        this.loading = true;
        const res = await apiFetch('/api/auth/switch-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, opdId, role })
        });
        if (res.ok) {
          const data = await res.json();
          this.currentUser = data.user;
          this.loadPreferences(data.user?.id);
          this.isAuthenticated = true;
          if (data.token) {
            localStorage.setItem('sipanda_token', data.token);
          }
          if (data.user) {
            localStorage.setItem('sipanda_user', JSON.stringify(data.user));
          }
          this.addToast(`Beralih ke: ${data.user.name} (${data.user.roleLabel})`, 'info');
          await this.fetchDocuments();
          if (this.isBapperida) {
            await this.fetchVerificationSummary();
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          this.addToast(errData.error || 'Gagal beralih pengguna', 'error');
        }
      } catch (err) {
        this.addToast('Gagal beralih pengguna', 'error');
      } finally {
        this.loading = false;
      }
    },

    async fetchOpds() {
      if (isPreviewDemo) {
        this.opds = previewOpds;
        return;
      }
      try {
        const res = await fetch('/api/opds');
        if (res.ok) {
          this.opds = await res.json();
        }
      } catch (err) {
        console.error('Failed to fetch opds:', err);
      }
    },

    async fetchDocuments() {
      if (isPreviewDemo) {
        this.documents = this.currentUser?.role === 'opd'
          ? previewDocuments.filter(document => document.opdId === this.currentUser?.opdId)
          : previewDocuments;
        return;
      }
      try {
        this.loading = true;
        const res = await apiFetch('/api/documents');
        if (res.ok) {
          this.documents = await res.json();
        }
        if (this.isBapperida) {
          this.fetchVerificationSummary();
        }
      } catch (err) {
        console.error('Failed to fetch documents:', err);
      } finally {
        this.loading = false;
      }
    },

    async fetchNotifications() {
      try {
        const res = await apiFetch('/api/notifications');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mengambil notifikasi');
        this.notifications = data;
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        throw error;
      }
    },

    async sendNotification(payload: { title: string; message: string; opdId: string }) {
      try {
        const res = await apiFetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mengirim notifikasi');
        this.addToast(`Notifikasi berhasil dikirim ke ${data.sentCount} OPD.`, 'success');
        await this.fetchNotifications();
        return data as { success: true; sentCount: number };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengirim notifikasi';
        this.addToast(message, 'error');
        throw error;
      }
    },

    async markNotificationRead(id: string) {
      try {
        const res = await apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memperbarui notifikasi');
        const notification = this.notifications.find(item => item.id === id);
        if (notification) notification.readAt = data.readAt;
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        throw error;
      }
    },

    async fetchMonitoring(tahun?: string) {
      const requestId = ++this.monitoringRequestId;
      this.monitoringReport = null;
      this.monitoringList = [];
      try {
        const t = tahun || this.selectedTahun;
        const res = await apiFetch(`/api/stats/monitoring?tahun=${t}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mengambil monitoring kepatuhan');
        if (requestId === this.monitoringRequestId) {
          this.monitoringReport = data;
          this.monitoringList = data.opds;
        }
      } catch (err) {
        console.error('Failed to fetch monitoring:', err);
        throw err;
      }
    },

    async fetchDashboardStats() {
      try {
        const res = await apiFetch('/api/stats/dashboard');
        if (res.ok) {
          const data = await res.json();
          if (data.activities) {
            this.activities = data.activities;
          }
          return data;
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
      return null;
    },

    async createDocument(formData: FormData | Record<string, any>, isFormData = false) {
      try {
        this.loading = true;
        const options: RequestInit = {
          method: 'POST',
          body: isFormData ? (formData as FormData) : JSON.stringify(formData),
          headers: isFormData ? {} : { 'Content-Type': 'application/json' }
        };
        const res = await apiFetch('/api/documents', options);
        if (!res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const err = await res.json();
            throw new Error(err.error || `Gagal membuat dokumen (HTTP ${res.status})`);
          }
          throw new Error(`Layanan unggah memberi respons tidak valid (HTTP ${res.status}). Muat ulang aplikasi dan coba lagi.`);
        }
        const newDoc = await res.json();
        if (newDoc.warnings?.length) {
          this.addToast(`Dokumen "${newDoc.judul}" tersimpan. ${newDoc.warnings.join(' ')}`, 'error');
        } else {
          this.addToast(`Dokumen "${newDoc.judul}" berhasil dibuat!`, 'success');
        }
        await this.fetchDocuments();
        return newDoc;
      } catch (err: any) {
        this.addToast(err.message || 'Terjadi kesalahan saat membuat dokumen', 'error');
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateDocument(id: string, payload: Partial<DocumentItem>) {
      try {
        const res = await apiFetch(`/api/documents/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Gagal menyimpan perubahan');
        }
        const updated = await res.json();
        const idx = this.documents.findIndex(d => d.id === id);
        if (idx !== -1) {
          this.documents[idx] = updated;
        }
        return updated;
      } catch (err: any) {
        this.addToast(err.message, 'error');
        throw err;
      }
    },

    async submitDocument(id: string) {
      try {
        this.loading = true;
        const res = await apiFetch(`/api/documents/${id}/submit`, {
          method: 'POST'
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.emptySections) {
            throw new Error(`${data.error}\n• ${data.emptySections.join('\n• ')}`);
          }
          throw new Error(data.error || 'Gagal mengajukan dokumen');
        }
        this.addToast('Dokumen induk dan lampiran otomatis berhasil diajukan ke Admin Bapperida untuk verifikasi!', 'success');
        await this.fetchDocuments();
        return data.document;
      } catch (err: any) {
        this.addToast(err.message, 'error');
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async replaceRevisionFile(id: string, file: File) {
      try {
        const isCompletingDraft = this.documents.find(doc => doc.id === id)?.status === 'Draft';
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiFetch(`/api/documents/${id}/file`, {
          method: 'PUT',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Gagal mengunggah berkas perbaikan');
        }
        const index = this.documents.findIndex(doc => doc.id === id);
        if (index !== -1) this.documents[index] = data.document;
        this.addToast(
          isCompletingDraft
            ? 'Berkas dokumen berhasil diunggah. Draf siap dilanjutkan atau diajukan.'
            : 'Berkas perbaikan berhasil diunggah. Ajukan ulang untuk verifikasi.',
          'success'
        );
        return data.document;
      } catch (err: any) {
        this.addToast(err.message || 'Terjadi kesalahan saat mengunggah berkas perbaikan', 'error');
        throw err;
      }
    },

    logout() {
      this.currentUser = null;
      this.loadPreferences(null);
      this.isAuthenticated = false;
      this.documents = [];
      this.opds = [];
      this.activities = [];
      this.availableUsers = [];
      this.verificationSummary = null;
      localStorage.removeItem('sipanda_token');
      localStorage.removeItem('sipanda_user');
    },

    async verifyDocument(id: string, status: 'Disetujui' | 'Perlu Revisi', catatanRevisi = '') {
      try {
        this.loading = true;
        const res = await apiFetch(`/api/documents/${id}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, catatanRevisi })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Gagal memverifikasi dokumen');
        }
        this.addToast(
          status === 'Disetujui'
            ? 'Dokumen Disetujui Bapperida. Super Admin dapat memfinalkan dokumen untuk memasukkannya ke Arsip OPD.'
            : 'Catatan revisi berhasil dikirimkan ke OPD bersangkutan.',
          status === 'Disetujui' ? 'success' : 'info'
        );
        await this.fetchDocuments();
        if (this.isBapperida) {
          await this.fetchVerificationSummary();
        }
        return data.document;
      } catch (err: any) {
        this.addToast(err.message, 'error');
        throw err;
      } finally {
        this.loading = false;
      }
    }
  }
});
