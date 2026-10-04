<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2.5">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Antrean Verifikasi Desk Bapperida</h1>
          <span class="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
            T.A. {{ store.selectedTahun }}
          </span>
        </div>
        <p class="text-xs text-slate-500 mt-1">
          Telaah substansi, pagu indikatif, dan kepatuhan format Renja/Renstra sebelum pengesahan resmi
        </p>
      </div>

      <!-- Quick Filter Tabs -->
      <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
        <button
          v-for="st in ['Semua', 'Menunggu Verifikasi', 'Perlu Revisi', 'Disetujui']"
          :key="st"
          @click="statusTab = st"
          class="px-3 py-1.5 rounded-lg transition-colors"
          :class="statusTab === st ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'"
        >
          {{ st }}
        </button>
      </div>
    </div>

    <!-- Verification Queue Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div
        v-for="doc in queueDocuments"
        :key="doc.id"
        class="bg-white border rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-md"
        :class="doc.status === 'Menunggu Verifikasi' ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'"
      >
        <div>
          <!-- Header -->
          <div class="flex items-center justify-between mb-3">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="getStatusBadgeClass(doc.status)">
              {{ doc.status }}
            </span>
            <span class="text-xs font-mono font-semibold text-slate-400">T.A. {{ doc.tahun }}</span>
          </div>

          <h3 class="font-bold text-sm text-slate-900 leading-snug">
            {{ doc.judul }}
          </h3>
          <p class="text-xs text-slate-500 mt-1 line-clamp-2">
            {{ doc.subJudul }}
          </p>

          <div class="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
            <div class="flex items-center justify-between text-slate-600">
              <span class="text-slate-400">OPD:</span>
              <span class="font-semibold text-slate-800">{{ doc.opdName }}</span>
            </div>
            <div class="flex items-center justify-between text-slate-600">
              <span class="text-slate-400">Metode:</span>
              <span class="font-semibold text-slate-700 capitalize">{{ doc.cara === 'template' ? 'Template Baku Permendagri' : 'Upload Mandiri' }}</span>
            </div>
            <div v-if="doc.catatanRevisi" class="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px] leading-relaxed">
              <strong>Catatan:</strong> {{ doc.catatanRevisi }}
            </div>
          </div>
        </div>

        <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span class="text-[11px] text-slate-400 font-mono">{{ doc.kodeDoc }}</span>
          <router-link
            :to="`/editor/${doc.id}`"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-colors shadow-2xs"
            :class="doc.status === 'Menunggu Verifikasi' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'"
          >
            {{ doc.permissions?.canVerify ? 'Telaah Naskah &rarr;' : 'Lihat Naskah' }}
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAppStore } from '../stores/appStore';
import type { DocumentItem } from '../types';

const store = useAppStore();
const statusTab = ref('Semua');

const queueDocuments = computed(() => {
  let list = store.documents.filter(d => !d.parentId);
  if (statusTab.value !== 'Semua') {
    list = list.filter(d => d.status === statusTab.value);
  }
  return list;
});

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Menunggu Verifikasi': return 'bg-amber-100 text-amber-800 border border-amber-300';
    case 'Perlu Revisi': return 'bg-red-100 text-red-800 border border-red-200';
    case 'Disetujui': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    default: return 'bg-slate-100 text-slate-700';
  }
};
</script>
