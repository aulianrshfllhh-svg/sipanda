<template>
  <div class="space-y-3">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Selamat Datang di SIPANDA</h1>
        <p class="mt-1 text-xs text-slate-500"><span class="mr-1 text-slate-400">›</span>{{ store.currentUser?.opdName || 'Perangkat Daerah Kabupaten Cirebon' }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="openVerifierNotes"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
        >
          <MessageSquare class="h-3.5 w-3.5 text-amber-700" />
          <span>Catatan Verifikator</span>
          <span class="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] text-orange-800">{{ revisionCount }}</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4">
      <div class="flex min-h-[104px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Total Dokumen</span>
          <span class="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
            <FileText class="h-3.5 w-3.5 text-blue-600" />
          </span>
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-2xl font-extrabold tracking-tight text-slate-900">{{ opdDocs.length }}</span>
          <span class="text-[11px] text-slate-500">Dokumen</span>
        </div>
        <div class="h-1 overflow-hidden rounded-full bg-blue-100">
          <div class="h-full rounded-full bg-blue-600" :style="{ width: opdDocs.length ? '100%' : '0%' }"></div>
        </div>
      </div>

      <div class="flex min-h-[104px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Sedang Berjalan</span>
          <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">Draf</span>
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-2xl font-extrabold tracking-tight text-slate-900">{{ drafCount }}</span>
          <span class="text-[11px] text-slate-500">Dokumen</span>
        </div>
        <div class="h-1 overflow-hidden rounded-full bg-indigo-100">
          <div class="h-full rounded-full bg-slate-600" :style="{ width: progressWidth(drafCount) }"></div>
        </div>
      </div>

      <div class="flex min-h-[104px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Menunggu Verifikasi</span>
          <span class="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">Review</span>
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-2xl font-extrabold tracking-tight text-slate-900">{{ waitingCount }}</span>
          <span class="text-[11px] text-slate-500">Dokumen</span>
        </div>
        <div class="h-1 overflow-hidden rounded-full bg-blue-100">
          <div class="h-full rounded-full bg-blue-600" :style="{ width: progressWidth(waitingCount) }"></div>
        </div>
      </div>

      <div class="flex min-h-[104px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Disetujui Bapperida</span>
          <span class="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Sah</span>
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-2xl font-extrabold tracking-tight text-slate-900">{{ approvedCount }}</span>
          <span class="text-[11px] text-slate-500">Dokumen</span>
        </div>
        <div class="h-1 overflow-hidden rounded-full bg-blue-100">
          <div class="h-full rounded-full bg-blue-600" :style="{ width: progressWidth(approvedCount) }"></div>
        </div>
      </div>
    </div>

    <div class="!mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div class="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-sm font-bold text-slate-900">Dokumen Perencanaan Aktif &amp; Riwayat</h2>
        <div class="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 text-[10px] font-semibold text-slate-600">
              <button
                v-for="tab in docStatusTabs"
                :key="tab.label"
                @click="docTableTab = tab.label"
                class="shrink-0 rounded-md px-2.5 py-1.5 transition-colors"
                :class="docTableTab === tab.label ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'"
              >
                {{ tab.label }}
                <span class="ml-1 opacity-70">{{ tab.count }}</span>
              </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[680px] table-fixed text-left text-xs">
          <colgroup>
            <col class="w-[36%]" />
            <col class="w-[12%]" />
            <col class="w-[18%]" />
            <col class="w-[13%]" />
            <col class="w-[21%]" />
          </colgroup>
          <thead>
            <tr class="border-b border-slate-200 bg-blue-50/70 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
              <th class="px-3 py-3">Nama &amp; Nomor Dokumen</th>
              <th class="px-3 py-3">Jenis Dokumen</th>
              <th class="px-3 py-3">Pembaruan</th>
              <th class="px-3 py-3">Status Validasi</th>
              <th class="px-3 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="doc in filteredOpdDocs" :key="doc.id" class="odd:bg-blue-50/20 transition-colors hover:bg-blue-50/70">
              <td class="px-3 py-2.5">
                  <div class="flex items-center gap-3">
                    <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                      <FileText class="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <button @click="openDoc(doc)" class="text-left font-bold text-slate-900 transition-colors hover:text-blue-600">
                        {{ doc.judul }}
                      </button>
                      <div class="mt-0.5 text-[9px] text-slate-500">
                        No. {{ doc.nomorSurat || doc.kodeDoc }}<span v-if="doc.tahun"> · T.A. {{ doc.tahun }}</span>
                      </div>
                    </div>
                  </div>
              </td>
              <td class="px-3 py-2.5 text-slate-700">
                  <div>{{ doc.jenis }}</div>
              </td>
              <td class="px-3 py-2.5 text-slate-600">
                  {{ formatTime(doc.updatedAt) }}
                  <div class="mt-0.5 text-[9px] text-slate-400">Diperbarui</div>
              </td>
              <td class="px-3 py-2.5">
                  <div v-if="doc.status === 'Disetujui Bapperida'" class="space-y-1">
                    <span class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <span class="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                      Menunggu Verifikasi Final
                    </span>
                    <div class="flex items-center gap-1 text-[8px] text-slate-400 font-medium">
                      <span class="text-emerald-600 font-semibold">Verifikasi 1 ✓</span>
                      <span>›</span>
                      <span class="text-indigo-700 font-bold bg-indigo-100/80 px-1 rounded">Tahap Final</span>
                      <span>›</span>
                      <span>Final</span>
                    </div>
                  </div>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-bold"
                    :class="getStatusPill(doc.status)"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-current opacity-60"></span>
                    {{ doc.status }}
                  </span>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex items-center justify-end gap-1.5">
                  <span v-if="doc.status === 'Disetujui Bapperida'" class="text-[9px] font-semibold text-slate-400 italic">
                    Dalam Telaah Final
                  </span>
                  <button
                    v-else-if="doc.status === 'Final'"
                    @click="router.push('/arsip')"
                    class="inline-flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-1.5 text-[9px] font-bold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <FileText class="h-3 w-3" />
                    Lihat BA
                  </button>
                  <template v-else-if="doc.status === 'Draft'">
                    <label
                      v-if="doc.cara === 'upload' && !isUploadReady(doc)"
                      class="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
                      :class="{ 'pointer-events-none opacity-50': uploadingDocumentId === doc.id }"
                    >
                      <input type="file" accept=".pdf,.docx" class="hidden" @change="uploadDraftSource($event, doc)" />
                      <UploadCloud class="h-3 w-3" />
                      {{ uploadingDocumentId === doc.id ? 'Mengunggah...' : 'Unggah berkas' }}
                    </label>
                    <button
                      @click="openDoc(doc)"
                      :disabled="doc.cara === 'upload' && !isUploadReady(doc)"
                      :title="doc.cara === 'upload' && !isUploadReady(doc) ? 'Unggah berkas terlebih dahulu' : doc.cara === 'upload' ? 'Buka berkas dokumen' : 'Lanjutkan penyusunan dokumen'"
                      class="inline-flex items-center gap-1 rounded-md bg-blue-700 px-2 py-1.5 text-[9px] font-bold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <FileEdit class="h-3 w-3" />
                      {{ doc.cara === 'upload' ? 'Lihat Berkas' : 'Lanjutkan Draf' }}
                    </button>
                    <button
                      v-if="isUploadReady(doc)"
                      @click="submitDraft(doc)"
                      :disabled="isSubmittingDocumentId === doc.id"
                      title="Kirim dokumen ini ke Bapperida untuk diverifikasi"
                      class="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      {{ isSubmittingDocumentId === doc.id ? 'Mengajukan...' : 'Ajukan' }}
                    </button>
                  </template>
                  <button
                    v-else-if="doc.status === 'Perlu Revisi'"
                    @click="doc.cara === 'upload' ? openRevisionUpload(doc) : openDoc(doc)"
                    class="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[9px] font-bold text-amber-800 transition-colors hover:bg-amber-100"
                  >
                    <FileEdit class="h-3 w-3" />
                    {{ doc.cara === 'upload' ? 'Unggah Perbaikan' : 'Perbaiki Draf' }}
                  </button>
                  <span v-else class="text-[10px] text-slate-400">Menunggu verifikasi</span>
                </div>
              </td>
            </tr>
            <tr v-if="filteredOpdDocs.length === 0">
              <td colspan="5" class="px-3 py-8 text-center text-xs text-slate-500">Tidak ada dokumen pada status ini.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t border-slate-100 bg-blue-50/50 px-3 py-2 text-[9px] text-slate-500">
        <span>Menampilkan {{ filteredOpdDocs.length }} dari {{ opdDocs.length }} dokumen terdaftar</span>
        <span class="hidden sm:inline">Sistem Perencanaan Daerah Terpadu · Versi 3.4.1</span>
      </div>
    </div>

    <div v-if="showVerifierNotes" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" @click.self="showVerifierNotes = false">
      <section class="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" aria-labelledby="verifier-notes-title">
        <header class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="verifier-notes-title" class="text-base font-bold text-slate-900">Catatan Verifikator</h2>
            <p class="mt-0.5 text-xs text-slate-500">{{ activeRevisionNotes.length }} catatan perlu ditindaklanjuti</p>
          </div>
          <button @click="showVerifierNotes = false" aria-label="Tutup catatan verifikator" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X class="h-4 w-4" />
          </button>
        </header>
        <div class="max-h-[65vh] space-y-3 overflow-y-auto p-5">
          <article v-for="doc in activeRevisionNotes" :key="doc.id" class="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 class="text-sm font-bold text-slate-900">{{ doc.judul }}</h3>
                <p class="mt-1 text-[11px] text-slate-500">{{ doc.jenis }} · T.A. {{ doc.tahun }} · {{ formatTime(doc.updatedAt) }}</p>
              </div>
              <span class="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Perlu Revisi</span>
            </div>
            <p class="mt-3 whitespace-pre-line text-xs leading-relaxed text-slate-700">{{ doc.catatanRevisi || 'Tidak ada rincian catatan.' }}</p>
            <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/70 pt-3">
              <span class="text-[10px] text-slate-500">
                Verifikator: {{ doc.verifierName || 'Bapperida' }}<span v-if="doc.verifierJabatan"> · {{ doc.verifierJabatan }}</span>
              </span>
              <button @click="openDoc(doc); showVerifierNotes = false" class="rounded-lg bg-blue-700 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-blue-800">
                {{ doc.cara === 'upload' ? 'Unggah Perbaikan' : 'Buka Dokumen' }}
              </button>
            </div>
          </article>
          <div v-if="activeRevisionNotes.length === 0" class="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
            <MessageSquare class="mx-auto h-7 w-7 text-slate-300" />
            <p class="mt-2 text-sm font-semibold text-slate-700">Belum ada catatan revisi aktif</p>
            <p class="mt-1 text-xs text-slate-500">Catatan verifikator akan muncul di sini jika dokumen dikembalikan untuk revisi.</p>
          </div>
        </div>
      </section>
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

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import type { DocumentItem } from '../types';
import {
  FileText,
  MessageSquare,
  FileEdit,
  X,
  UploadCloud
} from '@lucide/vue';

const store = useAppStore();
const router = useRouter();

const showVerifierNotes = ref(false);
const docTableTab = ref('Semua');
const uploadRevisionDoc = ref<DocumentItem | null>(null);
const revisionFile = ref<File | null>(null);
const revisionFileUploaded = ref(false);
const revisionReadyToSubmitId = ref<string | null>(null);
const isReplacingRevisionFile = ref(false);
const isSubmittingRevision = ref(false);
const isSubmittingDocumentId = ref('');
const uploadingDocumentId = ref('');

const opdDocs = computed(() => {
  return store.documents.filter(d => d.opdId === store.currentUser?.opdId);
});

const drafCount = computed(() => opdDocs.value.filter(d => d.status === 'Draft').length);
const waitingCount = computed(() => opdDocs.value.filter(d => d.status === 'Menunggu Verifikasi').length);
const revisionCount = computed(() => opdDocs.value.filter(d => d.status === 'Perlu Revisi').length);
const approvedCount = computed(() => opdDocs.value.filter(d => d.status === 'Disetujui Bapperida').length);
const activeRevisionNotes = computed(() => opdDocs.value
  .filter(doc => doc.status === 'Perlu Revisi')
  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));

