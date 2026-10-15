<template>
  <aside class="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen select-none shrink-0 sticky top-0 font-sans">
    <!-- Header Logo -->
    <div class="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2.5">
      <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0 overflow-hidden" aria-hidden="true">
        <svg class="w-8 h-8" viewBox="540 60 740 520" preserveAspectRatio="xMidYMid meet" overflow="hidden">
          <image href="/images/sipanda-logo-20261005.png" width="1800" height="874" />
        </svg>
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-extrabold text-slate-900 text-base tracking-tight leading-none">SIPANDA</span>
          <span class="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-md leading-none uppercase">
            {{ roleBadge }}
          </span>
        </div>
        <p class="text-[11px] text-slate-500 font-medium mt-1 leading-tight">
          Bapperida Kab. Cirebon
        </p>
      </div>
    </div>

    <!-- Navigation Menu -->
    <div class="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
      <!-- Section: MENU UTAMA -->
      <div>
        <div class="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          MENU UTAMA
        </div>
        <nav class="space-y-1">
          <!-- 1. Dashboard Utama -->
          <router-link
            to="/"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/') ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
          >
            <LayoutGrid class="w-4 h-4 shrink-0" :class="isActive('/') ? 'text-blue-600' : 'text-slate-500'" />
            <span>Dashboard Utama</span>
          </router-link>

          <!-- 2. Dokumen Perencanaan (Menu Utama Tunggal & Bersih) -->
          <router-link
            to="/dokumen"
            class="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isDokumenActive ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
          >
            <div class="flex items-center gap-3">
              <Folder class="w-4 h-4 shrink-0" :class="isDokumenActive ? 'text-blue-600' : 'text-slate-500'" />
              <span>Dokumen Perencanaan</span>
            </div>
            <span v-if="totalPlanningDocsCount > 0" class="text-[10px] bg-blue-100/80 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
              {{ totalPlanningDocsCount }}
            </span>
          </router-link>

          <!-- 3. Arsip Dokumen -->
          <router-link
            to="/arsip"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/arsip') ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
          >
            <Archive class="w-4 h-4 shrink-0" :class="isActive('/arsip') ? 'text-blue-600' : 'text-slate-500'" />
            <span>Arsip Dokumen</span>
          </router-link>

          <!-- 4. Pengaturan Akun -->
          <router-link
            to="/pengaturan"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/pengaturan') ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
          >
            <Settings class="w-4 h-4 shrink-0" :class="isActive('/pengaturan') ? 'text-blue-600' : 'text-slate-500'" />
            <span>Pengaturan Akun</span>
          </router-link>
        </nav>
      </div>

      <!-- Section: Administrasi (Only for Admin / Bapperida) -->
      <div v-if="store.isBapperida">
        <div class="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          ADMINISTRASI
        </div>
        <nav class="space-y-1">
          <!-- Monitoring OPD -->
          <router-link
            to="/monitoring"
            class="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/monitoring') ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
          >
            <div class="flex items-center gap-3">
              <TrendingUp class="w-4 h-4 shrink-0" :class="isActive('/monitoring') ? 'text-blue-600' : 'text-slate-500'" />
              <span>Monitoring OPD</span>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
              71 OPD
            </span>
          </router-link>

          <!-- Verifikasi 1: Dilakukan verifikator -->
          <router-link
            to="/verifikasi"
            class="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/verifikasi') ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
          >
            <div class="flex items-center gap-3">
              <ClipboardCheck class="w-4 h-4 shrink-0" :class="isActive('/verifikasi') ? 'text-amber-600' : 'text-slate-500'" />
              <span>Verifikasi 1</span>
            </div>
            <span v-if="pendingVerifikasi1Count > 0" class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">
              {{ pendingVerifikasi1Count }}
            </span>
          </router-link>

          <!-- Verifikasi Final: Dilakukan Super Admin -->
          <router-link
            to="/verifikasi-final"
            class="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/verifikasi-final') ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
          >
            <div class="flex items-center gap-3">
              <BadgeCheck class="w-4 h-4 shrink-0" :class="isActive('/verifikasi-final') ? 'text-emerald-600' : 'text-slate-500'" />
              <span>Verifikasi Final</span>
            </div>
            <span v-if="pendingFinalCount > 0" class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">
              {{ pendingFinalCount }}
            </span>
          </router-link>

          <!-- Pegawai & Penugasan (Super Admin only) -->
          <router-link
            v-if="store.isSuperAdmin"
            to="/penugasan-staf"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/penugasan-staf') ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
          >
            <Users class="w-4 h-4 shrink-0" :class="isActive('/penugasan-staf') ? 'text-blue-600' : 'text-slate-500'" />
            <span>Pegawai & Penugasan</span>
          </router-link>
        </nav>
      </div>

      <!-- Pusat Bantuan Card -->
      <details class="rounded-xl bg-[#F4F7FC] border border-blue-100/50 px-3 py-2">
        <summary class="cursor-pointer list-none text-xs font-bold text-slate-800">Pusat Bantuan</summary>
        <p class="pt-1 text-[11px] leading-relaxed text-slate-500">Kendala sinkronisasi data SIPANDA? Hubungi Bapperida.</p>
      </details>
    </div>

    <!-- Bottom User Profile Card -->
    <div class="p-3 border-t border-slate-100 bg-white">
      <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs hover:border-slate-300 transition-colors">
        <div
          class="flex items-center gap-2.5 overflow-hidden flex-1 cursor-pointer"
          @click="store.isSuperAdmin && openUserSwitcher()"
          :title="store.isSuperAdmin ? 'Klik untuk ganti peran' : undefined"
        >
          <div class="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Building2 class="w-5 h-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-xs font-bold text-slate-800 truncate" :title="displayName">
              {{ displayName }}
            </div>
            <div class="text-[10px] text-slate-500 truncate">
              {{ displaySubtitle }}
            </div>
          </div>
        </div>

        <button
          @click="handleLogout"
          title="Keluar"
          class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-50 transition-colors shrink-0 ml-1"
        >
          <LogOut class="w-4 h-4" />
        </button>
      </div>
    </div>

    <RoleSwitcherModal v-if="store.isSuperAdmin" v-model="showUserSwitcher" @switched="handleUserSwitched" />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { isNavigationFailure, useRoute, useRouter } from 'vue-router';
