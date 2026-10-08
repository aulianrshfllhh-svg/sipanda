<template>
  <div class="planning-page space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">Dokumen Perencanaan</h1>
          <span class="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">SIPANDA</span>
        </div>
        <p class="mt-1 text-xs text-slate-500">Pengelolaan naskah dan draf dokumen perencanaan</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button @click="downloadRecap" class="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-blue-50">
          <Download class="h-3.5 w-3.5" /> Unduh Rekap
        </button>
        <button @click="store.showCreateModal = true" class="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700">
          <Plus class="h-3.5 w-3.5" /> Buat Dokumen
        </button>
      </div>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-blue-100 p-1" role="tablist" aria-label="Jenis dokumen">
        <button v-for="tab in availableTabs" :key="tab.id" @click="switchTab(tab.id)" role="tab" :aria-selected="activeTab === tab.id"
          class="rounded-lg px-3 py-1.5 text-xs transition-colors"
          :class="activeTab === tab.id ? 'bg-white font-semibold text-blue-700' : 'text-slate-600 hover:bg-white/50'">
          {{ tab.label }} <span class="ml-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px]">{{ tab.count }}</span>
        </button>
      </div>
      <p v-if="activeTab === 'renja'" class="flex items-center gap-1.5 text-[10px] text-slate-600"><span class="h-1.5 w-1.5 rounded-full bg-blue-600"></span>Modul penyusunan Rencana Kerja</p>
    </div>

    <div v-if="activeTab === 'renja'" class="planning-cards grid grid-cols-1 gap-3 md:grid-cols-2">
      <div class="rounded-xl border border-white bg-white p-3 transition-colors hover:border-blue-300">
        <div class="mb-2 flex items-center justify-between">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <BookOpen class="h-5 w-5" />
          </div>
          <span class="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            TA {{ store.defaultDocumentYear('Renja Murni') }}
          </span>
        </div>
        <h2 class="text-sm font-semibold text-slate-900">Renja Murni</h2>
        <button
          @click="openMethodModal('Renja Murni')"
          class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-blue-500/10 transition-colors hover:bg-blue-700"
        >
          <Plus class="h-4 w-4" />
          <span>Buat Dokumen</span>
        </button>
      </div>

      <div class="rounded-xl border border-white bg-white p-3 transition-colors hover:border-amber-300">
        <div class="mb-2 flex items-center justify-between">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
            <RefreshCw class="h-5 w-5" />
          </div>
          <span class="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">
            TA {{ store.defaultDocumentYear('Renja Perubahan') }}
          </span>
        </div>
        <h2 class="text-sm font-semibold text-slate-900">Renja Perubahan</h2>
        <button
          @click="openMethodModal('Renja Perubahan')"
          class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-[11px] font-bold text-blue-700  transition-colors hover:bg-blue-200"
        >
          <Plus class="h-4 w-4" />
          <span>Buat Dokumen</span>
        </button>
      </div>

    </div>

    <div v-else-if="activeTab === 'renstra'" class="planning-cards grid grid-cols-1 gap-3 md:grid-cols-2">
      <div class="rounded-xl border border-white bg-white p-3 transition-colors hover:border-blue-300">
        <div class="mb-2 flex items-center justify-between">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <BookOpen class="h-5 w-5" />
          </div>
          <span class="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            Dokumen Induk 5 Tahunan
          </span>
        </div>
        <h2 class="text-sm font-semibold text-slate-900">Renstra Murni</h2>
        <button
          @click="openMethodModal('Renstra Murni')"
          class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-blue-500/10 transition-colors hover:bg-blue-700"
        >
          <Plus class="h-4 w-4" />
          <span>Buat Dokumen Renstra Murni</span>
        </button>
      </div>

      <div class="rounded-xl border border-white bg-white p-3 transition-colors hover:border-amber-300">
        <div class="mb-2 flex items-center justify-between">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
            <RefreshCw class="h-5 w-5" />
          </div>
          <span class="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">
            Penyesuaian Renstra
          </span>
        </div>
        <h2 class="text-sm font-semibold text-slate-900">Renstra Perubahan</h2>
        <button
          @click="openMethodModal('Renstra Perubahan')"
          class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-blue-500/10 transition-colors hover:bg-blue-700"
        >
          <Plus class="h-4 w-4" />
          <span>Buat Dokumen Renstra Perubahan</span>
        </button>
      </div>
    </div>

    <div v-else-if="activeTab === 'rkpd'" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div v-for="jenis in ['RKPD Murni', 'RKPD Perubahan']" :key="jenis" class="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
        <div>
          <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
            <FileSpreadsheet class="w-5 h-5" />
          </div>
          <h2 class="text-base font-bold text-slate-900">{{ jenis }}</h2>
          <p class="text-xs text-slate-500 mt-1">Dokumen perencanaan pembangunan pemerintah daerah.</p>
        </div>
        <button v-if="store.isSuperAdmin" @click="openMethodModal(jenis as DocumentType)" class="w-full mt-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold">
          Buat {{ jenis }}
        </button>
        <p v-else class="mt-6 text-xs text-indigo-700">Bab RKPD hanya dapat diedit sesuai penugasan PPEPD.</p>
      </div>
    </div>

    <div v-else-if="activeTab === 'rpjmd'" class="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-base font-bold text-slate-900">Rencana Pembangunan Jangka Menengah Daerah</h2>
        <p class="text-xs text-slate-500 mt-1">Dokumen strategis pembangunan daerah lima tahunan.</p>
      </div>
      <button @click="openMethodModal('RPJMD')" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0">
        Buat RPJMD
      </button>
    </div>

    <!-- Table Section: Daftar Draf Dokumen -->
    <div class="overflow-hidden rounded-2xl bg-white">
      <div class="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-base font-bold text-slate-900">Daftar Draf Dokumen</h2>
            <span class="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {{ displayedDocuments.length }} Berkas Aktif
            </span>
          </div>
          <p class="mt-1 text-[11px] text-slate-500">
            Draf tersimpan di server untuk akun OPD ini. Keluar dari aplikasi tidak menghapus dokumen; pilih “Lanjutkan Draf” untuk membukanya kembali.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="relative w-full sm:w-48">
            <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchDraf"
              type="text"
              placeholder="Cari dokumen..."
              class="w-full pl-9 pr-3 py-1.5 bg-indigo-50 border border-transparent rounded-xl text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          </div>

          <select
            v-model="statusFilterDraf"
            class="px-3 py-1.5 bg-indigo-50 border border-transparent rounded-xl text-xs text-slate-700 font-medium outline-none focus:border-blue-500"
          >
            <option value="all">Semua Status</option>
            <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
            <option value="Perlu Revisi">Perlu Revisi</option>
            <option value="Disetujui">Disetujui</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      <!-- Table View Matching Screenshot 2 & 3 -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-indigo-50 text-slate-500 font-medium uppercase tracking-wider text-[10px]">
              <th class="py-3 px-4">Nama Dokumen</th>
              <th class="py-3 px-4">Metode</th>
              <th v-if="!store.isOpd" class="py-3 px-4">Perangkat Daerah</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Pembaruan</th>
              <th class="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="doc in paginatedDocuments"
              :key="doc.id"
              class="hover:bg-slate-50/70 transition-colors"
            >
              <!-- Nama Dokumen -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
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
                    <div class="text-[10px] text-slate-400 mt-0.5">
                      {{ doc.kodeDoc }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- Metode Asal -->
              <td class="py-3.5 px-4">
                <span
                  class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold"
                  :class="getMetodePill(doc)"
                >
                  {{ doc.isLampiranOtomatis ? 'Kompilasi Otomatis' : (doc.cara === 'template' ? 'Template Sistem' : 'Upload Mandiri') }}
                </span>
              </td>

              <!-- Perangkat Daerah -->
              <td v-if="!store.isOpd" class="py-3.5 px-4 font-semibold text-slate-800">
                {{ doc.opdName }}
              </td>

              <!-- Status Verifikasi -->
              <td class="py-3.5 px-4">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                  :class="getStatusBadgeClass(doc.status)"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="getStatusDot(doc.status)"></span>
                  <span>{{ doc.status }}</span>
                </span>
              </td>

              <!-- Pembaruan -->
              <td class="py-3.5 px-4 text-slate-500 text-[11px]">
                {{ formatDateTime(doc.updatedAt) }}
              </td>

              <!-- Aksi -->
              <td class="py-3.5 px-4 text-center">
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
                    class="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
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
            <tr v-if="!displayedDocuments.length"><td :colspan="store.isOpd ? 5 : 6" class="px-4 py-10 text-center text-slate-500">{{ searchDraf || statusFilterDraf !== 'all' ? 'Tidak ada dokumen yang sesuai dengan pencarian.' : 'Belum ada draf dokumen. Pilih Buat Dokumen untuk mulai menyusun.' }}</td></tr>
          </tbody>
        </table>

        <div class="flex min-w-[540px] items-center justify-between gap-3 bg-indigo-50 px-4 py-3 text-[10px] text-slate-600">
          <span>Menampilkan {{ paginatedDocuments.length }} dari {{ displayedDocuments.length }} total berkas</span>
          <div class="flex items-center gap-1">
            <button @click="currentPage--" :disabled="currentPage === 1" class="rounded-lg px-2 py-1 disabled:opacity-40">Sebelumnya</button>
            <span class="rounded-lg bg-blue-600 px-2.5 py-1 text-white">{{ currentPage }}</span>
            <span class="px-1">/ {{ totalPages }}</span>
            <button @click="currentPage++" :disabled="currentPage === totalPages" class="rounded-lg px-2 py-1 disabled:opacity-40">Selanjutnya</button>
          </div>
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
  AlertCircle
} from '@lucide/vue';

