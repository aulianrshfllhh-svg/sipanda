<template>
  <div class="space-y-4">
    <!-- Banner pemberitahuan dokumen belum difinalkan -->
    <aside v-if="showPendingFinalNotice && store.isSuperAdmin && pendingFinalCount" class="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <span class="flex-1">{{ pendingFinalCount }} dokumen berstatus Disetujui Bapperida belum Final dan belum tampil di Arsip OPD.</span>
      <button @click="finalizeAllPending" class="rounded-lg bg-amber-700 px-3 py-2 font-semibold text-white">Finalkan sekaligus</button>
      <button @click="dismissPendingFinalNotice" aria-label="Tutup pemberitahuan">x</button>
    </aside>

    <!-- 1. Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Dashboard Verifikasi e-Renja
        </h1>
        <p class="mt-1 text-xs text-slate-500">Kelola dan pantau alur verifikasi dokumen perencanaan OPD.</p>
      </div>
    </div>

    <!-- Compact verification summary -->
    <section class="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs sm:p-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div class="flex min-w-0 items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:col-span-2 xl:col-span-3">
          <div class="flex min-w-0 items-center gap-2">
            <span class="h-2 w-2 shrink-0 rounded-full bg-amber-500"></span>
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-700">Verifikasi 1</h2>
            <span class="truncate text-[10px] text-slate-400">Dilakukan verifikator sesuai penugasan OPD</span>
          </div>
          <router-link to="/verifikasi" class="shrink-0 text-[11px] font-bold text-amber-700 hover:underline">
            Lihat Antrean &rsaquo;
          </router-link>
        </div>
        <div class="flex min-w-0 items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:col-span-2 xl:col-span-2">
          <div class="flex min-w-0 items-center gap-2">
            <span class="h-2 w-2 shrink-0 rounded-full bg-emerald-500"></span>
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-700">Verifikasi Final</h2>
            <span class="truncate text-[10px] text-slate-400">Dilakukan Super Admin (bidang PPEPD)</span>
          </div>
          <router-link to="/verifikasi-final" class="shrink-0 text-[11px] font-bold text-emerald-700 hover:underline">
            Lihat Antrean &rsaquo;
          </router-link>
        </div>

        <article class="min-w-0 rounded-xl border border-slate-200 border-l-2 border-l-blue-500 bg-white p-3">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-[11px] font-semibold text-slate-600">Total Dokumen Masuk</span>
            <Folder class="h-4 w-4 shrink-0 text-blue-600" />
          </div>
          <div class="mt-1 flex items-baseline gap-1">
            <span class="text-2xl font-bold tracking-tight text-slate-900">
              {{ monitoringLoading ? '...' : annualMonitoringTotals?.submitted ?? '-' }}
            </span>
            <span class="text-base font-semibold text-slate-400">/{{ annualMonitoringTotals?.required ?? store.opds.length * 4 }}</span>
            <span class="ml-auto text-[10px] text-slate-400">Dokumen wajib</span>
          </div>
          <p class="mt-1 truncate text-[10px] text-slate-500" :title="`4 dok/tahun x ${store.monitoringReport?.totalOpd ?? store.opds.length} OPD`">
            4 dok/tahun x {{ store.monitoringReport?.totalOpd ?? store.opds.length }} OPD
          </p>
          <p v-if="store.monitoringReport?.optionalSubmittedDocuments" class="mt-0.5 truncate text-[10px] font-medium text-blue-700">
            + {{ store.monitoringReport.optionalSubmittedDocuments }} dok Renstra
          </p>
        </article>

        <article class="min-w-0 rounded-xl border border-slate-200 border-l-2 border-l-amber-400 bg-white p-3">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-[11px] font-semibold text-slate-600">Menunggu Verifikasi 1</span>
            <span class="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">Prioritas</span>
          </div>
          <div class="mt-1 flex items-baseline justify-between gap-2">
            <span class="text-2xl font-bold tracking-tight text-slate-900">{{ countMenunggu }}</span>
            <router-link to="/verifikasi" class="text-[10px] font-semibold text-amber-700 hover:underline">Telaah &rarr;</router-link>
          </div>
        </article>

        <article class="min-w-0 rounded-xl border border-slate-200 border-l-2 border-l-rose-400 bg-white p-3">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-[11px] font-semibold text-slate-600">Perlu Revisi</span>
            <AlertCircle class="h-4 w-4 shrink-0 text-rose-500" />
          </div>
          <div class="mt-1 flex items-baseline justify-between gap-2">
            <span class="text-2xl font-bold tracking-tight text-slate-900">{{ countRevisi }}</span>
            <span class="text-[10px] font-semibold text-rose-600">Catatan Aktif</span>
          </div>
        </article>

        <article class="min-w-0 rounded-xl border border-slate-200 border-l-2 border-l-emerald-500 bg-white p-3">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-[11px] font-semibold text-slate-600">Antrean Verifikasi Final</span>
            <span class="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">{{ persenSah }}% sah</span>
          </div>
          <div class="mt-1 flex items-baseline justify-between gap-2">
            <span class="text-2xl font-bold tracking-tight text-slate-900">{{ countDisetujui }}</span>
            <router-link to="/verifikasi-final" class="text-[10px] font-semibold text-emerald-700 hover:underline">Finalkan &rarr;</router-link>
          </div>
          <p class="mt-1 truncate text-[10px] text-slate-500" title="Dokumen Disetujui Bapperida, menunggu pengesahan akhir">
            Dokumen Disetujui Bapperida, menunggu pengesahan akhir
          </p>
        </article>

        <article class="min-w-0 rounded-xl border border-slate-200 border-l-2 border-l-slate-400 bg-white p-3">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-[11px] font-semibold text-slate-600">Dokumen Final &#x1F512;</span>
            <router-link to="/arsip" class="shrink-0 text-[10px] font-bold text-blue-600 hover:underline">Lihat Arsip</router-link>
          </div>
          <div class="mt-1 flex items-baseline justify-between gap-2">
            <span class="text-2xl font-bold tracking-tight text-slate-900">{{ countFinal }}</span>
            <span class="text-right text-[10px] font-semibold text-slate-500">Terkunci &amp; dipublikasi</span>
          </div>
        </article>
      </div>
    </section>

    <div class="flex justify-end">
      <router-link to="/monitoring" class="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-100" :title="`Monitoring OPD untuk tahun ${store.selectedTahun}`">
        {{ monitoringLoading ? 'Memuat...' : `${store.monitoringReport?.completedOpd ?? 0}/${store.monitoringReport?.totalOpd ?? store.opds.length} OPD Selesai` }}
      </router-link>
    </div>
    <p v-if="monitoringError" role="alert" class="text-xs text-rose-700">{{ monitoringError }} <button @click="refreshMonitoring" class="underline">Coba lagi</button></p>

    <!-- 5. Aktivitas Terkini -->
    <div class="w-full">
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <!-- Header Card -->
          <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold text-slate-900">Aktivitas Terkini</h2>
              <span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Real-time</span>
            </div>
            <button @click="refreshActivity" title="Perbarui Log" class="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
              <RotateCw class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Activity List -->
          <div class="space-y-3">
            <div
              v-for="act in activityList"
              :key="act.id"
              class="flex items-start gap-3 text-sm pb-3 border-b border-slate-100 last:border-0 last:pb-0"
            >
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs"
                :class="getActivityBadgeBg(act.color)"
              >
                <FileText v-if="act.icon === 'file-text'" class="w-3.5 h-3.5" />
                <Table v-else-if="act.icon === 'table'" class="w-3.5 h-3.5" />
                <CheckCircle v-else-if="act.icon === 'file-check' || act.icon === 'check-circle'" class="w-3.5 h-3.5" />
                <FileSpreadsheet v-else-if="act.icon === 'file-spreadsheet'" class="w-3.5 h-3.5" />
                <AlertCircle v-else class="w-3.5 h-3.5" />
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1">
                  <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span v-if="act.docCode" class="font-mono text-[9px] font-bold px-1 bg-slate-100 text-slate-600 rounded border border-slate-200 shrink-0">
                      #{{ act.docCode }}
                    </span>
                    <span class="font-bold text-slate-800 break-words" :title="act.docTitle">{{ act.docTitle }}</span>
                  </div>
                  <span class="text-[10px] text-slate-400 shrink-0 font-medium">{{ act.timestamp }}</span>
                </div>
                <div class="text-sm text-slate-600 mt-1 leading-relaxed">{{ act.detail }}</div>
                <div class="flex items-center gap-1.5 mt-1.5">
                  <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">{{ activityOpdName(act) }}</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded font-bold" :class="getMiniBadgeColor(act.badge)">{{ act.badge }}</span>
                </div>
              </div>
            </div>
          </div>

          <p v-if="!activityList.length" class="py-12 text-center text-sm text-slate-500">Belum ada aktivitas terkini.</p>

          <router-link to="/monitoring" class="block text-center w-full mt-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-blue-600 text-xs font-bold transition-colors">
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
import { apiFetch } from '../lib/api';
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
  const submittedStatuses = new Set(['Menunggu Verifikasi', 'Perlu Revisi', 'Disetujui Bapperida', 'Final']);
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
  ['Disetujui Bapperida','Final'].includes(doc.status)
));

