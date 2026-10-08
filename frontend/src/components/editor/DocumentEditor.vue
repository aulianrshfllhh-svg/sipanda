<template>
  <div class="h-screen min-h-0 overflow-hidden bg-slate-200/80 flex flex-col font-sans select-none" @paste="handlePaste" @click="handleCanvasClick">
    <!-- Top Action Bar -->
    <header class="min-h-16 shrink-0 bg-white border-b border-slate-300 px-3 py-2 flex flex-wrap gap-2 items-center justify-between sticky top-0 z-40 shadow-xs">
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
        <span
          class="w-2 h-2 rounded-full"
          :class="localSaveError || saveError ? 'bg-red-500' : isSaving || hasUnsavedChanges || localSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'"
        ></span>
        <span class="text-slate-500 font-medium text-[11px]">
          {{ currentDoc?.cara === 'upload' ? 'Telaah naskah Â· file sumber tetap utuh' : localSaveError ? 'Gagal menyimpan draf perangkat' : !online ? localSaving ? 'Offline Â· menyimpan di perangkat...' : 'Offline Â· draf tersimpan di perangkat' : isSaving ? 'Menyimpan perubahan...' : saveError ? 'Gagal sinkronisasi Â· draf perangkat dipertahankan' : hasUnsavedChanges ? 'Perubahan menunggu disimpan...' : 'Draf tersimpan otomatis di server SIPANDA' }}
        </span>
      </div>

      <!-- Right Action Controls -->
      <div class="flex items-center gap-2.5">
        <button @mousedown.prevent @click="openDocumentReview" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl">Komentar / Riwayat</button>
        <button @click="runFormatCheck" :disabled="formatChecking" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl">{{ formatChecking?'Memeriksa...':'Cek Format' }}</button>
        <button
          @click="previewDocument()"
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

        <button v-if="currentDoc?.cara!=='upload'&&!currentDoc?.isLampiranOtomatis" @click="previewDocument(true)" :disabled="exporting" class="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-xl">Kanvas cetak / sunting</button>
        <!-- Export DOCX -->
        <button
          v-if="currentDoc?.cara !== 'upload'"
          @click="exportDocx"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shadow-2xs"
          title="Setiap halaman menjadi gambar untuk arsip; isi tidak dapat diedit di Word"
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
    <div v-if="currentDoc?.status==='Perlu Revisi'&&openCommentCount" class="shrink-0 px-4 py-2 bg-amber-50 text-amber-950 text-xs border-b border-amber-300">Daftar pemeriksaan pengajuan ulang: {{ openCommentCount }} komentar Terbuka. <button @click="reviewOpen=true" class="underline font-semibold">Periksa komentar</button></div>
    <div v-if="!online || sessionError || localSaveError || conflicts.length" role="status" class="shrink-0 bg-amber-50 border-b border-amber-300 px-4 py-2 text-xs text-amber-950 flex flex-wrap gap-3 items-center">
      <span>{{ localSaveError || (conflicts.length ? 'Ada perubahan BAB di server. Periksa konflik sebelum sinkronisasi.' : !online ? 'Koneksi terputus. Perubahan disimpan di perangkat dan akan disinkronkan saat tersambung.' : sessionError) }}</span>
      <button @click="downloadDraft" class="underline font-semibold">Unduh cadangan draf</button>
      <button v-if="online" @click="reconnectEditor" class="underline font-semibold">Coba sinkronisasi</button>
    </div>

    <!-- Word-Like Minimalist Locked Toolbar -->
    <div v-if="currentDoc?.cara !== 'upload'" class="shrink-0 bg-white border-b border-slate-300 px-3 py-2 flex flex-wrap gap-2 items-center justify-between sticky top-16 z-30 shadow-2xs no-print">
      <div class="flex flex-wrap items-center gap-1">
        <details class="relative text-xs">
          <summary class="cursor-pointer rounded border border-slate-300 px-2 py-1">Impor</summary>
          <div class="absolute z-40 top-full left-0 w-56 bg-white border rounded shadow-lg p-1 space-y-1">
            <button @mousedown.prevent @click="openFileImportAtSelection('word')" class="block w-full p-2 text-left rounded hover:bg-blue-50">Impor Word ke BAB ini</button>
            <button @mousedown.prevent @click="openFileImportAtSelection('table')" class="block w-full p-2 text-left rounded hover:bg-blue-50">Impor tabel Excel/CSV</button>
          </div>
        </details>
        <details class="relative text-xs">
          <summary class="cursor-pointer rounded border border-slate-300 px-2 py-1">Tabel Baku</summary>
          <div class="absolute z-40 top-full left-0 w-80 max-w-[85vw] bg-white border rounded shadow-lg p-1 space-y-1">
            <button v-for="(definition,type) in tableDefinitions" :key="type" @mousedown.prevent @click="addTableAtSelection(String(type))" class="block w-full p-2 text-left rounded hover:bg-blue-50">+ {{ definition.title }}</button>
          </div>
        </details>
      </div>
      <!-- Formatting tools -->
      <div class="flex flex-wrap items-center gap-1">
        <button v-for="tool in basicTools" :key="tool.command" @mousedown.prevent @click="execCommand(tool.command)" class="px-2 py-1 rounded border border-slate-300 text-xs text-slate-800 hover:bg-slate-100" :title="tool.title">{{ tool.label }}</button>
        <button @mousedown.prevent @click="insertSpecialCharacter" class="px-2 py-1 rounded border border-slate-300 text-xs text-slate-800">Karakter khusus</button>
        <button @click="showShortcutHelp = !showShortcutHelp" class="px-2 py-1 rounded border border-slate-300 text-xs text-slate-800">Pintasan</button>
        <button @click="openSearch" class="px-2 py-1 rounded border border-slate-300 text-xs text-slate-800">Cari dan ganti</button>
        <button @mousedown.prevent @click="insertPageBreak" class="px-2 py-1 rounded border border-slate-300 text-xs text-slate-800">Pemisah halaman</button>
        <details class="relative text-xs"><summary class="cursor-pointer rounded border border-slate-300 px-2 py-1">Orientasi</summary><div class="absolute z-40 top-full left-0 w-80 bg-white border rounded shadow-lg p-2 space-y-1"><p class="px-2 text-[11px] text-slate-600">Orientasi untuk: <b>{{ activeSubLabel || 'Pilih sub-bab' }}</b></p><label class="block px-2 py-1">Terapkan ke<select v-model="orientationTarget" @change="onOrientationTargetChange" class="ml-2 border rounded p-1"><option value="current">Sub-bab ini</option><option value="multiple">Beberapa sub-bab...</option><option value="chapter">Seluruh BAB ini</option></select></label><button @mousedown.prevent @click="applyOrientation('portrait')" class="block w-full p-2 text-left hover:bg-blue-50">Portrait</button><button @mousedown.prevent @click="applyOrientation('landscape')" class="block w-full p-2 text-left hover:bg-blue-50">Landscape</button><label v-if="activeSub" class="block px-2 py-1"><input type="checkbox" :checked="activeSub.pageBreakBefore===true" @change="setPageBreakBefore(($event.target as HTMLInputElement).checked)" /> Mulai di halaman baru</label></div></details>
        <button v-for="list in listFormats" :key="list.value" @mousedown.prevent @click="setListFormat(list.value)" class="px-2 py-1 rounded border border-slate-300 text-xs text-slate-800" :title="list.title">{{ list.label }}</button>
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
        <button @mousedown.prevent @click="openReferenceDialog" class="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-800 rounded-lg border border-slate-300">Rujukan silang</button>
      </div>

      <!-- Zoom controls & View -->
      <div class="flex items-center gap-2 text-xs text-slate-500"><label class="flex items-center gap-1">Zoom <select v-model.number="zoom" class="border rounded px-1 py-1" aria-label="Zoom kanvas"><option v-for="value in [50,75,100,150]" :key="value" :value="value">{{ value }}%</option></select></label></div>
    </div>

    <div v-if="showShortcutHelp" class="shrink-0 bg-blue-50 text-blue-950 p-3 text-xs no-print" role="status">Ctrl+B: tebal &middot; Ctrl+I: miring &middot; Ctrl+U: garis bawah &middot; Ctrl+Z: urungkan &middot; Ctrl+Y: ulangi &middot; Ctrl+F: cari &middot; Ctrl+S: simpan &middot; Ctrl+K: tautan</div>
    <form v-if="searchOpen" @submit.prevent="navigateSearch(1)" class="shrink-0 flex flex-wrap items-center gap-2 bg-white border-b p-3 text-xs no-print" aria-label="Cari dan ganti">
      <input ref="searchInput" v-model="searchQuery" @input="refreshSearch" aria-label="Cari teks" placeholder="Cari teks" class="border border-slate-400 rounded p-2" />
      <input v-model="replacementText" aria-label="Teks pengganti" placeholder="Ganti dengan" class="border border-slate-400 rounded p-2" />
      <span role="status">{{ searchRanges.length ? searchIndex + 1 : 0 }} dari {{ searchRanges.length }} hasil</span>
      <button type="button" @click="navigateSearch(-1)" class="border rounded p-2">Sebelumnya</button>
      <button class="border rounded p-2">Berikutnya</button>
      <button type="button" @click="replaceSearchResult" :disabled="!searchRanges.length" class="border rounded p-2 disabled:opacity-50">Ganti hasil ini</button>
      <button type="button" @click="closeSearch" class="border rounded p-2">Tutup pencarian</button>
    </form>
    <TableToolbar v-if="activeTable" :rows="activeTable.rows" :columns="activeTable.columns" :repeat="activeTable.repeat" :no-split="activeTable.noSplit" :message="tableMessage" @action="applyTableAction" @landscape="landscapeSelectedTable" @caption="insertCaption" @remove="deleteSelectedTable" />
    <div v-if="activeTable?.wide" class="shrink-0 flex gap-2 items-center bg-amber-50 text-amber-950 p-2 text-xs no-print" role="status">Tabel ini lebar. Jadikan landscape?<button @mousedown.prevent @click="landscapeSelectedTable" class="border border-amber-700 rounded px-2 py-1">Jadikan landscape</button></div>
    <div v-if="activeImage" class="shrink-0 flex flex-wrap items-center gap-2 bg-blue-50 text-blue-950 p-2 text-xs no-print" aria-label="Toolbar gambar"><strong>Gambar dipilih</strong><button @mousedown.prevent @click="editSelectedImage" class="border border-blue-300 bg-white rounded px-2 py-1">Atur gambar / pangkas / caption</button><button @mousedown.prevent @click="deleteSelectedImage" class="border border-red-300 bg-white text-red-900 rounded px-2 py-1">Hapus gambar</button></div>
    <div v-if="pasteBusy" class="shrink-0 p-3 bg-blue-50 text-blue-950 text-xs no-print" role="status">Netralisasi format sumber: {{ pasteProgress }}% <progress :value="pasteProgress" max="100" aria-label="Progres paste"></progress></div>
    <div v-if="lastPaste && !pasteBusy" class="shrink-0 p-3 bg-emerald-50 text-emerald-950 text-xs flex flex-wrap gap-2 items-center no-print" role="status">
      <span>Format sumber dibersihkan.</span>
      <button @click="replaceLastPaste('source')" class="border border-emerald-700 rounded px-2 py-1" title="Pertahankan perataan sumber; font, ukuran, warna, dan keamanan tetap mengikuti standar baku">Tempel dengan format asli</button>
      <button @click="replaceLastPaste('text')" class="border border-emerald-700 rounded px-2 py-1">Tempel sebagai teks biasa</button>
      <button v-if="lastPaste.hasTable" @click="tidyPastedTable" class="border border-emerald-700 rounded px-2 py-1">Rapikan Tabel</button>
      <span v-if="lastPaste.wide">Tabel ini lebar. Jadikan landscape?</span><button v-if="lastPaste.wide" @click="landscapePastedTable" class="border border-emerald-700 rounded px-2 py-1">Jadikan landscape</button>
      <button @click="lastPaste = null" class="ml-auto underline">Tutup pemberitahuan</button>
    </div>
    <!-- Active Catatan Revisi Alert if status === 'Perlu Revisi' -->
    <div v-if="currentDoc?.status === 'Perlu Revisi' && currentDoc?.catatanRevisi" class="bg-amber-100 text-amber-950 px-6 py-2.5 flex items-center justify-between text-xs font-medium shadow-inner no-print">
      <div class="flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 shrink-0" />
        <span><strong>Catatan Verifikator Bapperida ({{ currentDoc.verifierName }}):</strong> {{ currentDoc.catatanRevisi }}</span>
      </div>
      <div v-if="currentDoc && !currentDoc.isLampiranOtomatis && (!currentDoc.documentSettings?.global?.logoData || !currentDoc.documentSettings?.opd?.alamat)" class="mx-6 mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 no-print" role="status">
        <p v-if="!currentDoc.documentSettings?.global?.logoData">Logo Kabupaten Cirebon belum diunggah. Ekspor dokumen belum tersedia sampai Super Admin mengunggah logo PNG pada Pengaturan Dokumen.</p>
        <p v-if="!currentDoc.documentSettings?.opd?.alamat">Alamat OPD belum diisi. Alamat akan dikosongkan pada ekspor dan pengajuan ditolak sampai Profil OPD dilengkapi.</p>
        <a href="/pengaturan/dokumen" class="mt-1 inline-block font-semibold underline">Buka Profil OPD / Pengaturan Dokumen</a>
      </div>
      <span class="text-[11px] bg-amber-600 px-2 py-0.5 rounded font-bold uppercase">Wajib Diperbaiki</span>
    </div>

    <div v-if="currentDoc?.cara !== 'upload'" class="shrink-0 bg-white border-b px-6 py-2 flex gap-4 items-center text-xs no-print">
      <button @click="previewDocument()" :disabled="exporting" class="text-blue-700 font-bold">
        Pratinjau Halaman
      </button>
      <span v-if="currentDoc?.templateSnapshot">{{ currentDoc.templateSnapshot.nama }} &middot; versi {{ currentDoc.templateSnapshot.versi }}</span>
      <span v-if="exporting">Menyiapkan dokumen...</span>
      <span class="text-slate-500">DOCX menyimpan gambar tiap halaman agar tata letak tetap sama. Edit isi melalui SIPANDA.</span>
    </div>
    <!-- Workspace Container (Sidebar Navigation + A4 Canvas) -->
    <div v-if="currentDoc?.cara !== 'upload'" class="flex-1 min-h-0 flex overflow-hidden">
      <!-- Left Outline & Navigation Sidebar -->
      <aside class="w-48 xl:w-72 min-h-0 bg-white border-r border-slate-300 flex flex-col overflow-y-auto shrink-0 no-print">
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
            <select v-model="selectedBabId" @change="selectedStaffId=''" class="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-[11px]">
              <option value="">Pilih bab</option>
              <option v-for="bab in currentDoc?.sections || []" :key="bab.id" :value="bab.id">{{ bab.title }} Â· {{ chapterAssignmentCount(bab.id) }} pegawai</option>
            </select>
            <p class="text-[10px] leading-relaxed text-slate-500">Satu bab dapat dikerjakan beberapa pegawai. Tambahkan pegawai satu per satu.</p>
            <select v-model="selectedStaffId" @change="assignChapter" :disabled="!selectedBabId || !availableStaffMembers.length" class="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-[11px] disabled:opacity-50">
              <option value="">Tambah pegawai ke bab terpilih</option>
              <option v-for="staff in availableStaffMembers" :key="staff.id" :value="staff.id">{{ staff.name }}</option>
            </select>
            <p v-if="selectedBabId && staffMembers.length && !availableStaffMembers.length" class="text-[10px] text-emerald-700">Semua pegawai aktif sudah ditugaskan ke bab ini.</p>
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
              <a :href="`#${bab.id}`" class="font-bold text-slate-900 hover:text-blue-800 whitespace-normal text-xs flex-1 leading-snug" :title="bab.title">
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
                @click="setActiveSub(bab.id,sub.id)"
                @contextmenu.prevent="openOrientationContext($event,bab.id,sub.id)"
                class="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg text-slate-700 hover:bg-blue-50/70 hover:text-blue-700 transition-all group border border-transparent hover:border-blue-100"
              >
                <div class="flex items-baseline gap-1.5 truncate">
                  <span class="font-mono text-[10px] font-bold text-slate-400 group-hover:text-blue-600 shrink-0">
                    {{ sub.code }}
                  </span>
                  <span class="truncate text-[11px] font-medium leading-tight">
                    {{ sub.title }}
                  </span>
                  <span v-if="sub.orientation==='landscape'" aria-label="Landscape" title="Landscape" class="text-blue-600 text-[10px]">[L]</span>
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
            <form
              v-if="addingSubsectionTo === bab.id"
              @submit.prevent="addSubsection(bab.id)"
              class="p-2 pt-0 space-y-1.5"
            >
              <input
                v-model="newSubsectionTitle"
                :aria-label="`Judul sub-bab baru untuk ${bab.title}`"
                maxlength="160"
                required
                autofocus
                placeholder="Judul sub-bab"
                class="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] outline-none focus:border-blue-500"
              />
              <div class="flex gap-1.5">
                <button
                  type="submit"
                  :disabled="addingSubsection || !newSubsectionTitle.trim()"
                  class="flex-1 rounded-lg bg-blue-600 px-2 py-1.5 text-[10px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >{{ addingSubsection ? 'Menyimpan...' : 'Simpan sub-bab' }}</button>
                <button
                  type="button"
                  :disabled="addingSubsection"
                  @click="cancelAddSubsection"
                  class="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                >Batal</button>
              </div>
            </form>
            <button
              v-else-if="canEditSection(bab.id)"
              type="button"
              @click="startAddSubsection(bab.id)"
              class="mx-2 mb-2 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-50"
            >
              <Plus class="h-3 w-3" />
              Tambah sub-bab
            </button>
          </div>
        </nav>
      </aside>

      <!-- Center Document Canvas (Scrollable with contrast background) -->
      <main class="min-h-0 flex-1 overflow-auto py-10 px-8 bg-slate-200/90" id="printable-canvas">
        <div class="editor-document-stage" :style="editorPageVariables">
          
          <!-- ================= PAGE 1: COVER OTOMATIS (Hidden if Lampiran Renja) ================= -->
          <section v-if="!currentDoc?.isLampiranOtomatis" id="page-cover" class="a4-page cover-editor-page text-center select-text relative">
            <div class="absolute top-4 right-4 z-10 flex items-center gap-2 no-print">
              <span class="text-[10px] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-blue-700">Sampul dapat diedit</span>
              <button v-if="canEditSection(currentDoc?.sections?.[0]?.id || '')" type="button" @mousedown.prevent @click="resetCover" class="text-[10px] bg-white border border-slate-300 px-2 py-1 rounded text-slate-700 hover:bg-slate-50">Atur Ulang Cover ke Bawaan</button>
            </div>
            <div
              class="cover-editor-layout ProseMirror"
              :contenteditable="canEditSection(currentDoc?.sections?.[0]?.id || '')"
              @input="handleCoverInput"
              v-document-content="coverMarkupForEditor"
              aria-label="Sampul dokumen yang dapat diedit"
            ></div>
            <div v-if="!currentDoc?.documentSettings?.global?.logoData && !currentDoc?.frontMatter?.cover" class="cover-logo-warning no-print">Logo resmi belum diunggah. Unggah melalui Pengaturan Dokumen sebelum ekspor.</div>
          </section>

          <section v-if="currentDoc && !currentDoc.isLampiranOtomatis" id="page-preface" class="a4-page">
            <h2 class="text-center font-bold mb-8">KATA PENGANTAR</h2>
            <div class="ProseMirror" :contenteditable="canEditSection(currentDoc?.sections?.[0]?.id || '')" @input="handlePreface" v-document-content="currentDoc.frontMatter?.preface || defaultPreface"></div>
            <div class="mt-12 ml-auto w-64 text-center">
              <p>{{ currentDoc.documentSettings?.opd.tempat }}, {{ currentDoc.documentSettings?.opd.bulan || '................' }}</p>
              <p>{{ currentDoc.documentSettings?.opd.jabatan || '[Jabatan pimpinan]' }}</p><br/><br/>
              <p>{{ currentDoc.documentSettings?.opd.pimpinan || '[Nama pimpinan]' }}</p>
              <p>{{ currentDoc.documentSettings?.opd.pangkat }}</p><p>NIP {{ currentDoc.documentSettings?.opd.nip || '................' }}</p>
            </div>
            <div class="absolute bottom-4 left-0 right-0 text-center">i</div>
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
            <p v-for="caption in documentCaptions.filter(c => c.kind===kind)" :key="caption.id" class="text-sm mb-3"><button @click="jumpToCaption(caption.id)" class="text-left hover:underline">{{ caption.label }}</button></p>
            <p v-if="!documentCaptions.some(c=>c.kind===kind)" class="text-sm">Tidak ada {{ kind.toLowerCase() }} dalam dokumen ini</p>
          </section>
          <section v-if="currentDoc?.isLampiranOtomatis && store.isSuperAdmin" class="bg-white p-5 mb-4 border rounded no-print">
            <h2 class="font-bold mb-3">Identitas Peraturan Bupati</h2>
            <label v-for="(label,key) in regulationLabels" :key="key" class="block text-xs mb-2">{{ label }}<input v-model="regulation[key]" class="border p-2 ml-2" /></label>
            <button @click="saveRegulation" class="bg-blue-600 text-white p-2 rounded">Simpan identitas peraturan</button>
          </section>
          <!-- ================= CHAPTERS: BAB I s.d. BAB V ================= -->
                    <div v-for="(bab, bIdx) in currentDoc?.sections" :key="bab.id" :id="bab.id" class="editor-chapter-stack">
            <div v-for="(group,gIdx) in canvasGroups(bab)" :key="group.key" class="editor-card-shell"><div class="editor-card-label no-print">{{ group.orientation==='landscape'?'Landscape':'Portrait' }} | F4 | {{ group.subsections[0]?.code }}</div><section class="editor-sub-card a4-page select-text" :data-sub-ids="group.subsections.map(sub=>sub.id).join(',')" :class="group.orientation==='landscape'?'editor-sub-card-landscape':''" :style="subCardStyle(group.orientation)">
              <template v-if="gIdx===0">
            <p v-if="currentDoc?.permissions?.editableBabIds.includes(bab.id) && sessionReady && !leases[bab.id]?.owned" class="no-print text-xs bg-amber-50 text-amber-950 border border-amber-300 p-3 mb-4" role="status">{{ leases[bab.id]?.sameAccount ? 'BAB dibuka pada sesi lain di akun yang sama.' : `BAB sedang diedit ${leases[bab.id]?.holder || 'penyusun lain'}.` }} Mode baca saja sampai kunci dilepas.</p>
            <details v-if="conflicts.some(c=>c.babId===bab.id)" class="no-print bg-amber-50 border border-amber-400 rounded p-3 mb-4 text-xs">
              <summary class="font-bold cursor-pointer">Periksa konflik {{ bab.title }}</summary>
              <div v-for="conflict in conflicts.filter(c=>c.babId===bab.id)" :key="conflict.babId">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 my-3"><div><h4 class="font-bold">Draf perangkat</h4><pre class="whitespace-pre-wrap max-h-64 overflow-auto bg-white p-2">{{ conflictText(conflict.local) }}</pre></div><div><h4 class="font-bold">Versi server</h4><pre class="whitespace-pre-wrap max-h-64 overflow-auto bg-white p-2">{{ conflictText(conflict.server) }}</pre></div></div>
                <button @click="resolveEditorConflict(bab.id,false)" class="border rounded p-2 mr-2">Gunakan versi server; simpan cadangan draf</button>
                <button @click="resolveEditorConflict(bab.id,true)" :disabled="!leases[bab.id]?.owned" class="border rounded p-2 disabled:opacity-50">Pulihkan draf sebagai perubahan baru</button>
              </div>
            </details>
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

            </template>
