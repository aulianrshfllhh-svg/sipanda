<template>
  <div class="min-h-screen bg-slate-200/80 flex flex-col font-sans select-none">
    <!-- Top Action Bar -->
    <header class="h-16 bg-white border-b border-slate-300 px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      <div class="flex items-center gap-4">
        <button
          @click="goBack"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <div class="h-6 w-px bg-slate-200"></div>

        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-sm font-bold text-slate-900 truncate max-w-md">
              {{ currentDoc?.judul || 'Editor Dokumen' }}
            </h1>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="statusBadgeClass">
              {{ currentDoc?.status }}
            </span>
            <span v-if="currentDoc?.isLampiranOtomatis" class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              Kompilasi Otomatis
            </span>
            <span v-if="isRkpdDocument" class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              Editor Multi-Penulis
            </span>
          </div>
          <div class="text-[11px] text-slate-500 font-medium">
            {{ currentDoc?.opdName }} &bull; T.A. {{ currentDoc?.tahun }} &bull; {{ currentDoc?.cara === 'upload' ? 'Berkas Asli' : 'Template Dokumen Berversi' }}
          </div>
        </div>
      </div>

      <!-- Center Autosave Status -->
      <div class="flex items-center gap-2 text-xs">
        <span class="w-2 h-2 rounded-full" :class="isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'"></span>
        <span class="text-slate-500 font-medium text-[11px]">
          {{ currentDoc?.cara === 'upload' ? 'Telaah naskah · file sumber tetap utuh' : isSaving ? 'Menyimpan perubahan...' : 'Tersimpan otomatis di cloud SIPANDA' }}
        </span>
      </div>

      <!-- Right Action Controls -->
      <div class="flex items-center gap-2.5">
        <button
          @click="previewDocument"
          :disabled="exporting"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors shadow-2xs disabled:opacity-50"
          :title="currentDoc?.cara === 'upload' ? 'Buka berkas sumber asli' : 'Pratinjau halaman dengan nomor dan daftar isi'"
        >
          <Eye class="w-4 h-4" />
          <span>{{ currentDoc?.cara === 'upload' ? 'Telaah Naskah' : 'Pratinjau' }}</span>
        </button>
        <!-- Print / PDF -->
        <button
          v-if="currentDoc?.cara !== 'upload'"
          @click="printDocument"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs"
          title="Cetak atau Simpan sebagai PDF Baku"
        >
          <Printer class="w-4 h-4 text-slate-600" />
          <span>Cetak / PDF</span>
        </button>

        <!-- Export DOCX -->
        <button
          v-if="currentDoc?.cara !== 'upload'"
          @click="exportDocx"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shadow-2xs"
          title="Unduh File DOCX Baku"
        >
          <Download class="w-4 h-4 text-blue-600" />
          <span>DOCX Tata Letak Tetap</span>
        </button>

        <button v-if="currentDoc?.cara !== 'upload'" @click="downloadDocument('docx-editable')" :disabled="exporting" class="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-xl" title="Teks dan tabel dapat diedit di Word; tata letak dapat menyesuaikan">DOCX Dapat Diedit</button>
        <!-- Admin Verification Controls -->
        <template v-if="currentDoc?.permissions?.canVerify">
          <button
            @click="currentDoc?.cara === 'upload' ? focusReviewNotes() : openVerifyModal()"
            class="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-500/20"
          >
            <CheckCircle class="w-4 h-4" />
            <span>Verifikasi Naskah</span>
          </button>
        </template>

        <!-- OPD Submit Controls -->
        <template v-else-if="store.isOpd">
          <button
            v-if="currentDoc?.permissions?.canEdit && (currentDoc?.status === 'Draft' || currentDoc?.status === 'Perlu Revisi')"
            @click="validateAndSubmit"
            class="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-500/20"
          >
            <Send class="w-4 h-4" />
            <span>{{ currentDoc?.status === 'Perlu Revisi' ? 'Ajukan Ulang ke Admin' : 'Ajukan ke Admin' }}</span>
          </button>
          <div v-else class="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
            <Check class="w-4 h-4" />
            <span>{{ currentDoc?.permissions?.canEdit ? 'Terkunci (Sedang Diverifikasi / Sah)' : 'Hanya dapat melihat' }}</span>
          </div>
        </template>
        <div v-else-if="store.isStaff" class="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">
          {{ currentDoc?.permissions?.canEdit ? 'Bab RKPD sesuai penugasan dapat diedit' : 'Mode baca: tidak ada bab yang ditugaskan' }}
        </div>
      </div>
    </header>

    <!-- Word-Like Minimalist Locked Toolbar -->
    <div v-if="currentDoc?.cara !== 'upload'" class="h-12 bg-white border-b border-slate-300 px-6 flex items-center justify-between sticky top-16 z-30 shadow-2xs no-print">
      <!-- Formatting tools -->
      <div class="flex items-center gap-1">
        <!-- Font Spec Pill (Locked) -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 text-xs font-semibold mr-2 border border-slate-200" title="Format font dikunci standar resmi daerah">
          <Lock class="w-3 h-3 text-slate-400" />
          <span>Bookman Old Style 12pt (Baku)</span>
        </div>

        <div class="h-5 w-px bg-slate-200 mx-1"></div>

        <!-- Text formatting -->
        <button
          @mousedown.prevent @click="execCommand('bold')"
          class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
          title="Tebal (Ctrl+B)"
        >
          <Bold class="w-4 h-4" />
        </button>
        <button
          @mousedown.prevent @click="execCommand('italic')"
          class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
          title="Miring (Ctrl+I)"
        >
          <Italic class="w-4 h-4" />
        </button>
        <button
          @mousedown.prevent @click="execCommand('underline')"
          class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
          title="Garis Bawah (Ctrl+U)"
        >
          <Underline class="w-4 h-4" />
        </button>

        <div class="h-5 w-px bg-slate-200 mx-1"></div>

        <!-- Alignments -->
        <button
          @mousedown.prevent @click="execCommand('justifyLeft')"
          class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
          title="Rata Kiri"
        >
          <AlignLeft class="w-4 h-4" />
        </button>
        <button
          @mousedown.prevent @click="execCommand('justifyCenter')"
          class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
          title="Rata Tengah"
        >
          <AlignCenter class="w-4 h-4" />
        </button>
        <button
          @mousedown.prevent @click="execCommand('justifyRight')"
          class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
          title="Rata Kanan"
        >
          <AlignRight class="w-4 h-4" />
        </button>
        <button
          @mousedown.prevent @click="execCommand('justifyFull')"
          class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
          title="Rata Kiri Kanan (Justify Baku)"
        >
          <AlignJustify class="w-4 h-4" />
        </button>

        <div class="h-5 w-px bg-slate-200 mx-1"></div>

        <!-- Lists -->
        <button
          @mousedown.prevent @click="execCommand('insertUnorderedList')"
          class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
          title="Daftar Poin"
        >
          <List class="w-4 h-4" />
        </button>
        <button
          @mousedown.prevent @click="execCommand('insertOrderedList')"
          class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
          title="Daftar Angka"
        >
          <ListOrdered class="w-4 h-4" />
        </button>

        <div class="h-5 w-px bg-slate-200 mx-1"></div>

        <!-- Table & Image Insertions -->
        <button
          @mousedown.prevent @click="insertTable"
          class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
          title="Sisipkan Tabel Standar Permendagri"
        >
          <TableIcon class="w-3.5 h-3.5 text-blue-600" />
          <span>Sisipkan Tabel</span>
        </button>

        <button
          @mousedown.prevent @click="openImageModal"
          class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
          title="Sisipkan Gambar dengan Caption"
        >
          <ImageIcon class="w-3.5 h-3.5 text-emerald-600" />
          <span>Sisipkan Gambar</span>
        </button>

        <button
          @mousedown.prevent @click="insertCaption"
          class="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
          title="Tambah Teks Caption Tabel/Gambar Otomatis"
        >
          <Type class="w-3.5 h-3.5 text-indigo-600" />
          <span>+ Caption</span>
        </button>
      </div>

      <!-- Zoom controls & View -->
      <div class="flex items-center gap-2 text-xs text-slate-500">
        <button @click="zoom = Math.max(70, zoom - 10)" class="p-1 hover:bg-slate-100 rounded">
          <Minus class="w-3.5 h-3.5" />
        </button>
        <span class="font-mono font-medium">{{ zoom }}%</span>
        <button @click="zoom = Math.min(130, zoom + 10)" class="p-1 hover:bg-slate-100 rounded">
          <Plus class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Active Catatan Revisi Alert if status === 'Perlu Revisi' -->
    <div v-if="currentDoc?.status === 'Perlu Revisi' && currentDoc?.catatanRevisi" class="bg-amber-500 text-white px-6 py-2.5 flex items-center justify-between text-xs font-medium shadow-inner no-print">
      <div class="flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 shrink-0" />
        <span><strong>Catatan Verifikator Bapperida ({{ currentDoc.verifierName }}):</strong> {{ currentDoc.catatanRevisi }}</span>
      </div>
      <span class="text-[11px] bg-amber-600 px-2 py-0.5 rounded font-bold uppercase">Wajib Diperbaiki</span>
    </div>

    <div v-if="currentDoc?.cara !== 'upload'" class="bg-white border-b px-6 py-2 flex gap-4 items-center text-xs no-print">
      <button @click="previewDocument" :disabled="exporting" class="text-blue-700 font-bold">
        Pratinjau Halaman
      </button>
      <span v-if="currentDoc?.templateSnapshot">{{ currentDoc.templateSnapshot.nama }} ? versi {{ currentDoc.templateSnapshot.versi }}</span>
      <span v-if="exporting">Menyiapkan dokumen?</span>
      <span class="text-slate-500">DOCX menyimpan gambar tiap halaman agar tata letak tetap sama. Edit isi melalui SIPANDA.</span>
    </div>
    <!-- Workspace Container (Sidebar Navigation + A4 Canvas) -->
    <div v-if="currentDoc?.cara !== 'upload'" class="flex-1 flex overflow-hidden">
      <!-- Left Outline & Navigation Sidebar -->
      <aside class="w-72 bg-white border-r border-slate-300 flex flex-col h-[calc(100vh-7rem)] overflow-y-auto shrink-0 no-print">
        <div class="p-4 border-b border-slate-100 bg-slate-50/50">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Sistematika Bab</span>
            <span class="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {{ completionPercent }}% Lengkap
            </span>
          </div>
          <!-- Progress bar -->
          <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div class="h-full bg-blue-600 rounded-full transition-all duration-300" :style="{ width: `${completionPercent}%` }"></div>
          </div>
        </div>

        <section v-if="isRkpdDocument" class="p-3 border-b border-slate-200 space-y-2.5">
          <h2 class="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Penugasan per Bab</h2>
          <template v-if="store.isSuperAdmin">
            <select v-model="selectedBabId" class="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-[11px]">
              <option value="">Pilih bab</option>
              <option v-for="bab in currentDoc?.sections || []" :key="bab.id" :value="bab.id">{{ bab.title }}</option>
            </select>
            <select v-model="selectedStaffId" class="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-[11px]">
              <option value="">Pilih pegawai Bapperida</option>
              <option v-for="staff in staffMembers" :key="staff.id" :value="staff.id">{{ staff.name }}</option>
            </select>
            <button @click="assignChapter" :disabled="!selectedBabId || !selectedStaffId" class="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-[11px] font-bold">
              Tugaskan Bab
            </button>
          </template>
          <p v-else-if="store.isStaff" class="text-[10px] text-slate-500 leading-relaxed">
            Bab yang ditugaskan dapat diedit. Bab lain tetap dapat dibaca.
          </p>
          <div v-if="chapterAssignments.length" class="space-y-1.5 pt-1">
            <div v-for="assignment in chapterAssignments" :key="assignment.id" class="flex items-start justify-between gap-2 text-[10px] bg-slate-50 border border-slate-200 rounded-lg p-2">
              <span class="min-w-0"><strong class="text-slate-800">{{ assignment.babTitle }}</strong><span class="block text-slate-500">{{ assignment.userName }}</span></span>
              <button v-if="store.isSuperAdmin" @click="removeChapterAssignment(assignment.id)" class="text-red-600 hover:text-red-800 font-bold shrink-0" :aria-label="`Hapus penugasan ${assignment.babTitle}`">Hapus</button>
            </div>
          </div>
        </section>

        <!-- Navigation List -->
        <nav class="p-3 space-y-3 text-xs">
          <!-- Non-Lampiran shows Cover & TOC links -->
          <template v-if="!currentDoc?.isLampiranOtomatis">
            <div class="space-y-1">
              <a href="#page-cover" class="block py-2 px-2.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold transition-colors flex items-center justify-between border border-transparent hover:border-slate-200">
                <span class="truncate">Halaman Sampul (Cover)</span>
                <Lock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </a>
              <a href="#page-toc" class="block py-2 px-2.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold transition-colors flex items-center justify-between border border-transparent hover:border-slate-200">
                <span class="truncate">Daftar Isi & Tabel Otomatis</span>
                <Sparkles class="w-3.5 h-3.5 text-blue-500 shrink-0" />
              </a>
            </div>
          </template>

          <!-- Grouped Chapters with Progress & Clear Visual Status -->
          <div
            v-for="bab in currentDoc?.sections"
            :key="bab.id"
            class="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs"
          >
            <!-- Bab Header with Progress Badge -->
            <div class="p-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between gap-2">
              <a :href="`#${bab.id}`" class="font-bold text-slate-800 hover:text-blue-600 truncate text-[11px] flex-1 leading-snug" :title="bab.title">
                {{ bab.title }}
              </a>
              <!-- Bab Completion Badge -->
              <span
                class="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1"
                :class="getBabStats(bab).isComplete ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'"
              >
                <Check v-if="getBabStats(bab).isComplete" class="w-2.5 h-2.5 stroke-[3]" />
                {{ getBabStats(bab).filled }}/{{ getBabStats(bab).total }} Selesai
              </span>
            </div>

            <!-- Mini Progress Bar on Each Bab Header -->
            <div class="w-full h-1 bg-slate-100">
              <div
                class="h-full transition-all duration-300"
                :class="getBabStats(bab).isComplete ? 'bg-emerald-500' : 'bg-blue-500'"
                :style="{ width: `${getBabStats(bab).percent}%` }"
              ></div>
            </div>

            <!-- Subsections List with Looser Spacing & Strong Contrast Badges -->
            <div class="p-2 space-y-1.5 bg-white">
              <a
                v-for="sub in bab.subsections"
                :key="sub.id"
                :href="`#${sub.id}`"
                class="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg text-slate-700 hover:bg-blue-50/70 hover:text-blue-700 transition-all group border border-transparent hover:border-blue-100"
              >
                <div class="flex items-baseline gap-1.5 truncate">
                  <span class="font-mono text-[10px] font-bold text-slate-400 group-hover:text-blue-600 shrink-0">
                    {{ sub.code }}
                  </span>
                  <span class="truncate text-[11px] font-medium leading-tight">
                    {{ sub.title }}
                  </span>
                </div>

                <!-- High Contrast Visual Status (Pill Centang Hijau vs Titik Kosong) -->
                <span
                  v-if="isSectionFilled(sub.content)"
                  class="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded shadow-2xs shrink-0"
                  title="Bagian ini sudah terisi narasi"
                >
                  <Check class="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                  <span>Terisi</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded shrink-0"
                  title="Bagian ini masih kosong/belum tuntas"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span>Kosong</span>
                </span>
              </a>
            </div>
          </div>
        </nav>
      </aside>

      <!-- Center Document Canvas (Scrollable with contrast background) -->
      <main class="flex-1 overflow-y-auto py-10 px-8 flex flex-col items-center bg-slate-200/90" id="printable-canvas">
        <div :style="{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }" class="transition-transform duration-150">
          
          <!-- ================= PAGE 1: COVER OTOMATIS (Hidden if Lampiran Renja) ================= -->
          <section v-if="!currentDoc?.isLampiranOtomatis" id="page-cover" class="a4-page flex flex-col justify-between text-center select-text relative">
            <!-- Locked Badge on Cover -->
            <div class="absolute top-4 right-4 text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-500 font-mono no-print">
              🔒 Format Sampul Baku Baku Terkunci
            </div>

            <!-- Top Header -->
            <div class="pt-6">
              <h2 class="text-xl font-bold tracking-wider text-slate-900 mb-1 font-serif">PEMERINTAH KABUPATEN CIREBON</h2>
              <div class="w-24 h-0.5 bg-slate-900 mx-auto mt-2"></div>
            </div>

            <!-- Center Logo & Title -->
            <div class="my-auto py-8">
              <div class="flex justify-center mb-8">
                <KabCirebonLogo :width="115" :height="138" />
              </div>

              <h1 class="text-2xl font-black uppercase tracking-wide text-slate-900 mb-3 font-serif">
                {{ currentDoc?.jenis?.includes('RKPD') ? 'RENCANA KERJA PEMERINTAH DAERAH (RKPD)' : currentDoc?.jenis === 'RPJMD' ? 'RENCANA PEMBANGUNAN JANGKA MENENGAH DAERAH (RPJMD)' : (currentDoc?.jenis?.includes('Perubahan') ? 'PERUBAHAN RENCANA KERJA (RENJA)' : 'RENCANA KERJA (RENJA)') }}
              </h1>

              <div class="text-lg font-bold uppercase text-slate-800 tracking-wider mb-2 font-serif">
                {{ currentDoc?.jenis }}
              </div>

              <div class="text-xl font-extrabold text-blue-900 font-serif">
                {{ documentOpdName }} TAHUN {{ currentDoc?.tahun }}
              </div>
            </div>

            <!-- Bottom OPD Name & Location -->
            <div class="pb-10">
              <h3 class="text-lg font-bold uppercase tracking-wider text-slate-900 font-serif mb-1">
                {{ documentOpdName }}
              </h3>
              <p class="text-xs text-slate-600 font-serif">
                Kabupaten Cirebon<br />{{ currentDoc?.documentSettings?.opd.alamat || '[Alamat OPD belum diisi di Pengaturan]' }}
              </p>
              <div class="text-sm font-bold text-slate-800 mt-4 font-serif">
                SUMBER &bull; {{ currentDoc?.tahun }}
              </div>
            </div>

            <!-- Cover Footer Numbering -->
            <div class="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-400 font-serif">
              - i -
            </div>
          </section>

          <section v-if="currentDoc && !currentDoc.isLampiranOtomatis" id="page-preface" class="a4-page">
            <h2 class="text-center font-bold mb-8">KATA PENGANTAR</h2>
            <div class="ProseMirror" :contenteditable="canEditSection(currentDoc?.sections?.[0]?.id || '')" @input="handlePreface" v-html="currentDoc.frontMatter?.preface || defaultPreface"></div>
            <div class="mt-12 ml-auto w-64 text-center">
              <p>{{ currentDoc.documentSettings?.opd.tempat }}, {{ currentDoc.documentSettings?.opd.bulan || '................' }}</p>
              <p>{{ currentDoc.documentSettings?.opd.jabatan || '[Jabatan pimpinan]' }}</p><br/><br/>
              <p>{{ currentDoc.documentSettings?.opd.pimpinan || '[Nama pimpinan]' }}</p>
              <p>{{ currentDoc.documentSettings?.opd.pangkat }}</p><p>NIP {{ currentDoc.documentSettings?.opd.nip || '................' }}</p>
            </div>
            <div class="absolute bottom-4 left-0 right-0 text-center">ii</div>
          </section>
          <section v-if="!currentDoc?.isLampiranOtomatis" id="page-toc" class="a4-page">
            <h2 class="font-bold text-center mb-8">DAFTAR ISI</h2>
            <p class="text-xs text-blue-600 no-print mb-4">Nomor halaman dihitung pada Pratinjau Halaman dan ekspor setelah penyimpanan.</p>
            <div v-for="bab in currentDoc?.sections" :key="bab.id" class="mb-3">
              <p class="font-bold">{{ bab.title }}</p>
              <p v-for="sub in bab.subsections" :key="sub.id" class="pl-4 text-sm">{{ sub.code }} {{ sub.title }}</p>
            </div>
          </section>
          <section v-for="kind in ['Tabel','Gambar']" v-show="!currentDoc?.isLampiranOtomatis" :key="kind" class="a4-page">
            <h2 class="font-bold text-center mb-8">DAFTAR {{ kind.toUpperCase() }}</h2>
            <p v-for="caption in documentCaptions.filter(c => c.kind===kind)" :key="caption.label" class="text-sm mb-3">{{ caption.label }}</p>
            <p v-if="!documentCaptions.some(c=>c.kind===kind)" class="text-sm">Belum ada {{ kind.toLowerCase() }}.</p>
          </section>
          <section v-if="currentDoc?.isLampiranOtomatis && store.isSuperAdmin" class="bg-white p-5 mb-4 border rounded no-print">
            <h2 class="font-bold mb-3">Identitas Peraturan Bupati</h2>
            <label v-for="(label,key) in regulationLabels" :key="key" class="block text-xs mb-2">{{ label }}<input v-model="regulation[key]" class="border p-2 ml-2" /></label>
            <button @click="saveRegulation" class="bg-blue-600 text-white p-2 rounded">Simpan identitas peraturan</button>
          </section>
          <!-- ================= CHAPTERS: BAB I s.d. BAB V ================= -->
          <div
            v-for="(bab, bIdx) in currentDoc?.sections"
            :key="bab.id"
            :id="bab.id"
            class="a4-page relative select-text mb-6"
            :class="{ 'a4-landscape': chapterNeedsLandscape(bab) }"
          >
            <div v-if="currentDoc?.isLampiranOtomatis && bIdx===0" class="text-sm mb-10 font-bold">
              LAMPIRAN PERATURAN BUPATI CIREBON<br/>NOMOR : {{ currentDoc.regulation?.nomor || '................' }}<br/>
              TANGGAL : {{ currentDoc.regulation?.tanggal || '................' }}<br/>
              TENTANG : {{ currentDoc.subJudul?.includes('Renja Perubahan') ? 'PERUBAHAN ' : '' }}RENCANA KERJA {{ currentDoc.opdName.toUpperCase() }} KABUPATEN CIREBON TAHUN {{ currentDoc.tahun }}
            </div>
            <!-- Running Header -->
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-serif border-b border-slate-200 pb-1 mb-4">
              <span>{{ currentDoc?.judul }} - Kabupaten Cirebon</span>
              <span>T.A. {{ currentDoc?.tahun }}</span>
            </div>

            <!-- Chapter Header (LOCKED) -->
            <div class="text-center my-4">
              <h2 class="text-base font-bold uppercase font-serif text-slate-900 tracking-wide">
                {{ bab.title }}
              </h2>
              <div class="inline-flex items-center gap-1 text-[9px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1 no-print">
                <Lock class="w-2.5 h-2.5" />
                <span>Judul Bab Terkunci sesuai Versi Template</span>
              </div>
            </div>

            <!-- Subsections -->
            <div v-for="sub in bab.subsections" :key="sub.id" :id="sub.id" class="mb-6">
              <!-- Sub-chapter Title (LOCKED) -->
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-bold text-slate-900 font-serif">
                  {{ sub.code }} {{ sub.title }}
                </h3>
                <span class="text-[9px] text-slate-400 font-mono no-print">Terkunci</span>
              </div>

              <!-- Editable Content Body -->
              <div
                class="ProseMirror p-2 rounded-lg border border-transparent hover:border-blue-200 focus-within:border-blue-400 focus-within:bg-blue-50/10 transition-colors"
                :contenteditable="canEditSection(bab.id)"
                :class="canEditSection(bab.id) ? '' : 'cursor-default bg-slate-50/40'"
                @input="handleSectionInput($event, bab.id, sub.id)"
                @blur="renumberCaptions"
                :data-bab-id="bab.id" :data-sub-id="sub.id"
                v-html="sub.content"
              ></div>
              <StandardTable v-for="table in sub.tables || []" :key="table.id" :table="table" :tahun="currentDoc?.tahun || '2027'" :caption="tableCaption(table.id)" :editable="canEditSection(bab.id)" @update="updateTable(sub,table.id,$event)" @remove="removeTable(sub,table.id)" />
              <div v-if="canEditSection(bab.id)" class="no-print flex gap-2 flex-wrap text-xs mt-3">
                <button v-for="(definition,type) in tableDefinitions" :key="type" @click="addTable(sub,String(type))" class="border rounded p-2 text-blue-700">+ {{ definition.title }}</button>
              </div>
            </div>

            <!-- Running Footer / Page Number -->
            <div class="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-500 font-serif border-t border-slate-200 pt-2 mx-8">
              {{ currentDoc?.isLampiranOtomatis ? `RENJA ${currentDoc.tahun} ${documentOpdName}` : `Rencana Kerja ${documentOpdName} tahun ${currentDoc?.tahun}` }}
            </div>
          </div>
          <section v-if="currentDoc?.isLampiranOtomatis" class="a4-page text-center">
            <p>BUPATI CIREBON,</p><p class="mt-20">{{ currentDoc.documentSettings?.global.bupati || '................' }}</p>
            <p class="mt-16">Diundangkan di Sumber pada tanggal {{ currentDoc.regulation?.tanggalDiundangkan || '................' }}</p>
            <p>SEKRETARIS DAERAH KABUPATEN CIREBON,</p><p class="mt-20">{{ currentDoc.documentSettings?.global.sekretarisDaerah || '................' }}</p>
            <p class="mt-12">BERITA DAERAH KABUPATEN CIREBON TAHUN {{ currentDoc.tahun }} NOMOR {{ currentDoc.regulation?.nomorBerita || '................' }}</p>
          </section>
        </div>
      </main>
    </div>

    <section v-else-if="currentDoc?.cara === 'upload'" class="flex min-h-0 flex-1 flex-col bg-slate-100 lg:flex-row">
      <div class="flex min-h-[55vh] min-w-0 flex-1 flex-col">
        <div class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div class="min-w-0">
            <h2 class="text-sm font-bold text-slate-900">Telaah naskah unggahan</h2>
            <p class="truncate text-xs text-slate-500">{{ currentDoc?.fileName }} · sumber OPD tidak diubah</p>
          </div>
          <a
            v-if="currentDoc?.filePath"
            :href="currentDoc.filePath"
            :download="currentDoc.fileName || undefined"
            class="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Unduh file sumber
          </a>
        </div>
        <div v-if="sourceReviewLoading" class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-500">
          <span class="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></span>
          <span>Menyiapkan tampilan telaah dari berkas unggahan...</span>
          <span class="max-w-md text-xs leading-relaxed text-slate-400">Konversi DOC/DOCX bisa memerlukan waktu. File sumber tidak diubah; jika lama, unduh berkas sumber untuk diperiksa sambil menunggu.</span>
        </div>
        <div v-else-if="sourceReviewError" class="m-5 rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">
          {{ sourceReviewError }}
          <button @click="loadSourceReview" class="ml-2 font-bold underline">Coba lagi</button>
        </div>
        <iframe
          v-else-if="sourceReviewUrl"
          :src="sourceReviewUrl"
          class="h-[55vh] w-full flex-1 border-0 lg:h-auto lg:min-h-0"
          title="Tampilan telaah dokumen yang diunggah"
        ></iframe>
      </div>

      <aside
        v-if="store.isBapperida && !currentDoc?.isLampiranOtomatis"
        ref="reviewNotesPanel"
        class="flex max-h-[45vh] w-full shrink-0 flex-col border-t border-slate-200 bg-white lg:max-h-none lg:w-[360px] lg:border-l lg:border-t-0"
      >
        <div class="border-b border-slate-100 px-5 py-4">
          <h3 class="font-bold text-slate-900">Keputusan telaah</h3>
          <p class="mt-1 text-xs leading-relaxed text-slate-500">Catatan dikirim kepada OPD di SIPANDA; tidak mengubah file yang diunggah.</p>
        </div>
        <div v-if="!currentDoc?.permissions?.canVerify" class="flex-1 p-5">
          <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p class="text-xs font-bold text-amber-900">
              {{ currentDoc?.status === 'Draft' ? 'Dokumen belum diajukan OPD' : `Dokumen berstatus “${currentDoc?.status}”` }}
            </p>
            <p class="mt-2 text-xs leading-relaxed text-amber-800">
              {{ currentDoc?.status === 'Draft'
                ? `Minta ${currentDoc?.opdName || 'OPD pemilik'} membuka dokumen ini lalu memilih “Ajukan ke Admin”. Setelah status menjadi “Menunggu Verifikasi”, pilihan persetujuan dan catatan revisi akan aktif di panel ini.`
                : 'Keputusan verifikasi hanya dapat diberikan saat dokumen berstatus “Menunggu Verifikasi”.' }}
            </p>
          </div>
          <p v-if="currentDoc?.catatanRevisi" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800">
            <strong>Catatan revisi terakhir:</strong> {{ currentDoc.catatanRevisi }}
          </p>
        </div>
        <div v-else class="flex-1 space-y-4 overflow-y-auto p-5">
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="verifyDecision = 'Disetujui'"
              class="rounded-xl border p-3 text-left transition"
              :class="verifyDecision === 'Disetujui' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
            >
              <span class="block text-xs font-bold">Setujui</span>
              <span class="mt-1 block text-[10px] leading-snug">Dokumen memenuhi ketentuan</span>
            </button>
            <button
              type="button"
              @click="verifyDecision = 'Perlu Revisi'"
              class="rounded-xl border p-3 text-left transition"
              :class="verifyDecision === 'Perlu Revisi' ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
            >
              <span class="block text-xs font-bold">Minta revisi</span>
              <span class="mt-1 block text-[10px] leading-snug">Kirim catatan kepada OPD</span>
            </button>
          </div>
          <div v-if="verifyDecision === 'Perlu Revisi'">
            <label for="inline-review-notes" class="mb-1.5 block text-xs font-bold text-slate-700">
              Catatan revisi <span class="text-red-500">*</span>
            </label>
            <textarea
              id="inline-review-notes"
              v-model="verifyNotes"
              rows="9"
              placeholder="Tuliskan bagian yang perlu diperbaiki, misalnya: BAB IV, tabel pagu sub-kegiatan..."
              class="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            ></textarea>
          </div>
        </div>
        <div v-if="currentDoc?.permissions?.canVerify" class="border-t border-slate-100 p-5">
          <button
            @click="submitVerification"
            class="w-full rounded-xl px-4 py-3 text-xs font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            :class="verifyDecision === 'Disetujui' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'"
          >
            {{ verifyDecision === 'Disetujui' ? 'Simpan Persetujuan' : 'Kirim Catatan Revisi' }}
          </button>
        </div>
      </aside>
    </section>

    <div v-if="previewHtml" class="fixed inset-0 z-50 bg-slate-200 flex flex-col">
      <div class="bg-white p-3 flex justify-between items-center"><strong>Pratinjau halaman dokumen</strong><button @click="previewHtml=''" class="bg-blue-600 text-white p-2 rounded">Kembali ke editor</button></div>
      <iframe :srcdoc="previewHtml" sandbox="allow-scripts allow-same-origin" class="w-full flex-1 border-0" title="Pratinjau halaman dokumen"></iframe>
    </div>
    <!-- Admin Verification Modal -->
    <div v-if="showVerifyModal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-6 border border-slate-100">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 class="font-bold text-slate-900 text-base">Lembar Verifikasi Naskah {{ currentDoc?.jenis }}</h3>
            <p class="text-xs text-slate-500">{{ currentDoc?.judul }}</p>
          </div>
          <button @click="showVerifyModal = false" class="p-1 text-slate-400 hover:text-slate-700">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Pilih Keputusan Telaah</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                @click="verifyDecision = 'Disetujui'"
                class="p-3 rounded-2xl border-2 text-left transition-all"
                :class="verifyDecision === 'Disetujui' ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-700'"
              >
                <div class="font-bold text-sm">Disetujui & Sah</div>
                <div class="text-[11px] text-slate-500 mt-0.5">Terbitkan BA Sah dan nomor registrasi arsip.</div>
              </button>

              <button
                type="button"
                @click="verifyDecision = 'Perlu Revisi'"
                class="p-3 rounded-2xl border-2 text-left transition-all"
                :class="verifyDecision === 'Perlu Revisi' ? 'border-red-600 bg-red-50 text-red-900' : 'border-slate-200 text-slate-700'"
              >
                <div class="font-bold text-sm">Kembalikan (Revisi)</div>
                <div class="text-[11px] text-slate-500 mt-0.5">Berikan catatan perbaikan kepada OPD.</div>
              </button>
            </div>
          </div>

          <div v-if="verifyDecision === 'Perlu Revisi'">
            <label class="block font-bold text-slate-700 mb-1">
              Catatan Revisi Perbaikan OPD <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="verifyNotes"
              rows="4"
              placeholder="Contoh: Rasionalkan pagu sub-kegiatan pada BAB IV sesuai pagu indikatif TAPD Kabupaten Cirebon..."
              class="w-full p-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-500 rounded-xl text-xs outline-none"
            ></textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-100">
          <button @click="showVerifyModal = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
            Batal
          </button>
          <button
            @click="submitVerification"
            class="px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors"
            :class="verifyDecision === 'Disetujui' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'"
          >
            Simpan Keputusan Verifikasi
          </button>
        </div>
      </div>
    </div>

    <!-- Image Insert Modal -->
    <div v-if="insertImageModal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100">
        <h3 class="font-bold text-slate-900 text-base mb-1">Sisipkan Gambar dengan Keterangan</h3>
        <p class="text-xs text-slate-500 mb-4">Nomor urut gambar akan terformat otomatis sesuai bab.</p>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">URL Gambar atau Unggah</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" @change="readImageFile" class="mb-2" />
            <input
              v-model="imageUrlInput"
              type="text"
              placeholder="https://... atau pilih sampel struktur organisasi"
              class="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none"
            />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Judul / Keterangan Gambar (Wajib Caption)</label>
            <input
              v-model="imageCaptionInput"
              type="text"
              placeholder="Contoh: Bagan Struktur Organisasi Dinas"
              class="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-5">
          <button @click="insertImageModal = false" class="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">
            Batal
          </button>
          <button @click="confirmInsertImage" class="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl">
            Sisipkan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '../../stores/appStore';
