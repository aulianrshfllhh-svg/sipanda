<template>
  <aside class="w-64 bg-white border-r border-slate-200 flex flex-col h-screen select-none shrink-0 sticky top-0">
    <!-- Header Logo -->
    <div class="p-5 border-b border-slate-100">
      <SipandaLogo />
    </div>

    <!-- Navigation Menu -->
    <div class="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      <!-- Section: Info & Perencanaan -->
      <div>
        <div class="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Info & Perencanaan
        </div>
        <nav class="space-y-1">
          <router-link
            to="/"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/') ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
          >
            <LayoutDashboard class="w-4 h-4 shrink-0" />
            <span>Dashboard Utama</span>
          </router-link>

          <!-- Dokumen Perencanaan with Accordion -->
          <div>
            <button
              @click="toggleDokumenMenu"
              class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              :class="isDokumenActive ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
            >
              <div class="flex items-center gap-3">
                <FolderOpen class="w-4 h-4 shrink-0" />
                <span>Dokumen Perencanaan</span>
              </div>
              <ChevronDown
                class="w-4 h-4 transition-transform duration-200"
                :class="{ 'rotate-180': isDokumenMenuOpen }"
              />
            </button>

            <!-- Submenu -->
            <div v-show="isDokumenMenuOpen" class="mt-1 pl-4 space-y-1">
              <div class="pl-3 border-l-2 border-slate-200 space-y-1 my-1">
                <router-link
                  to="/dokumen?tab=renja"
                  class="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  :class="isActiveSub('/dokumen', 'renja') ? 'text-blue-700 font-semibold bg-blue-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'"
                >
                  <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span>Renja</span>
                  </div>
                  <span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                    {{ renjaDocsCount }} Dokumen
                  </span>
                </router-link>

                <router-link
                  to="/dokumen?tab=renstra"
                  v-if="store.isSuperAdmin || !store.isBapperida"
                  class="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  :class="isActiveSub('/dokumen', 'renstra') ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'"
                >
                  <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    <span>Renstra</span>
                  </div>
                  <span class="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
                    {{ renstraDocsCount }} Dokumen
                  </span>
                </router-link>
                <router-link
                  v-if="store.isBapperida"
                  to="/dokumen?tab=rkpd"
                  class="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  :class="isActiveSub('/dokumen', 'rkpd') ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'"
                >
                  <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    <span>RKPD</span>
                  </div>
                  <span class="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
                    {{ rkpdDocsCount }} Dokumen
                  </span>
                </router-link>
                <router-link
                  v-if="store.isBapperida"
                  to="/dokumen?tab=rpjmd"
                  class="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  :class="isActiveSub('/dokumen', 'rpjmd') ? 'text-emerald-700 font-semibold bg-emerald-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'"
                >
                  <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    <span>RPJMD</span>
                  </div>
                  <span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">
                    {{ rpjmdDocsCount }} Dokumen
                  </span>
                </router-link>
              </div>
            </div>
          </div>

          <router-link
            to="/lampiran"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/lampiran') ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
          >
            <FileText class="w-4 h-4 shrink-0" />
            <span>Lampiran</span>
          </router-link>

          <!-- Arsip Dokumen -->
          <router-link
            to="/arsip"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/arsip') ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
          >
            <Archive class="w-4 h-4 shrink-0" />
            <span>Arsip Dokumen</span>
          </router-link>
          <router-link
            to="/pengaturan"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/pengaturan') ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
          >
            <Settings class="w-4 h-4 shrink-0" />
            <span>Pengaturan Dokumen</span>
          </router-link>
        </nav>
      </div>

      <router-link v-if="store.isSuperAdmin" to="/template" class="block px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 rounded">Template Dokumen</router-link>
      <!-- Section: Administrasi -->
      <div>
        <div class="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Administrasi
        </div>
        <nav class="space-y-1">
          <router-link
            v-if="store.isBapperida"
            to="/monitoring"
            class="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/monitoring') ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
          >
            <div class="flex items-center gap-3">
              <TrendingUp class="w-4 h-4 shrink-0" />
              <span>Monitoring OPD</span>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                  :class="isActive('/monitoring') ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'">
              71 OPD
            </span>
          </router-link>

          <router-link
            v-if="store.isBapperida"
            to="/verifikasi"
            class="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/verifikasi') ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
          >
            <div class="flex items-center gap-3">
              <CheckCircle class="w-4 h-4 shrink-0" />
              <span>Status Verifikasi</span>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  :class="isActive('/verifikasi') ? 'bg-blue-500 text-white' : 'bg-amber-100 text-amber-700'">
              {{ pendingVerificationCount }}
            </span>
          </router-link>

          <router-link
            v-if="store.isSuperAdmin"
            to="/penugasan-staf"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive('/penugasan-staf') ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
          >
            <Users class="w-4 h-4 shrink-0" />
            <span>Pegawai & Penugasan</span>
          </router-link>

          <button
            @click="handleLogout"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
          >
            <LogOut class="w-4 h-4 shrink-0" />
            <span>Keluar</span>
          </button>
        </nav>
      </div>
    </div>

    <!-- Bottom User Profile & Switcher -->
    <div class="p-3 border-t border-slate-200 bg-slate-50/70">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5 overflow-hidden">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs text-white"
               :class="store.isBapperida ? 'bg-blue-600' : 'bg-emerald-600'">
            <Building2 class="w-4 h-4" />
          </div>
          <div class="truncate">
            <div class="text-xs font-bold text-slate-800 truncate" :title="store.currentUser?.name">
              {{ store.currentUser?.role === 'admin' ? 'Super Admin PPEPD' : store.currentUser?.name }}
            </div>
            <div class="text-[10px] text-slate-500 truncate">
              {{ store.isAdmin ? 'Akses seluruh dokumen' : store.isStaff ? 'Staf Bapperida' : 'Perangkat Daerah' }}
            </div>
          </div>
        </div>
        <button
          v-if="store.isSuperAdmin"
          @click="openUserSwitcher"
          title="Ganti Peran / Perangkat Daerah"
          class="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white transition-colors border border-transparent hover:border-slate-200 shrink-0"
        >
          <Repeat class="w-4 h-4" />
        </button>
      </div>
    </div>

    <RoleSwitcherModal v-if="store.isSuperAdmin" v-model="showUserSwitcher" @switched="handleUserSwitched" />

  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '../../stores/appStore';
