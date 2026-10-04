<template>
  <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
    <!-- Breadcrumbs -->
    <div class="min-w-0 flex items-center gap-2 text-xs text-slate-500 font-medium">
      <span class="font-bold text-slate-700">SIPANDA</span>
      <span>&rsaquo;</span>
      <span class="truncate text-blue-600 font-semibold">{{ currentBreadcrumb }}</span>
    </div>

    <!-- Right Area: Notifications, User -->
    <div class="ml-2 flex shrink-0 items-center gap-3">

      <!-- Help Button -->
      <button
        @click="showHelpModal = true"
        title="Panduan SIPANDA"
        class="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors"
      >
        <HelpCircle class="w-4 h-4" />
      </button>

      <!-- Notifications Bell -->
      <div class="relative">
        <button
          @click="showNotifications = !showNotifications"
          class="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors relative"
        >
          <Bell class="w-4 h-4" />
          <span class="w-2 h-2 rounded-full bg-red-500 absolute top-1.5 right-1.5 ring-2 ring-white"></span>
        </button>

        <!-- Notification Dropdown -->
        <div
          v-if="showNotifications"
          class="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-40"
        >
          <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span class="text-xs font-bold text-slate-800">Notifikasi Terkini</span>
            <span class="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.2 rounded font-bold">2 Baru</span>
          </div>
          <div class="space-y-2 text-xs">
            <div class="p-2 rounded-xl bg-blue-50/70 border border-blue-100">
              <div class="font-bold text-slate-800">Catatan Revisi BAB IV</div>
              <div class="text-[11px] text-slate-600 mt-0.5">Desk Bapperida meminta penyesuaian pagu indikatif.</div>
              <div class="text-[10px] text-slate-400 mt-1">2 jam yang lalu</div>
            </div>
            <div class="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div class="font-bold text-slate-800">Tenggat Pengajuan Renja Murni 2025</div>
              <div class="text-[11px] text-slate-600 mt-0.5">Sisa 4 hari kalender menuju penutupan desk review.</div>
              <div class="text-[10px] text-slate-400 mt-1">1 hari yang lalu</div>
            </div>
          </div>
        </div>
      </div>

      <!-- User Profile Header -->
      <div class="flex items-center gap-2.5 pl-2 border-l border-slate-200">
        <div class="hidden text-right sm:block">
          <div class="text-xs font-bold text-slate-800 leading-tight max-w-[200px] truncate" :title="store.currentUser?.name">
            {{ store.currentUser?.role === 'admin' ? 'Super Admin PPEPD' : store.currentUser?.name }}
          </div>
          <div class="text-[10px] text-slate-500 leading-tight">
            {{ store.isAdmin ? 'Akses seluruh dokumen' : store.isStaff ? 'Staf Bapperida' : 'Perangkat Daerah' }}
          </div>
        </div>
        <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs"
             :class="store.isBapperida ? 'bg-blue-600' : 'bg-emerald-600'">
          <Building2 class="w-4 h-4" />
        </div>
      </div>
    </div>

    <!-- Help Modal -->
    <div v-if="showHelpModal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-100">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <BookOpen class="w-5 h-5 text-blue-600" />
            <h3 class="font-bold text-slate-900 text-base">Panduan Penggunaan SIPANDA</h3>
          </div>
          <button @click="showHelpModal = false" class="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="space-y-3 text-xs text-slate-600 leading-relaxed">
          <div class="p-3 bg-blue-50 rounded-xl text-blue-900">
            <strong>Standarisasi Dokumen Kabupaten Cirebon:</strong> Seluruh dokumen Renja dan RKPD wajib mengacu pada sistematika baku Permendagri No. 86 Tahun 2017.
          </div>
          <p><strong>1. Menggunakan Template Sistem:</strong> Judul Bab I s.d. Bab V sudah terkunci otomatis. Anda hanya perlu mengisi substansi narasi dan matriks tabel pada masing-masing sub-bab.</p>
          <p><strong>2. Otomatisasi Cover & Daftar Isi:</strong> Halaman sampul, daftar isi, daftar tabel, dan penomoran halaman terbentuk secara otomatis dan tidak perlu diedit manual.</p>
          <p><strong>3. Lampiran Renja Otomatis:</strong> Dokumen Lampiran Renja akan otomatis dihasilkan dari data Renja Induk Anda tanpa perlu membuat dokumen terpisah.</p>
          <p><strong>4. Konsultasi Bapperida:</strong> Seluruh draf tersimpan secara aman di komputasi awan SIPANDA sehingga OPD tidak perlu mencetak berkas tebal saat asistensi.</p>
        </div>
        <div class="mt-6 text-right">
          <button @click="showHelpModal = false" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold">
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '../../stores/appStore';
import {
  HelpCircle,
  Bell,
  BookOpen,
  X,
  Building2
} from '@lucide/vue';

const store = useAppStore();
const route = useRoute();

const showYearDropdown = ref(false);
const showNotifications = ref(false);
const showHelpModal = ref(false);

const currentBreadcrumb = computed(() => {
  if (route.path === '/') return 'Dashboard Utama';
  if (route.path.startsWith('/dokumen')) return 'Dokumen Perencanaan';
  if (route.path.startsWith('/editor')) return 'Editor Template Dokumen';
  if (route.path.startsWith('/arsip')) return 'Arsip Dokumen Internal & Daerah';
  if (route.path.startsWith('/monitoring')) return route.query.opd ? 'Detail Arsip OPD' : 'Monitoring OPD Kabupaten Cirebon';
  if (route.path.startsWith('/verifikasi')) return 'Antrean Verifikasi Desk';
  return 'Sistem Informasi Perencanaan Daerah';
});

const selectYear = (year: string) => {
  store.setSelectedTahun(year);
  showYearDropdown.value = false;
  store.fetchDocuments();
};
</script>
