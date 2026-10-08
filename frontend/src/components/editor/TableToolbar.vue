<template>
  <div class="editor-table-toolbar shrink-0 flex flex-wrap items-center gap-1.5 border-b border-blue-200 bg-blue-50 p-2 text-xs text-blue-950 no-print" aria-label="Toolbar tabel">
    <strong class="mr-2">Tabel · {{ rows }} baris × {{ columns }} kolom</strong>
    <button v-for="item in actions" :key="item.action" @mousedown.prevent @click="$emit('action', item.action)" class="rounded border border-blue-300 bg-white px-2 py-1.5 hover:bg-blue-100">{{ item.label }}</button>
    <button @mousedown.prevent @click="$emit('action', 'tidy')" class="rounded bg-blue-800 px-2 py-1.5 font-semibold text-white">Rapikan Tabel</button>
    <button v-for="align in horizontal" :key="align.value" @mousedown.prevent @click="$emit('action','align',align.value)" class="rounded border border-blue-300 bg-white px-2 py-1.5">{{ align.label }}</button>
    <button v-for="align in vertical" :key="align.value" @mousedown.prevent @click="$emit('action','vertical',align.value)" class="rounded border border-blue-300 bg-white px-2 py-1.5">{{ align.label }}</button>
    <label class="flex items-center gap-1">Lebar kolom (%) <input v-model="width" type="number" min="2" max="95" class="w-16 rounded border border-blue-300 p-1.5" /></label>
    <button @mousedown.prevent @click="$emit('action','width',String(width))" class="rounded border border-blue-300 bg-white px-2 py-1.5">Terapkan lebar</button>
    <button @mousedown.prevent @click="$emit('action','auto')" class="rounded border border-blue-300 bg-white px-2 py-1.5">Sesuaikan lebar otomatis</button>
    <button @mousedown.prevent @click="$emit('action','fit')" class="rounded border border-blue-300 bg-white px-2 py-1.5">Sesuaikan ke lebar halaman</button>
    <button @mousedown.prevent @click="$emit('action','transpose')" class="rounded border border-blue-300 bg-white px-2 py-1.5">Tukar baris-kolom</button>
    <button @mousedown.prevent @click="$emit('landscape')" class="rounded border border-blue-300 bg-white px-2 py-1.5">Tampilkan tabel ini Landscape</button>
    <button @mousedown.prevent @click="$emit('caption')" class="rounded border border-blue-300 bg-white px-2 py-1.5">Tambah / ubah caption</button>
    <button @mousedown.prevent @click="$emit('remove')" class="rounded border border-red-300 bg-white text-red-900 px-2 py-1.5">Hapus tabel</button>
    <button @mousedown.prevent @click="$emit('action','total')" class="rounded border border-blue-300 bg-white px-2 py-1.5">Tambah baris total otomatis</button>
    <button @mousedown.prevent @click="$emit('action','repeat')" :aria-pressed="repeat" class="rounded border border-blue-300 bg-white px-2 py-1.5">{{ repeat ? '✓' : '○' }} Ulangi baris judul</button>
    <button @mousedown.prevent @click="$emit('action','no-split')" :aria-pressed="noSplit" class="rounded border border-blue-300 bg-white px-2 py-1.5">{{ noSplit ? '✓' : '○' }} Jangan potong baris</button>
    <span v-if="message" role="status">{{ message }}</span>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
defineProps<{ rows: number; columns: number; repeat: boolean; noSplit: boolean; message: string }>();
defineEmits<{ action: [action: string, value?: string]; landscape: []; caption: []; remove: [] }>();
const width = ref(20);
const actions = [
  { action: 'row-add', label: 'Tambah baris' }, { action: 'row-delete', label: 'Hapus baris' },
  { action: 'column-add', label: 'Tambah kolom' }, { action: 'column-delete', label: 'Hapus kolom' },
  { action: 'merge', label: 'Gabung sel' }, { action: 'split', label: 'Pisah sel' },
];
const horizontal = [{ value: 'left', label: 'Kiri' }, { value: 'center', label: 'Tengah' }, { value: 'right', label: 'Kanan' }];
const vertical = [{ value: 'top', label: 'Atas' }, { value: 'middle', label: 'Tengah vertikal' }, { value: 'bottom', label: 'Bawah' }];
</script>
