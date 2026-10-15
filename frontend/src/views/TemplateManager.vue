<template>
  <div class="space-y-5">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-blue-600">Standar penyusunan</p>
        <h2 class="mt-1 text-xl font-bold text-slate-900">Template Dokumen</h2>
        <p class="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
          Kelola struktur template berdasarkan jenis dan periode. Template aktif atau yang sudah digunakan hanya dapat diubah melalui duplikasi.
        </p>
      </div>
      <button
        type="button"
        @click="run(load)"
        :disabled="loading || busy"
        class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RotateCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
        Muat ulang
      </button>
    </header>

    <div v-if="error" role="alert" class="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <span>{{ error }}</span>
      <button type="button" @click="run(load)" class="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-rose-100">Coba lagi</button>
    </div>

    <section class="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5" aria-label="Filter template">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 class="text-sm font-bold text-slate-800">Periode template</h3>
          <p class="mt-0.5 text-xs text-slate-500">Pilih tahun untuk menyaring template yang berlaku pada periode tersebut.</p>
        </div>
        <span class="text-xs font-medium text-slate-500">{{ filteredTemplates.length }} template</span>
      </div>
      <div class="flex max-w-full gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filter periode template">
        <button
          v-for="period in periods"
          :key="period.id"
          type="button"
          role="tab"
          :aria-selected="selectedPeriod === period.id"
          @click="selectedPeriod = period.id"
          class="inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors"
          :class="selectedPeriod === period.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700'"
        >
          {{ period.label }}
          <span class="rounded-full px-1.5 py-0.5 text-[10px] font-bold" :class="selectedPeriod === period.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'">{{ period.count }}</span>
        </button>
      </div>
      <div class="flex max-w-full gap-2 overflow-x-auto border-t border-slate-200 pt-3" role="group" aria-label="Filter jenis dokumen">
        <button
          v-for="kind in kinds"
          :key="kind.id"
          type="button"
          @click="selectedKind = kind.id"
          class="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          :class="selectedKind === kind.id ? 'bg-blue-100 text-blue-800' : 'text-slate-500 hover:bg-white hover:text-slate-700'"
        >
          {{ kind.label }} <span class="ml-1 opacity-70">{{ kind.count }}</span>
        </button>
      </div>
    </section>

    <div v-if="loading && !templates.length" class="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3" aria-label="Memuat template">
      <div v-for="item in 6" :key="item" class="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
    </div>

    <section v-else-if="!filteredTemplates.length" class="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-5 py-12 text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <FileText class="h-5 w-5" />
      </div>
      <h3 class="mt-4 text-sm font-bold text-slate-800">{{ templates.length ? 'Tidak ada template pada filter ini' : 'Belum ada template dokumen' }}</h3>
      <p class="mt-1 text-xs text-slate-500">{{ templates.length ? 'Coba pilih periode atau jenis dokumen lainnya.' : 'Muat ulang daftar atau periksa kembali koneksi server.' }}</p>
      <button v-if="templates.length && (selectedPeriod !== 'all' || selectedKind !== 'all')" type="button" @click="selectedPeriod = 'all'; selectedKind = 'all'" class="mt-4 text-xs font-semibold text-blue-700 hover:text-blue-900">Bersihkan filter</button>
    </section>

    <section v-else class="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3" aria-label="Daftar template dokumen">
      <article
        v-for="item in filteredTemplates"
        :key="item.id"
        class="flex min-w-0 flex-col rounded-2xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
        :class="selected?.id === item.id ? 'border-blue-400 ring-2 ring-blue-100 shadow-sm' : 'border-slate-200 shadow-2xs'"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <FileText class="h-5 w-5" />
            </span>
            <div class="min-w-0">
              <h3 class="line-clamp-2 text-sm font-bold leading-snug text-slate-900" :title="item.nama">{{ item.nama }}</h3>
              <p class="mt-1 text-xs text-slate-500">{{ item.jenis }}</p>
            </div>
          </div>
          <span
            class="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold"
            :class="item.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'"
          >
            <CheckCircle2 v-if="item.isActive" class="h-3 w-3" />
            <FileClock v-else class="h-3 w-3" />
            {{ item.isActive ? 'Aktif' : 'Draft / Arsip' }}
          </span>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
          <span class="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{{ item.tahun || 'Semua periode' }}</span>
          <span class="rounded-lg bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">Versi {{ item.versi }}</span>
          <span v-if="item.isDefault" class="rounded-lg border border-slate-200 px-2.5 py-1 font-medium text-slate-500">Template baku</span>
        </div>

        <p v-if="item.deskripsi" class="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{{ item.deskripsi }}</p>

        <div class="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3" :class="item.deskripsi ? 'mt-3' : 'mt-5'">
          <button type="button" @click="previewItem = item" class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
            <Eye class="h-3.5 w-3.5" /> Pratinjau
          </button>
          <button type="button" @click="editTemplate(item)" class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
            <Pencil class="h-3.5 w-3.5" /> Edit
          </button>
          <button type="button" @click="duplicate(item)" :disabled="busy" class="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Copy class="h-3.5 w-3.5" /> Duplikat
          </button>
        </div>
      </article>
    </section>

    <section v-if="selected" ref="editorRef" class="scroll-mt-5 space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="template-editor-title">
      <div class="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-blue-600">Editor struktur</p>
          <h3 id="template-editor-title" class="mt-1 text-base font-bold text-slate-900">{{ selected.nama }}</h3>
          <p class="mt-1 text-xs text-slate-500">{{ selected.jenis }} · {{ selected.tahun || 'Semua periode' }} · Versi {{ selected.versi }}</p>
        </div>
        <span v-if="selected.isActive" class="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
          <CheckCircle2 class="h-3.5 w-3.5" /> Template aktif
        </span>
        <span v-else class="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
          <FileClock class="h-3.5 w-3.5" /> Draft / Arsip
        </span>
      </div>

      <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end">
        <label class="block text-xs font-semibold text-slate-700">
          Nama template
          <input v-model="selected.nama" :disabled="selected.isActive || busy" class="mt-1.5 block h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500" />
        </label>
        <label class="block text-xs font-semibold text-slate-700">
          Tahun salinan
          <input v-model="copyYear" type="number" min="2000" max="2100" class="mt-1.5 block h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" />
        </label>
        <button type="button" @click="duplicate(selected)" :disabled="busy" class="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
          <Copy class="h-3.5 w-3.5" /> Duplikasikan
        </button>
      </div>

      <p class="rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-500">
        Pada template Draft / Arsip, nama, judul bab, kode dan judul sub-bab, serta petunjuk isi dapat diedit. Variabel: {opd}, {tahun}, {evaluasi} (tahun − 2), {maju} (tahun + 1).
      </p>

      <fieldset :disabled="selected.isActive || busy" class="space-y-3">
        <legend class="mb-3 text-sm font-bold text-slate-800">Struktur dokumen · {{ selected.sections.length }} bab</legend>
        <article v-for="(bab, i) in selected.sections" :key="bab.id" class="space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">
          <div class="flex items-center gap-2">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[11px] font-bold text-blue-800">{{ i + 1 }}</span>
            <input v-model="bab.title" class="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-blue-500" aria-label="Judul bab" />
            <button type="button" @click="selected.sections.splice(i, 1)" class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700" :aria-label="`Hapus ${bab.title}`" title="Hapus bab">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
          <div v-for="(sub, j) in bab.subsections" :key="sub.id" class="space-y-2 border-l-2 border-blue-200 pl-3 sm:ml-9 sm:pl-4">
            <div class="flex gap-2">
              <input v-model="sub.code" class="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-xs font-mono outline-none focus:border-blue-500" aria-label="Kode sub-bab" />
              <input v-model="sub.title" class="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-500" aria-label="Judul sub-bab" />
              <button type="button" @click="bab.subsections.splice(j, 1)" class="rounded-lg px-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700" :aria-label="`Hapus ${sub.title}`" title="Hapus sub-bab">
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
            <label class="block text-xs font-medium text-slate-600">
              Petunjuk isi sub-bab
              <textarea :value="plainText(sub.content)" @input="setInstruction(sub, $event)" rows="2" class="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs leading-relaxed outline-none focus:border-blue-500" aria-label="Petunjuk isi sub-bab"></textarea>
            </label>
          </div>
          <button type="button" @click="addSub(bab, Number(i))" class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">
            <Plus class="h-3.5 w-3.5" /> Tambah sub-bab
          </button>
        </article>
        <button type="button" @click="addBab" class="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
          <Plus class="h-3.5 w-3.5" /> Tambah bab
        </button>
      </fieldset>

      <div class="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <button v-if="!selected.isActive" type="button" @click="save" :disabled="busy" class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
          <Save class="h-3.5 w-3.5" /> Simpan struktur
        </button>
        <button v-if="!selected.isActive" type="button" @click="activate" :disabled="busy" class="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
          <CheckCircle2 class="h-3.5 w-3.5" /> Simpan dan aktifkan
        </button>
        <span v-else class="text-xs font-medium text-emerald-700">Template aktif dan terkunci. Duplikasikan untuk mengubah struktur.</span>
        <button v-if="!selected.isActive" type="button" @click="removeTemplate" :disabled="busy" class="ml-auto inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3.5 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
          <Trash2 class="h-3.5 w-3.5" /> Hapus template
        </button>
      </div>
    </section>

    <div v-if="previewItem" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" @click.self="previewItem = null">
      <section role="dialog" aria-modal="true" :aria-label="`Pratinjau ${previewItem.nama}`" class="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div class="min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-widest text-blue-600">Pratinjau struktur</p>
            <h3 class="mt-1 text-base font-bold text-slate-900">{{ previewItem.nama }}</h3>
            <p class="mt-1 text-xs text-slate-500">{{ previewItem.jenis }} · {{ previewItem.tahun || 'Semua periode' }} · Versi {{ previewItem.versi }}</p>
          </div>
          <button type="button" @click="previewItem = null" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup pratinjau">
            <X class="h-4 w-4" />
          </button>
        </header>
        <div class="max-h-[calc(90vh-110px)] space-y-3 overflow-y-auto p-5">
          <article v-for="(bab, index) in previewItem.sections" :key="bab.id" class="rounded-xl border border-slate-200 p-4">
            <h4 class="text-sm font-bold text-slate-800">{{ bab.title }}</h4>
            <ol v-if="bab.subsections.length" class="mt-3 space-y-2">
              <li v-for="sub in bab.subsections" :key="sub.id" class="rounded-lg bg-slate-50 px-3 py-2.5">
                <p class="text-xs font-semibold text-slate-700"><span class="mr-2 font-mono text-blue-700">{{ sub.code }}</span>{{ sub.title }}</p>
                <p v-if="plainText(sub.content)" class="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">{{ plainText(sub.content) }}</p>
              </li>
            </ol>
            <p v-else class="mt-2 text-xs text-slate-400">Belum ada sub-bab.</p>
          </article>
          <p v-if="!previewItem.sections.length" class="py-8 text-center text-sm text-slate-500">Template ini belum memiliki struktur bab.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { apiFetch } from '../lib/api';