<!-- Subsections -->
            <div v-for="sub in group.subsections" :key="sub.id" :id="sub.id" class="mb-6 editor-subsection" :data-orientation="group.orientation" @focusin="setActiveSub(bab.id,sub.id)">
              <p v-if="sub.legacyOrientationWarning" class="no-print mb-2 border border-amber-300 bg-amber-50 text-amber-900 text-xs p-2" role="status">Sub-bab ini berisi bagian orientasi campuran dari versi lama.</p>
              <div v-if="sub.orientation==='portrait'&&subHasWideTable(sub)" class="no-print mb-2 border border-amber-300 bg-amber-50 text-amber-900 text-xs p-2 flex items-center justify-between gap-2"><span>Tabel ini lebar. Jadikan sub-bab ini landscape?</span><button @click="setSubOrientation(bab.id,sub.id,'landscape')" class="border border-amber-500 bg-white rounded px-2 py-1">Jadikan landscape</button></div>
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
                :class="[canEditSection(bab.id) ? '' : 'cursor-default bg-slate-50/40']"
                @input="handleSectionInput($event, bab.id, sub.id)"
                :data-bab-id="bab.id" :data-sub-id="sub.id"
                v-document-content="sub.content"
              ></div>
              <StandardTable v-for="table in sub.tables || []" :key="table.id" :table="table" :tahun="currentDoc?.tahun || '2027'" :caption="tableCaption(table.id)" :editable="canEditSection(bab.id)" @update="updateTable(sub,table.id,$event)" @remove="removeTable(sub,table.id)" />
            </div>

            <!-- Running Footer / Page Number -->
            <div class="editor-card-footer text-center text-xs text-slate-500 font-serif border-t border-slate-200 pt-2 mt-auto">
              {{ currentDoc?.isLampiranOtomatis ? `RENJA ${currentDoc.tahun} ${documentOpdName}` : `Rencana Kerja ${documentOpdName} tahun ${currentDoc?.tahun}` }}
            </div><div v-for="page in pageGuideCount(group)-1" :key="`${group.key}-guide-${page}`" class="editor-page-guide no-print" :style="pageGuideStyle(group.orientation,page)" aria-hidden="true"><span>Halaman {{ page+1 }}</span></div></section>
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
            <p class="truncate text-xs text-slate-500">{{ currentDoc?.fileName }} Â· sumber OPD tidak diubah</p>
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
              {{ currentDoc?.status === 'Draft' ? 'Dokumen belum diajukan OPD' : `Dokumen berstatus â€œ${currentDoc?.status}â€` }}
            </p>
            <p class="mt-2 text-xs leading-relaxed text-amber-800">
              {{ currentDoc?.status === 'Draft'
                ? `Minta ${currentDoc?.opdName || 'OPD pemilik'} membuka dokumen ini lalu memilih â€œAjukan ke Adminâ€. Setelah status menjadi â€œMenunggu Verifikasiâ€, pilihan persetujuan dan catatan revisi akan aktif di panel ini.`
                : 'Keputusan verifikasi hanya dapat diberikan saat dokumen berstatus â€œMenunggu Verifikasiâ€.' }}
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
      <div class="bg-white p-3 flex flex-wrap gap-2 justify-between items-center text-xs">
        <strong>{{ previewFrame?.contentDocument?.body.dataset.editor==='true' ? 'Kanvas cetak / sunting' : 'Pratinjau halaman dokumen' }}</strong>
        <div v-if="pagedBridge" class="flex flex-wrap gap-1" aria-label="Toolbar kanvas cetak"><button v-for="tool in pagedTools" :key="tool.command" @mousedown.prevent @click="pagedBridge?.command(tool.command)" class="border rounded px-2 py-1">{{ tool.label }}</button><button @mousedown.prevent @click="pagedBridge?.reflow()" class="border rounded px-2 py-1">Tata ulang halaman</button><span>{{ online ? (isSaving ? 'Menyimpan...' : hasUnsavedChanges ? 'Perubahan menunggu simpan' : 'Tersimpan') : 'Offline; disimpan di perangkat' }}</span></div>
        <label>Zoom <select v-model="previewZoom" @change="updatePreviewView" class="border rounded p-2"><option v-for="value in [50,70,90,100,120]" :key="value" :value="value">{{ value }}%</option></select></label>
        <label>Halaman <input v-model.number="previewPage" type="number" :min="1" :max="previewPageCount || 1" @change="jumpPreviewPage" class="w-16 border rounded p-2" /></label>
        <span role="status">Halaman {{ previewPage }} dari {{ previewPageCount }}</span>
        <div class="flex gap-2 overflow-x-auto max-w-sm" aria-label="Thumbnail halaman"><button v-for="(item,index) in previewThumbnails" :key="index" @click="previewPage=index+1; jumpPreviewPage()" :title="`Halaman ${index+1} - ${item.landscape ? 'Landscape' : 'Portrait'}`" class="shrink-0 border border-slate-500 bg-white text-slate-900 relative overflow-hidden" :class="item.landscape ? 'w-[100px] h-[66px]' : 'w-[66px] h-[100px]'"><iframe :srcdoc="item.html" loading="lazy" sandbox="allow-same-origin" :title="`Isi halaman ${index+1}`" tabindex="-1" class="w-full h-full border-0 pointer-events-none"/><span class="absolute bottom-0 right-0 bg-white px-1 text-[10px]">{{ index+1 }}{{ item.landscape ? ' L' : '' }}</span></button></div>
        <button @click="closePreview" class="bg-blue-700 text-white p-2 rounded">Kembali ke editor</button>
      </div>
      <iframe ref="previewFrame" @load="initializePreview" :srcdoc="previewHtml" sandbox="allow-scripts allow-same-origin" class="w-full flex-1 border-0" title="Pratinjau halaman dokumen"></iframe>
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

    <div v-if="orientationDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Pilih sub-bab untuk orientasi"><div class="w-full max-w-lg max-h-[85vh] overflow-auto bg-white rounded-xl p-5 shadow-lg"><h2 class="font-bold mb-3">Pilih beberapa sub-bab</h2><p class="text-xs text-slate-600 mb-3">Pilihan dibatasi pada BAB {{ activeBab?.title }}.</p><label v-for="sub in activeBab?.subsections||[]" :key="sub.id" class="flex items-center gap-2 border-b py-2 text-sm"><input type="checkbox" :value="sub.id" v-model="selectedOrientationSubIds" /> {{ sub.code }} {{ sub.title }}</label><div class="flex justify-end gap-2 mt-4"><button @click="orientationDialogOpen=false;orientationTarget='current'" class="border rounded px-3 py-2">Batal</button><button @click="applyMultipleOrientation('portrait')" class="border rounded px-3 py-2">Portrait</button><button @click="applyMultipleOrientation('landscape')" class="bg-blue-700 text-white rounded px-3 py-2">Landscape</button></div></div></div>
    <div v-if="orientationContext" class="fixed z-50 bg-white border shadow-lg rounded p-1 text-xs" :style="{left:orientationContext.x+'px',top:orientationContext.y+'px'}"><button @click="setSubOrientation(orientationContext.babId,orientationContext.subId,'portrait');orientationContext=null" class="block w-full text-left px-3 py-2 hover:bg-blue-50">Orientasi: Portrait</button><button @click="setSubOrientation(orientationContext.babId,orientationContext.subId,'landscape');orientationContext=null" class="block w-full text-left px-3 py-2 hover:bg-blue-50">Orientasi: Landscape</button></div>
    <iframe ref="guideFrame" :srcdoc="guideHtml" title="Pengukur panduan halaman" aria-hidden="true" tabindex="-1" style="position:fixed;left:-10000px;top:0;width:1247px;height:900px;visibility:hidden;pointer-events:none"></iframe>
    <ImageDialog v-if="insertImageModal" :source="imageUrlInput" :caption="imageCaptionInput" :initial-width="imageOptions.width" :initial-alignment="imageOptions.alignment" :initial-placement="imageOptions.placement" :editing="!!editingImage" @close="insertImageModal=false" @confirm="confirmInsertImage" />
    <div v-if="captionModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="caption-dialog-title"><form @submit.prevent="confirmCaption" class="w-full max-w-md bg-white rounded-xl p-5 text-sm shadow-lg"><h3 id="caption-dialog-title" class="font-bold mb-3">{{ captionKind }}: caption wajib</h3><p class="text-xs text-slate-700 mb-3">Nomor mengikuti BAB dan urutan objek secara otomatis.</p><label>Judul / keterangan<input v-model="captionTitleInput" required maxlength="300" autofocus aria-label="Judul caption" class="mt-1 block w-full border border-slate-400 rounded p-2" /></label><div class="flex justify-end gap-2 mt-4"><button type="button" @click="captionModal=false" class="border rounded p-2">Batal</button><button :disabled="!captionTitleInput.trim()" class="bg-blue-800 text-white rounded p-2 disabled:opacity-50">Simpan caption</button></div></form></div>
    <div v-if="referenceModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reference-dialog-title"><form @submit.prevent="confirmReference" class="w-full max-w-lg bg-white rounded-xl p-5 text-sm shadow-lg"><h3 id="reference-dialog-title" class="font-bold mb-3">Sisipkan rujukan silang</h3><label>Tabel atau gambar<select v-model="referenceTarget" required aria-label="Target rujukan silang" class="mt-1 block w-full border border-slate-400 rounded p-2"><option value="">Pilih caption</option><option v-for="entry in documentCaptions" :key="entry.id" :value="entry.id">{{ entry.label }}</option></select></label><p class="text-xs text-slate-700 mt-2">Rujukan mengikuti nomor terbaru. Jika objek dihapus, rujukan ditandai untuk diperbaiki.</p><div class="flex justify-end gap-2 mt-4"><button type="button" @click="referenceModal=false" class="border rounded p-2">Batal</button><button :disabled="!referenceTarget" class="bg-blue-800 text-white rounded p-2 disabled:opacity-50">Sisipkan rujukan</button></div></form></div>
  </div>
    <aside v-if="formatOpen && formatReport" aria-label="Hasil Cek Format" class="fixed right-3 top-24 bottom-4 w-80 max-w-[90vw] bg-white border border-slate-300 rounded-xl shadow-xl z-50 p-4 overflow-y-auto select-text">
      <div class="flex justify-between"><h2 class="font-bold">Cek Format</h2><button @click="formatOpen=false" aria-label="Tutup Cek Format">Tutup</button></div>
      <p class="text-sm mt-3">Kelengkapan isi: {{ formatReport.score }}%</p>
      <p v-if="formatChecking" class="text-xs text-blue-700">Memeriksa pembagian halaman cetak...</p>
      <p v-if="formatError" class="text-xs text-red-700">{{ formatError }}</p>
      <p v-if="formatStale" class="text-xs text-amber-800">Isi berubah setelah diperiksa. Tekan Periksa ulang.</p>
      <p class="text-sm my-2" :class="formatReport.canSubmit?'text-emerald-700':'text-red-700'">{{ formatReport.canSubmit?'Format wajib terpenuhi.':'Perbaiki masalah wajib sebelum mengajukan.' }}</p>
      <p v-for="bab in formatReport.chapters" :key="bab.id" class="text-xs py-1">{{ bab.title }}: {{ bab.complete }}/{{ bab.total }} terisi Â· {{ bab.required }} masalah wajib</p>
      <template v-for="level in ['required','suggestion']" :key="level">
        <h3 class="font-semibold text-sm mt-4">{{ level==='required'?'Wajib diperbaiki':'Saran perapihan' }}</h3>
        <button v-for="issue in formatReport.issues.filter(i=>i.level===level)" :key="issue.id" @click="jumpToFormatIssue(issue)" class="block text-left text-xs border rounded-lg p-3 my-2 w-full hover:bg-slate-50" :class="level==='required'?'text-red-700 border-red-200':'text-amber-800 border-amber-200'">{{ issue.message }} <span class="block mt-1 underline">Lihat lokasi</span></button>
        <p v-if="!formatReport.issues.some(i=>i.level===level)" class="text-xs text-slate-500">Tidak ada masalah.</p>
      </template>
      <button @click="runFormatCheck" class="text-sm mt-3 text-blue-700 underline">Periksa ulang</button>
    </aside>
  <div v-if="fileImportOpen" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Impor dokumen"><form @submit.prevent="applyFileImport" class="bg-white rounded-xl p-5 w-full max-w-xl text-sm max-h-[90vh] overflow-auto"><h2 class="font-bold mb-3">{{ fileImportKind==='word'?'Impor Word per BAB':'Impor tabel Excel/CSV' }}</h2><p class="text-xs mb-3">{{ fileImportDestination }}. Struktur dan judul template tetap mengikuti versi dokumen.</p><input type="file" :accept="fileImportKind==='word'?'.docx':'.xlsx,.csv'" @change="convertFileImport" :disabled="fileImportBusy" aria-label="Berkas impor" /><p v-if="fileImportBusy" role="status" class="my-2">Memproses berkas...</p><p v-if="fileImportError" role="alert" class="text-red-700 my-2">{{ fileImportError }}</p><template v-if="fileImportResult"><label v-if="fileImportResult.sheets?.length>1" class="block my-3">Lembar Excel<select v-model="fileImportSheet" @change="convertFileImport()" class="border p-2 ml-2"><option v-for="sheet in fileImportResult.sheets" :key="sheet">{{ sheet }}</option></select></label><label v-if="fileImportKind==='word'" class="block my-3"><input type="checkbox" v-model="fileImportReplace" /> Ganti isi sub-bab yang terpetakan; isi lama dicadangkan di perangkat</label><template v-else><label class="block my-3">Judul caption<input v-model="fileImportCaption" required maxlength="300" class="border p-2 w-full" /></label><label v-if="fileImportTableTarget" class="block"><input type="checkbox" v-model="fileImportReplace" /> Ganti tabel yang sedang dipilih</label></template><h3 class="font-semibold mt-3">Peringatan konversi</h3><ul class="list-disc pl-5 text-xs my-2"><li v-for="warning in fileImportResult.warnings" :key="warning">{{ warning }}</li></ul><p v-if="!fileImportResult.warnings.length" class="text-xs">Tidak ada peringatan konversi.</p><details><summary>Pratinjau isi</summary><pre class="whitespace-pre-wrap max-h-52 overflow-auto bg-slate-50 p-2 text-xs">{{ fileImportPreview }}</pre></details></template><div class="flex gap-2 justify-end mt-4"><button type="button" @click="fileImportOpen=false" :disabled="fileImportBusy" class="border rounded p-2">Batal</button><button :disabled="!fileImportResult||fileImportBusy" class="bg-blue-800 text-white rounded p-2 disabled:opacity-50">Terapkan impor</button></div></form></div>
  <DocumentReview v-if="reviewOpen&&currentDoc" :document="currentDoc" :target="commentTarget" @close="reviewOpen=false" @jump="jumpToComment" @open-versions="openHistoricalVersion" @open-count="openCommentCount=$event" />
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useAppStore } from '../../stores/appStore';
import type { DocumentItem, Section, Subsection } from '../../types';
import { apiFetch } from '../../lib/api';
import StandardTable from './StandardTable.vue';
import TableToolbar from './TableToolbar.vue';
import ImageDialog from './ImageDialog.vue';
import DocumentReview from './DocumentReview.vue';
import {pagedCanvas} from './paged-canvas';
import { blankTable, tableDefinitions, tableNeedsLandscape } from '../../../../shared/document-tables.js';
import { editableContentNodes } from '../../../../shared/editor-orientation.js';
import { normalizeSubsectionOrientation } from '../../../../shared/editor-orientation.js';
import { F4_PAGE_LAYOUT } from '../../../../shared/f4-page-layout.js';
import { findTextRanges, showSearchHighlights, clearSearchHighlights, selectionEditor } from './editor-tools';
import { pasteDocument, sanitizePasteAsync, plainTextHtml } from '../../../../shared/editor-paste.js';
import { tableGrid, editTable, tidyTable } from '../../../../shared/editor-table.js';
import { indexCaptions, captionTitle, captionObject } from '../../../../shared/document-captions.js';
import { imageBlobData,processImage } from './image-processing';
import {checkDocumentFormat, type FormatReport, type FormatIssue} from '../../../../shared/document-format.js';
import {putEditorDraft,editorDrafts,chapterContent,type EditorDraft} from './editor-drafts';
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
// Avoid reassigning innerHTML after each keystroke: browsers keep caret and undo history
// only while the native editable DOM remains intact.
const vDocumentContent = {
  mounted(element: HTMLElement, binding: { value: string }) { element.innerHTML = binding.value || ''; },
  updated(element: HTMLElement, binding: { value: string }) {
    const value = binding.value || '';
    if (element.innerHTML !== value) element.innerHTML = value;
  },
};
const route = useRoute();
const router = useRouter();