import type { DocumentItem, Section } from '../../types';
import { apiFetch } from '../../lib/api';
import StandardTable from './StandardTable.vue';
import { blankTable, tableDefinitions, tableNeedsLandscape } from '../../../../shared/document-tables.js';
import KabCirebonLogo from '../common/KabCirebonLogo.vue';
import {
  ArrowLeft,
  Printer,
  Download,
  Send,
  CheckCircle,
  Check,
  Eye,
  FileText,
  Lock,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table as TableIcon,
  Image as ImageIcon,
  Type,
  Plus,
  Minus,
  Sparkles,
  AlertTriangle,
  X
} from '@lucide/vue';

const store = useAppStore();
const route = useRoute();
const router = useRouter();

const currentDoc = ref<DocumentItem | null>(null);
const zoom = ref(100);
const regulationLabels = {nomor:'Nomor peraturan',tanggal:'Tanggal peraturan',tanggalDiundangkan:'Tanggal diundangkan',nomorBerita:'Nomor berita daerah'};
const regulation = reactive({nomor:'',tanggal:'',tanggalDiundangkan:'',nomorBerita:''});
const documentOpdName = computed(() => currentDoc.value?.documentSettings?.opd.nama || currentDoc.value?.opdName || '');
const defaultPreface = computed(()=>`<p>Puji syukur ke hadirat Tuhan Yang Maha Esa atas tersusunnya ${currentDoc.value?.jenis} ${documentOpdName.value} Tahun ${currentDoc.value?.tahun}.</p><p>Dokumen ini menjadi pedoman pelaksanaan program dan kegiatan perangkat daerah. Terima kasih kepada seluruh pihak yang berkontribusi dalam penyusunannya.</p>`);
function chapterNeedsLandscape(bab:Section){
  return bab.subsections.some(sub=>{
    if(sub.tables?.some(table=>tableNeedsLandscape(table)))return true;
    const parsed=new DOMParser().parseFromString(sub.content,'text/html');
    return [...parsed.querySelectorAll('table')].some(table=>tableNeedsLandscape(table));
  });
}
const documentCaptions = computed(()=>{
  const entries:Array<{kind:string;label:string;id:string}>=[];
  currentDoc.value?.sections?.forEach((bab,i)=>{
    let tableNo=0,imageNo=0;
    bab.subsections.forEach(sub=>{
      const parsed=new DOMParser().parseFromString(sub.content,'text/html');
      parsed.querySelectorAll('.doc-caption').forEach((el,j)=>{const kind=/^Gambar/i.test(el.textContent||'')?'Gambar':'Tabel';const n=kind==='Gambar'?++imageNo:++tableNo;entries.push({kind,label:`${kind} ${i+1}.${n} ${el.textContent?.replace(/^(Tabel|Gambar)\s+[\d.]+\s*[-?:]?\s*/i,'')}`,id:`${sub.id}-${j}`});});
      sub.tables?.forEach(t=>entries.push({kind:'Tabel',label:`Tabel ${i+1}.${++tableNo} ${tableDefinitions[t.type]?.title || ''}`,id:t.id}));
    });
  });return entries;
});
function tableCaption(id:string){return documentCaptions.value.find(c=>c.id===id)?.label||'';}
function addTable(sub:any,type:string){(sub.tables ||= []).push(blankTable(type));triggerAutosave();}
function updateTable(sub:any,id:string,value:any){sub.tables=sub.tables.map((t:any)=>t.id===id?value:t);triggerAutosave();}
function removeTable(sub:any,id:string){sub.tables=sub.tables.filter((t:any)=>t.id!==id);triggerAutosave();}
function handlePreface(e:Event){if(!currentDoc.value)return;currentDoc.value.frontMatter={preface:(e.target as HTMLElement).innerHTML};triggerAutosave();}
async function saveRegulation(){if(!currentDoc.value)return;const r=await apiFetch(`/api/documents/${currentDoc.value.id}/regulation`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(regulation)});if(r.ok){currentDoc.value.regulation={...regulation};store.addToast('Identitas peraturan disimpan');}else store.addToast('Gagal menyimpan identitas peraturan','error');}

