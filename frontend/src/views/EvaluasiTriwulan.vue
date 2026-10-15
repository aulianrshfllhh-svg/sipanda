<template>
  <main class="planning-page space-y-6">
    <header class="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {{ isRkpd ? 'Evaluasi RKPD Triwulan' : 'Evaluasi Renja Triwulan' }}
        </h1>
        <p class="mt-1.5 text-sm text-slate-500">
          {{ isRkpd ? 'Dokumen evaluasi kinerja pembangunan daerah per triwulan.' : 'Arsip evaluasi Renja perangkat daerah dan riwayat unggahan.' }}
        </p>
      </div>
      <button
        v-if="canUpload"
        type="button"
        @click="showUploadModal = true"
        class="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
      >
        <Plus class="h-4 w-4" />
        <span>Unggah Evaluasi Baru</span>
      </button>
    </header>

    <PlanningDocumentTabs />

    <p v-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </p>

    <section class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center">
      <div class="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <label class="block">
          <span class="sr-only">Filter tahun</span>
          <select v-model="selectedYear" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="all">Semua Tahun</option>
            <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
          </select>
        </label>
        <label class="block">
          <span class="sr-only">Filter triwulan</span>
          <select v-model="selectedQuarter" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="all">Semua Triwulan</option>
            <option v-for="(quarter, index) in quarterLabels" :key="quarter" :value="String(index + 1)">TW {{ quarter }}</option>
          </select>
        </label>
        <label v-if="isRenjaAdmin" class="block">
          <span class="sr-only">Filter perangkat daerah</span>
          <select v-model="selectedOpd" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="all">Semua OPD</option>
            <option v-for="opd in visibleOpds" :key="opd.id" :value="opd.id">{{ opd.nama }}</option>
          </select>
        </label>
        <label class="block">
          <span class="sr-only">Filter status</span>
          <select v-model="selectedStatus" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="all">Semua Status</option>
            <option value="active">Sudah diunggah</option>
            <option value="inactive">Riwayat versi</option>
          </select>
        </label>
      </div>
      <div class="flex shrink-0 items-center gap-2 text-sm text-slate-500">
        <span>{{ displayedRows.length }} berkas</span>
      </div>
    </section>

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
      <div class="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-sm font-bold text-slate-800">Arsip Dokumen Evaluasi</h2>
        </div>
        <span class="text-xs text-slate-500">{{ displayedRows.length }} dokumen ditampilkan</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[850px] text-left text-xs">
          <thead class="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th v-if="isRenjaAdmin" scope="col" class="px-4 py-3">Perangkat Daerah</th>
              <th scope="col" class="px-4 py-3">Tahun</th>
              <th scope="col" class="px-3 py-3">Triwulan</th>
              <th scope="col" class="px-3 py-3">Judul</th>
              <th scope="col" class="px-3 py-3">Status</th>
              <th scope="col" class="px-3 py-3">Tanggal Unggah</th>
              <th scope="col" class="px-3 py-3">Berkas / Versi</th>
              <th scope="col" class="px-3 py-3">Riwayat</th>
              <th v-if="store.isSuperAdmin" scope="col" class="px-3 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <template v-for="row in displayedRows" :key="row.id">
              <tr class="transition-colors hover:bg-slate-50/60">
                <td v-if="isRenjaAdmin" class="max-w-56 truncate px-4 py-3 font-medium text-slate-700" :title="opdName(row.opdId)">{{ opdName(row.opdId) }}</td>
                <td class="px-4 py-3 font-medium text-slate-700">{{ row.tahun }}</td>
                  <td class="px-3 py-3 text-slate-600">TW {{ quarterLabels[row.triwulan - 1] }}</td>
                <td class="max-w-48 truncate px-3 py-3 text-slate-600" :title="row.judul || 'Evaluasi Triwulan'">{{ row.judul || 'Evaluasi Triwulan' }}</td>
                <td class="px-3 py-3">
                  <span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset" :class="row.aktif ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/80' : 'bg-slate-100 text-slate-500 ring-slate-200'">
                    {{ row.aktif ? 'Sudah diunggah' : 'Riwayat versi' }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-3 py-3 text-slate-500">{{ formatDate(row.diunggahPada) }}</td>
                <td class="px-3 py-3">
                  <button type="button" class="max-w-56 truncate text-left font-semibold text-blue-700 hover:text-blue-800 hover:underline" @click="download(row)">
                    {{ row.namaFileAsli }} (v{{ row.versi }})
                  </button>
                </td>
                <td class="px-3 py-3">
                  <button v-if="row.aktif && historyFor(row).length" type="button" class="font-semibold text-blue-700 hover:underline" @click="toggleHistory(row.id)">
                    {{ expandedHistoryId === row.id ? 'Tutup' : `${historyFor(row).length} versi` }}
                  </button>
                  <span v-else class="text-slate-400">—</span>
                </td>
                <td v-if="store.isSuperAdmin" class="px-3 py-3">
                  <button v-if="row.aktif" type="button" class="font-semibold text-red-600 hover:underline" @click="deactivate(row)">Nonaktifkan</button>
                  <span v-else class="text-slate-400">—</span>
                </td>
              </tr>
              <tr v-if="row.aktif && expandedHistoryId === row.id">
                <td :colspan="columnCount" class="bg-slate-50 px-5 py-3">
                  <p class="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Riwayat versi sebelumnya</p>
                  <ul class="space-y-2">
                    <li v-for="version in historyFor(row)" :key="version.id" class="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span class="text-slate-600">v{{ version.versi }} · {{ formatDate(version.diunggahPada) }} · {{ version.namaFileAsli }}</span>
                      <button type="button" class="font-semibold text-blue-700 hover:underline" @click="download(version)">Unduh versi</button>
                    </li>
                  </ul>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <p v-if="!displayedRows.length" class="border-t border-slate-100 px-4 py-10 text-center text-xs text-slate-500">
          {{ rows.length ? 'Tidak ada dokumen yang sesuai dengan filter.' : isRkpd ? 'Belum ada dokumen Evaluasi RKPD yang diunggah.' : 'Belum ada berkas evaluasi untuk tahun dan triwulan ini.' }}
        </p>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="showUploadModal" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" @click.self="showUploadModal = false">
        <section role="dialog" aria-modal="true" aria-labelledby="upload-evaluation-title" class="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 id="upload-evaluation-title" class="text-base font-bold text-slate-900">Unggah Evaluasi Baru</h2>
              <p class="mt-1 text-xs text-slate-500">Lengkapi informasi dan pilih berkas evaluasi.</p>
            </div>
            <button type="button" aria-label="Tutup" @click="showUploadModal = false" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X class="h-4 w-4" /></button>
          </div>
          <form @submit.prevent="upload" class="space-y-5 p-5 sm:p-6">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label class="block text-xs font-semibold text-slate-700">
                Tahun
                <input v-model="form.tahun" type="number" min="2000" max="2100" required class="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label class="block text-xs font-semibold text-slate-700">
                Triwulan
                <select v-model="form.triwulan" class="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  <option v-for="quarter in [1, 2, 3, 4]" :key="quarter" :value="quarter">TW {{ quarterLabels[quarter - 1] }}</option>
                </select>
              </label>
              <label class="block text-xs font-semibold text-slate-700 sm:col-span-2">
                Judul
                <input v-model="form.judul" type="text" class="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Masukkan judul evaluasi (opsional)" />
              </label>
              <label class="block text-xs font-semibold text-slate-700 sm:col-span-2">
                Catatan
                <textarea v-model="form.catatan" rows="2" class="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Catatan (opsional)" />
              </label>
              <label class="block text-xs font-semibold text-slate-700 sm:col-span-2">
                Berkas Evaluasi
                <input required type="file" accept=".pdf,.docx,.xlsx" @change="pick" class="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 text-xs font-normal text-slate-600 file:mr-3 file:h-10 file:border-0 file:border-r file:border-slate-300 file:bg-white file:px-3 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-100" />
                <span class="mt-1.5 block text-[11px] font-normal text-slate-500">PDF, DOCX, atau XLSX · Maksimal 20 MB</span>
              </label>
            </div>
            <p v-if="replacementTarget" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
              Unggahan ini akan menggantikan berkas aktif untuk tahun {{ form.tahun }}, TW {{ quarterLabels[form.triwulan - 1] }}. Versi lama tetap tersimpan di riwayat.
            </p>
            <p v-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>
            <div class="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button type="button" @click="showUploadModal = false" class="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="submit" :disabled="busy" class="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
                <UploadCloud class="h-4 w-4" />{{ busy ? 'Mengunggah…' : replacementTarget ? 'Ganti Berkas' : 'Unggah Evaluasi' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Teleport>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, UploadCloud, X } from '@lucide/vue';
import PlanningDocumentTabs from '../components/documents/PlanningDocumentTabs.vue';
import { useAppStore } from '../stores/appStore';
import { apiFetch } from '../lib/api';

interface EvaluationRow {
  id: string;
  jenis: 'renja_pd' | 'rkpd';
  opdId: string | null;
  tahun: string;
  triwulan: number;
  judul: string | null;
  catatan: string | null;
  namaFileAsli: string;
  mime: string;
  ukuran: number;
  versi: number;
  aktif: boolean;
  diunggahPada: string;
}

const props = defineProps<{
  jenis?: 'renja_pd' | 'rkpd';
  tahun?: string;
  openUploadQuarter?: number;
  uploadRequestKey?: number;
}>();
const route = useRoute();
const router = useRouter();
const store = useAppStore();
const isRkpd = computed(() => props.jenis === 'rkpd' || route.path.includes('rkpd'));
const jenis = computed(() => isRkpd.value ? 'rkpd' : 'renja_pd');
const isRenjaAdmin = computed(() => !isRkpd.value && store.isBapperida);
const canAccessRkpd = computed(() => store.currentUser?.role !== 'opd' && (
  store.isBapperida || store.currentUser?.roleKodes?.includes('penyusun_rkpd') === true
));
const canUpload = computed(() => isRkpd.value
  ? store.currentUser?.role !== 'opd' && (store.isSuperAdmin || store.currentUser?.roleKodes?.includes('penyusun_rkpd') === true)
  : store.isBapperida || store.isOpd);
const quarterLabels = ['I', 'II', 'III', 'IV'];
const form = reactive({ tahun: props.tahun || String(new Date().getFullYear()), triwulan: 1, judul: '', catatan: '' });
const rows = ref<EvaluationRow[]>([]);
const busy = ref(false);
const error = ref('');
const showUploadModal = ref(false);
const selectedYear = ref(props.tahun || String(new Date().getFullYear()));
const selectedQuarter = ref('all');
const selectedStatus = ref('all');
const selectedOpd = ref('all');
const expandedHistoryId = ref('');
const assignedOpds = ref<Array<{ id: string; nama: string }>>([]);
const file = ref<File | null>(null);
watch(() => props.tahun, year => {
  if (!year) return;
  selectedYear.value = year;
  form.tahun = year;
  void load();
});
watch(() => props.uploadRequestKey, key => {
  if (!key || !props.openUploadQuarter) return;
  form.tahun = props.tahun || selectedYear.value;
  form.triwulan = props.openUploadQuarter;
  form.judul = '';
  form.catatan = '';
  file.value = null;
  error.value = '';
  showUploadModal.value = true;
}, { immediate: true });
const years = computed(() => [...new Set([
  String(new Date().getFullYear()),
  ...rows.value.map(row => row.tahun)
])].sort((first, second) => Number(second) - Number(first)));
const visibleOpds = computed(() => store.isSuperAdmin
  ? store.opds
  : assignedOpds.value);
const filteredRows = computed(() => rows.value.filter(row =>
  (selectedYear.value === 'all' || row.tahun === selectedYear.value) &&
  (selectedQuarter.value === 'all' || String(row.triwulan) === selectedQuarter.value) &&
  (selectedStatus.value === 'all' || (selectedStatus.value === 'active' ? row.aktif : !row.aktif)) &&
  (selectedOpd.value === 'all' || row.opdId === selectedOpd.value)
));
const displayedRows = computed(() => selectedStatus.value === 'inactive'
  ? filteredRows.value
  : filteredRows.value.filter(row => row.aktif));
const activeRows = computed(() => rows.value.filter(row => row.aktif));
const renjaOwner = computed(() => store.currentUser?.opdId || (store.isBapperida ? 'bapperida' : null));
const replacementTarget = computed(() => activeRows.value.find(row =>
  row.tahun === form.tahun && row.triwulan === Number(form.triwulan) &&
  row.jenis === jenis.value &&
  (isRkpd.value || row.opdId === renjaOwner.value)
));
const columnCount = computed(() => 7 + (isRenjaAdmin.value ? 1 : 0) + (store.isSuperAdmin ? 1 : 0));
function slotKey(row: EvaluationRow) {
  return `${row.opdId || 'rkpd'}:${row.tahun}:${row.triwulan}`;
}

function historyFor(row: EvaluationRow) {
  return rows.value.filter(version => slotKey(version) === slotKey(row) && version.id !== row.id)
    .sort((first, second) => second.versi - first.versi);
}

function opdName(opdId: string | null) {
  if (!opdId) return 'Bapperida';
  return store.opds.find(opd => opd.id === opdId)?.nama ||
    assignedOpds.value.find(opd => opd.id === opdId)?.nama || opdId;
}

async function loadAssignments() {
  if (!isRenjaAdmin.value || store.isSuperAdmin) {
    assignedOpds.value = [];
    return;
  }
  try {
    const response = await apiFetch(`/api/staf/penugasan/saya?tahun=${selectedYear.value === 'all' ? new Date().getFullYear() : selectedYear.value}`);
    if (response.ok) assignedOpds.value = await response.json();
  } catch {
    assignedOpds.value = [];
  }
}

async function load() {
  if (isRkpd.value && !canAccessRkpd.value) {
    rows.value = [];
    error.value = 'Evaluasi RKPD hanya tersedia untuk akun Bapperida.';
    return;
  }
  error.value = '';
  const response = await apiFetch(`/api/evaluasi-triwulan?jenis=${jenis.value}&riwayat=true`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Gagal memuat data evaluasi.');
  rows.value = Array.isArray(data) ? data : data.rows;
}

function pick(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] || null;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function upload() {
  error.value = '';
  if (!file.value) {
    error.value = 'Pilih berkas terlebih dahulu.';
    return;
  }
  if (replacementTarget.value && !window.confirm('Berkas aktif akan diganti. Versi lama tetap tersimpan. Lanjutkan?')) return;
  busy.value = true;
  try {
    const body = new FormData();
    body.set('file', file.value);
    body.set('jenis', jenis.value);
    body.set('tahun', form.tahun);
    body.set('triwulan', String(form.triwulan));
    body.set('judul', form.judul);
    body.set('catatan', form.catatan);
    const response = await apiFetch('/api/evaluasi-triwulan', { method: 'POST', body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal mengunggah berkas evaluasi.');
    file.value = null;
    form.judul = '';
    form.catatan = '';
    showUploadModal.value = false;
    await load();
  } catch (uploadError) {
    error.value = uploadError instanceof Error ? uploadError.message : 'Gagal mengunggah berkas evaluasi.';
  } finally {
    busy.value = false;
  }
}

async function download(row: EvaluationRow) {
  try {
    const response = await apiFetch(`/api/evaluasi-triwulan/${row.id}/download`);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Gagal mengunduh berkas evaluasi.');
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = row.namaFileAsli;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (downloadError) {
    error.value = downloadError instanceof Error ? downloadError.message : 'Gagal mengunduh berkas evaluasi.';
  }
}

async function deactivate(row: EvaluationRow) {
  if (!window.confirm(`Nonaktifkan evaluasi TW ${row.triwulan} tahun ${row.tahun}?`)) return;
  const response = await apiFetch(`/api/evaluasi-triwulan/${row.id}`, { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) {
    error.value = data.error || 'Gagal menonaktifkan evaluasi.';
    return;
  }
  await load();
}

function toggleHistory(id: string) {
  expandedHistoryId.value = expandedHistoryId.value === id ? '' : id;
}

watch([isRenjaAdmin, selectedYear], () => { void loadAssignments(); });

onMounted(async () => {
  try {
    if (!store.opds.length) await store.fetchOpds();
    await Promise.all([load(), loadAssignments()]);
    const requestedQuarter = Number(route.query.triwulan);
    const requestedYear = String(route.query.tahun || selectedYear.value);
    if (route.query.upload === '1' && [1, 2, 3, 4].includes(requestedQuarter) && canUpload.value) {
      selectedYear.value = requestedYear;
      selectedQuarter.value = String(requestedQuarter);
      form.tahun = requestedYear;
      form.triwulan = requestedQuarter;
      showUploadModal.value = true;
      await router.replace({ path: route.path });
    }
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : 'Gagal memuat data evaluasi.';
  }
});
</script>
