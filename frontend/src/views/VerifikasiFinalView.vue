<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <router-link
          v-if="selectedDocId"
          to="/verifikasi-final"
          class="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
          title="Kembali ke Daftar Antrean"
        >
          <ArrowLeft class="w-4 h-4" />
        </router-link>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {{ selectedDocId ? 'Tinjauan Verifikasi Final' : (store.isSuperAdmin ? 'Antrean Verifikasi Final' : 'Menunggu Verifikasi Final') }}
            </h1>
            <span
              v-if="!store.isSuperAdmin"
              class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
            >
              Hanya Lihat
            </span>
          </div>
          <p class="mt-1 text-xs text-slate-500">
            {{ selectedDocId
              ? 'Pemeriksaan akhir dokumen sebelum penguncian permanen dan publikasi ke Arsip OPD.'
              : 'Daftar dokumen berstatus Disetujui Bapperida yang menunggu pengesahan tahap akhir oleh Super Admin.' }}
          </p>
        </div>
      </div>

      <!-- Quick Actions / Status badge -->
      <div v-if="!selectedDocId" class="flex flex-wrap items-center gap-2">
        <button
          v-if="store.isSuperAdmin && selectedIds.length > 0"
          @click="openBulkFinalizeModal"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors"
        >
          <CheckCircle class="w-4 h-4" />
          Finalkan Terpilih ({{ selectedIds.length }})
        </button>
        <span class="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs font-bold text-blue-700">
          {{ queueItems.length }} Dokumen Menunggu Final
        </span>
      </div>
    </div>

    <!-- Alert untuk Verifikator biasa -->
    <div v-if="!store.isSuperAdmin && !selectedDocId" class="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-xs">
      <Info class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p class="font-bold">Akses Baca-Saja (Verifikator Desk)</p>
        <p class="mt-0.5 text-amber-700">
          Sebagai verifikator, Anda dapat memantau status dokumen OPD tugas Anda yang telah disetujui pada Verifikasi 1. Pengesahan Verifikasi Final dilakukan oleh Kepala Bidang PPEPD (Super Admin).
        </p>
      </div>
    </div>

    <!-- TAMPILAN 1: DAFTAR ANTREAN VERIFIKASI FINAL (Jika belum memilih dokumen) -->
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

      <!-- Loading / Empty / Table -->
      <div v-if="loading" class="p-12 text-center bg-white rounded-2xl border border-slate-200 text-sm text-slate-500">
        Memuat antrean Verifikasi Final...
      </div>
      <div v-else-if="!filteredQueueItems.length" class="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
        <FolderCheck class="w-10 h-10 mx-auto text-slate-300 mb-2" />
        <h3 class="font-bold text-slate-700 text-sm">Tidak ada dokumen menunggu Verifikasi Final</h3>
        <p class="text-xs text-slate-400 mt-1">Dokumen yang disetujui pada Verifikasi 1 akan otomatis masuk ke antrean ini.</p>
      </div>
      <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <th v-if="store.isSuperAdmin" class="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    @change="toggleSelectAll"
                    class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th class="py-3 px-4">Dokumen & Perangkat Daerah</th>
                <th class="py-3 px-4">T.A. & Jenis</th>
                <th class="py-3 px-4">Disetujui Oleh (Verifikasi 1)</th>
                <th class="py-3 px-4">Lama Menunggu</th>
                <th class="py-3 px-4 text-center">Status Koreksi</th>
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
                <!-- Checkbox -->
                <td v-if="store.isSuperAdmin" class="py-3.5 px-3 text-center">
                  <input
                    type="checkbox"
                    v-model="selectedIds"
                    :value="item.id"
                    class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>

                <!-- Dokumen -->
                <td class="py-3.5 px-4">
                  <div class="font-bold text-slate-900 leading-snug">{{ item.judul }}</div>
                  <div class="text-[11px] text-slate-500 mt-0.5">{{ item.opdName }}</div>
                  <div class="font-mono text-[9px] text-slate-400 mt-0.5">Kode: {{ item.kodeDoc }}</div>
                </td>

                <!-- Jenis & Tahun -->
                <td class="py-3.5 px-4">
                  <span class="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    {{ item.jenis }}
                  </span>
                  <div class="text-[10px] text-slate-400 mt-1 font-mono">T.A. {{ item.tahun }}</div>
                </td>

                <!-- Verifikator 1 -->
                <td class="py-3.5 px-4">
                  <div class="font-semibold text-slate-800">{{ item.disetujuiOleh || 'Verifikator Bapperida' }}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">
                    {{ formatTimestamp(item.tanggalDisetujui) }}
                  </div>
                </td>

                <!-- Lama Menunggu & Overdue Badge -->
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      :class="item.isOverdue ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-600'"
                    >
                      {{ item.lamaMenungguText }}
                    </span>
                    <span
                      v-if="item.isOverdue"
                      class="text-[9px] font-bold text-red-600 uppercase"
                      :title="`Lewat batas toleransi ${batasHari} hari`"
                    >
                      ⚠️ Lewat Batas
                    </span>
                  </div>
                </td>

                <!-- Koreksi Status -->
                <td class="py-3.5 px-4 text-center">
                  <span
                    v-if="item.hasCorrection"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                    title="Naskah memiliki catatan koreksi setelah Verifikasi 1"
                  >
                    <AlertTriangle class="w-3 h-3 text-amber-600" />
                    Ada Koreksi
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-400 bg-slate-50"
                  >
                    Tanpa Koreksi
                  </span>
                </td>

                <!-- Aksi -->
                <td class="py-3.5 px-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      @click="selectDocument(item.id)"
                      class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs"
                    >
                      <Eye class="w-3.5 h-3.5" />
                      <span>Periksa Final</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAMPILAN 2: HALAMAN TINJAUAN DETAIL VERIFIKASI FINAL -->
    <div v-else class="space-y-6">
      <div v-if="detailLoading" class="p-12 text-center bg-white rounded-2xl border border-slate-200 text-sm text-slate-500">
        Memuat detail telaah dokumen dan lini masa...
      </div>
      <div v-else-if="detailError" class="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
        {{ detailError }} <button @click="loadDetail(selectedDocId)" class="underline font-bold ml-2">Coba lagi</button>
      </div>
      <div v-else-if="docDetail" class="space-y-6">
        <!-- Top Banner Detail & Action Bar -->
        <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-700 font-mono">
                {{ docDetail.document.kodeDoc }}
              </span>
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                T.A. {{ docDetail.document.tahun }}
              </span>
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {{ docDetail.document.status }} (Tahap Verifikasi Final)
              </span>
            </div>
            <h2 class="text-lg font-bold text-slate-900 leading-snug">{{ docDetail.document.judul }}</h2>
            <p class="text-xs text-slate-500">{{ docDetail.document.opdName }} · Disetujui Verifikasi 1 oleh {{ docDetail.document.verifierName || 'Bapperida' }}</p>
          </div>

          <!-- Action Buttons (Only for Super Admin) -->
          <div v-if="store.isSuperAdmin && docDetail.document.status === 'Disetujui Bapperida'" class="flex flex-wrap items-center gap-2">
            <button
              @click="openReturnToVerifierModal"
              class="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              Kembalikan ke Verifikator
            </button>
            <button
              @click="openReturnToOpdModal"
              class="px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <AlertCircle class="w-3.5 h-3.5" />
              Kembalikan ke OPD
            </button>
            <button
              @click="openFinalizeModal"
              class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs inline-flex items-center gap-1.5"
            >
              <CheckCircle class="w-4 h-4" />
              Setujui Final (Finalkan)
            </button>
          </div>
          <div v-else-if="docDetail.document.status === 'Final'" class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-emerald-600" />
            Dokumen Sudah Terkunci Permanen (Final)
          </div>
        </div>

        <!-- 2 Kolom Grid: Pratinjau Dokumen & Lini Masa + Cek Format -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Kolom Kiri: Pratinjau Dokumen (7 cols) -->
          <div class="lg:col-span-7 space-y-4">
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <FileText class="w-4 h-4 text-blue-600" />
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

              <!-- Bab Section Accordion Preview -->
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
                    class="pl-3 border-l-2 border-blue-200 text-xs text-slate-600 space-y-1"
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

          <!-- Kolom Kanan: Lini Masa Verifikasi & Cek Format (5 cols) -->
          <div class="lg:col-span-5 space-y-5">
            <!-- 1. Hasil Cek Format Dokumen -->
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
                  {{ docDetail.formatReport?.violations?.length ? `${docDetail.formatReport.violations.length} Catatan` : 'Sesuai Standar' }}
                </span>
              </div>

              <!-- Alert jika ada koreksi setelah Verifikasi 1 -->
              <div
                v-if="docDetail.hasCorrection"
                class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5"
              >
                <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p class="font-bold">Terdapat Koreksi Pasca-Verifikasi 1</p>
                  <p class="text-[11px] text-amber-700 mt-0.5">Naskah telah mengalami perbaikan atau penyesuaian oleh Bapperida sebelum diajukan ke tahap akhir.</p>
                </div>
              </div>

              <!-- List Catatan Format -->
              <div v-if="docDetail.formatReport?.violations?.length" class="space-y-2">
                <div
                  v-for="(v, idx) in docDetail.formatReport.violations"
                  :key="idx"
                  class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2"
                >
                  <span class="text-amber-600 font-bold">•</span>
                  <span class="text-[11px] leading-relaxed">{{ typeof v === 'string' ? v : (v.message || v.rule) }}</span>
                </div>
              </div>
              <p v-else class="text-xs text-emerald-700 font-medium py-1">
                ✓ Seluruh bab wajib Permendagri 86/2017 terverifikasi lengkap dan memenuhi standar format.
              </p>
            </div>

            <!-- 2. Riwayat Verifikasi Berbentuk Lini Masa -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Clock class="w-4 h-4 text-blue-600" />
                <h3 class="font-bold text-slate-900 text-sm">Lini Masa Verifikasi</h3>
              </div>

              <!-- Timeline Events List -->
              <div class="relative pl-5 border-l-2 border-slate-200 space-y-6 my-2">
                <div
                  v-for="(event, idx) in docDetail.timeline"
                  :key="idx"
                  class="relative group"
                >
                  <!-- Bullet Node -->
                  <div
                    class="absolute -left-[27px] top-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs"
                    :class="getTimelineDotColor(event.type)"
                  ></div>

                  <!-- Content -->
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

    <!-- MODAL 1: Konfirmasi Finalkan (Setujui Final) -->
    <Teleport to="body">
      <div v-if="showFinalizeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
          <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle class="w-6 h-6" />
          </div>
          <div class="text-center space-y-1">
            <h3 class="font-bold text-slate-900 text-base">Konfirmasi Verifikasi Final</h3>
            <p class="text-xs text-slate-600 leading-relaxed">
              Dokumen akan terkunci dan tidak dapat diedit. Lanjutkan?
            </p>
            <p class="text-[11px] text-slate-400 mt-1">
              Dokumen akan langsung diterbitkan ke Arsip OPD dengan sertifikasi BSrE BSSN.
            </p>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button
              @click="showFinalizeModal = false"
              :disabled="actionLoading"
              class="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              @click="submitFinalize"
              :disabled="actionLoading"
              class="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              {{ actionLoading ? 'Memproses...' : 'Ya, Setujui Final' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL 2: Kembalikan ke Verifikator -->
    <Teleport to="body">
      <div v-if="showReturnVerifierModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
          <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <RotateCcw class="w-6 h-6" />
          </div>
          <div class="text-center space-y-1">
            <h3 class="font-bold text-slate-900 text-base">Kembalikan ke Verifikator</h3>
            <p class="text-xs text-slate-500">
              Dokumen akan dikembalikan ke status Menunggu Verifikasi agar diperiksa ulang oleh verifikator 1.
            </p>
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700">Catatan Pengembalian (Wajib):</label>
            <textarea
              v-model="returnNotes"
              rows="3"
              placeholder="Tuliskan arahan perbaikan untuk verifikator..."
              class="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-amber-500"
            ></textarea>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button
              @click="showReturnVerifierModal = false"
              :disabled="actionLoading"
              class="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              @click="submitReturnToVerifier"
              :disabled="actionLoading || !returnNotes.trim()"
              class="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
            >
              {{ actionLoading ? 'Mengirim...' : 'Kembalikan Naskah' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL 3: Kembalikan ke OPD -->
    <Teleport to="body">
      <div v-if="showReturnOpdModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
          <div class="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <AlertCircle class="w-6 h-6" />
          </div>
          <div class="text-center space-y-1">
            <h3 class="font-bold text-slate-900 text-base">Kembalikan ke OPD (Perlu Revisi)</h3>
            <p class="text-xs text-slate-500">
              Dokumen akan dikembalikan ke OPD dengan status Perlu Revisi.
            </p>
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
            <button
              @click="showReturnOpdModal = false"
              :disabled="actionLoading"
              class="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              @click="submitReturnToOpd"
              :disabled="actionLoading || !returnNotes.trim()"
              class="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
            >
              {{ actionLoading ? 'Mengirim...' : 'Kembalikan ke OPD' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL 4: Finalkan Beberapa Sekaligus -->
    <Teleport to="body">
      <div v-if="showBulkModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
          <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle class="w-6 h-6" />
          </div>
          <div class="text-center space-y-1">
            <h3 class="font-bold text-slate-900 text-base">Finalkan Sekaligus</h3>
            <p class="text-xs text-slate-600 leading-relaxed">
              Anda akan memfinalkan <strong>{{ selectedIds.length }} dokumen</strong> secara serentak. Dokumen akan terkunci dan diterbitkan ke Arsip OPD. Lanjutkan?
            </p>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button
              @click="showBulkModal = false"
              :disabled="actionLoading"
              class="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              @click="submitBulkFinalize"
              :disabled="actionLoading"
              class="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              {{ actionLoading ? 'Memproses...' : `Finalkan (${selectedIds.length})` }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import { apiFetch } from '../lib/api';
import {
  ArrowLeft,
  Search,
  RotateCw,
  FolderCheck,
  Eye,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Clock,
  CheckSquare,
  FileText,
  ExternalLink,
  AlertTriangle,
  Info
} from '@lucide/vue';

const store = useAppStore();
const route = useRoute();
const router = useRouter();

const selectedDocId = computed(() => (route.params.id as string) || '');

// Antrean state
const queueItems = ref<any[]>([]);
const batasHari = ref(3);
const loading = ref(false);
const searchQuery = ref('');
const filterJenis = ref('all');
const selectedIds = ref<string[]>([]);

// Detail state
const docDetail = ref<any>(null);
const detailLoading = ref(false);
const detailError = ref('');

// Modals
const showFinalizeModal = ref(false);
const showReturnVerifierModal = ref(false);
const showReturnOpdModal = ref(false);
const showBulkModal = ref(false);
const returnNotes = ref('');
const actionLoading = ref(false);

const filteredQueueItems = computed(() => {
  return queueItems.value.filter(item => {
    if (filterJenis.value !== 'all' && item.jenis !== filterJenis.value) return false;
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      return (
        item.judul?.toLowerCase().includes(q) ||
        item.opdName?.toLowerCase().includes(q) ||
        item.kodeDoc?.toLowerCase().includes(q)
      );
    }
    return true;
  });
});

const allSelected = computed(() => {
  return (
    filteredQueueItems.value.length > 0 &&
    filteredQueueItems.value.every(item => selectedIds.value.includes(item.id))
  );
});

const toggleSelectAll = (e: Event) => {
  const checked = (e.target as HTMLInputElement).checked;
  if (checked) {
    selectedIds.value = filteredQueueItems.value.map(item => item.id);
  } else {
    selectedIds.value = [];
  }
};

const formatTimestamp = (ts?: string) => {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTimelineDotColor = (type: string) => {
  switch (type) {
    case 'created': return 'bg-slate-400';
    case 'submission': return 'bg-blue-500';
    case 'verification1': return 'bg-emerald-500';
    case 'correction': return 'bg-amber-500';
    case 'revision_requested': return 'bg-rose-500';
    case 'finalized': return 'bg-purple-600';
    default: return 'bg-slate-400';
  }
};

const loadSummary = async () => {
  loading.value = true;
  try {
    const data = await store.fetchVerificationSummary(store.selectedTahun);
    if (data) {
      queueItems.value = data.antreanVerifikasiFinal || [];
      batasHari.value = data.batasHariVerifikasi || 3;
    } else {
      const res = await apiFetch(`/api/admin/verification-summary?tahun=${store.selectedTahun}`);
      if (res.ok) {
        const d = await res.json();
        queueItems.value = d.antreanVerifikasiFinal || [];
        batasHari.value = d.batasHariVerifikasi || 3;
      }
    }
  } catch (err) {
    console.error('Failed to load queue:', err);
  } finally {
    loading.value = false;
  }
};

const loadDetail = async (id: string) => {
  detailLoading.value = true;
  detailError.value = '';
  try {
    const res = await apiFetch(`/api/admin/verification-timeline/${id}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal memuat detail verifikasi');
    }
    docDetail.value = await res.json();
  } catch (err: any) {
    detailError.value = err.message || 'Gagal memuat detail telaah';
  } finally {
    detailLoading.value = false;
  }
};

const selectDocument = (id: string) => {
  router.push(`/verifikasi-final/${id}`);
};

const openFinalizeModal = () => {
  showFinalizeModal.value = true;
};

const openReturnToVerifierModal = () => {
  returnNotes.value = '';
  showReturnVerifierModal.value = true;
};

const openReturnToOpdModal = () => {
  returnNotes.value = '';
  showReturnOpdModal.value = true;
};

const openBulkFinalizeModal = () => {
  showBulkModal.value = true;
};

// Actions
const submitFinalize = async () => {
  if (!docDetail.value) return;
  actionLoading.value = true;
  try {
    const res = await apiFetch(`/api/documents/${docDetail.value.document.id}/finalize`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memfinalkan dokumen');
    store.addToast('Dokumen berhasil disetujui Final dan diterbitkan ke Arsip OPD.', 'success');
    showFinalizeModal.value = false;
    await loadDetail(docDetail.value.document.id);
    await store.fetchDocuments();
    await store.fetchVerificationSummary(store.selectedTahun);
  } catch (err: any) {
    store.addToast(err.message, 'error');
  } finally {
    actionLoading.value = false;
  }
};

const submitReturnToVerifier = async () => {
  if (!docDetail.value || !returnNotes.value.trim()) return;
  actionLoading.value = true;
  try {
    const res = await apiFetch(`/api/documents/${docDetail.value.document.id}/return-to-verifier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catatan: returnNotes.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengembalikan ke verifikator');
    store.addToast('Dokumen berhasil dikembalikan ke verifikator untuk verifikasi ulang.', 'success');
    showReturnVerifierModal.value = false;
    router.push('/verifikasi-final');
    await store.fetchDocuments();
    await store.fetchVerificationSummary(store.selectedTahun);
  } catch (err: any) {
    store.addToast(err.message, 'error');
  } finally {
    actionLoading.value = false;
  }
};

const submitReturnToOpd = async () => {
  if (!docDetail.value || !returnNotes.value.trim()) return;
  actionLoading.value = true;
  try {
    const res = await apiFetch(`/api/documents/${docDetail.value.document.id}/return-to-opd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catatanRevisi: returnNotes.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengembalikan ke OPD');
    store.addToast('Dokumen berhasil dikembalikan ke OPD dengan status Perlu Revisi.', 'success');
    showReturnOpdModal.value = false;
    router.push('/verifikasi-final');
    await store.fetchDocuments();
    await store.fetchVerificationSummary(store.selectedTahun);
  } catch (err: any) {
    store.addToast(err.message, 'error');
  } finally {
    actionLoading.value = false;
  }
};

const submitBulkFinalize = async () => {
  if (!selectedIds.value.length) return;
  actionLoading.value = true;
  try {
    const res = await apiFetch('/api/documents/finalize-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memfinalkan beberapa dokumen');
    store.addToast(`${data.finalized?.length || selectedIds.value.length} dokumen berhasil difinalkan.`, 'success');
    showBulkModal.value = false;
    selectedIds.value = [];
    await loadSummary();
    await store.fetchDocuments();
    await store.fetchVerificationSummary(store.selectedTahun);
  } catch (err: any) {
    store.addToast(err.message, 'error');
  } finally {
    actionLoading.value = false;
  }
};

watch(() => route.params.id, (newId) => {
  if (newId) loadDetail(newId as string);
  else loadSummary();
}, { immediate: true });

watch(() => store.selectedTahun, () => {
  if (!selectedDocId.value) loadSummary();
});

watch(() => store.verificationSummary?.antreanVerifikasiFinal, (items) => {
  if (items && !selectedDocId.value) {
    queueItems.value = items;
  }
});

onMounted(() => {
  if (!selectedDocId.value) loadSummary();
});
</script>