import SipandaLogo from '../common/SipandaLogo.vue';
import RoleSwitcherModal from './RoleSwitcherModal.vue';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Archive,
  TrendingUp,
  CheckCircle,
  Users,
  Settings,
  ChevronDown,
  Building2,
  Repeat,
  LogOut
} from '@lucide/vue';

const store = useAppStore();
const route = useRoute();
const router = useRouter();

const isDokumenMenuOpen = ref(true);
const showUserSwitcher = ref(false);
const isDokumenActive = computed(() => route.path.startsWith('/dokumen'));
const navigationDocuments = computed(() => store.isSuperAdmin
  ? store.documents.filter(doc => doc.opdId === (store.currentUser?.opdId || 'bapperida'))
  : store.documents);

const renjaDocsCount = computed(() => {
  return navigationDocuments.value.filter(d => d.jenis.includes('Renja')).length;
});

const renstraDocsCount = computed(() => {
  return navigationDocuments.value.filter(d => d.jenis.includes('Renstra')).length;
});

const rkpdDocsCount = computed(() => navigationDocuments.value.filter(doc => doc.jenis.includes('RKPD')).length);
const rpjmdDocsCount = computed(() => navigationDocuments.value.filter(doc => doc.jenis === 'RPJMD').length);

const pendingVerificationCount = computed(() => {
  return store.documents.filter(d => d.status === 'Menunggu Verifikasi').length;
});

const isActive = (path: string) => route.path === path;
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
  // If navigating from restricted page, redirect to home
  if (returnToDashboard || route.path === '/monitoring' || route.path === '/verifikasi') {
    router.push('/');
  }
};

const handleLogout = () => {
  store.logout();
  router.push('/login');
};
</script>
