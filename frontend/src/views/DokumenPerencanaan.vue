<template>
  <div class="planning-page space-y-6">
    <div class="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Dokumen Perencanaan</h1>
          <span class="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">SIPANDA</span>
        </div>
        <p class="mt-1.5 text-sm text-slate-500">Pusat pengelolaan dan penyusunan naskah perencanaan pembangunan Kabupaten Cirebon</p>
      </div>
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <button v-if="activeTab !== 'evaluasiRenja' && activeTab !== 'evaluasiRkpd' && activeTab !== 'formatLampiran'" @click="downloadRecap" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
          <Download class="h-4 w-4" /> Unduh Rekap
        </button>
        <button @click="store.showCreateModal = true" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
          <Plus class="h-4 w-4" /> Buat Dokumen
        </button>
      </div>
    </div>
    <div class="overflow-x-auto border-b border-slate-300 pb-1">
      <div class="flex min-w-max items-center gap-1" role="tablist" aria-label="Jenis dokumen">
        <button v-for="tab in availableTabs" :key="tab.id" @click="switchTab(tab.id)" role="tab" :aria-selected="activeTab === tab.id"
          class="inline-flex min-h-12 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors"
          :class="activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'">
          <component :is="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
          <span v-if="tab.id !== 'evaluasiRenja' && tab.id !== 'evaluasiRkpd' && tab.id !== 'formatLampiran'" class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" :class="activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'">{{ tab.count }}</span>
          <span v-else-if="tab.id === 'evaluasiRenja' || tab.id === 'evaluasiRkpd'" class="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">TW I-IV</span>
        </button>
      </div>
    </div>

    <!-- Table Section: Daftar Draf Dokumen -->
    <div v-if="activeTab !== 'evaluasiRenja' && activeTab !== 'evaluasiRkpd' && activeTab !== 'formatLampiran'" class="space-y-4">
      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center">
        <div class="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div class="relative min-w-0">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input v-model="searchDraf" type="text" placeholder="Cari OPD, judul, atau kode..." class="h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <select v-model="jenisFilter" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="all">{{ activeJenisLabel }}</option>
            <option v-for="jenis in jenisOptions" :key="jenis" :value="jenis">{{ jenis }}</option>
          </select>
          <select v-model="statusFilterDraf" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="all">Semua Status</option>
            <option value="Draft">Draft</option>
            <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
            <option value="Perlu Revisi">Perlu Revisi</option>
            <option value="Disetujui">Disetujui</option>
            <option value="Disetujui Bapperida">Disetujui Bapperida</option>
            <option value="Final">Final</option>
          </select>
          <select :value="store.selectedTahun" @change="setYearFilter" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option v-for="year in store.availableYears.slice().reverse()" :key="year" :value="year">T.A. {{ year }}</option>
          </select>
        </div>
        <div class="flex shrink-0 flex-wrap items-center gap-2">
          <button @click="resetFilters" class="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-blue-700"><RotateCcw class="h-4 w-4" />Reset</button>
          <button @click="store.fetchDocuments()" aria-label="Muat ulang dokumen" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><RefreshCw class="h-4 w-4" /></button>
        </div>
      </div>
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <h2 class="text-sm font-bold text-slate-800">Arsip Dokumen {{ availableTabs.find(tab => tab.id === activeTab)?.label || 'Perencanaan' }}</h2>
        <span class="shrink-0 text-xs text-slate-500 sm:text-sm">{{ displayedDocuments.length }} dokumen ditampilkan</span>
      </div>
      <!-- Table View Matching Screenshot 2 & 3 -->
      <div v-if="displayedDocuments.length" class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <th class="px-5 py-3.5">Nama Dokumen</th>
              <th class="px-5 py-3.5">Metode</th>
              <th v-if="!store.isOpd" class="px-5 py-3.5">Staf / Bab Terakhir</th>
              <th class="px-5 py-3.5">Status</th>
              <th class="px-5 py-3.5">Pembaruan</th>
              <th class="px-5 py-3.5 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="doc in paginatedDocuments"
              :key="doc.id"
              class="transition-colors hover:bg-blue-50/40"
            >
              <!-- Nama Dokumen -->
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                    :class="getIconBgClass(doc)"
                  >
                    <FileText v-if="doc.cara === 'template'" class="w-4 h-4" />
                    <FileCheck v-else-if="doc.isLampiranOtomatis" class="w-4 h-4" />
                    <Upload v-else class="w-4 h-4" />
                  </div>
                  <div>
                    <div class="font-bold text-slate-900 hover:text-blue-600 cursor-pointer" @click="handleDocAction(doc)">
                      {{ doc.fileName || (doc.cara === 'template' ? `${doc.jenis.replace(/\s+/g, '_')}_TA${doc.tahun}_${doc.opdId}.json` : 'Draf Belum Diunggah') }}
                    </div>
                    <div class="mt-1 text-xs text-slate-500">
                      {{ doc.kodeDoc }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- Metode Asal -->
              <td class="px-5 py-4">
                <span
                  class="inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold"
                  :class="getMetodePill(doc)"
                >
                  {{ doc.isLampiranOtomatis ? 'Kompilasi Otomatis' : (doc.cara === 'template' ? 'Template Sistem' : 'Upload Mandiri') }}
                </span>
              </td>

              <!-- Staf dan bab terakhir yang diperbarui -->
              <td v-if="!store.isOpd" class="px-5 py-4">
                <template v-if="lastEditedChapter(doc)">
                  <div class="font-semibold text-slate-700">{{ lastEditedChapter(doc)?.lastEditedBy?.nama || 'Staf tidak diketahui' }}</div>
                  <div class="mt-1 text-xs text-slate-500">{{ lastEditedChapter(doc)?.title }}</div>
                </template>
                <span v-else class="text-sm text-slate-400">Riwayat staf/bab belum tersedia</span>
              </td>

              <!-- Status Verifikasi -->
              <td class="px-5 py-4">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="getStatusBadgeClass(doc.status)"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="getStatusDot(doc.status)"></span>
                  <span>{{ doc.status }}</span>
                </span>
              </td>

              <!-- Pembaruan -->
              <td class="px-5 py-4 text-sm text-slate-500">
                {{ formatDateTime(doc.updatedAt) }}
              </td>

              <!-- Aksi -->
              <td class="px-5 py-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <label
                    v-if="needsUploadedSource(doc)"
                    class="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                    :class="{ 'pointer-events-none opacity-50': replacingSourceId === doc.id }"
                  >
                    <input type="file" accept=".pdf,.docx" class="hidden" @change="replaceUploadedSource($event, doc)" />
                    <UploadCloud class="h-3.5 w-3.5" />
                    {{ replacingSourceId === doc.id ? 'Memproses...' : 'Unggah Berkas' }}
                  </label>
                  <button
                    v-if="!needsUploadedSource(doc)"
                    @click="handleDocAction(doc)"
                    :disabled="doc.cara === 'upload' && !doc.fileName"
                    :title="doc.cara === 'upload' && !doc.fileName ? 'Pilih Unggah PDF/DOCX untuk menyimpan isi Renja dan membuat lampirannya' : undefined"
                    class="rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                    :class="[getActionButtonClass(doc), { 'cursor-not-allowed opacity-50': doc.cara === 'upload' && !doc.fileName }]"
                  >
                    {{ doc.cara === 'upload' && !doc.fileName ? 'Berkas Belum Ada' : getActionButtonLabel(doc) }}
                  </button>
                  <button
                    v-if="store.isOpd && ['Draft', 'Perlu Revisi'].includes(doc.status)"
                    @click.stop="submitDraft(doc)"
                    :disabled="Boolean(isSubmittingDocumentId) || !isUploadReady(doc)"
                    :title="!isUploadReady(doc) ? 'Unggah dan simpan berkas dokumen sebelum diajukan' : 'Kirim dokumen ini ke Bapperida untuk diverifikasi'"
                    class="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Send class="h-3 w-3" />
                    {{ isSubmittingDocumentId === doc.id ? 'Mengirim...' : doc.status === 'Perlu Revisi' ? 'Submit Ulang ke Admin' : 'Submit ke Admin' }}
                  </button>
                  <span v-if="store.isOpd && doc.status === 'Menunggu Verifikasi'" class="whitespace-nowrap text-[10px] font-medium text-blue-700">Sudah disubmit</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="flex min-w-[540px] items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3.5 text-xs text-slate-600">
          <span>Menampilkan {{ paginatedDocuments.length }} dari {{ displayedDocuments.length }} total berkas</span>
          <div class="flex items-center gap-1">
            <button @click="currentPage--" :disabled="currentPage === 1" class="rounded-lg px-2 py-1 disabled:opacity-40">Sebelumnya</button>
            <span class="rounded-lg bg-blue-600 px-2.5 py-1 text-white">{{ currentPage }}</span>
            <span class="px-1">/ {{ totalPages }}</span>
            <button @click="currentPage++" :disabled="currentPage === totalPages" class="rounded-lg px-2 py-1 disabled:opacity-40">Selanjutnya</button>
          </div>
        </div>
      </div>
      <div v-else class="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
        <div class="flex h-20 w-20 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-slate-400"><FolderOpen class="h-9 w-9" /></div>
        <h2 class="mt-5 text-base font-semibold text-slate-800">Tidak ada dokumen ditemukan</h2>
        <p class="mt-2 max-w-lg text-sm leading-6 text-slate-500">Tidak ada dokumen pada filter saat ini untuk T.A. {{ store.selectedTahun }}. Sesuaikan filter atau lihat tahun lain yang memiliki data.</p>
        <button @click="resetFilters" class="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><RotateCcw class="h-4 w-4" />Bersihkan Filter</button>
      </div>
    </div>
    </div>
  </div>

  <!-- ================================================================ -->
  <!-- MODAL: Pilih Metode Pembuatan Dokumen                            -->
  <!-- ================================================================ -->
  <Teleport to="body">
    <div
      v-if="showMethodModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      @click.self="closeMethodModal"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">

        <!-- Modal Header -->
        <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Buat Dokumen Baru</div>
            <h2 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span
                class="inline-block px-2 py-0.5 rounded-lg text-[11px] font-bold"
                :class="selectedJenis?.includes('Renstra') ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'"
              >
                {{ selectedJenis }}
              </span>
              <span class="text-slate-500 font-medium text-sm">T.A. {{ store.selectedTahun }}</span>
            </h2>
          </div>
          <button @click="closeMethodModal" class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- STEP 1: Pilih Metode -->
        <div v-if="modalStep === 'choose'" class="p-6 space-y-4">
          <p class="text-xs text-slate-500">Pilih cara pembuatan dokumen <strong class="text-slate-700">{{ selectedJenis }}</strong>:</p>

          <div v-if="store.isBapperida && !isInternalDocument" class="space-y-1.5">
            <label for="renja-target-opd" class="block text-xs font-bold text-slate-700">OPD pengusul</label>
            <select id="renja-target-opd" v-model="selectedOpdId" class="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs">
              <option value="">Pilih OPD</option>
              <option v-for="opd in selectableOpds" :key="opd.id" :value="opd.id">{{ opd.nama }}</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Opsi 1: Template/Editor -->
            <button
              @click="selectedMethod = 'template'"
              class="group relative flex flex-col items-center gap-3 p-5 border-2 rounded-2xl transition-all duration-200 text-center cursor-pointer"
              :class="selectedMethod === 'template' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/60'"
            >
              <div class="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
                   :class="selectedMethod === 'template' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'">
                <FileEdit class="w-6 h-6" />
              </div>
              <div>
                <div class="font-extrabold text-sm text-slate-900">Editor Dokumen</div>
                <div class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Susun menggunakan template naskah baku Permendagri 86/2017
                </div>
              </div>
              <div v-if="selectedMethod === 'template'"
                   class="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                <Check class="w-3 h-3 text-white" />
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Direkomendasikan</span>
            </button>

            <!-- Opsi 2: Upload -->
            <button
              @click="selectedMethod = 'upload'"
              class="group relative flex flex-col items-center gap-3 p-5 border-2 rounded-2xl transition-all duration-200 text-center cursor-pointer"
              :class="selectedMethod === 'upload' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/60'"
            >
              <div class="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
                   :class="selectedMethod === 'upload' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'">
                <UploadCloud class="w-6 h-6" />
              </div>
              <div>
                <div class="font-extrabold text-sm text-slate-900">Upload Dokumen</div>
                <div class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Unggah berkas PDF/DOCX yang sudah disiapkan mandiri
                </div>
              </div>
              <div v-if="selectedMethod === 'upload'"
                   class="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
                <Check class="w-3 h-3 text-white" />
              </div>
            </button>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button @click="closeMethodModal"
              class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Batal
            </button>
            <button
              @click="proceedMethod"
              :disabled="!selectedMethod"
              class="px-5 py-2 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              :class="selectedMethod === 'upload' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'"
            >
              <span>Lanjutkan</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- STEP 2: Form Upload -->
        <div v-if="modalStep === 'upload'" class="p-6 space-y-5">
          <div class="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <button @click="modalStep = 'choose'; selectedMethod = null" class="hover:text-blue-600 transition-colors flex items-center gap-1">
              <ArrowLeft class="w-3 h-3" />
              <span>Kembali</span>
            </button>
            <span class="text-slate-300">/</span>
            <span class="font-semibold text-slate-700">Upload Berkas</span>
          </div>

          <!-- File Drop Zone -->
          <div
            class="border-2 border-dashed rounded-2xl p-8 text-center transition-all"
            :class="uploadFile ? 'border-emerald-400 bg-emerald-50/60' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 bg-slate-50/50'"
            @dragover.prevent
            @drop.prevent="handleFileDrop"
          >
            <div v-if="!uploadFile" class="space-y-3">
              <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <UploadCloud class="w-6 h-6" />
              </div>
              <div>
                <div class="text-sm font-bold text-slate-700">Seret &amp; lepas berkas di sini</div>
                <div class="text-xs text-slate-400 mt-0.5">atau klik tombol di bawah untuk pilih berkas</div>
              </div>
              <div class="text-[11px] text-slate-400 font-medium">Format: PDF, DOCX &bull; Maks. 20 MB</div>
              <label class="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-blue-400 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors shadow-2xs">
                <FolderOpen class="w-4 h-4" />
                <span>Pilih Berkas</span>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  class="hidden"
                  @change="handleFileSelect"
                />
              </label>
            </div>

            <div v-else class="space-y-3">
              <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <FileCheck class="w-6 h-6" />
              </div>
              <div>
                <div class="text-sm font-bold text-slate-900">{{ uploadFile.name }}</div>
                <div class="text-xs text-slate-400 mt-0.5">{{ formatFileSize(uploadFile.size) }}</div>
              </div>
              <button @click="uploadFile = null" class="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors flex items-center gap-1 mx-auto">
                <X class="w-3.5 h-3.5" />
                <span>Hapus &amp; pilih ulang</span>
              </button>
            </div>
          </div>

          <div v-if="uploadError" role="alert" class="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
            {{ uploadError }}
          </div>

          <!-- Judul Dokumen -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">Judul Dokumen <span class="text-red-500">*</span></label>
            <input
              v-model="uploadTitle"
              type="text"
              :placeholder="`Contoh: ${selectedJenis} Dinas Kesehatan T.A. ${store.selectedTahun}`"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 transition-colors bg-white"
            />
          </div>

          <!-- Nomor Surat -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">Nomor Surat / BA / TTE <span class="text-slate-400 font-normal">(opsional)</span></label>
            <input
              v-model="uploadNomorSurat"
              type="text"
              placeholder="Contoh: 050/BA-012/DINKES/2025"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 transition-colors bg-white"
            />
          </div>

          <!-- Info -->
          <div v-if="!isInternalDocument" class="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <AlertCircle class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>Dokumen upload akan masuk ke draf dan perlu diverifikasi admin Bapperida sebelum masuk arsip resmi.</span>
          </div>
          <div v-else class="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800">
            Dokumen internal Bapperida. Untuk RKPD, Super Admin PPEPD menetapkan pegawai pada setiap bab.
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 pt-1">
            <button @click="closeMethodModal"
              class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Batal
            </button>
            <button
              @click="submitUpload"
              :disabled="!uploadFile || !uploadTitle.trim() || isUploading"
              class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg v-if="isUploading" class="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <UploadCloud v-else class="w-3.5 h-3.5" />
              <span>{{ isUploading ? 'Mengunggah...' : 'Kirim Dokumen' }}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import type { DocumentItem, DocumentType } from '../types';
import { apiFetch } from '../lib/api';
import { formatUserDate } from '../lib/userDateFormat';
import {
  Download,
  Plus,
  Folder,
  FileSpreadsheet,
  BookOpen,
  RefreshCw,
  Search,
  FileText,
  FileCheck,
  Upload,
  UploadCloud,
  Send,
  FolderOpen,
  Check,
  X,
  FileEdit,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  RotateCcw
} from '@lucide/vue';

const store = useAppStore();
const route = useRoute();
const router = useRouter();

type DocumentTab = 'renja' | 'renstra' | 'rkpd' | 'rpjmd' | 'evaluasiRenja' | 'evaluasiRkpd' | 'formatLampiran';
const activeTab = ref<DocumentTab>('renja');
const searchDraf = ref('');
const statusFilterDraf = ref('all');
const jenisFilter = ref('all');
const currentPage = ref(1);
const pageSize = 8;

// ============================================================
// Modal: Pilih Metode Buat Dokumen
// ============================================================
const showMethodModal = ref(false);
const modalStep = ref<'choose' | 'upload'>('choose');
const selectedJenis = ref<DocumentType | null>(null);
const selectedMethod = ref<'template' | 'upload' | null>(null);

// Upload form
const uploadFile = ref<File | null>(null);
const uploadError = ref('');
const uploadTitle = ref('');
const uploadNomorSurat = ref('');
const isUploading = ref(false);
const replacingSourceId = ref('');
const isSubmittingDocumentId = ref('');
const selectedOpdId = ref('');
const assignedOpds = ref<Array<{ id: string; nama: string }>>([]);

const isInternalDocument = computed(() => ['RKPD', 'RKPD Murni', 'RKPD Perubahan', 'RPJMD'].includes(selectedJenis.value || ''));
const selectableOpds = computed(() => store.isStaff
  ? assignedOpds.value
  : store.opds);

const openMethodModal = async (jenis: DocumentType) => {
  const targetYear = store.defaultDocumentYear(jenis);
  selectedJenis.value = jenis;
  selectedMethod.value = null;
  modalStep.value = 'choose';
  uploadFile.value = null;
  uploadTitle.value = '';
  uploadNomorSurat.value = '';
  selectedOpdId.value = store.isSuperAdmin
    ? store.opds.find(opd => opd.id === 'bapperida')?.id || store.opds[0]?.id || ''
    : store.currentUser?.opdId || '';
  if (store.isStaff && jenis.includes('Renja')) {
    const res = await apiFetch(`/api/staf/penugasan/saya?tahun=${targetYear}`);
    if (res.ok) {
      assignedOpds.value = await res.json();
      selectedOpdId.value = assignedOpds.value[0]?.id || '';
    }
  }
  showMethodModal.value = true;
};

const closeMethodModal = () => {
  showMethodModal.value = false;
  selectedMethod.value = null;
  modalStep.value = 'choose';
  uploadFile.value = null;
  uploadError.value = '';
};

const proceedMethod = () => {
  if (!selectedMethod.value || !selectedJenis.value) return;
  const targetOpdId = isInternalDocument.value
    ? 'bapperida'
    : store.isOpd ? store.currentUser?.opdId || '' : selectedOpdId.value;
  if (store.isBapperida && !isInternalDocument.value && !targetOpdId) {
    store.addToast('Pilih OPD yang termasuk penugasan Anda.', 'error');
    return;
  }
  if (selectedMethod.value === 'template') {
    closeMethodModal();
    store.createDocument({
      jenis: selectedJenis.value,
      tahun: store.defaultDocumentYear(selectedJenis.value),
      cara: 'template',
      opdId: targetOpdId
    }).then(doc => {
      router.push(`/editor/${doc.id}`);
    }).catch(() => { /* Error message is shown by the store. */ });
  } else {
    modalStep.value = 'upload';
    uploadTitle.value = `${selectedJenis.value} ${store.currentUser?.opdName || ''} T.A. ${store.defaultDocumentYear(selectedJenis.value)}`.trim();
  }
};

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    uploadFile.value = target.files[0];
    uploadError.value = '';
  }
};

