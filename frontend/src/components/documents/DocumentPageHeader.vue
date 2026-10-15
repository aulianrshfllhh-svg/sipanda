<template>
  <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-2.5">
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900">{{ title }}</h1>
        <span
          v-if="badge"
          class="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          :class="badgeClass"
        >
          <component v-if="badgeIcon" :is="badgeIcon" class="h-3 w-3" />
          {{ badge }}
        </span>
      </div>
      <p class="mt-1 text-xs text-slate-500">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2.5">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  title: string;
  subtitle: string;
  badge?: string;
  badgeIcon?: Component;
  badgeTone?: 'blue' | 'green';
}>(), { badgeTone: 'blue' });

const badgeClass = computed(() => props.badgeTone === 'green'
  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
  : 'border-blue-200/80 bg-blue-50 text-blue-700');
</script>
