<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dokumen turunan otomatis</p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900">Lampiran Renja / Renstra</h1>
        <p class="mt-1 text-xs text-slate-500">Lampiran dibuat otomatis dan ikut diajukan ke Admin saat dokumen induk disubmit. Status lampiran mengikuti dokumen induk.</p>
      </div>
      <button @click="loadAnnexes" :disabled="loading" class="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
        {{ loading ? 'Memuat...' : 'Muat Ulang' }}
      </button>
    </header>

    <section class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
      <label class="space-y-1 text-xs font-semibold text-slate-600">
        Perangkat Daerah
        <select v-model="filterOpd" disabled @change="loadAnnexes" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 disabled:bg-slate-100 disabled:text-slate-500">
          <option v-for="opd in store.opds.filter(item => item.id === store.currentUser?.opdId)" :key="opd.id" :value="opd.id">{{ opd.nama }}</option>
        </select>
      </label>
      <label class="space-y-1 text-xs font-semibold text-slate-600">
        Jenis Lampiran
        <select v-model="filterType" @change="loadAnnexes" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700">
          <option value="">Semua jenis</option>
          <option v-for="type in annexTypes" :key="type" :value="type">{{ type }}</option>
        </select>
      </label>
      <label class="space-y-1 text-xs font-semibold text-slate-600">
        Tahun
        <select v-model="filterYear" @change="loadAnnexes" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700">
          <option value="">Semua tahun</option>
          <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
        </select>
      </label>
    </section>

    <div v-if="errorMessage" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{{ errorMessage }}</div>

    <section v-if="annexes.length" class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[850px] text-left text-xs">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3 font-semibold">Perangkat Daerah</th>
              <th class="px-4 py-3 font-semibold">Jenis Lampiran</th>
              <th class="px-4 py-3 font-semibold">Tahun / Periode</th>
              <th class="px-4 py-3 font-semibold">Status Induk</th>
              <th class="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="annex in annexes" :key="annex.id" class="align-top">
              <td class="px-4 py-3 font-semibold text-slate-800">{{ annex.opd?.nama || annex.opdName }}</td>
              <td class="px-4 py-3 text-slate-700">{{ annex.jenis }}</td>
              <td class="px-4 py-3 text-slate-600">{{ periodLabel(annex) }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-1 text-[10px] font-semibold" :class="statusClass(annex.parent?.status)">
                  {{ annex.parent?.status || 'Tidak tersedia' }}
                </span>
                <p v-if="annex.parent && !annex.parent.sourceReady" class="mt-1 max-w-52 text-[10px] leading-relaxed text-amber-700">
                  Unggah dokumen induk PDF atau DOCX yang memuat BAB I untuk membuat lampiran.
                </p>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap justify-end gap-1.5">
                  <button @click="preview(annex)" :disabled="!annex.parent?.sourceReady" class="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Pratinjau</button>
                  <button @click="prepareExport(annex)" :disabled="!annex.parent?.sourceReady" class="rounded-lg bg-blue-600 px-2.5 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">Unduh</button>
                  <button v-if="store.isSuperAdmin" @click="configure(annex)" class="rounded-lg border border-indigo-200 px-2.5 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-50">Pengaturan</button>
                  <button v-if="store.isSuperAdmin" @click="rebuild(annex)" :disabled="busyId === annex.id" class="rounded-lg border border-amber-200 px-2.5 py-1.5 font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50">Buat Ulang</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <div v-else-if="!loading" class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <h2 class="text-sm font-bold text-slate-800">Belum ada lampiran</h2>
      <p class="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-slate-500">Lampiran dibuat otomatis saat dokumen induk Renja Murni, Perubahan Renja, atau Renstra tersedia.</p>
    </div>

    <div v-if="activeAnnex" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6">
      <section class="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header class="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 class="text-sm font-bold text-slate-900">{{ dialogTitle }}</h2>
            <p class="mt-0.5 text-[11px] text-slate-500">{{ activeAnnex.judul }}</p>
          </div>
          <button @click="closeDialog" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Tutup</button>
        </header>

        <form v-if="dialogMode === 'config'" @submit.prevent="saveConfig" class="grid gap-4 p-5 sm:grid-cols-2">
          <label class="space-y-1 text-xs font-semibold text-slate-600">Nomor Peraturan
            <input v-model="configForm.nomorPeraturan" class="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal text-slate-800" />
          </label>
          <label class="space-y-1 text-xs font-semibold text-slate-600">Tahun Penetapan
            <input v-model="configForm.tahunPenetapan" inputmode="numeric" maxlength="4" class="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal text-slate-800" />
          </label>
          <label class="space-y-1 text-xs font-semibold text-slate-600">Nomor Kepbup
            <input v-model="configForm.nomorKepbup" class="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal text-slate-800" />
          </label>
          <label class="space-y-1 text-xs font-semibold text-slate-600">Tanggal Kepbup
            <input v-model="configForm.tanggalKepbup" class="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal text-slate-800" />
          </label>
          <div class="flex justify-end gap-2 sm:col-span-2">
            <button type="button" @click="closeDialog" class="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">Batal</button>
            <button :disabled="saving" class="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
          </div>
        </form>

        <div v-else-if="dialogMode === 'preview'" class="min-h-[65vh] flex-1 bg-slate-100">
          <iframe v-if="previewHtml" :srcdoc="previewHtml" :title="`Pratinjau ${activeAnnex.judul}`" class="h-[72vh] w-full border-0 bg-slate-200" />
          <p v-else class="p-8 text-center text-xs text-slate-500">Menyiapkan pratinjau...</p>
        </div>

        <div v-else class="overflow-y-auto p-5">
          <p class="mb-4 text-xs text-slate-600">Pemeriksaan format sebelum ekspor. Ekspor tetap dapat dilanjutkan jika ada peringatan.</p>
          <div v-if="validationError" class="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{{ validationError }}</div>
          <ul v-if="checks.length" class="space-y-2">
            <li v-for="check in checks" :key="check.label" class="flex gap-2 rounded-lg border p-3 text-xs" :class="check.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'">
              <span class="font-bold">{{ check.ok ? 'LULUS' : 'PERINGATAN' }}</span>
              <span><b>{{ check.label }}:</b> {{ check.detail }}</span>
            </li>
          </ul>
          <p v-else-if="!validationError" class="text-xs text-slate-500">Menjalankan pemeriksaan format...</p>
          <div class="mt-5 flex justify-end gap-2">
            <button @click="closeDialog" class="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">Batal</button>
            <button @click="download(activeAnnex, 'pdf')" :disabled="downloading || !checks.length || !!validationError" class="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Unduh PDF</button>
            <button v-if="exportFormats.includes('docx')" @click="download(activeAnnex, 'docx')" :disabled="downloading || !checks.length || !!validationError" class="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Unduh DOCX</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { apiFetch } from '../lib/api';
import { useAppStore } from '../stores/appStore';
import type { DocumentItem, OPD } from '../types';

type Annex = DocumentItem & {
  opd?: OPD;
  parent?: { id?: string; jenis?: string; status?: string; sourceReady?: boolean; cara?: string; fileName?: string | null };
};
type ValidationCheck = { label: string; ok: boolean; detail: string };
type DialogMode = 'preview' | 'export' | 'config';

const annexTypes = ['Lampiran Perbup Renja', 'Lampiran Kepbup Perubahan Renja', 'Lampiran Perbup Renstra'];
const store = useAppStore();
const route = useRoute();
const annexes = ref<Annex[]>([]);
const exportFormats = ref<string[]>(['pdf', 'docx']);
const loading = ref(false);
const saving = ref(false);
const downloading = ref(false);
const busyId = ref('');
const errorMessage = ref('');
const activeAnnex = ref<Annex | null>(null);
const dialogMode = ref<DialogMode>('preview');
const previewHtml = ref('');
const checks = ref<ValidationCheck[]>([]);
const validationError = ref('');
const filterOpd = ref('');
const filterType = ref('');
const filterYear = ref('');
const configForm = ref({ nomorPeraturan: '', tahunPenetapan: '', nomorKepbup: '', tanggalKepbup: '' });
const years = computed(() => [...new Set(annexes.value.map(annex => annex.tahun))].sort((a, b) => b.localeCompare(a)));
const dialogTitle = computed(() => dialogMode.value === 'config' ? 'Pengaturan Lampiran' : dialogMode.value === 'preview' ? 'Pratinjau Lampiran' : 'Pemeriksaan Format dan Ekspor');

function periodLabel(annex: Annex) {
  const start = annex.regulation?.periodeMulai;
  const end = annex.regulation?.periodeAkhir;
  return annex.jenis === 'Lampiran Perbup Renstra' && start && end && start !== end ? `${start}–${end}` : annex.tahun;
}

function statusClass(status?: string) {
  if (status === 'Disetujui') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Perlu Revisi') return 'bg-amber-100 text-amber-800';
  if (status === 'Menunggu Verifikasi') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-600';
}

async function loadAnnexes() {
  loading.value = true;
  errorMessage.value = '';
  const params = new URLSearchParams();
  if (filterOpd.value) params.set('opdId', filterOpd.value);
  if (filterType.value) params.set('jenis', filterType.value);
  if (filterYear.value) params.set('tahun', filterYear.value);
  try {
    const response = await apiFetch(`/api/annexes?${params.toString()}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`API lampiran tidak tersedia (HTTP ${response.status}). Muat ulang layanan backend lalu coba lagi.`);
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal memuat lampiran');
    annexes.value = data.filter((annex: Annex) => annex.opdId === store.currentUser?.opdId);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat lampiran';
  } finally {
    loading.value = false;
  }
}

async function preview(annex: Annex) {
  activeAnnex.value = annex;
  dialogMode.value = 'preview';
  previewHtml.value = '';
  try {
    const response = await apiFetch(`/api/documents/${annex.id}/preview`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Gagal menyiapkan pratinjau lampiran');
    }
    previewHtml.value = await response.text();
  } catch (error) {
    store.addToast(error instanceof Error ? error.message : 'Gagal menyiapkan pratinjau', 'error');
    closeDialog();
  }
}

function configure(annex: Annex) {
  activeAnnex.value = annex;
  dialogMode.value = 'config';
  configForm.value = {
    nomorPeraturan: annex.regulation?.nomorPeraturan || '',
    tahunPenetapan: annex.regulation?.tahunPenetapan || '',
    nomorKepbup: annex.regulation?.nomorKepbup || '',
    tanggalKepbup: annex.regulation?.tanggalKepbup || ''
  };
}

async function saveConfig() {
  if (!activeAnnex.value) return;
  saving.value = true;
  try {
    const response = await apiFetch(`/api/annexes/${activeAnnex.value.id}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configForm.value)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan');
    store.addToast('Pengaturan lampiran berhasil disimpan', 'success');
    closeDialog();
    await loadAnnexes();
  } catch (error) {
    store.addToast(error instanceof Error ? error.message : 'Gagal menyimpan pengaturan', 'error');
  } finally {
    saving.value = false;
  }
}

async function rebuild(annex: Annex) {
  if (!window.confirm('Buat ulang lampiran ini dari isi dokumen induk?')) return;
  busyId.value = annex.id;
  try {
    const response = await apiFetch(`/api/annexes/${annex.id}/rebuild`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal membuat ulang lampiran');
    store.addToast('Lampiran berhasil dibuat ulang dari dokumen induk', 'success');
    await loadAnnexes();
  } catch (error) {
    store.addToast(error instanceof Error ? error.message : 'Gagal membuat ulang lampiran', 'error');
  } finally {
    busyId.value = '';
  }
}

async function prepareExport(annex: Annex) {
  activeAnnex.value = annex;
  dialogMode.value = 'export';
  checks.value = [];
  exportFormats.value = ['pdf', 'docx'];
  validationError.value = '';
  try {
    const response = await apiFetch(`/api/annexes/${annex.id}/validation`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Pemeriksaan format gagal');
    checks.value = data.checks;
    exportFormats.value = data.formats || ['pdf', 'docx'];
  } catch (error) {
    validationError.value = error instanceof Error ? error.message : 'Pemeriksaan format gagal';
  }
}

async function download(annex: Annex, format: 'pdf' | 'docx') {
  downloading.value = true;
  try {
    const response = await apiFetch(`/api/export/${format}/${annex.id}`);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Gagal mengunduh lampiran');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Lampiran ${annex.opd?.nomorLampiran || ''} ${annex.jenis} ${annex.opd?.nama || annex.opdName} ${periodLabel(annex)}.${format}`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    store.addToast(error instanceof Error ? error.message : 'Gagal mengunduh lampiran', 'error');
  } finally {
    downloading.value = false;
  }
}

function closeDialog() {
  activeAnnex.value = null;
  previewHtml.value = '';
  checks.value = [];
  validationError.value = '';
}

onMounted(async () => {
  if (!store.opds.length) await store.fetchOpds();
  filterOpd.value = store.currentUser?.opdId || '';
  const queryType = String(route.query.jenis || '');
  if (annexTypes.includes(queryType)) filterType.value = queryType;
  await loadAnnexes();
});
</script>