const currentDoc = ref<DocumentItem | null>(null);
const reviewOpen=ref(false),commentTarget=ref<any>(null);
const openCommentCount=ref(0);
function openDocumentReview(){
 const anchor=window.getSelection()?.anchorNode;const element=anchor instanceof HTMLElement?anchor:anchor?.parentElement;
 const root=element?.closest<HTMLElement>('.ProseMirror[data-sub-id]');
 if(root){const table=element?.closest('table'),paragraph=element?.closest('p,li,div');const target=table||paragraph;
 commentTarget.value={babId:root.dataset.babId,subId:root.dataset.subId,kind:table?'table':'paragraph',objectId:table?.getAttribute('data-object-id')||'',index:table?[...root.querySelectorAll('table')].indexOf(table):[...root.querySelectorAll('p,li,div')].indexOf(paragraph!),quote:target?.textContent?.trim().slice(0,2000)||''};}
 else commentTarget.value=null;
 formatOpen.value=false;reviewOpen.value=true;
}
function jumpToComment(target:any){
 const root=[...document.querySelectorAll<HTMLElement>('.ProseMirror[data-sub-id]')].find(r=>r.dataset.subId===target.subId);if(!root)return;
 const nodes=[...root.querySelectorAll<HTMLElement>(target.kind==='table'?'table':'p,li,div')];
 const found=target.objectId?nodes.find(n=>n.dataset.objectId===target.objectId):nodes.find(n=>n.textContent?.trim()===target.quote);
 if(!found){store.addToast('Isi pada lokasi komentar telah berubah; periksa sub-bab ini.','info');root.scrollIntoView({block:'center'});return;}
 found.scrollIntoView({behavior:'smooth',block:'center'});found.animate([{outline:'3px solid #d97706'},{outline:'3px solid transparent'}],{duration:2000});
}
async function openHistoricalVersion(versionId:string){
 pagedBridge.value?.dispose();pagedBridge.value=null;pagedBase.clear();
 const response=await apiFetch(`/api/documents/${currentDoc.value!.id}/versions/${versionId}/preview`);if(!response.ok){store.addToast('Versi tidak dapat dibuka','error');return;}previewHtml.value=await response.text();reviewOpen.value=false;
}
const fileImportOpen=ref(false),fileImportBusy=ref(false),fileImportError=ref(''),fileImportKind=ref('word'),fileImportSheet=ref(''),fileImportReplace=ref(false),fileImportCaption=ref('');
const fileImportResult=ref<any>(null),fileImportBab=ref(''),fileImportSub=ref('');
let fileImportFile:File|null=null;
const fileImportTableTarget=ref<HTMLTableElement|null>(null);
const fileImportDestination=computed(()=>currentDoc.value?.sections?.find(b=>b.id===fileImportBab.value)?.title||'');
const fileImportPreview=computed(()=>new DOMParser().parseFromString(fileImportResult.value?.html||'','text/html').body.textContent);
function openFileImport(babId:string,subId:string,kind:string){
 if(!canEditSection(babId))return;
 fileImportBab.value=babId;fileImportSub.value=subId;fileImportKind.value=kind;fileImportResult.value=null;fileImportFile=null;fileImportSheet.value='';fileImportReplace.value=false;fileImportError.value='';
 const table=activeTable.value?.table;
 fileImportTableTarget.value=table?.closest<HTMLElement>('[data-sub-id]')?.dataset.subId===subId?table:null;
 fileImportCaption.value=fileImportTableTarget.value?captionTitle([...fileImportTableTarget.value.closest('.ProseMirror')!.querySelectorAll<HTMLElement>('.doc-caption')].find(c=>captionObject(c,fileImportTableTarget.value!.closest('.ProseMirror') as HTMLElement)===fileImportTableTarget.value) || document.createElement('p')):'';
 fileImportOpen.value=true;
}
function selectedEditableSubsection(){
 const root=getEditableSelection();
 const bab=currentDoc.value?.sections?.find(section=>section.id===root?.dataset.babId&&canEditSection(section.id))
  || currentDoc.value?.sections?.find(section=>canEditSection(section.id)&&section.subsections?.length);
 const sub=bab?.subsections.find(item=>item.id===root?.dataset.subId)||bab?.subsections[0];
 if(!bab||!sub){store.addToast('Klik isi sub-bab yang dapat diedit terlebih dahulu.','info');return null;}
 return {bab,sub};
}
function openFileImportAtSelection(kind:string){
 const target=selectedEditableSubsection();
 if(target)openFileImport(target.bab.id,target.sub.id,kind);
}
function addTableAtSelection(type:string){
 const target=selectedEditableSubsection();
 if(target)addTable(target.sub,type);
}
async function convertFileImport(event?:Event){
 const selected=(event?.target as HTMLInputElement)?.files?.[0];if(selected){fileImportFile=selected;fileImportSheet.value='';}if(!fileImportFile)return;
 fileImportBusy.value=true;fileImportError.value='';fileImportResult.value=null;
 try{const form=new FormData();form.append('file',fileImportFile);form.append('allowBold',String(templateAllowsBold()));if(fileImportSheet.value)form.append('sheet',fileImportSheet.value);
 const response=await apiFetch('/api/editor/import',{method:'POST',body:form});const result=await response.json();if(!response.ok)throw new Error(result.error);
 const root=new DOMParser().parseFromString(result.html,'text/html').body;
 for(const image of root.querySelectorAll('img[src]')){try{const processed=await processImage(image.getAttribute('src')!,{left:0,right:0,top:0,bottom:0});image.setAttribute('src',processed.data);image.setAttribute('data-image-width',String(processed.width));image.setAttribute('data-image-height',String(processed.height));}catch(error:any){result.warnings.push(`Gambar tidak dapat dimuat: ${error.message}`);image.remove();}}
 result.html=root.innerHTML;fileImportResult.value=result;fileImportSheet.value=result.sheet||'';
 }catch(error:any){fileImportError.value=error.message;}finally{fileImportBusy.value=false;}
}
async function applyFileImport(){
 if(!fileImportResult.value||!canEditSection(fileImportBab.value))return;
 fileImportBusy.value=true;fileImportError.value='';
 try{
 const bab=currentDoc.value!.sections!.find(b=>b.id===fileImportBab.value)!;
 const backup=draftRecord(true);backup.key+=`:before-import-${crypto.randomUUID()}`;backup.archived=true;await putEditorDraft(backup);
 const parsed=new DOMParser().parseFromString(fileImportResult.value.html,'text/html').body;
 const groups=new Map<string,string>();let subId=fileImportSub.value;
 if(fileImportKind.value==='word'){
 const wanted=bab.title.match(/BAB\s+([IVXLCDM]+|\d+)/i)?.[1]?.toUpperCase();const chapterNodes=[...parsed.children].filter(n=>/^H[1-6]$/.test(n.tagName)&&/^BAB\s/i.test(n.textContent?.trim()||''));
 if(chapterNodes.length&&!chapterNodes.some(n=>n.textContent?.trim().match(/^BAB\s+([IVXLCDM]+|\d+)\b/i)?.[1]?.toUpperCase()===wanted))throw new Error('BAB tujuan tidak ditemukan dalam berkas. Pilih berkas BAB yang sesuai.');
 let include=chapterNodes.length===0;
 for(const node of [...parsed.children]){
 const text=node.textContent?.trim()||'';
 if(chapterNodes.includes(node)){include=text.match(/^BAB\s+([IVXLCDM]+|\d+)\b/i)?.[1]?.toUpperCase()===wanted;continue;}if(!include)continue;
 const match=/^H[1-6]$/.test(node.tagName)?bab.subsections.find(s=>text.toLowerCase()===`${s.code} ${s.title}`.toLowerCase()||text.toLowerCase()===s.title.toLowerCase()):null;
 if(match){subId=match.id;continue;}if(/^H[1-6]$/.test(node.tagName)&&/^BAB\s/i.test(text))continue;
 groups.set(subId,(groups.get(subId)||'')+node.outerHTML);
 }
 }else{
 const id=fileImportReplace.value&&fileImportTableTarget.value?.getAttribute('data-object-id')||crypto.randomUUID();const table=parsed.querySelector('table')!;table.setAttribute('data-object-id',id);
 const caption=document.createElement('p');caption.className='doc-caption';caption.dataset.captionId=id;caption.dataset.captionFor=id;caption.textContent=`Tabel 1.1 ${fileImportCaption.value.trim()}`;
 const sub=bab.subsections.find(s=>s.id===subId)!;
 const root=new DOMParser().parseFromString(sub.content,'text/html').body;
 if(fileImportReplace.value&&fileImportTableTarget.value){const index=[...fileImportTableTarget.value.closest('.ProseMirror')!.querySelectorAll('table')].indexOf(fileImportTableTarget.value);const target=root.querySelectorAll('table')[index];const oldCaption=[...root.querySelectorAll<HTMLElement>('.doc-caption')].find(c=>captionObject(c,root)===target);oldCaption?.remove();target.replaceWith(caption,table);groups.set(subId,root.innerHTML);}
 else groups.set(subId,sub.content+caption.outerHTML+table.outerHTML);
 }
 for(const [id,html] of groups){const root=[...document.querySelectorAll<HTMLElement>('.ProseMirror[data-sub-id]')].find(r=>r.dataset.subId===id);if(!root)continue;const content=fileImportKind.value==='word'&&!fileImportReplace.value?root.innerHTML+html:html;root.focus();const range=document.createRange();range.selectNodeContents(root);const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range);document.execCommand('insertHTML',false,content);root.dispatchEvent(new InputEvent('input',{bubbles:true}));}
 renumberCaptions(false);await checkpoint(true);fileImportOpen.value=false;store.addToast(`Impor diterapkan. ${fileImportResult.value.warnings.length} peringatan; periksa caption dan Cek Format.`,'info');
 }catch(error:any){fileImportError.value=error.message;}finally{fileImportBusy.value=false;}
}
const formatOpen=ref(false);
const formatReport=ref<FormatReport|null>(null);
const formatChecking=ref(false);
const formatError=ref('');
const formatStale=ref(false);
let formatRevision=0;
async function runFormatCheck(){
  if(!currentDoc.value||formatChecking.value)return false;
  const local=checkDocumentFormat(currentDoc.value,sub=>{
    const live=[...document.querySelectorAll<HTMLElement>('.ProseMirror[data-sub-id]')].find(el=>el.dataset.subId===sub.id);
    return live || new DOMParser().parseFromString(sub.content||'','text/html').body;
  });
  formatReport.value=local;
  formatError.value='';formatStale.value=false;
  formatOpen.value=true;
  formatChecking.value=true;
  try{
    const revision=formatRevision;
    await flushSave();
    const response=await apiFetch(`/api/documents/${currentDoc.value.id}/format-check`);
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Pemeriksaan format gagal');
    if(revision!==formatRevision)throw new Error('Isi berubah saat pemeriksaan. Tekan Periksa ulang.');
    local.issues.push(...result.issues.filter((issue:FormatIssue)=>!local.issues.some(i=>i.code===issue.code&&i.subId===issue.subId)));
    local.canSubmit=!local.issues.some(i=>i.level==='required');
    for(const bab of local.chapters)bab.required=local.issues.filter(i=>i.babId===bab.id&&i.level==='required').length;
    formatReport.value={...local};
    return true;
  }catch(error:any){formatError.value=error.message;store.addToast(error.message,'error');return false;}
  finally{formatChecking.value=false;}
}
function jumpToFormatIssue(issue:FormatIssue){
  if(issue.code==='cover-address'){router.push('/pengaturan/dokumen');return;}
  if(issue.code==='cover-logo'){router.push('/pengaturan/dokumen');return;}
  const root=[...document.querySelectorAll<HTMLElement>('.ProseMirror[data-sub-id]')].find(el=>el.dataset.subId===issue.subId);
  const selectors:Record<string,string>={table:'table',image:'img',reference:'.doc-reference',element:'*'};
  const selector=selectors[issue.target.type];
  const object=issue.target.objectId?[...document.querySelectorAll<HTMLElement>('[data-object-id],[id]')].find(el=>el.dataset.objectId===issue.target.objectId||el.id===issue.target.objectId):null;
  const target=object||(selector?root?.querySelectorAll<HTMLElement>(selector)[issue.target.index||0]:root)||document.getElementById(issue.babId);
  target?.scrollIntoView({behavior:'smooth',block:'center'});
  target?.animate([{outline:'3px solid #dc2626'},{outline:'3px solid transparent'}],{duration:2200});
}
const zoom = ref(100);
const showShortcutHelp = ref(false);
const activeTable = ref<{ table: HTMLTableElement; row: number; column: number; selected: number[]; rows: number; columns: number; repeat: boolean; noSplit: boolean; wide: boolean } | null>(null);
const tableMessage = ref('');
const activeBabId=ref(''),activeSubId=ref(''),orientationTarget=ref('current'),orientationDialogOpen=ref(false),selectedOrientationSubIds=ref<string[]>([]),orientationContext=ref<{x:number;y:number;babId:string;subId:string}|null>(null);
type OrientationState={orientation:'portrait'|'landscape';pageBreakBefore:boolean};
type OrientationHistoryEntry={babId:string;before:Record<string,OrientationState>;after:Record<string,OrientationState>};
let orientationUndoPending=false;const orientationHistory:OrientationHistoryEntry[]=[];let orientationRedo:OrientationHistoryEntry[]=[];
const activeBab=computed(()=>currentDoc.value?.sections?.find(b=>b.id===activeBabId.value)||null);const activeSub=computed(()=>activeBab.value?.subsections?.find(sub=>sub.id===activeSubId.value)||null);const activeSubLabel=computed(()=>activeSub.value?activeSub.value.code+' '+activeSub.value.title:'');
const editorPageVariables=computed(()=>({'--f4-portrait-width':F4_PAGE_LAYOUT.portrait.widthPx+'px','--f4-portrait-height':F4_PAGE_LAYOUT.portrait.heightPx+'px','--f4-landscape-width':F4_PAGE_LAYOUT.landscape.widthPx+'px','--f4-landscape-height':F4_PAGE_LAYOUT.landscape.heightPx+'px','--f4-margin':F4_PAGE_LAYOUT.marginMm+'mm','--f4-portrait-content-height':F4_PAGE_LAYOUT.portrait.contentHeightMm+'mm','--f4-landscape-content-height':F4_PAGE_LAYOUT.landscape.contentHeightMm+'mm','--editor-zoom':String(zoom.value/100)} as any));
const pageGuideCounts=reactive<Record<string,number>>({});const guideFrame=ref<HTMLIFrameElement>(),guideHtml=ref('');let guideRefreshTimer:ReturnType<typeof setTimeout>|undefined,guidePollTimer:ReturnType<typeof setInterval>|undefined;
function pageGuideCount(group:{subsections:Subsection[]}){return pageGuideCounts[group.subsections[0]?.id]||1;}
function pageGuideStyle(orientation:'portrait'|'landscape',page:number){return {top:(page*F4_PAGE_LAYOUT[orientation].heightPx)+'px'};}
async function refreshPageGuides(){
 const doc=currentDoc.value;if(!doc||doc.cara==='upload')return;
 try{
  await flushSave();const response=await apiFetch('/api/documents/'+doc.id+'/preview');if(!response.ok)return;
  guideHtml.value=await response.text();await nextTick();clearInterval(guidePollTimer);
  guidePollTimer=setInterval(()=>{
   const frame=guideFrame.value?.contentDocument;if(!frame||!(frame.defaultView as any)?.documentReady)return;
   clearInterval(guidePollTimer);const anchorPages=new Map<string,number>();
   for(const anchor of frame.querySelectorAll<HTMLElement>('[data-anchor]')){const paper=anchor.closest<HTMLElement>('.paper[data-part="body"]');if(paper)anchorPages.set(anchor.dataset.anchor!,Number(paper.dataset.number));}
   const pages=[...frame.querySelectorAll<HTMLElement>('.paper[data-part="body"]')].map(paper=>Number(paper.dataset.number));
   const cards=[...document.querySelectorAll<HTMLElement>('.editor-sub-card')];
   cards.forEach((card,index)=>{const ids=(card.dataset.subIds||'').split(',').filter(Boolean),start=ids.map(id=>anchorPages.get(id)).find(Number.isFinite);if(!start)return;const nextCard=cards[index+1],nextIds=(nextCard?.dataset.subIds||'').split(',').filter(Boolean),nextStart=nextIds.map(id=>anchorPages.get(id)).find(Number.isFinite),end=nextStart||Math.max(...pages),count=nextStart?Math.max(1,end-start):Math.max(1,end-start+1);for(const id of ids)pageGuideCounts[id]=count;});
  },100);setTimeout(()=>clearInterval(guidePollTimer),15000);
 }catch{/* A later edit or preview will retry page measurement. */}
}
function schedulePageGuides(){clearTimeout(guideRefreshTimer);guideRefreshTimer=setTimeout(()=>void refreshPageGuides(),500);}
function canvasGroups(bab:Section){const groups:Array<{key:string;orientation:'portrait'|'landscape';subsections:Subsection[]}> = [];for(const [index,sub] of (bab.subsections||[]).entries()){const orientation=sub.orientation==='landscape'?'landscape':'portrait',previous=groups[groups.length-1];if(!previous||previous.orientation!==orientation||sub.pageBreakBefore===true)groups.push({key:sub.id+'-'+index,orientation,subsections:[sub]});else previous.subsections.push(sub);}return groups;}
function subCardStyle(orientation:'portrait'|'landscape'){const page=F4_PAGE_LAYOUT[orientation];return {width:page.widthPx+'px',minHeight:page.heightPx+'px',padding:F4_PAGE_LAYOUT.marginMm+'mm'};}
function setActiveSub(babId:string,subId:string){activeBabId.value=babId;activeSubId.value=subId;}
function openOrientationContext(event:MouseEvent,babId:string,subId:string){setActiveSub(babId,subId);orientationContext.value={x:event.clientX,y:event.clientY,babId,subId};}
function subHasWideTable(sub:Subsection){const root=[...document.querySelectorAll<HTMLElement>('.ProseMirror[data-sub-id]')].find(item=>item.dataset.subId===sub.id);return [...(root?.querySelectorAll('table')||[])].some(table=>tableNeedsLandscape(table,F4_PAGE_LAYOUT.portrait.contentWidthMm));}
function recordOrientationChange(bab:Section,subs:Subsection[],orientation?:'portrait'|'landscape',pageBreakBefore?:boolean){const before:Record<string,{orientation:'portrait'|'landscape';pageBreakBefore:boolean}>={},after:typeof before={};for(const sub of subs){before[sub.id]={orientation:sub.orientation==='landscape'?'landscape':'portrait',pageBreakBefore:sub.pageBreakBefore===true};if(orientation)sub.orientation=orientation;if(pageBreakBefore!==undefined)sub.pageBreakBefore=pageBreakBefore;after[sub.id]={orientation:sub.orientation==='landscape'?'landscape':'portrait',pageBreakBefore:sub.pageBreakBefore===true};}if(JSON.stringify(before)===JSON.stringify(after))return;orientationHistory.push({babId:bab.id,before,after});if(orientationHistory.length>50)orientationHistory.shift();orientationRedo=[];orientationUndoPending=true;triggerAutosave();schedulePageGuides();}
function applyOrientation(orientation:'portrait'|'landscape'){const bab=activeBab.value,sub=activeSub.value;if(!bab||!sub){store.addToast('Pilih sub-bab di sidebar atau klik isinya terlebih dahulu.','info');return;}if(orientationTarget.value==='multiple'){orientationDialogOpen.value=true;return;}recordOrientationChange(bab,orientationTarget.value==='chapter'?bab.subsections:[sub],orientation);}
function applyMultipleOrientation(orientation:'portrait'|'landscape'){const bab=activeBab.value;if(!bab)return;const targets=bab.subsections.filter(sub=>selectedOrientationSubIds.value.includes(sub.id));if(!targets.length){store.addToast('Pilih setidaknya satu sub-bab.','info');return;}recordOrientationChange(bab,targets,orientation);orientationDialogOpen.value=false;orientationTarget.value='current';}
function setSubOrientation(babId:string,subId:string,orientation:'portrait'|'landscape'){const bab=currentDoc.value?.sections?.find(item=>item.id===babId),sub=bab?.subsections.find(item=>item.id===subId);if(bab&&sub){setActiveSub(babId,subId);recordOrientationChange(bab,[sub],orientation);}}
function setPageBreakBefore(value:boolean){if(activeBab.value&&activeSub.value)recordOrientationChange(activeBab.value,[activeSub.value],undefined,value);}
function onOrientationTargetChange(){if(orientationTarget.value==='multiple'){selectedOrientationSubIds.value=activeBab.value?.subsections.map(sub=>sub.id)||[];orientationDialogOpen.value=true;}}
function restoreOrientationSnapshot(entry:typeof orientationHistory[number],side:'before'|'after'){const bab=currentDoc.value?.sections?.find(item=>item.id===entry.babId);if(!bab)return;for(const sub of bab.subsections){const state=entry[side][sub.id];if(state){sub.orientation=state.orientation;sub.pageBreakBefore=state.pageBreakBefore;}}triggerAutosave();}
function handleOrientationHistory(event:KeyboardEvent){if(!(event.ctrlKey||event.metaKey)||!['z','y'].includes(event.key.toLowerCase()))return;if(!orientationUndoPending)return;const undo=event.key.toLowerCase()==='z'&&!event.shiftKey,entry=undo?orientationHistory.pop():orientationRedo.pop();if(!entry)return;event.preventDefault();event.stopImmediatePropagation();restoreOrientationSnapshot(entry,undo?'before':'after');orientationUndoPending=true; (undo?orientationRedo:orientationHistory).push(entry);}
function landscapeSelectedTable() {
  trackTableSelection();
  const table = activeTable.value?.table;
  const root = table?.closest<HTMLElement>('.ProseMirror[contenteditable="true"]');
  if (!table || !root) return;
  const section = document.createElement('div'); section.className = 'doc-section doc-section-landscape';
  const previous = table.previousElementSibling;
    const following = table.nextElementSibling;
    const caption = previous?.classList.contains('doc-caption') ? previous : following?.classList.contains('doc-caption') ? following : null;
    if (caption) section.append(caption.cloneNode(true));
  section.append(table.cloneNode(true));
  const range = document.createRange();
  range.setStartBefore(caption && caption===previous ? previous! : table); range.setEndAfter(caption && caption===following ? following! : table);
  root.focus(); const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
  execCommand('insertHTML', `${section.outerHTML}<div class="doc-section-break" data-orientation="portrait" contenteditable="false" aria-label="Pemisah bagian portrait"></div>`);
  activeTable.value = null;
}
function landscapePastedTable() {
  const table = lastPaste.value && document.getElementsByClassName(lastPaste.value.token)[0]?.querySelector('table');
  const cell = table && table.querySelector('td,th');
  if (!cell) return;
  const range = document.createRange(); range.selectNodeContents(cell); range.collapse(true);
  const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
  trackTableSelection(); landscapeSelectedTable();
  if (lastPaste.value) lastPaste.value.wide = false;
}
function trackTableSelection() {
  const root = getEditableSelection();
  const selection = window.getSelection(), node = selection?.anchorNode;
  const cell = (node instanceof HTMLElement ? node : node?.parentElement)?.closest<HTMLTableCellElement>('td,th');
  const table = cell?.closest<HTMLTableElement>('table');
  if (!root || !table || !root.contains(table)) {
    if (!document.activeElement?.closest('.editor-table-toolbar')) activeTable.value = null;
    return;
  }
  const model = tableGrid(table), current = model.cells.find(item => item.node === cell);
  if (!current) return;
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const selected = model.cells.flatMap((item,index) => range && !range.collapsed && range.intersectsNode(item.node) ? [index] : []);
  activeTable.value = { table, row: current.r, column: current.c, selected, rows: model.height, columns: model.width, repeat: !table.classList.contains('table-no-repeat'), noSplit: !table.classList.contains('table-allow-split'), wide: !table.closest('.doc-section-landscape,.landscape-subsection') && tableNeedsLandscape(table,175) };
}
function applyTableAction(action: string, value = '') {
  const active = activeTable.value;
  if (!active?.table.isConnected) return;
  const root = active.table.closest<HTMLElement>('.ProseMirror[contenteditable="true"]');
  if (!root) return;
  try {
    const clone = active.table.cloneNode(true) as HTMLTableElement;
    if (action === 'tidy') {
      const result = tidyTable(clone);
      tableMessage.value = `Ditata: ${result.changes} perbaikan${result.warnings.length ? `. Periksa sel gabungan: ${result.warnings.join('; ')}` : ''}`;
    } else { editTable(clone, action, { row: active.row, column: active.column, selected: active.selected, value }); tableMessage.value = 'Perubahan tabel dapat diurungkan (Ctrl+Z).'; }
    const range = document.createRange(); range.selectNode(active.table);
    root.focus(); const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
    execCommand('insertHTML', clone.outerHTML);
    activeTable.value = null;
    store.addToast(tableMessage.value, 'success');
  } catch (error: any) { store.addToast(error.message, 'error'); }
}
function tidyPastedTable() {
  if (!lastPaste.value) return;
  const table = document.getElementsByClassName(lastPaste.value.token)[0]?.querySelector('table');
  const cell = table?.querySelector('td,th');
  if (!cell) return;
  const range = document.createRange(); range.selectNodeContents(cell); range.collapse(true);
  const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
  trackTableSelection(); applyTableAction('tidy');
}
const pasteBusy = ref(false);
const pasteProgress = ref(0);
const lastPaste = ref<{ token: string; html: string; text: string; hasTable: boolean; wide: boolean } | null>(null);
let forcePlainPaste = false;
function templateAllowsBold() {
  // Explicit opt-in only; a snapshot without a formatting policy follows the locked default.
  const snapshot = currentDoc.value?.templateSnapshot as unknown as { formatting?: { allowBold?: boolean } } | undefined;
  return snapshot?.formatting?.allowBold === true;
}
async function handlePaste(event: ClipboardEvent) {
  const root = getEditableSelection();
  if (!root || !event.clipboardData) return;
  event.preventDefault();
  if (pasteBusy.value) { store.addToast('Tunggu sampai proses paste selesai', 'info'); return; }
  const clipboard = event.clipboardData;
  const file = [...clipboard.items].find(item => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile();
  if (file) {
    openImageModal(); imageCaptionInput.value = '';
    try { imageUrlInput.value = await imageBlobData(file); } catch (error: any) { insertImageModal.value = false; store.addToast(error.message, 'error'); }
    return;
  }
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0).cloneRange();
  const text = clipboard.getData('text/plain'), sourceHtml = clipboard.getData('text/html');
  const plain = forcePlainPaste;
  forcePlainPaste = false;
  if (!text && !sourceHtml) return;
  const token = `paste-${crypto.randomUUID()}`;
  pasteBusy.value = true; pasteProgress.value = 0;
  root.contentEditable = 'false';
  try {
    await nextTick(); await new Promise(resolve => setTimeout(resolve, 0));
    const fallback = plainTextHtml(document, text);
    const parsed = pasteDocument(document, plain ? plainTextHtml(document, text.replace(/\t/g, '    ')) : sourceHtml || fallback);
    const html = await sanitizePasteAsync(parsed, { allowBold: templateAllowsBold() }, value => { pasteProgress.value = value; });
    if (!root.isConnected) throw new Error('Bagian dokumen sudah ditutup. Tempel ulang setelah membukanya.');
    root.contentEditable = 'true'; root.focus(); selection.removeAllRanges(); selection.addRange(range);
    execCommand('insertHTML', `<div class="${token}">${html}</div>`);
    lastPaste.value = { token, html: sourceHtml || fallback, text, hasTable: !!parsed.querySelector('table'), wide: [...parsed.querySelectorAll('table')].some(table => tableNeedsLandscape(table)) };
    void nextTick(refreshSearch);
  } catch (error: any) { store.addToast(error.message || 'Gagal menempel isi dokumen', 'error'); }
  finally { if (root.isConnected) root.contentEditable = 'true'; pasteBusy.value = false; }
}
async function replaceLastPaste(mode: 'source' | 'text') {
  const previous = lastPaste.value;
  if (!previous || pasteBusy.value) return;
  const block = document.getElementsByClassName(previous.token)[0] as HTMLElement | undefined;
  const root = block?.closest<HTMLElement>('.ProseMirror[contenteditable="true"]');
  if (!root || !block) { lastPaste.value = null; store.addToast('Hasil paste telah diubah. Tempel ulang untuk memilih format.', 'info'); return; }
  pasteBusy.value = true;
  try {
    const html = mode === 'text' ? plainTextHtml(document, previous.text.replace(/\t/g, '    ')) : await sanitizePasteAsync(pasteDocument(document, previous.html), { allowBold: templateAllowsBold(), preserveStructure: true }, value => { pasteProgress.value = value; });
    const range = document.createRange(); range.selectNode(block);
    root.focus(); const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
    execCommand('insertHTML', `<div class="${previous.token}">${html}</div>`);
    lastPaste.value = null;
  } finally { pasteBusy.value = false; }
}
const searchOpen = ref(false);
const searchInput = ref<HTMLInputElement>();
const searchQuery = ref('');
const replacementText = ref('');
const searchRanges = ref<Range[]>([]);
const searchIndex = ref(0);
const previewFrame = ref<HTMLIFrameElement>();
const previewPage = ref(1);
const previewPageCount = ref(0);
const previewThumbnails = ref<Array<{landscape:boolean;html:string}>>([]);
let thumbnailStyleUrl='';
const previewZoom = ref(100);
let previewPoll: ReturnType<typeof setTimeout> | undefined;
const listFormats = [
  { value: 'a', label: 'a., b., c.', title: 'Daftar huruf kecil' },
  { value: 'decimal-parenthesis', label: '1), 2)', title: 'Daftar angka dengan kurung' },
  { value: 'i', label: 'i., ii.', title: 'Daftar angka Romawi kecil' },
];
async function openSearch() {
  searchOpen.value = true;
  await nextTick();
  searchInput.value?.focus();
  refreshSearch();
}
function closeSearch() { searchOpen.value = false; clearSearchHighlights(); }
function refreshSearch() {
  const canvas = document.getElementById('printable-canvas');
  searchRanges.value = canvas ? findTextRanges(canvas, searchQuery.value) : [];
  searchIndex.value = Math.min(searchIndex.value, Math.max(0, searchRanges.value.length - 1));
  showSearchHighlights(searchRanges.value, searchRanges.value[searchIndex.value]);
}
function navigateSearch(direction: number) {
  refreshSearch();
  if (!searchRanges.value.length) return;
  searchIndex.value = (searchIndex.value + direction + searchRanges.value.length) % searchRanges.value.length;
  const range = searchRanges.value[searchIndex.value]!;
  range.startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  showSearchHighlights(searchRanges.value, range);
}
function replaceSearchResult() {
  const range = searchRanges.value[searchIndex.value];
  if (!range) return;
  const root = range.startContainer.parentElement?.closest<HTMLElement>('.ProseMirror[contenteditable="true"]');
  if (!root) { store.addToast('Bagian ini hanya dapat dibaca', 'error'); return; }
  root.focus();
  const selection = window.getSelection();
  selection?.removeAllRanges(); selection?.addRange(range);
  execCommand('insertText', replacementText.value);
  void nextTick(refreshSearch);
}
function insertPageBreak() {
  execCommand('insertHTML', '<div class="doc-page-break" contenteditable="false" aria-label="Pemisah halaman"><br></div><p><br></p>');
}
function setListFormat(value: string) {
  const root = getEditableSelection();
  if (!root) return;
  const anchor = window.getSelection()?.anchorNode;
  const element = anchor instanceof HTMLElement ? anchor : anchor?.parentElement;
  if (!element?.closest('ol')) document.execCommand('insertOrderedList', false);
  const selected = window.getSelection()?.anchorNode;
  const list = (selected instanceof HTMLElement ? selected : selected?.parentElement)?.closest('ol');
  if (!list || !root.contains(list)) return;
  list.setAttribute('type', value === 'decimal-parenthesis' ? '1' : value);
  list.classList.toggle('list-parenthesis', value === 'decimal-parenthesis');
  root.dispatchEvent(new Event('input', { bubbles: true }));
}
function updatePreviewView() {
  const doc = previewFrame.value?.contentDocument;
  if (!doc) return;
  let style = doc.getElementById('editor-preview-view');
  if (!style) { style = doc.createElement('style'); style.id = 'editor-preview-view'; doc.head.append(style); }
  style.textContent = `@media screen { #pages { zoom:${previewZoom.value / 100}; } #pages .paper { margin:0; } }`;
}
function jumpPreviewPage() {
  previewPage.value = Math.max(1, Math.min(previewPageCount.value || 1, Number(previewPage.value) || 1));
  previewFrame.value?.contentDocument?.querySelectorAll('.paper')[previewPage.value - 1]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}