const isSaving = ref(false);
const chapterAssignments = ref<Array<{ id: string; userId: string; userName: string; babId: string; babTitle: string }>>([]);
const staffMembers = ref<Array<{ id: string; name: string }>>([]);
const selectedBabId = ref('');
const selectedStaffId = ref('');
let autosaveTimer: any = null;

// Modals
const showVerifyModal = ref(false);
const verifyDecision = ref<'Disetujui' | 'Perlu Revisi'>('Disetujui');
const verifyNotes = ref('');
const insertImageModal = ref(false);
const imageUrlInput = ref('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80');
const imageCaptionInput = ref('Gambar 2.1 - Sarana dan Prasarana Pelayanan');

const isRkpdDocument = computed(() => Boolean(currentDoc.value?.jenis.includes('RKPD') || (currentDoc.value?.opdId === 'bapperida' && ['Renja Murni','Renja Perubahan'].includes(currentDoc.value?.jenis || ''))));

const canEditSection = (babId: string) => currentDoc.value?.permissions?.canEdit === true
  && currentDoc.value.permissions.editableBabIds.includes(babId);

const statusBadgeClass = computed(() => {
  switch (currentDoc.value?.status) {
    case 'Draft': return 'bg-slate-100 text-slate-700 border border-slate-200';
    case 'Menunggu Verifikasi': return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'Perlu Revisi': return 'bg-red-100 text-red-700 border border-red-200';
    case 'Disetujui': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    default: return 'bg-slate-100 text-slate-700';
  }
});

