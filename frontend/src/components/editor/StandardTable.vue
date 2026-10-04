<template>
 <div class="my-4 border rounded p-3 bg-white">
  <p class="font-bold text-sm mb-2">{{ caption }}</p>
  <div class="overflow-x-auto">
   <table class="w-full border-collapse text-xs">
    <thead><tr><th v-if="editable && table.type==='renja'">Tingkat</th><th v-for="(column,i) in columns" :key="i" class="border p-2 bg-slate-100 min-w-28">{{ column }}</th><th v-if="editable">Aksi</th></tr></thead>
    <tbody><tr v-for="(row,i) in calculated.rows" :key="i" :class="row.aggregate?'bg-blue-50 font-bold':''">
     <td v-if="editable && table.type==='renja'"><select :value="row.level" @change="level(i,$event)" class="p-1 border"><option value="urusan">Urusan</option><option value="program">Program</option><option value="kegiatan">Kegiatan</option><option value="subkegiatan">Sub Kegiatan</option></select></td>
     <td v-for="(cell,j) in row.cells" :key="j" class="border align-top p-1">
      <textarea v-if="editable && !(row.aggregate && table.type==='renja' && [5,9].includes(j))" :value="cell" @change="update(i,j,$event)" class="w-full min-w-24 min-h-16 p-1" :aria-label="columns[j]"></textarea>
      <span v-else>{{ cell }}</span>
     </td>
     <td v-if="editable"><button @click="remove(i)" class="text-red-700">Hapus</button></td>
    </tr></tbody>
    <tfoot v-if="table.type==='renja'"><tr><td :colspan="(editable?1:0)+5" class="border p-2 font-bold">JUMLAH</td><td class="border p-2">{{ calculated.total.toLocaleString('id-ID') }}</td><td colspan="3"></td><td class="border p-2">{{ calculated.totalMaju.toLocaleString('id-ID') }}</td></tr></tfoot>
   </table>
  </div>
  <div v-if="editable" class="flex gap-3 mt-3 text-xs items-center flex-wrap">
   <button @click="add" class="border p-2 rounded">+ Baris</button>
   <label class="border p-2 rounded cursor-pointer">Impor Excel/CSV<input type="file" accept=".xlsx,.csv" class="hidden" @change="importFile"/></label>
   <button @click="downloadExample" class="text-blue-700">Unduh format CSV</button>
   <button @click="$emit('remove')" class="text-red-700">Hapus tabel</button>
   <span>Impor menambahkan baris; gunakan urutan kolom pada format CSV.</span>
  </div>
  <p v-if="error" role="alert" class="text-red-700 text-xs mt-2">{{ error }}</p>
 </div>
</template>
<script setup lang="ts">
import {computed,ref} from 'vue';
import {tableColumns,calculatedRows,normalizeTable} from '../../../../shared/document-tables.js';
import {apiFetch} from '../../lib/api';
const props=defineProps<{table:any;tahun:string;caption:string;editable:boolean}>();
const emit=defineEmits(['update','remove']); const error=ref('');
const columns=computed(()=>tableColumns(props.table.type,props.tahun));
const calculated=computed(()=>calculatedRows(props.table));
function change(fn:(t:any)=>void){const t=JSON.parse(JSON.stringify(props.table));try{fn(t);emit('update',normalizeTable(t));error.value='';}catch(e:any){error.value=e.message;}}
function update(i:number,j:number,e:Event){change(t=>t.rows[i].cells[j]=(e.target as HTMLTextAreaElement).value);}
function level(i:number,e:Event){change(t=>t.rows[i].level=(e.target as HTMLSelectElement).value);}
function add(){change(t=>t.rows.push({level:t.type==='renja'?'subkegiatan':'baris',cells:columns.value.map(()=> '')}));}
function remove(i:number){change(t=>t.rows.splice(i,1));}
async function importFile(e:Event){const input=e.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;try{const f=new FormData();f.append('file',file);f.append('type',props.table.type);const r=await apiFetch('/api/document-tables/import',{method:'POST',body:f});const data=await r.json();if(!r.ok)throw new Error(data.error);change(t=>t.rows.push(...data.rows));}catch(e:any){error.value=e.message;}finally{input.value='';}}
function downloadExample(){const quote=(s:string)=>`"${s.replaceAll('"','""')}"`;const headers=props.table.type==='renja'?['Tingkat',...columns.value]:columns.value;const blob=new Blob(['\uFEFF'+headers.map(quote).join(';')+'\r\n'],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`format-${props.table.type}.csv`;a.click();URL.revokeObjectURL(a.href);}
</script>