function initializePreview() {
  clearTimeout(previewPoll);
  const doc = previewFrame.value?.contentDocument;
  if (!doc || !previewHtml.value) return;
  if (!doc.body.classList.contains('ready')) {
    if (doc.querySelector('#error')?.textContent) return;
    previewPoll = setTimeout(initializePreview, 100);
    return;
  }
  if(doc.body.dataset.editor==='true'&&!pagedBridge.value&&((doc.defaultView as any).editorSource))pagedBridge.value=pagedCanvas(doc,canEditSection,pagedChanges,templateAllowsBold(),initializePreview);
  previewPageCount.value = doc.querySelectorAll('.paper').length;
  if(thumbnailStyleUrl)URL.revokeObjectURL(thumbnailStyleUrl);
  thumbnailStyleUrl=URL.createObjectURL(new Blob([[...doc.querySelectorAll('head style')].map(s=>s.textContent).join('\n')],{type:'text/css'}));
  previewThumbnails.value = [...doc.querySelectorAll('.paper')].map(page => ({landscape:page.classList.contains('landscape'),html:`<!doctype html><html lang="id"><head><meta charset="utf-8"><link rel="stylesheet" href="${thumbnailStyleUrl}"><style>body{margin:0;overflow:hidden;background:white}.paper{margin:0!important;zoom:.0812}footer{display:block}</style></head><body class="ready">${page.outerHTML}</body></html>`}));
  previewPage.value = Math.max(1,Math.min(previewPage.value,previewPageCount.value));
  updatePreviewView();
  if(!doc.body.dataset.editorScrollTracked)doc.addEventListener('scroll', () => {
    const pages = [...doc.querySelectorAll('.paper')];
    const firstVisible = pages.findIndex(page => page.getBoundingClientRect().bottom > 30);
    if (firstVisible >= 0) previewPage.value = firstVisible + 1;
  }, { passive: true });
  doc.body.dataset.editorScrollTracked='true';
}
const basicTools = [
  { command: 'undo', label: 'Urungkan', title: 'Urungkan (Ctrl+Z)' },
  { command: 'redo', label: 'Ulangi', title: 'Ulangi (Ctrl+Y)' },
  { command: 'indent', label: 'Tambah inden', title: 'Tambah indentasi' },
  { command: 'outdent', label: 'Kurangi inden', title: 'Kurangi indentasi' },
  { command: 'superscript', label: 'x\u00b2', title: 'Superskrip' },
  { command: 'subscript', label: 'x\u2082', title: 'Subskrip' },
];
function insertSpecialCharacter() {
  const value = window.prompt('Masukkan karakter khusus (contoh: \u00b1 \u00d7 \u00f7 \u00b0 \u00a9 \u00a7):', '\u00b1');
  if (value) execCommand('insertText', value);
}
async function handleEditorShortcut(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey) || currentDoc.value?.cara === 'upload') return;
  if (event.key.toLowerCase() === 'v') forcePlainPaste = event.shiftKey;
  if (event.key.toLowerCase() === 'f' && !previewHtml.value) {
    event.preventDefault(); void openSearch();
  }
  if (event.key.toLowerCase() === 's') {
    event.preventDefault();
    try { await flushSave(); } catch { store.addToast('Perubahan belum tersimpan', 'error'); }
  }
  if (event.key.toLowerCase() === 'k' && getEditableSelection()) {
    event.preventDefault();
    const value = window.prompt('Alamat tautan (https://):');
    if (value && /^https?:\/\//i.test(value)) execCommand('createLink', value);
  }
}
function getEditableSelection(): HTMLElement | null {
  return selectionEditor();
}
const regulationLabels = {nomor:'Nomor peraturan',tanggal:'Tanggal peraturan',tanggalDiundangkan:'Tanggal diundangkan',nomorBerita:'Nomor berita daerah'};
const regulation = reactive({nomor:'',tanggal:'',tanggalDiundangkan:'',nomorBerita:''});
const documentOpdName = computed(() => currentDoc.value?.documentSettings?.opd.nama || currentDoc.value?.opdName || '');
const coverInfo = computed(() => {
  const doc=currentDoc.value,settings=doc?.documentSettings,type=String(doc?.jenis||'').toLocaleLowerCase('id-ID');
  const name=settings?.opdRecord?.nama||settings?.opd?.nama||doc?.opdName||'',year=String(doc?.tahun||''),reg=doc?.regulation||{};
  const period=year.includes('-')?year:`${reg.periodeMulai||year}-${reg.periodeAkhir||Number(reg.periodeMulai||year)+4}`;
  let title='RENCANA KERJA (RENJA)',middle=name.toLocaleUpperCase('id-ID'),yearLine=`TAHUN ${year}`;
  if(type.includes('rkpd')){title=`${type.includes('perubahan')?'PERUBAHAN ':''}RENCANA KERJA PEMERINTAH DAERAH (RKPD)`;middle='KABUPATEN CIREBON';}
  else if(type.includes('rpjmd')){title='RENCANA PEMBANGUNAN JANGKA MENENGAH DAERAH (RPJMD)';middle='KABUPATEN CIREBON';yearLine=`TAHUN ${period}`;}
  else if(type.includes('renstra')){title=`${type.includes('perubahan')?'PERUBAHAN ':''}RENCANA STRATEGIS (RENSTRA)`;yearLine=`TAHUN ${period}`;}
  else if(type.includes('perubahan'))title='PERUBAHAN RENCANA KERJA (RENJA)';
  const identity=/^kecamatan\b/i.test(name)?`${middle} KABUPATEN CIREBON`:/(?:kabupaten cirebon)$/i.test(name)?middle:`${middle} KABUPATEN CIREBON`;
  return {title,middle,yearLine,identity,titleSize:name.length>75?14:name.length>50?16:18};
});
const coverTitle=computed(()=>coverInfo.value.title),coverMiddle=computed(()=>coverInfo.value.middle),coverYear=computed(()=>coverInfo.value.yearLine),coverIdentity=computed(()=>coverInfo.value.identity),coverTitleSize=computed(()=>coverInfo.value.titleSize);
function coverText(value:string){return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));}
const coverMarkup=computed(()=>{
  const info=coverInfo.value,logo=currentDoc.value?.documentSettings?.global?.logoData||'',address=currentDoc.value?.documentSettings?.opd?.alamat||'';
  return `<div class="cover-layout cover-editor-layout" data-cover-layout="true"><div class="cover-top cover-editor-top">${logo?`<img class="cover-logo cover-editor-logo" src="${coverText(logo)}" alt="Logo Kabupaten Cirebon"/>`:''}<p class="cover-government">PEMERINTAH KABUPATEN CIREBON</p></div><div class="cover-middle cover-editor-middle"><p class="cover-title" style="font-size:${info.titleSize}pt;font-weight:700;line-height:1.15">${coverText(info.title)}</p><p class="cover-org" style="font-size:${info.titleSize}pt;font-weight:700;line-height:1.15">${coverText(info.middle)}</p><p class="cover-year" style="font-size:${info.titleSize}pt;font-weight:700;line-height:1.15">${coverText(info.yearLine)}</p></div><div class="cover-bottom cover-editor-bottom"><p>${coverText(info.identity)}</p>${address?`<p>${coverText(address)}</p>`:''}</div></div>`;
});
const coverMarkupForEditor=computed(()=>currentDoc.value?.frontMatter?.cover?.trim()?currentDoc.value.frontMatter.cover:coverMarkup.value);
const defaultPreface = computed(()=>`<p>Puji syukur ke hadirat Tuhan Yang Maha Esa atas tersusunnya ${currentDoc.value?.jenis} ${documentOpdName.value} Tahun ${currentDoc.value?.tahun}.</p><p>Dokumen ini menjadi pedoman pelaksanaan program dan kegiatan perangkat daerah. Terima kasih kepada seluruh pihak yang berkontribusi dalam penyusunannya.</p>`);
const documentCaptions = computed(()=>indexCaptions(currentDoc.value?.sections || [], sub=>new DOMParser().parseFromString(sub.content,'text/html').body,{tableTitle:type=>tableDefinitions[type]?.title || ''}).entries);
function tableCaption(id:string){return documentCaptions.value.find(c=>c.id===id)?.label||'';}
function addTable(sub:any,type:string){(sub.tables ||= []).push(blankTable(type));renumberCaptions(false);triggerAutosave();}
function updateTable(sub:any,id:string,value:any){sub.tables=sub.tables.map((t:any)=>t.id===id?value:t);triggerAutosave();}
function removeTable(sub:any,id:string){sub.tables=sub.tables.filter((t:any)=>t.id!==id);renumberCaptions(false);triggerAutosave();}
function handleCoverInput(event:Event){if(!currentDoc.value)return;const target=event.target as HTMLElement;currentDoc.value.frontMatter={...(currentDoc.value.frontMatter||{}),cover:target.innerHTML};triggerAutosave();}
function resetCover(){if(!currentDoc.value||!window.confirm('Kembalikan sampul ke data OPD saat ini? Perubahan sampul akan diganti.'))return;currentDoc.value.frontMatter={...(currentDoc.value.frontMatter||{}),cover:''};triggerAutosave();}
function handlePreface(e:Event){if(!currentDoc.value)return;currentDoc.value.frontMatter={...(currentDoc.value.frontMatter||{}),preface:(e.target as HTMLElement).innerHTML};triggerAutosave();}
async function saveRegulation(){if(!currentDoc.value)return;const r=await apiFetch(`/api/documents/${currentDoc.value.id}/regulation`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(regulation)});if(r.ok){currentDoc.value.regulation={...regulation};store.addToast('Identitas peraturan disimpan');}else store.addToast('Gagal menyimpan identitas peraturan','error');}