const isSectionFilled = (content: string) => {
  const text = (content || '').replace(/<[^>]*>?/gm, '').trim();
  return text.length > 20 && !/^Petunjuk:/i.test(text);
};

const getBabStats = (bab: any) => {
  const subs = bab.subsections || [];
  const total = subs.length;
  const filled = subs.filter((s: any) => isSectionFilled(s.content)).length;
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
  return {
    total,
    filled,
    percent,
    isComplete: total > 0 && filled === total
  };
};

const completionPercent = computed(() => {
  if (!currentDoc.value?.sections) return 0;
  let total = 0;
  let filled = 0;
  currentDoc.value.sections.forEach(b => {
    b.subsections?.forEach(s => {
      total++;
      if (isSectionFilled(s.content)) filled++;
    });
  });
  return total > 0 ? Math.round((filled / total) * 100) : 0;
});

const loadDocument = async () => {
  const docId = route.params.id as string;
  try {
    const res = await apiFetch(`/api/documents/${docId}`);
    if (res.ok) {
      currentDoc.value = await res.json();
      Object.assign(regulation, currentDoc.value?.regulation || {});
      if (isRkpdDocument.value) {
        await loadChapterAssignments();
        if (store.isSuperAdmin) await loadStaffMembers();
      }
    } else {
      const result = await res.json().catch(() => ({}));
      store.addToast(result.error || 'Tidak dapat membuka dokumen', 'error');
      router.push('/dokumen');
    }
  } catch (err) {
    console.error(err);
  }
};

