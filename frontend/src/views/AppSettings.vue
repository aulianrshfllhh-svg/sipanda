<template>
  <div class="mx-auto max-w-6xl space-y-6 pb-6">
    <header>
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Preferensi SIPANDA</p>
      <div class="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-slate-900">Pengaturan</h1>
        </div>
      </div>
    </header>

    <div class="space-y-4">
      <nav aria-label="Bagian pengaturan" class="flex max-w-full gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <button
          v-for="section in allSections"
          :key="section.id"
          @click="activeSection = section.id"
          class="settings-tab flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all sm:px-4 sm:text-sm"
          :class="activeSection === section.id ? 'settings-tab-active bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
          :aria-current="activeSection === section.id ? 'page' : undefined"
          :aria-pressed="activeSection === section.id"
        >
          <component :is="section.icon" class="h-4 w-4 shrink-0" />
          {{ section.label }}
        </button>
      </nav>

      <div class="min-w-0">
        <section v-if="activeSection === 'akun'" aria-labelledby="settings-account-title" class="space-y-5">
          <SectionHeading id="settings-account-title" title="Akun" description="Informasi akun yang sedang digunakan." />
          <div class="grid gap-4 xl:grid-cols-2">
            <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Identitas utama">
              <div class="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><UserRound class="h-5 w-5" /></span>
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Identitas utama</h3>
                  <p class="mt-0.5 text-xs text-slate-500">Informasi dasar akun SIPANDA.</p>
                </div>
              </div>
              <dl class="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoItem label="Nama lengkap" :value="store.currentUser?.name" :icon="UserRound" />
                <InfoItem label="Nama pengguna" :value="store.currentUser?.username" :icon="AtSign" />
              </dl>
            </section>

            <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Informasi peran dan unit kerja">
              <div class="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Building2 class="h-5 w-5" /></span>
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Peran &amp; unit kerja</h3>
                  <p class="mt-0.5 text-xs text-slate-500">Informasi kedinasan dan hak akses akun.</p>
                </div>
              </div>
              <dl class="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoItem label="Peran" :value="store.currentUser?.roleLabel || roleLabel" :icon="ShieldCheck" />
                <InfoItem label="Perangkat daerah" :value="store.currentUser?.opdName" :icon="Building2" />
                <InfoItem label="Jabatan" :value="store.currentUser?.jabatan" :icon="BriefcaseBusiness" />
                <InfoItem label="NIP" :value="store.currentUser?.nip" :icon="IdCard" />
              </dl>
            </section>
          </div>
          <p class="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-relaxed text-blue-800">
            <Info class="mt-0.5 h-4 w-4 shrink-0" />
            Informasi akun dikelola oleh administrator. Hubungi administrator SIPANDA jika ada data yang perlu diperbarui.
          </p>
        </section>

        <section v-else-if="activeSection === 'tema'" aria-labelledby="settings-theme-title" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
import {
  AtSign, BriefcaseBusiness, Building2, FileText, IdCard, Info, Monitor, Moon, Settings2,
  ShieldCheck, Sun, UserRound
} from '@lucide/vue';
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
const allSections = computed(() => [
  { id: 'akun' as const, label: 'Akun', icon: UserRound },
  { id: 'tema' as const, label: 'Tema', icon: Sun },
  { id: 'dokumen' as const, label: 'Pengaturan Dokumen', icon: Settings2 },
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
  props: { label: { type: String, required: true }, value: { type: String, default: '' }, icon: { type: Object, required: true } },
  setup(props) {
    return () => h('div', { class: 'min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5' }, [
      h('dt', { class: 'flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500' }, [
        h('span', { class: 'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm' }, [
          h(props.icon, { class: 'h-3.5 w-3.5' })
        ]),
        props.label
      ]),
      h('dd', { class: 'mt-2 break-words pl-9 text-sm font-bold leading-snug text-slate-800' }, props.value || 'Belum tersedia')
    ]);
  }
});

</script>
