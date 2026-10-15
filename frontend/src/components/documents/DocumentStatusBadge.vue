<template>
  <span
    class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold"
    :class="statusClass"
  >
    <LockKeyhole v-if="status === 'Final'" class="h-3 w-3" />
    {{ status }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { LockKeyhole } from '@lucide/vue';

const props = defineProps<{ status: string }>();
const statusClass = computed(() => ({
  'border-emerald-700 bg-emerald-800 text-white': props.status === 'Final',
  'border-emerald-200 bg-emerald-50 text-emerald-800': props.status === 'Disetujui Bapperida',
  'border-amber-200 bg-amber-50 text-amber-800': props.status === 'Menunggu Verifikasi',
  'border-rose-200 bg-rose-50 text-rose-700': props.status === 'Perlu Revisi',
  'border-slate-200 bg-slate-50 text-slate-600': props.status === 'Draft' || !['Final', 'Disetujui Bapperida', 'Menunggu Verifikasi', 'Perlu Revisi'].includes(props.status)
}));
</script>