const handleFileDrop = (e: DragEvent) => {
  const files = e.dataTransfer?.files;
  if (files && files[0]) {
    const file = files[0];
    if (file.name.match(/\.(pdf|docx)$/i)) {
      uploadFile.value = file;
      uploadError.value = '';
    } else {
      store.addToast('Format tidak didukung. Gunakan PDF atau DOCX.', 'error');
    }
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

const submitUpload = async () => {
  if (!uploadFile.value || !uploadTitle.value.trim() || !selectedJenis.value) return;
  isUploading.value = true;
  uploadError.value = '';
  try {
    const formData = new FormData();
    formData.append('jenis', selectedJenis.value);
    formData.append('tahun', store.defaultDocumentYear(selectedJenis.value));
    formData.append('cara', 'upload');
    formData.append('opdId', isInternalDocument.value ? 'bapperida' : store.isOpd ? store.currentUser?.opdId || '' : selectedOpdId.value);
    formData.append('judul', uploadTitle.value.trim());
    formData.append('file', uploadFile.value);
    if (uploadNomorSurat.value.trim()) {
      formData.append('nomorSurat', uploadNomorSurat.value.trim());
    }

    await store.createDocument(formData, true);
    closeMethodModal();
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : 'Unggahan gagal karena kesalahan yang tidak diketahui.';
    console.error('Failed to upload planning document:', error);
  } finally {
    isUploading.value = false;
  }
};

const renjaDocsCount = computed(() => {
  return planningDocuments.value.filter(d => d.jenis.includes('Renja') && yearMatches(d.tahun)).length;
});

const renstraDocsCount = computed(() => {
  return planningDocuments.value.filter(d => d.jenis.includes('Renstra') && yearMatches(d.tahun)).length;
});

const yearMatches = (year: string) => store.selectedTahun === 'all' || year === store.selectedTahun;
const rkpdDocsCount = computed(() => planningDocuments.value.filter(doc => doc.jenis.includes('RKPD') && yearMatches(doc.tahun)).length);
const rpjmdDocsCount = computed(() => planningDocuments.value.filter(doc => doc.jenis === 'RPJMD' && yearMatches(doc.tahun)).length);
const planningDocuments = computed(() => store.documents.filter(doc => !doc.isLampiranOtomatis));

const typeGroups: Record<string, string[]> = {
  renja: ['Renja Murni', 'Renja Perubahan'],
  renstra: ['Renstra Murni', 'Renstra Perubahan', 'Renstra'],
  rkpd: ['RKPD', 'RKPD Murni', 'RKPD Perubahan'],
  rpjmd: ['RPJMD']
};
const activeJenisLabel = computed(() => `Semua Jenis ${activeTab.value === 'renja' ? 'Renja' : activeTab.value === 'renstra' ? 'Renstra' : activeTab.value === 'rkpd' ? 'RKPD' : 'RPJMD'}`);
const jenisOptions = computed(() => typeGroups[activeTab.value] || []);

const setYearFilter = (event: Event) => {
  const year = (event.target as HTMLSelectElement).value;
  if (year && year !== store.selectedTahun) store.setSelectedTahun(year);
};

const resetFilters = () => {
  searchDraf.value = '';
  statusFilterDraf.value = 'all';
  jenisFilter.value = 'all';
};

const availableTabs = computed(() => store.isSuperAdmin ? [
  { id: 'renja' as const, label: 'Renja', icon: BookOpen, count: renjaDocsCount.value, activeText: 'text-blue-600', activeBadge: 'bg-blue-100 text-blue-700', activeBar: 'bg-blue-600' },
  { id: 'renstra' as const, label: 'Renstra', icon: FileSpreadsheet, count: renstraDocsCount.value, activeText: 'text-indigo-600', activeBadge: 'bg-indigo-100 text-indigo-700', activeBar: 'bg-indigo-600' },
  { id: 'rkpd' as const, label: 'RKPD', icon: FileSpreadsheet, count: rkpdDocsCount.value, activeText: 'text-indigo-600', activeBadge: 'bg-indigo-100 text-indigo-700', activeBar: 'bg-indigo-600' },
  { id: 'rpjmd' as const, label: 'RPJMD', icon: BookOpen, count: rpjmdDocsCount.value, activeText: 'text-emerald-600', activeBadge: 'bg-emerald-100 text-emerald-700', activeBar: 'bg-emerald-600' },
  { id: 'evaluasiRenja' as const, label: 'Evaluasi Renja', icon: FileSpreadsheet, count: 0, activeText: 'text-blue-600', activeBadge: 'bg-blue-100 text-blue-700', activeBar: 'bg-blue-600' },
  { id: 'evaluasiRkpd' as const, label: 'Evaluasi RKPD', icon: FileSpreadsheet, count: 0, activeText: 'text-blue-600', activeBadge: 'bg-blue-100 text-blue-700', activeBar: 'bg-blue-600' },
  { id: 'formatLampiran' as const, label: 'Format Lampiran', icon: FileCheck, count: 0, activeText: 'text-blue-600', activeBadge: 'bg-blue-100 text-blue-700', activeBar: 'bg-blue-600' }
] : store.isStaff ? [
  { id: 'renja' as const, label: 'Renja OPD', icon: Folder, count: renjaDocsCount.value, activeText: 'text-blue-600', activeBadge: 'bg-blue-100 text-blue-700', activeBar: 'bg-blue-600' },
  { id: 'rkpd' as const, label: 'RKPD ditugaskan', icon: FileSpreadsheet, count: rkpdDocsCount.value, activeText: 'text-indigo-600', activeBadge: 'bg-indigo-100 text-indigo-700', activeBar: 'bg-indigo-600' },
  { id: 'formatLampiran' as const, label: 'Format Lampiran', icon: FileCheck, count: 0, activeText: 'text-blue-600', activeBadge: 'bg-blue-100 text-blue-700', activeBar: 'bg-blue-600' }
] : [
  { id: 'renja' as const, label: 'Renja', icon: Folder, count: renjaDocsCount.value, activeText: 'text-blue-600', activeBadge: 'bg-blue-100 text-blue-700', activeBar: 'bg-blue-600' },
  { id: 'renstra' as const, label: 'Renstra', icon: FileSpreadsheet, count: renstraDocsCount.value, activeText: 'text-indigo-600', activeBadge: 'bg-indigo-100 text-indigo-700', activeBar: 'bg-indigo-600' },
  { id: 'evaluasiRenja' as const, label: 'Evaluasi Renja', icon: FileSpreadsheet, count: 0, activeText: 'text-blue-600', activeBadge: 'bg-blue-100 text-blue-700', activeBar: 'bg-blue-600' },
  { id: 'formatLampiran' as const, label: 'Format Lampiran', icon: FileCheck, count: 0, activeText: 'text-blue-600', activeBadge: 'bg-blue-100 text-blue-700', activeBar: 'bg-blue-600' }
]);

const syncTabFromRoute = () => {
  const tab = route.query.tab;
  activeTab.value = availableTabs.value.some(item => item.id === tab) ? tab as DocumentTab : 'renja';
};

const switchTab = (tab: DocumentTab) => {
  const routePath = tab === 'evaluasiRenja' ? '/evaluasi-renja-triwulan'
    : tab === 'evaluasiRkpd' ? '/evaluasi-rkpd-triwulan'
    : tab === 'formatLampiran' ? '/lampiran'
    : '';
  if (routePath) {
    void router.push(routePath);
    return;
  }
  jenisFilter.value = 'all';
  activeTab.value = tab;
  router.replace({ path: '/dokumen', query: { tab } });
};

onMounted(() => {
  syncTabFromRoute();
});

watch(() => route.query.tab, () => {
  syncTabFromRoute();
});

watch(() => store.currentUser?.role, () => {
  if (!availableTabs.value.some(tab => tab.id === activeTab.value)) switchTab('renja');
});

const displayedDocuments = computed(() => {
  let list = planningDocuments.value;

  // Filter based on activeTab
  if (activeTab.value === 'renja') {
    list = list.filter(d => d.jenis.includes('Renja'));
  } else if (activeTab.value === 'renstra') {
    list = list.filter(d => d.jenis.includes('Renstra'));
  } else if (activeTab.value === 'rkpd') {
    list = list.filter(d => d.jenis.includes('RKPD'));
  } else if (activeTab.value === 'rpjmd') {
    list = list.filter(d => d.jenis === 'RPJMD');
  } else {
    return [];
  }

  if (store.selectedTahun !== 'all') list = list.filter(d => d.tahun === store.selectedTahun);
  if (jenisFilter.value !== 'all') list = list.filter(d => d.jenis === jenisFilter.value);

  if (statusFilterDraf.value !== 'all') {
    list = list.filter(d => d.status === statusFilterDraf.value);
  }

  if (searchDraf.value.trim()) {
    const q = searchDraf.value.toLowerCase();
    list = list.filter(d =>
      d.judul.toLowerCase().includes(q) ||
      d.opdName.toLowerCase().includes(q) ||
      d.kodeDoc.toLowerCase().includes(q) ||
      (d.fileName || '').toLowerCase().includes(q)
    );
  }

  return list;
});



const totalPages = computed(() => Math.max(1, Math.ceil(displayedDocuments.value.length / pageSize)));
const paginatedDocuments = computed(() => displayedDocuments.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize));
watch([activeTab, searchDraf, statusFilterDraf, jenisFilter, () => store.selectedTahun], () => { currentPage.value = 1; });
watch(totalPages, pages => { currentPage.value = Math.min(currentPage.value, pages); });

function downloadRecap() {
  const rows = [['Nama Dokumen', 'Jenis', 'Tahun', 'Perangkat Daerah', 'Metode', 'Status', 'Pembaruan'],
    ...displayedDocuments.value.map(doc => [doc.judul, doc.jenis, doc.tahun, doc.opdName, doc.cara === 'template' ? 'Template Sistem' : 'Upload Mandiri', doc.status, formatDateTime(doc.updatedAt)])];
  const csv = '\uFEFF' + rows.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `Rekap-${activeTab.value}-${store.selectedTahun}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const getIconBgClass = (doc: DocumentItem) => {
  if (doc.isLampiranOtomatis) return 'bg-emerald-50 text-emerald-600';
  if (doc.cara === 'template') return 'bg-blue-50 text-blue-600';
  return 'bg-amber-50 text-amber-600';
};

const getMetodePill = (doc: DocumentItem) => {
  if (doc.isLampiranOtomatis) return 'bg-emerald-100 text-emerald-800';
  if (doc.cara === 'template') return 'bg-blue-100 text-blue-800';
  return 'bg-slate-100 text-slate-700';
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Draft': return 'bg-slate-100 text-slate-700 border border-slate-200';
    case 'Menunggu Verifikasi': return 'bg-amber-100 text-amber-800 border border-amber-200';
    case 'Perlu Revisi': return 'bg-red-100 text-red-800 border border-red-200';
    case 'Disetujui': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const getStatusDot = (status: string) => {
  switch (status) {
    case 'Menunggu Verifikasi': return 'bg-amber-500';
    case 'Perlu Revisi': return 'bg-red-500';
    case 'Disetujui': return 'bg-emerald-500';
    default: return 'bg-slate-400';
  }
};

const getActionButtonClass = (doc: DocumentItem) => {
  if (doc.status === 'Perlu Revisi') return 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200';
  if (doc.status === 'Menunggu Verifikasi') return 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200';
  if (doc.isLampiranOtomatis) return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200';
  return 'bg-slate-100 text-slate-700 hover:bg-slate-200';
};

const getActionButtonLabel = (doc: DocumentItem) => {
  if (doc.cara === 'template' && ['Draft', 'Perlu Revisi'].includes(doc.status) && doc.permissions?.canEdit) return 'Lanjutkan Draf';
  if (doc.status === 'Perlu Revisi') return 'Catatan';
  if (doc.status === 'Menunggu Verifikasi') return doc.permissions?.canVerify ? 'Review' : 'Lihat';
  if (doc.isLampiranOtomatis) return 'Buka Lampiran';
  return 'Lihat Naskah';
};

const handleDocAction = (doc: DocumentItem) => {
  if (doc.cara === 'template') {
    router.push(`/editor/${doc.id}`);
  } else if (!doc.fileName || !doc.filePath) {
    store.addToast('Berkas Renja belum tersimpan. Pilih tombol Unggah PDF/DOCX pada baris ini terlebih dahulu.', 'error');
  } else {
    window.open(doc.filePath, '_blank', 'noopener,noreferrer');
  }
};

const isUploadReady = (doc: DocumentItem) =>
  doc.cara !== 'upload' || Boolean(doc.fileName && doc.filePath);

const submitDraft = async (doc: DocumentItem) => {
  if (!store.isOpd || !['Draft', 'Perlu Revisi'].includes(doc.status) || !isUploadReady(doc) || isSubmittingDocumentId.value) return;
  isSubmittingDocumentId.value = doc.id;
  try {
    await store.submitDocument(doc.id);
  } catch {
    // The store presents API validation failures to the user.
  } finally {
    isSubmittingDocumentId.value = '';
  }
};

const needsUploadedSource = (doc: DocumentItem) =>
  store.isOpd &&
  doc.cara === 'upload' &&
  doc.status === 'Draft' &&
  !doc.fileName &&
  !doc.sections?.length &&
  ['Renja Murni', 'Renja Perubahan', 'Renstra', 'Renstra Murni', 'Renstra Perubahan'].includes(doc.jenis);

const replaceUploadedSource = async (event: Event, doc: DocumentItem) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!/\.(pdf|docx)$/i.test(file.name)) {
    store.addToast('Unggah PDF/DOCX yang memuat BAB I agar lampiran mengikuti dokumen asli.', 'error');
    input.value = '';
    return;
  }
  replacingSourceId.value = doc.id;
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiFetch(`/api/documents/${doc.id}/file`, { method: 'PUT', body: formData });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Layanan unggah tidak tersedia (HTTP ${response.status}). Coba muat ulang aplikasi.`);
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal memproses dokumen');
    await store.fetchDocuments();
    store.addToast(
      data.annexWarning || 'Dokumen tersimpan; lampiran mengikuti berkas asli mulai BAB I.',
      data.annexWarning ? 'info' : 'success'
    );
  } catch (error) {
    store.addToast(error instanceof Error ? error.message : 'Gagal memproses dokumen', 'error');
  } finally {
    input.value = '';
    replacingSourceId.value = '';
  }
};

const formatDateTime = (iso: string) => {
  return formatUserDate(iso, store.preferences, true) || 'Hari ini';
};

const lastEditedChapter = (doc: DocumentItem) => doc.sections
  ?.filter(section => section.lastEditedBy)
  .slice()
  .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0] || null;
</script>
