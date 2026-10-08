<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="image-dialog-title" @keydown.esc="!busy && $emit('close')">
    <form @submit.prevent="confirm" class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border bg-white p-5 text-xs text-slate-900 shadow-xl">
      <h3 id="image-dialog-title" class="mb-2 text-base font-bold">{{ editing ? 'Atur gambar dan caption' : 'Sisipkan gambar dengan caption' }}</h3>
      <p class="mb-3 text-slate-700">PNG/JPG/WebP maksimum 10 MB. Gambar dikompresi otomatis; proporsi tetap dijaga.</p>
      <label class="block mb-3">Unggah gambar <input :disabled="busy" type="file" accept="image/png,image/jpeg,image/webp" @change="loadFile" class="mt-1 block w-full" /></label>
      <div class="flex gap-2 mb-3"><input v-model="url" :disabled="busy" aria-label="Alamat gambar" placeholder="https://alamat-gambar" type="url" class="min-w-0 flex-1 rounded border border-slate-400 p-2" /><button type="button" :disabled="busy || !url" @click="loadUrl" class="rounded border p-2">Muat URL</button></div>
      <label class="block mb-3">Judul / keterangan gambar (wajib)<input v-model="title" :disabled="busy" required maxlength="300" autofocus aria-label="Caption gambar" class="mt-1 block w-full rounded border border-slate-400 p-2" /></label>
      <div class="flex flex-wrap gap-3 mb-3">
        <label>Lebar (% area cetak)<input v-model.number="width" :disabled="busy" type="number" min="5" max="100" required aria-label="Lebar gambar" class="mt-1 block w-24 rounded border p-2" /></label>
        <label>Perataan<select v-model="alignment" :disabled="busy" aria-label="Perataan gambar" class="mt-1 block rounded border p-2"><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></label>
        <label>Penempatan<select v-model="placement" :disabled="busy" aria-label="Penempatan gambar" class="mt-1 block rounded border p-2"><option value="block">Baris tersendiri</option><option value="inline">Sejajar teks</option></select></label>
      </div>
      <fieldset :disabled="busy" class="mb-3 rounded border p-3"><legend>Pangkas sederhana (% tiap sisi)</legend><div class="flex flex-wrap gap-2"><label v-for="side in cropSides" :key="side.key">{{ side.label }}<input v-model.number="crop[side.key]" type="number" min="0" max="90" :aria-label="`Pangkas ${side.label.toLowerCase()}`" class="mt-1 block w-20 rounded border p-2" /></label></div><button type="button" @click="Object.assign(crop,{left:0,top:0,right:0,bottom:0})" class="mt-2 underline">Batalkan pangkas</button></fieldset>
      <div v-if="image" class="mb-3 overflow-hidden rounded border bg-slate-100 p-3"><canvas ref="preview" class="mx-auto max-h-48 max-w-full" aria-label="Pratinjau hasil pangkas"></canvas><p class="mt-2">{{ image.naturalWidth }} × {{ image.naturalHeight }} piksel · lebar tampilan {{ width }}%</p></div>
      <p v-if="error" role="alert" class="mb-3 rounded bg-red-50 p-2 text-red-900">{{ error }}</p>
      <p v-if="busy" role="status" class="mb-3">Memproses gambar…</p>
      <div class="flex justify-end gap-2"><button type="button" :disabled="busy" @click="$emit('close')" class="rounded border px-3 py-2">Batal</button><button :disabled="busy || !image || !title.trim()" class="rounded bg-blue-800 px-3 py-2 font-semibold text-white disabled:opacity-50">{{ editing ? 'Simpan gambar' : 'Sisipkan gambar' }}</button></div>
    </form>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, shallowRef, watch, nextTick } from 'vue';
import { imageBlobData, decodeImage, drawImagePreview, processImage, IMAGE_FILE_LIMIT, type ImageCrop } from './image-processing';
const props=defineProps<{ source: string; caption: string; initialWidth: number; initialAlignment: string; initialPlacement: string; editing: boolean }>();
const emit=defineEmits<{ close: []; confirm: [result: {source:string;caption:string;width:number;alignment:string;placement:string;naturalWidth:number;naturalHeight:number;inputBytes:number;outputBytes:number}] }>();
const source=ref(props.source),title=ref(props.caption),width=ref(props.initialWidth),alignment=ref(props.initialAlignment),placement=ref(props.initialPlacement),url=ref(''),busy=ref(false),error=ref('');
const image=shallowRef<HTMLImageElement>(),preview=ref<HTMLCanvasElement>();
watch(()=>props.source,value=>{source.value=value;});
const crop=reactive<ImageCrop>({left:0,top:0,right:0,bottom:0});
const cropSides:Array<{key:keyof ImageCrop;label:string}>=[{key:'left',label:'Kiri'},{key:'top',label:'Atas'},{key:'right',label:'Kanan'},{key:'bottom',label:'Bawah'}];
async function updatePreview(){if(!image.value)return;await nextTick();try{if(preview.value)drawImagePreview(image.value,crop,preview.value);error.value='';}catch(e:any){error.value=e.message;}}
watch(crop,()=>void updatePreview());
watch(source,async value=>{if(!value)return;if(/^https?:\/\//i.test(value)){url.value=value;await loadUrl();return;}try{image.value=await decodeImage(value);Object.assign(crop,{left:0,top:0,right:0,bottom:0});await updatePreview();}catch(e:any){image.value=undefined;error.value=e.message;}},{immediate:true});
async function loadFile(event:Event){const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;busy.value=true;try{source.value=await imageBlobData(file);}catch(e:any){error.value=e.message;}finally{busy.value=false;input.value='';}}
async function loadUrl(){busy.value=true;error.value='';try{if(!/^https?:\/\//i.test(url.value))throw new Error('Gunakan alamat HTTP/HTTPS gambar.');const response=await fetch(url.value,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Gambar tidak dapat dimuat dari alamat tersebut.');if(Number(response.headers.get('content-length'))>IMAGE_FILE_LIMIT)throw new Error('Ukuran gambar melebihi 10 MB.');source.value=await imageBlobData(await response.blob());}catch(e:any){error.value=e.name==='TimeoutError'?'Gambar terlalu lama dimuat. Unggah berkas lokal.':e.message;}finally{busy.value=false;}}
async function confirm(){busy.value=true;error.value='';try{if(!title.value.trim())throw new Error('Caption gambar wajib diisi.');if(!Number.isFinite(width.value)||width.value<5||width.value>100)throw new Error('Lebar gambar harus 5 sampai 100 persen area cetak.');const result=await processImage(source.value,crop);emit('confirm',{source:result.data,caption:title.value.trim(),width:width.value,alignment:alignment.value,placement:placement.value,naturalWidth:result.width,naturalHeight:result.height,inputBytes:result.inputBytes,outputBytes:result.outputBytes});}catch(e:any){error.value=e.message;}finally{busy.value=false;}}
</script>
