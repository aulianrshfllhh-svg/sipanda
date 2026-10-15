<template>
  <div class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 sm:flex-row">
    <span>Menampilkan {{ visibleCount }} dari {{ totalCount }} total berkas</span>
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        @click="$emit('update:page', page - 1)"
        :disabled="page <= 1"
        class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
      >
        Sebelumnya
      </button>
      <span class="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">{{ page }}</span>
      <span class="text-slate-400">/ {{ totalPages }}</span>
      <button
        type="button"
        @click="$emit('update:page', page + 1)"
        :disabled="page >= totalPages"
        class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
      >
        Selanjutnya
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  page: number;
  totalPages: number;
  visibleCount: number;
  totalCount: number;
}>();

defineEmits<{ 'update:page': [value: number] }>();
</script>