const loadChapterAssignments = async () => {
  if (!currentDoc.value) return;
  const res = await apiFetch(`/api/documents/${currentDoc.value.id}/assignments/chapters`);
  if (res.ok) chapterAssignments.value = await res.json();
};

const loadStaffMembers = async () => {
  const res = await apiFetch('/api/staf');
  if (res.ok) {
    const users = await res.json();
    staffMembers.value = users.filter((user: { role: string }) => user.role === 'staf');
  }
};

const assignChapter = async () => {
  if (!currentDoc.value || !selectedBabId.value || !selectedStaffId.value) return;
  const res = await apiFetch(`/api/documents/${currentDoc.value.id}/assignments/chapters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: selectedStaffId.value, babId: selectedBabId.value })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    store.addToast(data.error || 'Gagal menetapkan pegawai ke bab', 'error');
    return;
  }
  store.addToast('Penugasan bab berhasil disimpan', 'success');
  await loadChapterAssignments();
  selectedStaffId.value = '';
};

const removeChapterAssignment = async (assignmentId: string) => {
  if (!currentDoc.value) return;
  const res = await apiFetch(`/api/documents/${currentDoc.value.id}/assignments/chapters/${assignmentId}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    store.addToast(data.error || 'Gagal menghapus penugasan bab', 'error');
    return;
  }
  await loadChapterAssignments();
  await loadDocument();
};