import { useAppStore } from '../stores/appStore';
import {
  CheckCircle2, Copy, Eye, FileClock, FileText, Pencil, Plus, RotateCw, Save, Trash2, X
} from '@lucide/vue';

interface TemplateSubsection {
  id: string;
  code: string;
  title: string;
  content: string;
}
interface TemplateSection {
  id: string;
  title: string;
  subsections: TemplateSubsection[];
}
interface TemplateRecord {
  id: string;
  nama: string;
  jenis: string;
  tahun: string | null;
  versi: number;
  isActive: boolean;
  isDefault?: boolean;
  deskripsi?: string;
  sections: TemplateSection[];
}
type KindFilter = 'all' | 'Renja' | 'RKPD' | 'RPJMD' | 'Renstra' | 'lainnya';

const store = useAppStore();
const templates = ref<TemplateRecord[]>([]);
const selected = ref<TemplateRecord | null>(null);
const previewItem = ref<TemplateRecord | null>(null);
const editorRef = ref<HTMLElement | null>(null);
const copyYear = ref('2027');
const selectedPeriod = ref('all');
const selectedKind = ref<KindFilter>('all');
const error = ref('');
const busy = ref(false);
const loading = ref(false);

const periods = computed(() => {
  const years = [...new Set(templates.value.map(item => item.tahun).filter((year): year is string => Boolean(year)))]
    .sort((a, b) => Number(b) - Number(a));
  const choices = [{ id: 'all', label: 'Semua periode' }, ...years.map(year => ({ id: year, label: `Tahun ${year}` }))];
  return choices.map(period => ({
    ...period,
    count: templates.value.filter(item => matchesPeriod(item, period.id) && matchesKind(item)).length
  }));
});

