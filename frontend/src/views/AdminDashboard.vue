<template>
  <div class="space-y-6">
    <!-- 1. Header Bersih & Aksi Cepat (Keterangan panjang & info duplikasi dihapus) -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Dashboard Verifikasi e-Renja
        </h1>
      </div>

      <!-- Tombol Aksi Utama -->
      <div class="flex items-center gap-2.5 shrink-0">
        <router-link
          to="/verifikasi"
          class="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs"
        >
          <CheckCircle class="w-4 h-4 text-slate-500" />
          <span>Antrean Verifikasi</span>
        </router-link>
        <button
          @click="store.showCreateModal = true"
          class="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-blue-500/20"
        >
          <Plus class="w-4 h-4" />
          <span>Buat Dokumen Baru</span>
        </button>
      </div>
    </div>

    <!-- 2. Kartu Metrik Interaktif (Sekaligus sebagai satu-satunya pemicu filter status dokumen) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Total Usulan Renja -->
      <div
        @click="statusFilter = 'all'"
        class="bg-white border rounded-2xl p-5 shadow-2xs cursor-pointer transition-all hover:border-blue-400 group"
        :class="statusFilter === 'all' ? 'border-blue-600 ring-2 ring-blue-600/10 bg-blue-50/20' : 'border-slate-200'"
      >
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-600 transition-colors">
            Total Dokumen Masuk
          </span>
          <Folder class="w-4 h-4 text-blue-600" />
        </div>
        <div class="flex items-baseline justify-between">
          <div class="text-3xl font-extrabold text-slate-900 tracking-tight">
            {{ incomingDocsCount }}
          </div>
          <span class="text-[11px] font-semibold text-slate-400">Semua Status</span>
        </div>
      </div>

      <!-- 2. Menunggu Verifikasi -->
      <div
        @click="statusFilter = 'Menunggu Verifikasi'"
        class="bg-white border rounded-2xl p-5 shadow-2xs cursor-pointer transition-all hover:border-amber-400 group"
        :class="statusFilter === 'Menunggu Verifikasi' ? 'border-amber-500 ring-2 ring-amber-500/10 bg-amber-50/20' : 'border-slate-200'"
      >
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-600 transition-colors">
            Menunggu Verifikasi
          </span>
          <span class="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Prioritas Verifikasi
          </span>
        </div>
        <div class="flex items-baseline justify-between">
          <div class="text-3xl font-extrabold text-slate-900 tracking-tight">
            {{ countMenunggu }}
          </div>
          <span class="text-[11px] font-semibold text-amber-600">Perlu Verifikasi</span>
        </div>
      </div>

      <!-- 3. Perlu Revisi -->
      <div
        @click="statusFilter = 'Perlu Revisi'"
        class="bg-white border rounded-2xl p-5 shadow-2xs cursor-pointer transition-all hover:border-rose-400 group"
        :class="statusFilter === 'Perlu Revisi' ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-50/20' : 'border-slate-200'"
      >
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-rose-600 transition-colors">
            Perlu Revisi
          </span>
          <AlertCircle class="w-4 h-4 text-rose-500" />
        </div>
        <div class="flex items-baseline justify-between">
          <div class="text-3xl font-extrabold text-slate-900 tracking-tight">
            {{ countRevisi }}
          </div>
          <span class="text-[11px] font-semibold text-rose-600">Catatan Aktif</span>
        </div>
      </div>

      <!-- 4. Disetujui / BA Sah -->
      <div
        @click="statusFilter = 'Disetujui'"
        class="bg-white border rounded-2xl p-5 shadow-2xs cursor-pointer transition-all hover:border-emerald-400 group"
        :class="statusFilter === 'Disetujui' ? 'border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/20' : 'border-slate-200'"
      >
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-600 transition-colors">
            Disetujui & BA Sah
          </span>
          <span class="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
            {{ persenSah }}%
          </span>
        </div>
        <div class="flex items-baseline justify-between">
          <div class="text-3xl font-extrabold text-slate-900 tracking-tight">
            {{ countDisetujui }}
          </div>
          <span class="text-[11px] font-semibold text-emerald-600">TTE Diterbitkan</span>
        </div>
      </div>
    </div>

    <!-- 3. Area Utama: Tabel Dokumen & Feed Aktivitas Terkini -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- Tabel Dokumen Usulan (2 Kolom) -->
      <div class="xl:col-span-2 space-y-4">
        <!-- Toolbar Tabel (Bebas dari duplikasi filter status yang sudah ada di kartu atas) -->
        <div class="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <!-- Judul Tabel & Indikator Filter Aktif -->
          <div class="flex items-center gap-2">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-800">
              Daftar Usulan Dokumen
            </h2>
            <span
              v-if="statusFilter !== 'all'"
              class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
            >
              Filter: {{ formatStatusLabel(statusFilter) }}
              <button @click="statusFilter = 'all'" title="Hapus Filter" class="hover:text-rose-600 font-bold ml-0.5">✕</button>
            </span>
          </div>

          <!-- Periode Dropdown, Pencarian Tunggal, & Tombol Export -->
          <div class="flex items-center gap-2 flex-1 justify-end min-w-[280px]">
            <!-- Periode Waktu -->
            <select
              v-model="selectedTimeframe"
              class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Semua Periode</option>
              <option value="tahun">T.A. {{ store.selectedTahun }}</option>
              <option value="tw1">Triwulan I</option>
              <option value="tw2">Triwulan II</option>
              <option value="bulan">Bulan Ini</option>
            </select>

            <!-- Search Bar Tunggal -->
            <div class="relative w-48 sm:w-60">
              <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                v-model="store.searchQuery"
                type="text"
                placeholder="Cari ID, dokumen, OPD..."
                class="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
              />
              <button
                v-if="store.searchQuery"
                @click="store.searchQuery = ''"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <!-- Export Rekap -->
            <button
              @click="exportRekap"
              title="Unduh Rekap Excel"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors shrink-0 shadow-2xs"
            >
              <Download class="w-3.5 h-3.5 text-slate-500" />
              <span class="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        <!-- Tabel Dokumen (Bersih & Rapi) -->
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th class="py-3 px-3.5 w-12 text-center">No</th>
                  <th class="py-3 px-4">Dokumen Perencanaan</th>
                  <th class="py-3 px-4 w-44">OPD Pengaju</th>
                  <th class="py-3 px-4 w-40 text-center">Status Verifikasi</th>
                  <th class="py-3 px-4 w-28 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="(doc, idx) in displayedDocs"
                  :key="doc.id"
                  class="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  @click="openDocument(doc)"
                >
                  <!-- Kolom 1: Nomor Urut -->
                  <td class="py-3.5 px-3.5 text-center font-mono text-slate-400 font-semibold">
                    {{ String(idx + 1).padStart(2, '0') }}
                  </td>

                  <!-- Kolom 2: Nama Dokumen & ID Pembeda -->
                  <td class="py-3.5 px-4">
                    <div class="flex items-start gap-3">
                      <!-- Format Badge (PDF/DOC) -->
                      <span
                        class="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-[9px] shrink-0 mt-0.5"
                        :class="getFileBadgeClass(doc)"
                      >
                        {{ getFileBadgeLabel(doc) }}
                      </span>

                      <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <!-- ID / Nomor Registrasi Dokumen -->
                          <span class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            #{{ doc.kodeDoc || doc.id }}
                          </span>
                          <!-- Judul Bersih -->
                          <span class="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {{ cleanDocTitle(doc) }}
                          </span>
                        </div>
                        <!-- Sub judul / Rincian Program -->
                        <div class="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {{ doc.subJudul || 'Dokumen usulan perencanaan tahun anggaran berjalan' }}
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Kolom 3: OPD Pengaju -->
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-blue-100">
                        <Building2 class="w-3.5 h-3.5" />
                      </div>
                      <span class="font-semibold text-slate-800 text-xs truncate" :title="doc.opdName">
                        {{ cleanOpdName(doc.opdName) }}
                      </span>
                    </div>
                  </td>

                  <!-- Kolom 4: Status Verifikasi -->
                  <td class="py-3.5 px-4 text-center">
                    <span
                      class="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                      :class="getStatusBadgeClass(doc.status)"
                    >
                      {{ formatStatusLabel(doc.status) }}
                    </span>
                  </td>

                  <!-- Kolom 5: Aksi -->
                  <td class="py-3.5 px-4 text-right">
                    <button
                      @click.stop="openDocument(doc)"
                      class="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                    >
                      {{ doc.status === 'Menunggu Verifikasi' ? 'Verifikasi' : doc.status === 'Draft' ? 'Buka Draf' : 'Lihat' }} &rsaquo;
                    </button>
                  </td>
                </tr>

                <!-- State Kosong jika Filter Tidak Menemukan Hasil -->
                <tr v-if="displayedDocs.length === 0">
                  <td colspan="5" class="py-12 text-center text-slate-400">
                    <Folder class="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p class="font-medium text-xs">Tidak ada dokumen yang sesuai dengan kriteria filter</p>
                    <button
                      @click="resetFilter"
                      class="mt-2 text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Reset Filter & Pencarian
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Menampilkan <span class="font-bold text-slate-700">{{ displayedDocs.length }}</span> dari
              <span class="font-bold text-slate-700">{{ listedDocsCount }}</span> Dokumen
            </div>
            <div class="flex items-center gap-1">
              <span class="text-[11px] text-slate-400 mr-2">Halaman 1</span>
              <button disabled class="p-1 rounded-lg border border-slate-200 text-slate-300 cursor-not-allowed">
                <ChevronLeft class="w-3.5 h-3.5" />
              </button>
              <button class="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</button>
              <button disabled class="p-1 rounded-lg border border-slate-200 text-slate-300 cursor-not-allowed">
                <ChevronRight class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Feed Aktivitas Terkini -->
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <!-- Header Card -->
          <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-slate-900">Aktivitas Terkini</h2>
              <span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                Real-time
              </span>
            </div>
            <button @click="refreshActivity" title="Perbarui Log" class="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
              <RotateCw class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Activity List Item -->
          <div class="space-y-3.5">
            <div
              v-for="act in activityList"
              :key="act.id"
              class="flex items-start gap-3 text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0"
            >
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]"
                :class="getActivityBadgeBg(act.color)"
              >
                <FileText v-if="act.icon === 'file-text'" class="w-3.5 h-3.5" />
                <Table v-else-if="act.icon === 'table'" class="w-3.5 h-3.5" />
                <CheckCircle v-else-if="act.icon === 'file-check' || act.icon === 'check-circle'" class="w-3.5 h-3.5" />
                <FileSpreadsheet v-else-if="act.icon === 'file-spreadsheet'" class="w-3.5 h-3.5" />
                <AlertCircle v-else class="w-3.5 h-3.5" />
              </div>

              <!-- Konten Rincian -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1">
                  <div class="flex items-center gap-1.5 truncate">
                    <span v-if="act.docCode" class="font-mono text-[9px] font-bold px-1 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200 shrink-0">
                      #{{ act.docCode }}
                    </span>
                    <span class="font-bold text-slate-800 truncate" :title="act.docTitle">
                      {{ act.docTitle }}
                    </span>
                  </div>
                  <span class="text-[10px] text-slate-400 shrink-0 font-medium">{{ act.timestamp }}</span>
                </div>

                <div class="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  {{ act.detail }}
                </div>

                <div class="flex items-center gap-1.5 mt-1.5">
                  <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                    {{ act.tag }}
                  </span>
                  <span
                    class="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    :class="getMiniBadgeColor(act.badge)"
                  >
                    {{ act.badge }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tombol Lihat Semua Log -->
          <router-link
            to="/monitoring"
            class="block text-center w-full mt-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-blue-600 text-xs font-bold transition-colors"
          >
            Lihat Monitoring Seluruh OPD &rsaquo;
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import type { DocumentItem } from '../types';
import {
  Folder,
  AlertCircle,
  Search,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  FileText,
  Table,
  CheckCircle,
  FileSpreadsheet,
  Building2
} from '@lucide/vue';

const store = useAppStore();
const router = useRouter();

const selectedTimeframe = ref('all');
const statusFilter = ref('all');
const dashboardStats = ref<any>(null);

const dashboardDocuments = computed(() => store.documents.filter(doc =>
  doc.status !== 'Draft' || doc.createdById === store.currentUser?.id
));
const primaryDashboardDocuments = computed(() => dashboardDocuments.value.filter(doc => !doc.parentId && !doc.isLampiranOtomatis));
const incomingDocuments = computed(() => primaryDashboardDocuments.value.filter(doc =>
  doc.status === 'Menunggu Verifikasi' ||
  doc.status === 'Perlu Revisi' ||
  doc.status === 'Disetujui'
));

// Kartu statistik hanya menghitung dokumen yang sudah diajukan, bukan draf OPD.
const listedDocsCount = computed(() => primaryDashboardDocuments.value.length);
const incomingDocsCount = computed(() => incomingDocuments.value.length);
const countMenunggu = computed(() => incomingDocuments.value.filter(d => d.status === 'Menunggu Verifikasi').length);
const countRevisi = computed(() => incomingDocuments.value.filter(d => d.status === 'Perlu Revisi').length);
const countDisetujui = computed(() => incomingDocuments.value.filter(d => d.status === 'Disetujui').length);
const persenSah = computed(() => {
  if (incomingDocsCount.value === 0) return '0';
  return Math.round((countDisetujui.value / incomingDocsCount.value) * 100);
});

// Filter Dokumen: Terpadu dengan status, timeframe, dan store.searchQuery
const displayedDocs = computed(() => {
  let list = primaryDashboardDocuments.value;

  // Filter Status
  if (statusFilter.value !== 'all') {
    list = list.filter(d => d.status === statusFilter.value);
  }

  // Filter Timeframe
  if (selectedTimeframe.value === 'tahun') {
    list = list.filter(d => d.tahun === store.selectedTahun);
  } else if (selectedTimeframe.value === 'tw1') {
    list = list.filter(d => d.tahun === store.selectedTahun && (d.createdAt?.includes('-01-') || d.createdAt?.includes('-02-') || d.createdAt?.includes('-03-')));
  } else if (selectedTimeframe.value === 'tw2') {
    list = list.filter(d => d.tahun === store.selectedTahun && (d.createdAt?.includes('-04-') || d.createdAt?.includes('-05-') || d.createdAt?.includes('-06-')));
  } else if (selectedTimeframe.value === 'bulan') {
    const now = new Date();
    list = list.filter(d => {
      const createdAt = new Date(d.createdAt);
      return !Number.isNaN(createdAt.getTime()) &&
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth();
    });
  }

  // Filter Pencarian
  if (store.searchQuery.trim()) {
    const q = store.searchQuery.toLowerCase().trim();
    list = list.filter(d =>
      d.judul.toLowerCase().includes(q) ||
      d.opdName.toLowerCase().includes(q) ||
      (d.kodeDoc && d.kodeDoc.toLowerCase().includes(q)) ||
      (d.subJudul && d.subJudul.toLowerCase().includes(q))
    );
  }

  return list;
});

// Bersihkan judul agar tidak mengulang nama OPD jika judul mengandung " - Nama OPD"
const cleanDocTitle = (doc: DocumentItem) => {
  if (!doc.judul) return doc.jenis;
  const parts = doc.judul.split(' - ');
  if (parts.length > 1) {
    return parts[0].trim();
  }
  return doc.judul;
};

// Bersihkan nama OPD agar rapi
const cleanOpdName = (name: string) => {
  if (!name) return 'Perangkat Daerah';
  return name.replace('Kabupaten Cirebon', '').replace('Kab. Cirebon', '').trim();
};

const formatStatusLabel = (status: string) => {
  if (status === 'Menunggu Verifikasi') return 'Menunggu Verifikasi';
  if (status === 'Disetujui') return 'BA Sah';
  if (status === 'Perlu Revisi') return 'Perlu Revisi';
  return status || 'Draft';
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Disetujui':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    case 'Menunggu Verifikasi':
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    case 'Perlu Revisi':
      return 'bg-rose-100 text-rose-800 border border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
};

const getFileBadgeClass = (doc: DocumentItem) => {
  if (doc.cara === 'upload') {
    return doc.fileName?.endsWith('.docx') ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700';
  }
  return doc.jenis.includes('Perubahan') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';
};

const getFileBadgeLabel = (doc: DocumentItem) => {
  if (doc.cara === 'upload') {
    return doc.fileName?.endsWith('.docx') ? 'DOC' : 'PDF';
  }
  return doc.jenis.includes('Perubahan') ? 'P-RNJ' : 'RNJ';
};

const activityList = computed(() => {
  if (store.activities && store.activities.length > 0) {
    return store.activities.slice(0, 6);
  }
  return [];
});

const getActivityBadgeBg = (color: string) => {
  switch (color) {
    case 'red': return 'bg-rose-100 text-rose-600';
    case 'green': return 'bg-emerald-100 text-emerald-600';
    case 'amber': return 'bg-amber-100 text-amber-600';
    case 'blue': return 'bg-blue-100 text-blue-600';
    default: return 'bg-slate-100 text-slate-600';
  }
};

const getMiniBadgeColor = (badge: string) => {
  if (!badge) return 'bg-slate-100 text-slate-600';
  if (badge.includes('Sah') || badge.includes('TTE')) return 'bg-emerald-100 text-emerald-700';
  if (badge.includes('Revisi')) return 'bg-rose-100 text-rose-700';
  if (badge.includes('Antrean') || badge.includes('Baru')) return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
};

const resetFilter = () => {
  statusFilter.value = 'all';
  selectedTimeframe.value = 'all';
  store.searchQuery = '';
};

const openDocument = (doc: DocumentItem) => {
  router.push(`/editor/${doc.id}`);
};

const exportRekap = () => {
  store.addToast('Data rekapitulasi verifikasi Renja berhasil diekspor ke Excel (XLSX)', 'success');
};

const refreshActivity = async () => {
  await store.fetchDashboardStats();
  store.addToast('Daftar log aktivitas diperbarui', 'info');
};

onMounted(async () => {
  await store.fetchDocuments();
  dashboardStats.value = await store.fetchDashboardStats();
});
</script>
