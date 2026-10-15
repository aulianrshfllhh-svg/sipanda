<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">{{ selectedOpd ? selectedOpd.nama : 'Monitoring OPD' }}</h1>
        <p class="mt-2 text-sm text-slate-500">{{ selectedOpd ? `Kode ${selectedOpd.kode} · ${selectedOpd.kategori || 'Perangkat Daerah'}` : 'Pantau pengiriman dokumen perencanaan seluruh perangkat daerah dan buka arsipnya.' }}</p>
      </div>
      <label v-if="!route.query.opd" class="text-xs font-semibold text-slate-600">Tahun anggaran
        <select v-model="monitoringYear" class="mt-1 block rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">
          <option v-for="option in years" :key="option" :value="option">T.A. {{ option }}</option>
        </select>
      </label>
      <button v-if="!route.query.opd" @click="downloadSummary" class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Unduh Rekap Excel</button>
    </header>

    <div v-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }} <button @click="load" class="ml-2 font-semibold underline">Coba lagi</button></div>
    <div v-if="loading" role="status" class="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500">{{ route.query.opd ? 'Memuat arsip OPD...' : 'Memuat perangkat daerah...' }}</div>
    <template v-else-if="!error || opds.length">
      <template v-if="!selectedOpd">
        <div class="flex flex-wrap items-center justify-between gap-2"><div class="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <button v-for="card in summaryCards" :key="card.key" @click="statusFilter = statusFilter === card.key ? 'Semua' : card.key" class="rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-blue-300" :class="statusFilter === card.key ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'"><span class="block text-xs text-slate-500">{{ card.label }}</span><strong class="mt-1 block text-2xl text-slate-900">{{ card.value }}</strong></button>
        </div><div v-if="selectedOpdIds.length" class="flex items-center gap-3"><label v-if="store.isSuperAdmin" class="inline-flex items-center gap-2 text-xs text-slate-600"><input v-model="forceReminder" type="checkbox"/>Paksa kirim</label><button @click="sendReminder(selectedOpdIds)" class="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white">Kirim Pengingat ({{ selectedOpdIds.length }})</button></div></div>
        <div class="flex flex-wrap gap-3">
          <label class="min-w-64 flex-1"><span class="sr-only">Cari perangkat daerah</span><input v-model="search" placeholder="Cari nama atau kode OPD..." class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm" /></label>
          <label><span class="sr-only">Kategori OPD</span><select v-model="opdCategory" class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"><option value="Semua">Semua kategori OPD</option><option v-for="c in opdCategories" :key="c">{{ c }}</option></select></label>
          <label><span class="sr-only">Status pengiriman</span><select v-model="statusFilter" class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"><option>Semua</option><option>Belum mengirim</option><option>Sebagian</option><option>Lengkap</option><option>Lewat batas waktu</option></select></label>
          <label><span class="sr-only">Verifikator</span><select v-model="verifierFilter" class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"><option value="Semua">Semua verifikator</option><option v-for="name in verifierNames" :key="name">{{ name }}</option></select></label>
          <div class="flex rounded-xl border border-slate-200 bg-white p-1"><button @click="directoryView='table'" class="rounded-lg px-3 py-2 text-xs font-semibold" :class="directoryView==='table'?'bg-blue-50 text-blue-700':'text-slate-500'">Tabel</button><button @click="directoryView='cards'" class="rounded-lg px-3 py-2 text-xs font-semibold" :class="directoryView==='cards'?'bg-blue-50 text-blue-700':'text-slate-500'">Kartu</button></div>
        </div>
        <details v-if="store.isSuperAdmin" class="rounded-xl border border-slate-200 bg-white p-4"><summary class="cursor-pointer text-sm font-semibold text-slate-800">Pengaturan Monitoring</summary><div class="mt-4 grid gap-3 md:grid-cols-2"><label class="text-xs font-semibold text-slate-600">T.A. bawaan<input v-model="monitoringSettings.tahunAnggaranAktif" class="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" inputmode="numeric"/></label><label class="text-xs font-semibold text-slate-600">Batas waktu pengiriman<input v-model="monitoringSettings.batasWaktu" type="date" class="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"/></label><fieldset class="md:col-span-2"><legend class="mb-2 text-xs font-semibold text-slate-600">Dokumen wajib (bawaan = empat item Renja dan lampirannya)</legend><label v-for="item in requiredOptions" :key="item.key" class="mr-4 inline-flex items-center gap-2 py-1 text-xs"><input v-model="monitoringSettings.requiredItems" type="checkbox" :value="item.key"/>{{ item.label }}</label></fieldset><button @click="saveMonitoringSettings" class="w-fit rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white">Simpan Pengaturan</button></div></details>
        <p class="text-xs text-slate-500">Angka terkirim menghitung dokumen berstatus Verifikasi 1, Perlu Revisi, Disetujui Bapperida, atau Final.</p>
        <p v-if="noSubmittedThisYear && alternativeYear" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Belum ada pengiriman pada T.A. {{ monitoringYear }}. Ada {{ alternativeCount }} dokumen terkirim pada T.A. {{ alternativeYear }}. <button @click="monitoringYear=alternativeYear;store.selectedTahun=alternativeYear" class="ml-2 font-bold underline">Lihat T.A. {{ alternativeYear }}</button></p>
        <p v-if="complianceError" role="alert" class="text-xs text-rose-700">{{ complianceError }} <button @click="loadCompliance" class="underline">Coba lagi</button></p>
        <div v-if="directoryView==='cards'" class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="opd in filteredOpds"
            :key="opd.id"
            @click="selectOpd(opd.id)"
            class="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium leading-snug text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span class="flex items-center justify-between gap-3">
              <span class="min-w-0 flex-1">{{ opd.nama }}</span>
              <span class="shrink-0 rounded-lg bg-blue-50 px-2.5 py-2 text-right text-blue-700" :title="ratioTooltip(opd.id)">
                <span class="block text-sm font-bold">{{ submittedRatio(opd.id) }}</span>
                <span class="block text-[10px] font-medium">T.A. {{ monitoringYear }}</span>
              </span>
            </span>
          </button>
        </div>
        <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white"><p v-if="filteredOpds.some(opd => progress(opd.id) < 100)" class="px-3 pt-3 text-xs text-slate-500">Centang OPD yang belum lengkap untuk memilih penerima pengingat massal.</p><table class="w-full min-w-[960px] text-left text-xs"><thead class="bg-slate-50 text-slate-500"><tr><th class="p-3" title="Centang untuk memilih OPD sebagai penerima pengingat massal">Pilih</th><th class="p-3">Perangkat Daerah</th><th class="p-3">Terkirim</th><th class="p-3">Rincian status</th><th class="p-3">Terakhir mengirim</th><th class="p-3">Pengingat terakhir</th><th class="p-3">Verifikator</th><th class="p-3">Aksi</th></tr></thead><tbody class="divide-y divide-slate-100"><tr v-for="opd in filteredOpds" :key="opd.id" class="hover:bg-slate-50"><td class="p-3"><input v-if="progress(opd.id)<100" v-model="selectedOpdIds" type="checkbox" :value="opd.id" :aria-label="`Pilih ${opd.nama} untuk pengingat massal`" title="Pilih untuk pengingat massal"/></td><td class="p-3"><button @click="selectOpd(opd.id)" class="text-left font-semibold text-slate-900 hover:text-blue-700"><span v-if="isOverdue(opd.id)" class="text-amber-500" title="Lewat batas waktu">◷ </span>{{ opd.nama }}</button><p class="mt-1 text-slate-500">{{ opd.kode }} · {{ opd.kategori || 'Perangkat Daerah' }}</p></td><td class="p-3"><strong :title="ratioTooltip(opd.id)">{{ submittedRatio(opd.id) }}</strong><div class="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><span class="block h-full bg-blue-600" :style="{width:`${progress(opd.id)}%`}"/></div></td><td class="p-3"><div class="flex flex-wrap gap-1"><span v-for="item in statusCounts(opd.id)" :key="item.label" class="rounded-full px-2 py-1" :class="item.cls">{{ item.label }} {{ item.count }}</span></div><p v-if="draftCount(opd.id)" class="mt-1 text-[10px] text-slate-400">Draft: {{ draftCount(opd.id) }} (belum dikirim)</p></td><td class="p-3 text-slate-500">{{ lastUpdated(opd.id) }}</td><td class="p-3 text-slate-500">{{ reminderLabel(opd.id) }}</td><td class="p-3 text-slate-600">{{ verifierName(opd.id) }}</td><td class="p-3"><div class="flex gap-2"><button @click="selectOpd(opd.id)" class="rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-700 whitespace-nowrap">Lihat Arsip</button><button v-if="progress(opd.id)<100" @click="sendReminder([opd.id])" class="rounded-lg border px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">Ingatkan</button></div></td></tr></tbody></table><div v-if="!filteredOpds.length" class="p-8 text-center text-sm text-slate-500">Tidak ada OPD sesuai filter. Coba ubah kata pencarian atau pilihan status.</div></div>
        <div v-if="!filteredOpds.length" class="rounded-2xl border border-dashed p-12 text-center text-sm text-slate-500">Tidak ada OPD yang sesuai dengan pencarian atau cakupan akses Anda.</div>
      </template>

      <section v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="border-b border-slate-100 p-5">
          <button @click="selectOpd('')" class="mb-4 text-xs font-semibold text-blue-600">← Kembali ke daftar OPD</button>
          <div class="flex flex-wrap items-center justify-between gap-4"><div><h2 class="text-xl font-bold text-slate-900">{{ selectedOpd.nama }}</h2><p class="mt-1 text-xs text-slate-500">Kode {{ selectedOpd.kode }} · {{ selectedOpd.kategori }} · T.A. {{ year }}</p></div>
          <div class="flex items-center gap-2"><span class="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">{{ submittedRatio(selectedOpd.id) }} terkirim</span><button @click="sendReminder([selectedOpd.id])" class="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700">Kirim Pengingat</button></div>
          </div>
          <p v-if="evaluationsAvailable" class="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500"><span v-for="quarter in [1,2,3,4]" :key="quarter" class="rounded-full border px-2 py-1" :class="evaluationQuarters.includes(quarter)?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-slate-200 bg-slate-50'">TW {{ ['I','II','III','IV'][quarter-1] }} · {{ evaluationQuarters.includes(quarter)?'Terisi':'Kosong' }}</span></p>
          <div class="mt-3 flex flex-wrap items-center gap-1.5"><span v-for="item in statusCounts(selectedOpd.id)" :key="item.label" class="rounded-full px-2 py-1 text-[10px]" :class="item.cls">{{ item.label }} {{ item.count }}</span><span v-if="draftCount(selectedOpd.id)" class="text-[10px] text-slate-400">Draft: {{ draftCount(selectedOpd.id) }} (belum dikirim)</span><span class="ml-1 text-[10px] text-slate-500">Verifikator: {{ verifierName(selectedOpd.id) }}</span></div>
          <nav class="mt-5 flex gap-2 border-b"><button @click="detailTab='history'" class="border-b-2 px-3 py-2 text-sm font-semibold" :class="detailTab==='history'?'border-blue-600 text-blue-700':'border-transparent text-slate-500'">Riwayat Pengiriman</button><button @click="detailTab='final'" class="border-b-2 px-3 py-2 text-sm font-semibold" :class="detailTab==='final'?'border-blue-600 text-blue-700':'border-transparent text-slate-500'">Arsip Final</button></nav>
          <h3 class="mt-5 text-base font-bold text-slate-900">{{ detailTab==='final'?'Arsip Final':'Riwayat Pengiriman' }}</h3>
          <div class="mt-3 flex flex-wrap items-end gap-3">
            <label class="text-xs font-semibold text-slate-600">Tahun anggaran
              <select v-model="year" class="mt-1 block w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">Semua tahun</option><option v-for="option in years" :key="option" :value="option">T.A. {{ option }}</option></select>
            </label>
            <label class="text-xs font-semibold text-slate-600">Jenis dokumen
              <select v-model="documentType" class="mt-1 block w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">Semua jenis dokumen</option>
                <option v-for="type in documentTypes" :key="type" :value="type">{{ type }}</option>
              </select>
            </label>
            <label v-if="detailTab==='history'" class="text-xs font-semibold text-slate-600">Status
              <select v-model="documentStatus" class="mt-1 block w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option>Semua</option><option>Menunggu Verifikasi</option><option>Perlu Revisi</option><option>Disetujui Bapperida</option><option>Final</option></select>
            </label>
          </div>
        </div>
        <div class="overflow-x-auto"><table class="w-full min-w-[900px] text-left text-xs"><thead class="bg-slate-50 text-slate-500"><tr><th class="p-3">Dokumen</th><th class="p-3">T.A.</th><th class="p-3">Tanggal dikirim</th><th class="p-3">Status terkini</th><th class="p-3">Keputusan terakhir</th><th class="p-3">Aksi</th></tr></thead><tbody class="divide-y divide-slate-100"><template v-for="doc in documents" :key="doc.id"><tr><td class="max-w-xs p-3"><button @click="expandedDocId=expandedDocId===doc.id?'':doc.id" class="text-left font-semibold text-slate-900 hover:text-blue-700">{{ doc.judul }}</button><p class="mt-1 text-slate-500">{{ doc.jenis }} · Versi {{ doc.version ?? '—' }}</p><p v-if="detailTab==='final'" class="mt-1 text-slate-500">No. Registrasi {{ doc.nomerRegistrasiArsip||'—' }} · BA/TTE {{ doc.tteNumber||'—' }}</p></td><td class="p-3">{{ doc.tahun }}</td><td class="p-3">{{ detailTab==='final'?(doc.finalizedAt?formatDate(doc.finalizedAt):'—'):(doc.submittedAt?formatDate(doc.submittedAt):'—') }}</td><td class="p-3"><DocumentStatusBadge :status="doc.status"/></td><td class="max-w-[220px] p-3"><span v-if="doc.status==='Perlu Revisi'">Revisi diminta</span><span v-else-if="['Disetujui Bapperida','Final'].includes(doc.status)">Disetujui</span><span v-else>Menunggu keputusan</span><p v-if="doc.catatanRevisi" class="mt-1 truncate text-slate-500" :title="doc.catatanRevisi">{{ doc.catatanRevisi }}</p></td><td class="p-3"><div class="flex gap-2"><button @click="preview(doc)" :disabled="!!busy || !doc.available" class="rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-700 disabled:opacity-40">Buka</button><button v-if="detailTab!=='final'" @click="download(doc)" :disabled="!!busy || !doc.available" class="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white disabled:opacity-40">Unduh</button><template v-else><button @click="downloadFinal(doc,'pdf')" class="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white">PDF</button><button @click="downloadFinal(doc,'docx')" class="rounded-lg border px-3 py-2 font-semibold">DOCX</button></template></div></td></tr><tr v-if="expandedDocId===doc.id"><td colspan="6" class="bg-slate-50 px-5 py-4"><p class="mb-2 font-semibold text-slate-700">Lini masa dokumen</p><ol class="space-y-1"> <li v-for="(event,index) in doc.timeline||[]" :key="index" class="text-slate-600">{{ formatDate(event.waktu) }} · {{ event.dari?`${event.dari} → `:'' }}{{ event.ke }} <span v-if="event.alasan">— {{ event.alasan }}</span></li><li v-for="(event,index) in doc.verifications||[]" :key="`v${index}`" class="text-slate-600">{{ formatDate(event.createdAt) }} · {{ event.status }} · {{ event.verifier?.nama||'Verifikator' }}<span v-if="event.catatanRevisi"> — {{ event.catatanRevisi }}</span></li></ol></td></tr></template></tbody></table></div>
        <div v-if="!documents.length" class="p-12 text-center"><p class="font-semibold text-slate-700">{{ detailTab==='final'?`Belum ada dokumen Final untuk OPD ini pada T.A. ${year==='all'?'yang dipilih':year}`:'Belum ada riwayat pengiriman untuk OPD ini pada filter yang dipilih' }}</p></div>
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
import DocumentStatusBadge from '../components/documents/DocumentStatusBadge.vue';
const store=useAppStore(),route=useRoute(),router=useRouter();
const documentTypes=['Renja Murni','Renja Perubahan','Renstra','Renstra Murni','Renstra Perubahan','Lampiran Perbup Renja','Lampiran Kepbup Perubahan Renja','Lampiran Perbup Renstra'];
const year=ref(/^\d{4}$/.test(String(route.query.tahun))?String(route.query.tahun):'all');
const monitoringYear=ref(store.selectedTahun);
const documentType=ref(''),documentStatus=ref('Semua'),search=ref(''),opdCategory=ref('Semua');
const opds=ref<MonitoringOpd[]>([]),loading=ref(false),error=ref(''),busy=ref('');
const years=computed(()=>[...new Set([...store.availableYears,...opds.value.flatMap(opd=>opd.documents.map(doc=>doc.tahun))])].filter(value=>/^\d{4}$/.test(value)).sort().reverse());
const selectedOpd=computed(()=>opds.value.find(o=>o.id===route.query.opd));
const opdCategories=computed(()=>['Sekretariat dan Dinas','Badan','Kecamatan',...[...new Set(opds.value.map(o=>o.kategori).filter((value): value is string => !!value))].filter(value=>!['Sekretariat dan Dinas','Badan','Kecamatan'].includes(categoryGroup(value)))].filter((value,index,array)=>array.indexOf(value)===index));
const directoryView=ref<'table'|'cards'>('table'),statusFilter=ref('Semua'),verifierFilter=ref('Semua'),detailTab=ref<'history'|'final'>('history');
const verifierNames=computed(()=>[...new Set(complianceOpds.value.flatMap(i=>i.items.map(item=>item.verifierName).filter((name):name is string=>!!name)))].sort());
const filteredOpds=computed(()=>opds.value.filter(o=>{const row=complianceOpds.value.find(i=>i.id===o.id),count=row?.submittedCount||0,total=row?.requiredCount||4,state=count===0?'Belum mengirim':count>=total?'Lengkap':'Sebagian',names=row?.items.map(i=>i.verifierName).filter(Boolean)||[];return (opdCategory.value==='Semua'||categoryGroup(o.kategori)===opdCategory.value)&&`${o.nama} ${o.kode}`.toLowerCase().includes(search.value.trim().toLowerCase())&&(statusFilter.value==='Semua'||statusFilter.value===state||statusFilter.value==='Lewat batas waktu'&&isOverdue(o.id))&&(verifierFilter.value==='Semua'||names.includes(verifierFilter.value));}).sort((a,b)=>(complianceOpds.value.find(i=>i.id===a.id)?.submittedCount||0)-(complianceOpds.value.find(i=>i.id===b.id)?.submittedCount||0)||a.nama.localeCompare(b.nama,'id')));
const documents=computed(()=>selectedOpd.value?.documents.filter(doc=>(detailTab.value==='final'?doc.status==='Final':doc.status!=='Draft')&&(!documentType.value||doc.jenis===documentType.value)&&(detailTab.value==='final'||documentStatus.value==='Semua'||doc.status===documentStatus.value))||[]);
const complianceError=ref('');
const complianceLoading=ref(false);
const complianceOpds=ref<MonitoringItem[]>([]);
const alternativeYear=ref(''),alternativeCount=ref(0);
const selectedOpdIds=ref<string[]>([]);
const expandedDocId=ref('');
const forceReminder=ref(false);
const evaluationsAvailable=ref(false),evaluationQuarters=ref<number[]>([]);
const requiredOptions=[{key:'renjaMurni',label:'Renja Murni T+1'},{key:'lampiranRenjaMurni',label:'Lampiran Perbup Renja T+1'},{key:'renjaPerubahan',label:'Renja Perubahan T'},{key:'lampiranRenjaPerubahan',label:'Lampiran Kepbup Perubahan Renja T'}];
const monitoringSettings=ref<{tahunAnggaranAktif:string;batasWaktu:string|null;requiredItems:string[]}>({tahunAnggaranAktif:String(new Date().getFullYear()),batasWaktu:null,requiredItems:requiredOptions.map(i=>i.key)});
let complianceController:AbortController|undefined;
let alternativeRequestId=0;
const noSubmittedThisYear=computed(()=>complianceOpds.value.length>0&&complianceOpds.value.every(item=>item.submittedCount===0));
function submittedRatio(opdId:string){
 const cached=store.monitoringReport?.tahun===monitoringYear.value?store.monitoringReport.opds:[];
 const opd=complianceOpds.value.find(item=>item.id===opdId)||cached.find(item=>item.id===opdId);
 if(!opd)return '—/4';
 return `${opd.submittedCount}/${opd.requiredCount}`;
}
const summaryCards=computed(()=>{const counts=opds.value.map(o=>complianceOpds.value.find(i=>i.id===o.id)?.submittedCount||0),totals=opds.value.map(o=>complianceOpds.value.find(i=>i.id===o.id)?.requiredCount||4);return [{key:'Semua',label:'Total OPD',value:opds.value.length},{key:'Lengkap',label:'Sudah mengirim lengkap',value:counts.filter((n,i)=>n>=totals[i]).length},{key:'Sebagian',label:'Mengirim sebagian',value:counts.filter((n,i)=>n>0&&n<totals[i]).length},{key:'Belum mengirim',label:'Belum mengirim sama sekali',value:counts.filter(n=>!n).length},{key:'Lewat batas waktu',label:'Lewat batas waktu',value:opds.value.filter(o=>isOverdue(o.id)).length}];});
function ratioTooltip(id:string){return (complianceOpds.value.find(i=>i.id===id)?.items||[]).map(i=>`${i.label}: ${i.documentId&&['Menunggu Verifikasi','Perlu Revisi','Disetujui Bapperida','Final'].includes(i.status)?'terkirim':i.status==='Draft'?'belum dikirim (Draft)':'belum dikirim'}`).join('\n');}
function progress(id:string){const i=complianceOpds.value.find(x=>x.id===id);return i?.requiredCount?Math.round(i.submittedCount/i.requiredCount*100):0;}
function categoryGroup(value:string|null){const normalized=(value||'').toLowerCase();if(normalized.includes('badan'))return 'Badan';if(normalized.includes('kecamatan'))return 'Kecamatan';if(normalized.includes('dinas')||normalized.includes('sekretariat'))return 'Sekretariat dan Dinas';return value||'Perangkat Daerah';}
function statusCounts(id:string){const items=complianceOpds.value.find(x=>x.id===id)?.items||[];return [{label:'Verifikasi 1',count:items.filter(i=>i.status==='Menunggu Verifikasi').length,cls:'bg-amber-50 text-amber-700'},{label:'Perlu Revisi',count:items.filter(i=>i.status==='Perlu Revisi').length,cls:'bg-rose-50 text-rose-700'},{label:'Disetujui Bapperida',count:items.filter(i=>i.status==='Disetujui Bapperida').length,cls:'bg-emerald-50 text-emerald-700'},{label:'Final',count:items.filter(i=>i.status==='Final').length,cls:'bg-emerald-800 text-white'}].filter(i=>i.count);}
function draftCount(id:string){return complianceOpds.value.find(i=>i.id===id)?.items.filter(i=>i.status==='Draft').length||0;}
function lastUpdated(id:string){const dates=(complianceOpds.value.find(i=>i.id===id)?.items||[]).map(i=>i.submittedAt||i.lastUpdatedAt).filter((value):value is string=>!!value).sort();return dates.length?formatDate(dates[dates.length-1]):'Belum ada';}
function verifierName(id:string){const names=[...new Set((complianceOpds.value.find(i=>i.id===id)?.items||[]).map(i=>i.verifierName).filter((value):value is string=>!!value))];return names.join(', ')||'Belum ditugaskan';}
function isOverdue(id:string){const deadline=monitoringSettings.value.batasWaktu;if(!deadline||new Date(`${deadline}T23:59:59`)>=new Date())return false;return progress(id)<100;}
function reminderLabel(id:string){const reminder=opds.value.find(o=>o.id===id)?.lastReminder;if(!reminder?.at)return 'Belum pernah';const days=Math.max(0,Math.floor((Date.now()-new Date(reminder.at).getTime())/86400000)),ago=days===0?'Hari ini':`${days} hari lalu`;return `${ago}${reminder.by?` · ${reminder.by}`:''}`;}
async function sendReminder(ids:string[]){busy.value='reminder';try{const response=await apiFetch('/api/monitoring/reminders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tahun:monitoringYear.value,opdIds:ids,force:store.isSuperAdmin&&forceReminder.value})});const result=await response.json();if(!response.ok)throw Error(result.error||'Pengingat gagal dikirim');store.addToast(`${result.sentCount} pengingat dikirim${result.skippedCount?`, ${result.skippedCount} dilewati karena terkirim dalam 24 jam`:''}`,'success');selectedOpdIds.value=[];forceReminder.value=false;await load();}catch(e){store.addToast(e instanceof Error?e.message:'Pengingat gagal dikirim','error');}finally{busy.value='';}}
function downloadSummary(){const escape=(v:unknown)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');const values=[['Kode OPD','Perangkat Daerah','Kategori','Terkirim','Wajib','Verifikasi 1','Perlu Revisi','Disetujui Bapperida','Final','Draft'],...filteredOpds.value.map(o=>{const row=complianceOpds.value.find(i=>i.id===o.id),items=row?.items||[];return [o.kode,o.nama,o.kategori||'',row?.submittedCount||0,row?.requiredCount||4,...['Menunggu Verifikasi','Perlu Revisi','Disetujui Bapperida','Final','Draft'].map(s=>items.filter(i=>i.status===s).length)];})];const rows=values.map(row=>`<Row>${row.map(value=>`<Cell><Data ss:Type="${typeof value==='number'?'Number':'String'}">${escape(value)}</Data></Cell>`).join('')}</Row>`).join('');const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Monitoring OPD"><Table>${rows}</Table></Worksheet></Workbook>`;const blob=new Blob([xml],{type:'application/vnd.ms-excel;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`rekap-monitoring-opd-${monitoringYear.value}.xls`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
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
async function findAlternativeYear(){
 const requestId=++alternativeRequestId;alternativeYear.value='';alternativeCount.value=0;
 if(!noSubmittedThisYear.value)return;
 const submittedStatuses=['Menunggu Verifikasi','Perlu Revisi','Disetujui Bapperida','Final'];
 const candidates=[...new Set(store.documents.flatMap(doc=>{
  if(!submittedStatuses.includes(doc.status)||doc.parentId||doc.isLampiranOtomatis)return[];
  if(doc.jenis==='Renja Murni')return[String(Number(doc.tahun)-1)];
  if(doc.jenis==='Renja Perubahan')return[doc.tahun];
  return[];
 }).filter(year=>/^\d{4}$/.test(year)&&year!==monitoringYear.value))].sort((a,b)=>Number(b)-Number(a)).slice(0,10);
 const reports=await Promise.all(candidates.map(async year=>{try{const response=await apiFetch(`/api/stats/monitoring?${new URLSearchParams({tahun:year})}`);if(!response.ok)return null;return await response.json() as PlanningComplianceReport;}catch{return null;}}));
 if(requestId!==alternativeRequestId)return;
 const match=reports.filter((report):report is PlanningComplianceReport=>!!report&&report.submittedDocuments>0).sort((a,b)=>b.submittedDocuments-a.submittedDocuments)[0];
 if(match){alternativeYear.value=match.tahun;alternativeCount.value=match.submittedDocuments;}
}
watch([monitoringYear,()=>store.documents.length,()=>opds.value.length,()=>complianceOpds.value.map(item=>item.submittedCount).join(',')],()=>{void findAlternativeYear();});
async function loadMonitoringSettings(){try{const response=await apiFetch('/api/monitoring/settings');if(response.ok){const data=await response.json();monitoringSettings.value={...data,batasWaktu:data.batasWaktu?String(data.batasWaktu).slice(0,10):null};if(!route.query.tahun){monitoringYear.value=data.tahunAnggaranAktif;store.selectedTahun=data.tahunAnggaranAktif;}}}catch{}}
async function saveMonitoringSettings(){try{const response=await apiFetch('/api/monitoring/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(monitoringSettings.value)});const data=await response.json();if(!response.ok)throw Error(data.error||'Gagal menyimpan Pengaturan Monitoring');monitoringSettings.value={...data,batasWaktu:data.batasWaktu?String(data.batasWaktu).slice(0,10):null};monitoringYear.value=data.tahunAnggaranAktif;store.selectedTahun=data.tahunAnggaranAktif;store.addToast('Pengaturan Monitoring tersimpan');}catch(error){store.addToast(error instanceof Error?error.message:'Gagal menyimpan Pengaturan Monitoring','error');}}
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
  if(directoryOnly)archiveParams.set('tahun',monitoringYear.value);else if(year.value!=='all')archiveParams.set('tahun',year.value);
  archiveParams.set('tab',directoryOnly?'history':detailTab.value);
  if(!directoryOnly)archiveParams.set('opdId',String(route.query.opd));
  const archiveUrl=`/api/monitoring/archives${archiveParams.size?`?${archiveParams}`:''}`;
  const url=archiveUrl;
  const response=await apiFetch(url,{signal:request.signal});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Gagal memuat monitoring');
  if(!request.signal.aborted){
   opds.value=Array.isArray(data)?data.map(opd=>({...opd,approvedCount:0,categories:{},documents:[]})):data.opds;
  }
 }catch(e){if(controller===request){error.value=request.signal.aborted?'Pemuatan data terlalu lama. Periksa koneksi lalu pilih Coba lagi.':e instanceof Error?e.message:'Gagal memuat monitoring';}}
 finally{window.clearTimeout(timeout);if(controller===request)loading.value=false;}
}
watch([()=>route.query.opd,year,detailTab,()=>store.currentUser?.id,()=>store.isSuperAdmin],()=>{load();},{immediate:true});
watch(()=>[String(route.query.opd||''),year.value],async([opdId,selectedYear])=>{evaluationsAvailable.value=false;evaluationQuarters.value=[];if(!opdId)return;try{const query=new URLSearchParams({jenis:'renja_pd',opdId,tahun:selectedYear==='all'?monitoringYear.value:selectedYear});const response=await apiFetch(`/api/evaluasi-triwulan?${query}`);if(response.ok){const rows: Array<{triwulan:number}>=await response.json();evaluationQuarters.value=[...new Set(rows.map(row=>row.triwulan))];evaluationsAvailable.value=true;}}catch{/* Optional module; keep its indicators hidden when unavailable. */}},{immediate:true});
void loadMonitoringSettings();
function selectOpd(id:string){
 documentType.value='';documentStatus.value='Semua';year.value='all';detailTab.value='history';
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
async function preview(doc:ArchiveDocument){clearPreview();const generation=previewGeneration;previewTitle.value=doc.judul;previewDialog.value?.showModal();busy.value=`preview:${doc.id}`;try{const url=detailTab.value==='final'?`/api/archives/${doc.id}/export/pdf`:doc.cara==='upload'&&!doc.isLampiranOtomatis?`/api/documents/${doc.id}/source-preview`:`/api/export/pdf/${doc.id}`;const blob=await responseBlob(url);if(generation===previewGeneration)previewUrl.value=URL.createObjectURL(blob);}catch(e){if(generation===previewGeneration)previewDialog.value?.close();store.addToast(e instanceof Error?e.message:'Pratinjau gagal','error');}finally{busy.value='';}}
async function download(doc:ArchiveDocument){busy.value=`download:${doc.id}`;try{const original=doc.cara==='upload'&&!doc.isLampiranOtomatis;const blob=await responseBlob(original?`/api/documents/${doc.id}/source`:`/api/export/pdf/${doc.id}`);const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=original?(doc.fileName||doc.judul):`${doc.judul}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){store.addToast(e instanceof Error?e.message:'Unduhan gagal','error');}finally{busy.value='';}}
async function downloadFinal(doc:ArchiveDocument,format:'pdf'|'docx'){busy.value=`download:${doc.id}:${format}`;try{const blob=await responseBlob(`/api/archives/${doc.id}/export/${format}`),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${doc.judul}.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){store.addToast(e instanceof Error?e.message:'Unduhan arsip final gagal','error');}finally{busy.value='';}}
onUnmounted(()=>{controller?.abort();complianceController?.abort();clearPreview();});
</script>
