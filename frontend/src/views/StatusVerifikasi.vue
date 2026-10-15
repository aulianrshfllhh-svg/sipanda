<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <router-link
          v-if="selectedDocId"
          to="/verifikasi"
          class="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
          title="Kembali ke Daftar Antrean"
        >
          <ArrowLeft class="w-4 h-4" />
        </router-link>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {{ selectedDocId ? "Tinjauan Verifikasi 1" : "Antrean Verifikasi 1 — Desk Bapperida" }}
            </h1>
            <span
              v-if="!selectedDocId"
              class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700"
            >T.A. {{ store.selectedTahun }}</span>
          </div>
          <p class="mt-1 text-xs text-slate-500">
            {{ selectedDocId
              ? "Periksa naskah dokumen dan putuskan apakah dokumen disetujui atau perlu revisi."
              : "Antrean hanya menampilkan dokumen yang diajukan dan menunggu verifikasi. Lampiran Renja ikut dikirim otomatis bersama dokumen induk." }}
          </p>
        </div>
      </div>
      <div v-if="!selectedDocId" class="flex flex-wrap items-center gap-2">
        <span class="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs font-bold text-amber-700">
          {{ filteredQueueItems.length }} dokumen menunggu
        </span>
      </div>
    </div>

    <!-- TAMPILAN 1: DAFTAR ANTREAN -->
    <div v-if="!selectedDocId" class="space-y-4">
      <!-- Filter Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div class="flex flex-wrap items-center gap-2.5">
          <div class="relative w-full sm:w-56">
            <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari OPD atau judul..."
              class="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
          </div>
          <select
            v-model="filterJenis"
            class="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium outline-none focus:border-blue-400"
          >
            <option value="all">Semua Jenis</option>
            <option value="Renja Murni">Renja Murni</option>
            <option value="Renja Perubahan">Renja Perubahan</option>
            <option value="Renstra Murni">Renstra Murni</option>
            <option value="Renstra Perubahan">Renstra Perubahan</option>
            <option value="RKPD Murni">RKPD Murni</option>
            <option value="RKPD Perubahan">RKPD Perubahan</option>
          </select>
        </div>
        <button
          @click="loadSummary"
          :disabled="loading"
          class="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          title="Muat Ulang Antrean"
        >
          <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
        </button>
      </div>

      <div v-if="listError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ listError }}
        <button @click="loadSummary" class="ml-2 font-semibold underline">Coba lagi</button>
      </div>

      <div v-if="loading" class="p-12 text-center bg-white rounded-2xl border border-slate-200 text-sm text-slate-500">
        Memuat antrean Verifikasi 1...
      </div>
      <div v-else-if="!filteredQueueItems.length" class="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
        <FolderCheck class="w-10 h-10 mx-auto text-slate-300 mb-2" />
        <h3 class="font-bold text-slate-700 text-sm">Belum ada dokumen yang menunggu verifikasi.</h3>
        <p class="text-xs text-slate-400 mt-1">Dokumen yang diajukan OPD akan otomatis masuk ke antrean ini.</p>
      </div>

      <!-- Tabel Antrean -->
      <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <th class="py-3 px-4">Dokumen &amp; Perangkat Daerah</th>
                <th class="py-3 px-4">T.A. &amp; Jenis</th>
                <th class="py-3 px-4">Verifikator Bertugas</th>
                <th class="py-3 px-4">Lama Menunggu</th>
                <th class="py-3 px-4">Metode</th>
                <th class="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="item in filteredQueueItems"
                :key="item.id"
                class="hover:bg-slate-50/70 transition-colors"
                :class="{ 'bg-amber-50/30': item.isOverdue }"
              >
                <td class="py-3.5 px-4">
                  <div class="font-bold text-slate-900 leading-snug">{{ item.judul }}</div>
                  <div class="text-[11px] text-slate-500 mt-0.5">{{ item.opdName }}</div>
                  <div class="font-mono text-[9px] text-slate-400 mt-0.5">Kode: {{ item.kodeDoc }}</div>
                </td>
                <td class="py-3.5 px-4">
                  <span class="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                    {{ item.jenis }}
                  </span>
                  <div class="text-[10px] text-slate-400 mt-1 font-mono">T.A. {{ item.tahun }}</div>
                </td>
                <td class="py-3.5 px-4">
                  <div class="font-semibold text-slate-800">{{ item.verifikatorBertugas || "Belum Ditugaskan" }}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">Diajukan {{ formatTimestamp(item.tanggalDiajukan) }}</div>
                </td>
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      :class="item.isOverdue ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-600'"
                    >{{ item.lamaMenungguText }}</span>
                    <span v-if="item.isOverdue" class="text-[9px] font-bold text-red-600 uppercase">
                      ⚠️ Lewat Batas
                    </span>
                  </div>
                </td>
                <td class="py-3.5 px-4">
                  <span class="text-[11px] text-slate-600">{{ item.cara === "template" ? "Template Baku Permendagri" : "Upload Mandiri" }}</span>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <button
                    @click="selectDocument(item.id)"
                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-2xs"
                  >
                    <Eye class="w-3.5 h-3.5" />
                    <span>Telaah Naskah</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAMPILAN 2: HALAMAN TINJAUAN DETAIL VERIFIKASI 1 -->
    <div v-else class="space-y-6">
      <div v-if="detailLoading" class="p-12 text-center bg-white rounded-2xl border border-slate-200 text-sm text-slate-500">
        Memuat detail telaah dokumen dan lini masa...
      </div>
      <div v-else-if="detailError" class="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
        {{ detailError }} <button @click="loadDetail(selectedDocId)" class="underline font-bold ml-2">Coba lagi</button>
      </div>
      <div v-else-if="docDetail" class="space-y-6">
        <!-- Top Banner -->
        <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-700 font-mono">{{ docDetail.document.kodeDoc }}</span>
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">T.A. {{ docDetail.document.tahun }}</span>
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {{ docDetail.document.status }} (Tahap Verifikasi 1)
              </span>
            </div>
            <h2 class="text-lg font-bold text-slate-900 leading-snug">{{ docDetail.document.judul }}</h2>
            <p class="text-xs text-slate-500">{{ docDetail.document.opdName }} · Diajukan untuk Verifikasi Tahap 1</p>
          </div>
          <div
            v-if="docDetail.document.status === 'Menunggu Verifikasi' && (store.isSuperAdmin || canVerifyThisDoc)"
            class="flex flex-wrap items-center gap-2"
          >
            <button
              @click="openReturnOpdModal"
              class="px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <AlertCircle class="w-3.5 h-3.5" />
              Perlu Revisi (Kembalikan ke OPD)
            </button>
            <button
              @click="openApproveModal"
              class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs inline-flex items-center gap-1.5"
            >
              <CheckCircle class="w-4 h-4" />
              Setujui Verifikasi 1
            </button>
          </div>
          <div v-else-if="docDetail.document.status === 'Disetujui Bapperida'" class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-emerald-600" />
            Disetujui Verifikasi 1 — Menunggu Verifikasi Final
          </div>
          <div v-else-if="docDetail.document.status === 'Final'" class="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 text-xs font-bold border border-purple-200 flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-purple-600" />
            Dokumen Sudah Terkunci Permanen (Final)
          </div>
          <div v-else-if="!store.isSuperAdmin && !canVerifyThisDoc" class="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 text-xs border border-slate-200 flex items-center gap-2">
            <Info class="w-4 h-4 text-slate-400" />
            Dokumen ini bukan penugasan Anda (Baca Saja)
          </div>
        </div>

        <!-- 2 Kolom Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Kolom Kiri: Pratinjau Dokumen -->
          <div class="lg:col-span-7 space-y-4">
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <FileText class="w-4 h-4 text-amber-600" />
                  <h3 class="font-bold text-slate-900 text-sm">Pratinjau Isi Naskah Perencanaan</h3>
                </div>
                <router-link
                  :to="`/editor/${docDetail.document.id}`"
                  target="_blank"
                  class="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Buka di Editor Lengkap
                  <ExternalLink class="w-3 h-3" />
                </router-link>
              </div>
              <div class="space-y-3 max-h-[650px] overflow-y-auto pr-1">
                <div
                  v-for="section in docDetail.document.sections"
                  :key="section.id"
                  class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5"
                >
                  <h4 class="font-bold text-slate-800 text-xs">{{ section.babTitle }}</h4>
                  <div
                    v-for="sub in section.subsections"
                    :key="sub.id"
                    class="pl-3 border-l-2 border-amber-200 text-xs text-slate-600 space-y-1"
                  >
                    <div class="font-semibold text-slate-700 text-[11px]">{{ sub.code }} {{ sub.title }}</div>
                    <div
                      class="text-slate-600 text-[11px] leading-relaxed line-clamp-4 prose-sm"
                      v-html="sub.content || '<p class=&quot;italic text-slate-400&quot;>Konten belum terisi.</p>'"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Kolom Kanan: Cek Format + Lini Masa -->
          <div class="lg:col-span-5 space-y-5">
            <!-- Cek Format -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <CheckSquare class="w-4 h-4 text-emerald-600" />
                  <h3 class="font-bold text-slate-900 text-sm">Hasil Cek Format Dokumen</h3>
                </div>
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  :class="docDetail.formatReport?.violations?.length ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'"
                >
                  {{ docDetail.formatReport?.violations?.length ? `${docDetail.formatReport.violations.length} Catatan` : "Sesuai Standar" }}
                </span>
              </div>
              <div v-if="docDetail.formatReport?.violations?.length" class="space-y-2">
                <div
                  v-for="(v, idx) in docDetail.formatReport.violations"
                  :key="idx"
                  class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2"
                >
                  <span class="text-amber-600 font-bold">•</span>
                  <span class="text-[11px] leading-relaxed">{{ typeof v === "string" ? v : (v.message || v.rule) }}</span>
                </div>
              </div>
              <p v-else class="text-xs text-emerald-700 font-medium py-1">
                ✓ Seluruh bab wajib Permendagri 86/2017 terverifikasi lengkap dan memenuhi standar format.
              </p>
            </div>

            <!-- Lini Masa -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Clock class="w-4 h-4 text-amber-600" />
                <h3 class="font-bold text-slate-900 text-sm">Lini Masa Verifikasi</h3>
              </div>
              <div class="relative pl-5 border-l-2 border-slate-200 space-y-6 my-2">
                <div v-for="(event, idx) in docDetail.timeline" :key="idx" class="relative group">
                  <div
                    class="absolute -left-[27px] top-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs"
                    :class="getTimelineDotColor(event.type)"
                  ></div>
                  <div>
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-bold text-xs text-slate-900">{{ event.title }}</span>
                      <span class="text-[10px] text-slate-400 font-mono">{{ formatTimestamp(event.timestamp) }}</span>
                    </div>
                    <div class="text-[11px] font-semibold text-slate-600 mt-0.5">
                      {{ event.actor }} <span class="text-slate-400 font-normal">({{ event.role }})</span>
                    </div>
                    <p class="text-[11px] text-slate-500 mt-1 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {{ event.detail }}
                    </p>
                    <div v-if="event.tteNumber" class="mt-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                      TTE BA: {{ event.tteNumber }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: Setujui Verifikasi 1 -->
    <Teleport to="body">
      <div v-if="showApproveModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle class="w-6 h-6" />
          </div>
          <div class="text-center space-y-1">
            <h3 class="font-bold text-slate-900 text-base">Konfirmasi Persetujuan Verifikasi 1</h3>
            <p class="text-xs text-slate-600 leading-relaxed">Dokumen akan disetujui dan masuk ke antrean Verifikasi Final. Lanjutkan?</p>
            <p class="text-[11px] text-slate-400 mt-1">Dokumen masih dapat dikoreksi oleh Bapperida setelah disetujui Verifikasi 1.</p>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button @click="showApproveModal = false" :disabled="actionLoading" class="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">Batal</button>
            <button @click="submitApprove" :disabled="actionLoading" class="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs">
              {{ actionLoading ? "Memproses..." : "Ya, Setujui Verifikasi 1" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL: Kembalikan ke OPD -->
    <Teleport to="body">
      <div v-if="showReturnOpdModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <AlertCircle class="w-6 h-6" />
          </div>
          <div class="text-center space-y-1">
            <h3 class="font-bold text-slate-900 text-base">Kembalikan ke OPD (Perlu Revisi)</h3>
            <p class="text-xs text-slate-500">Dokumen akan dikembalikan ke OPD dengan status Perlu Revisi.</p>
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700">Catatan Revisi OPD (Wajib):</label>
            <textarea
              v-model="returnNotes"
              rows="3"
              placeholder="Tuliskan catatan detail revisi yang wajib diperbaiki oleh OPD..."
              class="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-rose-500"
            ></textarea>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button @click="showReturnOpdModal = false" :disabled="actionLoading" class="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">Batal</button>
            <button
              @click="submitReturnToOpd"
              :disabled="actionLoading || !returnNotes.trim()"
              class="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
            >
              {{ actionLoading ? "Mengirim..." : "Kembalikan ke OPD" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "../stores/appStore";
import { apiFetch } from "../lib/api";
import {
  ArrowLeft, Search, RotateCw, FolderCheck, Eye,
  CheckCircle, AlertCircle, Clock, CheckSquare,
  FileText, ExternalLink, Info
} from "@lucide/vue";

const store = useAppStore();
const route = useRoute();
const router = useRouter();

const selectedDocId = computed(() => (route.params.id as string) || "");

const allQueueItems = ref<any[]>([]);
const batasHari = ref(3);
const loading = ref(false);
const listError = ref("");
const searchQuery = ref("");
const filterJenis = ref("all");

const docDetail = ref<any>(null);
const detailLoading = ref(false);
const detailError = ref("");

const showApproveModal = ref(false);
const showReturnOpdModal = ref(false);
const returnNotes = ref("");
const actionLoading = ref(false);

const filteredQueueItems = computed(() =>
  allQueueItems.value.filter(item => {
    if (filterJenis.value !== "all" && item.jenis !== filterJenis.value) return false;
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      return item.judul?.toLowerCase().includes(q) || item.opdName?.toLowerCase().includes(q) || item.kodeDoc?.toLowerCase().includes(q);
    }
    return true;
  })
);

const canVerifyThisDoc = computed(() => {
  if (!docDetail.value) return false;
  if (store.isSuperAdmin) return true;
  return allQueueItems.value.some(i => i.id === selectedDocId.value && i.canVerify);
});

const formatTimestamp = (ts?: string) => {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const getTimelineDotColor = (type: string) => {
  const map: Record<string, string> = {
    created: "bg-slate-400", submission: "bg-amber-500",
    verification1: "bg-emerald-500", correction: "bg-amber-500",
    revision_requested: "bg-rose-500", finalized: "bg-purple-600"
  };
  return map[type] || "bg-slate-400";
};

const loadSummary = async () => {
  loading.value = true; listError.value = "";
  try {
    const data = await store.fetchVerificationSummary(store.selectedTahun);
    if (data) {
      allQueueItems.value = data.antreanVerifikasi1 || [];
      batasHari.value = data.batasHariVerifikasi || 3;
    } else {
      const res = await apiFetch(`/api/admin/verification-summary?tahun=${store.selectedTahun}`);
      if (res.ok) {
        const d = await res.json();
        allQueueItems.value = d.antreanVerifikasi1 || [];
        batasHari.value = d.batasHariVerifikasi || 3;
      } else {
        const err = await res.json();
        listError.value = err.error || "Gagal memuat antrean verifikasi";
      }
    }
  } catch (err: any) {
    listError.value = err.message || "Gagal memuat antrean verifikasi";
  } finally { loading.value = false; }
};

const loadDetail = async (id: string) => {
  detailLoading.value = true; detailError.value = "";
  try {
    const res = await apiFetch(`/api/admin/verification-timeline/${id}`);
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Gagal memuat detail"); }
    docDetail.value = await res.json();
  } catch (err: any) {
    detailError.value = err.message || "Gagal memuat detail telaah";
  } finally { detailLoading.value = false; }
};

const selectDocument = (id: string) => router.push(`/verifikasi/${id}`);
const openApproveModal = () => { showApproveModal.value = true; };
const openReturnOpdModal = () => { returnNotes.value = ""; showReturnOpdModal.value = true; };

const submitApprove = async () => {
  if (!docDetail.value) return;
  actionLoading.value = true;
  try {
    const res = await apiFetch(`/api/documents/${docDetail.value.document.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Disetujui Bapperida" })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal menyetujui dokumen");
    store.addToast("Dokumen berhasil disetujui Verifikasi 1 dan otomatis masuk ke antrean Verifikasi Final.", "success");
    showApproveModal.value = false;
    await store.fetchDocuments();
    await store.fetchVerificationSummary(store.selectedTahun);
    router.push("/verifikasi");
  } catch (err: any) { store.addToast(err.message, "error"); }
  finally { actionLoading.value = false; }
};

const submitReturnToOpd = async () => {
  if (!docDetail.value || !returnNotes.value.trim()) return;
  actionLoading.value = true;
  try {
    const res = await apiFetch(`/api/documents/${docDetail.value.document.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Perlu Revisi", catatanRevisi: returnNotes.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal mengembalikan dokumen ke OPD");
    store.addToast("Dokumen berhasil dikembalikan ke OPD dengan status Perlu Revisi.", "success");
    showReturnOpdModal.value = false;
    router.push("/verifikasi");
    await store.fetchDocuments();
    await store.fetchVerificationSummary(store.selectedTahun);
  } catch (err: any) { store.addToast(err.message, "error"); }
  finally { actionLoading.value = false; }
};

watch(() => route.params.id, (newId) => {
  if (newId) loadDetail(newId as string);
  else loadSummary();
}, { immediate: true });

watch(() => store.selectedTahun, () => {
  if (!selectedDocId.value) loadSummary();
});

watch(() => store.verificationSummary?.antreanVerifikasi1, (items) => {
  if (items && !selectedDocId.value) {
    allQueueItems.value = items;
  }
});

onMounted(() => { if (!selectedDocId.value) loadSummary(); });
</script>
