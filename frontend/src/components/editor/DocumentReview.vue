<template>
 <aside class="fixed right-3 top-24 bottom-4 z-50 w-[440px] max-w-[95vw] overflow-auto rounded-xl border bg-white shadow-xl p-4 text-sm" aria-label="Komentar dan riwayat">
  <div class="flex justify-between"><h2 class="font-bold">Komentar dan riwayat</h2><button @click="$emit('close')">Tutup</button></div>
  <p v-if="error" role="alert" class="text-red-700 my-2">{{ error }}</p>
  <h3 class="font-semibold mt-4">Komentar Terbuka: {{ threads.filter(t=>!t.resolved).length }}</h3>
  <form v-if="target&&!document.isLampiranOtomatis" @submit.prevent="postComment()" class="my-3"><p class="text-xs bg-slate-50 p-2">{{ target.quote || 'Tabel yang dipilih' }}</p><textarea v-model="body" required maxlength="10000" class="border w-full p-2 mt-2" aria-label="Komentar baru"/><button :disabled="busy" class="border rounded p-2">Kirim komentar</button></form>
  <p v-else class="text-xs my-2">Pilih paragraf atau tabel di kanvas, lalu tekan Komentar / Riwayat untuk memberi komentar.</p>
  <article v-for="thread in threads" :key="thread.id" class="border rounded p-3 my-3" :class="thread.resolved?'bg-slate-50':'border-amber-300'">
   <p class="text-xs font-semibold">{{ thread.user_name }} · {{ thread.resolved?'Selesai':'Terbuka' }}</p><button @click="$emit('jump',thread.target)" class="text-blue-700 underline text-xs">Lihat lokasi</button><p class="whitespace-pre-wrap my-2">{{ thread.body }}</p>
   <p v-for="reply in comments.filter(c=>c.parent_id===thread.id)" :key="reply.id" class="border-l-2 pl-3 my-2 whitespace-pre-wrap"><span class="text-xs font-bold block">{{ reply.user_name }}</span>{{ reply.body }}</p>
   <form v-if="!document.isLampiranOtomatis" @submit.prevent="postComment(thread.id)"><input v-model="replies[thread.id]" required maxlength="10000" class="border rounded p-2 w-full" aria-label="Balasan komentar"/><div class="flex gap-3 mt-2"><button :disabled="busy" class="text-blue-700">Balas</button><button type="button" @click="resolve(thread)" :disabled="busy">{{ thread.resolved?'Buka kembali':'Tandai Selesai' }}</button></div></form>
  </article>
  <h3 class="font-semibold mt-5">Riwayat pengajuan</h3><p v-if="!versions.length" class="text-xs">Belum ada versi pengajuan tersimpan.</p>
  <div class="flex gap-2 my-2"><select v-model="left" class="border p-2 min-w-0" aria-label="Versi sebelumnya"><option value="">Versi awal</option><option v-for="v in versions" :key="v.id" :value="v.id">Versi {{ v.versi }}</option></select><select v-model="right" class="border p-2 min-w-0" aria-label="Versi berikutnya"><option value="">Versi pembanding</option><option v-for="v in versions" :key="v.id" :value="v.id">Versi {{ v.versi }}</option></select><button @click="compare" :disabled="!left||!right||busy">Bandingkan</button></div>
  <p v-for="v in versions" :key="v.id" class="text-xs my-2">Versi {{ v.versi }} · {{ v.savedBy }} · {{ new Date(v.createdAt).toLocaleString('id-ID') }} <button @click="openVersion(v.id)" class="text-blue-700 underline">Buka versi</button></p>
  <div v-for="item in changes" :key="item.id" class="border rounded p-2 my-2" :class="item.status==='unchanged'?'border-slate-200':'border-amber-500 bg-amber-50'"><p class="font-semibold">{{ item.title }} · {{ statusLabels[item.status] }}</p><div v-if="item.status!=='unchanged'" class="grid grid-cols-2 gap-2 mt-2"><pre class="whitespace-pre-wrap text-xs max-h-64 overflow-auto bg-red-50 p-2">{{ text(item.before) }}</pre><pre class="whitespace-pre-wrap text-xs max-h-64 overflow-auto bg-green-50 p-2">{{ text(item.after) }}</pre></div></div>
 </aside>
</template>
<script setup lang="ts">
import {ref,computed,onMounted} from 'vue';
import {apiFetch} from '../../lib/api';
import {compareDocumentVersions} from '../../../../shared/document-history.js';
const props=defineProps<{document:any;target:any}>();const emit=defineEmits(['close','jump','open-versions','open-count']);
const comments=ref<any[]>([]),versions=ref<any[]>([]),replies=ref<Record<string,string>>({}),body=ref(''),error=ref(''),busy=ref(false),left=ref(''),right=ref(''),changes=ref<any[]>([]);
const statusLabels:Record<string,string>={added:'Ditambahkan',removed:'Dihapus',changed:'Berubah',unchanged:'Tetap'};
const threads=computed(()=>comments.value.filter(c=>!c.parent_id));
async function request(path:string,init?:RequestInit){const response=await apiFetch(`/api/documents/${props.document.id}${path}`,init);const result=await response.json();if(!response.ok)throw new Error(result.error);return result;}
async function load(){try{[comments.value,versions.value]=await Promise.all([request('/comments'),request('/versions')]);emit('open-count',threads.value.filter(t=>!t.resolved).length);}catch(e:any){error.value=e.message;}}
async function postComment(parentId?:string){busy.value=true;error.value='';try{await request('/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:parentId?replies.value[parentId]:body.value,parentId,target:props.target})});body.value='';if(parentId)replies.value[parentId]='';await load();}catch(e:any){error.value=e.message;}finally{busy.value=false;}}
async function resolve(thread:any){try{await request(`/comments/${thread.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({resolved:!thread.resolved})});await load();}catch(e:any){error.value=e.message;}}
async function compare(){try{busy.value=true;const [a,b]=await Promise.all([request(`/versions/${left.value}`),request(`/versions/${right.value}`)]);changes.value=compareDocumentVersions(a.sections,b.sections);}catch(e:any){error.value=e.message;}finally{busy.value=false;}}
async function openVersion(id:string){try{const version=await request(`/versions/${id}`);changes.value=compareDocumentVersions(version.sections,version.sections);if(version.sections.sourceArchive){const response=await apiFetch(`/api/documents/${props.document.id}/versions/${id}/source`);if(!response.ok)throw new Error('Berkas versi tidak tersedia');const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download=version.sections.sourceArchive.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}else emit('open-versions',version.id);}catch(e:any){error.value=e.message;}}
function text(value:any){return value?new DOMParser().parseFromString(value.content||'','text/html').body.textContent+'\n'+(value.tables?.length?JSON.stringify(value.tables):''):'—';}
onMounted(load);
</script>
