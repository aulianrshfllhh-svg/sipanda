<template>
  <div class="flex flex-1 min-h-screen">
    <Sidebar class="no-print hidden md:flex" />
    <div class="flex-1 flex flex-col min-w-0">
      <button @click="mobileNavigation?.showModal()" class="no-print border-b bg-white px-4 py-3 text-left text-sm font-semibold text-blue-700 md:hidden">☰ Menu SIPANDA</button>
      <Navbar class="no-print" />
      <main
        class="min-w-0 flex-1 w-full"
        :class="route.path === '/' ? 'px-6 py-2' : route.path.startsWith('/dokumen') ? 'planning-main px-4 py-5 lg:px-5' : 'max-w-7xl mx-auto p-4 sm:p-6 lg:p-8'"
      >
        <slot />
      </main>
    </div>
    <dialog ref="mobileNavigation" class="m-0 h-screen max-h-screen border-0 p-0 backdrop:bg-slate-900/50">
      <button @click="mobileNavigation?.close()" class="w-full border-b p-3 text-right text-sm text-blue-700">Tutup menu</button>
      <div @click="closeOnNavigation"><Sidebar /></div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from './Sidebar.vue';
import Navbar from './Navbar.vue';

const route = useRoute();
const mobileNavigation=ref<HTMLDialogElement>();
function closeOnNavigation(event:MouseEvent){if((event.target as HTMLElement).closest('a'))mobileNavigation.value?.close();}
</script>