const isSaving = ref(false);
const hasUnsavedChanges = ref(false);
const saveError = ref(false);
const editorSessionId=crypto.randomUUID();
const online=ref(navigator.onLine),localSaveError=ref(''),localSaving=ref(false),localSavedAt=ref(0);
const leases=ref<Record<string,{owned:boolean;holder?:string;sameAccount?:boolean}>>({});
const sessionReady=ref(false),sessionError=ref('');
const conflicts=ref<Array<{babId:string;title:string;local:any;server:any;serverRevision:string}>>([]);
let baseRevisions:Record<string,string>={},baseline:Record<string,string>={};
let heartbeatTimer:ReturnType<typeof setInterval>|null=null,retryTimer:ReturnType<typeof setTimeout>|null=null;
let localPromise:Promise<void>=Promise.resolve();
let activeLocalWrite=false,pendingDraft:EditorDraft|null=null;
let recoveredDrafts:EditorDraft[]=[];
const draftUserId=()=>store.currentUser?.id||(localStorage.getItem('sipanda_token')?JSON.parse(localStorage.getItem('sipanda_user')||'{}').id||'':'');
function draftRecord(pending=hasUnsavedChanges.value):EditorDraft{
  return {key:`${draftUserId()}:${currentDoc.value?.id}:${editorSessionId}`,userId:draftUserId(),documentId:currentDoc.value!.id,sessionId:editorSessionId,savedAt:Date.now(),pending,document:JSON.parse(JSON.stringify(currentDoc.value)),revisions:{...baseRevisions},baseline:{...baseline}};
}
function checkpoint(pending=hasUnsavedChanges.value){
  if(!currentDoc.value||!draftUserId()||currentDoc.value.cara!=='template')return localPromise;
  pendingDraft=draftRecord(pending);
  if(activeLocalWrite)return localPromise;
  activeLocalWrite=true;localSaving.value=true;
  localPromise=(async()=>{
    while(pendingDraft){const draft=pendingDraft;pendingDraft=null;await putEditorDraft(draft);localSavedAt.value=draft.savedAt;localSaveError.value='';}
  })().catch(error=>{localSaveError.value='Draf perangkat gagal disimpan. Jangan tutup tab; unduh cadangan draf.';throw error;}).finally(()=>{activeLocalWrite=false;localSaving.value=false;});
  return localPromise;
}
function dirtyChapters(){return (currentDoc.value?.sections||[]).filter((bab,i)=>chapterContent(bab,currentDoc.value?.frontMatter,i===0)!==baseline[bab.id]);}
async function renewEditorSession(){
  const doc=currentDoc.value;if(!doc||!navigator.onLine)return;
  try{
    const response=await apiFetch(`/api/documents/${doc.id}/editor-session`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:editorSessionId,babIds:doc.permissions?.editableBabIds||[]})});
    const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error),{status:response.status});
    leases.value=Object.fromEntries((result.leases||[]).map((lease:any)=>[lease.babId,lease]));
    currentDoc.value!.permissions={...doc.permissions,...result.permissions};
    sessionReady.value=true;sessionError.value='';online.value=true;
    for(const row of result.sections||[]){
      const id=row.babId||row.id,bab=doc.sections?.find(b=>b.id===id);if(!bab)continue;
      const dirty=dirtyChapters().some(b=>b.id===id);
      if(baseRevisions[id]&&baseRevisions[id]!==result.revisions[id]){
        const server={...bab,subsections:row.subsections};
        if(dirty&&chapterContent(bab,doc.frontMatter,doc.sections?.[0]?.id===id)===chapterContent(server,result.frontMatter,doc.sections?.[0]?.id===id)){
          baseRevisions[id]=result.revisions[id];baseline[id]=chapterContent(bab,doc.frontMatter,doc.sections?.[0]?.id===id);hasUnsavedChanges.value=dirtyChapters().length>0;saveError.value=false;
        }else if(dirty){const existing=conflicts.value.find(c=>c.babId===id);if(existing){existing.server={bab:server,frontMatter:result.frontMatter};existing.serverRevision=result.revisions[id];}else conflicts.value.push({babId:id,title:bab.title,local:JSON.parse(JSON.stringify({bab,frontMatter:doc.frontMatter})),server:{bab:server,frontMatter:result.frontMatter},serverRevision:result.revisions[id]});}
        else {bab.subsections=row.subsections;if(doc.sections?.[0]?.id===id)doc.frontMatter=result.frontMatter;baseRevisions[id]=result.revisions[id];baseline[id]=chapterContent(bab,doc.frontMatter,doc.sections?.[0]?.id===id);}
      }
      if(!baseRevisions[id])baseRevisions[id]=result.revisions[id];
    }
  }catch(error:any){sessionError.value=error.message||'Koneksi sesi editor terputus';if(error.status===403||error.status===404){leases.value={};sessionReady.value=false;}else online.value=navigator.onLine;}
}
async function restoreDeviceDraft(){
  const doc=currentDoc.value;if(!doc)return;
  const drafts=await editorDrafts(draftUserId(),doc.id).catch(()=>[]);
  const draft=drafts.find(d=>d.pending&&d.sessionId!==editorSessionId);if(!draft)return;
  recoveredDrafts=[draft];
  for(const [index,bab] of (doc.sections||[]).entries()){
    const local=draft.document.sections?.find((b:any)=>b.id===bab.id);if(!local)continue;
    if(chapterContent(local,draft.document.frontMatter,index===0)===draft.baseline[bab.id])continue;
    if(draft.revisions[bab.id]===baseRevisions[bab.id]){bab.subsections=local.subsections;if(index===0)doc.frontMatter=draft.document.frontMatter;hasUnsavedChanges.value=true;editRevision++;}
    else conflicts.value.push({babId:bab.id,title:bab.title,local:{bab:local,frontMatter:draft.document.frontMatter},server:{bab:JSON.parse(JSON.stringify(bab)),frontMatter:doc.frontMatter},serverRevision:baseRevisions[bab.id]||''});
  }
  if(hasUnsavedChanges.value){store.addToast('Draf perangkat dipulihkan. Sinkronisasi mengikuti sesi edit BAB.','info');scheduleReconnect();}
}
function scheduleReconnect(){clearTimeout(retryTimer!);retryTimer=setTimeout(()=>void reconnectEditor(),5000);}
async function reconnectEditor(){
  if(!navigator.onLine){online.value=false;return;}
  await renewEditorSession();
  if(!sessionError.value&&hasUnsavedChanges.value&&!conflicts.value.length)try{saveError.value=false;await persistChanges();}catch{}
  if(sessionError.value||(!conflicts.value.length&&hasUnsavedChanges.value))scheduleReconnect();
}
function connectionLost(){online.value=false;void checkpoint().catch(()=>{});}
function releaseEditorSession(){
  if(!currentDoc.value||!navigator.onLine)return;
  void apiFetch(`/api/documents/${currentDoc.value.id}/editor-session`,{method:'DELETE',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:editorSessionId,babIds:Object.keys(leases.value).filter(id=>leases.value[id]?.owned)})}).catch(()=>{});
}
function downloadDraft(){
  if(!currentDoc.value)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(draftRecord(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`draf-${currentDoc.value.kodeDoc||currentDoc.value.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function conflictText(value:any){return (value.bab.subsections||[]).map((sub:any)=>`${sub.code} ${sub.title}\n${new DOMParser().parseFromString(sub.content||'','text/html').body.textContent}\n${JSON.stringify(sub.tables||[])}`).join('\n\n')+(value.frontMatter?`\nKata pengantar: ${new DOMParser().parseFromString(value.frontMatter.preface||'','text/html').body.textContent}`:'');}
async function resolveEditorConflict(babId:string,useLocal:boolean){
  const conflict=conflicts.value.find(c=>c.babId===babId),doc=currentDoc.value;if(!conflict||!doc)return;
  if(useLocal&&!leases.value[babId]?.owned){store.addToast('BAB masih dikunci sesi lain. Tunggu kunci dilepas.','error');return;}
  const archive=draftRecord();archive.key+=`:backup-${crypto.randomUUID()}`;archive.archived=true;await putEditorDraft(archive);
  const index=doc.sections!.findIndex(b=>b.id===babId);const chosen=useLocal?conflict.local:conflict.server;
  const restored=JSON.parse(JSON.stringify(conflict.server.bab));
  if(useLocal)for(const sub of restored.subsections){const local=conflict.local.bab.subsections.find((s:any)=>s.id===sub.id);if(local){sub.content=local.content;sub.tables=local.tables||[];}}
  doc.sections![index]=restored;if(index===0)doc.frontMatter=chosen.frontMatter;
  baseRevisions[babId]=conflict.serverRevision;baseline[babId]=chapterContent(conflict.server.bab,conflict.server.frontMatter,index===0);
  conflicts.value=conflicts.value.filter(c=>c.babId!==babId);hasUnsavedChanges.value=dirtyChapters().length>0;
  editRevision++;await checkpoint();if(useLocal&&navigator.onLine)void persistChanges().catch(()=>{});
}
const chapterAssignments = ref<Array<{ id: string; userId: string; userName: string; babId: string; babTitle: string }>>([]);
const staffMembers = ref<Array<{ id: string; name: string }>>([]);
const selectedBabId = ref('');
const selectedStaffId = ref('');
const availableStaffMembers = computed(() => staffMembers.value.filter(staff =>
  !chapterAssignments.value.some(assignment => assignment.babId === selectedBabId.value && assignment.userId === staff.id)
));
const chapterAssignmentCount = (babId: string) => chapterAssignments.value.filter(assignment => assignment.babId === babId).length;
const addingSubsectionTo = ref('');
const newSubsectionTitle = ref('');
const addingSubsection = ref(false);
let autosaveTimer: any = null;
let editRevision = 0;
let savePromise: Promise<void> | null = null;

// Modals
const showVerifyModal = ref(false);
const verifyDecision = ref<'Disetujui' | 'Perlu Revisi'>('Disetujui');
const verifyNotes = ref('');
const insertImageModal = ref(false);
const imageUrlInput = ref('');
const imageCaptionInput = ref('');
const imageOptions = reactive({width:100,alignment:'center',placement:'block'});
const activeImage = ref<HTMLImageElement | null>(null);
const editingImage = ref<HTMLImageElement | null>(null);
const captionModal = ref(false),captionKind = ref('Tabel'),captionTitleInput = ref('');
const referenceModal = ref(false),referenceTarget = ref('');
let captionSelection: Range | null = null,referenceSelection: Range | null = null;
let captionTarget: HTMLElement | null = null,pendingTableHtml = '';

const isRkpdDocument = computed(() => Boolean(currentDoc.value?.jenis.includes('RKPD') || (currentDoc.value?.opdId === 'bapperida' && ['Renja Murni','Renja Perubahan'].includes(currentDoc.value?.jenis || ''))));

const canEditSection = (babId: string) => currentDoc.value?.permissions?.canEdit === true
  && currentDoc.value.permissions.editableBabIds.includes(babId)
  && sessionReady.value && leases.value[babId]?.owned===true && !conflicts.value.some(c=>c.babId===babId);

const startAddSubsection = (babId: string) => {
  addingSubsectionTo.value = babId;
  newSubsectionTitle.value = '';
};

const cancelAddSubsection = () => {
  if (addingSubsection.value) return;
  addingSubsectionTo.value = '';
  newSubsectionTitle.value = '';
};

const addSubsection = async (babId: string) => {
  const title = newSubsectionTitle.value.trim();
  if (!currentDoc.value || !canEditSection(babId) || !title || addingSubsection.value) return;

  addingSubsection.value = true;
  try {
    await flushSave();
    const response = await apiFetch(`/api/documents/${currentDoc.value.id}/sections/${babId}/subsections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title,editorSessionId,editorRevisions:baseRevisions })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      store.addToast(result.error || 'Gagal menambahkan sub-bab', 'error');
      return;
    }

    const subsection = result?.subsection;
    if (!subsection || typeof subsection.id !== 'string' || typeof subsection.code !== 'string'
      || typeof subsection.title !== 'string' || typeof subsection.content !== 'string'
      || typeof subsection.locked !== 'boolean') {
      store.addToast('Respons server tidak valid; dokumen sedang dimuat ulang', 'error');
      await loadDocument();
      return;
    }

    const bab = currentDoc.value.sections?.find(section => section.id === babId);
    if (!bab) {
      store.addToast('Sub-bab berhasil disimpan, tetapi tampilan dokumen perlu dimuat ulang', 'error');
      await loadDocument();
      return;
    }
    bab.subsections.push(subsection);
    Object.assign(baseRevisions,result.editorRevisions||{});baseline[babId]=chapterContent(bab,currentDoc.value.frontMatter,currentDoc.value.sections?.[0]?.id===babId);
    await checkpoint();
    addingSubsectionTo.value = '';
    newSubsectionTitle.value = '';
    store.addToast('Sub-bab berhasil ditambahkan', 'success');
  } catch (error) {
    console.error('Add subsection error:', error);
    store.addToast('Tidak dapat menghubungi server untuk menambahkan sub-bab', 'error');
  } finally {
    addingSubsection.value = false;
  }
};

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