const kinds = computed(() => {
  const options: Array<{ id: KindFilter; label: string }> = [
    { id: 'all', label: 'Semua jenis' },
    { id: 'Renja', label: 'Renja' },
    { id: 'Renstra', label: 'Renstra' },
    { id: 'RKPD', label: 'RKPD' },
    { id: 'RPJMD', label: 'RPJMD' },
    { id: 'lainnya', label: 'Lainnya' }
  ];
  return options.map(kind => ({
    ...kind,
    count: templates.value.filter(item => matchesPeriod(item, selectedPeriod.value) && matchesKind(item, kind.id)).length
  })).filter(kind => kind.id === 'all' || kind.count > 0);
});

const filteredTemplates = computed(() => templates.value.filter(item =>
  matchesPeriod(item, selectedPeriod.value) && matchesKind(item, selectedKind.value)
));

function matchesPeriod(item: TemplateRecord, period: string) {
  return period === 'all' || item.tahun === null || item.tahun === period;
}

function matchesKind(item: TemplateRecord, kind = selectedKind.value) {
  if (kind === 'all') return true;
  const jenis = item.jenis.toLocaleLowerCase();
  if (kind === 'lainnya') return !['renja', 'renstra', 'rkpd', 'rpjmd'].some(type => jenis.includes(type));
  return jenis.includes(kind.toLocaleLowerCase());
}

