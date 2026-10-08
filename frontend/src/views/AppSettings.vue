<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <header>
      <p class="text-xs font-semibold uppercase tracking-widest text-blue-600">Preferensi SIPANDA</p>
      <h1 class="mt-2 text-2xl font-bold text-slate-900">Pengaturan</h1>
      <p class="mt-2 text-sm text-slate-500">Kelola akun, tampilan, dan pengaturan dokumen.</p>
    </header>

    <div class="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Bagian pengaturan" class="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 lg:flex-col lg:self-start">
        <button
          v-for="section in sections"
          :key="section.id"
          @click="activeSection = section.id"
          class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors"
          :class="activeSection === section.id ? 'settings-section-active bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'"
          :aria-current="activeSection === section.id ? 'page' : undefined"
        >
          <component :is="section.icon" class="h-4 w-4 shrink-0" />
          {{ section.label }}
        </button>
        <button
          v-for="section in documentSections"
          :key="section.id"
          @click="activeSection = section.id"
          class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors"
          :class="activeSection === section.id ? 'settings-section-active bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'"
          :aria-current="activeSection === section.id ? 'page' : undefined"
        >
          <component :is="section.icon" class="h-4 w-4 shrink-0" />
          {{ section.label }}
        </button>
      </nav>

      <div class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <section v-if="activeSection === 'akun'" aria-labelledby="settings-account-title">
          <SectionHeading id="settings-account-title" title="Akun" description="Informasi akun yang sedang digunakan." />
          <dl class="mt-6 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Nama" :value="store.currentUser?.name" />
            <InfoItem label="Nama pengguna" :value="store.currentUser?.username" />
            <InfoItem label="Peran" :value="store.currentUser?.roleLabel || roleLabel" />
            <InfoItem label="Perangkat daerah" :value="store.currentUser?.opdName" />
            <InfoItem label="Jabatan" :value="store.currentUser?.jabatan" />
            <InfoItem label="NIP" :value="store.currentUser?.nip" />
          </dl>
          <p class="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
            Informasi akun dikelola oleh administrator. Hubungi administrator SIPANDA jika ada data yang perlu diperbarui.
          </p>
        </section>

        <section v-else-if="activeSection === 'tema'" aria-labelledby="settings-theme-title">
          <SectionHeading id="settings-theme-title" title="Tema" description="Atur tampilan sesuai kenyamanan Anda." />
          <fieldset class="mt-6 grid gap-3 sm:grid-cols-3">
            <legend class="sr-only">Pilih tema SIPANDA</legend>
            <label v-for="theme in themes" :key="theme.value" class="cursor-pointer">
              <input
                type="radio"
                name="theme"
                class="peer sr-only"
                :value="theme.value"
                :checked="store.preferences.theme === theme.value"
                @change="store.updatePreferences({ theme: theme.value })"
              />
              <span class="flex min-h-24 flex-col justify-between rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:text-blue-800 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500">
                <component :is="theme.icon" class="h-5 w-5" />
                {{ theme.label }}
              </span>
            </label>
          </fieldset>
          <p class="mt-4 text-xs text-slate-500">Tema langsung diterapkan pada antarmuka dan tersimpan khusus untuk akun ini.</p>
        </section>

        <section v-else-if="activeSection === 'dokumen'">
          <DocumentSettings />
        </section>
        <section v-else-if="activeSection === 'template' && store.isSuperAdmin">
          <TemplateManager />
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import { FileText, Monitor, Moon, Sun, UserRound } from '@lucide/vue';
import DocumentSettings from './DocumentSettings.vue';
import TemplateManager from './TemplateManager.vue';

const store = useAppStore();
const route = useRoute();
type SettingsSection = 'akun' | 'tema' | 'dokumen' | 'template';
const validSections: SettingsSection[] = ['akun', 'tema', 'dokumen', 'template'];
const initialSection = String(route.query.bagian || 'akun') as SettingsSection;
const activeSection = ref<SettingsSection>(validSections.includes(initialSection) && (initialSection !== 'template' || store.isSuperAdmin) ? initialSection : 'akun');
watch(() => route.query.bagian, value => {
  const section = String(value || 'akun') as SettingsSection;
  activeSection.value = validSections.includes(section) && (section !== 'template' || store.isSuperAdmin) ? section : 'akun';
});
const sections = [
  { id: 'akun' as const, label: 'Akun', icon: UserRound },
  { id: 'tema' as const, label: 'Tema', icon: Sun }
];
const documentSections = computed(() => [
  { id: 'dokumen' as const, label: 'Pengaturan Dokumen', icon: FileText },
  ...(store.isSuperAdmin ? [{ id: 'template' as const, label: 'Template Dokumen', icon: FileText }] : [])
]);
const themes = [
  { value: 'light' as const, label: 'Terang', icon: Sun },
  { value: 'dark' as const, label: 'Gelap', icon: Moon },
  { value: 'system' as const, label: 'Ikuti sistem', icon: Monitor }
];
const roleLabel = computed(() => store.isSuperAdmin ? 'Super Admin PPEPD' : store.isStaff ? 'Staf Bapperida' : 'Perangkat Daerah');

const SectionHeading = defineComponent({
  props: { id: { type: String, required: true }, title: { type: String, required: true }, description: { type: String, required: true } },
  setup(props) {
    return () => h('div', [
      h('h2', { id: props.id, class: 'text-lg font-bold text-slate-900' }, props.title),
      h('p', { class: 'mt-1 text-sm text-slate-500' }, props.description)
    ]);
  }
});

const InfoItem = defineComponent({
  props: { label: { type: String, required: true }, value: { type: String, default: '' } },
  setup(props) {
    return () => h('div', { class: 'rounded-xl bg-slate-50 p-4' }, [
      h('dt', { class: 'text-[10px] font-bold uppercase tracking-wider text-slate-500' }, props.label),
      h('dd', { class: 'mt-1.5 break-words text-sm font-semibold text-slate-800' }, props.value || 'Belum tersedia')
    ]);
  }
});

</script>