function normalizeLoadedOrientations(doc:DocumentItem){for(const bab of doc.sections||[])for(const sub of bab.subsections||[]){const result=normalizeSubsectionOrientation(sub,html=>new DOMParser().parseFromString(html,'text/html').body);Object.assign(sub,result.subsection);if(result.mixedLegacy)sub.legacyOrientationWarning=true;}}

const loadDocument = async () => {
  const docId = route.params.id as string;
  try {
    const res = await apiFetch(`/api/documents/${docId}`);
    if (res.ok) {
      currentDoc.value = await res.json();
      normalizeLoadedOrientations(currentDoc.value!);
      if(currentDoc.value?.status==='Perlu Revisi'){try{const comments=await apiFetch(`/api/documents/${docId}/comments`);if(comments.ok)openCommentCount.value=(await comments.json()).filter((c:any)=>!c.parent_id&&!c.resolved).length;}catch{store.addToast('Komentar revisi belum dapat dimuat. Buka Komentar / Riwayat saat tersambung.','info');}}
      baseRevisions={...currentDoc.value?.editorRevisions};
      baseline=Object.fromEntries((currentDoc.value?.sections||[]).map((bab,i)=>[bab.id,chapterContent(bab,currentDoc.value?.frontMatter,i===0)]));
      await renewEditorSession();
      await restoreDeviceDraft();
      Object.assign(regulation, currentDoc.value?.regulation || {});
      if (isRkpdDocument.value) {
        await loadChapterAssignments();
        if (store.isSuperAdmin) await loadStaffMembers();
      }
      await nextTick();
      renumberCaptions();
      void checkpoint().catch(()=>{});
    } else {
      const result = await res.json().catch(() => ({}));
      store.addToast(result.error || 'Tidak dapat membuka dokumen', 'error');
      router.push('/dokumen');
    }
  } catch (err) {
    online.value=false;
    const cached=(await editorDrafts(draftUserId(),docId).catch(()=>[]))[0];
    if(cached){currentDoc.value=cached.document;baseRevisions=cached.revisions;baseline=cached.baseline;hasUnsavedChanges.value=cached.pending;sessionReady.value=true;leases.value=Object.fromEntries((cached.document.permissions?.editableBabIds||[]).map((id:string)=>[id,{owned:true}]));await nextTick();}
    else store.addToast('Dokumen belum tersedia di perangkat. Hubungkan kembali untuk membukanya.','error');
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
      renumberCaptions(false);
      triggerAutosave();
    }
  }
};

