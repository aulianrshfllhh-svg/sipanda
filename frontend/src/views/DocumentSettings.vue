<template>
 <div class="mx-auto max-w-4xl space-y-6">
  <header>
   <h1 class="text-2xl font-bold text-slate-900">Pengaturan Dokumen</h1>
   <p class="mt-1 text-sm text-slate-600">Atur standar penulisan dan identitas yang digunakan pada dokumen perencanaan.</p>
  </header>
  <section class="rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
   <h2 class="font-semibold text-slate-900">Standar Dokumen</h2>
   <p class="mt-1 text-sm text-slate-500">Acuan format dokumen perencanaan daerah.</p>
   <dl class="mt-5 grid gap-4 sm:grid-cols-2">
    <div class="rounded-lg bg-slate-50 p-4">
     <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Dasar hukum</dt>
     <dd class="mt-2 text-sm font-medium text-slate-800">Permendagri Nomor 86 Tahun 2017 dan peraturan daerah yang berlaku</dd>
    </div>
    <div class="rounded-lg bg-slate-50 p-4">
     <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Font dan spasi</dt>
     <dd class="mt-2 text-sm font-medium text-slate-800">Bookman Old Style atau Times New Roman, 12 pt, spasi 1,5</dd>
    </div>
    <div class="rounded-lg bg-slate-50 p-4 sm:col-span-2">
     <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Margin kertas A4</dt>
     <dd class="mt-2 text-sm font-medium text-slate-800">Atas, kanan, bawah, dan kiri masing-masing 2 cm</dd>
    </div>
   </dl>
  </section>
  <section class="space-y-4">
  <div>
   <h2 class="font-semibold text-slate-900">Identitas Dokumen</h2>
   <p class="mt-1 text-sm text-slate-600">Identitas ini mengisi sampul dan blok tanda tangan dokumen.</p>
  </div>
  <select v-if="store.isSuperAdmin" v-model="opdId" @change="load" class="border p-2 w-full"><option v-for="opd in store.opds" :key="opd.id" :value="opd.id">{{ opd.nama }}</option></select>
  <p v-if="loading" role="status" class="text-sm text-slate-500">Memuat identitas dokumen...</p>
  <div v-else-if="error" role="alert" class="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
   <span>{{ error }}</span>
   <button type="button" @click="load" class="shrink-0 font-semibold underline">Coba lagi</button>
  </div>
  <form v-if="settings" @submit.prevent="save" class="bg-white border p-6 rounded-xl space-y-5">
   <fieldset :disabled="!canEdit || busy" class="grid grid-cols-2 gap-4">
    <label v-for="(label,key) in labels" :key="key" class="text-sm">{{ label }}<input v-model="settings.opd[key]" class="block w-full border rounded p-2 mt-1"/></label>
   </fieldset>
   <fieldset v-if="store.isSuperAdmin" :disabled="busy" class="grid grid-cols-2 gap-4 border-t pt-4">
    <label class="text-sm">Nama resmi OPD
     <input v-model="settings.opdRecord.nama" maxlength="200" required class="block w-full border rounded p-2 mt-1"/>
    </label>
    <label class="text-sm">Nomor lampiran (angka Romawi)
     <input v-model="settings.opdRecord.nomorLampiran" maxlength="20" required pattern="[IVXLCDMivxlcdm]+" class="block w-full border rounded p-2 mt-1"/>
    </label>
   </fieldset>
   <fieldset v-if="store.isSuperAdmin" :disabled="busy" class="grid grid-cols-2 gap-4 border-t pt-4">
    <label>Nama Bupati<input v-model="settings.global.bupati" class="block border p-2 w-full"/></label>
    <label>Nama Sekretaris Daerah<input v-model="settings.global.sekretarisDaerah" class="block border p-2 w-full"/></label>
    <div class="sm:col-span-2">
     <label for="cover-logo" class="text-sm font-medium">Logo Kabupaten Cirebon untuk cover (PNG transparan, tinggi minimal 472 piksel)</label>
     <input id="cover-logo" type="file" accept="image/png,.png" :disabled="busy" class="mt-2 block w-full text-sm" @change="selectLogo" />
     <p v-if="logoError" role="alert" class="mt-2 text-sm text-red-700">{{ logoError }}</p>
     <div v-if="settings.global.logoData" class="mt-3 flex items-center gap-3">
      <img :src="settings.global.logoData" alt="Pratinjau logo cover" class="h-20 w-auto object-contain" />
      <span class="text-xs text-emerald-700">Logo tersimpan dan akan disematkan pada cover hasil ekspor.</span>
     </div>
     <p v-else class="mt-2 text-xs text-amber-800">Logo belum diunggah. Ekspor dokumen template dengan cover akan dinonaktifkan.</p>
    </div>
   </fieldset>
   <button v-if="canEdit" :disabled="busy" class="bg-blue-600 text-white rounded px-5 py-2">Simpan pengaturan</button>
  </form>
  </section>
 </div>
