<template>
  <div class="space-y-6">
    <!-- Welcome Header & Quick Action Banner -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
            Selamat Datang di SIPANDA, {{ store.currentUser?.name }} 👋
          </h1>
        </div>
        <p class="text-xs text-slate-500 mt-1">
          Organisasi Perangkat Daerah Kabupaten Cirebon • {{ store.currentUser?.opdName }}
        </p>

        <!-- Status Badges -->
        <div class="flex flex-wrap items-center gap-2.5 mt-2.5">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <Calendar class="w-3.5 h-3.5" />
            <span>Tahun Anggaran {{ store.selectedTahun }} (Renja Murni)</span>
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <Clock class="w-3.5 h-3.5 text-red-500" />
            <span>Tersisa 4 Hari Kalender (Tenggat: 25 April {{ store.selectedTahun }})</span>
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2.5">
        <button
          @click="showGuidance = true"
          class="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs"
        >
          <BookOpen class="w-4 h-4 text-slate-500" />
          <span>Panduan Penyusunan</span>
        </button>
        <button
          @click="store.showCreateModal = true"
          class="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-blue-500/20"
        >
          <Plus class="w-4 h-4" />
          <span>+ Buat Dokumen Baru</span>
        </button>
      </div>
    </div>

    <!-- 4 Metric Cards (White Uniform Cards: Label + Number Only) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Total Dokumen -->
      <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Total Dokumen</span>
          <FileText class="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <div class="text-3xl font-extrabold text-slate-900 tracking-tight">
            {{ opdDocs.length }} <span class="text-sm font-medium text-slate-500">Dokumen</span>
          </div>
        </div>
      </div>

      <!-- 2. Sedang Berjalan / Draf -->
      <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Sedang Berjalan / Draf</span>
          <span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Draf</span>
        </div>
        <div>
          <div class="text-3xl font-extrabold text-slate-900 tracking-tight">
            {{ drafCount }} <span class="text-sm font-medium text-slate-500">Dokumen</span>
          </div>
        </div>
      </div>

      <!-- 3. Menunggu Verifikasi -->
      <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Menunggu Verifikasi</span>
          <span class="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Review</span>
        </div>
        <div>
          <div class="text-3xl font-extrabold text-slate-900 tracking-tight">
            {{ waitingCount }} <span class="text-sm font-medium text-slate-500">Dokumen</span>
          </div>
        </div>
      </div>

      <!-- 4. Disetujui & Terbit BA -->
      <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Disetujui & Terbit BA</span>
          <span class="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Sah</span>
        </div>
        <div>
          <div class="text-3xl font-extrabold text-slate-900 tracking-tight">
            {{ approvedCount }} <span class="text-sm font-medium text-slate-500">Dokumen</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Section: Active Documents & Right Sidebars -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- Left 2 Cols: Active Documents Table -->
      <div class="xl:col-span-2 space-y-5">
        <!-- Dokumen Perencanaan Aktif & Riwayat Table -->
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div class="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-bold text-slate-900">Dokumen Perencanaan Aktif & Riwayat</h2>
            </div>

            <!-- Filter tabs -->
            <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                v-for="tab in docStatusTabs"
                :key="tab.label"
                @click="docTableTab = tab.label"
                class="px-3 py-1.5 rounded-lg transition-colors"
                :class="docTableTab === tab.label ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'"
              >
                {{ tab.label }}
                <span class="ml-1 text-[10px] opacity-70">{{ tab.count }}</span>
              </button>
            </div>
          </div>

          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th class="py-3 px-4">Nama & Nomor Dokumen</th>
                <th class="py-3 px-4">Jenis Dokumen</th>
                <th class="py-3 px-4">Pembaruan</th>
                <th class="py-3 px-4 text-right">Status Validasi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="doc in filteredOpdDocs"
                :key="doc.id"
                @click="openDoc(doc)"
                class="hover:bg-slate-50/70 transition-colors cursor-pointer"
              >
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText class="w-4 h-4" />
                    </div>
                    <div>
                      <div class="font-bold text-slate-900 hover:text-blue-600 transition-colors">
                        {{ doc.judul }}
                      </div>
                      <div class="text-[11px] text-slate-500 mt-0.5">
                        No. {{ doc.nomorSurat || doc.kodeDoc }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-slate-600">
                  <div>{{ doc.jenis }}</div>
                  <div class="text-[10px] text-slate-400">{{ doc.subJudul }}</div>
                </td>
                <td class="py-3.5 px-4 text-slate-500 text-[11px]">
                  {{ formatTime(doc.updatedAt) }}
                </td>
                <td class="py-3.5 px-4 text-right">
                  <span
                    class="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold"
                    :class="getStatusPill(doc.status)"
                  >
                    {{ doc.status }}
                  </span>
                  <button
                    v-if="doc.status === 'Draft'"
                    @click.stop="submitDraft(doc)"
                    :disabled="isSubmittingDocumentId === doc.id || !isUploadReady(doc)"
                    :title="!isUploadReady(doc) ? 'Unggah dan simpan berkas dokumen sebelum diajukan' : 'Kirim dokumen ini ke Bapperida untuk diverifikasi'"
                    class="mt-1.5 flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Send class="h-3 w-3" />
                    {{ isSubmittingDocumentId === doc.id ? 'Mengajukan...' : isUploadReady(doc) ? 'Ajukan ke Admin' : 'Unggah berkas dulu' }}
                  </button>
                  <button
                    v-if="doc.status === 'Perlu Revisi' && doc.cara === 'upload'"
                    @click.stop="openRevisionUpload(doc)"
                    class="block ml-auto mt-1 text-[10px] font-bold text-blue-700 hover:text-blue-900"
                  >
                    Unggah Perbaikan
                  </button>
                </td>
              </tr>
              <tr v-if="filteredOpdDocs.length === 0">
                <td colspan="4" class="py-8 text-center text-xs text-slate-500">
                  Tidak ada dokumen pada status ini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right Column: Catatan Verifikator & Kepatuhan Sistematika -->
      <div class="space-y-5">
        <!-- 1. Catatan Verifikator Card (Prominent from Screenshot 4) -->
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs relative">
          <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <MessageSquare class="w-4 h-4 text-amber-600" />
              <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Catatan Verifikator</h2>
            </div>
            <span class="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              1 Catatan Aktif
            </span>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-red-600 uppercase">Perbaikan Bab IV</span>
              <span class="text-[10px] text-slate-400">2 jam yang lalu</span>
            </div>

            <p class="text-xs text-slate-700 italic bg-amber-50/60 p-3 rounded-xl border border-amber-200 leading-relaxed font-serif">
              "Pagu Sub Kegiatan Pelayanan Rujukan (Kode: 1.02.02.2.02.0004) perlu dirasionalisasi kembali ke pagu indikatif TAPD Kabupaten Cirebon."
            </p>

            <div class="flex items-center gap-2.5 pt-1">
              <div class="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px]">
                AR
              </div>
              <div class="text-[11px]">
                <div class="font-bold text-slate-800">Ahmad Rosyadi, M.Si</div>
                <div class="text-slate-500 text-[10px]">Bidang PPEPD - Desk Wilayah II</div>
              </div>
            </div>

            <button
              v-if="revisionDoc"
              @click="openDoc(revisionDoc)"
              class="w-full mt-2 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <FileEdit class="w-4 h-4" />
              <span>{{ revisionDoc.cara === 'upload' ? 'Unggah Berkas Perbaikan' : 'Buka Lembar Catatan Revisi' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Help & Kepatuhan Button (Rule 3) -->
    <div class="fixed bottom-6 right-6 z-40">
      <button
        @click="showSupportModal = true"
        class="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 text-xs font-bold"
      >
        <HelpCircle class="w-4 h-4" />
        <span>Bantuan & Kepatuhan</span>
      </button>
    </div>

    <!-- Modal: Bantuan & Kepatuhan Sistematika (Rule 3) -->
    <div v-if="showSupportModal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-100 space-y-5">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="w-5 h-5 text-blue-600" />
            <h3 class="font-bold text-slate-900 text-sm">Bantuan & Standar Kepatuhan</h3>
          </div>
          <button @click="showSupportModal = false" class="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 1. Kepatuhan Sistematika -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Kepatuhan Sistematika</h4>
            <span class="text-[10px] text-slate-500 font-medium">Permendagri 86/2017</span>
          </div>

          <div class="space-y-2 text-xs">
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div class="flex items-center gap-2 text-slate-700 font-medium">
                <CheckCircle2 class="w-4 h-4 text-blue-600" />
                <span>Sistematika Bab I - V</span>
              </div>
              <span class="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[11px]">100% Sesuai</span>
            </div>

            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div class="flex items-center gap-2 text-slate-700 font-medium">
                <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                <span>Matriks T-C.29 Renja</span>
              </div>
              <span class="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">Lengkap</span>
            </div>

            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div class="flex items-center gap-2 text-slate-700 font-medium">
                <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                <span>BA Forum OPD Terverifikasi</span>
              </div>
              <span class="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">TTE Valid</span>
            </div>
          </div>
        </div>

        <!-- 2. Narahubung Desk Bapperida -->
        <div class="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
          <div class="flex items-center gap-2 mb-1.5">
            <Headphones class="w-4 h-4 text-blue-700" />
            <h4 class="text-xs font-bold text-blue-900 uppercase tracking-wider">Narahubung Desk Bapperida</h4>
          </div>
          <p class="text-xs text-blue-800 leading-relaxed mb-3">
            Desk Pendampingan Perencanaan Wilayah II (Dinkes & Dinsos Kab. Cirebon)
          </p>
          <div class="space-y-2">
            <a
              href="https://wa.me/628123456789"
              target="_blank"
              class="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 flex items-center justify-between transition-colors shadow-2xs"
            >
              <span>WhatsApp Helpdesk</span>
              <span class="text-blue-600">&rarr; Hubungi</span>
            </a>
            <div class="px-3 py-2 text-xs text-slate-600 bg-white/70 rounded-xl border border-blue-100 flex justify-between font-mono">
              <span>Hotline SIPANDA Cirebon</span>
              <span class="font-bold">Ext. 104</span>
            </div>
          </div>
        </div>

        <div class="pt-2 text-right">
          <button @click="showSupportModal = false" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors">
            Tutup
          </button>
        </div>
      </div>
    </div>

    <!-- Replace uploaded document returned for revision -->
    <div v-if="uploadRevisionDoc" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-100 space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="font-bold text-slate-900 text-base">Unggah Berkas Perbaikan</h3>
            <p class="text-xs text-slate-500 mt-1">{{ uploadRevisionDoc.judul }}</p>
          </div>
          <button @click="closeRevisionUpload" class="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div v-if="uploadRevisionDoc.catatanRevisi" class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <strong>Catatan Bapperida:</strong> {{ uploadRevisionDoc.catatanRevisi }}
        </div>

        <label class="block p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-pointer">
          <span class="block text-xs font-bold text-slate-700">Pilih berkas pengganti</span>
          <span class="block text-[11px] text-slate-500 mt-1">PDF, DOC, atau DOCX</span>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            class="block w-full mt-3 text-xs text-slate-600"
            @change="selectRevisionFile"
          />
        </label>
        <p v-if="revisionFile" class="text-xs text-slate-600">{{ revisionFile.name }}</p>
        <p v-if="revisionFileUploaded" class="text-xs font-semibold text-emerald-700">
          Berkas pengganti tersimpan. Ajukan ulang untuk mengirimkannya ke Bapperida.
        </p>

        <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button @click="closeRevisionUpload" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
            Tutup
          </button>
          <button
            v-if="!revisionFileUploaded"
            @click="saveRevisionFile"
            :disabled="!revisionFile || isReplacingRevisionFile"
            class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isReplacingRevisionFile ? 'Mengunggah...' : 'Simpan Berkas Perbaikan' }}
          </button>
          <button
            v-if="revisionFileUploaded"
            @click="resubmitRevision"
            :disabled="isSubmittingRevision"
            class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSubmittingRevision ? 'Mengajukan...' : 'Ajukan Ulang ke Bapperida' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Guidance Modal -->
    <div v-if="showGuidance" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-100">
        <h3 class="font-bold text-slate-900 text-base mb-2">Alur Dokumen Perencanaan</h3>
        <ol class="list-decimal pl-5 space-y-2 text-xs text-slate-600 leading-relaxed">
          <li>OPD menyusun dokumen atau mengunggah berkas, lalu mengajukannya ke Bapperida untuk verifikasi.</li>
          <li>Bapperida menelaah dokumen dan memberi keputusan: disetujui atau perlu revisi.</li>
          <li>Jika perlu revisi, buka tab <strong>Perlu Revisi</strong>, perbaiki dokumen, lalu ajukan ulang. Untuk dokumen upload, unggah berkas pengganti pada dokumen yang sama.</li>
          <li>Dokumen yang disetujui mendapat Berita Acara/TTE dan masuk ke Arsip Dokumen.</li>
        </ol>
        <div class="mt-5 text-right">
          <button @click="showGuidance = false" class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import type { DocumentItem } from '../types';
import {
  Calendar,
  Clock,
  BookOpen,
  Plus,
  Check,
  Eye,
  Send,
  Edit3,
  FileText,
  MessageSquare,
  FileEdit,
  CheckCircle2,
  Headphones,
  ChevronDown,
  HelpCircle,
  X
} from '@lucide/vue';

const store = useAppStore();
const router = useRouter();

const showGuidance = ref(false);
const showSupportModal = ref(false);
const docTableTab = ref('Semua');
const uploadRevisionDoc = ref<DocumentItem | null>(null);
const revisionFile = ref<File | null>(null);
const revisionFileUploaded = ref(false);
const revisionReadyToSubmitId = ref<string | null>(null);
const isReplacingRevisionFile = ref(false);
const isSubmittingRevision = ref(false);
const isSubmittingDocumentId = ref('');

const opdDocs = computed(() => {
  return store.documents.filter(d => d.opdId === store.currentUser?.opdId);
});

const drafCount = computed(() => opdDocs.value.filter(d => d.status === 'Draft').length);
const waitingCount = computed(() => opdDocs.value.filter(d => d.status === 'Menunggu Verifikasi').length);
const revisionCount = computed(() => opdDocs.value.filter(d => d.status === 'Perlu Revisi').length);
const approvedCount = computed(() => opdDocs.value.filter(d => d.status === 'Disetujui').length);
const revisionDoc = computed(() => opdDocs.value.find(d => d.status === 'Perlu Revisi'));

const isUploadReady = (doc: DocumentItem) =>
  doc.cara !== 'upload' || Boolean(doc.fileName && doc.filePath);

const submitDraft = async (doc: DocumentItem) => {
  if (doc.status !== 'Draft' || !isUploadReady(doc) || isSubmittingDocumentId.value) return;
  isSubmittingDocumentId.value = doc.id;
  try {
    await store.submitDocument(doc.id);
  } catch {
    // The store presents API validation failures to the user.
  } finally {
    isSubmittingDocumentId.value = '';
  }
};

const docStatusTabs = computed(() => [
  { label: 'Semua', count: opdDocs.value.length },
  { label: 'Draf', count: drafCount.value },
  { label: 'Review', count: waitingCount.value },
  { label: 'Perlu Revisi', count: revisionCount.value },
  { label: 'Disetujui', count: approvedCount.value }
]);

const filteredOpdDocs = computed(() => {
  if (docTableTab.value === 'Draf') return opdDocs.value.filter(d => d.status === 'Draft');
  if (docTableTab.value === 'Review') return opdDocs.value.filter(d => d.status === 'Menunggu Verifikasi');
  if (docTableTab.value === 'Perlu Revisi') return opdDocs.value.filter(d => d.status === 'Perlu Revisi');
  if (docTableTab.value === 'Disetujui') return opdDocs.value.filter(d => d.status === 'Disetujui');
  return opdDocs.value;
});

const getStatusPill = (status: string) => {
  switch (status) {
    case 'Draft': return 'bg-slate-100 text-slate-700';
    case 'Menunggu Verifikasi': return 'bg-amber-100 text-amber-700';
    case 'Perlu Revisi': return 'bg-red-100 text-red-700';
    case 'Disetujui': return 'bg-emerald-100 text-emerald-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const openRevisionUpload = (doc: DocumentItem) => {
  uploadRevisionDoc.value = doc;
  revisionFile.value = null;
  revisionFileUploaded.value = revisionReadyToSubmitId.value === doc.id;
};

const closeRevisionUpload = () => {
  uploadRevisionDoc.value = null;
  revisionFile.value = null;
  revisionFileUploaded.value = false;
};

const selectRevisionFile = (event: Event) => {
  const input = event.target as HTMLInputElement;
  revisionFile.value = input.files?.[0] || null;
};

const saveRevisionFile = async () => {
  if (!uploadRevisionDoc.value || !revisionFile.value) return;
  const documentId = uploadRevisionDoc.value.id;
  const file = revisionFile.value;
  isReplacingRevisionFile.value = true;
  try {
    uploadRevisionDoc.value = await store.replaceRevisionFile(documentId, file);
    revisionFile.value = null;
    revisionFileUploaded.value = true;
    revisionReadyToSubmitId.value = documentId;
  } catch (error) {
    console.error('Failed to upload revised document:', error);
  } finally {
    isReplacingRevisionFile.value = false;
  }
};

const resubmitRevision = async () => {
  if (!uploadRevisionDoc.value || !revisionFileUploaded.value) return;
  isSubmittingRevision.value = true;
  try {
    await store.submitDocument(uploadRevisionDoc.value.id);
    revisionReadyToSubmitId.value = null;
    closeRevisionUpload();
  } catch (error) {
    console.error('Failed to resubmit revised document:', error);
  } finally {
    isSubmittingRevision.value = false;
  }
};

const formatTime = (isoString: string) => {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return 'Hari ini';
  }
};

const openDoc = (doc: DocumentItem) => {
  if (doc.cara === 'template') {
    router.push(`/editor/${doc.id}`);
  } else if (doc.status === 'Perlu Revisi') {
    openRevisionUpload(doc);
  } else if (doc.filePath) {
    window.open(doc.filePath, '_blank', 'noopener,noreferrer');
  } else {
    store.addToast('Berkas dokumen tidak tersedia.', 'error');
  }
};
</script>
