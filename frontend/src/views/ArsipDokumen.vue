<template>
  <div class="space-y-6">
    <!-- Top Banner & Year Selector -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Repositori Resmi Arsip Digital Perangkat Daerah
          </span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                :class="store.isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'">
            {{ store.isAdmin ? 'Internal Bapperida' : 'Internal OPD' }}
          </span>
        </div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
          <Archive class="w-6 h-6 text-blue-600 shrink-0" />
          <span>Arsip Dokumen Internal {{ currentOpdShortName }}</span>
        </h1>
      </div>

      <!-- Action Button -->
      <div class="flex items-center gap-2">
        <button
          @click="downloadBundle"
          class="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs"
        >
          <Package class="w-4 h-4 text-slate-500" />
          <span>Unduh Bundel Arsip (ZIP)</span>
        </button>
      </div>
    </div>

    <!-- Filter Bar: 1 Fitur Dropdown Semua Arsip + Filter T.A. + Pencarian -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <!-- 1 Fitur "Semua Arsip" (Dropdown Filter Jenis Dokumen) + Filter T.A. -->
      <div class="flex items-center gap-2">
        <!-- 1 Fitur: Dropdown Semua Arsip / Filter Jenis Dokumen -->
        <div class="relative">
          <button
            @click="showDocTypeDropdown = !showDocTypeDropdown; showYearDropdown = false"
            class="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            <Archive class="w-4 h-4" />
            <span>{{ selectedDocTypeLabel }}</span>
            <ChevronDown class="w-3.5 h-3.5 ml-0.5 transition-transform" :class="{ 'rotate-180': showDocTypeDropdown }" />
          </button>

          <!-- Dropdown List: Semua Arsip, Renja Murni, Renja Perubahan, dll -->
          <div
            v-if="showDocTypeDropdown"
            class="absolute left-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-40 text-xs font-medium"
          >
            <div
              v-for="item in docTypeFilterOptions"
              :key="item.value"
              @click="selectDocType(item.value)"
              class="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors"
              :class="archiveFilterCategory === item.value ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'"
            >
              <span>{{ item.label }}</span>
              <Check v-if="archiveFilterCategory === item.value" class="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
        </div>

        <!-- Filter T.A. di sebelahnya -->
        <div class="relative">
          <button
            @click="showYearDropdown = !showYearDropdown; showDocTypeDropdown = false"
            class="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs"
          >
            <Calendar class="w-3.5 h-3.5 text-blue-600" />
            <span>{{ selectedArchiveYear === 'all' ? 'Semua T.A.' : `T.A. ${selectedArchiveYear}` }}</span>
            <ChevronDown class="w-3.5 h-3.5 text-slate-400" />
          </button>

          <!-- Dropdown List T.A. -->
          <div
            v-if="showYearDropdown"
            class="absolute left-0 mt-1.5 w-36 max-h-64 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-40 text-xs"
          >
            <div
              @click="selectArchiveYear('all')"
              class="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors"
              :class="selectedArchiveYear === 'all' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'"
            >
              <span>Semua T.A.</span>
              <Check v-if="selectedArchiveYear === 'all'" class="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div
              v-for="yr in availableArchiveYears"
              :key="yr"
              @click="selectArchiveYear(yr)"
              class="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors"
              :class="selectedArchiveYear === yr ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'"
            >
              <span>T.A. {{ yr }}</span>
              <Check v-if="selectedArchiveYear === yr" class="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Search Input -->
      <div class="relative w-64">
        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchArchive"
          type="text"
          placeholder="Cari no. registrasi, judul..."
          class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-blue-500 transition-colors shadow-2xs"
        />
      </div>
    </div>

    <!-- Arsip Table (Exclusively for Current OPD) -->
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
      <div v-if="filteredArchiveList.length > 0" class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <th class="py-3 px-4 w-44">No. Registrasi Arsip</th>
              <th class="py-3 px-4 min-w-[320px]">Judul Dokumen</th>
              <th class="py-3 px-4 w-40">Jenis Dokumen</th>
              <th class="py-3 px-4 w-52">Regulasi / Berita Acara (TTE)</th>
              <th class="py-3 px-4 w-32 text-center">Status</th>
              <th class="py-3 px-4 w-36 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="item in filteredArchiveList"
              :key="item.regNo"
              class="hover:bg-slate-50/80 transition-colors cursor-pointer group"
              @click="previewArchive(item)"
            >
              <!-- Registrasi -->
              <td class="py-3.5 px-4 font-mono font-bold text-slate-700 text-[11px]">
                <div class="flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  <span>{{ item.regNo }}</span>
                </div>
              </td>

              <!-- Judul Dokumen -->
              <td class="py-3.5 px-4">
                <div class="flex items-start gap-2.5">
                  <FileText class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div class="min-w-0">
                    <div class="font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {{ item.judul }}
                    </div>
                    <div class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {{ item.subJudul }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- Jenis Dokumen -->
              <td class="py-3.5 px-4">
                <span class="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold"
                      :class="getJenisBadgeClass(item.jenis)">
                  {{ item.jenis }}
                </span>
                <div class="text-[10px] text-slate-400 mt-0.5">
                  {{ item.cara === 'template' ? 'Template Permendagri 86' : 'Upload Berkas' }}
                </div>
              </td>

              <!-- Regulasi / BA -->
              <td class="py-3.5 px-4">
                <span class="font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-semibold">
                  {{ item.regulasi }}
                </span>
              </td>

              <!-- Status -->
              <td class="py-3.5 px-4 text-center">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                      :class="item.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
                  <CheckCircle2 v-if="item.status === 'Disetujui'" class="w-3 h-3" />
                  <Clock v-else class="w-3 h-3" />
                  <span>{{ item.status === 'Disetujui' ? 'Terarsip Sah' : item.status }}</span>
                </span>
              </td>

              <!-- Aksi -->
              <td class="py-3.5 px-4 text-right" @click.stop>
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    @click="previewArchive(item)"
                    title="Pratinjau Naskah Arsip"
                    class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Buka
                  </button>
                  <button
                    @click="downloadDocx(item)"
                    title="Unduh Naskah Word DOCX"
                    class="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                  >
                    <Download class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="p-12 text-center space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
          <Archive class="w-6 h-6" />
        </div>
        <div class="text-sm font-bold text-slate-800">
          Belum ada arsip dokumen yang diverifikasi
        </div>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          Arsip resmi hanya memuat dokumen yang telah diverifikasi dan disahkan oleh admin Bapperida. Riwayat draf dan proses telaah dapat dipantau di halaman Beranda.
        </p>
        <router-link
          to="/"
          class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs mt-2"
        >
          <span>Pantau Riwayat di Beranda</span>
        </router-link>
      </div>
    </div>



    <!-- Preview Modal for Archive Document -->
    <div v-if="selectedPreviewDoc" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-2xl w-full shadow-2xl p-6 border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <!-- Modal Header with Official Kop -->
        <div class="flex items-start justify-between pb-4 border-b border-slate-200">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 class="w-6 h-6" />
            </div>
            <div>
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pemerintah Kabupaten Cirebon • {{ currentOpdFullName }}
              </div>
              <h3 class="text-base font-extrabold text-slate-900 mt-0.5 leading-snug">
                {{ selectedPreviewDoc.judul }}
              </h3>
              <div class="text-xs text-slate-500 mt-0.5">
                {{ selectedPreviewDoc.subJudul }}
              </div>
            </div>
          </div>
          <button @click="selectedPreviewDoc = null" class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Metadata Badges Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <div class="text-[10px] text-slate-400 font-semibold uppercase">No. Registrasi</div>
            <div class="font-mono font-bold text-slate-800 text-[11px] mt-0.5 truncate">
              {{ selectedPreviewDoc.regNo }}
            </div>
          </div>
          <div>
            <div class="text-[10px] text-slate-400 font-semibold uppercase">Tahun Anggaran</div>
            <div class="font-bold text-blue-600 mt-0.5">
              T.A. {{ selectedPreviewDoc.tahun }}
            </div>
          </div>
          <div>
            <div class="text-[10px] text-slate-400 font-semibold uppercase">Jenis Dokumen</div>
            <div class="font-bold text-slate-800 mt-0.5 truncate">
              {{ selectedPreviewDoc.jenis }}
            </div>
          </div>
          <div>
            <div class="text-[10px] text-slate-400 font-semibold uppercase">Status Arsip</div>
            <div class="font-bold text-emerald-600 mt-0.5">
              {{ selectedPreviewDoc.status }}
            </div>
          </div>
        </div>

        <!-- Document Details -->
        <div class="space-y-3 text-xs text-slate-600">
          <div class="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
            <div class="font-bold text-blue-900 flex items-center gap-1.5">
              <CheckCircle2 class="w-4 h-4 text-blue-600" />
              <span>Naskah Terverifikasi & Ditandatangani Secara Elektronik (TTE)</span>
            </div>
            <div class="text-blue-800 text-[11px] mt-1">
              Nomor Berita Acara / Surat: <strong>{{ selectedPreviewDoc.regulasi }}</strong>
            </div>
          </div>

          <div>
            <h4 class="font-bold text-slate-800 text-xs mb-1.5 uppercase tracking-wide">
              Struktur Naskah Baku (Permendagri No. 86/2017)
            </h4>
            <div class="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div class="flex items-center gap-2 text-slate-700">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span><strong>BAB I:</strong> Pendahuluan (Latar Belakang, Landasan Hukum, Maksud & Tujuan)</span>
              </div>
              <div class="flex items-center gap-2 text-slate-700">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span><strong>BAB II:</strong> Evaluasi Pelaksanaan Renja Perangkat Daerah Tahun Lalu</span>
              </div>
              <div class="flex items-center gap-2 text-slate-700">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span><strong>BAB III:</strong> Tujuan dan Sasaran Perangkat Daerah</span>
              </div>
              <div class="flex items-center gap-2 text-slate-700">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span><strong>BAB IV:</strong> Rencana Kerja dan Pendanaan Perangkat Daerah (Matriks Pagu)</span>
              </div>
              <div class="flex items-center gap-2 text-slate-700">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span><strong>BAB V:</strong> Penutup & Kaidah Pelaksanaan</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Footer -->
        <div class="pt-4 border-t border-slate-200 flex items-center justify-between">
          <button
            @click="selectedPreviewDoc = null"
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Tutup
          </button>
          <div class="flex items-center gap-2">
            <button
              @click="downloadDocx(selectedPreviewDoc)"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <Download class="w-4 h-4" />
              <span>Unduh DOCX Word</span>
            </button>
            <router-link
              v-if="selectedPreviewDoc.liveDocId"
              :to="`/editor/${selectedPreviewDoc.liveDocId}`"
              class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              Buka di Editor
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '../lib/api';
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '../stores/appStore';
import {
  Package,
  FileText,
  Building2,
  Search,
  Archive,
  CheckCircle2,
  Clock,
  Download,
  FilePlus,
  X,
  Calendar,
  ChevronDown,
  Check
} from '@lucide/vue';

const store = useAppStore();

const selectedArchiveYear = ref('all');
const showYearDropdown = ref(false);
const showDocTypeDropdown = ref(false);
const archiveFilterCategory = ref('all');

const searchArchive = ref('');
const selectedPreviewDoc = ref<any>(null);
const annexDocuments = ref<any[]>([]);

const docTypeFilterOptions = [
  { value: 'all', label: 'Semua Arsip' },
  { value: 'Renja Murni', label: 'Renja Murni' },
  { value: 'Renja Perubahan', label: 'Renja Perubahan' },
  { value: 'Lampiran', label: 'Lampiran Renja / Renstra' },
  { value: 'Renstra', label: 'Renstra' }
];

const selectedDocTypeLabel = computed(() => {
  const found = docTypeFilterOptions.find(o => o.value === archiveFilterCategory.value);
  return found ? found.label : 'Semua Arsip';
});

const selectDocType = (val: string) => {
  archiveFilterCategory.value = val;
  showDocTypeDropdown.value = false;
};

const availableArchiveYears = computed(() => {
  const years: string[] = [];
  for (let y = 2035; y >= 2022; y--) {
    years.push(String(y));
  }
  return years;
});

const selectArchiveYear = (yr: string) => {
  selectedArchiveYear.value = yr;
  showYearDropdown.value = false;
};

onMounted(async () => {
  if (store.documents.length === 0) {
    await store.fetchDocuments();
  }
  if (store.opds.length === 0) {
    await store.fetchOpds();
  }
  try {
    const response = await apiFetch('/api/annexes');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal membaca lampiran arsip');
    annexDocuments.value = data.filter((doc: any) => doc.status === 'Disetujui' && doc.parent?.status === 'Disetujui');
  } catch (error) {
    console.error('Failed to fetch archived annexes:', error);
    store.addToast(error instanceof Error ? error.message : 'Gagal membaca lampiran arsip', 'error');
  }
});

// Current OPD identification
const currentOpdId = computed(() => store.isSuperAdmin
  ? store.currentUser?.opdId || 'bapperida'
  : store.currentUser?.opdId || 'dinkes');

const currentOpdObj = computed(() => {
  const found = store.opds.find(o => o.id === currentOpdId.value);
  if (found) return found;
  return {
    id: currentOpdId.value,
    kode: '01.02',
    nama: store.currentUser?.opdName || 'Dinas Kesehatan Kab. Cirebon',
    singkatan: store.currentUser?.singkatan || 'Dinkes',
    kategori: 'Dinas'
  };
});

const currentOpdFullName = computed(() => currentOpdObj.value.nama);
const currentOpdShortName = computed(() => currentOpdObj.value.singkatan || currentOpdObj.value.nama);

// Generate archives for this specific OPD
const opdArchiveDocuments = computed(() => {
  const opdId = currentOpdId.value;
  const short = currentOpdShortName.value;

  // 1. Get real documents in store that belong to this OPD
  const liveDocs = [
    ...store.documents.filter(d => d.opdId === opdId && !d.isLampiranOtomatis && d.status === 'Disetujui'),
    ...annexDocuments.value.filter(d => d.opdId === opdId && d.status === 'Disetujui' && d.parent?.status === 'Disetujui')
  ];

  const list: any[] = [];

  // Add live documents
  liveDocs.forEach(d => {
    list.push({
      liveDocId: d.id,
      regNo: d.nomerRegistrasiArsip || `ARS-${d.tahun}-${d.jenis.includes('Lampiran') ? 'LMP' : d.jenis === 'Renja Murni' ? 'RNJ' : d.jenis === 'Renja Perubahan' ? 'RNJ-P' : 'RKPD'}-${d.kodeDoc?.split('-').pop() || '01'}`,
      judul: d.judul,
      subJudul: d.subJudul,
      jenis: d.jenis,
      tahun: d.tahun,
      cara: d.cara || 'template',
      status: d.status,
      regulasi: d.regulation?.nomorPeraturan || d.regulation?.nomorKepbup || d.tteNumber || d.nomorSurat || `050/BA-${short.toUpperCase()}/${d.tahun}`,
      opdId: d.opdId
    });
  });

  return list;
});

// Filter by selected year, category, format, and search
// Only show documents with status 'Disetujui' (verified by admin)
const filteredArchiveList = computed(() => {
  let list = opdArchiveDocuments.value.filter(d => d.status === 'Disetujui');

  // Year filter
  if (selectedArchiveYear.value !== 'all') {
    list = list.filter(d => d.tahun === selectedArchiveYear.value);
  }

  // Document type filter
  if (archiveFilterCategory.value !== 'all') {
    if (archiveFilterCategory.value === 'Renstra') {
      list = list.filter(d => d.jenis === 'Renstra' || d.jenis === 'Renstra Murni' || d.jenis === 'Renstra Perubahan');
    } else if (archiveFilterCategory.value === 'Lampiran') {
      list = list.filter(d => d.jenis.includes('Lampiran'));
    } else {
      list = list.filter(d => d.jenis === archiveFilterCategory.value);
    }
  }

  // Search
  if (searchArchive.value.trim()) {
    const q = searchArchive.value.toLowerCase();
    list = list.filter(d =>
      d.judul.toLowerCase().includes(q) ||
      d.regNo.toLowerCase().includes(q) ||
      d.regulasi.toLowerCase().includes(q) ||
      d.jenis.toLowerCase().includes(q)
    );
  }

  return list;
});


const getJenisBadgeClass = (jenis: string) => {
  switch (jenis) {
    case 'Renja Murni':
      return 'bg-blue-100 text-blue-700';
    case 'Renja Perubahan':
      return 'bg-indigo-100 text-indigo-700';
    case 'Lampiran Renja':
    case 'Lampiran Perbup Renja':
    case 'Lampiran Kepbup Perubahan Renja':
    case 'Lampiran Perbup Renstra':
      return 'bg-amber-100 text-amber-700';
    case 'Renstra':
    case 'Renstra Murni':
    case 'Renstra Perubahan':
    case 'RKPD':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const downloadBundle = () => {
  store.addToast(`Mengunduh seluruh bundel arsip resmi ${currentOpdShortName.value} T.A. ${selectedArchiveYear.value} (.zip)...`, 'success');
};

const previewArchive = (item: any) => {
  selectedPreviewDoc.value = item;
};

const downloadDocx = async (item: any) => {
  try {
    store.addToast(`Menyiapkan unduhan berkas Word (.docx) untuk: ${item.judul}...`, 'info');
    if (item.liveDocId) {
      const response = await apiFetch(`/api/export/docx/${item.liveDocId}`);
      if (!response.ok) throw new Error('Ekspor gagal');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = `${item.regNo}.docx`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      setTimeout(() => {
        store.addToast(`Berkas arsip ${item.regNo}.docx berhasil diunduh.`, 'success');
      }, 1200);
    }
  } catch (err) {
    store.addToast('Gagal mengunduh dokumen', 'error');
  }
};
</script>
