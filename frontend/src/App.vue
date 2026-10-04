<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
    <!-- Login Page: Fullscreen without Sidebar & Navbar -->
    <template v-if="isLoginRoute">
      <router-view />
    </template>

    <!-- Editor Mode: Fullscreen Studio View without Sidebar & Navbar -->
    <template v-else-if="isEditorRoute">
      <router-view />
    </template>

    <!-- Normal Dashboard / App Mode -->
    <template v-else>
      <MainLayout>
        <router-view />
      </MainLayout>
    </template>

    <!-- Global Create Document Modal -->
    <CreateDocumentModal />

    <!-- Toast Notifications -->
    <div class="fixed bottom-5 right-5 z-[100] space-y-2.5 max-w-sm pointer-events-none">
      <div
        v-for="toast in store.toasts"
        :key="toast.id"
        class="pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start gap-3 animate-in slide-in-from-bottom-3 duration-200"
        :class="getToastClass(toast.type)"
      >
        <CheckCircle v-if="toast.type === 'success'" class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <AlertCircle v-else-if="toast.type === 'error'" class="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <Info v-else class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />

        <div class="text-xs font-semibold leading-relaxed flex-1 whitespace-pre-line">
          {{ toast.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from './stores/appStore';
import MainLayout from './components/layout/MainLayout.vue';
import CreateDocumentModal from './components/documents/CreateDocumentModal.vue';
import { CheckCircle, AlertCircle, Info } from '@lucide/vue';

const store = useAppStore();
const route = useRoute();

const isEditorRoute = computed(() => route.path.startsWith('/editor/'));
const isLoginRoute = computed(() => route.path === '/login');

const getToastClass = (type: string) => {
  switch (type) {
    case 'success': return 'bg-white border-emerald-200 text-emerald-950 shadow-emerald-500/10';
    case 'error': return 'bg-white border-red-200 text-red-950 shadow-red-500/10';
    default: return 'bg-white border-blue-200 text-blue-950 shadow-blue-500/10';
  }
};

onMounted(async () => {
  await store.fetchCurrentUser();
  await store.fetchOpds();
  await store.fetchDocuments();
});
</script>
