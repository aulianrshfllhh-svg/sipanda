<template>
  <div class="space-y-6">
    <!-- 1. Header Bersih & Aksi Cepat (Keterangan panjang & info duplikasi dihapus) -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Dashboard Verifikasi e-Renja
        </h1>
      </div>


    </div>

    <!-- 2. Kartu Metrik Interaktif (Sekaligus sebagai satu-satunya pemicu filter status dokumen) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Total Usulan Renja -->
      <div
        class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs"
      >
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-600 transition-colors">
            Total Dokumen Masuk
          </span>
          <Folder class="w-4 h-4 text-blue-600" />
        </div>
        <div class="flex items-baseline justify-between">
          <div class="text-3xl font-extrabold text-slate-900 tracking-tight">
            {{ monitoringLoading ? '…' : annualMonitoringTotals?.submitted ?? '—' }}<span class="ml-1 text-lg font-semibold text-slate-400">/{{ annualMonitoringTotals?.required ?? store.opds.length * 4 }}</span>
          </div>
          <span class="text-[11px] font-semibold text-slate-400">Dokumen wajib</span>
        </div>
        <p class="mt-2 text-[10px] text-slate-500">4 dokumen wajib per tahun × {{ store.monitoringReport?.totalOpd ?? store.opds.length }} OPD · 2 Renja dan lampirannya</p>
        <p v-if="store.monitoringReport?.optionalSubmittedDocuments" class="mt-1 text-[10px] font-medium text-blue-700">+ {{ store.monitoringReport.optionalSubmittedDocuments }} dokumen Renstra dari siklus 5 tahunan</p>
      </div>

      <!-- 2. Menunggu Verifikasi -->
      <div
        class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs"
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
        class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs"
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
        class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs"
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

    <div class="flex justify-end">
      <router-link to="/monitoring" class="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-100" :title="`Monitoring OPD untuk tahun ${store.selectedTahun}`">
        {{ monitoringLoading ? 'Memuat...' : `${store.monitoringReport?.completedOpd ?? 0}/${store.monitoringReport?.totalOpd ?? store.opds.length} OPD Selesai` }}
      </router-link>
    </div>
    <p v-if="monitoringError" role="alert" class="text-xs text-rose-700">{{ monitoringError }} <button @click="refreshMonitoring" class="underline">Coba lagi</button></p>

    <!-- Aktivitas dashboard -->
    <div class="w-full">
      <!-- Feed Aktivitas Terkini -->
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs">
          <!-- Header Card -->
          <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold text-slate-900">Aktivitas Terkini</h2>
              <span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                Real-time
              </span>
            </div>
            <button @click="refreshActivity" title="Perbarui Log" class="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
              <RotateCw class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Activity List Item -->
          <div class="space-y-4">
            <div
              v-for="act in activityList"
              :key="act.id"
              class="flex items-start gap-4 text-sm pb-4 border-b border-slate-100 last:border-0 last:pb-0"
            >
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs"
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
                  <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span v-if="act.docCode" class="font-mono text-[9px] font-bold px-1 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200 shrink-0">
                      #{{ act.docCode }}
                    </span>
                    <span class="font-bold text-slate-800 break-words" :title="act.docTitle">
                      {{ act.docTitle }}
                    </span>
                  </div>
                  <span class="text-[10px] text-slate-400 shrink-0 font-medium">{{ act.timestamp }}</span>
                </div>

                <div class="text-sm text-slate-600 mt-1 leading-relaxed">
                  {{ act.detail }}
                </div>

                <div class="flex items-center gap-1.5 mt-1.5">
                  <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                    {{ activityOpdName(act) }}
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

          <p v-if="!activityList.length" class="py-12 text-center text-sm text-slate-500">Belum ada aktivitas terkini.</p>

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
import { ref, computed, onMounted, watch } from 'vue';
import { useAppStore } from '../stores/appStore';
import type { ActivityLog } from '../types';
import {
  Folder,
  AlertCircle,
  RotateCw,
  FileText,
  Table,
  CheckCircle,
  FileSpreadsheet,
} from '@lucide/vue';

const store = useAppStore();

const dashboardStats = ref<any>(null);
const monitoringLoading = ref(false);
const monitoringError = ref('');
let monitoringRequest = 0;
const annualMonitoringTotals = computed(() => {
  const report = store.monitoringReport;
  if (!report || !Array.isArray(report.opds)) return null;
  const annualKeys = new Set(['renjaMurni', 'lampiranRenjaMurni', 'renjaPerubahan', 'lampiranRenjaPerubahan']);
  const submittedStatuses = new Set(['Menunggu Verifikasi', 'Perlu Revisi', 'Disetujui']);
  const submitted = report.opds.reduce((sum, opd) => sum + (opd.items || []).filter(item =>
    annualKeys.has(item.key) && item.documentId && submittedStatuses.has(item.status)
      && (!item.parentStatus || submittedStatuses.has(item.parentStatus))
  ).length, 0);
  return { submitted, required: report.totalOpd * 4 };
});

const refreshMonitoring = async () => {
  const request = ++monitoringRequest;
  monitoringLoading.value = true;
  monitoringError.value = '';
  try {
    await store.fetchMonitoring(store.selectedTahun);
  } catch (error) {
    if (request === monitoringRequest) {
      monitoringError.value = error instanceof Error ? error.message : 'Gagal memuat rekap kepatuhan OPD';
    }
  } finally {
    if (request === monitoringRequest) monitoringLoading.value = false;
  }
};

watch(() => store.selectedTahun, refreshMonitoring, { immediate: true });

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
const incomingDocsCount = computed(() => incomingDocuments.value.length);
const countMenunggu = computed(() => incomingDocuments.value.filter(d => d.status === 'Menunggu Verifikasi').length);
const countRevisi = computed(() => incomingDocuments.value.filter(d => d.status === 'Perlu Revisi').length);
const countDisetujui = computed(() => incomingDocuments.value.filter(d => d.status === 'Disetujui').length);
const persenSah = computed(() => {
  if (incomingDocsCount.value === 0) return '0';
  return Math.round((countDisetujui.value / incomingDocsCount.value) * 100);
});

const activityList = computed(() => {
  if (store.activities && store.activities.length > 0) {
    return store.activities
      .filter(activity => ['Verifikasi Level 1', 'Perlu Revisi', 'Sah / TTE', 'Berkas Revisi'].includes(activity.badge))
      .slice(0, 6);
  }
  return [];
});

const activityOpdName = (activity: ActivityLog) => {
  const document = store.documents.find(doc => doc.id === activity.documentId);
  if (document?.opdName) return document.opdName;
  const matches = store.opds.filter(opd =>
    opd.nama === activity.tag || opd.singkatan === activity.tag ||
    opd.nama === `Kecamatan ${activity.tag}`
  );
  return matches.length === 1 ? matches[0]!.nama : activity.tag;
};

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

const refreshActivity = async () => {
  await store.fetchDashboardStats();
  store.addToast('Daftar log aktivitas diperbarui', 'info');
};

onMounted(async () => {
  const [, stats] = await Promise.all([
    store.fetchDocuments(),
    store.fetchDashboardStats()
  ]);
  dashboardStats.value = stats;
});
</script>
