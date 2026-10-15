<template>
  <nav class="overflow-x-auto border-b border-slate-300 pb-1" aria-label="Jenis dokumen perencanaan">
    <div class="flex min-w-max items-center gap-1" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="navigate(tab)"
        class="inline-flex min-h-12 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors"
        :class="activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'"
      >
        <component :is="tab.icon" class="h-4 w-4" />
        {{ tab.label }}
        <span v-if="tab.id === 'evaluasiRenja' || tab.id === 'evaluasiRkpd'" class="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">TW I-IV</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { BookOpen, FileCheck, FileSpreadsheet, Folder } from '@lucide/vue';
import { useAppStore } from '../../stores/appStore';

const store = useAppStore();
const route = useRoute();
const router = useRouter();

const tabs = computed(() => store.isSuperAdmin ? [
  { id: 'renja', label: 'Renja', icon: BookOpen, path: '/dokumen?tab=renja' },
  { id: 'renstra', label: 'Renstra', icon: FileSpreadsheet, path: '/dokumen?tab=renstra' },
  { id: 'rkpd', label: 'RKPD', icon: FileSpreadsheet, path: '/dokumen?tab=rkpd' },
  { id: 'rpjmd', label: 'RPJMD', icon: BookOpen, path: '/dokumen?tab=rpjmd' },
  { id: 'evaluasiRenja', label: 'Evaluasi Renja', icon: FileSpreadsheet, path: '/evaluasi-renja-triwulan' },
  { id: 'evaluasiRkpd', label: 'Evaluasi RKPD', icon: FileSpreadsheet, path: '/evaluasi-rkpd-triwulan' },
  { id: 'formatLampiran', label: 'Format Lampiran', icon: FileCheck, path: '/lampiran' }
] : store.isStaff ? [
  { id: 'renja', label: 'Renja OPD', icon: Folder, path: '/dokumen?tab=renja' },
  { id: 'rkpd', label: 'RKPD ditugaskan', icon: FileSpreadsheet, path: '/dokumen?tab=rkpd' },
  { id: 'formatLampiran', label: 'Format Lampiran', icon: FileCheck, path: '/lampiran' }
] : [
  { id: 'renja', label: 'Renja', icon: Folder, path: '/dokumen?tab=renja' },
  { id: 'renstra', label: 'Renstra', icon: FileSpreadsheet, path: '/dokumen?tab=renstra' },
  { id: 'evaluasiRenja', label: 'Evaluasi Renja', icon: FileSpreadsheet, path: '/evaluasi-renja-triwulan' },
  { id: 'formatLampiran', label: 'Format Lampiran', icon: FileCheck, path: '/lampiran' }
]);

const activeTab = computed(() => {
  if (route.path === '/lampiran') return 'formatLampiran';
  if (route.path === '/evaluasi-renja-triwulan') return 'evaluasiRenja';
  if (route.path === '/evaluasi-rkpd-triwulan') return 'evaluasiRkpd';
  return route.query.tab || 'renja';
});

function navigate(tab: { path: string }) {
  void router.push(tab.path);
}
</script>
