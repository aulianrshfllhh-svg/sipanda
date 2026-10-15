<template>
  <div class="archive-page space-y-6">
    <DocumentPageHeader
      :title="store.isOpd ? `Arsip Dokumen ${store.currentOpdName}` : 'Arsip Dokumen'"
      subtitle="Repositori dokumen perencanaan yang telah Final dan terkunci"
      badge="Arsip Resmi"
      :badge-icon="LockKeyhole"
      badge-tone="green"
    >
      <template #actions>
        <button
          type="button"
          @click="downloadBundle"
          :disabled="!filteredDocuments.length || filteredDocuments.length > bundleLimit || isDownloadingBundle"
          class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          :title="filteredDocuments.length > bundleLimit ? `Bundel dibatasi ${bundleLimit} dokumen per unduhan` : 'Unduh berkas Final sesuai filter aktif'"
        >
          <Package class="h-4 w-4 text-slate-500" />
          <span>{{ isDownloadingBundle ? 'Menyiapkan ZIP...' : 'Unduh Bundel Arsip (ZIP)' }}</span>
        </button>
      </template>
    </DocumentPageHeader>

    <div
      v-if="store.isSuperAdmin || store.isStaff"
      class="archive-source-control flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100/80 p-1.5 shadow-2xs"
      role="group"
      aria-label="Sumber arsip"
    >
      <button
        v-for="source in sourceOptions"
        :key="source.id"
        type="button"
        @click="selectedSource = source.id"
        class="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors"
        :class="selectedSource === source.id ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:bg-white/60'"
      >
        {{ source.label }}
        <span class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
          {{ sourceCount(source.id) }}
        </span>
      </button>
    </div>

    <DocumentTabs v-model="activeTab" :tabs="tabs" />

    <div v-if="activeTab === 'renja' || activeTab === 'rkpd'" class="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
      <button
        v-for="variant in documentVariants"
        :key="variant.id"
        type="button"
        @click="selectedVariant = variant.id"
        class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
        :class="selectedVariant === variant.id ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'"
      >
        {{ variant.label }}
      </button>
    </div>

    <DocumentFilterBar :columns="4">
      <label class="relative block min-w-0">
        <span class="sr-only">Cari arsip</span>
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          v-model="searchText"
          type="search"
          placeholder="Cari no. registrasi, judul, atau perangkat daerah..."
          class="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
        />
      </label>
      <label v-if="!store.isOpd" class="block min-w-0">
        <span class="sr-only">Perangkat daerah</span>
        <select v-model="selectedOpd" class="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white">
          <option value="all">Semua Perangkat Daerah</option>
          <optgroup v-for="group in opdGroups" :key="group.label" :label="group.label">
            <option v-for="opd in group.items" :key="opd.id" :value="opd.id">{{ opd.nama }}</option>
          </optgroup>
        </select>
      </label>
      <label class="block min-w-0">
        <span class="sr-only">Tahun anggaran</span>
        <select v-model="selectedYear" class="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white">
          <option value="all">Semua T.A.</option>
          <option v-for="year in years" :key="year" :value="year">T.A. {{ year }}</option>
        </select>
      </label>
      <div class="flex min-h-10 items-center justify-between gap-2 sm:col-span-2 xl:col-span-2 xl:justify-end">
        <div class="flex items-center gap-1.5">
          <button v-if="hasFilters" type="button" @click="resetFilters" class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <RotateCcw class="h-3.5 w-3.5" /> Reset
          </button>
          <button
            type="button"
            @click="loadArchives"
            :disabled="loading"
            class="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Muat ulang arsip"
            title="Muat ulang arsip"
          >
            <RotateCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
        <span class="whitespace-nowrap text-[11px] font-medium text-slate-500">{{ filteredDocuments.length }} berkas</span>
      </div>
    </DocumentFilterBar>

    <p v-if="filteredDocuments.length > bundleLimit" class="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
      Bundel saat ini berisi {{ filteredDocuments.length }} berkas. Batas unduhan ZIP adalah {{ bundleLimit }} dokumen; persempit filter untuk melanjutkan.
    </p>

    <div v-if="archiveError" role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
      <span class="inline-flex items-center gap-2"><AlertCircle class="h-4 w-4" /> Data gagal dimuat: {{ archiveError }}</span>
      <button type="button" @click="loadArchives" class="rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold hover:bg-rose-100">Coba Lagi</button>
    </div>

    <div v-else-if="loading" class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs" aria-label="Memuat arsip">
      <div class="mb-4 flex gap-3">
        <div class="h-8 w-36 animate-pulse rounded-lg bg-slate-100" />
        <div class="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div v-for="row in 5" :key="row" class="flex items-center gap-4 border-t border-slate-100 py-4">
        <div class="h-4 w-28 animate-pulse rounded bg-slate-100" />
        <div class="h-8 flex-1 animate-pulse rounded bg-slate-100" />
        <div class="h-5 w-20 animate-pulse rounded bg-slate-100" />
        <div class="h-7 w-32 animate-pulse rounded bg-slate-100" />
      </div>
    </div>

    <DocumentEmptyState
      v-else-if="!filteredDocuments.length"
      :title="emptyTitle"
      :description="emptyDescription"
      :icon="Archive"
    >
      <template #actions>
        <template v-if="allFinalDocuments.length">
          <button
            v-if="alternativeYear"
            type="button"
            @click="selectedYear = alternativeYear"
            class="font-semibold text-blue-600 hover:text-blue-800"
          >
            Ada {{ alternativeYearCount }} arsip pada T.A. {{ alternativeYear }}. Lihat T.A. {{ alternativeYear }}
          </button>
          <button v-if="hasFilters" type="button" @click="resetFilters" class="font-semibold text-slate-500 hover:text-slate-700">
            Bersihkan filter
          </button>
        </template>
        <router-link v-else-if="store.isOpd" to="/dokumen" class="font-semibold text-blue-600 hover:text-blue-800">Buka Dokumen Perencanaan</router-link>
        <router-link v-else-if="store.isSuperAdmin" to="/verifikasi-final" class="font-semibold text-blue-600 hover:text-blue-800">Buka Verifikasi Final</router-link>
        <router-link v-else to="/dokumen" class="font-semibold text-blue-600 hover:text-blue-800">Buka Dokumen Perencanaan</router-link>
      </template>
    </DocumentEmptyState>

    <DocumentTableFrame v-else>
      <div class="hidden overflow-x-auto xl:block">
        <table class="w-full table-fixed border-collapse text-left text-xs">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th class="w-[15%] px-3 py-3">No. Registrasi Arsip</th>
              <th class="w-[26%] px-3 py-3">Dokumen &amp; Perangkat Daerah</th>
              <th class="w-[10%] px-3 py-3">Jenis &amp; T.A.</th>
              <th class="w-[13%] px-3 py-3">Regulasi / Berita Acara (TTE)</th>
              <th class="w-[12%] px-3 py-3">Difinalkan</th>
              <th class="w-[9%] px-3 py-3">Status</th>
              <th class="w-[15%] px-3 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in paginatedDocuments" :key="item.id" class="transition-colors hover:bg-slate-50/70">
              <td class="px-3 py-3.5">
                <div class="flex items-center gap-1.5">
                  <span class="font-mono text-[11px] font-bold text-slate-700">{{ registration(item) }}</span>
                  <button type="button" @click="copyRegistration(item)" class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Salin nomor registrasi"><Copy class="h-3 w-3" /></button>
                </div>
              </td>
              <td class="px-3 py-3.5">
                <div class="flex min-w-0 items-start gap-2.5">
                  <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><FileText class="h-4 w-4" /></div>
                  <div class="min-w-0">
                    <p class="truncate text-xs font-bold leading-snug text-slate-900" :title="item.judul">{{ item.judul }}</p>
                    <p class="mt-0.5 truncate text-[11px] font-semibold text-slate-600">{{ item.opdName }}</p>
                    <p class="mt-1 text-[10px] text-slate-400">Versi {{ version(item) }} · {{ templateLabel(item) }}</p>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3.5">
                <span class="inline-block rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{{ item.jenis }}</span>
                <p class="mt-1 font-mono text-[10px] text-slate-400">T.A. {{ item.tahun }}</p>
              </td>
              <td class="px-3 py-3.5">
                <span v-if="regulation(item)" class="font-mono text-[10px] text-slate-600">{{ regulation(item) }}</span>
                <span v-else class="text-slate-400">-</span>
              </td>
              <td class="px-3 py-3.5">
                <p class="text-[11px] font-medium text-slate-700">{{ formatDate(item.finalizedAt) }}</p>
                <p class="mt-0.5 truncate text-[10px] text-slate-400">{{ item.finalizedByName || 'Super Admin' }}</p>
              </td>
              <td class="px-3 py-3.5">
                <DocumentStatusBadge status="Final" />
                <p class="mt-1 text-[10px] text-emerald-800/70">Terkunci</p>
              </td>
              <td class="px-3 py-3.5 text-right">
                <div class="relative inline-flex items-center justify-end gap-1">
                  <button type="button" @click="openPreview(item)" class="rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700">Buka</button>
                  <button type="button" @click="downloadDocument(item, 'pdf')" class="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50" title="Unduh PDF"><Download class="h-3.5 w-3.5" /></button>
                  <button type="button" @click="downloadDocument(item, 'docx')" class="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50" title="Unduh DOCX"><FileDown class="h-3.5 w-3.5" /></button>
                  <button type="button" @click.stop="toggleMenu(item.id)" class="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50" aria-label="Aksi lainnya"><MoreVertical class="h-3.5 w-3.5" /></button>
                  <div v-if="openMenuId === item.id" class="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl">
                    <button type="button" @click="openHistory(item)" class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><History class="h-3.5 w-3.5" /> Lihat Riwayat Verifikasi</button>
                    <button type="button" @click="goToPlanning(item)" class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><ExternalLink class="h-3.5 w-3.5" /> Lihat di Dokumen Perencanaan</button>
                    <button type="button" @click="copyRegistration(item)" class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><Copy class="h-3.5 w-3.5" /> Salin Nomor Registrasi</button>
                    <button v-if="store.isSuperAdmin" type="button" @click="requestUnlock(item)" class="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><LockKeyhole class="h-3.5 w-3.5" /> Buka Kunci</button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="divide-y divide-slate-100 xl:hidden">
        <article v-for="item in paginatedDocuments" :key="item.id" class="space-y-3 p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="break-all font-mono text-[11px] font-bold text-slate-700">{{ registration(item) }}</p>
              <h2 class="mt-1 text-sm font-bold text-slate-900">{{ item.judul }}</h2>
              <p class="mt-0.5 text-xs text-slate-500">{{ item.opdName }}</p>
            </div>
            <DocumentStatusBadge status="Final" class="shrink-0" />
          </div>
          <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span class="rounded-lg bg-blue-50 px-2 py-1 font-semibold text-blue-700">{{ item.jenis }}</span>
            <span>T.A. {{ item.tahun }}</span>
            <span>·</span>
            <span>{{ formatDate(item.finalizedAt) }}</span>
            <span v-if="regulation(item)">· {{ regulation(item) }}</span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" @click="openPreview(item)" class="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Buka</button>
            <button type="button" @click="downloadDocument(item, 'pdf')" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">PDF</button>
            <button type="button" @click="downloadDocument(item, 'docx')" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">DOCX</button>
            <div class="relative ml-auto">
              <button type="button" @click="toggleMenu(item.id)" class="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Aksi lainnya"><MoreVertical class="h-4 w-4" /></button>
              <div v-if="openMenuId === item.id" class="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl">
                <button type="button" @click="openHistory(item)" class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><History class="h-3.5 w-3.5" /> Lihat Riwayat Verifikasi</button>
                <button type="button" @click="goToPlanning(item)" class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><ExternalLink class="h-3.5 w-3.5" /> Lihat di Dokumen Perencanaan</button>
                <button type="button" @click="copyRegistration(item)" class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><Copy class="h-3.5 w-3.5" /> Salin Nomor Registrasi</button>
                <button v-if="store.isSuperAdmin" type="button" @click="requestUnlock(item)" class="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><LockKeyhole class="h-3.5 w-3.5" /> Buka Kunci</button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <DocumentPagination
        v-model:page="currentPage"
        :total-pages="totalPages"
        :visible-count="paginatedDocuments.length"
        :total-count="filteredDocuments.length"
      />
    </DocumentTableFrame>

    <div v-if="previewItem" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
      <section class="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header class="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <div class="min-w-0">
            <h2 class="truncate text-sm font-bold text-slate-900">{{ previewItem.judul }}</h2>
            <p class="mt-0.5 text-[11px] text-slate-500">{{ registration(previewItem) }} · Final dan terkunci</p>
          </div>
          <button type="button" @click="closePreview" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup preview"><X class="h-4 w-4" /></button>
        </header>
        <iframe v-if="previewUrl" :src="previewUrl" title="Pratinjau dokumen final" class="min-h-0 flex-1 bg-slate-100" />
        <div v-else class="grid flex-1 place-items-center text-xs text-slate-500">Menyiapkan pratinjau dokumen...</div>
      </section>
    </div>

    <div v-if="historyItem" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <div><h2 class="text-sm font-bold text-slate-900">Riwayat Verifikasi</h2><p class="mt-1 text-xs text-slate-500">{{ historyItem.judul }}</p></div>
          <button type="button" @click="historyItem = null" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X class="h-4 w-4" /></button>
        </div>
        <p v-if="historyError" role="alert" class="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{{ historyError }}</p>
        <div v-else-if="historyLoading" class="mt-4 space-y-2"><div v-for="row in 3" :key="row" class="h-10 animate-pulse rounded-lg bg-slate-100" /></div>
        <ol v-else class="mt-4 space-y-3">
          <li v-for="log in historyLogs" :key="log.id" class="border-l-2 border-emerald-200 pl-3">
            <p class="text-xs font-semibold text-slate-800">{{ log.dari || 'Mulai' }} → {{ log.ke }}</p>
            <p class="mt-0.5 text-[11px] text-slate-500">{{ formatDate(log.waktu) }}<span v-if="log.olehNama"> · {{ log.olehNama }}</span><span v-if="log.alasan"> · {{ log.alasan }}</span></p>
          </li>
        </ol>
        <p v-if="!historyLoading && !historyError && !historyLogs.length" class="mt-4 text-xs text-slate-500">Riwayat verifikasi tidak tersedia.</p>
      </section>
    </div>

    <div v-if="unlockItem" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <form @submit.prevent="unlockDocument" class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 class="text-sm font-bold text-slate-900">Buka Kunci Arsip</h2>
        <p class="mt-1 text-xs leading-relaxed text-slate-500">Dokumen akan kembali ke status Disetujui Bapperida dan dihapus dari Arsip. Tindakan ini dicatat di riwayat.</p>
        <p class="mt-3 text-xs font-semibold text-slate-700">{{ unlockItem.judul }}</p>
        <label class="mt-4 block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700">Alasan wajib</span>
          <textarea v-model="unlockReason" required rows="3" maxlength="1000" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-rose-400" placeholder="Tuliskan alasan revisi resmi..." />
        </label>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" @click="cancelUnlock" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Batal</button>
          <button type="submit" :disabled="!unlockReason.trim() || isUnlocking" class="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{{ isUnlocking ? 'Memproses...' : 'Buka Kunci' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAppStore } from '../stores/appStore';
