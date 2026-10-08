<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-blue-600">Arsip perencanaan perangkat daerah</p>
        <h1 class="mt-2 text-2xl font-bold text-slate-900">{{ selectedOpd ? 'Arsip Dokumen OPD' : 'Monitoring OPD' }}</h1>
        <p class="mt-2 text-sm text-slate-500">Arsip dokumen perangkat daerah yang sudah disetujui admin.</p>
      </div>
      <label v-if="!route.query.opd" class="text-xs font-semibold text-slate-600">Tahun anggaran
        <select v-model="monitoringYear" class="mt-1 block rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">
          <option v-for="option in years" :key="option" :value="option">T.A. {{ option }}</option>
        </select>
      </label>
    </header>

    <div v-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }} <button @click="load" class="ml-2 font-semibold underline">Coba lagi</button></div>
    <div v-if="loading" role="status" class="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500">{{ route.query.opd ? 'Memuat arsip OPD...' : 'Memuat perangkat daerah...' }}</div>
    <template v-else-if="!error || opds.length">
      <template v-if="!selectedOpd">
        <div class="flex flex-wrap gap-3">
          <label class="min-w-64 flex-1"><span class="sr-only">Cari perangkat daerah</span><input v-model="search" placeholder="Cari nama atau kode OPD..." class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm" /></label>
          <label><span class="sr-only">Kategori OPD</span><select v-model="opdCategory" class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"><option value="Semua">Semua kategori OPD</option><option v-for="c in opdCategories" :key="c">{{ c }}</option></select></label>
        </div>
        <p class="text-xs text-slate-500">Klik nama OPD untuk membuka arsip yang disetujui.</p>
        <p v-if="complianceError" role="alert" class="text-xs text-rose-700">{{ complianceError }} <button @click="loadCompliance" class="underline">Coba lagi</button></p>
        <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="opd in filteredOpds"
            :key="opd.id"
            @click="selectOpd(opd.id)"
            class="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium leading-snug text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span class="flex items-center justify-between gap-3">
              <span class="min-w-0 flex-1">{{ opd.nama }}</span>
              <span class="shrink-0 rounded-lg bg-blue-50 px-2.5 py-2 text-right text-blue-700" :title="`Jumlah dokumen wajib pada tahun anggaran ${monitoringYear}`">
                <span class="block text-sm font-bold">{{ submittedRatio(opd.id) }}</span>
                <span class="block text-[10px] font-medium">T.A. {{ monitoringYear }}</span>
              </span>
            </span>
          </button>
        </div>
        <div v-if="!filteredOpds.length" class="rounded-2xl border border-dashed p-12 text-center text-sm text-slate-500">Tidak ada OPD yang sesuai dengan pencarian atau cakupan akses Anda.</div>
      </template>

      <section v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="border-b border-slate-100 p-5">
          <button @click="selectOpd('')" class="mb-4 text-xs font-semibold text-blue-600">← Kembali ke daftar OPD</button>
          <div class="flex flex-wrap items-center justify-between gap-4"><div><h2 class="text-xl font-bold text-slate-900">{{ selectedOpd.nama }}</h2><p class="mt-1 text-xs text-slate-500">Kode {{ selectedOpd.kode }} · {{ selectedOpd.kategori }} · T.A. {{ year }}</p></div>
            <span class="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Arsip disetujui</span>
          </div>
          <h3 class="mt-5 text-base font-bold text-slate-900">Arsip Dokumen</h3>
          <div class="mt-3 flex flex-wrap gap-3">
            <label class="text-xs font-semibold text-slate-600">Jenis dokumen
              <select v-model="documentType" class="mt-1 block w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">Semua jenis dokumen</option>
                <option v-for="type in documentTypes" :key="type" :value="type">{{ type }}</option>
              </select>
            </label>
            <label class="text-xs font-semibold text-slate-600">Tahun anggaran
              <select v-model="year" class="mt-1 block w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="all">Semua tahun</option>
                <option v-for="option in years" :key="option" :value="option">T.A. {{ option }}</option>
              </select>
            </label>
          </div>
        </div>
        <div class="overflow-x-auto"><table class="w-full min-w-[850px] text-left text-xs"><thead class="bg-slate-50 text-slate-500"><tr><th class="p-4">Nama dokumen &amp; tahun target</th><th class="p-4">Tanggal disetujui / verifikasi</th><th class="p-4">Versi / revisi final</th><th class="p-4">Akses arsip</th></tr></thead><tbody class="divide-y divide-slate-100"><tr v-for="doc in documents" :key="doc.id"><td class="max-w-xs p-4"><p class="font-semibold text-slate-900">{{ doc.judul }}</p><p class="mt-1 text-slate-400">{{ doc.fileName || doc.jenis }}</p><p class="mt-2 font-semibold text-blue-700">{{ doc.category === 'Renstra' ? `Periode ${doc.periodStart}-${doc.periodEnd}` : `Tahun target ${doc.tahun}` }}</p></td><td class="p-4"><p>{{ doc.verifiedAt ? formatDate(doc.verifiedAt) : 'Belum tercatat' }}</p><p class="mt-1 text-slate-500">{{ doc.verifier || 'Verifikator belum tercatat' }}</p><p v-if="doc.isLampiranOtomatis" class="mt-1 text-[10px] text-slate-400">{{ doc.verificationSource }}</p></td><td class="p-4"><p>{{ doc.version === null ? 'Versi belum tercatat' : `Versi ${doc.version}` }}</p><p class="mt-1 text-slate-500">{{ doc.revisionCount }} permintaan revisi</p></td><td class="p-4"><div class="flex gap-2"><button @click="preview(doc)" :disabled="!!busy || !doc.available" class="rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-700 disabled:opacity-40">Pratinjau</button><button @click="download(doc)" :disabled="!!busy || !doc.available" class="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white disabled:opacity-40">{{ busy === `download:${doc.id}` ? 'Menyiapkan...' : 'Unduh' }}</button></div><p v-if="!doc.available" class="mt-2 text-amber-700">Berkas/isi belum tersedia</p></td></tr></tbody></table></div>
        <div v-if="!documents.length" class="p-12 text-center"><p class="font-semibold text-slate-700">Belum ada arsip dokumen yang disetujui sesuai filter</p><p class="mt-2 text-xs text-slate-500">Pilih tahun atau jenis dokumen lain untuk melihat arsip yang sudah disetujui.</p></div>
      </section>
    </template>

    <dialog ref="previewDialog" @close="clearPreview" class="m-auto h-[88vh] w-[94vw] max-w-6xl overflow-hidden rounded-2xl p-0 backdrop:bg-slate-900/50">
      <div class="flex h-full flex-col"><header class="flex items-center justify-between gap-4 border-b p-4"><h2 class="text-sm font-bold">{{ previewTitle }}</h2><button @click="previewDialog?.close()" class="rounded-lg border px-3 py-2 text-xs">Tutup</button></header><iframe v-if="previewUrl" :src="previewUrl" title="Pratinjau arsip OPD" class="w-full flex-1 border-0"/><p v-else class="p-8 text-center text-sm text-slate-500" role="status">Menyiapkan PDF dokumen...</p></div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue';