const progressWidth = (count: number) =>
  `${opdDocs.value.length ? Math.round((count / opdDocs.value.length) * 100) : 0}%`;

const isUploadReady = (doc: DocumentItem) =>
  doc.cara !== 'upload' || Boolean(doc.fileName && doc.filePath);

const openVerifierNotes = () => {
  showVerifierNotes.value = true;
};

const uploadDraftSource = async (event: Event, doc: DocumentItem) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || doc.status !== 'Draft' || doc.cara !== 'upload') return;
  uploadingDocumentId.value = doc.id;
  try {
    await store.replaceRevisionFile(doc.id, file);
  } catch (error) {
    console.error('Failed to upload draft document:', error);
  } finally {
    uploadingDocumentId.value = '';
  }
};

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
  { label: 'Disetujui Bapperida', count: approvedCount.value }
]);

const filteredOpdDocs = computed(() => {
  if (docTableTab.value === 'Draf') return opdDocs.value.filter(d => d.status === 'Draft');
  if (docTableTab.value === 'Review') return opdDocs.value.filter(d => d.status === 'Menunggu Verifikasi');
  if (docTableTab.value === 'Perlu Revisi') return opdDocs.value.filter(d => d.status === 'Perlu Revisi');
  if (docTableTab.value === 'Disetujui Bapperida') return opdDocs.value.filter(d => d.status === 'Disetujui Bapperida');
  return opdDocs.value;
});

const getStatusPill = (status: string) => {
  switch (status) {
    case 'Draft': return 'bg-slate-100 text-slate-700';
    case 'Menunggu Verifikasi': return 'bg-amber-100 text-amber-700';
    case 'Perlu Revisi': return 'bg-red-100 text-red-700';
    case 'Disetujui Bapperida': return 'bg-emerald-100 text-emerald-700';
    case 'Final': return 'bg-emerald-800 text-white';
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