const store = useAppStore();
const route = useRoute();
const router = useRouter();

type DocumentTab = 'renja' | 'renstra' | 'rkpd' | 'rpjmd';
const activeTab = ref<DocumentTab>('renja');
const searchDraf = ref('');
const statusFilterDraf = ref('all');
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
  return planningDocuments.value.filter(d => d.jenis.includes('Renja')).length;
});

const renstraDocsCount = computed(() => {
  return planningDocuments.value.filter(d => d.jenis.includes('Renstra')).length;
});

const rkpdDocsCount = computed(() => planningDocuments.value.filter(doc => doc.jenis.includes('RKPD')).length);
const rpjmdDocsCount = computed(() => planningDocuments.value.filter(doc => doc.jenis === 'RPJMD').length);
const planningDocuments = computed(() => store.documents.filter(doc =>
  !doc.isLampiranOtomatis &&
  (!store.isSuperAdmin || doc.opdId === (store.currentUser?.opdId || 'bapperida'))
));

const availableTabs = computed(() => store.isSuperAdmin ? [
  { id: 'renja' as const, label: 'Renja OPD', icon: Folder, count: renjaDocsCount.value, activeText: 'text-blue-600', activeBadge: 'bg-blue-100 text-blue-700', activeBar: 'bg-blue-600' },
  { id: 'renstra' as const, label: 'Renstra', icon: FileSpreadsheet, count: renstraDocsCount.value, activeText: 'text-indigo-600', activeBadge: 'bg-indigo-100 text-indigo-700', activeBar: 'bg-indigo-600' },
  { id: 'rkpd' as const, label: 'RKPD', icon: FileSpreadsheet, count: rkpdDocsCount.value, activeText: 'text-indigo-600', activeBadge: 'bg-indigo-100 text-indigo-700', activeBar: 'bg-indigo-600' },
  { id: 'rpjmd' as const, label: 'RPJMD', icon: BookOpen, count: rpjmdDocsCount.value, activeText: 'text-emerald-600', activeBadge: 'bg-emerald-100 text-emerald-700', activeBar: 'bg-emerald-600' }
] : store.isStaff ? [
  { id: 'renja' as const, label: 'Renja OPD', icon: Folder, count: renjaDocsCount.value, activeText: 'text-blue-600', activeBadge: 'bg-blue-100 text-blue-700', activeBar: 'bg-blue-600' },
  { id: 'rkpd' as const, label: 'RKPD ditugaskan', icon: FileSpreadsheet, count: rkpdDocsCount.value, activeText: 'text-indigo-600', activeBadge: 'bg-indigo-100 text-indigo-700', activeBar: 'bg-indigo-600' }
] : [
  { id: 'renja' as const, label: 'Renja', icon: Folder, count: renjaDocsCount.value, activeText: 'text-blue-600', activeBadge: 'bg-blue-100 text-blue-700', activeBar: 'bg-blue-600' },
  { id: 'renstra' as const, label: 'Renstra', icon: FileSpreadsheet, count: renstraDocsCount.value, activeText: 'text-indigo-600', activeBadge: 'bg-indigo-100 text-indigo-700', activeBar: 'bg-indigo-600' }
]);

const syncTabFromRoute = () => {
  const tab = route.query.tab;
  activeTab.value = availableTabs.value.some(item => item.id === tab) ? tab as DocumentTab : 'renja';
};

const switchTab = (tab: DocumentTab) => {
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
  } else {
    list = list.filter(d => d.jenis === 'RPJMD');
  }

  if (statusFilterDraf.value !== 'all') {
    list = list.filter(d => d.status === statusFilterDraf.value);
  }

  if (searchDraf.value.trim()) {
    const q = searchDraf.value.toLowerCase();
    list = list.filter(d =>
      d.judul.toLowerCase().includes(q) ||
      d.opdName.toLowerCase().includes(q) ||
      d.kodeDoc.toLowerCase().includes(q)
    );
  }

  return list;
});



const totalPages = computed(() => Math.max(1, Math.ceil(displayedDocuments.value.length / pageSize)));
const paginatedDocuments = computed(() => displayedDocuments.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize));
watch([activeTab, searchDraf, statusFilterDraf, () => store.selectedTahun], () => { currentPage.value = 1; });
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
</script>
