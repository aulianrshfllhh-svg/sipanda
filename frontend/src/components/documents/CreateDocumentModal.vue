<template>
  <div v-if="store.showCreateModal" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Buat Dokumen Perencanaan Baru</h2>
          <p class="text-xs text-slate-500">Pilih jenis dokumen, tahun anggaran, dan metode penyusunan</p>
        </div>
        <button
          @click="closeModal"
          class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-5">
        <p v-if="selectedCara==='template' && requiresVersion" class="rounded-lg p-3 text-xs" :class="activeTemplate ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'">
          {{ loadingTemplate ? 'Memeriksa template tahun anggaran?' : activeTemplate ? `Template: ${activeTemplate.nama} ? versi ${activeTemplate.versi}. Dokumen mempertahankan versi ini.` : `Belum ada template aktif untuk ${selectedJenis} tahun ${selectedTahun}. Pilih tahun lain atau hubungi Super Admin.` }}
        </p>
        <!-- 1. Jenis Dokumen -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Jenis Dokumen Perencanaan <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 gap-2" :class="store.isBapperida ? 'sm:grid-cols-3' : 'sm:grid-cols-2'">
            <div
              v-for="item in docTypes"
              :key="item.id"
              @click="selectedJenis = item.id"
              class="p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
              :class="selectedJenis === item.id ? 'border-blue-600 bg-blue-50/40 text-blue-900 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'"
            >
              <component :is="item.icon" class="w-5 h-5" :class="selectedJenis === item.id ? 'text-blue-600' : 'text-slate-400'" />
              <div class="font-bold text-xs leading-tight">{{ item.label }}</div>
            </div>
          </div>
        </div>

        <!-- 2. Perangkat Daerah (if Admin) & Tahun Anggaran -->
        <div class="grid grid-cols-2 gap-4">
          <div v-if="store.isBapperida && !isInternalDocument">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Perangkat Daerah (OPD) Pengusul
            </label>
            <select
              v-model="selectedOpdId"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs text-slate-800 font-medium outline-none"
            >
              <option value="" disabled>Pilih OPD yang ditugaskan</option>
              <option v-for="opd in selectableOpds" :key="opd.id" :value="opd.id">
                {{ opd.nama }}
              </option>
            </select>
          </div>

          <div :class="store.isBapperida && !isInternalDocument ? '' : 'col-span-2'">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tahun Anggaran (T.A.) <span class="text-red-500">*</span>
            </label>
            <select
              v-model="selectedTahun"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs text-slate-800 font-bold outline-none"
            >
              <option v-for="yr in store.availableYears" :key="yr" :value="yr">
                T.A. {{ yr }}
              </option>
            </select>
          </div>
          <label v-if="selectedJenis.startsWith('Renstra')" class="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Periode berakhir <span class="text-red-500">*</span>
            <select
              v-model="selectedPeriodeAkhir"
              class="block w-full mt-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs text-slate-800 font-bold outline-none"
            >
              <option v-for="yr in store.availableYears.filter(year => year >= selectedTahun)" :key="yr" :value="yr">
                {{ yr }}
              </option>
            </select>
          </label>
        </div>

        <!-- 3. Metode Penyusunan Dokumen (Cara A vs Cara B) -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            2. Metode Penyusunan Dokumen <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 gap-3">
            <!-- Cara A: Template Baku Sistem -->
            <div
              @click="selectedCara = 'template'"
              class="p-4 rounded-2xl border-2 transition-all cursor-pointer relative"
              :class="selectedCara === 'template' ? 'border-blue-600 bg-blue-50/40 text-blue-900 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  A
                </div>
                <span class="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Rekomendasi Baku
                </span>
              </div>
              <div class="font-bold text-sm text-slate-800">Pakai Template Sistem</div>
              <p class="text-xs text-slate-500 mt-1">
                Format baku Permendagri 86/2017: Bab terkunci, cover, daftar isi, penomoran tabel & gambar otomatis.
              </p>
            </div>

            <!-- Cara B: Upload Mandiri -->
            <div
              @click="selectedCara = 'upload'"
              class="p-4 rounded-2xl border-2 transition-all cursor-pointer relative"
              :class="selectedCara === 'upload' ? 'border-blue-600 bg-blue-50/40 text-blue-900 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'"
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
              <p class="text-xs text-slate-500 mt-1">
                Unggah dokumen eksternal buatan sendiri dalam format PDF atau DOCX dengan metadata lengkap.
              </p>
            </div>
          </div>
        </div>

        <!-- If Cara B (Upload) -->
        <div v-if="selectedCara === 'upload'" class="p-4 border-2 border-dashed border-slate-300 rounded-2xl text-center bg-slate-50">
          <input
            type="file"
            ref="fileInputRef"
            @change="handleFileChange"
            accept=".pdf,.docx"
            class="hidden"
            id="file-upload"
          />
          <label for="file-upload" class="cursor-pointer block">
            <UploadCloud class="w-8 h-8 text-blue-600 mx-auto mb-2" />
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
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Judul Naskah Dokumen
          </label>
          <input
            v-model="customJudul"
            type="text"
            :placeholder="defaultJudulPlaceholder"
            class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs text-slate-800 font-medium outline-none"
          />
        </div>

        <!-- Modal Actions -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="closeModal"
            class="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="loading || (!isInternalDocument && store.isBapperida && !targetOpdId)"
            class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-colors"
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
const requiresVersion = computed(() => !selectedJenis.value.startsWith('Renstra'));
let templateRequest = 0;
watch([selectedJenis, selectedTahun, () => store.showCreateModal], async () => {
  const request = ++templateRequest;
  if (!store.showCreateModal || !requiresVersion.value) return;
  loadingTemplate.value=true;activeTemplate.value=null;
  try {
    const res=await apiFetch(`/api/templates?jenis=${encodeURIComponent(selectedJenis.value)}&tahun=${selectedTahun.value}`);
    if (res.ok) { const list=await res.json(); if(request===templateRequest) activeTemplate.value=list.find((t:any)=>t.isActive)||null; }
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

const isInternalDocument = computed(() => ['RKPD', 'RKPD Murni', 'RKPD Perubahan', 'RPJMD'].includes(selectedJenis.value));

const opdDocTypes = [
  { id: 'Renja Murni' as DocumentType, label: 'Renja Murni', icon: FileText },
  { id: 'Renja Perubahan' as DocumentType, label: 'Renja Perubahan', icon: Layers },
  { id: 'Renstra Murni' as DocumentType, label: 'Renstra Murni', icon: FileSpreadsheet },
  { id: 'Renstra Perubahan' as DocumentType, label: 'Renstra Perubahan', icon: RefreshCw }
];

const bapperidaDocTypes = [
  { id: 'Renja Murni' as DocumentType, label: 'Renja OPD Murni', icon: FileText },
  { id: 'Renja Perubahan' as DocumentType, label: 'Renja OPD Perubahan', icon: Layers },
  { id: 'Renstra Murni' as DocumentType, label: 'Renstra OPD Murni', icon: FileSpreadsheet },
  { id: 'Renstra Perubahan' as DocumentType, label: 'Renstra OPD Perubahan', icon: RefreshCw },
  { id: 'RKPD Murni' as DocumentType, label: 'RKPD Murni', icon: FileSpreadsheet },
  { id: 'RKPD Perubahan' as DocumentType, label: 'RKPD Perubahan', icon: RefreshCw },
  { id: 'RPJMD' as DocumentType, label: 'RPJMD', icon: FileText }
];

const docTypes = computed(() => store.isSuperAdmin
  ? bapperidaDocTypes
  : store.isStaff ? bapperidaDocTypes.filter(item => item.id.startsWith('Renja')) : opdDocTypes);

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
    : store.isSuperAdmin ? store.opds.find(opd => opd.id !== 'bapperida')?.id || '' : '';
  if (store.isStaff) await loadAssignedOpds();
});
watch(() => store.showCreateModal, async isOpen => {
  if (!isOpen) return;
  selectedJenis.value = 'Renja Murni';
  selectedTahun.value = store.defaultDocumentYear('Renja Murni');
  selectedPeriodeAkhir.value = String(Number(selectedTahun.value) + 4);
  selectedCara.value = 'template';
  selectedOpdId.value = store.isOpd
    ? store.currentUser?.opdId || ''
    : store.isSuperAdmin ? store.opds.find(opd => opd.id !== 'bapperida')?.id || '' : '';
  if (store.isStaff) await loadAssignedOpds();
});
watch(selectedTahun, async () => {
  if (store.showCreateModal && store.isStaff) await loadAssignedOpds();
});

watch(() => store.opds, opds => {
  if (!selectedOpdId.value && store.isBapperida) {
    selectedOpdId.value = opds.find(opd => opd.id !== 'bapperida')?.id || '';
  }
}, { immediate: true });

const targetOpdId = computed(() => isInternalDocument.value
  ? 'bapperida'
  : store.isOpd ? store.currentUser?.opdId || '' : selectedOpdId.value);

const defaultJudulPlaceholder = computed(() => {
  const opd = store.opds.find(o => o.id === targetOpdId.value)?.nama || store.currentOpdName;
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