import { apiFetch } from '../lib/api';
import DocumentPageHeader from '../components/documents/DocumentPageHeader.vue';
import DocumentTabs from '../components/documents/DocumentTabs.vue';
import DocumentFilterBar from '../components/documents/DocumentFilterBar.vue';
import DocumentEmptyState from '../components/documents/DocumentEmptyState.vue';
import DocumentPagination from '../components/documents/DocumentPagination.vue';
import DocumentTableFrame from '../components/documents/DocumentTableFrame.vue';
import DocumentStatusBadge from '../components/documents/DocumentStatusBadge.vue';
import {
  AlertCircle, Archive, Copy, Download, FileDown, FileText, LockKeyhole,
  MoreVertical, Package, RotateCcw, RotateCw, Search, X, BookOpen, Folder,
  FileSpreadsheet, Award, FileCheck, History, ExternalLink
} from '@lucide/vue';

type ArchiveTab = 'renja' | 'renstra' | 'rkpd' | 'rpjmd' | 'lampiran';
type ArchiveSource = 'all' | 'internal' | 'opd';
interface ArchiveDocument {
  id: string;
  parentId?: string | null;
  isLampiranOtomatis?: boolean;
  judul: string;
  jenis: string;
  tahun: string;
  status: string;
  opdId: string;
  opdName: string;
  opdSingkatan?: string | null;
  nomerRegistrasiArsip?: string | null;
  kodeDoc: string;
  regulation?: Record<string, string> | null;
  tteNumber?: string | null;
  nomorSurat?: string | null;
  finalizedAt?: string | null;
  finalizedByName?: string | null;
  templateSnapshot?: { versi?: string | number } | null;
  versions?: Array<{ id: string }>;
}
interface StatusLog {
  id: string;
  dari?: string | null;
  ke: string;
  alasan?: string | null;
  waktu: string;
  olehNama?: string | null;
}
interface OpdRecord { id: string; nama: string; kategori?: string }

