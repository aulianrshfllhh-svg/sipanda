<template>
  <div class="p-8 max-w-6xl mx-auto space-y-5">
    <h1 class="text-2xl font-bold">Template Dokumen</h1>
    <p class="text-sm text-slate-600">Template baku berlaku untuk semua tahun. Duplikasikan ke tahun tertentu untuk menyesuaikan nama, judul bab/sub-bab, dan petunjuk isi. Template aktif atau yang sudah dipakai tidak dapat diedit langsung; perubahan berlaku untuk dokumen yang dibuat setelah template diaktifkan.</p>
    <p v-if="error" role="alert" class="p-3 bg-red-50 text-red-700">{{ error }}</p>
    <div class="grid md:grid-cols-[300px_1fr] gap-5">
      <div class="sticky top-20 max-h-[calc(100vh-6rem)] self-start space-y-2 overflow-y-auto pr-1">
        <button v-for="item in templates" :key="item.id" @click="select(item)" class="block w-full p-3 rounded border text-left" :class="selected?.id===item.id?'border-blue-600 bg-blue-50':'bg-white'">
          <strong>{{ item.nama }}</strong><span class="block text-xs">{{ item.jenis }} · {{ item.tahun || 'Semua periode' }} · Versi {{ item.versi }} · {{ item.isActive?'Aktif':'Draft / Arsip' }}</span>
        </button>
      </div>
      <section v-if="selected" class="bg-white rounded-xl p-5 space-y-4 border">
        <div class="flex gap-3 items-end flex-wrap">
          <label>Nama template<input v-model="selected.nama" :disabled="selected.isActive || busy" class="block border p-2 rounded" /></label>
          <label>Tahun salinan<input v-model="copyYear" type="number" min="2000" max="2100" class="block border p-2 rounded w-28" /></label>
          <button @click="duplicate" :disabled="busy" class="bg-blue-600 text-white p-2 rounded">Duplikasikan</button>
        </div>
        <p class="text-xs text-slate-500">Pada template Draft / Arsip, nama, judul bab, kode dan judul sub-bab, serta petunjuk isi dapat diedit. Variabel: {opd}, {tahun}, {evaluasi} (tahun − 2), {maju} (tahun + 1).</p>
        <fieldset :disabled="selected.isActive || busy" class="space-y-3">
          <div v-for="(bab,i) in selected.sections" :key="bab.id" class="border rounded p-3 space-y-2">
            <div class="flex gap-2"><input v-model="bab.title" class="border p-2 flex-1 font-bold" aria-label="Judul bab"/><button type="button" @click="selected.sections.splice(i,1)" class="text-red-700">Hapus bab</button></div>
            <div v-for="(sub,j) in bab.subsections" :key="sub.id" class="border-l-2 pl-3 space-y-1">
              <div class="flex gap-2"><input v-model="sub.code" class="border p-1 w-16" aria-label="Kode sub-bab"/><input v-model="sub.title" class="border p-1 flex-1" aria-label="Judul sub-bab"/><button type="button" @click="bab.subsections.splice(j,1)" class="text-red-700">Hapus</button></div>
              <label class="block text-xs font-medium text-slate-600">Petunjuk isi sub-bab<textarea :value="plainText(sub.content)" @input="setInstruction(sub,$event)" class="mt-1 w-full border p-2 text-sm" aria-label="Petunjuk isi sub-bab"></textarea></label>
            </div>
            <button type="button" @click="addSub(bab,Number(i))" class="text-blue-700">+ Sub-bab</button>
          </div>
          <button type="button" @click="addBab" class="border rounded p-2">+ Bab</button>
        </fieldset>
        <div class="flex gap-3">
          <button v-if="!selected.isActive" @click="save" :disabled="busy" class="bg-blue-600 text-white p-2 rounded">Simpan struktur</button>
          <button v-if="!selected.isActive" @click="activate" :disabled="busy" class="bg-emerald-700 text-white p-2 rounded">Simpan dan aktifkan tahun {{ selected.tahun }}</button>
          <span v-else class="text-emerald-700">Template aktif — duplikasikan untuk mengubah struktur.</span>
          <button v-if="!selected.isActive" type="button" @click="removeTemplate" :disabled="busy" class="ml-auto rounded border border-red-200 px-3 py-2 text-red-700 hover:bg-red-50 disabled:opacity-50">Hapus template</button>
        </div>
      </section>
    </div>
  </div>
</template>
<script setup lang="ts">
import {ref,onMounted} from 'vue';
import {apiFetch} from '../lib/api';
import {useAppStore} from '../stores/appStore';
const store=useAppStore();
const templates=ref<any[]>([]), selected=ref<any>(null), copyYear=ref('2027'), error=ref(''), busy=ref(false);
async function request(url:string,method='GET',body?:unknown) {
 const r=await apiFetch(url,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const responseText=await r.text();
 let data:any=null;
 if(responseText){try{data=JSON.parse(responseText);}catch{
  const message=r.status===404
   ? 'Rute tidak ditemukan. Mulai ulang backend SIPANDA agar fitur terbaru tersedia.'
   : `Server mengirim respons yang tidak dikenali (HTTP ${r.status}). Coba muat ulang halaman.`;
  throw new Error(message);
 }}
 if(!r.ok) throw new Error(data?.error||`Permintaan gagal (HTTP ${r.status})`);
 return data;
}
async function load(){templates.value=await request('/api/templates');}
function select(item:any){selected.value=JSON.parse(JSON.stringify(item));copyYear.value=item.tahun||store.selectedTahun;error.value='';}
function plainText(html:string){return new DOMParser().parseFromString(html,'text/html').body.textContent||'';}
function setInstruction(sub:any,event:Event){const p=document.createElement('p');p.textContent=(event.target as HTMLTextAreaElement).value;sub.content=p.outerHTML;}
function addBab(){const n=selected.value.sections.length+1;selected.value.sections.push({id:crypto.randomUUID(),title:`BAB ${n}`,order:n,locked:true,subsections:[]});}
function addSub(bab:any,i:number){bab.subsections.push({id:crypto.randomUUID(),code:`${i+1}.${bab.subsections.length+1}`,title:'Sub-bab baru',locked:true,content:'<p>Petunjuk: isi bagian ini.</p>'});}
async function run(fn:()=>Promise<void>){error.value='';busy.value=true;try{await fn();}catch(e:any){error.value=e.message;}finally{busy.value=false;}}
async function duplicate(){await run(async()=>{const item=await request(`/api/templates/${selected.value.id}/duplicate`,'POST',{tahun:copyYear.value});await load();select(item);});}
async function save(){await run(async()=>{selected.value=await request(`/api/templates/${selected.value.id}`,'PUT',selected.value);await load();store.addToast('Struktur template disimpan');});}
async function activate(){await run(async()=>{await request(`/api/templates/${selected.value.id}`,'PUT',selected.value);await request(`/api/templates/${selected.value.id}/activate`,'POST');await load();select(templates.value.find(t=>t.id===selected.value.id));store.addToast('Template diaktifkan');});}
async function removeTemplate(){
 const item=selected.value;
 if(!item || item.isActive || !window.confirm(`Hapus template "${item.nama}"? Penghapusan ini tidak dapat dibatalkan.`)) return;
 await run(async()=>{
  await request(`/api/templates/${item.id}`,'DELETE');
  await load();
  selected.value=templates.value[0]?JSON.parse(JSON.stringify(templates.value[0])):null;
  if(selected.value) copyYear.value=selected.value.tahun;
  store.addToast('Template dihapus');
 });
}
onMounted(()=>run(load));
</script>