import { useAppStore } from '../../stores/appStore';
import RoleSwitcherModal from './RoleSwitcherModal.vue';
import {
  BookOpen,
  LayoutGrid,
  Folder,
  ChevronDown,
  ChevronUp,
  Archive,
  Settings,
  Info,
  Building2,
  LogOut,
  TrendingUp,
  CheckCircle,
  ClipboardCheck,
  BadgeCheck,
  Users
} from '@lucide/vue';

const store = useAppStore();
const route = useRoute();
const router = useRouter();

const isDokumenMenuOpen = ref(true);
const showUserSwitcher = ref(false);

const roleBadge = computed(() => {
  if (store.isAdmin) return 'ADMIN';
  if (store.isStaff) return 'STAF';
  return 'OPD';
});

const displayName = computed(() => {
  if (store.currentUser?.role === 'admin') return 'Super Admin PPEPD';
  return store.currentUser?.name || store.currentUser?.opdName || 'Operator Kec. Depok';
});

const displaySubtitle = computed(() => {
  if (store.isAdmin) return 'Akses Seluruh Dokumen';
  if (store.isStaff) return 'Staf Bapperida';
  return 'Perangkat Daerah';
});

const isDokumenActive = computed(() => 
  route.path.startsWith('/dokumen') || 
  route.path === '/evaluasi-renja-triwulan' || 
  route.path === '/evaluasi-rkpd-triwulan' || 
  route.path === '/lampiran'
);

const navigationDocuments = computed(() => store.isSuperAdmin
  ? store.documents.filter(doc => doc.opdId === (store.currentUser?.opdId || 'bapperida'))
  : store.documents);

const totalPlanningDocsCount = computed(() => {
  return navigationDocuments.value.filter(d => !d.isLampiranOtomatis).length;
});

const renjaDocsCount = computed(() => {
  return navigationDocuments.value.filter(d => d.jenis?.includes('Renja')).length;
});

const renstraDocsCount = computed(() => {
  return navigationDocuments.value.filter(d => d.jenis?.includes('Renstra')).length;
});

const rkpdDocsCount = computed(() => navigationDocuments.value.filter(doc => doc.jenis?.includes('RKPD')).length);
const rpjmdDocsCount = computed(() => navigationDocuments.value.filter(doc => doc.jenis === 'RPJMD').length);

const pendingVerifikasi1Count = computed(() => {
  if (store.verificationSummary?.counts?.menungguVerifikasi1 !== undefined) {
    return store.verificationSummary.counts.menungguVerifikasi1;
  }
  return store.documents.filter(d =>
    d.status === 'Menunggu Verifikasi' &&
    !d.parentId &&
    !d.isLampiranOtomatis &&
    d.opdId !== 'bapperida' &&
    (store.selectedTahun === 'all' || d.tahun === store.selectedTahun)
  ).length;
});

// Legacy alias digunakan oleh template lain yang mungkin masih mereferensikan ini
const pendingVerificationCount = pendingVerifikasi1Count;

const pendingFinalCount = computed(() => {
  if (store.verificationSummary?.counts?.menungguVerifikasiFinal !== undefined) {
    return store.verificationSummary.counts.menungguVerifikasiFinal;
  }
  return store.documents.filter(d =>
    d.status === 'Disetujui Bapperida' &&
    !d.parentId &&
    !d.isLampiranOtomatis &&
    d.opdId !== 'bapperida' &&
    (store.selectedTahun === 'all' || d.tahun === store.selectedTahun)
  ).length;
});

onMounted(() => {
  if (store.isBapperida) {
    store.fetchVerificationSummary();
  }
});

watch(() => [store.selectedTahun, store.currentUser?.id], () => {
  if (store.isBapperida) {
    store.fetchVerificationSummary();
  }
});

const isActive = (path: string) => {
  if (path === '/verifikasi-final') return route.path.startsWith('/verifikasi-final');
  return route.path === path;
};
const isActiveSub = (path: string, tabQuery: string) => {
  return route.path === path && route.query.tab === tabQuery;
};

const toggleDokumenMenu = () => {
  isDokumenMenuOpen.value = !isDokumenMenuOpen.value;
};

const openUserSwitcher = () => {
  showUserSwitcher.value = true;
};

const handleUserSwitched = (returnToDashboard: boolean) => {
  if (returnToDashboard || route.path === '/monitoring' || route.path === '/verifikasi') {
    router.push('/');
  }
};

const handleLogout = async () => {
  const navigation = await router.push('/login');
  if (isNavigationFailure(navigation)) return;
  store.logout();
};
</script>
