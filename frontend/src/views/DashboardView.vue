<template>
  <div>
    <AdminDashboard v-if="store.isBapperida" />
    <OpdDashboard v-else />
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '../stores/appStore';
import AdminDashboard from './AdminDashboard.vue';
import OpdDashboard from './OpdDashboard.vue';

const store = useAppStore();
</script>
