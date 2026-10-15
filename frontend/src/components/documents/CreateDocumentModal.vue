<template>
  <div v-if="store.showCreateModal" class="fixed inset-0 z-50 flex min-h-full items-start justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-5">
    <div class="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:rounded-3xl">
      <!-- Modal Header -->
      <div class="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
        <div class="min-w-0">
          <h2 class="text-base font-bold text-slate-900 sm:text-lg">Buat Dokumen Perencanaan Baru</h2>
          <p class="mt-1 text-xs text-slate-500">Pilih jenis dokumen, tahun anggaran, dan metode penyusunan</p>
        </div>
        <button
          @click="closeModal"
          aria-label="Tutup dialog"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="handleSubmit" class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
        <p v-if="selectedCara==='template'" class="rounded-xl px-3 py-2 text-xs leading-5" :class="activeTemplate ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'">
          {{ loadingTemplate ? 'Memeriksa template tahun anggaran?' : activeTemplate ? `Template: ${activeTemplate.nama} ? versi ${activeTemplate.versi}. Dokumen mempertahankan versi ini.` : `Belum ada template aktif untuk ${selectedJenis} tahun ${selectedTahun}. Pilih tahun lain atau hubungi Super Admin.` }}
        </p>
        <!-- 1. Jenis Dokumen -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Jenis Dokumen Perencanaan <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <section v-for="group in documentGroups" :key="group.label" class="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <h3 class="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{{ group.label }}</h3>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="item in group.options"
                  :key="`${item.id}-${item.quarter || ''}`"
                  type="button"
                  @click="selectDocumentChoice(item)"
                  class="flex min-h-10 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold leading-tight transition-all sm:text-xs"
                  :class="isDocumentChoiceSelected(item) ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm ring-1 ring-blue-200' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'"
                >
                  <component :is="item.icon" class="h-4 w-4 shrink-0" :class="isDocumentChoiceSelected(item) ? 'text-blue-700' : 'text-slate-500'" />
                  <span>{{ item.label }}</span>
                </button>
              </div>
            </section>
          </div>
        </div>

        <!-- 2. Tahun Anggaran -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div :class="selectedJenis.startsWith('Renstra') ? '' : 'sm:col-span-2'">
            <label class="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-700">
              Tahun Anggaran (T.A.) <span class="text-red-500">*</span>
            </label>
            <select
              v-model="selectedTahun"
              :disabled="store.isOpd && (selectedJenis === 'Renja Murni' || selectedJenis === 'Renja Perubahan')"
              class="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option v-for="yr in store.availableYears" :key="yr" :value="yr">
                T.A. {{ yr }}
              </option>
            </select>
          </div>
          <label v-if="selectedJenis.startsWith('Renstra')" class="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
            Periode berakhir <span class="text-red-500">*</span>
            <select
              v-model="selectedPeriodeAkhir"
              class="mt-1.5 block h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option v-for="yr in store.availableYears.filter(year => year >= selectedTahun)" :key="yr" :value="yr">
                {{ yr }}
              </option>
            </select>
          </label>
        </div>

        <!-- 3. Metode Penyusunan Dokumen (Cara A vs Cara B) -->
        <div v-if="!isRkpdEvaluation">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            3. Metode Penyusunan Dokumen <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <!-- Cara A: Template Baku Sistem -->
            <div
              @click="selectedCara = 'template'"
              class="relative cursor-pointer rounded-xl border-2 p-3 transition-all sm:p-3.5"
              :class="selectedCara === 'template' ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'"
            >
              <div class="mb-2 flex items-center justify-between gap-2">
                <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  A
                </div>
                <span class="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Rekomendasi Baku
                </span>
              </div>
              <div class="font-bold text-sm text-slate-800">Pakai Template Sistem</div>
              <p class="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">
                Format baku Permendagri 86/2017: Bab terkunci, cover, daftar isi, penomoran tabel & gambar otomatis.
              </p>
            </div>

            <!-- Cara B: Upload Mandiri -->
            <div
              @click="selectedCara = 'upload'"
              class="relative cursor-pointer rounded-xl border-2 p-3 transition-all sm:p-3.5"
              :class="selectedCara === 'upload' ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                  B
                </div>
                <span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  Berkas PDF / DOCX
                </span>
              </div>
              <div class="font-bold text-sm text-slate-800">Upload File Mandiri</div>
              <p class="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">
                Unggah dokumen eksternal buatan sendiri dalam format PDF atau DOCX dengan metadata lengkap.
              </p>
            </div>
          </div>
        </div>

        <div v-else class="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p class="font-semibold">Evaluasi RKPD · Triwulan {{ quarterLabels[(selectedEvaluationQuarter || 1) - 1] }}</p>
          <p class="mt-1 text-xs leading-5 text-blue-800">Evaluasi RKPD disusun di editor dokumen. Triwulan terpilih akan dicantumkan pada judul naskah.</p>
        </div>

        <!-- If Cara B (Upload) -->
        <div v-if="selectedCara === 'upload'" class="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-center sm:p-4">
          <input
            type="file"
            ref="fileInputRef"
            @change="handleFileChange"
            accept=".pdf,.docx"
            class="hidden"
            id="file-upload"
          />
          <label for="file-upload" class="cursor-pointer block">
            <UploadCloud class="mx-auto mb-1.5 h-7 w-7 text-blue-600" />
            <span class="text-xs font-bold text-blue-600">Klik untuk memilih file</span>
            <span class="text-xs text-slate-500"> atau seret berkas ke sini</span>
            <div class="text-[11px] text-slate-400 mt-1">Mendukung format PDF atau DOCX (Maksimal 25MB)</div>
          </label>
          <div v-if="selectedFile" class="mt-3 p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2">
            <FileText class="w-4 h-4 text-blue-600" />
            <span>{{ selectedFile.name }}</span>
            <span class="text-slate-400">({{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB)</span>
          </div>
          <p v-if="selectedJenis.includes('Renja')" class="mt-2 text-left text-[11px] leading-relaxed text-amber-700">
            Unggah PDF atau DOCX yang memuat BAB I sampai penutup. Lampiran dimulai dari blok nomor lampiran dan BAB I; isi, tabel, gambar, serta urutan berikutnya mengikuti berkas asli. Untuk sumber PDF, unduhan lampiran tersedia dalam PDF.
          </p>
        </div>

        <!-- Custom Title (Optional) -->
        <div>
          <label class="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-700">
            Judul Naskah Dokumen
          </label>
          <input
            v-model="customJudul"
            type="text"
            :placeholder="defaultJudulPlaceholder"
            class="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </div>
        </div>

        <!-- Modal Actions -->
        <div class="sticky bottom-0 z-20 flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3.5 sm:gap-3 sm:px-6">
          <button
            type="button"
            @click="closeModal"
            class="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="loading || (!isInternalDocument && store.isBapperida && !targetOpdId)"
            class="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
          >
            <Sparkles class="w-4 h-4" />
            <span>{{ selectedCara === 'template' ? 'Buka Editor Dokumen' : 'Simpan & Unggah Dokumen' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../../stores/appStore';
import type { DocumentType, DocumentMethod, OPD } from '../../types';
import { apiFetch } from '../../lib/api';
import {
  X,
  FileText,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  UploadCloud,
  Sparkles
} from '@lucide/vue';

const store = useAppStore();
const router = useRouter();

const selectedJenis = ref<DocumentType>('Renja Murni');
const selectedEvaluationQuarter = ref<number | null>(null);
const selectedTahun = ref<string>(store.defaultDocumentYear('Renja Murni'));
const selectedPeriodeAkhir = ref<string>(String(Number(selectedTahun.value) + 4));
const selectedCara = ref<DocumentMethod>('template');
const selectedOpdId = ref<string>(store.isOpd ? store.currentUser?.opdId || '' : '');
const assignedOpds = ref<Pick<OPD, 'id' | 'nama'>[]>([]);
const customJudul = ref<string>('');
const selectedFile = ref<File | null>(null);
const loading = ref(false);
const activeTemplate = ref<any>(null);
const loadingTemplate = ref(false);
let templateRequest = 0;
watch([selectedJenis, selectedTahun, () => store.showCreateModal], async () => {
  const request = ++templateRequest;
  if (!store.showCreateModal) {
    loadingTemplate.value = false;
    activeTemplate.value = null;
    return;
  }
  loadingTemplate.value=true;activeTemplate.value=null;
  try {
    const res=await apiFetch(`/api/templates?jenis=${encodeURIComponent(selectedJenis.value)}&tahun=${selectedTahun.value}`);
    if (res.ok) {
      const list=await res.json();
      if(request===templateRequest) activeTemplate.value=list.find((t:any)=>t.isActive && t.tahun===selectedTahun.value)||list.find((t:any)=>t.isActive)||null;
    }
  } finally { if(request===templateRequest) loadingTemplate.value=false; }
});
watch([selectedJenis, selectedTahun], () => {
  if (selectedJenis.value.startsWith('Renstra') && Number(selectedPeriodeAkhir.value) < Number(selectedTahun.value)) {
    selectedPeriodeAkhir.value = String(Number(selectedTahun.value) + 4);
  }
});
watch(selectedJenis, jenis => {
  if (jenis === 'Renja Murni' || jenis === 'Renja Perubahan') {
    selectedTahun.value = store.defaultDocumentYear(jenis);
  }
});

const isInternalDocument = computed(() => ['RKPD', 'RKPD Murni', 'RKPD Perubahan', 'Evaluasi RKPD Triwulan', 'RPJMD'].includes(selectedJenis.value));

const opdDocTypes = [
  { id: 'Renja Murni' as DocumentType, label: 'Renja Murni', icon: FileText },
  { id: 'Renja Perubahan' as DocumentType, label: 'Renja Perubahan', icon: Layers },
  { id: 'Renstra Murni' as DocumentType, label: 'Renstra Murni', icon: FileSpreadsheet },
  { id: 'Renstra Perubahan' as DocumentType, label: 'Renstra Perubahan', icon: RefreshCw }
];

const bapperidaDocTypes = [
  { id: 'Renja Murni' as DocumentType, label: 'Renja Murni', icon: FileText },
  { id: 'Renja Perubahan' as DocumentType, label: 'Renja Perubahan', icon: Layers },
  { id: 'Renstra Murni' as DocumentType, label: 'Renstra Murni', icon: FileSpreadsheet },
  { id: 'Renstra Perubahan' as DocumentType, label: 'Renstra Perubahan', icon: RefreshCw },
  { id: 'RKPD Murni' as DocumentType, label: 'RKPD Murni', icon: FileSpreadsheet },
  { id: 'RKPD Perubahan' as DocumentType, label: 'RKPD Perubahan', icon: RefreshCw },
  { id: 'Evaluasi RKPD Triwulan' as DocumentType, label: 'Evaluasi RKPD Triwulan', icon: FileSpreadsheet },
  { id: 'RPJMD' as DocumentType, label: 'RPJMD', icon: FileText }
];

const docTypes = computed(() => store.isSuperAdmin
  ? bapperidaDocTypes
  : store.isStaff ? bapperidaDocTypes.filter(item => item.id.startsWith('Renja')) : opdDocTypes);

const quarterLabels = ['I', 'II', 'III', 'IV'];
const documentGroups = computed(() => {
  const byId = (id: DocumentType) => docTypes.value.find(item => item.id === id);
  const regularGroup = (label: string, ids: DocumentType[]) => ({
    label,
    options: ids.flatMap(id => {
      const item = byId(id);
      return item ? [{ ...item, quarter: null as number | null }] : [];
    })
  });
  return [
    regularGroup('Renja', ['Renja Murni', 'Renja Perubahan']),
    regularGroup('Renstra', ['Renstra Murni', 'Renstra Perubahan']),
    regularGroup('RKPD', ['RKPD Murni', 'RKPD Perubahan']),
    ...(store.isSuperAdmin ? [{
      label: 'Evaluasi RKPD',
      options: quarterLabels.map((label, index) => ({
        id: 'Evaluasi RKPD Triwulan' as DocumentType,
        label: `Triwulan ${label}`,
        icon: FileSpreadsheet,
        quarter: index + 1
      }))
    }] : []),
    regularGroup('RPJMD', ['RPJMD'])
  ].filter(group => group.options.length);
});
const isRkpdEvaluation = computed(() => selectedJenis.value === 'Evaluasi RKPD Triwulan');

function selectDocumentChoice(item: { id: DocumentType; quarter: number | null }) {
  selectedJenis.value = item.id;
  selectedEvaluationQuarter.value = item.quarter;
  if (item.quarter) {
    selectedCara.value = 'template';
    selectedFile.value = null;
  }
}

function isDocumentChoiceSelected(item: { id: DocumentType; quarter: number | null }) {
  return selectedJenis.value === item.id && selectedEvaluationQuarter.value === item.quarter;
}

const selectableOpds = computed(() => store.isStaff
  ? assignedOpds.value
  : store.opds);

const loadAssignedOpds = async () => {
  if (!store.isStaff) return;
  const res = await apiFetch(`/api/staf/penugasan/saya?tahun=${selectedTahun.value}`);
  if (res.ok) {
    assignedOpds.value = await res.json();
    if (!assignedOpds.value.some(opd => opd.id === selectedOpdId.value)) {
      selectedOpdId.value = assignedOpds.value[0]?.id || '';
    }
  }
};

watch(() => store.currentUser?.role, async () => {
  selectedOpdId.value = store.isOpd
    ? store.currentUser?.opdId || ''
    : store.isSuperAdmin ? store.opds.find(opd => opd.id === 'bapperida')?.id || store.opds[0]?.id || '' : '';
  if (store.isStaff) await loadAssignedOpds();
});
watch(() => store.showCreateModal, async isOpen => {
  if (!isOpen) return;
  selectedJenis.value = 'Renja Murni';
  selectedEvaluationQuarter.value = null;
  selectedTahun.value = store.defaultDocumentYear('Renja Murni');
  selectedPeriodeAkhir.value = String(Number(selectedTahun.value) + 4);
  selectedCara.value = 'template';
  selectedOpdId.value = store.isOpd
    ? store.currentUser?.opdId || ''
    : store.isSuperAdmin ? store.opds.find(opd => opd.id === 'bapperida')?.id || store.opds[0]?.id || '' : '';
  if (store.isStaff) await loadAssignedOpds();
});
watch(selectedTahun, async () => {
  if (store.showCreateModal && store.isStaff) await loadAssignedOpds();
});

watch(() => store.opds, opds => {
  if (!selectedOpdId.value && store.isBapperida) {
    selectedOpdId.value = opds.find(opd => opd.id === 'bapperida')?.id || opds[0]?.id || '';
  }
}, { immediate: true });

const targetOpdId = computed(() => isInternalDocument.value
  ? 'bapperida'
  : store.isOpd ? store.currentUser?.opdId || '' : selectedOpdId.value);

const defaultJudulPlaceholder = computed(() => {
  const opd = store.opds.find(o => o.id === targetOpdId.value)?.nama || store.currentOpdName;
  if (isRkpdEvaluation.value && selectedEvaluationQuarter.value) {
    return `Evaluasi RKPD Triwulan ${quarterLabels[selectedEvaluationQuarter.value - 1]} ${selectedTahun.value}`;
  }
  return `${selectedJenis.value} ${selectedTahun.value} - ${opd}`;
});

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
  }
};

const closeModal = () => {
  store.showCreateModal = false;
  selectedFile.value = null;
  customJudul.value = '';
};

const handleSubmit = async () => {
  try {
    loading.value = true;
    let newDoc;

    if (isRkpdEvaluation.value && !selectedEvaluationQuarter.value) {
      store.addToast('Pilih triwulan evaluasi terlebih dahulu.', 'error');
      return;
    }

    if (selectedCara.value === 'upload') {
      if (!selectedFile.value) {
        store.addToast('Pilih berkas PDF atau DOCX terlebih dahulu!', 'error');
        return;
      }
      const formData = new FormData();
      formData.append('jenis', selectedJenis.value);
      formData.append('tahun', selectedTahun.value);
      formData.append('cara', 'upload');
      formData.append('opdId', targetOpdId.value);
      if (selectedJenis.value.startsWith('Renstra')) formData.append('periodeAkhir', selectedPeriodeAkhir.value);
      formData.append('judul', customJudul.value.trim() || defaultJudulPlaceholder.value);
      formData.append('file', selectedFile.value);

      newDoc = await store.createDocument(formData, true);
      closeModal();
      router.push('/dokumen');
    } else {
      // Cara A: Template Sistem
      const payload = {
        jenis: selectedJenis.value,
        tahun: selectedTahun.value,
        cara: 'template',
        opdId: targetOpdId.value,
        ...(selectedJenis.value.startsWith('Renstra') ? { periodeAkhir: selectedPeriodeAkhir.value } : {}),
        judul: customJudul.value.trim() || defaultJudulPlaceholder.value
      };

      newDoc = await store.createDocument(payload, false);
      closeModal();
      // Redirect directly to the full-featured Document Editor
      router.push(`/editor/${newDoc.id}`);
    }
  } catch (err: any) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};
</script>
