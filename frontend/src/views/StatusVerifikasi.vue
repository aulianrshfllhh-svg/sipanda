<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2.5">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Antrean Verifikasi Desk Bapperida</h1>
          <span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">T.A. {{ store.selectedTahun }}</span>
        </div>
        <p class="mt-1 text-xs text-slate-500">Antrean hanya menampilkan dokumen yang diajukan dan menunggu verifikasi. Lampiran Renja ikut dikirim otomatis bersama dokumen induk.</p>
      </div>
      <span class="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{{ queueDocuments.length }} dokumen menunggu</span>
    </div>

    <div v-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }} <button @click="loadQueue" class="ml-2 font-semibold underline">Coba lagi</button></div>
    <div v-if="loading" role="status" class="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500">Memuat antrean verifikasi...</div>
    <div v-else-if="!queueDocuments.length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <p class="font-semibold text-slate-700">Belum ada dokumen yang menunggu verifikasi.</p>
      <p class="mt-2 text-xs text-slate-500">Dokumen yang disetujui dapat dilihat di Arsip Dokumen pada Monitoring OPD. Riwayat pengajuan dan keputusan tetap tercatat di Aktivitas Terkini pada dashboard.</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      <article v-for="doc in queueDocuments" :key="doc.id" class="flex flex-col justify-between rounded-2xl border border-amber-300 bg-white p-5 shadow-2xs ring-1 ring-amber-200 transition-all hover:shadow-md">
        <div>
          <div class="mb-3 flex items-center justify-between">
            <span class="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Menunggu Verifikasi</span>
            <span class="font-mono text-xs font-semibold text-slate-400">T.A. {{ doc.tahun }}</span>
          </div>
          <h2 class="text-sm font-bold leading-snug text-slate-900">{{ doc.judul }}</h2>
          <p class="mt-1 line-clamp-2 text-xs text-slate-500">{{ doc.subJudul }}</p>

          <div class="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
            <div class="flex items-center justify-between gap-3"><span class="text-slate-400">OPD</span><span class="text-right font-semibold text-slate-800">{{ doc.opdName }}</span></div>
            <div class="flex items-center justify-between gap-3"><span class="text-slate-400">Metode</span><span class="text-right font-semibold text-slate-700">{{ doc.cara === 'template' ? 'Template Baku Permendagri' : 'Upload Mandiri' }}</span></div>
          </div>

          <div v-if="annexFor(doc.id)" class="mt-4 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs">
            <span class="font-medium text-blue-900">{{ annexFor(doc.id)?.judul }}<span class="mt-1 block text-[10px] text-blue-700">Lampiran otomatis mengikuti status dokumen induk</span></span>
            <router-link :to="`/editor/${annexFor(doc.id)?.id}`" class="shrink-0 font-bold text-blue-700 underline">Lihat lampiran</router-link>
          </div>
          <div v-else-if="doc.jenis.startsWith('Renja') || doc.jenis.startsWith('Renstra')" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Lampiran otomatis belum tersedia. Periksa sinkronisasi lampiran dokumen ini.</div>
        </div>

        <div class="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
          <span class="font-mono text-[11px] text-slate-400">{{ doc.kodeDoc }}</span>
          <router-link :to="`/editor/${doc.id}`" class="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-amber-700">
            {{ doc.permissions?.canVerify ? 'Telaah Naskah →' : 'Lihat Naskah' }}
          </router-link>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import {useAppStore} from '../stores/appStore';
import {apiFetch} from '../lib/api';
import type {DocumentItem} from '../types';

const store=useAppStore();
const allQueueItems=ref<DocumentItem[]>([]);
const loading=ref(false);
const error=ref('');
const queueDocuments=computed(()=>allQueueItems.value.filter(doc=>!doc.parentId&&!doc.isLampiranOtomatis&&doc.status==='Menunggu Verifikasi'));
function annexFor(parentId:string){return allQueueItems.value.find(doc=>doc.parentId===parentId&&doc.isLampiranOtomatis);}

async function loadQueue(){
  loading.value=true;error.value='';
  try{
    const response=await apiFetch('/api/documents?includeLampiran=true&status=Menunggu%20Verifikasi');
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Gagal memuat antrean verifikasi');
    allQueueItems.value=Array.isArray(data)?data:[];
  }catch(cause){error.value=cause instanceof Error?cause.message:'Gagal memuat antrean verifikasi';}
  finally{loading.value=false;}
}

onMounted(loadQueue);
watch(()=>store.documents,loadQueue);
</script>