const triggerAutosave = () => {
  formatRevision++;
  if(formatOpen.value)formatStale.value=true;
  editRevision += 1;
  hasUnsavedChanges.value = true;
  saveError.value = false;
  void checkpoint(true).catch(()=>{});
  schedulePageGuides();
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    void persistChanges().catch(error => console.error('Autosave error:', error));
  }, 1000);
};

// Document Toolbar commands
const execCommand = (cmd: string, val = '') => {
  const target = getEditableSelection();
  if (!target) return;
  if (cmd === 'indent') {
    const node = window.getSelection()?.anchorNode;
    let list = (node instanceof HTMLElement ? node : node?.parentElement)?.closest('ol,ul');
    let depth = 0;
    while (list && target.contains(list)) { depth++; list = list.parentElement?.closest('ol,ul') || null; }
    if (depth >= 3) { store.addToast('Daftar dibatasi sampai tiga tingkat', 'info'); return; }
  }
  document.execCommand(cmd, false, val);
  target.dispatchEvent(new Event('input', { bubbles: true }));
};

const insertTable = () => {
  const root = getEditableSelection(), selection = window.getSelection();
  if (!root?.dataset.subId || !selection?.rangeCount) { store.addToast('Klik isi sub-bab sebelum menyisipkan tabel.','info');return; }
  captionSelection = selection.getRangeAt(0).cloneRange();captionTarget = null;
  captionKind.value = 'Tabel';captionTitleInput.value = '';
  pendingTableHtml = `
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
          <td style="border: 1px solid #334155; padding: 6px 8px;"><br></td>
          <td style="border: 1px solid #334155; padding: 6px 8px;"><br></td>
          <td style="border: 1px solid #334155; padding: 6px 8px; text-align: right;"><br></td>
        </tr>
      </tbody>
    </table>
  `;
  captionModal.value = true;
};

const insertCaption = () => {
  const root = getEditableSelection();
  const node = window.getSelection()?.anchorNode;
  const element = node instanceof HTMLElement ? node : node?.parentElement;
  const object = element?.closest<HTMLElement>('table') || activeImage.value || element?.closest('.doc-figure')?.querySelector('img');
  if (!root || !object || !root.contains(object)) { store.addToast('Klik tabel atau gambar yang ingin diberi caption.','info');return; }
  captionTarget = object;pendingTableHtml = '';captionSelection = null;
  captionKind.value = object.tagName === 'IMG' ? 'Gambar' : 'Tabel';
  const existing = findObjectCaption(object);
  captionTitleInput.value = existing ? captionTitle(existing) : '';
  captionModal.value = true;
};