const store = useAppStore();
const archiveDocuments = ref<ArchiveDocument[]>([]);
const loading = ref(true);
const archiveError = ref('');
const selectedSource = ref<ArchiveSource>('all');
const activeTab = ref<ArchiveTab>('renja');
const selectedVariant = ref<'all' | 'Murni' | 'Perubahan'>('all');
const selectedYear = ref(String(new Date().getFullYear()));
const selectedOpd = ref('all');
const searchText = ref('');
const currentPage = ref(1);
const pageSize = 10;
const bundleLimit = 25;
const isDownloadingBundle = ref(false);
const openMenuId = ref('');
const previewItem = ref<ArchiveDocument | null>(null);
const previewUrl = ref('');
const historyItem = ref<ArchiveDocument | null>(null);
const historyLogs = ref<StatusLog[]>([]);
const historyLoading = ref(false);
const historyError = ref('');
const unlockItem = ref<ArchiveDocument | null>(null);
const unlockReason = ref('');
const isUnlocking = ref(false);

const sourceOptions: Array<{ id: ArchiveSource; label: string }> = [
  { id: 'all', label: 'Semua' },
  { id: 'internal', label: 'Internal Bapperida' },
  { id: 'opd', label: 'Perangkat Daerah' }
];
const documentVariants = [
  { id: 'all' as const, label: 'Semua' },
  { id: 'Murni' as const, label: 'Murni' },
  { id: 'Perubahan' as const, label: 'Perubahan' }
];
const opdGroups = computed(() => {
  const groups = new Map<string, OpdRecord[]>();
  for (const opd of store.opds as OpdRecord[]) {
    const category = opd.kategori || 'Perangkat Daerah';
    groups.set(category, [...(groups.get(category) || []), opd]);
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
});
const years = computed(() => [...new Set([
  String(new Date().getFullYear()),
  ...archiveDocuments.value.map(doc => doc.tahun)
])].sort((a, b) => Number(b) - Number(a)));

const matchesSearch = (doc: ArchiveDocument) => {
  const query = searchText.value.trim().toLocaleLowerCase();
  if (!query) return true;
  return [
    registration(doc), doc.judul, doc.opdName, doc.jenis, regulation(doc)
  ].some(value => value.toLocaleLowerCase().includes(query));
};
const matchesYear = (doc: ArchiveDocument, year = selectedYear.value) => year === 'all' || doc.tahun === year;
const matchesOpd = (doc: ArchiveDocument) => selectedOpd.value === 'all' || doc.opdId === selectedOpd.value;
const matchesSource = (doc: ArchiveDocument, source = selectedSource.value) =>
  source === 'all' || (source === 'internal' ? doc.opdId === 'bapperida' : doc.opdId !== 'bapperida');
const matchesTab = (doc: ArchiveDocument, tab = activeTab.value) => {
  if (tab === 'lampiran') return doc.isLampiranOtomatis === true;
  if (doc.isLampiranOtomatis) return false;
  if (tab === 'renja') return doc.jenis.includes('Renja');
  if (tab === 'renstra') return doc.jenis.includes('Renstra');
  if (tab === 'rkpd') return doc.jenis.includes('RKPD');
  return doc.jenis === 'RPJMD';
};
const matchesVariant = (doc: ArchiveDocument) =>
  selectedVariant.value === 'all' || doc.jenis.includes(selectedVariant.value);
const baseDocuments = computed(() => archiveDocuments.value.filter(doc =>
  doc.status === 'Final' &&
  matchesYear(doc) &&
  matchesOpd(doc) &&
  matchesSearch(doc)
));
const filteredDocuments = computed(() => baseDocuments.value.filter(doc =>
  matchesSource(doc) && matchesTab(doc) && matchesVariant(doc)
));
const tabs = computed(() => {
  const available: Array<{ id: ArchiveTab; label: string; icon: typeof BookOpen; count: number }> = [
    { id: 'renja', label: 'Renja', icon: BookOpen, count: 0 },
    { id: 'renstra', label: 'Renstra', icon: Folder, count: 0 }
  ];
  if (!store.isOpd) {
    available.push({ id: 'rkpd', label: 'RKPD', icon: FileSpreadsheet, count: 0 });
    available.push({ id: 'rpjmd', label: 'RPJMD', icon: Award, count: 0 });
  }
  available.push({ id: 'lampiran', label: 'Format Lampiran Perbup/Kepbup', icon: FileCheck, count: 0 });
  return available.map(tab => ({
    ...tab,
    count: baseDocuments.value.filter(doc =>
      matchesSource(doc) &&
      matchesTab(doc, tab.id) &&
      (tab.id !== activeTab.value || matchesVariant(doc))
    ).length
  }));
});
const sourceCount = (source: ArchiveSource) => archiveDocuments.value.filter(doc =>
  doc.status === 'Final' &&
  matchesYear(doc) &&
  matchesOpd(doc) &&
  matchesSearch(doc) &&
  (source === 'all' || matchesSource(doc, source)) &&
  matchesTab(doc) &&
  matchesVariant(doc)
).length;
const allFinalDocuments = computed(() => archiveDocuments.value.filter(doc => doc.status === 'Final'));
const hasFilters = computed(() => selectedYear.value !== 'all' || selectedOpd.value !== 'all' || searchText.value.trim().length > 0 || selectedSource.value !== 'all' || selectedVariant.value !== 'all');
const emptyTitle = computed(() => allFinalDocuments.value.length
  ? `Belum ada arsip${selectedYear.value === 'all' ? '' : ` untuk T.A. ${selectedYear.value}`}`
  : 'Belum ada dokumen Final');
const emptyDescription = computed(() => allFinalDocuments.value.length
  ? 'Tidak ada dokumen Final yang cocok dengan filter saat ini.'
  : 'Dokumen akan muncul di sini setelah melewati Verifikasi Final. Arsip hanya memuat dokumen terkunci.');
const alternativeYear = computed(() => {
  const matches = archiveDocuments.value.filter(doc =>
    doc.status === 'Final' &&
    matchesOpd(doc) &&
    matchesSearch(doc) &&
    matchesSource(doc) &&
    matchesTab(doc) &&
    matchesVariant(doc) &&
    doc.tahun !== selectedYear.value
  );
  return [...new Set(matches.map(doc => doc.tahun))]
    .sort((a, b) => Math.abs(Number(a) - Number(selectedYear.value)) - Math.abs(Number(b) - Number(selectedYear.value)))[0] || '';
});
const alternativeYearCount = computed(() => archiveDocuments.value.filter(doc =>
  doc.status === 'Final' &&
  doc.tahun === alternativeYear.value &&
  matchesOpd(doc) &&
  matchesSearch(doc) &&
  matchesSource(doc) &&
  matchesTab(doc) &&
  matchesVariant(doc)
).length);
const totalPages = computed(() => Math.max(1, Math.ceil(filteredDocuments.value.length / pageSize)));
const paginatedDocuments = computed(() => filteredDocuments.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize));

