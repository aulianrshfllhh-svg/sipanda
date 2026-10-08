<template>
  <div class="flex items-center gap-2">
    <svg
      class="w-11 h-10 shrink-0"
      viewBox="540 60 740 570"
      aria-hidden="true"
      overflow="hidden"
    >
      <defs>
        <clipPath :id="clipId" clipPathUnits="userSpaceOnUse">
          <rect x="540" y="60" width="740" height="570" />
        </clipPath>
      </defs>
      <image
        href="/images/sipanda-logo-20261005.png"
        width="1800"
        height="874"
        :clip-path="`url(#${clipId})`"
      />
    </svg>
    <div class="min-w-0">
      <div class="flex items-center gap-1.5">
        <span class="font-extrabold text-slate-900 tracking-tight" :class="compact ? 'text-sm' : 'text-lg'">SIPANDA</span>
      </div>
      <p class="text-slate-500 font-medium leading-tight mt-0.5" :class="compact ? 'text-[9px]' : 'text-[11px]'">{{ compact ? 'Bapperida Kab. Cirebon' : 'Bapperida Kabupaten Cirebon' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue';

defineProps<{ compact?: boolean }>();
const clipId = `sipanda-book-${useId()}`;
</script>