import {useRoute,useRouter} from 'vue-router';
import {useAppStore} from '../stores/appStore';
import {apiFetch} from '../lib/api';
import {formatUserDate} from '../lib/userDateFormat';
import type {ArchiveDocument,MonitoringOpd} from '../types/monitoring';
import type { MonitoringItem, PlanningComplianceReport } from '../types';
const store=useAppStore(),route=useRoute(),router=useRouter();
const documentTypes=['Renja Murni','Renja Perubahan','Renstra','Renstra Murni','Renstra Perubahan','Lampiran Perbup Renja','Lampiran Kepbup Perubahan Renja','Lampiran Perbup Renstra'];
const year=ref(/^\d{4}$/.test(String(route.query.tahun))?String(route.query.tahun):'all');
const monitoringYear=ref(store.selectedTahun);
const documentType=ref(''),search=ref(''),opdCategory=ref('Semua');
const opds=ref<MonitoringOpd[]>([]),loading=ref(false),error=ref(''),busy=ref('');
const years=computed(()=>[...new Set([...store.availableYears,...opds.value.flatMap(opd=>opd.documents.map(doc=>doc.tahun))])].filter(value=>/^\d{4}$/.test(value)).sort().reverse());
const selectedOpd=computed(()=>opds.value.find(o=>o.id===route.query.opd));
const opdCategories=computed(()=>[...new Set(opds.value.map(o=>o.kategori).filter((value): value is string => !!value))].sort());
const filteredOpds=computed(()=>opds.value.filter(o=>(opdCategory.value==='Semua'||o.kategori===opdCategory.value)&&`${o.nama} ${o.kode}`.toLowerCase().includes(search.value.trim().toLowerCase())));
const documents=computed(()=>selectedOpd.value?.documents.filter(doc=>doc.status==='Disetujui'&&(!documentType.value||doc.jenis===documentType.value))||[]);
const complianceError=ref('');
const complianceLoading=ref(false);
const complianceOpds=ref<MonitoringItem[]>([]);
let complianceController:AbortController|undefined;
function submittedRatio(opdId:string){
 const cached=store.monitoringReport?.tahun===monitoringYear.value?store.monitoringReport.opds:[];
 const opd=complianceOpds.value.find(item=>item.id===opdId)||cached.find(item=>item.id===opdId);
 if(!opd)return '—/4';
 const statuses=['Menunggu Verifikasi','Perlu Revisi','Disetujui'];
 const annualKeys=new Set(['renjaMurni','lampiranRenjaMurni','renjaPerubahan','lampiranRenjaPerubahan']);
 const count=(opd.items||[]).filter(item=>annualKeys.has(item.key)&&item.documentId&&statuses.includes(item.status)&&(!item.parentStatus||statuses.includes(item.parentStatus))).length;
 return `${count}/4`;
}
async function loadCompliance(){
 complianceController?.abort();
 const request=new AbortController();complianceController=request;
 const timeout=window.setTimeout(()=>request.abort(),15000);
 complianceError.value='';complianceLoading.value=true;complianceOpds.value=[];
 try{
  const response=await apiFetch(`/api/stats/monitoring?${new URLSearchParams({tahun:monitoringYear.value})}`,{signal:request.signal});
  const report:PlanningComplianceReport & {error?:string}=await response.json();
  if(!response.ok)throw Error(report.error||'Gagal memuat rasio dokumen wajib');
  if(!Array.isArray(report.opds))throw Error('Backend monitoring masih memakai format lama. Restart backend untuk memuat jumlah dokumen.');
  if(!request.signal.aborted)complianceOpds.value=report.opds;
 }catch(error){if(complianceController===request)complianceError.value=request.signal.aborted?'Pemuatan rasio dokumen terlalu lama. Coba lagi.':error instanceof Error?error.message:'Gagal memuat rasio dokumen wajib';}
 finally{window.clearTimeout(timeout);if(complianceController===request)complianceLoading.value=false;}
}
watch(monitoringYear,loadCompliance,{immediate:true});
let controller:AbortController|undefined;
async function load(){
 controller?.abort();
 const request=new AbortController();controller=request;loading.value=true;error.value='';
 const timeout=window.setTimeout(()=>request.abort(),15000);
 try{
  const directoryOnly=!route.query.opd;
  if(directoryOnly&&store.isSuperAdmin&&store.opds.length){
   opds.value=store.opds.map(opd=>({...opd,approvedCount:0,categories:{} as MonitoringOpd['categories'],documents:[]}));
   loading.value=false;
  }
  // The initial directory does not depend on an archive year or document status.
  const archiveParams=new URLSearchParams();
  if(!directoryOnly&&year.value!=='all')archiveParams.set('tahun',year.value);
  const archiveUrl=`/api/monitoring/archives${archiveParams.size?`?${archiveParams}`:''}`;
  const url=directoryOnly&&store.isSuperAdmin?'/api/opds':archiveUrl;
  const response=await apiFetch(url,{signal:request.signal});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Gagal memuat monitoring');
  if(!request.signal.aborted){
   opds.value=Array.isArray(data)?data.map(opd=>({...opd,approvedCount:0,categories:{},documents:[]})):data.opds;
  }
 }catch(e){if(controller===request){error.value=request.signal.aborted?'Pemuatan data terlalu lama. Periksa koneksi lalu pilih Coba lagi.':e instanceof Error?e.message:'Gagal memuat monitoring';}}
 finally{window.clearTimeout(timeout);if(controller===request)loading.value=false;}
}
watch([()=>route.query.opd,year,()=>store.currentUser?.id,()=>store.isSuperAdmin],()=>{load();},{immediate:true});
function selectOpd(id:string){
 documentType.value='';year.value='all';
 router.replace({query:{...route.query,opd:id||undefined,tahun:undefined}});
}
watch(year,()=>{
 if(route.query.opd)router.replace({query:{...route.query,tahun:year.value==='all'?undefined:year.value}});
});
function formatDate(value:string){return formatUserDate(value,store.preferences);}
const previewDialog=ref<HTMLDialogElement>(),previewTitle=ref(''),previewUrl=ref('');
let previewGeneration=0;
function clearPreview(){previewGeneration++;if(previewUrl.value)URL.revokeObjectURL(previewUrl.value);previewUrl.value='';}
async function responseBlob(url:string){const r=await apiFetch(url);if(!r.ok){const error=await r.json().catch(()=>({}));throw Error(error.error||'Dokumen tidak dapat dibuka');}return r.blob();}
async function preview(doc:ArchiveDocument){clearPreview();const generation=previewGeneration;previewTitle.value=doc.judul;previewDialog.value?.showModal();busy.value=`preview:${doc.id}`;try{const blob=await responseBlob(doc.cara==='upload'&&!doc.isLampiranOtomatis?`/api/documents/${doc.id}/source-preview`:`/api/export/pdf/${doc.id}`);if(generation===previewGeneration)previewUrl.value=URL.createObjectURL(blob);}catch(e){if(generation===previewGeneration)previewDialog.value?.close();store.addToast(e instanceof Error?e.message:'Pratinjau gagal','error');}finally{busy.value='';}}
async function download(doc:ArchiveDocument){busy.value=`download:${doc.id}`;try{const original=doc.cara==='upload'&&!doc.isLampiranOtomatis;const blob=await responseBlob(original?`/api/documents/${doc.id}/source`:`/api/export/pdf/${doc.id}`);const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=original?(doc.fileName||doc.judul):`${doc.judul}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){store.addToast(e instanceof Error?e.message:'Unduhan gagal','error');}finally{busy.value='';}}
onUnmounted(()=>{controller?.abort();complianceController?.abort();clearPreview();});
</script>