function registration(doc: ArchiveDocument) {
  return doc.nomerRegistrasiArsip || `ARS-${doc.tahun}-${doc.kodeDoc.split('-').pop() || 'ARSIP'}`;
}
function regulation(doc: ArchiveDocument) {
  return doc.regulation?.nomorPeraturan || doc.regulation?.nomorKepbup || doc.regulation?.nomorBerita ||
    doc.tteNumber || doc.nomorSurat || '';
}
function version(doc: ArchiveDocument) {
  return Math.max(1, doc.versions?.length || 1);
}
function templateLabel(doc: ArchiveDocument) {
  const versionLabel = doc.templateSnapshot?.versi;
  return versionLabel ? `Template v${versionLabel}` : 'Template Permendagri 86';
}
function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
function resetFilters() {
  selectedYear.value = 'all';
  selectedOpd.value = 'all';
  selectedSource.value = 'all';
  selectedVariant.value = 'all';
  searchText.value = '';
}
function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? '' : id;
}
function setDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
async function loadArchives() {
  loading.value = true;
  archiveError.value = '';
  try {
    const response = await apiFetch('/api/archives');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal memuat Arsip Dokumen');
    if (!Array.isArray(data)) throw new Error('Format data Arsip Dokumen tidak valid');
    archiveDocuments.value = data.filter((doc: ArchiveDocument) => doc.status === 'Final');
    if (!store.opds.length) await store.fetchOpds();
  } catch (error) {
    archiveError.value = error instanceof Error ? error.message : 'Gagal memuat Arsip Dokumen';
  } finally {
    loading.value = false;
  }
}
async function downloadBundle() {
  if (filteredDocuments.value.length > bundleLimit) {
    store.addToast(`Bundel dibatasi ${bundleLimit} dokumen per unduhan. Persempit filter terlebih dahulu.`, 'error');
    return;
  }
  isDownloadingBundle.value = true;
  try {
    const response = await apiFetch('/api/archives/bundle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: filteredDocuments.value.map(doc => doc.id) })
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Gagal menyiapkan ZIP');
    }
    setDownload(await response.blob(), `Arsip-Final-${selectedYear.value}.zip`);
  } catch (error) {
    store.addToast(error instanceof Error ? error.message : 'Gagal menyiapkan bundel arsip', 'error');
  } finally {
    isDownloadingBundle.value = false;
  }
}
async function downloadDocument(item: ArchiveDocument, format: 'pdf' | 'docx') {
  try {
    const response = await apiFetch(`/api/archives/${encodeURIComponent(item.id)}/export/${format}`);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `Gagal mengunduh ${format.toUpperCase()}`);
    }
    setDownload(await response.blob(), `${registration(item)}.${format}`);
  } catch (error) {
    store.addToast(error instanceof Error ? error.message : `Gagal mengunduh ${format.toUpperCase()}`, 'error');
  }
}
async function openPreview(item: ArchiveDocument) {
  previewItem.value = item;
  previewUrl.value = '';
  try {
    const response = await apiFetch(`/api/archives/${encodeURIComponent(item.id)}/preview`);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Gagal memuat pratinjau final');
    }
    previewUrl.value = URL.createObjectURL(new Blob([await response.text()], { type: 'text/html' }));
  } catch (error) {
    closePreview();
    store.addToast(error instanceof Error ? error.message : 'Gagal memuat pratinjau', 'error');
  }
}
function closePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
  previewItem.value = null;
}
async function openHistory(item: ArchiveDocument) {
  openMenuId.value = '';
  historyItem.value = item;
  historyLoading.value = true;
  historyError.value = '';
  historyLogs.value = [];
  try {
    const response = await apiFetch(`/api/archives/${encodeURIComponent(item.id)}/history`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal memuat riwayat');
    historyLogs.value = Array.isArray(data) ? data : [];
  } catch (error) {
    historyError.value = error instanceof Error ? error.message : 'Gagal memuat riwayat';
  } finally {
    historyLoading.value = false;
  }
}
async function copyRegistration(item: ArchiveDocument) {
  try {
    await navigator.clipboard.writeText(registration(item));
    store.addToast('Nomor registrasi disalin', 'success');
  } catch (error) {
    store.addToast(error instanceof Error ? 'Tidak dapat menyalin nomor registrasi' : 'Tidak dapat menyalin nomor registrasi', 'error');
  }
  openMenuId.value = '';
}
function goToPlanning(item: ArchiveDocument) {
  openMenuId.value = '';
  window.location.assign(`/dokumen?tab=${item.jenis.includes('Renstra') ? 'renstra' : item.jenis.includes('RKPD') ? 'rkpd' : item.jenis === 'RPJMD' ? 'rpjmd' : 'renja'}`);
}
function requestUnlock(item: ArchiveDocument) {
  openMenuId.value = '';
  unlockItem.value = item;
  unlockReason.value = '';
}
function cancelUnlock() {
  unlockItem.value = null;
  unlockReason.value = '';
}
async function unlockDocument() {
  if (!unlockItem.value || !unlockReason.value.trim()) return;
  isUnlocking.value = true;
  try {
    const response = await apiFetch(`/api/documents/${encodeURIComponent(unlockItem.value.id)}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alasan: unlockReason.value.trim() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Buka Kunci gagal');
    store.addToast('Dokumen kembali ke status Disetujui Bapperida', 'success');
    cancelUnlock();
    await loadArchives();
  } catch (error) {
    store.addToast(error instanceof Error ? error.message : 'Buka Kunci gagal', 'error');
  } finally {
    isUnlocking.value = false;
  }
}

watch([activeTab, selectedSource, selectedVariant, selectedYear, selectedOpd, searchText], () => {
  currentPage.value = 1;
  openMenuId.value = '';
});
watch(totalPages, pages => { currentPage.value = Math.min(currentPage.value, pages); });
watch(activeTab, tab => { if (tab !== 'renja' && tab !== 'rkpd') selectedVariant.value = 'all'; });
onMounted(loadArchives);
</script>
