<template>
  <section
    class="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-2xs sm:py-16"
    aria-live="polite"
  >
    <div class="mx-auto max-w-sm">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200/80">
        <component :is="icon" class="h-7 w-7" />
      </div>
      <h2 class="text-sm font-bold text-slate-800">{{ title }}</h2>
      <p class="mt-2 text-xs leading-relaxed text-slate-500">{{ description }}</p>
      <div v-if="$slots.actions" class="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { FolderOpen } from '@lucide/vue';

withDefaults(defineProps<{
  title: string;
  description: string;
  icon?: Component;
}>(), { icon: () => FolderOpen });
</script>
