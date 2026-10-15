<template>
  <header
    class="bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30"
    :class="route.path === '/' || route.path.startsWith('/dokumen') ? 'h-14 px-4' : 'h-16 px-6'"
  >
    <!-- Breadcrumbs -->
    <div class="min-w-0 flex items-center gap-2 text-xs text-slate-500 font-medium">
      <button v-if="route.path !== '/'" @click="goBack" class="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700" aria-label="Kembali ke halaman sebelumnya" title="Kembali ke halaman sebelumnya"><ArrowLeft class="h-4 w-4"/><span class="hidden sm:inline">Kembali</span></button>
      <span v-if="route.path !== '/'">&rsaquo;</span>
      <button @click="router.push('/')" class="shrink-0 font-bold text-slate-700 hover:text-blue-700" title="Ke Dashboard SIPANDA">SIPANDA</button>
      <span>&rsaquo;</span>
      <span class="truncate text-blue-600 font-semibold">{{ currentBreadcrumb }}</span>
    </div>

    <!-- Right Area: Notifications, User -->
    <div class="ml-2 flex shrink-0 items-center gap-3">
      <div v-if="route.path.startsWith('/dokumen')" class="relative">
        <button @click="showYearDropdown = !showYearDropdown" :aria-expanded="showYearDropdown" class="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">
          <Calendar class="h-3 w-3" /> T.A. {{ store.selectedTahun }}
        </button>
        <div v-if="showYearDropdown" class="absolute right-0 z-40 mt-2 max-h-64 w-32 overflow-auto rounded-xl border border-slate-100 bg-white p-1 shadow-lg">
          <button v-for="year in store.availableYears" :key="year" @click="selectYear(year)" class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-blue-50" :class="year === store.selectedTahun ? 'font-bold text-blue-700' : 'text-slate-600'">T.A. {{ year }}</button>
        </div>
      </div>

      <!-- Help Button -->
      <button
        @click="showHelpModal = true"
        title="Panduan SIPANDA"
        class="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors"
      >
        <HelpCircle class="w-4 h-4" />
      </button>

        <button
          v-if="store.isSuperAdmin"
          @click="openSendNotification"
          title="Kirim notifikasi kepada OPD"
          class="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 text-[10px] font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-700"
        >
          <Send class="h-3.5 w-3.5 text-orange-700" />
          <span class="hidden lg:inline">Kirim Notifikasi</span>
        </button>

        <!-- Notifications Bell -->
        <div v-if="store.preferences.notificationsEnabled" class="relative">
          <button
            @click="toggleNotifications"
            aria-label="Buka notifikasi"
            class="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors relative"
          >
            <Bell class="w-4 h-4" />
            <span v-if="store.preferences.showUnreadBadge && unreadNotificationCount" class="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[9px] font-bold leading-4 text-white ring-2 ring-white">
              {{ unreadNotificationCount > 9 ? '9+' : unreadNotificationCount }}
            </span>
          </button>

          <!-- Notification Dropdown -->
          <div
            v-if="showNotifications"
            class="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl z-40"
          >
            <div class="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
              <span class="text-xs font-bold text-slate-800">{{ store.isSuperAdmin ? 'Notifikasi Terkirim' : 'Notifikasi untuk OPD' }}</span>
              <span class="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">{{ unreadNotificationCount }} belum dibaca</span>
            </div>
            <div class="max-h-96 space-y-2 overflow-y-auto p-2">
              <button
                v-for="notification in store.notifications"
                :key="notification.id"
                @click="markAsRead(notification)"
                class="block w-full rounded-xl border p-2.5 text-left transition-colors"
                :class="notification.readAt || store.isSuperAdmin ? 'border-slate-100 bg-white hover:bg-slate-50' : 'border-blue-100 bg-blue-50/70 hover:bg-blue-50'"
              >
                <span class="flex items-start justify-between gap-2">
                  <span class="text-xs font-bold text-slate-800">{{ notification.title }}</span>
                  <span v-if="!notification.readAt && !store.isSuperAdmin" class="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600"></span>
                </span>
                <span class="mt-1 block whitespace-pre-line text-[11px] leading-relaxed text-slate-600">{{ notification.message }}</span>
                <span class="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                  <span>{{ store.isSuperAdmin ? `Kepada: ${notification.opdName || 'OPD'}` : `Dari: ${notification.senderName || 'Admin Bapperida'}` }}</span>
                  <span>{{ formatNotificationDate(notification.createdAt) }}</span>
                </span>
              </button>
              <p v-if="store.notifications.length === 0" class="px-3 py-8 text-center text-xs text-slate-500">
                {{ store.isSuperAdmin ? 'Belum ada notifikasi yang dikirim.' : 'Belum ada notifikasi dari Bapperida.' }}
              </p>
            </div>
            <div v-if="notificationLoadError" role="alert" class="border-t border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-700">
              {{ notificationLoadError }}
            </div>
            <div v-if="store.isSuperAdmin" class="border-t border-slate-100 p-2">
              <button @click="openSendNotification" class="w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">
                Kirim Notifikasi Baru
              </button>
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
      <div class="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 border border-slate-100">
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
          <div class="border-t border-slate-200 pt-3">
            <p class="mb-2 font-bold text-slate-800">Panduan mengelola Template Dokumen (Super Admin)</p>
            <ol class="list-decimal space-y-2 pl-4">
              <li>Buka <strong>Template Dokumen</strong>, lalu pilih template sumber pada daftar di sebelah kiri. Template aktif atau yang sudah dipakai dokumen tidak bisa diubah langsung.</li>
              <li>Isi <strong>Tahun salinan</strong>, lalu klik <strong>Duplikasikan</strong>. SIPANDA membuat salinan berstatus Draft / Arsip. Nama salinan dapat diubah setelah salinan dipilih.</li>
              <li>Ubah judul bab, kode dan judul sub-bab, serta petunjuk isi sesuai kebutuhan. Gunakan <strong>+ Bab</strong> atau <strong>+ Sub-bab</strong> untuk menambah bagian; tombol <strong>Hapus</strong> menghapus bagian yang dipilih.</li>
              <li>Klik <strong>Simpan struktur</strong> untuk menyimpan sebagai draft. Periksa kembali struktur dan petunjuknya sebelum mengaktifkan.</li>
              <li>Klik <strong>Simpan dan aktifkan</strong> untuk menjadikan template aktif pada jenis dan tahun tersebut. Template aktif digunakan untuk dokumen yang dibuat sesudahnya; dokumen lama tetap memakai salinan template saat dokumen itu dibuat.</li>
            </ol>
            <p class="mt-2 text-slate-500">Variabel yang tersedia: <code>{opd}</code>, <code>{tahun}</code>, <code>{evaluasi}</code> (tahun − 2), dan <code>{maju}</code> (tahun + 1).</p>
            <p class="mt-2">Pengaturan ini hanya untuk Super Admin. OPD menggunakan template aktif saat membuat dokumen dan mengisi substansinya di dokumen masing-masing.</p>
          </div>
        </div>
        <div class="mt-6 text-right">
          <button @click="showHelpModal = false" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold">
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>

    <div v-if="showSendNotificationModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" @click.self="showSendNotificationModal = false">
      <section class="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl" aria-labelledby="send-notification-title">
        <header class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="send-notification-title" class="text-base font-bold text-slate-900">Kirim Notifikasi ke OPD</h2>
            <p class="mt-1 text-xs text-slate-500">Notifikasi akan muncul pada menu lonceng penerima.</p>
          </div>
          <button @click="showSendNotificationModal = false" aria-label="Tutup formulir notifikasi" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </header>
        <form class="space-y-4 p-5" @submit.prevent="submitNotification">
          <label class="block text-xs font-bold text-slate-700">
            Penerima
            <select v-model="notificationOpdId" required class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-blue-500">
              <option value="all">Semua OPD aktif</option>
              <option v-for="opd in store.opds" :key="opd.id" :value="opd.id">{{ opd.nama }}</option>
            </select>
          </label>
          <label class="block text-xs font-bold text-slate-700">
            Judul
            <input v-model="notificationTitle" required maxlength="150" type="text" placeholder="Contoh: Jadwal desk verifikasi Renja" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-blue-500" />
          </label>
          <label class="block text-xs font-bold text-slate-700">
            Isi Notifikasi
            <textarea v-model="notificationMessage" required maxlength="3000" rows="5" placeholder="Tulis informasi yang perlu disampaikan kepada OPD..." class="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-blue-500"></textarea>
            <span class="mt-1 block text-right text-[10px] font-normal text-slate-400">{{ notificationMessage.length }}/3000</span>
          </label>
          <div v-if="notificationFormError" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{{ notificationFormError }}</div>
          <div class="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" @click="showSendNotificationModal = false" class="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Batal</button>
            <button type="submit" :disabled="isSendingNotification || !store.opds.length" class="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
              {{ isSendingNotification ? 'Mengirim...' : 'Kirim Notifikasi' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '../../stores/appStore';
import type { AppNotification } from '../../types';
import { formatUserDate } from '../../lib/userDateFormat';
import {
  ArrowLeft,
  Calendar,
  HelpCircle,
  Bell,
  BookOpen,
  X,
  Building2,
  Send
} from '@lucide/vue';

const store = useAppStore();
const route = useRoute();
const router = useRouter();

const goBack = () => {
  if (window.history.state?.back) router.back();
  else router.push('/');
};

const showYearDropdown = ref(false);
const showNotifications = ref(false);
const showHelpModal = ref(false);
const showSendNotificationModal = ref(false);
const notificationOpdId = ref('all');
const notificationTitle = ref('');
const notificationMessage = ref('');
const notificationFormError = ref('');
const notificationLoadError = ref('');
const isSendingNotification = ref(false);
const unreadNotificationCount = computed(() => store.isOpd
  ? store.notifications.filter(notification => !notification.readAt).length
  : 0);

const currentBreadcrumb = computed(() => {
  if (route.path === '/') return 'Dashboard Utama';
  if (route.path.startsWith('/dokumen')) return 'Dokumen Perencanaan';
  if (route.path.startsWith('/editor')) return 'Editor Template Dokumen';
  if (route.path.startsWith('/arsip')) return 'Arsip Dokumen Internal & Daerah';
  if (route.path.startsWith('/monitoring')) return route.query.opd ? 'Detail Arsip OPD' : 'Monitoring OPD Kabupaten Cirebon';
  if (route.path.startsWith('/verifikasi')) return 'Antrean Verifikasi Desk';
  if (route.path === '/pengaturan') return 'Pengaturan';
  if (route.path.startsWith('/pengaturan/dokumen')) return 'Pengaturan Dokumen';
  return 'Sistem Informasi Perencanaan Daerah';
});

const selectYear = (year: string) => {
  store.setSelectedTahun(year);
  showYearDropdown.value = false;
  store.fetchDocuments();
};

const loadNotifications = async () => {
  notificationLoadError.value = '';
  try {
    await store.fetchNotifications();
  } catch (error) {
    notificationLoadError.value = error instanceof Error ? error.message : 'Notifikasi gagal dimuat.';
  }
};

watch(
  () => [store.currentUser?.id, store.currentUser?.role] as const,
  ([userId, role]) => {
    if (!userId || (role !== 'opd' && !store.isSuperAdmin)) return;
    void loadNotifications();
  },
  { immediate: true }
);

const toggleNotifications = async () => {
  showNotifications.value = !showNotifications.value;
  if (showNotifications.value && (store.isOpd || store.isSuperAdmin)) await loadNotifications();
};

const openSendNotification = async () => {
  showNotifications.value = false;
  notificationFormError.value = '';
  if (store.opds.length === 0) await store.fetchOpds();
  if (store.opds.length === 0) {
    notificationFormError.value = 'Daftar OPD belum tersedia. Muat ulang halaman dan coba lagi.';
  }
  showSendNotificationModal.value = true;
};

const submitNotification = async () => {
  notificationFormError.value = '';
  isSendingNotification.value = true;
  try {
    await store.sendNotification({
      title: notificationTitle.value,
      message: notificationMessage.value,
      opdId: notificationOpdId.value
    });
    notificationTitle.value = '';
    notificationMessage.value = '';
    notificationOpdId.value = 'all';
    showSendNotificationModal.value = false;
  } catch (error) {
    notificationFormError.value = error instanceof Error ? error.message : 'Notifikasi gagal dikirim.';
  } finally {
    isSendingNotification.value = false;
  }
};

const markAsRead = async (notification: AppNotification) => {
  if (!store.isOpd || notification.readAt) return;
  try {
    await store.markNotificationRead(notification.id);
  } catch (error) {
    notificationLoadError.value = error instanceof Error ? error.message : 'Status notifikasi gagal diperbarui.';
  }
};

const formatNotificationDate = (value: string) => {
  return formatUserDate(value, store.preferences, true);
};
</script>