async function request(url: string, method = 'GET', body?: unknown): Promise<any> {
  const response = await apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const responseText = await response.text();
  let data: any = null;
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      const message = response.status === 404
        ? 'Rute tidak ditemukan. Mulai ulang backend SIPANDA agar fitur terbaru tersedia.'
        : `Server mengirim respons yang tidak dikenali (HTTP ${response.status}). Coba muat ulang halaman.`;
      throw new Error(message);
    }
  }
  if (!response.ok) throw new Error(data?.error || `Permintaan gagal (HTTP ${response.status})`);
  return data;
}

async function load() {
  loading.value = true;
  try {
    const data = await request('/api/templates');
    if (!Array.isArray(data)) throw new Error('Format daftar template tidak valid.');
    templates.value = data;
    if (selected.value) {
      const refreshed = data.find((item: TemplateRecord) => item.id === selected.value?.id);
      if (refreshed && refreshed.isActive !== selected.value.isActive) select(refreshed);
    }
  } finally {
    loading.value = false;
  }
}

function select(item: TemplateRecord) {
  selected.value = JSON.parse(JSON.stringify(item)) as TemplateRecord;
  copyYear.value = item.tahun || store.selectedTahun || '2027';
  error.value = '';
}

async function editTemplate(item: TemplateRecord) {
  select(item);
  await nextTick();
  editorRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function plainText(html: string) {
  return new DOMParser().parseFromString(html || '', 'text/html').body.textContent || '';
}

function setInstruction(sub: TemplateSubsection, event: Event) {
  const paragraph = document.createElement('p');
  paragraph.textContent = (event.target as HTMLTextAreaElement).value;
  sub.content = paragraph.outerHTML;
}

function addBab() {
  if (!selected.value) return;
  const number = selected.value.sections.length + 1;
  selected.value.sections.push({ id: crypto.randomUUID(), title: `BAB ${number}`, subsections: [] });
}

function addSub(bab: TemplateSection, index: number) {
  bab.subsections.push({
    id: crypto.randomUUID(),
    code: `${index + 1}.${bab.subsections.length + 1}`,
    title: 'Sub-bab baru',
    content: '<p>Petunjuk: isi bagian ini.</p>'
  });
}

async function run(action: () => Promise<void>) {
  error.value = '';
  busy.value = true;
  try {
    await action();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Terjadi kesalahan saat mengelola template.';
  } finally {
    busy.value = false;
  }
}

async function duplicate(item: TemplateRecord | null) {
  if (!item) return;
  select(item);
  await run(async () => {
    const duplicated = await request(`/api/templates/${item.id}/duplicate`, 'POST', { tahun: copyYear.value });
    await load();
    select(duplicated);
    selectedPeriod.value = duplicated.tahun;
    selectedKind.value = 'all';
  });
}

async function save() {
  if (!selected.value) return;
  await run(async () => {
    selected.value = await request(`/api/templates/${selected.value?.id}`, 'PUT', selected.value);
    await load();
    store.addToast('Struktur template disimpan');
  });
}

async function activate() {
  if (!selected.value) return;
  const id = selected.value.id;
  await run(async () => {
    await request(`/api/templates/${id}`, 'PUT', selected.value);
    await request(`/api/templates/${id}/activate`, 'POST');
    await load();
    const activated = templates.value.find(item => item.id === id);
    if (activated) select(activated);
    store.addToast('Template diaktifkan');
  });
}

async function removeTemplate() {
  const item = selected.value;
  if (!item || item.isActive || !window.confirm(`Hapus template "${item.nama}"? Penghapusan ini tidak dapat dibatalkan.`)) return;
  await run(async () => {
    await request(`/api/templates/${item.id}`, 'DELETE');
    selected.value = null;
    await load();
    if (templates.value[0]) select(templates.value[0]);
    store.addToast('Template dihapus');
  });
}

onMounted(() => run(load));
</script>
