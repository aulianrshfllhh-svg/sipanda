<template>
  <span :class="['inline-flex items-center justify-center', customClass]">
    <img
      src="/lambang-kabupaten-cirebon.png"
      alt="Lambang Kabupaten Cirebon"
      :width="width"
      :height="height"
      class="h-full w-full object-contain"
    />
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  width?: number | string;
  height?: number | string;
  customClass?: string;
}>(), {
  width: 90,
  height: 108,
  customClass: ''
});
</script>
