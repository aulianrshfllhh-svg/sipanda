<template>
  <div class="w-full rounded-2xl bg-slate-100/80 p-1.5 shadow-2xs" role="tablist">
    <div class="grid grid-cols-3 items-stretch gap-1.5">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="modelValue === tab.id"
        @click="$emit('update:modelValue', tab.id)"
        class="group inline-flex min-w-0 cursor-pointer select-none items-center justify-center gap-2 rounded-xl px-2 py-2 text-center text-[11px] font-semibold leading-snug transition-all sm:px-3.5 sm:text-xs"
        :class="modelValue === tab.id
          ? 'bg-white font-bold text-blue-700 shadow-xs'
          : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'"
      >
        <component
          v-if="tab.icon"
          :is="tab.icon"
          class="h-3.5 w-3.5 transition-colors"
          :class="modelValue === tab.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'"
        />
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.count !== undefined"
          class="rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors"
          :class="modelValue === tab.id
            ? 'bg-blue-50 text-blue-700'
            : 'bg-slate-200/80 text-slate-500 group-hover:bg-slate-200'"
        >
          {{ tab.count }}
        </span>
        <span v-else-if="tab.tag" class="rounded-full border border-amber-200/60 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
          {{ tab.tag }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  modelValue: string;
  tabs: Array<{ id: string; label: string; count?: number; icon?: Component; tag?: string }>;
}>();

defineEmits<{ 'update:modelValue': [value: string] }>();
</script>
