<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs sm:p-4">
    <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:items-center" :class="gridClass">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ columns?: number }>(), { columns: 3 });
const gridClass = computed(() => props.columns === 2
  ? 'xl:grid-cols-[repeat(2,minmax(150px,1fr))_auto]'
  : props.columns === 4
    ? 'xl:grid-cols-[repeat(4,minmax(140px,1fr))_auto]'
    : 'xl:grid-cols-[repeat(3,minmax(150px,1fr))_auto]');
</script>