let imageSelection: Range | null = null;
function openImageModal() {
  if (!getEditableSelection()?.dataset.subId) { store.addToast('Klik isi sub-bab sebelum menyisipkan gambar.','info');return; }
  const selection=window.getSelection();
  imageSelection=selection?.rangeCount?selection.getRangeAt(0).cloneRange():null;
  editingImage.value = null;imageUrlInput.value = '';imageCaptionInput.value = '';
  Object.assign(imageOptions,{width:100,alignment:'center',placement:'block'});
  insertImageModal.value=true;
}
function findObjectCaption(object: HTMLElement): HTMLElement | null {
  const root = object.closest<HTMLElement>('.ProseMirror');
  return root ? [...root.querySelectorAll<HTMLElement>('.doc-caption')].find(caption=>captionObject(caption,root)===object) || null : null;
}
function createCaption(id: string, kind: string, title: string, tag = 'p') {
  const caption = document.createElement(tag);caption.className = 'doc-caption';
  caption.setAttribute('data-caption-id',id);caption.setAttribute('data-caption-for',id);caption.setAttribute('data-caption-kind',kind);
  caption.textContent = `${kind} 0.0 ${title}`;
  return caption;
}
function restoreEditorRange(range: Range | null) {
  const node = range?.commonAncestorContainer;
  const element = node instanceof HTMLElement ? node : node?.parentElement;
  const root = element?.closest<HTMLElement>('.ProseMirror[contenteditable="true"]');
  if (!range || !root?.isConnected || !root.dataset.babId || !canEditSection(root.dataset.babId)) throw new Error('Bagian ini tidak dapat diedit. Klik kembali isi dokumen.');
  root.focus();const selection = window.getSelection();selection?.removeAllRanges();selection?.addRange(range);
  return root;
}
function objectRange(object: HTMLElement, caption: HTMLElement | null) {
  const range = document.createRange();
  const previous = object.previousElementSibling === caption, following = object.nextElementSibling === caption;
  range.setStartBefore(previous && caption ? caption : object);range.setEndAfter(following && caption ? caption : object);
  return range;
}
function confirmCaption() {
  try {
    const title = captionTitleInput.value.trim();if (!title) throw new Error('Caption wajib diisi.');
    if (pendingTableHtml) {
      const parsed = new DOMParser().parseFromString(pendingTableHtml,'text/html'),table = parsed.querySelector('table')!;
      const id = crypto.randomUUID();table.setAttribute('data-object-id',id);
      restoreEditorRange(captionSelection);
      execCommand('insertHTML', `${createCaption(id,'Tabel',title).outerHTML}${table.outerHTML}<p><br></p>`);
    } else {
      const object = captionTarget;if (!object?.isConnected) throw new Error('Objek sudah dihapus.');
      const existing = findObjectCaption(object),id = existing?.getAttribute('data-caption-id') || object.getAttribute('data-object-id') || crypto.randomUUID();
      const clone = object.cloneNode(true) as HTMLElement;clone.setAttribute('data-object-id',id);
      if (clone.tagName==='IMG') clone.setAttribute('alt',title);
      const caption = createCaption(id,captionKind.value,title,existing?.tagName.toLowerCase() || 'p');
      restoreEditorRange(objectRange(object,existing));
      execCommand('insertHTML', captionKind.value==='Tabel' ? caption.outerHTML+clone.outerHTML : clone.outerHTML+caption.outerHTML);
    }
    captionModal.value = false;pendingTableHtml = '';
  } catch(error:any) {store.addToast(error.message,'error');}
}
function openReferenceDialog() {
  if (!getEditableSelection()?.dataset.subId) {store.addToast('Klik isi sub-bab untuk menyisipkan rujukan.','info');return;}
  const selection = window.getSelection();referenceSelection = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  renumberCaptions();referenceTarget.value = '';referenceModal.value = true;
}
function confirmReference() {
  try {
    const target = documentCaptions.value.find(entry=>entry.id===referenceTarget.value);
    if (!target) throw new Error('Target rujukan sudah dihapus. Pilih caption lain.');
    const span = document.createElement('span');span.className = 'doc-reference';span.contentEditable = 'false';span.setAttribute('data-reference-id',target.id);span.textContent = `lihat ${target.number}`;
    restoreEditorRange(referenceSelection);execCommand('insertHTML',span.outerHTML+' ');referenceModal.value = false;
  } catch(error:any) {store.addToast(error.message,'error');}
}
function jumpToCaption(id: string) {
  const entry = documentCaptions.value.find(item=>item.id===id);
  if (!entry) return;
  const liveEntry=indexCaptions(currentDoc.value?.sections || [],sub=>document.querySelector<HTMLElement>(`.ProseMirror[data-sub-id="${CSS.escape(sub.id)}"]`) || new DOMParser().parseFromString(sub.content,'text/html').body).entries.find(item=>item.id===id);
  const target = liveEntry?.caption?.isConnected ? liveEntry.caption : document.getElementById(id) || document.getElementById(entry.subId);
  target?.scrollIntoView({block:'center',behavior:'smooth'});
}
function handleCanvasClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const reference = target.closest<HTMLElement>('.doc-reference');
  if (reference) {if(reference.classList.contains('doc-reference-broken'))store.addToast('Target rujukan telah dihapus. Sisipkan rujukan ke caption yang tersedia.','info');else jumpToCaption(reference.getAttribute('data-reference-id') || '');return;}
  const image = target.closest<HTMLImageElement>('.ProseMirror img');
  if (image?.closest('.ProseMirror[contenteditable="true"]')) {
    activeImage.value = image;
    const range = document.createRange();range.selectNode(image);const selection = window.getSelection();selection?.removeAllRanges();selection?.addRange(range);
  } else if (target.closest('#printable-canvas')) activeImage.value = null;
}
function editSelectedImage() {
  const image = activeImage.value;if (!image?.closest('.ProseMirror[contenteditable="true"]')) return;
  const caption = findObjectCaption(image),figure = image.closest<HTMLElement>('.doc-figure');
  editingImage.value = image;imageUrlInput.value = image.src;imageCaptionInput.value = caption ? captionTitle(caption) : '';
  Object.assign(imageOptions,{width:parseFloat(figure?.style.width || image.style.width) || 100,alignment:figure?.classList.contains('doc-image-left')?'left':figure?.classList.contains('doc-image-right')?'right':'center',placement:figure?.classList.contains('doc-image-inline')?'inline':'block'});
  imageSelection = null;insertImageModal.value = true;
}
function deleteObject(object: HTMLElement) {
  try {
    const root = object.closest<HTMLElement>('.ProseMirror[contenteditable="true"]');
    if (!root) return;
    const clone = root.cloneNode(true) as HTMLElement,id = object.getAttribute('data-object-id');
    const index=[...root.querySelectorAll<HTMLElement>('table,img')].indexOf(object);
    const target = id ? [...clone.querySelectorAll<HTMLElement>('table,img')].find(node=>node.getAttribute('data-object-id')===id) : clone.querySelectorAll<HTMLElement>('table,img')[index];
    if (!target) throw new Error('Objek tidak ditemukan.');
    const figure = object.tagName==='IMG' ? target.closest<HTMLElement>('.doc-figure') : null;
    if (figure) figure.remove();else {[...clone.querySelectorAll<HTMLElement>('.doc-caption')].find(caption=>captionObject(caption,clone)===target)?.remove();target.remove();}
    const range = document.createRange();range.selectNodeContents(root);
    restoreEditorRange(range);execCommand('insertHTML',clone.innerHTML || '<p><br></p>');activeImage.value = null;activeTable.value = null;
  } catch(error:any) {store.addToast(error.message,'error');}
}
function deleteSelectedImage() {if (activeImage.value) deleteObject(activeImage.value);}
function deleteSelectedTable() {if (activeTable.value) deleteObject(activeTable.value.table);}
function confirmInsertImage(result: {source:string;caption:string;width:number;alignment:string;placement:string;naturalWidth:number;naturalHeight:number;inputBytes:number;outputBytes:number}) {
  try {
    if (!result.caption.trim()) throw new Error('Caption gambar wajib diisi.');
    const existing = editingImage.value,existingCaption = existing ? findObjectCaption(existing) : null;
    const id = existingCaption?.getAttribute('data-caption-id') || existing?.getAttribute('data-object-id') || crypto.randomUUID();
    const inline = result.placement==='inline',wrapper = document.createElement(inline?'span':'div'),img = document.createElement('img');
    wrapper.className = `doc-figure doc-image-${['left','center','right'].includes(result.alignment)?result.alignment:'center'}${inline?' doc-image-inline':''}`;
    img.src = result.source;img.alt = result.caption;img.setAttribute('data-object-id',id);
    img.setAttribute('data-image-width',String(result.naturalWidth));img.setAttribute('data-image-height',String(result.naturalHeight));
    wrapper.append(img,createCaption(id,'Gambar',result.caption,'span'));
    let root: HTMLElement;
    if (existing) {
      const figure = existing.closest<HTMLElement>('.doc-figure');
      const range = figure ? document.createRange() : objectRange(existing,existingCaption);if (figure)range.selectNode(figure);
      root = restoreEditorRange(range);
    } else root = restoreEditorRange(imageSelection);
    const landscape = existing?.closest('.doc-section-landscape,.landscape-subsection') || window.getSelection()?.anchorNode?.parentElement?.closest('.doc-section-landscape,.landscape-subsection') || root.classList.contains('landscape-subsection');
    const maxPercent = (landscape ? 140 : 250)*result.naturalWidth/result.naturalHeight/(landscape ? 290 : 175)*100;
    if (maxPercent<5) throw new Error('Gambar terlalu tinggi untuk area cetak. Pangkas gambar sebelum menyisipkan.');
    wrapper.style.width = `${Math.max(5,Math.min(100,result.width,maxPercent))}%`;
    execCommand('insertHTML',wrapper.outerHTML);insertImageModal.value = false;activeImage.value = null;
    store.addToast(`Gambar disimpan (${Math.round(result.outputBytes/1024)} KB).`,'success');
  } catch(error:any) {store.addToast(error.message,'error');}
}
function renumberCaptions(save=true) {
  const result = indexCaptions(currentDoc.value?.sections || [], sub=>document.querySelector<HTMLElement>(`.ProseMirror[data-sub-id="${CSS.escape(sub.id)}"]`) || new DOMParser().parseFromString(sub.content,'text/html').body,{normalize:true,tableTitle:type=>tableDefinitions[type]?.title || '',editable:canEditSection});
  let changed=false;
  for (const {root,sub,bab} of result.roots) if (canEditSection(bab.id || bab.babId || '') && sub.content!==root.innerHTML) {sub.content=root.innerHTML;changed=true;}
  if (changed&&save)triggerAutosave();
}

async function flushSave() {
  renumberCaptions();
  clearTimeout(autosaveTimer);
  if (!hasUnsavedChanges.value) return;
  await persistChanges();
}

async function persistChanges(): Promise<void> {
  if(savePromise){await savePromise;if(hasUnsavedChanges.value&&!saveError.value)await persistChanges();return;}
  const doc=currentDoc.value;if(!doc?.permissions?.canEdit||!hasUnsavedChanges.value)return;
  await checkpoint(true);
  // A reconnect event and heartbeat can both arrive while the local checkpoint
  // is pending. Recheck after that await before taking the server-save slot.
  if(savePromise){await savePromise;if(hasUnsavedChanges.value&&!saveError.value)await persistChanges();return;}
  if(!navigator.onLine){online.value=false;saveError.value=true;throw new Error('Koneksi terputus. Draf sudah disimpan di perangkat.');}
  const dirty=dirtyChapters();
  if(!dirty.length){hasUnsavedChanges.value=false;saveError.value=false;await checkpoint(false);return;}
  if(dirty.some(b=>!canEditSection(b.id))){saveError.value=true;throw new Error('BAB terkunci atau memiliki konflik. Draf perangkat tetap disimpan.');}
  const revisionBeingSaved=editRevision;
  const payload={sections:JSON.parse(JSON.stringify(dirty)),editorSessionId,editorRevisions:{...baseRevisions},...(dirty.some(b=>b.id===doc.sections?.[0]?.id)?{frontMatter:doc.frontMatter}:{})};
  const savedBaseline=Object.fromEntries(dirty.map(b=>[b.id,chapterContent(b,doc.frontMatter,doc.sections?.[0]?.id===b.id)]));
  const request=(async()=>{
    isSaving.value=true;
    try{
      const response=await apiFetch(`/api/documents/${doc.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const updated=await response.json();
      if(!response.ok)throw Object.assign(new Error(updated.error||'Gagal menyimpan dokumen'),{status:response.status});
      for(const bab of payload.sections)if(updated.editorRevisions?.[bab.id])baseRevisions[bab.id]=updated.editorRevisions[bab.id];Object.assign(baseline,savedBaseline);
      if(updated.permissions)doc.permissions=updated.permissions;
      const index=store.documents.findIndex(d=>d.id===doc.id);if(index>=0)store.documents[index]=updated;
      for(const recovered of recoveredDrafts){await putEditorDraft({...recovered,archived:true,pending:false});}recoveredDrafts=[];
      if(editRevision===revisionBeingSaved){hasUnsavedChanges.value=false;saveError.value=false;}
      online.value=true;await checkpoint(hasUnsavedChanges.value);
    }catch(error:any){
      saveError.value=true;
      if(error.status===409||error.status===423||error.status===403){await renewEditorSession();}
      else if(error.status===400){sessionError.value=error.message;}
      else {online.value=false;scheduleReconnect();}
      throw error;
    }finally{isSaving.value=false;}
  })();
  savePromise=request;try{await request;}finally{if(savePromise===request)savePromise=null;}
  if(hasUnsavedChanges.value&&!saveError.value)await persistChanges();
}
const previewHtml = ref('');
const pagedBridge=ref<ReturnType<typeof pagedCanvas>|null>(null);
let pagedBase=new Map<string,string>();
const pagedTools=[{command:'undo',label:'Urungkan'},{command:'redo',label:'Ulangi'},{command:'italic',label:'Miring'},{command:'underline',label:'Garis bawah'},{command:'superscript',label:'Superskrip'},{command:'subscript',label:'Subskrip'},{command:'insertOrderedList',label:'Daftar nomor'},{command:'insertUnorderedList',label:'Bullet'},{command:'indent',label:'Tambah inden'},{command:'outdent',label:'Kurangi inden'}];
function closePreview(){if(pagedBridge.value?.pendingPaste){store.addToast('Paste masih diproses. Tunggu hingga selesai sebelum menutup kanvas.','info');return;}pagedBridge.value?.dispose();pagedBridge.value=null;pagedBase.clear();previewHtml.value='';}
function pagedChanges(changes:Array<{babId:string;subId:string;index:number;html:string}>){
 const groups=new Map<string,typeof changes>();for(const change of changes){if(!canEditSection(change.babId))continue;if(!groups.has(change.subId))groups.set(change.subId,[]);groups.get(change.subId)!.push(change);}
 for(const [subId,blocks] of groups){const bab=currentDoc.value?.sections?.find(b=>b.id===blocks[0].babId),sub=bab?.subsections.find(s=>s.id===subId);if(!sub)continue;
  const root=new DOMParser().parseFromString(pagedBase.get(subId)??sub.content??'','text/html').body;root.querySelectorAll('.doc-caption-orphan').forEach(n=>n.remove());const nodes=editableContentNodes(root);
  for(const block of blocks){const node=nodes[block.index];if(node&&!node.classList.contains('doc-caption'))node.outerHTML=block.html;}
  sub.content=root.innerHTML;
  const live=document.querySelector<HTMLElement>(`.ProseMirror[data-sub-id="${CSS.escape(subId)}"]`);if(live)live.innerHTML=sub.content;
 }
 renumberCaptions(false);triggerAutosave();
}

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

async function previewDocument(editing=false) {
  if (!currentDoc.value || exporting.value) return;
  if (currentDoc.value.cara === 'upload') {
    await loadSourceReview();
    return;
  }
  try {
    exporting.value = true;
    await flushSave();
    if(editing)pagedBase=new Map((currentDoc.value.sections||[]).flatMap(b=>b.subsections.map(s=>[s.id,s.content] as [string,string])));
    const res=await apiFetch(`/api/documents/${currentDoc.value.id}/preview${editing?'?editing=1':''}`);
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
  if(currentDoc.value.cara!=='upload'&&!currentDoc.value.isLampiranOtomatis&&!currentDoc.value.documentSettings?.global?.logoData){store.addToast('Logo Kabupaten Cirebon belum diunggah. Hubungi Super Admin untuk melengkapi Pengaturan Dokumen sebelum ekspor.','error');return;}
  if(/\[Alamat OPD belum diisi\]|Petunjuk:/i.test(currentDoc.value.frontMatter?.cover||'')&&!window.confirm('Sampul masih berisi teks panduan/placeholder. Teks tersebut akan dihapus dari file ekspor. Tetap lanjutkan?'))return;
  if(currentDoc.value.cara!=='upload'&&!currentDoc.value.isLampiranOtomatis&&!currentDoc.value.documentSettings?.opd?.alamat&&!window.confirm('Alamat OPD belum diisi. Baris alamat akan dikosongkan pada file ekspor. Untuk melengkapi data, buka Profil OPD melalui tautan pada peringatan di editor. Tetap ekspor draf?'))return;
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

  if(!await runFormatCheck())return;
  if (!formatReport.value?.canSubmit) {
    store.addToast('Perbaiki masalah wajib pada Cek Format sebelum mengajukan.', 'error');
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

const warnBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!hasUnsavedChanges.value && !isSaving.value && !localSaving.value && !pagedBridge.value?.pendingPaste) return;
  event.preventDefault();
  event.returnValue = '';
};

onBeforeRouteLeave(async () => {
  if(pagedBridge.value?.pendingPaste&&localStorage.getItem('sipanda_token')){store.addToast('Paste masih diproses. Tunggu hingga selesai sebelum meninggalkan editor.','info');return false;}
  try {
    await flushSave();
    return true;
  } catch {
    try{await checkpoint();}catch{return false;}
    return !localStorage.getItem('sipanda_token')||window.confirm('Draf sudah disimpan di perangkat, tetapi belum tersinkron ke server. Tinggalkan editor?');
  }
});

onMounted(async () => {
  document.addEventListener('selectionchange', trackTableSelection);
  window.addEventListener('beforeunload', warnBeforeUnload);
  window.addEventListener('keydown', handleOrientationHistory, true);
  window.addEventListener('keydown', handleEditorShortcut);
  window.addEventListener('offline',connectionLost);
  window.addEventListener('online',reconnectEditor);
  window.addEventListener('pagehide',releaseEditorSession);
  await loadDocument();
  heartbeatTimer=setInterval(()=>void reconnectEditor(),20000);
  if (currentDoc.value?.cara === 'upload') await loadSourceReview(); else schedulePageGuides();
});

onUnmounted(() => {
  pagedBridge.value?.dispose();
  if(thumbnailStyleUrl)URL.revokeObjectURL(thumbnailStyleUrl);
  document.removeEventListener('selectionchange', trackTableSelection);
  clearSearchHighlights();
  clearTimeout(previewPoll);
  window.removeEventListener('beforeunload', warnBeforeUnload);
  window.removeEventListener('keydown', handleOrientationHistory, true);
  window.removeEventListener('keydown', handleEditorShortcut);
  if (sourceReviewUrl.value) URL.revokeObjectURL(sourceReviewUrl.value);
  clearTimeout(autosaveTimer);
  clearTimeout(retryTimer!);if(heartbeatTimer)clearInterval(heartbeatTimer);
  window.removeEventListener('offline',connectionLost);
  window.removeEventListener('online',reconnectEditor);
  window.removeEventListener('pagehide',releaseEditorSession);
  releaseEditorSession();
});
</script>