const handleSectionInput = (event: Event, babId: string, subId: string) => {
  if (!currentDoc.value || !currentDoc.value.sections || !canEditSection(babId)) return;
  const target = event.target as HTMLElement;
  const newHtml = target.innerHTML;

  const bab = currentDoc.value.sections.find(b => b.id === babId);
  if (bab) {
    const sub = bab.subsections.find(s => s.id === subId);
    if (sub) {
      sub.content = newHtml;
      triggerAutosave();
    }
  }
};

const triggerAutosave = () => {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    if (!currentDoc.value) return;
    try {
      isSaving.value = true;
      await store.updateDocument(currentDoc.value.id, {
        sections: currentDoc.value.sections?.filter(section => canEditSection(section.id)) || [],
        ...(canEditSection(currentDoc.value?.sections?.[0]?.id || '') ? {frontMatter: currentDoc.value.frontMatter} : {})
      });
    } catch (err) {
      console.error('Autosave error:', err);
    } finally {
      setTimeout(() => { isSaving.value = false; }, 500);
    }
  }, 2000);
};

// Document Toolbar commands
const execCommand = (cmd: string, val = '') => {
  document.execCommand(cmd, false, val);
};

const insertTable = () => {
  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
      <thead>
        <tr style="background: #f1f5f9;">
          <th style="border: 1px solid #334155; padding: 6px 8px;">No</th>
          <th style="border: 1px solid #334155; padding: 6px 8px;">Program / Kegiatan</th>
          <th style="border: 1px solid #334155; padding: 6px 8px;">Target Kinerja</th>
          <th style="border: 1px solid #334155; padding: 6px 8px;">Pagu (Rp)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #334155; padding: 6px 8px; text-align: center;">1</td>
          <td style="border: 1px solid #334155; padding: 6px 8px;">Nama Program Baru</td>
          <td style="border: 1px solid #334155; padding: 6px 8px;">100%</td>
          <td style="border: 1px solid #334155; padding: 6px 8px; text-align: right;">500.000.000</td>
        </tr>
      </tbody>
    </table>
    <p class="doc-caption">Tabel 3.1 - Rincian Usulan Kegiatan Baru</p>
  `;
  document.execCommand('insertHTML', false, tableHtml);
  triggerAutosave();
};

const insertCaption = () => {
  const captionHtml = `<p class="doc-caption">Tabel 2.2 - Keterangan Tambahan Indikator</p>`;
  document.execCommand('insertHTML', false, captionHtml);
  triggerAutosave();
};

let imageSelection: Range | null = null;
function openImageModal() {
  const selection=window.getSelection();
  imageSelection=selection?.rangeCount?selection.getRangeAt(0).cloneRange():null;
  insertImageModal.value=true;
}
async function imageData(blob:Blob):Promise<string> {
  if(!['image/png','image/jpeg','image/webp'].includes(blob.type) || blob.size>5*1024*1024) throw new Error('Gunakan gambar PNG/JPG/WebP maksimum 5 MB.');
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
}
async function readImageFile(e:Event) {
  const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
  try{imageUrlInput.value=await imageData(file);}catch(e:any){store.addToast(e.message,'error');}
}
const confirmInsertImage = async () => {
  try {
    let src=imageUrlInput.value;
    if(!src.startsWith('data:image/')){const r=await fetch(src);if(!r.ok)throw new Error('Gambar tidak dapat dimuat');src=await imageData(await r.blob());}
    if(!imageSelection)throw new Error('Klik bagian isi dokumen sebelum menyisipkan gambar.');
    const wrapper=document.createElement('div'),img=document.createElement('img'),caption=document.createElement('p');
    img.src=src;img.alt=imageCaptionInput.value;caption.className='doc-caption';caption.textContent='Gambar 1.1 '+imageCaptionInput.value.replace(/^Gambar\s+[\d.]+\s*[-?:]?\s*/i,'');wrapper.append(img,caption);
    insertImageModal.value=false;
    const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(imageSelection);
    document.execCommand('insertHTML',false,wrapper.outerHTML);
    renumberCaptions();triggerAutosave();
  }catch(e:any){store.addToast(e.message || 'Gambar gagal dimuat. Gunakan unggah berkas lokal.','error');}
};
function renumberCaptions() {
  let changed=false;
  currentDoc.value?.sections?.forEach((bab,i)=>{
    let t=0,g=0;
    bab.subsections.forEach(sub=>{
      const parsed=new DOMParser().parseFromString(sub.content,'text/html');
      parsed.querySelectorAll('.doc-caption').forEach(el=>{
        const kind=/^Gambar/i.test(el.textContent||'')?'Gambar':'Tabel';const n=kind==='Gambar'?++g:++t;
        const title=(el.textContent||'').replace(/^(Tabel|Gambar)\s+[\d.]+\s*[-?:]?\s*/i,'');el.textContent=`${kind} ${i+1}.${n} ${title}`;
      });
      t+=sub.tables?.length||0;
      if(canEditSection(bab.id) && sub.content!==parsed.body.innerHTML){sub.content=parsed.body.innerHTML;changed=true;}
    });
  });if(changed)triggerAutosave();
}

async function flushSave() {
  clearTimeout(autosaveTimer);
  if (!currentDoc.value?.permissions?.canEdit) return;
  await store.updateDocument(currentDoc.value.id, {
    sections: currentDoc.value.sections?.filter(section => canEditSection(section.id)) || [],
    ...(canEditSection(currentDoc.value?.sections?.[0]?.id || '') ? { frontMatter: currentDoc.value.frontMatter } : {})
  });
}
const previewHtml = ref('');
const sourceReviewUrl = ref('');
const sourceReviewLoading = ref(false);
const sourceReviewError = ref('');
const reviewNotesPanel = ref<HTMLElement | null>(null);
const exporting = ref(false);
async function loadSourceReview() {
  if (!currentDoc.value || currentDoc.value.cara !== 'upload' || sourceReviewLoading.value) return;
  sourceReviewLoading.value = true;
  sourceReviewError.value = '';
  try {
    const documentId = currentDoc.value.id;
    const response = await apiFetch(`/api/documents/${documentId}/source-preview`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Gagal menyiapkan tampilan telaah berkas');
    }
    if (!response.headers.get('Content-Type')?.includes('application/pdf')) throw new Error('Tampilan telaah harus berasal dari PDF berkas asli. Muat ulang aplikasi dan coba lagi.');
    const pdf = await response.blob();
    if (currentDoc.value?.id !== documentId) return;
    if (sourceReviewUrl.value) URL.revokeObjectURL(sourceReviewUrl.value);
    sourceReviewUrl.value = URL.createObjectURL(pdf);
  } catch (error) {
    sourceReviewError.value = error instanceof Error ? error.message : 'Gagal menyiapkan tampilan telaah berkas';
  } finally {
    sourceReviewLoading.value = false;
  }
}

async function previewDocument() {
  if (!currentDoc.value || exporting.value) return;
  if (currentDoc.value.cara === 'upload') {
    await loadSourceReview();
    return;
  }
  try {
    exporting.value = true;
    await flushSave();
    const res=await apiFetch(`/api/documents/${currentDoc.value.id}/preview`);
    if(!res.ok)throw new Error('Gagal memuat pratinjau'); previewHtml.value=await res.text();
  } catch(e:any){store.addToast(e.message,'error');} finally {exporting.value=false;}
}

async function focusReviewNotes() {
  await nextTick();
  reviewNotesPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (verifyDecision.value === 'Perlu Revisi') {
    document.getElementById('inline-review-notes')?.focus();
  }
}
async function downloadDocument(format:string) {
  if (!currentDoc.value || exporting.value) return;
  try { exporting.value=true; await flushSave();
    const res=await apiFetch(`/api/export/${format}/${currentDoc.value.id}`);
    if(!res.ok)throw new Error((await res.json()).error||'Ekspor gagal');
    const url=URL.createObjectURL(await res.blob());const a=document.createElement('a');a.href=url;a.download=`${currentDoc.value.kodeDoc}${format==='docx-editable'?'-editable':''}.${format==='pdf'?'pdf':'docx'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e:any){store.addToast(e.message,'error');}finally{exporting.value=false;}
}
const printDocument = () => downloadDocument('pdf');
const exportDocx = () => downloadDocument('docx');