// Kartu statistik hanya menghitung dokumen yang sudah diajukan, bukan draf OPD.
const incomingDocsCount = computed(() => incomingDocuments.value.length);
const pendingFinalCount = computed(() => {
  if (store.verificationSummary?.counts?.menungguVerifikasiFinal !== undefined) {
    return store.verificationSummary.counts.menungguVerifikasiFinal;
  }
  return store.documents.filter(d =>
    d.status === 'Disetujui Bapperida' &&
    !d.parentId &&
    !d.isLampiranOtomatis &&
    d.opdId !== 'bapperida' &&
    (store.selectedTahun === 'all' || d.tahun === store.selectedTahun)
  ).length;
});
const showPendingFinalNotice = ref(false);
function dismissPendingFinalNotice(){showPendingFinalNotice.value=false;localStorage.setItem(`sipanda-final-notice-${store.currentUser?.id||'admin'}`,'1');}
async function finalizeAllPending(){const ids=store.documents.filter(d=>d.status==='Disetujui Bapperida'&&!d.parentId&&!d.isLampiranOtomatis).map(d=>d.id);if(!ids.length)return;try{let count=0;for(let i=0;i<ids.length;i+=100){const r=await apiFetch('/api/documents/finalize-bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:ids.slice(i,i+100)})});const data=await r.json();if(!r.ok)throw Error(data.error);count+=data.finalized.length;}store.addToast(`${count} dokumen difinalkan`,'success');await store.fetchDocuments();}catch(error:any){store.addToast(error.message||'Finalisasi gagal','error');}}

const countMenunggu = computed(() => incomingDocuments.value.filter(d => d.status === 'Menunggu Verifikasi').length);
const countRevisi = computed(() => incomingDocuments.value.filter(d => d.status === 'Perlu Revisi').length);
const countDisetujui = computed(() => incomingDocuments.value.filter(d => d.status === 'Disetujui Bapperida').length);
const countFinal = computed(() => incomingDocuments.value.filter(d => d.status === 'Final').length);
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
  showPendingFinalNotice.value=localStorage.getItem(`sipanda-final-notice-${store.currentUser?.id||'admin'}`)!=='1';
  const [, stats] = await Promise.all([
    store.fetchDocuments(),
    store.fetchDashboardStats()
  ]);
  dashboardStats.value = stats;
});
</script>