</template>
<script setup lang="ts">
import {ref,computed,onMounted} from 'vue';
import {useAppStore} from '../stores/appStore';
import {apiFetch} from '../lib/api';
const store=useAppStore(),opdId=ref(store.currentUser?.opdId||'bapperida'),settings=ref<any>(null),error=ref(''),logoError=ref(''),busy=ref(false),loading=ref(false);
const canEdit=computed(()=>store.isSuperAdmin || (store.isOpd && store.currentUser?.opdId===opdId.value));
const labels={alamat:'Alamat OPD',jabatan:'Jabatan pimpinan',pimpinan:'Nama pimpinan',pangkat:'Pangkat',nip:'NIP',tempat:'Tempat tanda tangan',bulan:'Bulan dan tahun tanda tangan'};
async function load(){
 loading.value=true;
 error.value='';
 settings.value=null;
 try{
  if(!store.currentUser)await store.fetchCurrentUser();
  const user=store.currentUser;
  if(!user)throw new Error('Sesi pengguna tidak ditemukan. Silakan masuk kembali.');
  if(!store.isSuperAdmin){
   if(!user.opdId)throw new Error('Akun ini belum terhubung ke OPD.');
   opdId.value=user.opdId;
  }
  const response=await apiFetch(`/api/document-settings/${opdId.value}`);
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||`Gagal memuat pengaturan (HTTP ${response.status})`);
  settings.value=data;
 }catch(e){
  error.value=e instanceof Error?e.message:'Terjadi kesalahan saat memuat pengaturan dokumen.';
 }finally{
  loading.value=false;
 }
}
async function selectLogo(event:Event){
 logoError.value='';
 const input=event.target as HTMLInputElement,file=input.files?.[0];
 if(!file)return;
 if(file.type!=='image/png'||file.size>10*1024*1024){logoError.value='Pilih berkas PNG transparan dengan ukuran maksimal 10 MB.';input.value='';return;}
 try{
  const image=await createImageBitmap(file);
  if(image.height<472||image.width<200){image.close();throw new Error('Resolusi logo harus minimal 300 dpi pada tinggi cetak 4 cm (minimal 472 piksel).');}
  image.close();
  settings.value.global.logoData=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('Berkas logo tidak dapat dibaca.'));reader.onerror=()=>reject(new Error('Berkas logo tidak dapat dibaca.'));reader.readAsDataURL(file);});
 }catch(e){logoError.value=e instanceof Error?e.message:'Berkas logo tidak valid.';input.value='';}
}
async function save(){busy.value=true;error.value='';try{const r=await apiFetch(`/api/document-settings/${opdId.value}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings.value)});const d=await r.json();if(!r.ok)throw new Error(d.error);settings.value=d;const opdIndex=store.opds.findIndex(opd=>opd.id===d.opdRecord.id);if(opdIndex>=0)store.opds[opdIndex]={...store.opds[opdIndex],...d.opdRecord};store.addToast('Pengaturan dokumen disimpan');}catch(e:any){error.value=e.message;}finally{busy.value=false;}}
onMounted(load);
</script>