const validateAndSubmit = async () => {
  if (!currentDoc.value) return;

  // Validate empty mandatory sections
  const emptySections: string[] = [];
  currentDoc.value.sections?.forEach(bab => {
    bab.subsections?.forEach(sub => {
      const text = (sub.content || '').replace(/<[^>]*>?/gm, '').trim();
      if (text.length < 15 || /^Petunjuk:/i.test(text)) {
        emptySections.push(`${sub.code} ${sub.title}`);
      }
    });
  });

  if (emptySections.length > 0) {
    store.addToast(`Terdapat ${emptySections.length} bagian wajib yang masih kosong! Lengkapi narasi sebelum mengajukan ke Admin.`, 'error');
    return;
  }

  try {
    await flushSave();
    const updated = await store.submitDocument(currentDoc.value.id);
    currentDoc.value = updated;
    router.push('/dokumen');
  } catch (err: any) {
    console.error(err);
  }
};

const openVerifyModal = () => {
  showVerifyModal.value = true;
};

const submitVerification = async () => {
  if (!currentDoc.value) return;
  if (verifyDecision.value === 'Perlu Revisi' && !verifyNotes.value.trim()) {
    store.addToast('Catatan revisi wajib diisi', 'error');
    if (currentDoc.value.cara === 'upload') {
      await nextTick();
      document.getElementById('inline-review-notes')?.focus();
    }
    return;
  }
  try {
    const updated = await store.verifyDocument(currentDoc.value.id, verifyDecision.value, verifyNotes.value);
    currentDoc.value = updated;
    showVerifyModal.value = false;
    router.push('/dokumen');
  } catch (err) {
    console.error(err);
  }
};

const goBack = () => {
  router.push('/dokumen');
};

onMounted(async () => {
  await loadDocument();
  if (currentDoc.value?.cara === 'upload') await loadSourceReview();
});

onUnmounted(() => {
  if (sourceReviewUrl.value) URL.revokeObjectURL(sourceReviewUrl.value);
  clearTimeout(autosaveTimer);
});
</script>
